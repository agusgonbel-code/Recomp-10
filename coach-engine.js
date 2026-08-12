(() => {
  'use strict';

  const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const validDate = value => {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  };

  function recentWorkouts(workouts, now, days = 7) {
    const end = validDate(now) ?? new Date();
    const start = new Date(end.getTime() - days * 86400000);
    return (Array.isArray(workouts) ? workouts : []).filter(workout => {
      const date = validDate(workout?.date);
      return date && date >= start && date <= end;
    });
  }

  function averageRir(workouts) {
    const values = (Array.isArray(workouts) ? workouts : []).flatMap(workout =>
      (workout?.exercises ?? []).flatMap(exercise =>
        (exercise?.sets ?? []).map(set => set?.rir)
      )
    ).filter(value => value !== '' && value !== null && value !== undefined)
      .map(Number).filter(value => Number.isFinite(value) && value >= 0 && value <= 10);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  }

  function weightTrend(metrics) {
    const values = (Array.isArray(metrics) ? metrics : []).map(metric => ({
      date: validDate(metric?.date), weight: Number(metric?.weight)
    })).filter(item => item.date && Number.isFinite(item.weight) && item.weight > 0)
      .sort((a, b) => a.date - b.date).slice(-8);
    if (values.length < 4) return null;
    const split = Math.floor(values.length / 2);
    const average = list => list.reduce((sum, item) => sum + item.weight, 0) / list.length;
    const before = average(values.slice(0, split));
    const after = average(values.slice(split));
    const spanDays = Math.max(1, (values.at(-1).date - values[0].date) / 86400000);
    if (spanDays < 7) return null;
    return { change: after - before, percent: (after - before) / before * 100, samples: values.length };
  }

  function buildCoachInsights(input = {}) {
    const now = validDate(input.now) ?? new Date();
    const sessions = recentWorkouts(input.workouts, now, 7);
    const targetSessions = Math.max(1, Math.min(7, Math.round(number(input.targetSessions, 4))));
    const insights = [];
    if (!sessions.length) {
      insights.push({ level: 'action', title: 'Empieza por registrar', text: 'Completa una sesión para que el Coach pueda ajustar la siguiente recomendación con tus datos.' });
    } else if (sessions.length < targetSessions) {
      insights.push({ level: 'action', title: 'Adherencia semanal', text: `${sessions.length} de ${targetSessions} sesiones registradas. Prioriza completar la próxima sesión prevista antes de añadir más volumen.` });
    } else {
      insights.push({ level: 'good', title: 'Semana completada', text: `${sessions.length} sesiones registradas en los últimos 7 días. Mantén el plan si recuperación y técnica son estables.` });
    }

    const rir = averageRir(sessions.slice(-2));
    if (rir !== null && rir < 1) {
      insights.push({ level: 'warning', title: 'Esfuerzo muy alto', text: `RIR medio ${rir.toFixed(1)}. Evita añadir carga y busca 1–3 RIR en la próxima sesión.` });
    } else if (rir !== null && rir > 3) {
      insights.push({ level: 'action', title: 'Margen para progresar', text: `RIR medio ${rir.toFixed(1)}. Si completas el rango, añade repeticiones antes de subir un 2,5–5%.` });
    } else if (rir !== null) {
      insights.push({ level: 'good', title: 'Esfuerzo bien calibrado', text: `RIR medio ${rir.toFixed(1)}, dentro del margen habitual de 1–3.` });
    }

    const protein = Math.max(0, number(input.totals?.p));
    const proteinTarget = Math.max(0, number(input.targets?.protein));
    const hour = Number.isFinite(Number(input.hour)) ? Number(input.hour) : now.getHours();
    if (proteinTarget > 0 && hour >= 16) {
      const ratio = protein / proteinTarget;
      if (ratio < 0.7) insights.push({ level: 'action', title: 'Proteína pendiente', text: `${Math.round(protein)} de ${Math.round(proteinTarget)} g registrados. Reparte lo restante entre las comidas que faltan.` });
      else insights.push({ level: 'good', title: 'Proteína encaminada', text: `${Math.round(protein)} de ${Math.round(proteinTarget)} g registrados hoy.` });
    }

    const trend = weightTrend(input.metrics);
    if (trend && Math.abs(trend.percent) >= 1) {
      insights.push({ level: 'warning', title: 'Revisa la tendencia de peso', text: `Cambio medio ${trend.change > 0 ? '+' : ''}${trend.change.toFixed(1)} kg (${trend.samples} registros). Confirma durante otra semana antes de ajustar calorías.` });
    }

    return { insights: insights.slice(0, 3), evidence: { sessions: sessions.length, averageRir: rir, weightTrend: trend } };
  }

  globalThis.RecompCoach = { recentWorkouts, averageRir, weightTrend, buildCoachInsights };
})();
