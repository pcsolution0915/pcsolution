(function(){
 'use strict';
 const allowed=['cpu','gpu','ram','ssd','main_board','power','monitor','hdd','keyboard_mouse'];
 const client=typeof supabaseClient!=='undefined'?supabaseClient:window.supabase?.createClient(document.body.dataset.server,document.body.dataset.key);
 const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
 function safe(s){try{const u=new URL(String(s||''),location.href);return s&&['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}}
 const dialog=document.createElement('dialog');dialog.className='pcs-part-dialog';dialog.id='pcsPartDialog36';dialog.setAttribute('aria-labelledby','pcsPartTitle36');
 dialog.innerHTML='<header><h2 id="pcsPartTitle36">부품 상세 설명</h2><button type="button" aria-label="부품 상세 설명 닫기">닫기</button></header><div id="pcsPartContent36" aria-live="polite"></div>';document.body.appendChild(dialog);
 const content=document.getElementById('pcsPartContent36'),title=document.getElementById('pcsPartTitle36');let sequence=0,opener=null;
 dialog.querySelector('header button').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{++sequence;content.replaceChildren();if(opener?.isConnected)opener.focus();});
 function image(s,alt,cls=''){const url=safe(s);return url?'<img class="'+cls+'" src="'+esc(url)+'" alt="'+esc(alt)+'" loading="lazy" decoding="async">':'';}
 async function open(productId,field,button){
  const id=Number(productId);if(!Number.isSafeInteger(id)||id<=0||!allowed.includes(field))return;
  const request=++sequence;opener=button||document.activeElement;title.textContent='부품 상세 설명';content.textContent='등록된 부품 설명을 불러오고 있습니다.';
  if(!dialog.open)dialog.showModal();dialog.scrollTop=0;content.scrollTop=0;
  try{
   if(!client)throw Error('연결 확인 필요');
   const{data,error}=await client.rpc('get_product_part_detail_v35',{p_product_id:id,p_field:field});if(request!==sequence)return;if(error)throw error;
   if(!data){content.textContent='이 부품의 상세 설명을 준비하고 있습니다. 궁금한 내용은 상담으로 문의해주세요.';return;}
   title.textContent=[data.manufacturer,data.model_name].filter(Boolean).join(' ')||'부품 상세 설명';
   content.innerHTML=image(data.image_url,title.textContent+' 대표 사진','pcs-part-photo')+(data.specification?'<h3>주요 사양</h3><p>'+esc(data.specification)+'</p>':'')+'<h3>상세 설명</h3>'+(data.detail_description?'<p>'+esc(data.detail_description)+'</p>':'')+image(data.description_image_url,title.textContent+' 상세 설명')+(!data.detail_description&&!safe(data.description_image_url)?'<p>상세 설명을 준비하고 있습니다.</p>':'');
   content.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{const p=document.createElement('p');p.textContent='이미지를 불러오지 못했습니다.';img.replaceWith(p);}));
  }catch(e){if(request===sequence)content.textContent='상세 설명을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';}
 }
 document.addEventListener('click',e=>{const b=e.target.closest('button[data-part-detail]');if(!b)return;open(b.dataset.productId||window.pcsDisplayedProduct35,b.dataset.partDetail,b);});
 window.PCSPartDetails36={open};
})();
