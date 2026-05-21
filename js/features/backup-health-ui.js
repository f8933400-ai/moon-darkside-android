    (function(){
      let backupHealthSelectedJson=null;
      let backupHealthSelectedFileName="";
      let backupHealthLastResult=null;
      let backupHealthLastCheckedAt="";

      function byId(id){return document.getElementById(id);}

      function countValue(value){
        if(Array.isArray(value))return value.length;
        if(typeof value==="number"&&Number.isFinite(value))return value;
        if(value&&typeof value==="object"){
          if(typeof value.total==="number"&&Number.isFinite(value.total))return value.total;
          return Object.keys(value).reduce((sum,key)=>{
            if(key==="total")return sum;
            return sum+countValue(value[key]);
          },0);
        }
        return 0;
      }

      function breakdown(value){
        if(!value||typeof value!=="object"||Array.isArray(value))return "";
        const labels={messageImages:"消息图片",memberAvatars:"成员头像",roomBackgrounds:"房间背景"};
        return Object.keys(labels).map(key=>`${labels[key]} ${countValue(value[key])}`).join("，");
      }

      function formatNumber(value){
        const n=countValue(value);
        return Number.isFinite(n)?String(n):"0";
      }

      function formatTime(iso){
        if(!iso)return "尚未检查";
        try{return new Date(iso).toLocaleString();}
        catch{return iso;}
      }

      function escapeHtml(value){
        return String(value==null?"":value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
      }

      function renderStat(label,value,detail){
        return `<div class="backup-health-stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${detail?`<small>${escapeHtml(detail)}</small>`:""}</div>`;
      }

      function friendlyError(err){
        const raw=err?.message||String(err||"未知错误");
        if(/imageStore|IndexedDB/i.test(raw))return "当前环境不能访问本机图片库，无法完成这一步。";
        if(/JSON|Unexpected token|Unexpected end/i.test(raw))return "JSON 文件无法解析，请确认选择的是完整备份文件。";
        return `操作失败：${raw}`;
      }

      function setBusy(buttonId,busy,label){
        const btn=byId(buttonId);
        if(!btn)return;
        if(busy){
          btn.dataset.backupHealthText=btn.textContent;
          if(label)btn.textContent=label;
          btn.disabled=true;
          return;
        }
        if(btn.dataset.backupHealthText)btn.textContent=btn.dataset.backupHealthText;
        btn.disabled=false;
      }

      function renderBackupHealthSummary(result){
        const box=byId("backupHealthSummary");
        if(!box)return;
        if(!result){
          box.innerHTML=[
            renderStat("主数据中的图片引用数量","待检查",""),
            renderStat("IndexedDB 图片数量","待检查",""),
            renderStat("缺失图片数量","待检查",""),
            renderStat("孤儿图片数量","待检查",""),
            renderStat("最近一次检查时间","尚未检查","")
          ].join("");
          return;
        }
        const missingDetail=breakdown(result.missing);
        box.innerHTML=[
          renderStat("主数据中的图片引用数量",formatNumber(result.referenced),breakdown(result.referenced)),
          renderStat("IndexedDB 图片数量",formatNumber(result.indexedDbTotal),""),
          renderStat("缺失图片数量",formatNumber(result.missing),missingDetail),
          renderStat("孤儿图片数量",formatNumber(result.orphaned),""),
          renderStat("最近一次检查时间",formatTime(backupHealthLastCheckedAt),"")
        ].join("");
      }

      function renderBackupHealthResult(message,type){
        const box=byId("backupHealthResult");
        if(!box)return;
        box.className=`backup-health-result ${type||""}`.trim();
        box.textContent=message||"";
      }

      function renderFileStatus(message,type){
        const box=byId("backupHealthFileStatus");
        if(!box)return;
        box.className=`backup-health-file ${type||""}`.trim();
        box.textContent=message||"未选择 JSON 备份。";
      }

      async function runBackupHealthCheckInternal(options){
        const showResult=options?.showResult!==false;
        if(typeof window.runImageStorageHealthCheck!=="function"){
          renderBackupHealthResult("当前环境不支持图片健康检查。","error");
          return null;
        }
        if(!window.imageStore){
          renderBackupHealthResult("当前环境不能访问本机图片库，无法运行图片健康检查。","error");
          return null;
        }
        try{
          const result=await window.runImageStorageHealthCheck();
          backupHealthLastResult=result;
          backupHealthLastCheckedAt=new Date().toISOString();
          renderBackupHealthSummary(result);
          if(showResult){
            const missing=countValue(result?.missing);
            const orphaned=countValue(result?.orphaned);
            const type=missing>0||orphaned>0?"warn":"ok";
            renderBackupHealthResult(`检查完成。\n缺失图片：${missing}\n孤儿图片：${orphaned}`,(result?.ok&&orphaned===0)?"ok":type);
          }
          return result;
        }catch(err){
          console.error("runBackupHealthCheckUi failed",err);
          renderBackupHealthResult(friendlyError(err),"error");
          return null;
        }
      }

      async function runBackupHealthCheckUi(){
        setBusy("runBackupHealthBtn",true,"检查中");
        try{return await runBackupHealthCheckInternal({showResult:true});}
        finally{setBusy("runBackupHealthBtn",false);}
      }

      async function cleanOrphanImagesUi(){
        if(typeof window.cleanOrphanImages!=="function"){
          renderBackupHealthResult("当前环境不支持孤儿图片清理。","error");
          return;
        }
        const ok=confirm("确认清理孤儿图片吗？这只会删除 IndexedDB 中不再被当前数据引用的图片，不会删除聊天记录。");
        if(!ok){
          renderBackupHealthResult("已取消清理孤儿图片。","warn");
          return;
        }
        setBusy("cleanOrphanImagesBtn",true,"清理中");
        try{
          const result=await window.cleanOrphanImages({confirm:true});
          const failed=countValue(result?.failed);
          const lines=[
            "孤儿图片清理完成。",
            `已删除：${formatNumber(result?.deleted)}`,
            `剩余孤儿图片：${formatNumber(result?.remainingOrphaned)}`,
            `失败：${failed}`
          ];
          if(failed&&Array.isArray(result.failed)){
            lines.push(`失败项：${result.failed.slice(0,5).map(x=>x.id||x.error||"未知").join("，")}`);
          }
          renderBackupHealthResult(lines.join("\n"),failed?"warn":"ok");
          await runBackupHealthCheckInternal({showResult:false});
        }catch(err){
          console.error("cleanOrphanImagesUi failed",err);
          renderBackupHealthResult(friendlyError(err),"error");
        }finally{
          setBusy("cleanOrphanImagesBtn",false);
        }
      }

      function readFileAsText(file){
        return new Promise((resolve,reject)=>{
          const reader=new FileReader();
          reader.onerror=()=>reject(reader.error||new Error("文件读取出错。"));
          reader.onload=()=>resolve(String(reader.result||""));
          reader.readAsText(file);
        });
      }

      async function readBackupHealthJsonFile(file){
        backupHealthSelectedJson=null;
        backupHealthSelectedFileName="";
        if(!file){
          renderFileStatus("未选择 JSON 备份。","");
          return null;
        }
        setBusy("selectBackupForRepairBtn",true,"读取中");
        try{
          const text=await readFileAsText(file);
          const parsed=JSON.parse(text);
          backupHealthSelectedJson=parsed;
          backupHealthSelectedFileName=file.name||"未命名 JSON";
          renderFileStatus(`已选择：${backupHealthSelectedFileName}\n已解析。可以预览或修复缺失图片。`,"ok");
          renderBackupHealthResult("JSON 备份已读取。这里只会把它作为图片修复来源，不会导入或覆盖主数据。","ok");
          return parsed;
        }catch(err){
          console.warn("readBackupHealthJsonFile failed",err);
          backupHealthSelectedJson=null;
          backupHealthSelectedFileName="";
          renderFileStatus(`文件解析失败：${friendlyError(err)}`,"error");
          renderBackupHealthResult("文件解析失败。没有写入本机数据。","error");
          return null;
        }finally{
          setBusy("selectBackupForRepairBtn",false);
        }
      }

      async function previewBackupRepairUi(){
        if(!backupHealthSelectedJson){
          renderBackupHealthResult("请先选择 JSON 备份。","warn");
          return null;
        }
        if(typeof window.previewRepairMissingImagesFromBackupJson!=="function"){
          renderBackupHealthResult("当前环境不支持从备份预览图片修复。","error");
          return null;
        }
        setBusy("previewRepairImagesBtn",true,"预览中");
        try{
          const result=await window.previewRepairMissingImagesFromBackupJson(backupHealthSelectedJson);
          const can=countValue(result?.canRepair);
          const cannot=countValue(result?.cannotRepair);
          const missing=countValue(result?.missingTotal);
          const lines=[
            `当前缺失图片：${missing}`,
            `可从备份恢复：${can}${breakdown(result?.canRepair)?`（${breakdown(result.canRepair)}）`:""}`,
            `仍无法恢复：${cannot}${breakdown(result?.cannotRepair)?`（${breakdown(result.cannotRepair)}）`:""}`,
            `备份文件：${backupHealthSelectedFileName||"已选择 JSON"}`
          ];
          renderBackupHealthResult(lines.join("\n"),missing===0||can>0?"ok":"warn");
          return result;
        }catch(err){
          console.error("previewBackupRepairUi failed",err);
          renderBackupHealthResult(friendlyError(err),"error");
          return null;
        }finally{
          setBusy("previewRepairImagesBtn",false);
        }
      }

      async function repairBackupImagesUi(){
        if(!backupHealthSelectedJson){
          renderBackupHealthResult("请先选择 JSON 备份。","warn");
          return null;
        }
        if(typeof window.repairMissingImagesFromBackupJson!=="function"){
          renderBackupHealthResult("当前环境不支持从备份修复图片。","error");
          return null;
        }
        const ok=confirm("确认从这个 JSON 备份中修复缺失图片吗？这会把可恢复的图片写回 IndexedDB，但不会导入或覆盖聊天、成员、房间等主数据。");
        if(!ok){
          renderBackupHealthResult("已取消从备份修复缺失图片。","warn");
          return null;
        }
        setBusy("repairImagesFromBackupBtn",true,"修复中");
        try{
          const result=await window.repairMissingImagesFromBackupJson(backupHealthSelectedJson,{overwrite:false});
          const repaired=countValue(result?.repaired);
          const stillMissing=countValue(result?.stillMissing);
          const skipped=countValue(result?.skipped);
          const errors=countValue(result?.errors);
          const lines=[
            `已修复：${repaired}${breakdown(result?.repaired)?`（${breakdown(result.repaired)}）`:""}`,
            `仍缺失：${stillMissing}${breakdown(result?.stillMissing)?`（${breakdown(result.stillMissing)}）`:""}`,
            `已跳过：${skipped}`,
            `错误：${errors}`
          ];
          if(skipped&&Array.isArray(result.skipped)){
            lines.push(`跳过项：${result.skipped.slice(0,5).map(x=>x.id||x.reason||"未知").join("，")}`);
          }
          if(errors&&Array.isArray(result.errors)){
            lines.push(`错误项：${result.errors.slice(0,5).map(x=>`${x.id||"未知"} ${x.error||""}`.trim()).join("，")}`);
          }
          renderBackupHealthResult(lines.join("\n"),errors?"error":(stillMissing||skipped?"warn":"ok"));
          await runBackupHealthCheckInternal({showResult:false});
          return result;
        }catch(err){
          console.error("repairBackupImagesUi failed",err);
          renderBackupHealthResult(friendlyError(err),"error");
          return null;
        }finally{
          setBusy("repairImagesFromBackupBtn",false);
        }
      }

      function resetBackupHealthUi(){
        backupHealthSelectedJson=null;
        backupHealthSelectedFileName="";
        backupHealthLastResult=null;
        backupHealthLastCheckedAt="";
        renderBackupHealthSummary(null);
        renderFileStatus("未选择 JSON 备份。","");
        renderBackupHealthResult("等待操作。","");
        const input=byId("backupHealthJsonInput");
        if(input)input.value="";
      }

      function openBackupHealthModal(){
        resetBackupHealthUi();
        document.body.classList.remove("drawer-open");
        if(typeof applyTermsToStaticLabels==="function")applyTermsToStaticLabels();
        if(typeof window.openModal==="function")window.openModal("backupHealthModal");
        else {
          const modal=byId("backupHealthModal");
          if(modal)modal.style.display="flex";
        }
      }

      function closeBackupHealthModal(){
        if(typeof window.closeModal==="function")window.closeModal("backupHealthModal");
        else {
          const modal=byId("backupHealthModal");
          if(modal)modal.style.display="none";
        }
      }

      window.openBackupHealthModal=openBackupHealthModal;
      window.closeBackupHealthModal=closeBackupHealthModal;
      window.runBackupHealthCheckUi=runBackupHealthCheckUi;
      window.renderBackupHealthSummary=renderBackupHealthSummary;
      window.renderBackupHealthResult=renderBackupHealthResult;
      window.readBackupHealthJsonFile=readBackupHealthJsonFile;
      window.previewBackupRepairUi=previewBackupRepairUi;
      window.repairBackupImagesUi=repairBackupImagesUi;
      window.cleanOrphanImagesUi=cleanOrphanImagesUi;
      window.resetBackupHealthUi=resetBackupHealthUi;
    })();
