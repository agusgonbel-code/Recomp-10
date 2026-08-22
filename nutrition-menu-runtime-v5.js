(()=>{'use strict';const finite=(value,fallback=0)=>{const n=Number(value);return Number.isFinite(n)?n:fallback};globalThis.finite=finite;globalThis.round=value=>Math.round(finite(value));})();
