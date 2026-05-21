(function(){
  function androidDownloadsBridge(){
    const bridge=window.MoonAndroidDownloads;
    return bridge&&typeof bridge.saveBase64ToDownloads==="function"?bridge:null;
  }

  function parseBridgeResult(raw){
    try{
      const result=typeof raw==="string"?JSON.parse(raw):raw;
      if(result&&typeof result==="object")return result;
    }catch(err){
      console.warn("Android download bridge returned invalid JSON",err,raw);
    }
    return {ok:false,error:"Android 保存接口返回异常。"};
  }

  function blobToBase64(blob){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>{
        const dataUrl=String(reader.result||"");
        const comma=dataUrl.indexOf(",");
        resolve(comma>=0?dataUrl.slice(comma+1):dataUrl);
      };
      reader.onerror=()=>reject(new Error("file_read_failed"));
      reader.readAsDataURL(blob);
    });
  }

  async function dataUrlToBlob(dataUrl,mimeType){
    try{
      const response=await fetch(dataUrl);
      return await response.blob();
    }catch(err){
      const raw=String(dataUrl||"");
      const comma=raw.indexOf(",");
      if(comma<0)throw err;
      const header=raw.slice(0,comma);
      const body=raw.slice(comma+1);
      const isBase64=/;base64/i.test(header);
      const type=(header.match(/^data:([^;,]+)/)||[])[1]||mimeType||"application/octet-stream";
      const binary=isBase64?atob(body):decodeURIComponent(body);
      const bytes=new Uint8Array(binary.length);
      for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
      return new Blob([bytes],{type});
    }
  }

  function browserDownloadBlob(filename,blob){
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download=filename;
    a.click();
    URL.revokeObjectURL(url);
    return {ok:true,filename};
  }

  async function saveBlobWithAndroid(filename,mimeType,blob){
    const bridge=androidDownloadsBridge();
    if(!bridge)return null;
    try{
      const base64=await blobToBase64(blob);
      const result=parseBridgeResult(bridge.saveBase64ToDownloads(filename,mimeType||blob.type||"application/octet-stream",base64));
      if(result.ok){
        alert("已保存到系统下载目录："+(result.path||("Download/"+(result.filename||filename))));
        return result;
      }
      alert("保存失败："+(result.error||"未知错误"));
      return result;
    }catch(err){
      const message=err?.message||err||"未知错误";
      alert("保存失败："+message);
      return {ok:false,error:String(message)};
    }
  }

  async function downloadBlobFile(filename,mimeType,blob,options={}){
    const safeName=String(filename||"moon-export").trim()||"moon-export";
    const type=mimeType||blob?.type||"application/octet-stream";
    const androidResult=await saveBlobWithAndroid(safeName,type,blob);
    if(androidResult)return androidResult;
    if(window.MoonBridge?.saveFile&&typeof options.text==="string"){
      window.MoonBridge.saveFile(safeName,type,options.text);
      return {ok:true,filename:safeName};
    }
    return browserDownloadBlob(safeName,blob);
  }

  async function downloadTextFile(filename,mimeType,text){
    const raw=String(text==null?"":text);
    const blob=new Blob([raw],{type:mimeType||"text/plain;charset=utf-8"});
    return downloadBlobFile(filename,mimeType||blob.type,blob,{text:raw});
  }

  async function downloadDataUrlFile(filename,mimeType,dataUrl){
    const safeName=String(filename||"moon-export").trim()||"moon-export";
    const bridge=androidDownloadsBridge();
    if(bridge){
      const blob=await dataUrlToBlob(dataUrl,mimeType);
      return downloadBlobFile(safeName,mimeType||blob.type,blob);
    }
    if(window.MoonBridge?.saveDataUrlFile){
      window.MoonBridge.saveDataUrlFile(safeName,mimeType||"application/octet-stream",dataUrl);
      return {ok:true,filename:safeName};
    }
    const a=document.createElement("a");
    a.href=dataUrl;
    a.download=safeName;
    a.click();
    return {ok:true,filename:safeName};
  }

  window.moonDownload={downloadBlobFile,downloadTextFile,downloadDataUrlFile};
  window.downloadBlobFile=downloadBlobFile;
  window.downloadTextFile=downloadTextFile;
  window.downloadDataUrlFile=downloadDataUrlFile;
})();
