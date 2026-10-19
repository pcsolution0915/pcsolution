/* PC SOLUTION catalog updates: realtime hints + visible-tab polling + local admin hints. */
(function(global){
 'use strict';
 const STORAGE_KEY='pcsolution-catalog-version',CHANNEL='pcsolution-catalog-updates';
 function notify(){
  const signal={time:Date.now(),nonce:Math.random().toString(36).slice(2)};
  try{global.localStorage.setItem(STORAGE_KEY,JSON.stringify(signal));}catch(_){}
  try{if(global.BroadcastChannel){const channel=new global.BroadcastChannel(CHANNEL);channel.postMessage(signal);channel.close();}}catch(_){}
  try{global.dispatchEvent(new global.Event('pcsolution:catalog-change'));}catch(_){}
 }
 function create(options){
  const client=options.client,doc=global.document;
  let running=false,pending=null,queued=false,timer=null,debounce=null,channel=null,broadcast=null;
  let fingerprint=null,hasData=false,generation=0;
  const visible=()=>!doc.hidden;
  const state=value=>{if(running&&options.onState)options.onState(value);};
  async function refresh(){
   if(!running||!visible())return;
   if(pending){queued=true;return pending;}
   const current=generation;
   pending=(async()=>{
    try{
     if(!client)throw Error('상품 연결을 확인해 주세요.');
     let rows=[],offset=0;
     while(true){
      let query=client.from('pcsolution').select('*').order('id',{ascending:false});
      if(options.category)query=query.eq('category',options.category);
      const{data,error}=await query.range(offset,offset+499);
      if(!running||current!==generation)return;
      if(error)throw error;
      const page=Array.isArray(data)?data:[];rows.push(...page);
      if(page.length<500)break;offset+=500;
     }
     const signature=JSON.stringify(rows);
     if(signature!==fingerprint){options.onData(rows);fingerprint=signature;hasData=true;}
     state('ready');
    }catch(error){
     if(running&&current===generation){if(options.onError)options.onError(error,{hasData});state('retrying');}
    }
   })();
   try{await pending;}finally{
    pending=null;
    if(queued&&running){queued=false;schedule();}
   }
  }
  function schedule(){if(!running||!visible())return;if(debounce!==null)global.clearTimeout(debounce);debounce=global.setTimeout(()=>{debounce=null;refresh();},150);}
  const onStorage=event=>{if(event.key===STORAGE_KEY)schedule();};
  const onVisible=()=>{if(visible())refresh();};
  const onFocus=()=>refresh();
  function start(){
   if(running)return refresh();running=true;generation++;
   global.addEventListener('storage',onStorage);global.addEventListener('focus',onFocus);global.addEventListener('pcsolution:catalog-change',schedule);doc.addEventListener('visibilitychange',onVisible);
   timer=global.setInterval(()=>{if(visible())refresh();},Math.max(5000,options.interval||10000));
   try{if(global.BroadcastChannel){broadcast=new global.BroadcastChannel(CHANNEL);broadcast.onmessage=schedule;}}catch(_){}
   try{if(client&&typeof client.channel==='function')channel=client.channel('catalog-products-'+Math.random().toString(36).slice(2)).on('postgres_changes',{event:'*',schema:'public',table:'pcsolution'},schedule).subscribe();}catch(_){}
   return refresh();
  }
  function stop(){
   running=false;generation++;queued=false;
   if(timer!==null)global.clearInterval(timer);if(debounce!==null)global.clearTimeout(debounce);timer=debounce=null;
   global.removeEventListener('storage',onStorage);global.removeEventListener('focus',onFocus);global.removeEventListener('pcsolution:catalog-change',schedule);doc.removeEventListener('visibilitychange',onVisible);
   if(broadcast){broadcast.close();broadcast=null;}
   if(channel&&client&&typeof client.removeChannel==='function'){try{Promise.resolve(client.removeChannel(channel)).catch(()=>{});}catch(_){}channel=null;}
  }
  return{start,refresh,stop};
 }
 global.PCSCatalogLive={create,notify};
})(window);
