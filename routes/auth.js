const express = require('express');
const argon2 = require('argon2');
const rateLimit = require('express-rate-limit');
const db = require('../db/database');
const { isValidUsername, isValidPassword, checkPasswordStrength } = require('../utils/validators');

const router = express.Router();

// --- Параметры Argon2id ---
// type: argon2id — гибридный режим, рекомендованный для хэширования паролей
//   (сочетает устойчивость к атакам по побочным каналам и к атакам методом GPU/ASIC)
// memoryCost: 19456 KiB (~19 МБ) — сколько памяти требуется на КАЖДУЮ попытку хэширования.
//   Это и есть главное отличие от bcrypt: bcrypt дорог по времени CPU, а Argon2 ещё и по
//   памяти — GPU/ASIC-фермы для перебора паролей заточены под дешёвые параллельные вычисления,
//   но не под дешёвую параллельную память, поэтому "дорогая память" резко снижает их выгоду.
// timeCost: 3 — число проходов по памяти
// parallelism: 1 — число потоков (в веб-сервере лучше держать 1, чтобы не забирать все ядра
//   у Node.js при параллельных запросах на вход/регистрацию)
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 3,
  parallelism: 1
};

// --- Защита от перебора пароля (brute force) ---
// Не более 5 попыток входа с одного IP за 10 минут.
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много попыток входа. Попробуйте снова через несколько минут.' }
});

// Отдельно ограничиваем и регистрацию, чтобы нельзя было массово штамповать аккаунты
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много попыток регистрации. Попробуйте позже.' }
});

// --- Регистрация ---
router.post('/register', registerLimiter, async (req, res) => {
  const { username, password } = req.body || {};

  if (!isValidUsername(username)) {
    return res.status(400).json({ error: 'Логин: 3-20 символов, латиница/цифры/подчёркивание' });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'Пароль должен быть от 6 до 72 символов' });
  }

  const strengthError = checkPasswordStrength(password, username);
  if (strengthError) {
    return res.status(400).json({ error: strengthError });
  }

  try {
    // Хэшируем пароль Argon2id. Библиотека сама генерирует случайную соль и записывает
    // все параметры (тип, память, время, соль) прямо внутрь строки хэша — при проверке
    // их не нужно хранить отдельно.
    const passwordHash = await argon2.hash(password, ARGON2_OPTIONS);

    // Параметризованный запрос (?, ?) — значения никогда не подставляются в SQL-строку напрямую,
    // поэтому SQL-инъекция через username/пароль невозможна.
    const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
    stmt.run(username, passwordHash);

    return res.status(201).json({ ok: true });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Такой логин уже занят' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// --- Вход ---
router.post('/login', loginLimiter, async (req, res) => {
  const { username, password, timestamp } = req.body || {};

  // --- Проверка временной метки (защита от replay-атак) ---
  // Клиент присылает момент отправки запроса (Date.now()). Если перехваченный
  // ранее запрос отправляют повторно спустя время — метка будет "старой",
  const REPLAY_WINDOW_MS = 2 * 60 * 1000; // 2 минуты — с запасом на рассинхрон часов
  if (typeof timestamp !== 'number' || Math.abs(Date.now() - timestamp) > REPLAY_WINDOW_MS) {
    return res.status(400).json({ error: 'Запрос устарел или время на устройстве настроено неверно. Обновите страницу и попробуйте снова.' });
  }

  if (!isValidUsername(username) || !isValidPassword(password)) {
    // Намеренно одна и та же ошибка для "нет пользователя" и "неверный пароль" —
    // чтобы нельзя было узнавать перебором, какие логины существуют.
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  // Фиксированный, заранее посчитанный Argon2-хэш "пустышки" — не хэш чьего-то реального
  // пароля, просто валидный по формату хэш для сравнения с ним же ниже.
  const DUMMY_HASH = '$argon2id$v=19$m=19456,p=1,t=3$xz9AjpfRsWZZCqtOB7ijMw$jUFfHTQ4WDoHc366nEJTY9/R92k0tjmUAIXQz5hijLI';

  if (!user) {
    // Всё равно выполняем полноценную проверку Argon2 с "пустышкой", чтобы время ответа
    // не отличалось для существующих/несуществующих логинов (защита от timing-атак)
    await argon2.verify(DUMMY_HASH, password);
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }

  const match = await argon2.verify(user.password_hash, password);
  if (!match) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }

  // Пересоздаём сессию при входе (защита от session fixation)
  req.session.regenerate((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Ошибка сервера' });
    }
    req.session.userId = user.id;
    req.session.username = user.username;
    return res.json({ ok: true, username: user.username });
  });
});

// Выход 
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Ошибка сервера' });
    }
    res.clearCookie('connect.sid');
    return res.json({ ok: true });
  });
});

// Проверка текущей сессии (для фронтенда: показать "Войти" или "Личный кабинет")
router.get('/session', (req, res) => {
  if (req.session.userId) {
    return res.json({ loggedIn: true, username: req.session.username });
  }
  return res.json({ loggedIn: false });
});

module.exports = router;
