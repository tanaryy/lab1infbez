// Unit-тесты для utils/validators.js
const test = require('node:test');
const assert = require('node:assert/strict');

const { isValidUsername, isValidPassword, checkPasswordStrength } = require('../utils/validators');

test('isValidUsername: принимает корректный логин', () => {
  assert.equal(isValidUsername('tanary2'), true);
  assert.equal(isValidUsername('user_123'), true);
});

test('isValidUsername: отклоняет слишком короткий логин', () => {
  assert.equal(isValidUsername('ab'), false);
});

test('isValidUsername: отклоняет слишком длинный логин', () => {
  assert.equal(isValidUsername('a'.repeat(21)), false);
});

test('isValidUsername: отклоняет недопустимые символы (пробел, кириллица, спецсимволы)', () => {
  assert.equal(isValidUsername('user name'), false);
  assert.equal(isValidUsername('пользователь'), false);
  assert.equal(isValidUsername("admin'--"), false); // похоже на попытку SQL-инъекции в логине
});

test('isValidUsername: отклоняет не-строку', () => {
  assert.equal(isValidUsername(12345), false);
  assert.equal(isValidUsername(undefined), false);
  assert.equal(isValidUsername(null), false);
});

test('isValidPassword: принимает пароль нормальной длины', () => {
  assert.equal(isValidPassword('reka5sosna'), true);
});

test('isValidPassword: отклоняет короче 6 символов', () => {
  assert.equal(isValidPassword('ab1'), false);
});

test('isValidPassword: отклоняет длиннее 128 символов', () => {
  assert.equal(isValidPassword('a1'.repeat(70)), false); // 140 символов
});

test('checkPasswordStrength: пропускает нормальный пароль (buквы+цифры, не словарный)', () => {
  assert.equal(checkPasswordStrength('reka5sosna', 'tanary2'), null);
});

test('checkPasswordStrength: отклоняет частый/утёкший пароль', () => {
  assert.notEqual(checkPasswordStrength('123456', 'someuser'), null);
  assert.notEqual(checkPasswordStrength('password1', 'someuser'), null);
});

test('checkPasswordStrength: отклоняет пароль, совпадающий с логином', () => {
  assert.notEqual(checkPasswordStrength('tanary2', 'tanary2'), null);
});

test('checkPasswordStrength: отклоняет пароль только из цифр', () => {
  assert.notEqual(checkPasswordStrength('87654321', 'someuser'), null);
});

test('checkPasswordStrength: отклоняет повторяющийся один символ', () => {
  assert.notEqual(checkPasswordStrength('aaaaaaaa', 'someuser'), null);
});

test('checkPasswordStrength: отклоняет клавиатурный паттерн', () => {
  assert.notEqual(checkPasswordStrength('rfvtgb99', 'someuser'), null);
});

test('checkPasswordStrength: отклоняет пароль без цифр', () => {
  assert.notEqual(checkPasswordStrength('onlylettershere', 'someuser'), null);
});

test('checkPasswordStrength: отклоняет пароль без букв', () => {
  assert.notEqual(checkPasswordStrength('13579246', 'someuser'), null);
});
