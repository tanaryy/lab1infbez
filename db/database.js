const Database = require('better-sqlite3');
const path = require('path');

// Файл базы данных лежит в data/fitness.db (создаётся автоматически при первом запуске)
const db = new Database(path.join(__dirname, '..', 'data', 'fitness.db'));

// Создаём таблицу пользователей, если её ещё нет.
// password_hash хранит НЕ пароль, а результат argon2.hash() — необратимый хэш с солью
// и параметрами алгоритма, встроенными прямо в саму строку.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

module.exports = db;
