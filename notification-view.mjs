import {unreadCount} from './notification-model.mjs';
function node(tag,text,cls){const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;}
export function createNotificationView(host,{readAll,openPending}){
 const button=node('button',null,'notice-bell');button.type='button';button.setAttribute('aria-label','Notificaciones');button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','notification-dialog');button.setAttribute('aria-expanded','false');
 button.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/></svg>';
 const badge=node('span',null,'notice-badge');badge.setAttribute('aria-hidden','true');button.append(badge);host.replaceChildren(button);
 const dialog=node('dialog',null,'notice-dialog');dialog.id='notification-dialog';dialog.setAttribute('aria-labelledby','notification-title');
 const heading=node('div',null,'notice-heading'),title=node('h2','Notificaciones');title.id='notification-title';const close=node('button','Cerrar','notice-close');close.type='button';heading.append(title,close);
 const intro=node('p','Avisos dentro de LEBENAR®. Se actualizan mientras estás conectado.','notice-intro'),summary=node('p',null,'notice-summary'),list=node('div',null,'notice-list'),mark=node('button','Marcar todos como leídos','notice-read'),foot=node('p','La marca de leído se guarda solo en este navegador. Leer un aviso no autoriza ni rechaza solicitudes.','notice-foot');mark.type='button';
 dialog.append(heading,intro,summary,list,mark,foot);document.body.append(dialog);
 button.onclick=()=>{dialog.showModal();button.setAttribute('aria-expanded','true');close.focus();};close.onclick=()=>dialog.close();dialog.addEventListener('close',()=>{button.setAttribute('aria-expanded','false');if(!host.hidden)button.focus();});
 dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
 mark.onclick=()=>readAll();let previous='';
 return {update({visible,items=[],read=new Set(),loading=false,error=false}){
 host.hidden=!visible;if(!visible){if(dialog.open)dialog.close();list.replaceChildren();previous='';return;}
 const count=unreadCount(items,read);badge.textContent=count>99?'99+':String(count);badge.hidden=count===0;button.setAttribute('aria-label',`Notificaciones: ${count} sin leer`);
 summary.textContent=error?'No se pudieron actualizar las solicitudes. Cerrá sesión y volvé a ingresar para reintentar.':loading?'Comprobando solicitudes pendientes…':`${count} aviso${count===1?'':'s'} sin leer${items.filter(i=>i.pending).length===100?' · Se muestran hasta 100 solicitudes pendientes.':'.'}`;
 mark.disabled=count===0;const signature=JSON.stringify([items,[...read]]);if(signature===previous)return;previous=signature;
 const focused=document.activeElement?.dataset?.noticeId;list.replaceChildren();
 for(const item of items){const article=node('article',null,'notice-item'+(read.has(item.id)?' is-read':''));article.append(node('h3',item.title),node('p',item.text));const a=node('a',item.pending?'Revisar solicitudes':item.href==='#primeros-pasos'?'Ir al entrenamiento':item.href==='#administracion'?'Abrir administración':'Ver mi acceso');a.href=item.href;a.dataset.noticeId=item.id;a.onclick=()=>{dialog.close();if(item.pending)openPending();};article.append(a);list.append(article);}
 if(!items.length)list.append(node('p','No hay avisos para mostrar.'));
 if(focused){const link=[...list.querySelectorAll('a')].find(a=>a.dataset.noticeId===focused);(link||close).focus();}
 },destroy(){dialog.close();dialog.remove();host.replaceChildren();}};
}
