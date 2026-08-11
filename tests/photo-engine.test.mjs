import assert from 'node:assert/strict';
await import('../photo-engine.js');

const {
  MAX_INPUT_BYTES, MAX_STORED_BYTES, MAX_BACKUP_BYTES, MAX_TOTAL_PHOTO_BYTES,
  MAX_PHOTOS, isSupportedPhoto, fittedSize, parseImageDataUrl, validateArchive
} = globalThis.RecompPhotos;

const tinyJpeg = 'data:image/jpeg;base64,/9j/2Q==';
const valid = [{
  id: 'p1',
  date: '2026-08-11T12:00:00.000Z',
  note: 'Frontal',
  data: tinyJpeg
}];

assert.equal(MAX_INPUT_BYTES, 25 * 1024 * 1024);
assert.equal(MAX_STORED_BYTES, 5 * 1024 * 1024);
assert.equal(MAX_BACKUP_BYTES, 100 * 1024 * 1024);
assert.equal(MAX_TOTAL_PHOTO_BYTES, 60 * 1024 * 1024);
assert.equal(MAX_PHOTOS, 300);

assert.equal(isSupportedPhoto({ name: 'progreso.HEIC', type: '', size: 1024 }), true);
assert.equal(isSupportedPhoto({ name: 'progreso', type: 'image/heif', size: 1024 }), true);
assert.equal(isSupportedPhoto({ name: 'vector.svg', type: 'image/svg+xml', size: 1024 }), false);
assert.equal(isSupportedPhoto({ name: 'foto.jpg', type: 'image/jpeg', size: 26 * 1024 * 1024 }), false);
assert.equal(isSupportedPhoto({ name: 'vacía.jpg', type: 'image/jpeg', size: 0 }), false);

assert.deepEqual(fittedSize(4032, 3024), { width: 1600, height: 1200 });
assert.deepEqual(fittedSize(3024, 4032, 1200), { width: 900, height: 1200 });
assert.deepEqual(fittedSize(800, 600), { width: 800, height: 600 });
assert.throws(() => fittedSize(0, 600), /Dimensiones/);

assert.deepEqual(parseImageDataUrl(tinyJpeg), {
  type: 'image/jpeg',
  bytes: 4,
  encoded: '/9j/2Q=='
});
assert.deepEqual(validateArchive(valid), { photoCount: 1, totalBytes: 4 });
assert.throws(
  () => validateArchive([{ ...valid[0], data: 'data:text/html;base64,PGgxPg==' }]),
  /formato/
);
assert.throws(
  () => validateArchive([valid[0], { ...valid[0] }]),
  /repetido/
);
assert.throws(
  () => validateArchive([{ ...valid[0], date: 'fecha-inválida' }]),
  /fecha/
);
assert.throws(
  () => validateArchive([{ ...valid[0], note: 'x'.repeat(301) }]),
  /nota/
);

console.log('Photo engine tests passed');
