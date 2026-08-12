(() => {
  'use strict';

  const MAX_BACKUP_BYTES = 25 * 1024 * 1024;
  const plain = value => value && typeof value === 'object' && !Array.isArray(value);
  const clip = (value, length = 120) => String(value ?? '').trim().slice(0, length);
  const num = (value, min, max, fallback = 0) => {
    value = Number(value);
    return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  };
  const optionalNum = (value, min, max) => (
    value === null || value === '' || value === undefined ? null : num(value, min, max, null)
  );
  const date = value => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
  const imageData = value => (
    typeof value === 'string' &&
    value.length <= 4.2 * 1024 * 1024 &&
    /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=\s]+$/i.test(value)
  ) ? value : '';

  function cleanBackup(data) {
    if (!plain(data)) throw new Error('La copia debe contener un objeto JSON');
    const out = {};

    if ('profile' in data) {
      if (!plain(data.profile)) throw new Error('Perfil no válido');
      out.profile = { name: clip(data.profile.name, 80) || 'Usuario' };
    }
    if ('targets' in data) {
      if (!plain(data.targets)) throw new Error('Objetivos no válidos');
      out.targets = {
        kcal: num(data.targets.kcal, 800, 10000, 3014),
        protein: num(data.targets.protein, 0, 500, 156),
        carbs: num(data.targets.carbs, 0, 1500, 422),
        fat: num(data.targets.fat, 0, 500, 78)
      };
    }
    if ('routines' in data) {
      if (!plain(data.routines)) throw new Error('Rutinas no válidas');
      out.routines = {};
      Object.entries(data.routines).slice(0, 14).forEach(([day, list]) => {
        if (!Array.isArray(list)) return;
        out.routines[clip(day, 30)] = list.slice(0, 30).filter(Array.isArray).map(item => [
          clip(item[0], 100) || 'Ejercicio',
          Math.round(num(item[1], 1, 12, 3)),
          clip(item[2], 20) || '8-12'
        ]);
      });
    }
    if ('workouts' in data) {
      if (!Array.isArray(data.workouts)) throw new Error('Entrenamientos no válidos');
      out.workouts = data.workouts.slice(-1000).filter(plain).map(workout => ({
        date: date(workout.date),
        day: clip(workout.day, 30),
        notes: clip(workout.notes, 500),
        volume: num(workout.volume, 0, 1e9),
        exercises: Array.isArray(workout.exercises)
          ? workout.exercises.slice(0, 30).filter(plain).map(exercise => ({
              name: clip(exercise.name, 100) || 'Ejercicio',
              sets: Array.isArray(exercise.sets)
                ? exercise.sets.slice(0, 20).filter(plain).map(set => ({
                    kg: num(set.kg, 0, 2000),
                    reps: Math.round(num(set.reps, 0, 1000)),
                    rir: optionalNum(set.rir, 0, 10)
                  }))
                : []
            }))
          : []
      }));
    }
    if ('meals' in data) {
      if (!Array.isArray(data.meals)) throw new Error('Comidas no válidas');
      out.meals = data.meals.slice(-5000).filter(plain).map((meal, index) => ({
        id: num(meal.id, 1, Number.MAX_SAFE_INTEGER, Date.now() + index),
        date: clip(meal.date, 10),
        type: clip(meal.type, 30),
        name: clip(meal.name, 120) || 'Comida',
        kcal: num(meal.kcal, 0, 10000),
        p: num(meal.p, 0, 1000),
        c: num(meal.c, 0, 2000),
        f: num(meal.f, 0, 1000)
      }));
    }
    if ('metrics' in data) {
      if (!Array.isArray(data.metrics)) throw new Error('Métricas no válidas');
      out.metrics = data.metrics.slice(-2000).filter(plain).map(metric => ({
        date: date(metric.date),
        weight: num(metric.weight, 20, 500, null),
        fat: num(metric.fat, 0, 100, null),
        waist: num(metric.waist, 20, 300, null),
        chest: num(metric.chest, 20, 300, null)
      }));
    }
    if ('photos' in data) {
      if (!Array.isArray(data.photos)) throw new Error('Fotos no válidas');
      out.photos = data.photos.slice(-20).filter(plain).map(photo => ({
        date: date(photo.date),
        note: clip(photo.note, 300),
        data: imageData(photo.data)
      })).filter(photo => photo.data);
    }
    if (!Object.keys(out).length) throw new Error('La copia no contiene datos compatibles');
    return out;
  }

  function storeBackup(data, storage = globalThis.localStorage) {
    const previous = new Map();
    try {
      Object.entries(data).forEach(([key, value]) => {
        previous.set(key, storage.getItem(key));
        storage.setItem(key, JSON.stringify(value));
      });
    } catch (error) {
      previous.forEach((value, key) => {
        if (value === null) storage.removeItem(key);
        else storage.setItem(key, value);
      });
      throw error;
    }
  }

  globalThis.RecompPersistence = {
    MAX_BACKUP_BYTES, clip, num, esc, imageData, cleanBackup, storeBackup
  };
})();
