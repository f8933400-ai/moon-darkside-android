    (function(){
      const ENCRYPTED_BACKUP_APP="moon-dark-side";
      const ENCRYPTED_BACKUP_KIND="encrypted-backup";
      const ENCRYPTED_BACKUP_VERSION=1;
      const ENCRYPTED_BACKUP_ITERATIONS=250000;
      const ENCRYPTED_BACKUP_HASH="SHA-256";
      const ENCRYPTED_BACKUP_CIPHER="AES-GCM";
      function normalizeEncryptedBackupPassword(value){
        const raw=String(value==null?"":value);
        return typeof raw.normalize==="function"?raw.normalize("NFC"):raw;
      }
      function arrayBufferToBase64(buffer){
        const bytes=buffer instanceof ArrayBuffer?new Uint8Array(buffer):ArrayBuffer.isView(buffer)?new Uint8Array(buffer.buffer,buffer.byteOffset,buffer.byteLength):new Uint8Array(buffer||[]);
        let out="";
        const size=0x8000;
        for(let i=0;i<bytes.length;i+=size)out+=String.fromCharCode.apply(null,bytes.subarray(i,i+size));
        return btoa(out);
      }
      function base64ToArrayBuffer(value){
        const clean=String(value||"").replace(/\s+/g,"");
        const bin=atob(clean);
        const bytes=new Uint8Array(bin.length);
        for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
        return bytes.buffer;
      }
      function webCryptoForEncryptedBackup(){
        const api=window.crypto;
        if(!api?.subtle||typeof api.getRandomValues!=="function")throw new Error("web_crypto_unavailable");
        return api;
      }
      function isEncryptedBackupEnvelope(obj){
        if(!obj||typeof obj!=="object"||Array.isArray(obj))return false;
        const kdf=obj.kdf||{};
        const cipher=obj.cipher||{};
        return obj.app===ENCRYPTED_BACKUP_APP&&obj.kind===ENCRYPTED_BACKUP_KIND&&Number(obj.version)===ENCRYPTED_BACKUP_VERSION&&
          kdf.name==="PBKDF2"&&String(kdf.hash||"").toUpperCase()===ENCRYPTED_BACKUP_HASH&&Number.isFinite(Number(kdf.iterations))&&Number(kdf.iterations)>0&&typeof kdf.salt==="string"&&
          cipher.name===ENCRYPTED_BACKUP_CIPHER&&typeof cipher.iv==="string"&&typeof obj.payload==="string";
      }
      async function deriveEncryptedBackupKey(password,salt,iterations,hash,usages){
        const api=webCryptoForEncryptedBackup();
        const passwordBytes=new TextEncoder().encode(normalizeEncryptedBackupPassword(password));
        try{
          const keyMaterial=await api.subtle.importKey("raw",passwordBytes,{name:"PBKDF2"},false,["deriveKey"]);
          return await api.subtle.deriveKey({name:"PBKDF2",salt,iterations:Number(iterations),hash},keyMaterial,{name:ENCRYPTED_BACKUP_CIPHER,length:256},false,usages);
        }finally{
          passwordBytes.fill(0);
        }
      }
      async function encryptBackupJsonObject(backupObj,password){
        const api=webCryptoForEncryptedBackup();
        const jsonText=JSON.stringify(backupObj);
        if(!jsonText)throw new Error("invalid_backup");
        const salt=new Uint8Array(16);
        const iv=new Uint8Array(12);
        api.getRandomValues(salt);
        api.getRandomValues(iv);
        const key=await deriveEncryptedBackupKey(password,salt,ENCRYPTED_BACKUP_ITERATIONS,ENCRYPTED_BACKUP_HASH,["encrypt"]);
        const payload=await api.subtle.encrypt({name:ENCRYPTED_BACKUP_CIPHER,iv},key,new TextEncoder().encode(jsonText));
        return {
          app:ENCRYPTED_BACKUP_APP,
          kind:ENCRYPTED_BACKUP_KIND,
          version:ENCRYPTED_BACKUP_VERSION,
          createdAt:new Date().toISOString(),
          kdf:{name:"PBKDF2",hash:ENCRYPTED_BACKUP_HASH,iterations:ENCRYPTED_BACKUP_ITERATIONS,salt:arrayBufferToBase64(salt)},
          cipher:{name:ENCRYPTED_BACKUP_CIPHER,iv:arrayBufferToBase64(iv)},
          payload:arrayBufferToBase64(payload)
        };
      }
      async function decryptBackupEnvelope(envelope,password){
        if(!isEncryptedBackupEnvelope(envelope))throw new Error("invalid_encrypted_backup");
        try{
          const salt=base64ToArrayBuffer(envelope.kdf.salt);
          const iv=base64ToArrayBuffer(envelope.cipher.iv);
          const payload=base64ToArrayBuffer(envelope.payload);
          const key=await deriveEncryptedBackupKey(password,salt,envelope.kdf.iterations,envelope.kdf.hash,["decrypt"]);
          const plain=await webCryptoForEncryptedBackup().subtle.decrypt({name:ENCRYPTED_BACKUP_CIPHER,iv:new Uint8Array(iv)},key,payload);
          return JSON.parse(new TextDecoder().decode(plain));
        }catch(err){
          if(err?.message==="invalid_encrypted_backup")throw err;
          const wrapped=new Error("decrypt_failed");
          wrapped.cause=err;
          throw wrapped;
        }
      }
      async function exportEncryptedBackup(backupObj,password){
        let source=backupObj;
        if(!source){
          if(typeof formatExportJsonAsync==="function"){
            const result=await formatExportJsonAsync();
            source=JSON.parse(result.text);
          }else if(typeof storage!=="undefined"&&storage?.exportBackup){
            source=await storage.exportBackup();
          }
        }
        return encryptBackupJsonObject(source,password);
      }
      function readEncryptedBackupFileText(file){
        return new Promise((resolve,reject)=>{
          const reader=new FileReader();
          reader.onload=()=>resolve(String(reader.result||""));
          reader.onerror=()=>reject(new Error("file_read_failed"));
          reader.readAsText(file);
        });
      }
      async function importEncryptedBackupFile(file,password){
        const parsed=JSON.parse(await readEncryptedBackupFileText(file));
        return decryptBackupEnvelope(parsed,password);
      }
      window.isEncryptedBackupEnvelope=isEncryptedBackupEnvelope;
      window.encryptBackupJsonObject=encryptBackupJsonObject;
      window.decryptBackupEnvelope=decryptBackupEnvelope;
      window.exportEncryptedBackup=exportEncryptedBackup;
      window.importEncryptedBackupFile=importEncryptedBackupFile;
      window.normalizeEncryptedBackupPassword=normalizeEncryptedBackupPassword;
      window.arrayBufferToBase64=arrayBufferToBase64;
      window.base64ToArrayBuffer=base64ToArrayBuffer;
    })();
