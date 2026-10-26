import {doc,onSnapshot,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import {emptyProfile,validateProfile,googlePhoto,fullName} from './profile-model.mjs';
const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
export function createProfileController({db,onChange}){
 let user=null,saved=null,draft=emptyProfile(),stop=null,epoch=0,loading=false,error=false,busy=false,dirty=false,message='';
 const changed=()=>onChange();
 function setIdentity(next){
  if(user?.uid===next?.uid)return;stop?.();stop=null;const run=++epoch;user=next;saved=null;draft=emptyProfile();dirty=false;busy=false;error=false;message='';loading=!!next;
  if(!next)return;
  stop=onSnapshot(doc(db,'profiles',next.uid),snap=>{if(run!==epoch)return;loading=false;error=false;saved=snap.exists()?snap.data():null;if(!dirty)draft=saved?{...emptyProfile(),...saved}:emptyProfile();changed();},()=>{if(run!==epoch)return;loading=false;error=true;saved=null;draft=emptyProfile();dirty=false;message='No pudimos cargar tu perfil. Reintentá antes de enviar una solicitud.';changed();});
 }
 function retry(){const next=user;user=null;setIdentity(next);changed();}
 async function save(){
  if(!user||busy||loading||error)return;let value;try{value=validateProfile(draft);}catch(e){message=e.message;changed();return;}
  const run=epoch,uid=user.uid;busy=true;message='Guardando perfil…';changed();
  try{await runTransaction(db,async tx=>{const ref=doc(db,'profiles',uid),snap=await tx.get(ref);tx.set(ref,{...value,createdAt:snap.exists()?snap.data().createdAt:serverTimestamp(),updatedAt:serverTimestamp()});});if(run!==epoch)return;saved={...value};draft={...value};dirty=false;message='Perfil guardado. Tus permisos y tu progreso se conservan.';}
  catch{if(run!==epoch)return;message='No pudimos guardar el perfil. Conservamos tus cambios en esta pantalla; comprobá tu conexión y reintentá.';}
  finally{if(run===epoch){busy=false;changed();}}
 }
 function mount(root,state){
  if(!user||['loading','error','visitor'].includes(state.status))return;
  const section=el('section');section.className='panel profile-panel';section.setAttribute('aria-labelledby','profile-heading');const heading=el('h2',saved?'Mi perfil':'Completá tu perfil');heading.id='profile-heading';section.append(heading);root.append(section);
  const status=el('p',loading?'Cargando perfil…':message);status.setAttribute('role','status');section.append(status);if(loading)return;
  if(error){const retryButton=el('button','Reintentar perfil');retryButton.type='button';retryButton.className='btn btn-light';retryButton.onclick=retry;section.append(retryButton);return;}
  const blocked=['rejected','revoked'].includes(state.status);
  if(blocked){section.append(el('p','Tu acceso no está habilitado. No podés editar el perfil en este estado.'));return;}
  section.append(el('p','Tu cuenta sigue vinculada a Google. Completá tus datos para identificarte en LEBENAR®; el acceso al material requiere aprobación.'));
  const form=el('form');form.className='profile-form';const fields=el('fieldset');fields.disabled=busy;form.append(fields);section.append(form);
  const load=el('button','Usar mi nombre de Google');load.type='button';load.className='btn btn-light';load.disabled=!user.displayName;load.onclick=()=>{draft.firstName=user.displayName||'';draft.lastName='';dirty=true;message='Revisá el nombre y separá tus apellidos en el campo correspondiente; Google no siempre los distingue.';changed();};fields.append(load);
  for(const [key,labelText,max,multiline] of [['firstName','Nombre',40,false],['lastName','Apellido',40,false],['bio','Sobre mí (opcional)',300,true]]){
   const label=el('label',labelText),input=el(multiline?'textarea':'input');input.id='profile-'+key;label.htmlFor=input.id;input.value=draft[key];input.maxLength=max;input.required=!multiline;if(!multiline)input.autocomplete=key==='firstName'?'given-name':'family-name';input.oninput=()=>{draft[key]=input.value;dirty=true;updatePreview();};fields.append(label,input);
  }
  const photoLabel=el('label'),photo=el('input');photo.type='checkbox';photo.checked=draft.photoSource==='google';const photoURL=googlePhoto(user.photoURL||'');photo.disabled=!photoURL&&draft.photoSource!=='google';photo.onchange=()=>{draft.photoSource=photo.checked?'google':'none';draft.photoURL=photo.checked?(photoURL||draft.photoURL):'';dirty=true;updatePreview();};photoLabel.className='profile-photo-choice';photoLabel.append(photo,document.createTextNode(' Usar mi foto de Google en el perfil'));fields.append(photoLabel);
  fields.append(el('small','La foto es opcional y podés quitarla. La subida de una foto propia estará disponible en una próxima entrega.'));
  const preview=el('div');preview.className='profile-preview';fields.append(preview);
  function updatePreview(){preview.replaceChildren();if(draft.photoSource==='google'&&googlePhoto(draft.photoURL)){const image=el('img');image.src=draft.photoURL;image.alt='Tu foto elegida';image.width=64;image.height=64;image.referrerPolicy='no-referrer';image.onerror=()=>{image.replaceWith(el('span','Foto no disponible'));};preview.append(image);}else{const initials=el('span',((draft.firstName?.trim()[0]||'')+(draft.lastName?.trim()[0]||'')).toUpperCase()||'LB');initials.className='profile-initials';preview.append(initials);}preview.append(el('strong',fullName(draft)||'Tu nombre y apellido'),el('p',draft.bio||'Tu presentación aparecerá aquí.'));}
  updatePreview();
  fields.append(el('p','En esta primera entrega el perfil solo lo ves vos. La solicitud envía tu nombre completo a los administradores. La ficha compartida con socios se habilitará en una entrega posterior; tu correo y tu progreso no formarán parte de esa ficha.'));
  const submit=el('button',busy?'Guardando…':'Guardar perfil');submit.type='submit';submit.className='btn btn-gold';fields.append(submit);form.onsubmit=e=>{e.preventDefault();save();};
 }
 return {setIdentity,mount,requestName(){if(loading||error||busy||dirty||!saved)return '';try{return fullName(validateProfile(saved));}catch{return '';}}};
}
