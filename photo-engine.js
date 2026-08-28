(() => {
  'use strict';

  const DB_NAME = 'recomp-photos-v1';
  const STORE_NAME = 'photos';
  const SCHEMA = 'recomp-10-backup';
  const SCHEMA_VERSION = 2;
  const MAX_INPUT_BYTES = 25 * 1024 * 1024;
  const MAX_STORED_BYTES = 5 * 1024 * 1024;
  const MAX_BACKUP_BYTES = 100 * 1024 * 1024;
  const MAX_TOTAL_PHOTO_BYTES = 60 * 1024 * 1024;
  const MAX_PHOTOS = 300;
  const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
  const EXTENSIONS = /\.(?:jpe?g|png|webp|heic|heif)$/i;
  const CORE_KEYS = ['profile', 'targets', 'routines', 'workouts', 'meals', 'metrics'];
  let galleryUrls = [];
  let compareUrls = [];
  let selected = new Set();
  let savingPhoto = false;

  const fail = message => { throw new Error(message); };
  const bytesFromBase64 = encoded => {
    const padding = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0;
    return Math.floor(encoded.length * 3 / 4) - padding;
  };

  function isSupportedPhoto(file) {
    if (!file || !Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_INPUT_BYTES) return false;
    const type = String(file.type || '').split(';')[0].trim().toLowerCase();
    return TYPES.has(type) || EXTENSIONS.test(String(file.name || ''));
  }

  function fittedSize(width, height, maxSide = 1600) {
    if (![width, height, maxSide].every(Number.isFinite) || width <= 0 || height <= 0 || maxSide <= 0) {
      fail('Dimensiones de foto no válidas.');
    }
    const scale = Math.min(1, maxSide / Math.max(width, height));
    return {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale))
    };
  }

  function parseImageDataUrl(value) {
    if (typeof value !== 'string') fail('Una foto no contiene datos válidos.');
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
    if (!match) fail('Una foto usa un formato no permitido.');
    const bytes = bytesFromBase64(match[2]);
    if (bytes <= 0 || bytes > MAX_STORED_BYTES) fail('Una foto supera el límite seguro.');
    return { type: match[1], bytes, encoded: match[2] };
  }

  function validateArchive(records) {
    if (!Array.isArray(records) || records.length > MAX_PHOTOS) fail('La copia contiene demasiadas fotos.');
    const ids = new Set();
    let totalBytes = 0;
    for (const record of records) {
      if (!record || typeof record !== 'object' || Array.isArray(record)) fail('Hay una foto no válida.');
      if (typeof record.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(record.id) || ids.has(record.id)) {
        fail('Hay un identificador de foto no válido o repetido.');
      }
      ids.add(record.id);
      const date = new Date(record.date);
      if (Number.isNaN(date.getTime())) fail('Hay una fecha de foto no válida.');
      if (typeof record.note !== 'string' || record.note.length > 300) fail('Hay una nota de foto no válida.');
      const parsed = parseImageDataUrl(record.data);
      totalBytes += parsed.bytes;
      if (totalBytes > MAX_TOTAL_PHOTO_BYTES) fail('Las fotos de la copia superan 60 MB.');
    }
    return { photoCount: records.length, totalBytes };
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function allPhotos() {
    const database = await openDatabase();
    try {
      return await new Promise((resolve, reject) => {
        const request = database.transaction(STORE_NAME).objectStore(STORE_NAME).getAll();
        request.onsuccess = () => resolve(request.result.sort((a, b) => String(a.date).localeCompare(String(b.date))));
        request.onerror = () => reject(request.error);
      });
    } finally {
      database.close();
    }
  }

  async function putPhoto(record) {
    const database = await openDatabase();
    try {
      await new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        // Request success is provisional: quota or disk errors can still abort
        // the transaction. Do not announce success until the write commits.
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error || new Error('No se pudo guardar la foto.'));
        transaction.onabort = () => reject(transaction.error || new Error('Guardado cancelado.'));
        transaction.objectStore(STORE_NAME).put(record);
      });
    } finally {
      database.close();
    }
  }

  async function removePhoto(id) {
    const database = await openDatabase();
    try {
      await new Promise((resolve, reject) => {
        const request = database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(id);
        request.onsuccess = resolve;
        request.onerror = () => reject(request.error);
      });
    } finally {
      database.close();
    }
  }

  async function replacePhotos(records) {
    const database = await openDatabase();
    try {
      await new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.clear();
        records.forEach(record => store.put(record));
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error || new Error('Operación cancelada.'));
      });
    } finally {
      database.close();
    }
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      const finish = () => URL.revokeObjectURL(url);
      image.onload = () => { finish(); resolve(image); };
      image.onerror = () => { finish(); reject(new Error('Safari no pudo leer esta fotografía.')); };
      image.src = url;
    });
  }

  async function compressPhoto(file) {
    if (!isSupportedPhoto(file)) fail('Usa JPG, PNG, WebP o HEIC/HEIF de hasta 25 MB.');
    const image = await loadImage(file);
    const size = fittedSize(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, size.width, size.height);
    context.drawImage(image, 0, 0, size.width, size.height);
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(value => value ? resolve(value) : reject(new Error('No se pudo comprimir la foto.')), 'image/jpeg', 0.84);
    });
    canvas.width = canvas.height = 1;
    if (blob.size > MAX_STORED_BYTES) fail('La foto sigue siendo demasiado grande después de comprimirla.');
    return blob;
  }

  function clearUrls(list) {
    while (list.length) URL.revokeObjectURL(list.pop());
  }

  function objectUrl(blob, list) {
    const url = URL.createObjectURL(blob);
    list.push(url);
    return url;
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  function dataUrlToBlob(value) {
    const parsed = parseImageDataUrl(value);
    const binary = atob(parsed.encoded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: parsed.type });
  }

  function status(message, error = false) {
    const element = document.getElementById('photoStatus');
    if (!element) return;
    element.textContent = message;
    element.style.color = error ? '#ff8f8f' : '';
  }

  function ensureUi() {
    const input = document.getElementById('photoInput');
    const grid = document.getElementById('photoGrid');
    if (!input || !grid) return;
    input.accept = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif';
    if (!document.getElementById('photoStatus')) {
      const message = document.createElement('div');
      message.id = 'photoStatus';
      message.className = 'small';
      message.style.marginTop = '10px';
      input.parentElement.append(message);
    }
    if (!document.getElementById('photoCompare')) {
      const compare = document.createElement('div');
      compare.id = 'photoCompare';
      compare.className = 'card';
      compare.style.marginTop = '10px';
      compare.innerHTML = "<strong>Comparación</strong><div class='small'>Selecciona dos fotos tomadas con pose, luz y distancia similares.</div><div id='photoCompareOutput'></div>";
      grid.after(compare);
    }
  }

  async function savePhotoSecure() {
    if (savingPhoto) return;
    const input = document.getElementById('photoInput');
    const file = input?.files?.[0];
    if (!file) return alert('Selecciona una foto');
    const noteInput = document.getElementById('photoNote');
    const note = noteInput?.value || '';
    const controls = [input, noteInput, ...Array.from(input.parentElement?.querySelectorAll('button') || [])]
      .filter(Boolean).map(element => ({ element, disabled: element.disabled }));
    savingPhoto = true;
    try {
      controls.forEach(({ element }) => { element.disabled = true; });
      status('Optimizando foto para guardarla…');
      const blob = await compressPhoto(file);
      const existing = await allPhotos();
      if (existing.length >= MAX_PHOTOS) fail('Has alcanzado el límite de 300 fotos.');
      await putPhoto({
        id: 'p' + Date.now() + Math.random().toString(36).slice(2, 7),
        date: new Date().toISOString(),
        note: globalThis.RecompPersistence.clip(note, 300),
        blob,
        originalBytes: file.size,
        storedBytes: blob.size
      });
      // Preserve newer selections made programmatically while this save ran.
      if (input.files?.[0] === file) {
        input.value = '';
        if (noteInput?.value === note) noteInput.value = '';
      }
      status('Foto guardada · ' + Math.max(1, Math.round(blob.size / 1024)) + ' KB');
      await renderPhotosSecure();
    } catch (error) {
      status(error?.message || 'No se pudo guardar la foto.', true);
    } finally {
      controls.forEach(({ element, disabled }) => { element.disabled = disabled; });
      savingPhoto = false;
    }
  }

  async function deletePhotoSecure(id) {
    if (!confirm('¿Eliminar esta foto?')) return;
    await removePhoto(String(id));
    selected.delete(String(id));
    await renderPhotosSecure();
  }

  function renderComparison(records) {
    clearUrls(compareUrls);
    const output = document.getElementById('photoCompareOutput');
    if (!output) return;
    const chosen = records.filter(record => selected.has(record.id));
    if (chosen.length !== 2) {
      output.innerHTML = "<div class='small' style='margin-top:8px'>Seleccionadas: " + chosen.length + "/2</div>";
      return;
    }
    output.innerHTML = "<div class='photoGrid'>" + chosen.map(record =>
      "<div><img src='" + objectUrl(record.blob, compareUrls) + "' alt='Foto de progreso'><div class='small'>" +
      new Date(record.date).toLocaleDateString('es-ES') + "</div></div>"
    ).join('') + "</div><div class='small' style='margin-top:8px'>Compara postura, contorno y definición. No estima grasa corporal por imagen.</div>";
  }

  async function renderPhotosSecure() {
    ensureUi();
    const grid = document.getElementById('photoGrid');
    if (!grid) return;
    clearUrls(galleryUrls);
    try {
      const records = (await allPhotos()).reverse();
      selected = new Set([...selected].filter(id => records.some(record => record.id === id)));
      grid.innerHTML = records.length ? records.map(record =>
        "<div class='card'><strong>" + new Date(record.date).toLocaleDateString('es-ES') + "</strong>" +
        "<div class='small'>" + globalThis.RecompPersistence.esc(record.note) + "</div>" +
        "<img loading='lazy' src='" + objectUrl(record.blob, galleryUrls) + "' alt='Foto de progreso'>" +
        "<div class='row' style='margin-top:6px'><button class='secondary photoSelect' data-id='" + record.id + "'>" +
        (selected.has(record.id) ? 'Quitar' : 'Comparar') + "</button><button class='danger photoDelete' data-id='" +
        record.id + "'>Eliminar</button></div></div>"
      ).join('') : "<div class='empty'>Sin fotos.</div>";
      grid.querySelectorAll('.photoSelect').forEach(button => {
        button.onclick = async () => {
          const id = button.dataset.id;
          if (selected.has(id)) selected.delete(id);
          else {
            if (selected.size >= 2) selected.clear();
            selected.add(id);
          }
          await renderPhotosSecure();
        };
      });
      grid.querySelectorAll('.photoDelete').forEach(button => {
        button.onclick = () => deletePhotoSecure(button.dataset.id);
      });
      renderComparison(records);
    } catch (error) {
      grid.innerHTML = "<div class='notice'>No se pudieron leer las fotos guardadas.</div>";
      status(error?.message || 'Error de almacenamiento.', true);
    }
  }

  async function migrateLegacyPhotos() {
    const raw = localStorage.getItem('photos');
    if (!raw) return;
    let legacy;
    try { legacy = JSON.parse(raw); } catch { return; }
    if (!Array.isArray(legacy) || !legacy.length) {
      localStorage.removeItem('photos');
      return;
    }
    const current = await allPhotos();
    const records = current.slice();
    for (let index = 0; index < legacy.length; index += 1) {
      const photo = legacy[index];
      try {
        const blob = dataUrlToBlob(photo.data);
        records.push({
          id: 'legacy' + index + String(new Date(photo.date).getTime() || Date.now()),
          date: Number.isNaN(new Date(photo.date).getTime()) ? new Date().toISOString() : new Date(photo.date).toISOString(),
          note: globalThis.RecompPersistence.clip(photo.note, 300),
          blob, originalBytes: blob.size, storedBytes: blob.size
        });
      } catch {}
    }
    if (records.length > current.length) {
      await replacePhotos(records.slice(-MAX_PHOTOS));
      localStorage.removeItem('photos');
      status('Fotos anteriores migradas al almacenamiento seguro.');
    }
  }

  async function exportDataSecure() {
    status('Preparando copia con fotografías…');
    try {
      const payload = { schema: SCHEMA, schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString() };
      for (const key of CORE_KEYS) {
        const raw = localStorage.getItem(key);
        if (raw !== null) payload[key] = JSON.parse(raw);
      }
      const photos = await allPhotos();
      let total = 0;
      payload.photoArchive = [];
      for (const photo of photos) {
        if (!(photo.blob instanceof Blob) || photo.blob.size > MAX_STORED_BYTES) fail('Hay una foto que no se puede exportar de forma segura.');
        total += photo.blob.size;
        if (total > MAX_TOTAL_PHOTO_BYTES) fail('Las fotos superan 60 MB; elimina copias innecesarias.');
        payload.photoArchive.push({
          id: photo.id, date: photo.date, note: photo.note || '', data: await blobToDataUrl(photo.blob)
        });
      }
      validateArchive(payload.photoArchive);
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      if (blob.size > MAX_BACKUP_BYTES) fail('La copia supera 100 MB.');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'recomp-10-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status('Copia exportada · ' + photos.length + ' fotos');
    } catch (error) {
      status(error?.message || 'No se pudo exportar la copia.', true);
    }
  }

  async function importDataSecure(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) return alert('La copia supera el límite de 100 MB');
    try {
      const payload = JSON.parse(await file.text());
      const cleaned = globalThis.RecompPersistence.cleanBackup(payload);
      let archive = [];
      if (payload.schema === SCHEMA && payload.schemaVersion === SCHEMA_VERSION) {
        validateArchive(payload.photoArchive || []);
        archive = (payload.photoArchive || []).map(record => ({
          id: record.id, date: new Date(record.date).toISOString(),
          note: globalThis.RecompPersistence.clip(record.note, 300),
          blob: dataUrlToBlob(record.data)
        }));
      } else if (Array.isArray(cleaned.photos)) {
        archive = cleaned.photos.map((record, index) => ({
          id: 'imported' + index + Date.now(), date: record.date,
          note: record.note, blob: dataUrlToBlob(record.data)
        }));
      }
      delete cleaned.photos;
      const previousLocal = new Map(CORE_KEYS.map(key => [key, localStorage.getItem(key)]));
      const previousPhotos = await allPhotos();
      try {
        globalThis.RecompPersistence.storeBackup(cleaned);
        CORE_KEYS.filter(key => !(key in cleaned)).forEach(key => localStorage.removeItem(key));
        localStorage.removeItem('photos');
        await replacePhotos(archive);
      } catch (error) {
        for (const [key, raw] of previousLocal) {
          try { raw === null ? localStorage.removeItem(key) : localStorage.setItem(key, raw); } catch {}
        }
        try { await replacePhotos(previousPhotos); } catch {}
        throw new Error('La restauración falló y se recuperaron los datos anteriores.', { cause: error });
      }
      alert('Datos y fotos restaurados de forma segura');
      location.reload();
    } catch (error) {
      alert('Archivo no válido: ' + globalThis.RecompPersistence.clip(error?.message, 120));
    }
  }

  async function resetDataSecure() {
    if (!confirm('¿Borrar todos los datos, incluidas las fotos?')) return;
    try {
      localStorage.clear();
      await replacePhotos([]);
      selected.clear();
      location.reload();
    } catch (error) {
      alert('No se pudieron borrar todos los datos: ' + globalThis.RecompPersistence.clip(error?.message, 120));
    }
  }

  async function init() {
    ensureUi();
    globalThis.savePhoto = savePhotoSecure;
    globalThis.renderPhotos = renderPhotosSecure;
    globalThis.delPhoto = deletePhotoSecure;
    globalThis.exportData = exportDataSecure;
    globalThis.importData = importDataSecure;
    globalThis.resetData = resetDataSecure;
    try {
      await migrateLegacyPhotos();
      await renderPhotosSecure();
    } catch (error) {
      status(error?.message || 'No se pudo iniciar el almacenamiento de fotos.', true);
    }
  }

  globalThis.RecompPhotos = {
    MAX_INPUT_BYTES, MAX_STORED_BYTES, MAX_BACKUP_BYTES, MAX_TOTAL_PHOTO_BYTES,
    MAX_PHOTOS, isSupportedPhoto, fittedSize, parseImageDataUrl, validateArchive
  };

  if (typeof document !== 'undefined') init();
  if (typeof addEventListener === 'function') {
    addEventListener('pagehide', () => {
      clearUrls(galleryUrls);
      clearUrls(compareUrls);
    }, { once: true });
  }
})();
