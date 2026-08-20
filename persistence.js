(() => {
  'use strict';

  const MAX_BACKUP_BYTES = 25 * 1024 * 1024;
  const MEAL_PLAN_KEY = 'recomp10.mealPlan30';
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

  function cleanMealPlan30(plan) {
    if (!plain(plan) || !plain(plan.preferences) || !Array.isArray(plan.days) || plan.days.length < 1 || plan.days.length > 30) {
      throw new Error('Plan nutricional no válido');
    }
    const allowedDiets = new Set(['flexible', 'vegetariana', 'vegana', 'pescetariana', 'sin-lactosa', 'sin-gluten']);
    const allowedBudgets = new Set(['bajo', 'medio', 'alto']);
    const allowedVariety = new Set(['alta', 'media', 'baja']);
    const list = value => Array.isArray(value) ? value.slice(0, 30).map(item => clip(item, 120)).filter(Boolean) : [];
    const preferences = {
      kcal: num(plan.preferences.kcal, 1200, 5000, 2200),
      protein: num(plan.preferences.protein, 40, 300, 160),
      carbs: num(plan.preferences.carbs, 50, 800, 250),
      fat: num(plan.preferences.fat, 30, 200, 70),
      days: Math.round(num(plan.preferences.days, 1, 30, plan.days.length)),
      meals: Math.round(num(plan.preferences.meals, 3, 5, 4)),
      diet: allowedDiets.has(plan.preferences.diet) ? plan.preferences.diet : 'flexible',
      excluded: list(plan.preferences.excluded),
      pantry: list(plan.preferences.pantry),
      maxTime: num(plan.preferences.maxTime, 10, 90, 30),
      budget: allowedBudgets.has(plan.preferences.budget) ? plan.preferences.budget : 'medio',
      variety: allowedVariety.has(plan.preferences.variety) ? plan.preferences.variety : 'alta'
    };
    preferences.days = plan.days.length;
    const days = plan.days.map((day, dayIndex) => {
      if (!plain(day) || !Array.isArray(day.items) || day.items.length < 3 || day.items.length > 5) {
        throw new Error('El plan nutricional contiene un día no válido');
      }
      const items = day.items.map(item => {
        if (!plain(item) || !plain(item.recipe)) throw new Error('El plan nutricional contiene una comida no válida');
        const ingredientAmounts = Array.isArray(item.ingredientAmounts)
          ? item.ingredientAmounts.slice(0, 30).filter(plain).map(ingredient => ({
              text: clip(ingredient.text, 160),
              adjustable: Boolean(ingredient.adjustable),
              qty: optionalNum(ingredient.qty, 0, 10000),
              unit: clip(ingredient.unit, 20),
              name: clip(ingredient.name, 100),
              nutrients: plain(ingredient.nutrients) ? {
                k: num(ingredient.nutrients.k, 0, 5000),
                p: num(ingredient.nutrients.p, 0, 500),
                c: num(ingredient.nutrients.c, 0, 1000),
                f: num(ingredient.nutrients.f, 0, 500)
              } : null,
              estimated: Boolean(ingredient.estimated)
            }))
          : [];
        return {
          recipe: {
            id: clip(item.recipe.id, 80),
            n: clip(item.recipe.n, 120) || 'Comida',
            m: clip(item.recipe.m, 40),
            k: num(item.recipe.k, 0, 5000),
            p: num(item.recipe.p, 0, 500),
            c: num(item.recipe.c, 0, 1000),
            f: num(item.recipe.f, 0, 500),
            i: list(item.recipe.i),
            s: list(item.recipe.s),
            time: num(item.recipe.time, 0, 240),
            difficulty: clip(item.recipe.difficulty, 40)
          },
          scale: num(item.scale, 0.1, 5, 1),
          k: num(item.k, 0, 5000),
          p: num(item.p, 0, 500),
          c: num(item.c, 0, 1000),
          f: num(item.f, 0, 500),
          score: num(item.score, -10, 100, 0),
          slot: clip(item.slot, 40),
          ingredientAmounts
        };
      });
      return {
        day: Math.round(num(day.day, 1, 30, dayIndex + 1)),
        items,
        totals: items.reduce((total, item) => ({
          k: total.k + item.k, p: total.p + item.p, c: total.c + item.c, f: total.f + item.f
        }), { k: 0, p: 0, c: 0, f: 0 }),
        error: optionalNum(day.error, 0, 10)
      };
    });
    return { createdAt: date(plan.createdAt), preferences, days };
  }

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
        f: num(meal.f, 0, 1000),
        sourceKey: clip(meal.sourceKey, 160)
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
    if (MEAL_PLAN_KEY in data) {
      out[MEAL_PLAN_KEY] = cleanMealPlan30(data[MEAL_PLAN_KEY]);
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

  const MAX_SHADOW_BYTES = 1.5 * 1024 * 1024;
  const clone = value => JSON.parse(JSON.stringify(value));

  function compatible(value, fallback) {
    if (Array.isArray(fallback)) return Array.isArray(value);
    if (plain(fallback)) return plain(value);
    if (fallback === null) return value !== undefined;
    return typeof value === typeof fallback;
  }

  function createJsonStore({
    storage = globalThis.localStorage,
    prefix = 'recomp10m',
    onError = () => {}
  } = {}) {
    if (!storage) throw new Error('Almacenamiento local no disponible');
    const recoveredKeys = new Set();
    const backupKey = key => prefix + ':last-good:' + clip(key, 100);
    const decode = (raw, fallback) => {
      if (typeof raw !== 'string' || !raw) return null;
      try {
        const value = JSON.parse(raw);
        if (!compatible(value, fallback)) return null;
        return plain(fallback) ? { ...clone(fallback), ...value } : value;
      } catch { return null; }
    };
    const restore = (key, value) => {
      try {
        if (value === null) storage.removeItem(key);
        else storage.setItem(key, value);
      } catch {}
    };
    return {
      recoveredKeys,
      clear(keys) {
        if (!Array.isArray(keys)) throw new TypeError('Se esperaba una lista de claves');
        [...new Set(keys.map(key => clip(key, 100)).filter(Boolean))].forEach(key => {
          storage.removeItem(key);
          storage.removeItem(backupKey(key));
          recoveredKeys.delete(key);
        });
      },
      g(key, fallback) {
        const primary = decode(storage.getItem(key), fallback);
        if (primary !== null) return primary;
        const backup = decode(storage.getItem(backupKey(key)), fallback);
        if (backup !== null) {
          recoveredKeys.add(key);
          return backup;
        }
        return clone(fallback);
      },
      s(key, value) {
        let serialized;
        try { serialized = JSON.stringify(value); }
        catch (error) { onError(error, key); throw error; }
        const shadow = backupKey(key);
        const previousPrimary = storage.getItem(key);
        const previousShadow = storage.getItem(shadow);
        const validPrevious = decode(previousPrimary, value);
        try {
          if (validPrevious !== null && previousPrimary.length <= MAX_SHADOW_BYTES) {
            storage.setItem(shadow, previousPrimary);
          }
          storage.setItem(key, serialized);
          if (serialized.length > MAX_SHADOW_BYTES) {
            try { storage.removeItem(shadow); } catch {}
          }
          recoveredKeys.delete(key);
          return value;
        } catch (error) {
          restore(key, previousPrimary);
          restore(shadow, previousShadow);
          onError(error, key);
          throw error;
        }
      }
    };
  }

  globalThis.RecompPersistence = {
    MAX_BACKUP_BYTES, MAX_SHADOW_BYTES, MEAL_PLAN_KEY, clip, num, esc, imageData, cleanMealPlan30, cleanBackup, storeBackup, createJsonStore
  };
})();
