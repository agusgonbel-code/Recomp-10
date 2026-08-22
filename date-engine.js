(function () {
  'use strict';

  const pad = value => String(value).padStart(2, '0');

  function validDate(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) throw new TypeError('Fecha no válida');
    return date;
  }

  function localDayKey(value = new Date()) {
    const date = validDate(value);
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function localTimestamp(value = new Date()) {
    const date = validDate(value);
    const offsetMinutes = -date.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absolute = Math.abs(offsetMinutes);
    const offset = sign + pad(Math.floor(absolute / 60)) + ':' + pad(absolute % 60);
    return localDayKey(date) + 'T' +
      pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds()) +
      '.' + String(date.getMilliseconds()).padStart(3, '0') + offset;
  }

  function shiftLocalDay(day, amount) {
    if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new TypeError('Fecha no válida');
    const parts = day.split('-').map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2], 12);
    if (date.getFullYear() !== parts[0] || date.getMonth() !== parts[1] - 1 || date.getDate() !== parts[2]) throw new TypeError('Fecha no válida');
    amount = Number(amount);
    if (!Number.isInteger(amount) || Math.abs(amount) > 3660) throw new TypeError('Desplazamiento no válido');
    date.setDate(date.getDate() + amount);
    return localDayKey(date);
  }

  globalThis.RecompDate = { localDayKey, localTimestamp, shiftLocalDay };

  if (typeof document !== 'undefined') {
    const load = src => new Promise((resolve, reject) => {
      if (document.querySelector(`script[data-r10-v2="${src}"]`)) return resolve();
      const script = document.createElement('script');
      script.src = src; script.dataset.r10V2 = src; script.onload = resolve; script.onerror = reject;
      document.head.append(script);
    });
    load('recomp-profile-v2.js')
      .then(() => load('recomp-intake-v2.js'))
      .then(() => load('recomp-review-v3.js'))
      .then(() => load('recomp-trend-v3.js'))
      .then(() => load('recomp-trend-ui-v3.js'))
      .then(() => load('recomp-checkin-v4.js'))
      .then(() => load('nutrition-menu-runtime-v5.js'))
      .then(() => load('nutrition-menu-experience-v5.js'))
      .catch(error => console.error('Recomp enhancement load failed', error));
  }
})();
