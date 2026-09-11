const express = require('express');
const session = require('express-session');
const path = require('path');
const crypto = require('crypto');

const authRoutes = require('./routes/auth');
const requireAuth = require('./middleware/requireAuth');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- базовые защитные заголовки
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff'); // браузер не будет угадывать тип файла
  res.setHeader('X-Frame-Options', 'DENY');            // защита от clickjacking (сайт нельзя вставить в <iframe>)
  next();
});

// Сессии
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

// API аутентификации
app.use('/api', authRoutes);

// защищённая страница, где без доступа взод закрыт
app.get('/cards.html', requireAuth, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'cards.html'));
});

// Остальной сайт отдаём как статику
app.use(express.static(PUBLIC_DIR));

app.listen(PORT, () => {
  console.log(`Fittology запущен: http://localhost:${PORT}`);
});
