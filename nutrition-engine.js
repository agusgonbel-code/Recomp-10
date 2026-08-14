(() => {
  'use strict';

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const finite = (value, name, min, max) => {
    value = Number(value);
    if (!Number.isFinite(value) || value < min || value > max) {
      throw new Error(`${name} debe estar entre ${min} y ${max}.`);
    }
    return value;
  };

  function calculateTargets(input) {
    const sex = input?.sex;
    if (!['m', 'f'].includes(sex)) throw new Error('Selecciona un sexo válido.');
    const age = finite(input.age, 'La edad', 14, 100);
    const height = finite(input.height, 'La altura', 120, 230);
    const weight = finite(input.weight, 'El peso', 35, 350);
    const activity = finite(input.activity, 'La actividad', 1.1, 2.2);
    const goal = finite(input.goal, 'El ajuste del objetivo', -0.3, 0.2);
    const bmr = 10 * weight + 6.25 * height - 5 * age + (sex === 'm' ? 5 : -161);
    const tdee = bmr * activity;
    const kcal = Math.round(tdee * (1 + goal));
    const protein = Math.round(weight * (goal < 0 ? 2.2 : 2));
    const fat = Math.round(weight * 0.9);
    const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
    return { kcal, protein, carbs, fat, bmr: Math.round(bmr), tdee: Math.round(tdee) };
  }

  function mealTotals(meals, date) {
    const number = value => {
      value = Number(value);
      return Number.isFinite(value) ? Math.max(0, value) : 0;
    };
    return (Array.isArray(meals) ? meals : [])
      .filter(meal => meal?.date === date)
      .reduce((total, meal) => ({
        k: total.k + number(meal.kcal),
        p: total.p + number(meal.p),
        c: total.c + number(meal.c),
        f: total.f + number(meal.f)
      }), { k: 0, p: 0, c: 0, f: 0 });
  }

  function mealEntryFromPlan(item, date, sourceKey, id = Date.now()) {
    if (!item || typeof item !== 'object' || !item.recipe || typeof item.recipe !== 'object') {
      throw new Error('La comida planificada no es válida.');
    }
    const day = String(date ?? '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('La fecha del diario no es válida.');
    const number = (value, max) => {
      value = Number(value);
      if (!Number.isFinite(value)) return 0;
      return Math.min(max, Math.max(0, Math.round(value)));
    };
    const key = String(sourceKey ?? '').trim().slice(0, 160);
    if (!key) throw new Error('Falta el identificador de la comida planificada.');
    return {
      id: Number.isSafeInteger(Number(id)) && Number(id) > 0 ? Number(id) : Date.now(),
      date: day,
      type: String(item.slot || item.recipe.m || 'Comida').trim().slice(0, 30) || 'Comida',
      name: String(item.recipe.n || 'Comida planificada').trim().slice(0, 120) || 'Comida planificada',
      kcal: number(item.k, 10000),
      p: number(item.p, 1000),
      c: number(item.c, 2000),
      f: number(item.f, 1000),
      sourceKey: key
    };
  }

  function saveMealEntry(meals, draft, editingId = null) {
    if (!Array.isArray(meals)) throw new TypeError('El diario no es válido.');
    if (!draft || typeof draft !== 'object') throw new TypeError('La comida no es válida.');
    const date = String(draft.date ?? '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('La fecha del diario no es válida.');
    const parts = date.split('-').map(Number);
    const calendarDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    if (calendarDate.getUTCFullYear() !== parts[0] || calendarDate.getUTCMonth() !== parts[1] - 1 || calendarDate.getUTCDate() !== parts[2]) {
      throw new Error('La fecha del diario no es válida.');
    }
    const number = (value, name, max) => {
      value = Number(value);
      if (!Number.isFinite(value) || value < 0 || value > max) throw new Error(`${name} no es válido.`);
      return Math.round(value);
    };
    const id = editingId === null
      ? (Number.isSafeInteger(Number(draft.id)) && Number(draft.id) > 0 ? Number(draft.id) : Date.now())
      : Number(editingId);
    const index = editingId === null ? -1 : meals.findIndex(meal => Number(meal?.id) === id);
    if (editingId !== null && index < 0) throw new Error('La comida ya no existe.');
    const previous = index < 0 ? {} : meals[index];
    const entry = {
      id,
      date,
      type: String(draft.type ?? previous.type ?? 'Comida').trim().slice(0, 30) || 'Comida',
      name: String(draft.name ?? previous.name ?? 'Comida').trim().slice(0, 120) || 'Comida',
      kcal: number(draft.kcal, 'Las calorías', 10000),
      p: number(draft.p, 'La proteína', 1000),
      c: number(draft.c, 'Los carbohidratos', 2000),
      f: number(draft.f, 'Las grasas', 1000)
    };
    const sourceKey = String(draft.sourceKey ?? previous.sourceKey ?? '').trim().slice(0, 160);
    if (sourceKey) entry.sourceKey = sourceKey;
    const next = meals.slice();
    if (index < 0) next.push(entry); else next[index] = entry;
    return { meals: next, entry, created: index < 0 };
  }

  function mealsForDay(meals, date) {
    if (!Array.isArray(meals)) return [];
    return meals.filter(meal => meal?.date === date).slice().sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
  }

  function scaledRecipe(recipe, scale) {
    scale = clamp(Number(scale) || 1, 0.7, 1.6);
    return {
      recipe,
      scale,
      k: Math.round(recipe.k * scale),
      p: Math.round(recipe.p * scale),
      c: Math.round(recipe.c * scale),
      f: Math.round(recipe.f * scale)
    };
  }

  function buildDayMenu(recipes, targets, seed = 0) {
    if (!Array.isArray(recipes) || !recipes.length) throw new Error('No hay recetas disponibles.');
    const kcal = finite(targets?.kcal, 'Las calorías objetivo', 800, 10000);
    const protein = finite(targets?.protein, 'La proteína objetivo', 20, 500);
    const slots = [
      ['Desayuno', 0.22], ['Comida', 0.32], ['Merienda', 0.16], ['Cena', 0.30]
    ];
    const items = slots.map(([meal, share], index) => {
      const targetKcal = kcal * share;
      const targetProtein = protein * share;
      const candidates = recipes.filter(recipe => recipe?.m === meal).map(recipe => {
        const item = scaledRecipe(recipe, targetKcal / recipe.k);
        const score = Math.abs(item.k - targetKcal) / targetKcal +
          Math.abs(item.p - targetProtein) / Math.max(1, targetProtein);
        return { item, score };
      }).sort((a, b) => a.score - b.score || a.item.recipe.n.localeCompare(b.item.recipe.n, 'es'));
      if (!candidates.length) throw new Error(`Faltan recetas para ${meal}.`);
      return candidates[(Math.abs(Math.trunc(seed)) + index) % Math.min(3, candidates.length)].item;
    });
    const totals = items.reduce((total, item) => ({
      k: total.k + item.k, p: total.p + item.p, c: total.c + item.c, f: total.f + item.f
    }), { k: 0, p: 0, c: 0, f: 0 });
    return { items, totals };
  }

  function buildWeekMenu(recipes, targets) {
    return Array.from({ length: 7 }, (_, index) => buildDayMenu(recipes, targets, index));
  }

  function shoppingItems(menus) {
    const list = Array.isArray(menus) ? menus : [menus];
    return [...new Set(list.flatMap(menu => menu?.items ?? []).flatMap(item =>
      (item.recipe.i ?? []).map(ingredient => `${item.scale.toFixed(2)}× ${ingredient}`)
    ))];
  }

  globalThis.RecompNutrition = {
    calculateTargets, mealTotals, mealEntryFromPlan, saveMealEntry, mealsForDay,
    scaledRecipe, buildDayMenu, buildWeekMenu, shoppingItems
  };
})();
