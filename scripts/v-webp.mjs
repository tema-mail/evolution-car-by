// Перевод картинки в webp нужного размера. Отвечает на падение проверки
// scripts/proverka-kartinok.mjs, чтобы лечение было одной командой.
//
// Запуск: node scripts/v-webp.mjs public/img/foo.png [ещё файлы…]
// По умолчанию: ширина не больше исходной и не больше 1400 px, качество 80.
// Переменные: W=ширина Q=качество node scripts/v-webp.mjs …
//
// Исходник не удаляется: откат – вернуть расширение там, где картинка
// подключена. Путь в разметке правится руками, скрипт в код не лезет.
import sharp from 'sharp';
import { statSync } from 'node:fs';

const W = Number(process.env.W || 1400);
const Q = Number(process.env.Q || 80);
const files = process.argv.slice(2);
if (!files.length) {
  console.error('нечего делать: node scripts/v-webp.mjs <файл…>');
  process.exit(1);
}
const kb = (p) => Math.round(statSync(p).size / 1024);
for (const src of files) {
  const out = src.replace(/\.(png|jpe?g)$/i, '.webp');
  if (out === src) { console.error(`пропускаю ${src}: это не png и не jpg`); continue; }
  const meta = await sharp(src).metadata();
  const width = Math.min(meta.width, W);
  await sharp(src).resize({ width, withoutEnlargement: true }).webp({ quality: Q }).toFile(out);
  console.log(`${src}: ${meta.width}x${meta.height} -> ${width}px, ${kb(src)} КБ -> ${kb(out)} КБ`);
}
