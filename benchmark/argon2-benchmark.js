// Бенчмарк хэширования Argon2id — измеряет ВРЕМЯ и ПАМЯТЬ, которые тратит один вызов
// argon2.hash() при разных значениях memoryCost. 
const argon2 = require('argon2');

const PASSWORD = 'reka5sosna'; // фиксированный тестовый пароль — сам пароль на скорость не влияет
const ITERATIONS = 5; // сколько раз повторяем каждый замер, чтобы усреднить

// Профили для сравнения.
const PROFILES = [
  { label: 'low (8 MB)', memoryCost: 8192, timeCost: 3, parallelism: 1 },
  { label: 'current — проект (19 MB)', memoryCost: 19456, timeCost: 3, parallelism: 1 },
  { label: 'high (64 MB)', memoryCost: 65536, timeCost: 3, parallelism: 1 },
];

function formatMs(ms) {
  return `${ms.toFixed(1)} мс`;
}

function formatMb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} МБ`;
}

async function benchmarkProfile(profile) {
  const times = [];
  const peakDeltas = [];

  for (let i = 0; i < ITERATIONS; i++) {
    if (global.gc) global.gc();
    const baselineRss = process.memoryUsage().rss;
    let peakDuringCall = baselineRss;

    // Argon2 освобождает свою рабочую память СРАЗУ после вычисления хэша (это специально —
    // алгоритм не должен оставлять чувствительные данные в памяти дольше необходимого).
    // Поэтому измерение "до вызова / после вызова" систематически опаздывает — память
    // к моменту второго замера уже освобождена. Вместо этого опрашиваем RSS процесса
    // каждые несколько миллисекунд, ПОКА вызов ещё выполняется 
    const poller = setInterval(() => {
      const current = process.memoryUsage().rss;
      if (current > peakDuringCall) peakDuringCall = current;
    }, 3);

    const t0 = process.hrtime.bigint();
    await argon2.hash(PASSWORD, {
      type: argon2.argon2id,
      memoryCost: profile.memoryCost,
      timeCost: profile.timeCost,
      parallelism: profile.parallelism
    });
    const t1 = process.hrtime.bigint();

    clearInterval(poller);

    times.push(Number(t1 - t0) / 1_000_000);
    peakDeltas.push(Math.max(0, peakDuringCall - baselineRss));
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  // Медиана устойчивее к редким выбросам, чем максимум по всем повторам
  const sortedPeaks = [...peakDeltas].sort((a, b) => a - b);
  const medianPeakMem = sortedPeaks[Math.floor(sortedPeaks.length / 2)];

  return { avgTime, medianPeakMem, times, peakDeltas };
}

async function main() {
  const requestedLabel = process.argv[2]; // опционально: node benchmark/argon2-benchmark.js "current"
  const profilesToRun = requestedLabel
    ? PROFILES.filter(p => p.label.includes(requestedLabel))
    : PROFILES;

  if (requestedLabel && profilesToRun.length === 0) {
    console.log(`Профиль с меткой, содержащей "${requestedLabel}", не найден. Доступные:`);
    PROFILES.forEach(p => console.log(`  - ${p.label}`));
    return;
  }

  console.log(`Бенчмарк Argon2id — ${ITERATIONS} повторов на профиль, пароль: "${PASSWORD}"\n`);
  if (!global.gc) {
    console.log('Подсказка: запусти с флагом --expose-gc для более точного замера памяти:');
    console.log('  node --expose-gc benchmark/argon2-benchmark.js\n');
  }
  if (profilesToRun.length > 1) {
    console.log(
      'ВАЖНО про память: несколько профилей замеряются подряд в ОДНОМ процессе Node.js.\n' +
      'Node не всегда возвращает память ОС сразу после сборки мусора, поэтому "пик памяти"\n' +
      'для профилей, идущих ПОСЛЕ более тяжёлого, может выглядеть заниженным (базовая линия\n' +
      'уже завышена предыдущим профилем). Для точного замера памяти конкретного профиля\n' +
      'запусти его отдельно, например:\n' +
      '  node --expose-gc benchmark/argon2-benchmark.js "high"\n' +
      'Время выполнения (timeCost) эта проблема не затрагивает — оно измеряется точно.\n'
    );
  }

  const results = [];
  for (const profile of profilesToRun) {
    process.stdout.write(`Замер: ${profile.label}... `);
    const result = await benchmarkProfile(profile);
    results.push({ profile, result });
    console.log('готово');
  }

  console.log('\n--- Результаты ---\n');
  console.log(
    'Профиль'.padEnd(28) +
    'Среднее время'.padEnd(16) +
    'Пик памяти (от старта профиля)'
  );
  console.log('-'.repeat(80));

  for (const { profile, result } of results) {
    console.log(
      profile.label.padEnd(28) +
      formatMs(result.avgTime).padEnd(16) +
      formatMb(result.medianPeakMem)
    );
  }

  console.log('\n--- Что это значит на практике ---');
  const current = results.find(r => r.profile.label.includes('current'));
  if (current) {
    const attemptsPerSecond = 1000 / current.result.avgTime;
    const millionPasswordsHours = (1_000_000 / attemptsPerSecond / 3600).toFixed(1);
    console.log(
      `При текущих настройках проекта (${current.profile.label}) один сервер успевает ` +
      `~${attemptsPerSecond.toFixed(1)} попыток хэширования в секунду на одном ядре.`
    );
    console.log(
      `Перебор 1 000 000 паролей на одном ядре занял бы ~${millionPasswordsHours} ч. — ` +
      `и это без учёта rate limiting, который в проекте дополнительно ограничивает ` +
      `реальное число попыток входа с одного IP.`
    );
  }
}

main().catch((err) => {
  console.error('Ошибка бенчмарка:', err);
  process.exit(1);
});
