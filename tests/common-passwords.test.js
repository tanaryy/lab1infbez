// Unit-тесты для data/common-passwords.js 
const test = require('node:test');
const assert = require('node:assert/strict');

const { isPasswordCommon } = require('../data/common-passwords');

test('isPasswordCommon: находит классические частые пароли', () => {
  assert.equal(isPasswordCommon('123456'), true);
  assert.equal(isPasswordCommon('password'), true);
  assert.equal(isPasswordCommon('qwerty'), true);
});

test('isPasswordCommon: находит русское дополнение к списку', () => {
  assert.equal(isPasswordCommon('йцукен'), true);
  assert.equal(isPasswordCommon('fitnessclub'), true);
});

test('isPasswordCommon: не находит непредсказуемый пароль', () => {
  assert.equal(isPasswordCommon('reka5sosna'), false);
});
