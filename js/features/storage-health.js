    (function(){
      const MIB=1024*1024;

      function byId(id){return document.getElementById(id);}

      function escapeHtml(value){
        return String(value==null?"":value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
      }

      function safeArray(value){
        return Array.isArray(value)?value:[];
      }

      function currentData(){
        try{return typeof data!=="undefined"&&data&&typeof data==="object"?data:{};}
        catch{return {};}
      }

      function byteSizeOfString(value){
        const text=String(value||"");
        try{
          if(typeof Blob==="function")return new Blob([text]).size;
        }catch{}
        return text.length*2;
      }

      function estimateLocalStorageEntrySize(key){
        let value="";
        try{value=localStorage.getItem(key)||"";}
        catch(err){return {key,exists:false,chars:0,bytes:0,error:err?.message||String(err)};}
        return {key,exists:value.length>0,chars:value.length,bytes:byteSizeOfString(value)};
      }

      function estimateLedgerRecordCount(){
        try{
          const parsed=JSON.parse(localStorage.getItem(LEDGER_KEY)||"[]");
          return Array.isArray(parsed)?parsed.length:0;
        }catch{
          return 0;
        }
      }

      function estimateLedgerSettingsCounts(){
        try{
          const key=typeof LEDGER_SETTINGS_KEY==="string"?LEDGER_SETTINGS_KEY:"moonLedger.settings.v1";
          const parsed=JSON.parse(localStorage.getItem(key)||"{}");
          const settings=typeof normalizeLedgerSettings==="function"?normalizeLedgerSettings(parsed):parsed;
          return {
            categories:Array.isArray(settings.categories)?settings.categories.length:0,
            budgets:Array.isArray(settings.budgets)?settings.budgets.length:0
          };
        }catch{
          return {categories:0,budgets:0};
        }
      }

      function formatBytes(bytes){
        const n=Number(bytes);
        if(!Number.isFinite(n)||n<0)return "未知";
        if(n<1024)return `${n} B`;
        if(n<MIB)return `${(n/1024).toFixed(n<10240?1:0)} KiB`;
        return `${(n/MIB).toFixed(2)} MiB`;
      }

      function formatCount(value){
        const n=Number(value);
        return Number.isFinite(n)?String(n):"0";
      }

      function formatTime(iso){
        if(!iso)return "尚未检查";
        try{return new Date(iso).toLocaleString();}
        catch{return iso;}
      }

      function renderStat(label,value,detail){
        return `<div class="storage-health-stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${detail?`<small>${escapeHtml(detail)}</small>`:""}</div>`;
      }

      function getStorageRiskLevel(mainBytes){
        const bytes=Number(mainBytes)||0;
        if(bytes<3*MIB)return {key:"ok",label:"正常",className:"ok",range:"< 3 MiB",detail:"主数据体积处于低风险区。"};
        if(bytes<5*MIB)return {key:"notice",label:"注意",className:"warn",range:"3-5 MiB",detail:"主数据已经开始变大，建议观察增长速度。"};
        if(bytes<8*MIB)return {key:"watch",label:"建议定期备份并观察",className:"warn",range:"5-8 MiB",detail:"主数据进入观察区，建议保持更稳定的完整备份节奏。"};
        if(bytes<=10*MIB)return {key:"near",label:"接近风险区，建议考虑结构化迁移",className:"danger",range:"8-10 MiB",detail:"主数据接近常见浏览器配额风险区，建议评估后续拆分。"};
        return {key:"high",label:"高风险，建议尽快备份并评估迁移",className:"danger",range:"> 10 MiB",detail:"主数据已经超过经验风险线，继续大量写入前应先备份。"};
      }

      function getStorageRiskAdvice(risk){
        const key=typeof risk==="string"?risk:risk?.key;
        if(key==="ok")return "保持定期完整 JSON 备份。";
        if(key==="notice")return "建议每周备份，观察主数据增长。";
        if(key==="watch")return "建议每周备份并持续观察主数据增长；如果增长很快，可以提前准备结构化迁移评估。";
        if(key==="near")return "建议减少长期测试数据，考虑结构化迁移评估。";
        if(key==="high")return "建议立即导出完整 JSON 备份，避免继续大量写入。";
        return "刷新状态后会显示备份建议。";
      }

      async function collectStorageHealthStats(){
        const appData=currentData();
        const main=estimateLocalStorageEntrySize(KEY);
        const prefsEntry=estimateLocalStorageEntrySize(PREF_KEY);
        const ledger=estimateLocalStorageEntrySize(LEDGER_KEY);
        const ledgerSettingsKey=typeof LEDGER_SETTINGS_KEY==="string"?LEDGER_SETTINGS_KEY:"moonLedger.settings.v1";
        const ledgerSettingsEntry=estimateLocalStorageEntrySize(ledgerSettingsKey);
        const ledgerSettingsCounts=estimateLedgerSettingsCounts();
        const messages=safeArray(appData.messages);
        const members=safeArray(appData.members);
        const rooms=safeArray(appData.rooms);
        const frontingLogs=safeArray(appData.frontingLogs);
        const tasks=safeArray(appData.tasks);
        const careLogs=safeArray(appData.careLogs);
        const polls=safeArray(appData.polls);
        const imageRefs={
          messages:messages.filter(m=>m&&m.imageId).length,
          members:members.filter(m=>m&&m.avatarId).length,
          rooms:rooms.filter(r=>r&&r.backgroundId).length
        };
        let imageRecords=[];
        let imageError="";
        if(window.imageStore&&typeof window.imageStore.listImages==="function"){
          try{imageRecords=await window.imageStore.listImages();}
          catch(err){imageError=err?.message||String(err);}
        }else{
          imageError="图片库入口不可用。";
        }
        const imageSizes=imageRecords.map(record=>Number(record?.size)).filter(size=>Number.isFinite(size)&&size>=0);
        const imageBytes=imageSizes.length?imageSizes.reduce((sum,size)=>sum+size,0):0;
        const risk=getStorageRiskLevel(main.bytes);
        return {
          checkedAt:new Date().toISOString(),
          main,
          prefs:prefsEntry,
          ledger,
          ledgerSettings:ledgerSettingsEntry,
          ledgerRecordCount:estimateLedgerRecordCount(),
          ledgerCategoryCount:ledgerSettingsCounts.categories,
          ledgerBudgetCount:ledgerSettingsCounts.budgets,
          imageCount:imageRecords.length,
          imageBytes,
          imageSizeKnown:imageRecords.length===0||imageSizes.length>0,
          imageError,
          counts:{
            messages:messages.length,
            members:members.length,
            rooms:rooms.length,
            frontingLogs:frontingLogs.length,
            tasks:tasks.length,
            careLogs:careLogs.length,
            polls:polls.length
          },
          imageRefs,
          risk
        };
      }

      function renderStorageHealthStats(stats){
        const summary=byId("storageHealthSummary");
        const riskBox=byId("storageHealthRisk");
        const adviceBox=byId("storageHealthAdvice");
        if(!stats){
          if(summary)summary.textContent="还没有检查。";
          if(riskBox){
            riskBox.className="storage-health-risk";
            riskBox.textContent="等待统计。";
          }
          if(adviceBox)adviceBox.textContent="刷新状态后会显示备份建议。";
          return;
        }
        const imageRefTotal=stats.imageRefs.messages+stats.imageRefs.members+stats.imageRefs.rooms;
        if(summary){
          summary.innerHTML=[
            renderStat("主数据大小",formatBytes(stats.main.bytes),`${stats.main.chars} 字符，KEY`),
            renderStat("偏好大小",formatBytes(stats.prefs.bytes),`${stats.prefs.chars} 字符，PREF_KEY`),
            renderStat("账本大小",formatBytes(stats.ledger.bytes),`${stats.ledger.chars} 字符，LEDGER_KEY`),
            renderStat("账本记录数",formatCount(stats.ledgerRecordCount),"只统计数量"),
            renderStat("账本设置大小",formatBytes(stats.ledgerSettings.bytes),`${stats.ledgerSettings.chars} 字符，LEDGER_SETTINGS_KEY`),
            renderStat("账本分类数",formatCount(stats.ledgerCategoryCount),"只统计数量"),
            renderStat("账本预算数",formatCount(stats.ledgerBudgetCount),"只统计数量"),
            renderStat("IndexedDB 图片数量",formatCount(stats.imageCount),stats.imageError||"moon-images / images"),
            renderStat("IndexedDB 图片总大小",stats.imageSizeKnown?formatBytes(stats.imageBytes):"未知","来自 listImages() 摘要"),
            renderStat("消息数",formatCount(stats.counts.messages),""),
            renderStat("成员数",formatCount(stats.counts.members),""),
            renderStat("房间数",formatCount(stats.counts.rooms),""),
            renderStat("前台日志数",formatCount(stats.counts.frontingLogs),""),
            renderStat("任务数",formatCount(stats.counts.tasks),""),
            renderStat("照护记录数",formatCount(stats.counts.careLogs),""),
            renderStat("投票数",formatCount(stats.counts.polls),""),
            renderStat("图片引用数",formatCount(imageRefTotal),`消息 ${stats.imageRefs.messages}，头像 ${stats.imageRefs.members}，背景 ${stats.imageRefs.rooms}`),
            renderStat("最近检查时间",formatTime(stats.checkedAt),"")
          ].join("");
        }
        if(riskBox){
          riskBox.className=`storage-health-risk ${stats.risk.className||""}`.trim();
          riskBox.innerHTML=[
            `<strong>${escapeHtml(stats.risk.label)}</strong>`,
            `<span>${escapeHtml(stats.risk.range)} · ${escapeHtml(formatBytes(stats.main.bytes))}</span>`,
            `<p>${escapeHtml(stats.risk.detail)}</p>`,
            "<small>这些阈值只是经验提示，不是浏览器保证。不同浏览器 localStorage 配额不同。</small>"
          ].join("");
        }
        if(adviceBox){
          adviceBox.innerHTML=[
            `<p>${escapeHtml(getStorageRiskAdvice(stats.risk))}</p>`,
            "<p>本面板只做本地估算，不会上传任何数据，也不会修改任何数据。图片已外置到 IndexedDB；账本请使用首页的账本备份单独保存。</p>"
          ].join("");
        }
      }

      function setBusy(buttonId,busy,label){
        const btn=byId(buttonId);
        if(!btn)return;
        if(busy){
          btn.dataset.storageHealthText=btn.textContent;
          if(label)btn.textContent=label;
          btn.disabled=true;
          return;
        }
        if(btn.dataset.storageHealthText)btn.textContent=btn.dataset.storageHealthText;
        btn.disabled=false;
      }

      async function runStorageHealthCheckUi(){
        setBusy("runStorageHealthBtn",true,"刷新中");
        try{
          const stats=await collectStorageHealthStats();
          renderStorageHealthStats(stats);
          return stats;
        }catch(err){
          console.error("runStorageHealthCheckUi failed",err);
          const riskBox=byId("storageHealthRisk");
          if(riskBox){
            riskBox.className="storage-health-risk danger";
            riskBox.textContent="状态统计失败："+(err?.message||String(err));
          }
          return null;
        }finally{
          setBusy("runStorageHealthBtn",false);
        }
      }

      function openStorageHealthModal(){
        document.body.classList.remove("drawer-open");
        if(typeof window.openModal==="function")window.openModal("storageHealthModal");
        else {
          const modal=byId("storageHealthModal");
          if(modal)modal.style.display="flex";
        }
        renderStorageHealthStats(null);
        runStorageHealthCheckUi();
      }

      function openExportFromStorageHealth(){
        if(typeof window.closeModal==="function")window.closeModal("storageHealthModal");
        else {
          const modal=byId("storageHealthModal");
          if(modal)modal.style.display="none";
        }
        if(typeof window.openExportModal==="function"){
          window.openExportModal();
          return;
        }
        if(typeof window.openModal==="function"){
          window.openModal("exportModal");
          return;
        }
        const exportModal=byId("exportModal");
        if(exportModal)exportModal.style.display="flex";
        else alert("导出入口不可用。");
      }

      function openBackupHealthFromStorageHealth(){
        if(typeof window.closeModal==="function")window.closeModal("storageHealthModal");
        else {
          const modal=byId("storageHealthModal");
          if(modal)modal.style.display="none";
        }
        if(typeof window.openBackupHealthModal==="function"){
          window.openBackupHealthModal();
          return;
        }
        alert("备份健康检查入口不可用。");
      }

      window.openStorageHealthModal=openStorageHealthModal;
      window.runStorageHealthCheckUi=runStorageHealthCheckUi;
      window.collectStorageHealthStats=collectStorageHealthStats;
      window.renderStorageHealthStats=renderStorageHealthStats;
      window.formatBytes=formatBytes;
      window.getStorageRiskLevel=getStorageRiskLevel;
      window.getStorageRiskAdvice=getStorageRiskAdvice;
      window.estimateLocalStorageEntrySize=estimateLocalStorageEntrySize;
      window.openExportFromStorageHealth=openExportFromStorageHealth;
      window.openBackupHealthFromStorageHealth=openBackupHealthFromStorageHealth;
    })();
