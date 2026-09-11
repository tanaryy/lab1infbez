const express = require('express');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const db = require('../db/database');
const commonPasswords = require('../data/common-passwords');

const router = express.Router();

const SALT_ROUNDS = 12; 

// защита от перебора пароля brute force
// не более 5 попыток входа с одного айпи за 10 минут
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много попыток входа. Попробуйте снова через несколько минут.' }
});

// ограничение регистрации, чтобы нельзя было массово создавать аккаунты
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много попыток регистрации. Попробуйте позже.' }
});

function isValidUsername(username) {
  // 3-20 символов, только буквы/цифры/подчёркивание — простая защита от мусорного и вредоносного ввода
  return typeof username === 'string' && /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 6 && password.length <= 72;
  // 72 — техническое ограничение самого bcrypt на длину входа
}

function checkPasswordStrength(password, username) {
  const lower = password.toLowerCase();

  if (commonPasswords.has(lower)) {
    return 'Этот пароль слишком часто встречается в утечках и взламывается словарной атакой за секунды. Придумайте менее очевидный.';
  }

  if (lower === username.toLowerCase()) {
    return 'Пароль не должен совпадать с логином.';
  }

  // пароль только из цифр или только из одинаковых символов — тоже словарный случай
  if (/^\d+$/.test(password)) {
    return 'Пароль не должен состоять только из цифр.';
  }
  if (/^(.)\1+$/.test(password)) {
    return 'Пароль не должен состоять из повторяющегося одного символа.';
  }

  const hasLetter = /[a-zA-Zа-яА-ЯёЁ]/.test(password);
  const hasDigit = /\d/.test(password);
  if (!hasLetter || !hasDigit) {
    return 'Пароль должен содержать и буквы, и цифры.';
  }

  return null;
}

// регистрация
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
    // хэшируем пароль. bcrypt сам генерирует уникальную соль и сохраняет её внутри хэша.
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // параметризованный запрос (?, ?) — SQL-инъекция через username/пароль невозможна.
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

// вход
router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};

  if (!isValidUsername(username) || !isValidPassword(password)) {
    // намеренно одна и та же ошибка для "нет пользователя" и неверный пароль
    // чтобы нельзя было узнавать перебором, какие логины существуют.
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user) {
    // все равно делаем bcrypt.compare с "пустышкой", чтобы время ответа
    // не отличалось для существующих/несуществующих логинов (защита от timing-атак)
    await bcrypt.compare(password, '$2b$12$invalidsaltinvalidsaltinvalidsaltinvalidsaltinvalidsal');
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }

  // пересоздаём сессию при входе (защита от session fixation)
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

//  Выход
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

// проверка текущей сессии 
router.get('/session', (req, res) => {
  if (req.session.userId) {
    return res.json({ loggedIn: true, username: req.session.username });
  }
  return res.json({ loggedIn: false });
});

module.exports = router;
