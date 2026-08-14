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

  globalThis.RecompDate = { localDayKey, localTimestamp };
})();
