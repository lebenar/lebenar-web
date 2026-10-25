import {initializeApp,getApps,getApp} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';
import {getAuth,onAuthStateChanged,GoogleAuthProvider,signInWithPopup,signOut} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
import {getFirestore,doc,onSnapshot,runTransaction,serverTimestamp,collection,query,where,limit,updateDoc} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import {accessState} from './access-state.mjs';
const app=getApps().length?getApp():initializeApp({apiKey:'AIzaSyA3LaYCa1wa9DcUgMPK8pAUxD4U3LSoRSc',authDomain:'lebenar-educacion.firebaseapp.com',projectId:'lebenar-educacion',storageBucket:'lebenar-educacion.firebasestorage.app',messagingSenderId:'262913977772',appId:'1:262913977772:web:14f92b597679544b239e09'});
const auth=getAuth(app),db=getFirestore(app);
let user=null,membership=null,admin=false,loading=true,error=false,message='',stops=[],listStop=null,generation=0,filter='pending',busy=false;
const subscribers=new Set();
export function subscribeAccess(fn){subscribers.add(fn);fn(accessState({user,membership,admin,loading,error}));return()=>subscribers.delete(fn);}
function element(tag,text,cls){const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;}
function button(text,fn,parent,disabled=false){const e=element('button',text,'btn btn-light');e.type='button';e.disabled=disabled;e.addEventListener('click',fn);parent.append(e);return e;}
function notify(text){message=text;const el=document.querySelector('#access-message');if(el)el.textContent=text;}
function emit(){const s=accessState({user,membership,admin,loading,error});for(const fn of subscribers)fn(s);window.dispatchEvent(new CustomEvent('lebenar-access',{detail:s}));render();}
function cleanup(){stops.forEach(fn=>fn());stops=[];listStop?.();listStop=null;}
async function login(){try{const p=new GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});await signInWithPopup(auth,p);}catch(e){notify(e.code==='auth/popup-closed-by-user'?'Ingreso cancelado.':'No pudimos iniciar sesión. Reintentá y permití la ventana de Google.');}}
async function logout(){try{await signOut(auth);}catch{notify('No pudimos cerrar la sesión. Reintentá.');}}
async function requestAccess(label){
 if(!user||busy)return;label=label.trim();if(!label||label.length>80){notify('Escribí un nombre de entre 1 y 80 caracteres.');return;}
 const uid=user.uid;busy=true;render();
 try{await runTransaction(db,async tx=>{const ref=doc(db,'memberships',uid),snap=await tx.get(ref);if(snap.exists())return;tx.set(ref,{displayLabel:label,status:'pending',profile:'training',requestedAt:serverTimestamp(),updatedAt:serverTimestamp()});});notify('Solicitud enviada. Leonel debe autorizar tu acceso.');}
 catch{notify('No pudimos enviar la solicitud. Reintentá; no se creará una solicitud duplicada.');}
 finally{busy=false;render();}
}
async function decide(uid,status,profile){
 if(!admin||!user||uid===user.uid||busy)return;
 const labels={approved:profile==='member'?'autorizar como socio':'autorizar como nuevo',rejected:'rechazar la solicitud',revoked:'revocar el acceso'};
 if(!confirm(`¿Confirmás ${labels[status]} para esta persona?`))return;
 busy=true;try{await updateDoc(doc(db,'memberships',uid),{status,profile,updatedAt:serverTimestamp()});notify('Permiso actualizado.');}
 catch{notify('No pudimos cambiar el permiso. Comprobá tu acceso administrativo y reintentá.');}
 finally{busy=false;}
}
function watchList(){
 listStop?.();listStop=null;const list=document.querySelector('#request-list');if(!list||!admin)return;
 const run=generation;list.textContent='Cargando solicitudes…';
 listStop=onSnapshot(query(collection(db,'memberships'),where('status','==',filter),limit(100)),snap=>{
 if(run!==generation||!admin)return;list.replaceChildren();
 if(snap.empty){list.append(element('p','No hay solicitudes en este estado.'));return;}
 for(const item of snap.docs){const d=item.data(),row=element('article',null,'panel request-row');row.append(element('h3',d.displayLabel),element('small',`Identificador: ${item.id}`),element('p',`${{pending:'Pendiente',approved:'Autorizado',rejected:'Rechazado',revoked:'Revocado'}[d.status]} · ${d.profile==='member'?'Socio':'Nuevo'}`));
 const actions=element('div',null,'button-row');row.append(actions);const own=item.id===user?.uid;
 button('Autorizar como nuevo',()=>decide(item.id,'approved','training'),actions,own);
 button('Autorizar como socio',()=>decide(item.id,'approved','member'),actions,own);
 if(d.status==='pending')button('Rechazar',()=>decide(item.id,'rejected',d.profile),actions,own);
 if(d.status==='approved')button('Revocar acceso',()=>decide(item.id,'revoked',d.profile),actions,own);
 list.append(row);}
 list.append(element('small','Se muestran hasta 100 registros del estado seleccionado.'));
 },()=>{if(run===generation){list.replaceChildren(element('p','No pudimos abrir las solicitudes. No se muestran datos de una sesión anterior.'));}});
}
export function mountAccess(){render();}
export function accessUser(){return user;}
function render(){
 const root=document.querySelector('#access-app');if(!root)return;listStop?.();listStop=null;root.replaceChildren();const state=accessState({user,membership,admin,loading,error});
 root.append(element('h1','Tu acceso a LEBENAR®'));
 const msg=element('p',message);msg.id='access-message';msg.setAttribute('role','status');root.append(msg);
 if(!user){root.append(element('p','La formación es gratuita para personas autorizadas. Ingresá con Google y solicitá la aprobación de Leonel.'));button('Continuar con Google',login,root,loading);return;}
 root.append(element('p',user.displayName||'Tu cuenta'),element('small',user.email||''));button('Cerrar sesión',logout,root);
 if(state.status==='loading'){root.append(element('p','Comprobando tu autorización…'));return;}
 if(state.status==='error'){root.append(element('p','No se pudo comprobar tu autorización. Los materiales permanecen cerrados.'));button('Reintentar',()=>connect(user),root);return;}
 if(state.status==='unrequested'){
 root.append(element('h2','Solicitá tu acceso'),element('p','El nombre que elijas será visible para Leonel al revisar tu solicitud. No incluyas teléfono, correo ni datos privados.'));
 const form=element('form'),label=element('label','Nombre para identificar tu solicitud'),input=element('input');input.id='request-label';input.required=true;input.maxLength=80;input.autocomplete='nickname';label.htmlFor=input.id;form.append(label,input);const submit=element('button','Enviar solicitud','btn btn-gold');submit.type='submit';submit.disabled=busy;form.append(submit);form.onsubmit=e=>{e.preventDefault();requestAccess(input.value);};root.append(form);
 }else if(state.status==='pending')root.append(element('h2','Tu solicitud está pendiente'),element('p','Leonel tiene que confirmar tu acceso antes de que puedas ver los materiales.'));
 else if(['rejected','revoked'].includes(state.status))root.append(element('h2','Tu acceso no está habilitado'),element('p','Esta cuenta no puede abrir los materiales. Si necesitás revisar tu situación, contactá a Leonel.'));
 if(state.training){root.append(element('p',state.community?'Acceso autorizado: entrenamiento y comunidad de socios.':'Acceso autorizado: entrenamiento y biblioteca.'));const links=element('div',null,'button-row');for(const [href,label]of [['#primeros-pasos','Ir al entrenamiento 30D'],['#progreso','Ver mi progreso'],...(state.community?[['#comunidad','Ir a la comunidad']]:[])]){const a=element('a',label,'btn btn-gold');a.href=href;links.append(a);}root.append(links);}
 if(state.admin){const dashboard=element('section');dashboard.append(element('h2','Administrar accesos'));const tabs=element('div',null,'button-row');for(const [value,title]of [['pending','Pendientes'],['approved','Autorizados'],['rejected','Rechazados'],['revoked','Revocados']]){const b=button(title,()=>{filter=value;render();},tabs);b.setAttribute('aria-pressed',String(filter===value));}dashboard.append(tabs);const list=element('div');list.id='request-list';list.setAttribute('aria-live','polite');dashboard.append(list);root.append(dashboard);watchList();}
}
function connect(next){
 cleanup();const run=++generation;user=next;membership=null;admin=false;error=false;loading=!!next;message='';
 emit();if(!next)return;
 let gotMembership=false,gotAdmin=false,connectionFailed=false;
 const failed=()=>{if(run!==generation)return;connectionFailed=true;membership=null;admin=false;error=true;loading=false;listStop?.();listStop=null;emit();};
 const finish=()=>{if(run!==generation||connectionFailed)return;loading=!(gotMembership&&gotAdmin);error=false;emit();};
 stops.push(onSnapshot(doc(db,'memberships',next.uid),snap=>{if(run!==generation)return;membership=snap.exists()?snap.data():null;gotMembership=true;finish();},failed));
 stops.push(onSnapshot(doc(db,'adminAccess',next.uid),snap=>{if(run!==generation)return;admin=snap.exists()&&snap.data().enabled===true;gotAdmin=true;finish();},failed));
}
onAuthStateChanged(auth,connect,()=>{cleanup();user=null;admin=false;membership=null;loading=false;error=true;emit();});
render();
