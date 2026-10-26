export const emptyProfile=()=>({firstName:'',lastName:'',bio:'',photoSource:'none',photoURL:''});
export function googlePhoto(url){try{const u=new URL(url);return u.protocol==='https:'&&/^lh\d+\.googleusercontent\.com$/.test(u.hostname)&&!u.username&&!u.password&&!u.port&&url.length<=2048?url:'';}catch{return '';}}
export function validateProfile(raw){
 const p={firstName:String(raw.firstName||'').trim(),lastName:String(raw.lastName||'').trim(),bio:String(raw.bio||'').trim(),photoSource:raw.photoSource,photoURL:raw.photoURL};
 if(!p.firstName||!p.lastName||p.firstName.length>40||p.lastName.length>40||`${p.firstName} ${p.lastName}`.length>80)throw Error('Completá nombre y apellido: hasta 40 caracteres cada uno y 80 en total.');
 if(p.bio.length>300)throw Error('La presentación admite hasta 300 caracteres.');
 if(p.photoSource==='none')p.photoURL='';else if(p.photoSource!=='google'||!googlePhoto(p.photoURL))throw Error('Elegí una foto válida de Google o continuá sin foto.');
 return p;
}
export const fullName=p=>p?`${p.firstName} ${p.lastName}`.trim():'';
