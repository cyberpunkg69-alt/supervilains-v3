/* SUPERVILAINS V5.3 : personnages GLB enregistres localement.
 * IndexedDB isole par origine. Aucun modele ni portrait envoye vers un serveur.
 * Les modeles restent disponibles apres mise a jour du service worker.
 */
(()=>{
 'use strict';
 const DB='supervilains-pursuit-models-v1',STORE='glb';
 const allowed=new Set(['sam','harper']);
 function open(){
   return new Promise((resolve,reject)=>{
     if(!('indexedDB' in window))return reject(Error('IndexedDB indisponible'));
     const req=indexedDB.open(DB,1);
     req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:'id'});};
     req.onsuccess=()=>resolve(req.result);
     req.onerror=()=>reject(req.error||Error('Stockage refuse'));
   });
 }
 function check(key){if(!allowed.has(key))throw Error('Identifiant de modele invalide');}
 async function execute(mode,callback){
   const db=await open();
   try{
     return await new Promise((resolve,reject)=>{
       const tx=db.transaction(STORE,mode);
       const store=tx.objectStore(STORE);
       const r=callback(store);
       let value;
       r.onsuccess=()=>{value=r.result;};
       r.onerror=()=>reject(r.error||Error('Lecture impossible'));
       tx.oncomplete=()=>resolve(value);
       tx.onerror=()=>reject(tx.error||Error('Stockage impossible'));
       tx.onabort=()=>reject(tx.error||Error('Stockage annule'));
     });
   }finally{db.close();}
 }
 async function save(id,buffer,name){
   check(id);
   if(!(buffer instanceof ArrayBuffer))throw TypeError('GLB ArrayBuffer attendu');
   if(buffer.byteLength<20||buffer.byteLength>110000000)throw Error('Taille GLB incorrecte');
   const head=new DataView(buffer);
   if(head.getUint32(0,true)!==0x46546c67||head.getUint32(4,true)!==2||
      head.getUint32(8,true)!==buffer.byteLength)throw Error('Fichier GLB 2.0 invalide');
   await execute('readwrite',s=>s.put({
     id,buffer,name:String(name||id+'.glb').slice(0,110),
     size:buffer.byteLength,savedAt:Date.now()
   }));
   return {id,size:buffer.byteLength};
 }
 async function get(id){
   check(id);
   const value=await execute('readonly',s=>s.get(id));
   return value&&value.buffer instanceof ArrayBuffer?value:null;
 }
 async function remove(id){check(id);await execute('readwrite',s=>s.delete(id));}
 async function listing(){
   const result=await execute('readonly',s=>s.getAll());
   return result.map(x=>({id:x.id,name:x.name,size:x.size,savedAt:x.savedAt}));
 }
 window.SUPERVILAINS_3D_ASSETS=Object.freeze({save,get,remove,listing,version:'5.3'});
})();