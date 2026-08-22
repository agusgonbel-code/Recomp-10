(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root){root.RecompCheckinLocalV55=api;if(root.RecompCheckin)api.install(root.RecompCheckin,root.RecompDate);}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function fallbackLocalDay(value=new Date()){
    const d=value instanceof Date?value:new Date(value);
    if(Number.isNaN(d.getTime()))throw new TypeError('Fecha no válida');
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function install(engine,dateApi){
    if(!engine)return engine;
    if(!engine.__localV55OriginalAdd&&typeof engine.add==='function')engine.__localV55OriginalAdd=engine.add.bind(engine);
    const originalAdd=engine.__localV55OriginalAdd;
    if(typeof originalAdd==='function')engine.add=(history,input={})=>{
      const localDay=(dateApi?.localDayKey||fallbackLocalDay)();
      const next=input&&input.date?input:{...input,date:localDay};
      return originalAdd(history,next);
    };
    engine.__localV55=true;
    return engine;
  }
  return{install,fallbackLocalDay};
});
