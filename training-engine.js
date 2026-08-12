(() => {
  'use strict';

  const clamp = (value, min, max, fallback = 0) => {
    value = Number(value);
    return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  };

  function parseRepRange(range) {
    const values = String(range ?? '').match(/\d+(?:[.,]\d+)?/g)?.map(value => Number(value.replace(',', '.'))) ?? [];
    const low = values[0] ?? 8;
    const high = values[1] ?? low;
    return { low: Math.min(low, high), high: Math.max(low, high) };
  }

  function normalizeSet(set = {}) {
    const rawRir = set.rir;
    return {
      kg: clamp(set.kg, 0, 2000),
      reps: Math.round(clamp(set.reps, 0, 1000)),
      rir: rawRir === '' || rawRir === null || rawRir === undefined
        ? null
        : clamp(rawRir, 0, 10, null)
    };
  }

  function lastExercise(workouts, name) {
    if (!Array.isArray(workouts)) return null;
    for (let index = workouts.length - 1; index >= 0; index--) {
      const exercise = workouts[index]?.exercises?.find(item => item?.name === name);
      if (exercise) return exercise;
    }
    return null;
  }

  function bestLoad(workouts, name) {
    let best = 0;
    if (!Array.isArray(workouts)) return best;
    workouts.forEach(workout => workout?.exercises
      ?.filter(exercise => exercise?.name === name)
      .forEach(exercise => exercise?.sets?.forEach(set => {
        best = Math.max(best, clamp(set?.kg, 0, 2000));
      })));
    return best;
  }

  function sessionVolume(exercises) {
    if (!Array.isArray(exercises)) return 0;
    return exercises.reduce((total, exercise) => total + (exercise?.sets ?? [])
      .reduce((sum, set) => {
        const clean = normalizeSet(set);
        return sum + clean.kg * clean.reps;
      }, 0), 0);
  }

  function progressionAdvice(workouts, name, range) {
    const latest = lastExercise(workouts, name);
    if (!latest) return 'Primera sesión: elige una carga cómoda y deja 2-3 RIR.';

    const sets = (latest.sets ?? []).map(normalizeSet).filter(set => set.reps > 0);
    if (!sets.length) return 'Sin series válidas previas: registra repeticiones y RIR antes de progresar.';

    const { low, high } = parseRepRange(range);
    const rirValues = sets.map(set => set.rir).filter(Number.isFinite);
    if (!rirValues.length) return 'Mantén la carga y registra el RIR para ajustar la siguiente sesión.';

    const averageRir = rirValues.reduce((sum, value) => sum + value, 0) / rirValues.length;
    const allAtTop = sets.every(set => set.reps >= high);
    const belowMinimum = sets.some(set => set.reps < low);

    if (averageRir <= 0.5 || (belowMinimum && averageRir <= 1)) {
      return 'Reduce la carga un 5-10% y recupera 1-3 RIR con técnica estable.';
    }
    if (allAtTop && averageRir >= 1.5) {
      return 'Rango completado con margen: sube la carga un 2,5-5% la próxima sesión.';
    }
    if (averageRir >= 3 && sets.every(set => set.reps >= low)) {
      return 'Añade 1 repetición por serie; sube carga al completar el límite superior.';
    }
    return 'Repite la carga e intenta sumar 1 repetición total manteniendo 1-3 RIR.';
  }

  globalThis.RecompTraining = {
    parseRepRange, normalizeSet, lastExercise, bestLoad, sessionVolume, progressionAdvice
  };
})();
