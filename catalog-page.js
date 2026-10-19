(function(){
 'use strict';
 const category=document.body.dataset.category;
 const label=category==='gaming'?'게이밍 PC':'사무용 PC';
 const search=document.getElementById('catalogSearch'),sort=document.getElementById('catalogSort'),grid=document.getElementById('catalogGrid'),count=document.getElementById('catalogCount'),status=document.getElementById('catalogStatus');
 let products=[],page=0;const pageSize=12;
 const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
 function imageUrl(value){if(typeof value!=='string'||!value.trim())return '';try{const url=new URL(value,location.href);return ['http:','https:'].includes(url.protocol)?url.href:'';}catch{return '';}}
 function render(){
  const keyword=search.value.trim().toLowerCase();
  const filtered=products.filter(item=>[item.name,item.cpu,item.gpu,item.ram,item.ssd,item.description].some(value=>String(value||'').toLowerCase().includes(keyword)));
  if(sort.value==='priceLow'||sort.value==='priceHigh')filtered.sort((a,b)=>(Number(a.price)||0)-(Number(b.price)||0));
  else if(sort.value==='name')filtered.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ko'));
  else filtered.sort((a,b)=>Number(b.id)-Number(a.id));
  if(sort.value==='priceHigh')filtered.reverse();
  page=Math.max(0,Math.min(page,Math.max(0,Math.ceil(filtered.length/pageSize)-1)));
  count.textContent=filtered.length+'개 상품';
  grid.innerHTML=filtered.length?filtered.slice(page*pageSize,(page+1)*pageSize).map(item=>{
   const id=Number(item.id);if(!Number.isSafeInteger(id)||id<=0)return '';
   const img=imageUrl(item.image_url),name=esc(item.name||label),price=Number(item.price),href='product.html?id='+id;
   const specs=[['CPU',item.cpu],['GPU',item.gpu],['RAM',item.ram],['SSD',item.ssd]].filter(([,value])=>value);
   return '<article class="catalog-card"><a href="'+href+'" class="catalog-photo" aria-label="'+name+' 상세 보기">'+(img?'<img src="'+esc(img)+'" alt="'+name+'" loading="lazy" decoding="async">':'<span class="image-placeholder">PC SOLUTION<br><small>상품 이미지 준비 중</small></span>')+'</a><div class="catalog-card-body"><span class="category-chip">'+label+'</span><h2><a href="'+href+'">'+name+'</a></h2><dl>'+specs.map(([key,value])=>'<div><dt>'+key+'</dt><dd>'+esc(value)+'</dd></div>').join('')+'</dl><div class="catalog-card-footer"><strong>'+(Number.isFinite(price)&&price>0?price.toLocaleString('ko-KR')+'<small>원</small>':'가격 문의')+'</strong><a href="'+href+'" aria-label="'+name+' 상세 보기">자세히 보기 <span aria-hidden="true">↗</span></a></div></div></article>';
  }).join(''):'<div class="catalog-empty"><h2>'+(keyword?'검색 결과가 없습니다.':'등록된 '+label+' 상품을 준비하고 있습니다.')+'</h2><p>'+(keyword?'검색어를 바꾸거나 전체 목록을 확인해 주세요.':'원하는 사양과 예산을 알려주시면 맞춤 상담을 도와드려요.')+'</p><a href="consulting.html">맞춤 PC 상담 →</a></div>';
  grid.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{const placeholder=document.createElement('span');placeholder.className='image-placeholder';placeholder.textContent='상품 이미지 준비 중';img.replaceWith(placeholder);}));
  document.getElementById('catalogPage').textContent=(page+1)+' / '+Math.max(1,Math.ceil(filtered.length/pageSize));
  document.getElementById('catalogPrevious').disabled=page===0;document.getElementById('catalogNext').disabled=(page+1)*pageSize>=filtered.length;
 }
 search.addEventListener('input',()=>{page=0;render();});sort.addEventListener('change',()=>{page=0;render();});
 document.getElementById('catalogPrevious').addEventListener('click',()=>{page--;render();document.getElementById('catalogToolbar').scrollIntoView({block:'start',behavior:'smooth'});});
 document.getElementById('catalogNext').addEventListener('click',()=>{page++;render();document.getElementById('catalogToolbar').scrollIntoView({block:'start',behavior:'smooth'});});
 document.querySelectorAll('[data-preparing]').forEach(button=>button.addEventListener('click',()=>alert('준비중 입니다.')));
 const menu=document.getElementById('catalogMenu'),nav=document.getElementById('catalogNav');
 menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});
 nav.querySelectorAll('a,button').forEach(link=>link.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false');}));
 document.addEventListener('keydown',event=>{if(event.key==='Escape'){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');}});
 const client=window.supabase?window.supabase.createClient(document.body.dataset.server,document.body.dataset.key):null;
 if(!window.PCSCatalogLive){grid.innerHTML='<div class="catalog-empty"><h2>상품을 불러오지 못했습니다.</h2><p>잠시 후 다시 확인해 주세요.</p></div>';return;}
 const controller=window.PCSCatalogLive.create({client,category,onData(rows){products=rows.filter(item=>item.category===category);render();},onState(value){status.textContent=value==='ready'?'상품이 바뀌면 자동으로 업데이트됩니다.':'연결을 다시 확인하고 있습니다. 기존 목록은 계속 볼 수 있어요.';},onError(error,{hasData}){if(!hasData){grid.innerHTML='<div class="catalog-empty"><h2>상품을 불러오지 못했습니다.</h2><p>잠시 후 자동으로 다시 확인합니다.</p></div>';count.textContent='연결 확인 중';}}});
 controller.start();window.addEventListener('pagehide',()=>controller.stop());window.addEventListener('pageshow',event=>{if(event.persisted)controller.start();});
})();
