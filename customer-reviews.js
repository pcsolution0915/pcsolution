(function(){
 'use strict';
 const admin=document.body.dataset.reviews==='admin';
 const client=typeof supabaseClient!=='undefined'?supabaseClient:null;
 const host=document.getElementById(admin?'reviewAdmin':'reviews');if(!host||!client)return;
 const labels={gaming:'게이밍 PC',office:'사무용 PC',repair:'수리·업그레이드',other:'기타'};
 const states={pending:'확인 대기',approved:'공개',hidden:'숨김'};
 const fields='id,nickname,rating,category,body,status,created_at,updated_at';
 const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
 const size=admin?10:3;let page=0,rows=[],busy=false,seq=0,loaded=false;
 const filter=admin?document.getElementById('reviewFilter'):null;
 const list=document.getElementById('reviewList'),message=document.getElementById('reviewMessage');
 const prev=document.getElementById('reviewPrevious'),next=document.getElementById('reviewNext');
 function say(s){message.textContent=s;}
 function date(s){const d=new Date(s);return Number.isFinite(d.getTime())?d.toLocaleDateString('ko-KR'):'';}
 function render(){
  list.innerHTML=rows.length?rows.slice(0,size).map(r=>'<article class="review-card pcs-review-card"><div class="pcs-review-meta"><strong>'+esc(r.nickname)+'</strong><span aria-label="별점 '+Number(r.rating)+'점">'+'★'.repeat(Math.min(5,Math.max(0,Number(r.rating)||0)))+'</span></div><p class="pcs-review-body">'+esc(r.body)+'</p><small>'+esc(labels[r.category]||'기타')+' · '+esc(date(r.created_at))+'</small><button type="button" class="pcs-review-link" data-review-read="'+Number(r.id)+'">전체 내용 보기</button>'+(admin?'<div class="pcs-review-actions"><b>'+esc(states[r.status]||'')+'</b>'+['approved','hidden'].filter(s=>s!==r.status).map(s=>'<button type="button" data-review-action="'+s+'" data-id="'+Number(r.id)+'">'+(s==='approved'?'공개하기':'숨기기')+'</button>').join('')+'<button type="button" data-review-action="delete" data-id="'+Number(r.id)+'">삭제</button></div>':'')+'</article>').join(''):'<p class="pcs-review-empty">'+(admin?'이 상태의 후기가 없습니다.':'아직 공개된 후기가 없습니다. 첫 후기를 남겨주세요.')+'</p>';
  list.querySelectorAll('[data-review-read]').forEach(b=>b.addEventListener('click',()=>{
   const r=rows.find(r=>String(r.id)===b.dataset.reviewRead);if(!r)return;
   const d=document.getElementById('reviewReadDialog');d.querySelector('h3').textContent=r.nickname+'님의 후기';d.querySelector('[data-review-full]').textContent=r.body;d.showModal();
  }));
  list.querySelectorAll('[data-review-action]').forEach(b=>b.addEventListener('click',()=>moderate(b.dataset.id,b.dataset.reviewAction)));
  prev.disabled=page===0||busy;next.disabled=rows.length<=size||busy;
  document.getElementById('reviewPage').textContent=(page+1)+' 페이지';
 }
 async function load(){
  if(admin&&document.getElementById('adminSection').classList.contains('hidden'))return;
  const request=++seq;const currentPage=page;const state=admin?filter.value:'approved';
  try{
   const{data,error}=await client.from('pcs_customer_reviews').select(fields).eq('status',state).order('created_at',{ascending:false}).order('id',{ascending:false}).range(currentPage*size,currentPage*size+size);
   if(request!==seq)return;if(error)throw error;
   rows=data||[];if(!rows.length&&page>0){page--;return load();}loaded=true;render();say(admin?'고객 작성 후기를 확인하고 공개 여부를 선택하세요.':'관리자 확인을 마친 고객후기입니다.');
  }catch(e){if(request!==seq)return;say('후기를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.');if(!loaded)list.textContent='후기 목록 연결을 확인하고 있습니다.';}
 }
 async function moderate(id,action){
  if(busy)return;const row=rows.find(r=>String(r.id)===String(id));if(!row)return;
  if(action==='delete'&&!confirm('이 후기를 삭제할까요? 삭제한 내용은 복구할 수 없습니다.'))return;
  busy=true;render();list.querySelectorAll('[data-review-action]').forEach(b=>b.disabled=true);
  try{
   const q=action==='delete'?client.from('pcs_customer_reviews').delete():client.from('pcs_customer_reviews').update({status:action});
   const{data,error}=await q.eq('id',row.id).eq('updated_at',row.updated_at).select('id');if(error)throw error;
   if(!data?.length)throw Error('다른 화면에서 변경된 후기입니다. 새로고침 후 다시 확인해 주세요.');
   try{localStorage.setItem('pcs-review-change',String(Date.now()));}catch{}
   await load();say(action==='delete'?'후기를 삭제했습니다.':'후기 공개 상태를 변경했습니다.');
  }catch(e){say(e.message||'변경하지 못했습니다. 다시 확인해 주세요.');}finally{busy=false;render();}
 }
 prev.addEventListener('click',()=>{if(!busy&&page>0){page--;load();}});next.addEventListener('click',()=>{if(!busy&&rows.length>size){page++;load();}});
 document.getElementById('reviewRefresh').addEventListener('click',()=>{if(!busy)load();});
 filter?.addEventListener('change',()=>{if(!busy){page=0;load();}});
 document.querySelectorAll('[data-review-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
 if(!admin){
  const dialog=document.getElementById('reviewWriteDialog'),form=document.getElementById('reviewForm'),feedback=document.getElementById('reviewFormMessage');
  let sending=false,submission='';
  function newId(){return crypto.randomUUID?crypto.randomUUID():([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));}
  document.getElementById('reviewWrite').addEventListener('click',()=>dialog.showModal());
  form.addEventListener('submit',async e=>{
   e.preventDefault();if(sending||!form.reportValidity())return;
   const nickname=form.elements.namedItem('nickname').value.trim(),body=form.elements.namedItem('body').value.trim();
   if(!nickname||nickname.length>20||body.length<10||body.length>2000){feedback.textContent='닉네임은 1~20자, 후기 내용은 10~2,000자로 입력해주세요.';return;}
   if(!form.elements.namedItem('consent').checked){feedback.textContent='후기 공개 안내를 확인해주세요.';return;}
   submission=submission||newId();sending=true;const button=document.getElementById('reviewSubmit');button.disabled=true;feedback.textContent='후기를 접수하고 있습니다…';
   try{
    const{data,error}=await client.rpc('submit_customer_review_v34',{p_submission_id:submission,p_nickname:nickname,p_rating:Number(form.elements.namedItem('rating').value),p_category:form.elements.namedItem('category').value,p_body:body,p_website:form.elements.namedItem('website').value});
    if(error||data!==true)throw Error('후기를 접수하지 못했습니다. 잠시 후 다시 시도해주세요.');
    form.reset();submission='';feedback.textContent='후기를 접수했습니다. 관리자 확인 후 홈페이지에 공개됩니다. 감사합니다!';
   }catch(err){feedback.textContent=err.message||'연결을 확인한 뒤 다시 시도해주세요.';}finally{sending=false;button.disabled=false;}
  });
  window.addEventListener('storage',e=>{if(e.key==='pcs-review-change')load();});
 }else{
  new MutationObserver(()=>{if(!document.getElementById('adminSection').classList.contains('hidden'))load();else{++seq;rows=[];list.textContent='로그인 후 확인할 수 있습니다.';}}).observe(document.getElementById('adminSection'),{attributes:true,attributeFilter:['class']});
 }
 window.addEventListener('focus',()=>{if(!busy)load();});
 let timer=setInterval(()=>{if(!document.hidden&&!busy)load();},30000);
 window.addEventListener('pagehide',()=>{clearInterval(timer);++seq;});window.addEventListener('pageshow',e=>{if(e.persisted){timer=setInterval(()=>{if(!document.hidden&&!busy)load();},30000);load();}});
 load();
})();
