// No private notification contents are persisted in the browser.
export function accessNotice(state,context){
 if(!context?.uid||['visitor','loading','error'].includes(state.status))return null;
 const messages={
 unrequested:['Solicitá tu acceso','Ingresaste con Google. Falta solicitar permiso al equipo de LEBENAR®.', '#acceso'],
 pending:['Solicitud enviada','Tu solicitud está pendiente de aprobación. Los materiales se habilitarán cuando el equipo te autorice.','#acceso'],
 approved:['Acceso autorizado',state.community?'Podés acceder al entrenamiento, la biblioteca y la comunidad.':'Podés acceder al entrenamiento y la biblioteca.','#primeros-pasos'],
 administrator:['Administración habilitada','Tenés acceso a la formación, la biblioteca, la comunidad y la gestión de solicitudes.','#administracion'],
 rejected:['Solicitud no aprobada','Contactá al equipo de LEBENAR® para consultar tu situación.','#acceso'],
 revoked:['Acceso retirado','Tu cuenta ya no tiene acceso al material. Contactá al equipo para revisar tu situación.','#acceso']};
 const m=messages[state.status];if(!m)return null;
 return {id:`access:${state.status}:${context.profile||''}:${context.version||0}:${context.roleVersion||0}`,title:m[0],text:m[1],href:m[2]};
}
export function pendingNotices(docs){return docs.map(d=>({id:`request:${d.id}:${d.requestedAt||0}`,title:'Solicitud de acceso pendiente',text:`${d.displayLabel||'Una persona'} solicita ingresar a LEBENAR®.`,href:'#administracion',pending:true}));}
export function unreadCount(items,read){return items.filter(item=>!read.has(item.id)).length;}
export function rememberRead(existing,ids){return [...new Set([...existing,...ids])].slice(-300);}
