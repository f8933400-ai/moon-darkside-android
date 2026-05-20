    (function(){
      const DB_NAME="moon-images";
      const DB_VERSION=1;
      const STORE_NAME="images";
      const URL_CACHE_LIMIT=120;
      const urlCache=new Map();
      let dbPromise=null;

      function openDb(){
        if(dbPromise)return dbPromise;
        if(!window.indexedDB)throw new Error("IndexedDB is not available in this browser.");
        dbPromise=new Promise((resolve,reject)=>{
          const req=indexedDB.open(DB_NAME,DB_VERSION);
          req.onupgradeneeded=()=>{
            const db=req.result;
            if(!db.objectStoreNames.contains(STORE_NAME)){
              db.createObjectStore(STORE_NAME,{keyPath:"id"});
            }
          };
          req.onsuccess=()=>resolve(req.result);
          req.onerror=()=>reject(req.error||new Error("Failed to open image IndexedDB."));
          req.onblocked=()=>reject(new Error("Image IndexedDB open request was blocked."));
        });
        return dbPromise;
      }

      async function withStore(mode,work){
        const db=await openDb();
        return new Promise((resolve,reject)=>{
          const tx=db.transaction(STORE_NAME,mode);
          const store=tx.objectStore(STORE_NAME);
          let result;
          tx.oncomplete=()=>resolve(result);
          tx.onerror=()=>reject(tx.error||new Error("Image IndexedDB transaction failed."));
          tx.onabort=()=>reject(tx.error||new Error("Image IndexedDB transaction was aborted."));
          try{
            result=work(store);
          }catch(err){
            reject(err);
          }
        });
      }

      function requestResult(req){
        return new Promise((resolve,reject)=>{
          req.onsuccess=()=>resolve(req.result);
          req.onerror=()=>reject(req.error||new Error("Image IndexedDB request failed."));
        });
      }

      async function putImage({id,blob,mime="",name=""}={}){
        if(!id)throw new Error("putImage requires an id.");
        if(!(blob instanceof Blob))throw new Error("putImage requires a Blob.");
        const record={id,blob,mime:mime||blob.type||"",name:name||"",createdAt:now()};
        await withStore("readwrite",store=>requestResult(store.put(record)));
        revokeImageUrl(id);
        return record;
      }

      async function getImageBlob(id){
        if(!id)throw new Error("getImageBlob requires an id.");
        const record=await withStore("readonly",store=>requestResult(store.get(id)));
        return record?.blob||null;
      }

      async function deleteImage(id){
        if(!id)throw new Error("deleteImage requires an id.");
        revokeImageUrl(id);
        await withStore("readwrite",store=>requestResult(store.delete(id)));
        return true;
      }

      async function listImages(){
        const records=await withStore("readonly",store=>requestResult(store.getAll()));
        return (records||[]).map(record=>({
          id:record.id,
          mime:record.mime||record.blob?.type||"",
          name:record.name||"",
          createdAt:record.createdAt||"",
          size:record.blob?.size||0
        })).sort((a,b)=>String(a.createdAt||"").localeCompare(String(b.createdAt||""))||String(a.id||"").localeCompare(String(b.id||"")));
      }

      async function getImageUrl(id){
        if(!id)throw new Error("getImageUrl requires an id.");
        if(urlCache.has(id)){
          const cached=urlCache.get(id);
          urlCache.delete(id);
          urlCache.set(id,cached);
          return cached;
        }
        const blob=await getImageBlob(id);
        if(!blob)return null;
        const url=URL.createObjectURL(blob);
        urlCache.set(id,url);
        trimUrlCache();
        return url;
      }

      function trimUrlCache(){
        while(urlCache.size>URL_CACHE_LIMIT){
          const oldest=urlCache.keys().next().value;
          revokeImageUrl(oldest);
        }
      }

      function revokeImageUrl(id){
        const url=urlCache.get(id);
        if(url){
          URL.revokeObjectURL(url);
          urlCache.delete(id);
        }
      }

      function clearImageCache(){
        urlCache.forEach(url=>URL.revokeObjectURL(url));
        urlCache.clear();
      }

      function dataUrlToBlob(dataUrl){
        const text=String(dataUrl||"");
        if(!text.startsWith("data:"))throw new Error("Invalid data URL.");
        const commaIndex=text.indexOf(",");
        if(commaIndex<0)throw new Error("Invalid data URL.");
        const header=text.slice(5,commaIndex);
        const payload=text.slice(commaIndex+1);
        const parts=header.split(";").filter(Boolean);
        const hasMime=!!(parts[0]&&parts[0].includes("/"));
        const mime=hasMime?parts[0]:"application/octet-stream";
        const isBase64=(hasMime?parts.slice(1):parts).some(part=>part.toLowerCase()==="base64");
        try{
          if(isBase64){
            const binary=atob(payload);
            const bytes=new Uint8Array(binary.length);
            for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
            return new Blob([bytes],{type:mime});
          }
          const decoded=decodeURIComponent(payload);
          return new Blob([new TextEncoder().encode(decoded)],{type:mime});
        }catch(err){
          throw new Error("Invalid data URL payload.");
        }
      }

      function blobToDataUrl(blob){
        if(!(blob instanceof Blob))return Promise.reject(new Error("blobToDataUrl requires a Blob."));
        return new Promise((resolve,reject)=>{
          const reader=new FileReader();
          reader.onload=()=>resolve(String(reader.result||""));
          reader.onerror=()=>reject(reader.error||new Error("Failed to read Blob as data URL."));
          reader.readAsDataURL(blob);
        });
      }

      async function selfTest(){
        const id="image-store-self-test";
        const pngDataUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
        const result={ok:false,put:false,read:false,dataUrl:false,objectUrl:false,deleted:false,dataUrlToBlob:false,pngMime:""};
        try{
          await deleteImage(id).catch(()=>{});
          const blob=new Blob(["moon-image-store-test"],{type:"text/plain"});
          await putImage({id,blob,mime:blob.type,name:"self-test.txt"});
          result.put=true;
          const saved=await getImageBlob(id);
          result.read=!!saved;
          const dataUrl=await blobToDataUrl(saved);
          result.dataUrl=typeof dataUrl==="string"&&dataUrl.startsWith("data:");
          const objectUrl=await getImageUrl(id);
          result.objectUrl=typeof objectUrl==="string"&&objectUrl.startsWith("blob:");
          revokeImageUrl(id);
          await deleteImage(id);
          result.deleted=!(await getImageBlob(id));
          const pngBlob=dataUrlToBlob(pngDataUrl);
          result.dataUrlToBlob=pngBlob instanceof Blob&&pngBlob.type==="image/png";
          result.pngMime=pngBlob.type;
          result.ok=result.put&&result.read&&result.dataUrl&&result.objectUrl&&result.deleted&&result.dataUrlToBlob;
          console.log("imageStore selfTest",result);
          return result;
        }catch(err){
          console.error("imageStore selfTest failed",err);
          return {...result,error:err?.message||String(err)};
        }
      }

      window.imageStore={putImage,getImageBlob,deleteImage,listImages,getImageUrl,revokeImageUrl,dataUrlToBlob,blobToDataUrl,clearImageCache,selfTest,_urlCache:urlCache,_urlCacheLimit:URL_CACHE_LIMIT};
    })();
