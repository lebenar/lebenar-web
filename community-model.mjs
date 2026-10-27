export const TOPICS={experiencias:'Experiencias',preguntas:'Preguntas',recursos:'Recursos'};
export function safeLink(value){
 const text=String(value||'').trim();if(!text)return '';if(text.length>2048)throw Error('El enlace admite hasta 2048 caracteres.');
 let u;try{u=new URL(text);}catch{throw Error('Ingresá un enlace completo que empiece con https://.');}
 if(u.protocol!=='https:'||u.username||u.password||u.port||!u.hostname.includes('.')||/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|\[)/.test(u.hostname))throw Error('Usá un enlace HTTPS de una plataforma pública.');
 return u.href;
}
export function postValue({body,linkUrl='',topic='experiencias',kind='conversation'}){
 const text=String(body||'').trim();if(!text||text.length>5000)throw Error('Escribí una publicación de hasta 5000 caracteres.');
 if(!TOPICS[topic]||!['conversation','announcement'].includes(kind))throw Error('Elegí un tipo de publicación válido.');
 return {body:text,linkUrl:safeLink(linkUrl),topic,kind};
}
export function mediaEmbed(value){
 let u;try{u=new URL(safeLink(value));}catch{return null;}
 let id;
 if(u.hostname==='youtu.be')id=u.pathname.slice(1);
 if(['www.youtube.com','youtube.com','m.youtube.com'].includes(u.hostname))id=u.pathname==='/watch'?u.searchParams.get('v'):u.pathname.match(/^\/(?:shorts|embed)\/([^/]+)$/)?.[1];
 if(id&&/^[\w-]{11}$/.test(id))return {title:'Video de YouTube',src:'https://www.youtube-nocookie.com/embed/'+id};
 if(u.hostname==='open.spotify.com'){const m=u.pathname.match(/^\/(?:intl-[a-z]+\/)?(track|episode|playlist|album|show)\/([A-Za-z0-9]+)$/);if(m)return {title:'Reproductor de Spotify',src:'https://open.spotify.com/embed/'+m[1]+'/'+m[2]};}
 return null;
}
export const initials=name=>String(name||'Integrante').split(/\s+/).filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase();
