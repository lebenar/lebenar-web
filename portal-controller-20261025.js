import {getApp} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';
import {getFirestore,doc,getDocFromServer,collection,query,orderBy,limit,onSnapshot,addDoc,serverTimestamp,deleteDoc} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import {subscribeAccess,mountAccess,accessUser} from './membership-20261025.js?v=profiles-1';
import {setProgressAccess} from './progress-20261025.js?v=profiles-1';
const portal=window.lebenarPortal,db=getFirestore(getApp());let generation=0,lastKey='',catalogMessage='',catalogBusy=false,stopCommunity=null,communityRoot=null;
const expectedIds=new Set(['despegue-spotify','despegue-youtube','guia-inicio','siglo-xxi','biblioteca','como-contactar','lista-profesional']);
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
async function loadCatalog(access,run){
 catalogBusy=true;catalogMessage='Abriendo tus materiales autorizados…';mount();
 try{
  const snap=await getDocFromServer(doc(db,'catalog','main'));if(!snap.exists())throw Error('catalog-unavailable');
  const rawKey=snap.data().key;if(typeof rawKey!=='string')throw Error('invalid-key');
  const response=await fetch('./catalog-vault-20261025.txt',{cache:'no-store'});if(!response.ok)throw Error('vault-unavailable');
  const bytes=Uint8Array.from(atob((await response.text()).trim()),c=>c.charCodeAt(0));
  const key=await crypto.subtle.importKey('raw',Uint8Array.from(atob(rawKey),c=>c.charCodeAt(0)),{name:'AES-GCM'},false,['decrypt']);
  const cipher=new Uint8Array(bytes.length-12);cipher.set(bytes.slice(28),0);cipher.set(bytes.slice(12,28),bytes.length-28);
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.slice(0,12)},key,cipher);
  const resources=JSON.parse(new TextDecoder().decode(plain));
  if(!Array.isArray(resources)||resources.length!==7||new Set(resources.map(x=>x.id)).size!==7||resources.some(x=>!expectedIds.has(x.id)||new URL(x.url).protocol!=='https:'))throw Error('invalid-catalog');
  // Server-managed guide replacement is readable only after approval, like the vault key.
  const replacement=snap.data().guideUrl;
  if(replacement!==undefined){
   const u=new URL(replacement);
   if(typeof replacement!=='string'||u.protocol!=='https:'||u.hostname!=='docs.google.com'||!/^\/document\/d\/[A-Za-z0-9_-]+\//.test(u.pathname))throw Error('invalid-guide');
   const guide=resources.find(x=>x.id==='guia-inicio');guide.url=replacement;
   guide.verification=typeof snap.data().guideVerification==='string'?snap.data().guideVerification:'Guía de inicio indicada por Leonel. Conserva los permisos del documento original.';
  }
  if(run!==generation||!portal.getAccess().training)return;
  catalogMessage='';portal.setCatalog(resources);setProgressAccess(accessUser(),true);
 }catch(e){if(run!==generation)return;catalogMessage='No pudimos abrir los materiales. Reintentá; el acceso permanece cerrado.';portal.catalogError();}
 finally{if(run===generation){catalogBusy=false;mount();}}
}
function mount(){
 mountAccess();const root=document.querySelector('#access-app');if(root&&catalogMessage){root.append(el('p',catalogMessage));if(!catalogBusy){const b=el('button','Reintentar materiales','btn btn-light');b.onclick=()=>loadCatalog(portal.getAccess(),generation);root.append(b);}}
 mountCommunity();
}
function mountCommunity(){
 const root=document.querySelector('[data-community-root]');if(root===communityRoot)return;stopCommunity?.();stopCommunity=null;communityRoot=root;if(!root||!portal.getAccess().community)return;
 root.replaceChildren();const intro=el('p','Compartí aprendizajes, novedades y preguntas con el equipo.');root.append(intro);
 const form=el('form'),label=el('label','Tu mensaje'),body=el('textarea');body.maxLength=2000;body.required=true;body.className='notes';body.id='community-body';label.htmlFor=body.id;form.append(label,body);
 const kind=el('select');kind.setAttribute('aria-label','Tipo de publicación');for(const [value,text]of [['conversation','Conversación'],...(portal.getAccess().admin?[['announcement','Novedad del equipo']]:[])]){const o=el('option',text);o.value=value;kind.append(o);}form.append(kind);
 const send=el('button','Publicar en la comunidad','btn btn-gold');send.type='submit';form.append(send);const status=el('p');status.setAttribute('role','status');form.append(status);root.append(form);
 const feed=el('section');feed.setAttribute('aria-label','Publicaciones del equipo');root.append(feed);
 form.onsubmit=async e=>{e.preventDefault();const current=accessUser(),access=portal.getAccess(),text=body.value.trim();if(!current||!access.community||!text||text.length>2000)return;send.disabled=true;
 try{await addDoc(collection(db,'community'),{body:text,kind:kind.value,authorUid:current.uid,authorLabel:(current.displayName||'Integrante').slice(0,80),createdAt:serverTimestamp()});body.value='';status.textContent='Mensaje publicado.';}catch{status.textContent='No se pudo publicar. Comprobá tu acceso y reintentá.';}finally{send.disabled=false;}};
 const run=generation;stopCommunity=onSnapshot(query(collection(db,'community'),orderBy('createdAt','desc'),limit(50)),snapshot=>{
 if(run!==generation||!portal.getAccess().community)return;feed.replaceChildren();const docs=[...snapshot.docs].sort((a,b)=>(b.data().createdAt?.toMillis?.()||0)-(a.data().createdAt?.toMillis?.()||0));
 if(!docs.length)feed.append(el('p','Todavía no hay publicaciones. Este es el espacio para empezar a compartir.'));
 for(const item of docs){const data=item.data(),card=el('article',null,'panel');card.append(el('strong',data.authorLabel||'Integrante'),el('p',data.body||''));if(data.createdAt?.toDate)card.append(el('small',data.createdAt.toDate().toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'})));
 if(portal.getAccess().admin||data.authorUid===accessUser()?.uid){const del=el('button','Eliminar publicación','btn btn-text');del.onclick=async()=>{if(!confirm('¿Eliminar esta publicación de la comunidad?'))return;try{await deleteDoc(doc(db,'community',item.id));}catch{status.textContent='No pudimos eliminar la publicación.';}};card.append(del);}feed.append(card);}
 },()=>{feed.replaceChildren(el('p','No se pudieron cargar las publicaciones. Verificá tu autorización.'));});
}
portal.mount=mount;
subscribeAccess(access=>{
 const signature=JSON.stringify([accessUser()?.uid||null,access.status,access.training,access.community,access.admin]);if(signature===lastKey)return;lastKey=signature;const run=++generation;
 stopCommunity?.();stopCommunity=null;communityRoot=null;catalogMessage='';catalogBusy=false;setProgressAccess(null,false);portal.setAccess(access);
 if(access.training)loadCatalog(access,run);else mount();
});

import('./notifications-20261026.js?v=profiles-1').catch(()=>{const host=document.querySelector('#notification-host');if(host)host.textContent='Avisos no disponibles';});
