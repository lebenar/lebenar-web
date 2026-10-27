import {createCommunity} from './community-controller.mjs?v=social-1';
import {getApp} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';
import {getFirestore,doc,getDocFromServer,collection,query,orderBy,limit,onSnapshot,addDoc,serverTimestamp,deleteDoc} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import {subscribeAccess,mountAccess,accessUser} from './membership-20261025.js?v=social-1';
import {setProgressAccess} from './progress-20261025.js?v=social-1';
const portal=window.lebenarPortal,db=getFirestore(getApp());const social=createCommunity({db,getUser:accessUser,getAccess:()=>portal.getAccess()});let generation=0,lastKey='',catalogMessage='',catalogBusy=false;
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
function mountCommunity(){social.mount(document.querySelector('[data-community-root]'));}
portal.mount=mount;
subscribeAccess(access=>{
 const signature=JSON.stringify([accessUser()?.uid||null,access.status,access.training,access.community,access.admin]);if(signature===lastKey)return;lastKey=signature;const run=++generation;
 social.stop();catalogMessage='';catalogBusy=false;setProgressAccess(null,false);portal.setAccess(access);
 if(access.training)loadCatalog(access,run);else mount();
});

import('./notifications-20261026.js?v=social-1').catch(()=>{const host=document.querySelector('#notification-host');if(host)host.textContent='Avisos no disponibles';});
