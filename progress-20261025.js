import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';
import {getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
import {getFirestore, doc, getDocFromServer, runTransaction, serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
const app=getApps().length?getApp():initializeApp({apiKey:'AIzaSyA3LaYCa1wa9DcUgMPK8pAUxD4U3LSoRSc',authDomain:'lebenar-educacion.firebaseapp.com',projectId:'lebenar-educacion',storageBucket:'lebenar-educacion.firebasestorage.app',messagingSenderId:'262913977772',appId:'1:262913977772:web:14f92b597679544b239e09'});
const auth=getAuth(app),db=getFirestore(app),bridge=window.lebenarAccount;
const blank=()=>({completed:[],saved:[],days:[],notes:{},last:null});
let user=null,ready=false,epoch=0,timer,status='Comprobando sesión…',baseline=blank(),pending=null,writing=false;
let guest=bridge.clean(bridge.read());
function panel(){
 document.querySelectorAll('[data-account-panel]').forEach(el=>{
 el.replaceChildren(); const title=document.createElement('h3');title.textContent=user?'Tu cuenta de aprendizaje':'Tu progreso, con vos';el.append(title);
 const message=document.createElement('p'); message.textContent=user?`${user.displayName||'Tu cuenta'} · ${status}`:'Entrá con Google para guardar tu progreso y recuperarlo en otro dispositivo.';el.append(message);
 const buttons=document.createElement('div');buttons.className='button-row';el.append(buttons);
 const add=(label,fn,disabled=false)=>{const b=document.createElement('button');b.type='button';b.className='btn btn-light';b.textContent=label;b.disabled=disabled;b.onclick=fn;buttons.append(b);};
 if(!user)add('Continuar con Google',login);
 else {add(pending&&!writing?'Salir y descartar cambios pendientes':'Cerrar sesión',logout,writing);if(!ready)add('Reintentar conexión',()=>loadAccount(user));if(ready&&(guest.completed.length||guest.saved.length||guest.days.length||Object.keys(guest.notes).length))add('Importar mi avance de este navegador',importGuest);}
 const info=document.createElement('small');info.textContent='Tu progreso es personal. Leonel administra el acceso a la formación y a la comunidad.';el.append(info);
 });
 if(user&&!ready)document.querySelectorAll('#contenido [data-save],#contenido [data-complete],#contenido [data-day],#contenido [data-note],#contenido [data-reset]').forEach(el=>el.disabled=true);
}
function refresh(){bridge.render();panel();}
function changes(before,after){
 const patch={};for(const k of ['completed','saved','days']){patch[k]={add:after[k].filter(v=>!before[k].includes(v)),remove:before[k].filter(v=>!after[k].includes(v))};}
 patch.notes={};for(const k of new Set([...Object.keys(before.notes),...Object.keys(after.notes)])){if(before.notes[k]!==after.notes[k])patch.notes[k]=after.notes[k]??null;}
 if(before.last!==after.last)patch.last=after.last;return patch;
}
function merge(base,patch){for(const k of ['completed','saved','days'])base[k]=[...new Set([...base[k].filter(v=>!patch[k].remove.includes(v)),...patch[k].add])];for(const [k,v]of Object.entries(patch.notes)){if(v===null)delete base.notes[k];else base.notes[k]=v;}if('last'in patch)base.last=patch.last;return bridge.clean(base);}
async function flush(){
 if(!window.lebenarPortal.isTraining()||!user||!ready||writing||!pending)return;
 const uid=user.uid,run=epoch,target=pending;pending=null;writing=true;status='Guardando…';panel();
 const patch=changes(baseline,target);
 try{const result=await runTransaction(db,async tx=>{const ref=doc(db,'progress',uid),snap=await tx.get(ref);const current=snap.exists()?bridge.clean(JSON.parse(snap.data().payload)):blank();const next=merge(current,patch);tx.set(ref,{payload:JSON.stringify(next),updatedAt:serverTimestamp()});return next;});
 if(run!==epoch)return;baseline=target;status=pending?'Cambios pendientes de guardar…':'Guardado en tu cuenta.';if(!pending){baseline=result;bridge.set(result);if(!document.activeElement?.matches('[data-note]'))refresh();}
 }catch(e){if(run===epoch){pending=pending||target;status='No se pudo guardar. Tu avance sigue abierto acá; reintentaremos al recuperar conexión.';bridge.notify(status);}}
 finally{writing=false;panel();if(pending&&run===epoch)timer=setTimeout(flush,4000);}
}
async function loadAccount(next){
 const run=++epoch;clearTimeout(timer);user=next;ready=false;pending=null;baseline=blank();bridge.set(blank());status='Cargando tu progreso…';refresh();
 try{const snap=await getDocFromServer(doc(db,'progress',next.uid));if(run!==epoch)return;baseline=snap.exists()?bridge.clean(JSON.parse(snap.data().payload)):blank();bridge.set(baseline);ready=true;status='Tu progreso está conectado.';refresh();}
 catch(e){if(run!==epoch)return;status='No pudimos abrir tu progreso. Reintentá la conexión.';refresh();}
}
async function login(){location.hash='#acceso';return;try{const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});await signInWithPopup(auth,provider);}catch(e){bridge.notify(e.code==='auth/popup-closed-by-user'?'Ingreso cancelado.':e.code==='auth/popup-blocked'?'Permití la ventana emergente de Google e intentá nuevamente.':'No pudimos iniciar sesión. Volvé a intentarlo.');}}
async function logout(){if(writing){bridge.notify('Esperá a que termine de guardarse tu avance.');return;}if(pending){if(!confirm('Hay cambios sin guardar. ¿Cerrar sesión y descartar únicamente esos cambios?'))return;pending=null;clearTimeout(timer);}try{await signOut(auth);}catch{bridge.notify('No pudimos cerrar la sesión. Intentá nuevamente.');}}
function importGuest(){if(!ready||!confirm('¿Copiar el avance de este navegador a tu cuenta? Se combinarán los recursos y las marcas de acciones; tus notas de la cuenta tendrán prioridad.'))return;const current=bridge.read();const next={completed:[...new Set([...guest.completed,...current.completed])],saved:[...new Set([...guest.saved,...current.saved])],days:[...new Set([...guest.days,...current.days])],notes:{...guest.notes,...current.notes},last:current.last||guest.last};bridge.set(next);pending=bridge.clean(next);guest=blank();refresh();flush();}
bridge.attach({panel,save(value){if(!user||!window.lebenarPortal.isTraining())return true;if(!ready)return true;pending=bridge.clean(value);clearTimeout(timer);timer=setTimeout(flush,650);status='Cambios pendientes de guardar…';panel();return true;},signedIn:()=>!!user,login});
export function setProgressAccess(next,allowed){if(next&&allowed){if(user?.uid!==next.uid||!ready)loadAccount(next);}else{epoch++;clearTimeout(timer);user=null;ready=false;pending=null;bridge.set(guest);status='';refresh();}}
window.addEventListener('online',()=>flush());
window.addEventListener('beforeunload',e=>{if(pending||writing){e.preventDefault();e.returnValue='';}});
panel();
