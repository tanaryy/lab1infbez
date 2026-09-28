const express = require('express');
const session = require('express-session');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const https = require('https');

const authRoutes = require('./routes/auth');
const requireAuth = require('./middleware/requireAuth');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- Немного базовых защитных заголовков (без лишних зависимостей) ---
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff'); // браузер не будет угадывать тип файла
  res.setHeader('X-Frame-Options', 'DENY');            // защита от clickjacking (сайт нельзя вставить в <iframe>)
  next();
});

// --- Сессии ---
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

app.use(session({
  secret: SESSION_SECRET,
  name: 'connect.sid',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,                                   // cookie недоступна из JS -> снижает риск кражи через XSS
    sameSite: 'lax',                                   // базовая защита от CSRF
    secure: process.env.NODE_ENV === 'production',     // в проде cookie только по HTTPS
    maxAge: 1000 * 60 * 60 * 2                          // сессия живёт 2 часа
  }
}));

// --- API аутентификации ---
app.use('/api', authRoutes);

// --- Защищённая страница: без входа доступ закрыт ---
app.get('/cards.html', requireAuth, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'cards.html'));
});

// --- Остальной сайт отдаём как статику ---
app.use(express.static(PUBLIC_DIR));

app.listen(PORT, () => {
  console.log(`Fittology (HTTP) запущен: http://localhost:${PORT}`);
});

// --- HTTPS-версия для демонстрации шифрования канала ---
const CERT_PATH = path.join(__dirname, 'certs', 'cert.pem');
const KEY_PATH = path.join(__dirname, 'certs', 'key.pem');
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

if (fs.existsSync(CERT_PATH) && fs.existsSync(KEY_PATH)) {
  const httpsOptions = {
    cert: fs.readFileSync(CERT_PATH),
    key: fs.readFileSync(KEY_PATH)
  };
  https.createServer(httpsOptions, app).listen(HTTPS_PORT, () => {
    console.log(`Fittology (HTTPS, самоподписанный сертификат для демонстрации) запущен: https://localhost:${HTTPS_PORT}`);
    console.log('Браузер покажет предупреждение "небезопасно" — это ожидаемо для самоподписанного сертификата, в проде нужен сертификат от доверенного центра (например Let\'s Encrypt).');
  });
} else {
  console.log('Сертификат для HTTPS не найден (certs/cert.pem, certs/key.pem) — HTTPS-демо пропущена.');
}
