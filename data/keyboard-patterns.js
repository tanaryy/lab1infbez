// Детектор "клавиатурных паттернов"
const SEQUENCES = [
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
  '1234567890',
  '1qaz2wsx3edc',
  'qazwsx',
  'wsxedc',
  'edcrfv',
  'rfvtgb',
  'zaq12wsx',
  'йцукенгшщзхъ', // тот же принцип на русской раскладке
  'фывапролджэ',
  'ячсмитьбю'
];

const MIN_RUN = 4; // от скольки подряд идущих "клавиш" считаем это паттерном, а не совпадением

function buildRuns(seq) {
  const runs = [];
  for (let len = seq.length; len >= MIN_RUN; len--) {
    for (let i = 0; i + len <= seq.length; i++) {
      const chunk = seq.slice(i, i + len);
      runs.push(chunk);
      runs.push(chunk.split('').reverse().join('')); // и в обратном направлении тоже
    }
  }
  return runs;
}

const ALL_RUNS = new Set(SEQUENCES.flatMap(buildRuns));

function hasKeyboardPattern(password) {
  const lower = password.toLowerCase();
  for (let len = Math.min(lower.length, 12); len >= MIN_RUN; len--) {
    for (let i = 0; i + len <= lower.length; i++) {
      if (ALL_RUNS.has(lower.slice(i, i + len))) {
        return true;
      }
    }
  }
  return false;
}

module.exports = { hasKeyboardPattern };
