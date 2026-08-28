import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
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

// Drive the public save handler with request success separated from transaction
// completion. A successful IndexedDB request alone does not commit the photo.
const photoSource = await readFile(new URL('../photo-engine.js', import.meta.url), 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));

function savingHarness(options = {}) {
  const file = { name: 'progress.jpg', type: 'image/jpeg', size: 1024 };
  const button = { disabled: Boolean(options.buttonDisabled) };
  const input = {
    files: [file], value: 'progress.jpg', disabled: false,
    parentElement: { querySelectorAll: () => [button] }
  };
  const note = { value: 'Frontal', disabled: false };
  const message = { textContent: '', style: {} };
  const elements = { photoInput: input, photoNote: note, photoStatus: message };
  const writes = [];
  const records = [];
  const database = {
    close() {},
    transaction(_store, mode) {
      const transaction = {
        objectStore: () => ({
          getAll() {
            const request = { result: records.slice() };
            queueMicrotask(() => request.onsuccess?.());
            return request;
          },
          put(record) {
            const request = {};
            const write = { record, transaction, request };
            writes.push(write);
            queueMicrotask(() => request.onsuccess?.());
            return request;
          }
        })
      };
      if (mode) assert.equal(mode, 'readwrite');
      return transaction;
    }
  };
  const context = {
    Blob,
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
    Image: class {
      naturalWidth = 800;
      naturalHeight = 600;
      set src(_value) {
        queueMicrotask(() => options.decodeError ? this.onerror() : this.onload());
      }
    },
    document: {
      getElementById: id => elements[id] || null,
      createElement(tag) {
        assert.equal(tag, 'canvas');
        return {
          getContext: () => ({ fillRect() {}, drawImage() {} }),
          toBlob: callback => queueMicrotask(() => callback(new Blob(['jpeg'], { type: 'image/jpeg' })))
        };
      }
    },
    indexedDB: {
      open() {
        const request = { result: database, error: new Error('Almacenamiento no disponible') };
        queueMicrotask(() => options.databaseError ? request.onerror() : request.onsuccess());
        return request;
      }
    },
    localStorage: { getItem: () => null },
    RecompPersistence: { clip: (value, max) => String(value ?? '').slice(0, max) },
    alert: () => assert.fail('Unexpected alert')
  };
  vm.runInNewContext(photoSource, context);
  return {
    input, note, button, message, writes, records,
    save: () => context.savePhoto(),
    commit(index = writes.length - 1) {
      records.push(writes[index].record);
      writes[index].transaction.oncomplete?.();
    },
    abort(index = writes.length - 1) {
      const transaction = writes[index].transaction;
      transaction.error = new Error('Sin espacio para guardar');
      transaction.onabort?.();
    }
  };
}

test('photo save confirms and clears inputs only after transaction commit', async () => {
  const h = savingHarness();
  const saving = h.save();
  await flush();
  assert.equal(h.writes.length, 1);
  assert.equal(h.input.value, 'progress.jpg');
  assert.equal(h.note.value, 'Frontal');
  assert.doesNotMatch(h.message.textContent, /Foto guardada/);
  assert.equal(h.input.disabled, true);
  assert.equal(h.note.disabled, true);
  assert.equal(h.button.disabled, true);
  h.commit();
  await saving;
  assert.equal(h.records.length, 1);
  assert.equal(h.input.value, '');
  assert.equal(h.note.value, '');
  assert.match(h.message.textContent, /Foto guardada/);
  assert.equal(h.input.disabled, false);
  assert.equal(h.note.disabled, false);
  assert.equal(h.button.disabled, false);
});

test('repeated taps during saving create exactly one write', async () => {
  const h = savingHarness();
  const first = h.save();
  const repeated = h.save();
  await flush();
  assert.equal(h.writes.length, 1);
  h.commit();
  await Promise.all([first, repeated]);
  assert.equal(h.records.length, 1);
});

test('transaction abort after request success preserves selection and permits retry', async () => {
  const h = savingHarness();
  const first = h.save();
  await flush();
  h.abort();
  await first;
  assert.match(h.message.textContent, /Sin espacio/);
  assert.equal(h.message.style.color, '#ff8f8f');
  assert.equal(h.input.value, 'progress.jpg');
  assert.equal(h.note.value, 'Frontal');
  assert.equal(h.button.disabled, false);
  assert.equal(h.records.length, 0);
  const retry = h.save();
  await flush();
  assert.equal(h.writes.length, 2);
  h.commit();
  await retry;
  assert.equal(h.records.length, 1);
  assert.match(h.message.textContent, /Foto guardada/);
});

test('save snapshots the note and does not erase a newer selection', async () => {
  const h = savingHarness({ buttonDisabled: true });
  const saving = h.save();
  h.note.value = 'Lateral';
  h.input.files = [{ name: 'next.jpg', type: 'image/jpeg', size: 2048 }];
  h.input.value = 'next.jpg';
  await flush();
  assert.equal(h.writes[0].record.note, 'Frontal');
  assert.equal(h.writes[0].record.originalBytes, 1024);
  h.commit();
  await saving;
  assert.equal(h.input.value, 'next.jpg');
  assert.equal(h.note.value, 'Lateral');
  assert.equal(h.button.disabled, true);
});

for (const failure of ['decodeError', 'databaseError']) {
  test(`${failure} preserves inputs and releases the saving lock`, async () => {
    const options = { [failure]: true };
    const h = savingHarness(options);
    await h.save();
    assert.equal(h.writes.length, 0);
    assert.equal(h.input.value, 'progress.jpg');
    assert.equal(h.note.value, 'Frontal');
    assert.equal(h.input.disabled, false);
    assert.equal(h.note.disabled, false);
    assert.equal(h.button.disabled, false);
    assert.equal(h.message.style.color, '#ff8f8f');
    options[failure] = false;
    const retry = h.save();
    await flush();
    assert.equal(h.writes.length, 1);
    h.commit();
    await retry;
    assert.match(h.message.textContent, /Foto guardada/);
  });
}
