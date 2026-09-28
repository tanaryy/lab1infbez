// Unit-тесты на само хэширование Argon2 — проверяем корректность round-trip
// (хэшируем -> проверяем тем же и другим паролем), а не полный сценарий регистрации/входа
const test = require('node:test');
const assert = require('node:assert/strict');
const argon2 = require('argon2');

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 3,
  parallelism: 1
};

test('argon2: verify() возвращает true для правильного пароля', async () => {
  const hash = await argon2.hash('reka5sosna', ARGON2_OPTIONS);
  const ok = await argon2.verify(hash, 'reka5sosna');
  assert.equal(ok, true);
});

test('argon2: verify() возвращает false для неправильного пароля', async () => {
  const hash = await argon2.hash('reka5sosna', ARGON2_OPTIONS);
  const ok = await argon2.verify(hash, 'wrongpassword');
  assert.equal(ok, false);
});

test('argon2: хэш начинается с $argon2id$ (используется правильный вариант алгоритма)', async () => {
  const hash = await argon2.hash('reka5sosna', ARGON2_OPTIONS);
  assert.ok(hash.startsWith('$argon2id$'));
});

test('argon2: один и тот же пароль даёт РАЗНЫЕ хэши (за счёт случайной соли)', async () => {
  const hash1 = await argon2.hash('reka5sosna', ARGON2_OPTIONS);
  const hash2 = await argon2.hash('reka5sosna', ARGON2_OPTIONS);
  assert.notEqual(hash1, hash2);
  // но оба должны проверяться тем же паролем как верные
  assert.equal(await argon2.verify(hash1, 'reka5sosna'), true);
  assert.equal(await argon2.verify(hash2, 'reka5sosna'), true);
});
