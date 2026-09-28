// Валидация логина и пароля — вынесена в отдельный модуль от routes/auth.js специально
// для того, чтобы эти функции можно было протестировать в изоляции (unit-тесты в tests/),
const { isPasswordCommon } = require('../data/common-passwords');
const { hasKeyboardPattern } = require('../data/keyboard-patterns');

function isValidUsername(username) {
  // 3-20 символов, только буквы/цифры/подчёркивание — простая защита от мусорного и вредоносного ввода
  return typeof username === 'string' && /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 6 && password.length <= 128;
  // Верхняя граница — не техническое ограничение алгоритма (у Argon2, в отличие от bcrypt,
  // нет обрезания на 72 байта), а защита от DoS: слишком длинный пароль удорожает каждый
  // вызов хэширования, а хэшировать в проекте приходится на КАЖДЫЙ запрос входа/регистрации.
}

// Дополнительная проверка только при регистрации: даже если пароль формально проходит
// по длине, он не должен быть словарным/предсказуемым — иначе Argon2 его не спасёт.
// Возвращает текст ошибки или null, если пароль в порядке.
function checkPasswordStrength(password, username) {
  const lower = password.toLowerCase();

  if (isPasswordCommon(lower)) {
    return 'Этот пароль слишком часто встречается в утечках и взламывается словарной атакой за секунды. Придумайте менее очевидный.';
  }

  if (lower === username.toLowerCase()) {
    return 'Пароль не должен совпадать с логином.';
  }

  if (/^\d+$/.test(password)) {
    return 'Пароль не должен состоять только из цифр.';
  }
  if (/^(.)\1+$/.test(password)) {
    return 'Пароль не должен состоять из повторяющегося одного символа.';
  }

  if (hasKeyboardPattern(password)) {
    return 'Пароль похож на последовательность соседних клавиш (например, qwerty или 1qaz2wsx) — такие пароли легко подбираются. Выберите менее предсказуемый.';
  }

  const hasLetter = /[a-zA-Zа-яА-ЯёЁ]/.test(password);
  const hasDigit = /\d/.test(password);
  if (!hasLetter || !hasDigit) {
    return 'Пароль должен содержать и буквы, и цифры.';
  }

  return null;
}

module.exports = { isValidUsername, isValidPassword, checkPasswordStrength };
