export function accessState({user=null,membership=null,admin=false,loading=false,error=false}={}) {
 if(!user)return {status:loading?'loading':'visitor',training:false,community:false,admin:false};
 if(loading||error)return {status:error?'error':'loading',training:false,community:false,admin:false};
 const approved=membership?.status==='approved';
 return {status:admin?'administrator':membership?.status||'unrequested',training:admin||approved,community:admin||(approved&&membership.profile==='member'),admin:admin===true};
}
