// Unit-тесты для data/keyboard-patterns.js
const test = require('node:test');
const assert = require('node:assert/strict');

const { hasKeyboardPattern } = require('../data/keyboard-patterns');

test('hasKeyboardPattern: находит ряд qwerty', () => {
  assert.equal(hasKeyboardPattern('qwertyui'), true);
});

test('hasKeyboardPattern: находит диагональ 1qaz2wsx', () => {
  assert.equal(hasKeyboardPattern('1qaz2wsx'), true);
});

test('hasKeyboardPattern: находит паттерн независимо от регистра', () => {
  assert.equal(hasKeyboardPattern('QWERTY12'), true);
});

test('hasKeyboardPattern: находит паттерн даже если он не в начале строки', () => {
  assert.equal(hasKeyboardPattern('xx-asdfgh-99'), true);
});

test('hasKeyboardPattern: находит паттерн в обратном направлении', () => {
  assert.equal(hasKeyboardPattern('ytrewq12'), true); // qwerty задом наперёд
});

test('hasKeyboardPattern: НЕ находит паттерн в обычном непредсказуемом пароле', () => {
  assert.equal(hasKeyboardPattern('reka5sosna'), false);
  assert.equal(hasKeyboardPattern('gorod7lipa'), false);
});

test('hasKeyboardPattern: короткие совпадения (менее 4 символов) не считаются паттерном', () => {
  assert.equal(hasKeyboardPattern('asd'), false); // всего 3 символа — ниже порога
});
