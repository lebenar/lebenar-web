import {getApp} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';
import {getFirestore,collection,query,where,limit,onSnapshot} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import {subscribeAccess,openPendingRequests} from './membership-20261025.js?v=bell-1';
import {accessNotice,pendingNotices,rememberRead} from './notification-model.mjs';
import {createNotificationView} from './notification-view.mjs';
const host=document.querySelector('#notification-host');
if(host){
 const db=getFirestore(getApp());let uid=null,signature='',stop=null,epoch=0,personal=null,pending=[],read=new Set(),visible=false,loading=false,error=false;
 const items=()=>[...pending,...(personal?[personal]:[])];
 const paint=()=>view.update({visible,items:items(),read,loading,error});
 const view=createNotificationView(host,{openPending:openPendingRequests,readAll(){read=new Set(rememberRead(read,items().map(i=>i.id)));try{localStorage.setItem(`lebenar-notices:${uid}`,JSON.stringify([...read]));}catch{}paint();}});
 subscribeAccess((state,context)=>{
 const nextUid=context?.uid||null;
 if(nextUid!==uid){uid=nextUid;read=new Set();try{const saved=JSON.parse(localStorage.getItem(`lebenar-notices:${uid}`)||'[]');if(Array.isArray(saved))read=new Set(saved.filter(x=>typeof x==='string').slice(-300));}catch{}}
 visible=!!uid&&!['loading','error','visitor'].includes(state.status);personal=visible?accessNotice(state,context):null;
 const nextSignature=visible&&state.admin?uid:'';
 if(nextSignature!==signature){stop?.();stop=null;signature=nextSignature;const run=++epoch;pending=[];error=false;loading=!!signature;
 if(signature)stop=onSnapshot(query(collection(db,'memberships'),where('status','==','pending'),limit(100)),snapshot=>{
 if(run!==epoch)return;pending=pendingNotices(snapshot.docs.map(d=>({id:d.id,displayLabel:d.data().displayLabel,requestedAt:d.data().requestedAt?.toMillis?.()||0})));loading=false;error=false;paint();
 },()=>{if(run!==epoch)return;pending=[];loading=false;error=true;paint();});
 }
 paint();
 });
}
