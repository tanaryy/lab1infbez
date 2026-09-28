// Проверка "пароль есть в списке самых частых/утёкших" - через npm-библиотеку
const isCommonPassword = require('common-password');

// Небольшое ручное дополнение: русские/кириллические варианты и специфичные для
// этого сайта слова, которых нет в англоязычном датасете библиотеки.
const EXTRA_RU = new Set([
  'парольь', 'пароль123', 'qwe123', 'йцукен', '12345qwert',
  'fitness123', 'gym1234', 'fitnessclub', 'p@ssword'
]);

function isPasswordCommon(password) {
  const lower = password.toLowerCase();
  return isCommonPassword(lower) || EXTRA_RU.has(lower);
}

module.exports = { isPasswordCommon };
