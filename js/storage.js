    function normalizeLedgerRecordsForBackup(records){return Array.isArray(records)?records.map(r=>{const amount=Number(r?.amount); return {id:r?.id||makeId(),type:r?.type==="income"?"income":"expense",amount:Number.isFinite(amount)?amount:0,category:String(r?.category||""),date:String(r?.date||""),note:String(r?.note||""),createdAt:String(r?.createdAt||now())};}):[];}
    function getRuntimeLedgerRecordsForBackup(){try{return typeof ledgerRecords!=="undefined"&&Array.isArray(ledgerRecords)?ledgerRecords:[];}catch{return [];}}
    const normalizeLedgerRecords=normalizeLedgerRecordsForBackup;
    const currentLedgerRecordsForBackup=getRuntimeLedgerRecordsForBackup;
    window.normalizeLedgerRecordsForBackup=normalizeLedgerRecordsForBackup;
    class LocalStorageAdapter{
      async init(){}
      async loadAppData(){try{const raw=localStorage.getItem(KEY)||localStorage.getItem(OLD_KEY); return migrate(raw?JSON.parse(raw):JSON.parse(JSON.stringify(initial)));}catch(err){console.error("loadAppData failed",err); return migrate(JSON.parse(JSON.stringify(initial)));}}
      async saveAppData(value){try{localStorage.setItem(KEY,JSON.stringify(value)); return true;}catch(err){console.error("saveAppData failed",err); throw err;}}
      async loadPrefs(){try{return {...defaultPrefs,...JSON.parse(localStorage.getItem(PREF_KEY)||"{}")};}catch(err){console.error("loadPrefs failed",err); return {...defaultPrefs};}}
      async savePrefs(value){try{localStorage.setItem(PREF_KEY,JSON.stringify(value)); return true;}catch(err){console.error("savePrefs failed",err); throw err;}}
      async loadLedger(){try{return JSON.parse(localStorage.getItem(LEDGER_KEY)||"[]");}catch(err){console.error("loadLedger failed",err); return [];}}
      async saveLedger(records){try{localStorage.setItem(LEDGER_KEY,JSON.stringify(records)); return true;}catch(err){console.error("saveLedger failed",err); throw err;}}
      async exportBackup(){return {app:"月之暗面",version:2,exportedAt:now(),nextSeq:data.nextSeq,tags:data.tags||[],messageKinds:data.messageKinds||DEFAULT_KINDS,polls:data.polls||[],handoffNotes:data.handoffNotes||[],frontingLogs:data.frontingLogs||[],tasks:data.tasks||[],careLogs:data.careLogs||[],careChecklist:data.careChecklist||[],ledgerRecords:normalizeLedgerRecordsForBackup(getRuntimeLedgerRecordsForBackup()),systemProfile:data.systemProfile||blankSystemProfile(),systemProfileVisibility:normalizeSystemProfileVisibilityRecord(data.systemProfileVisibility),memberRelations:data.memberRelations||[],externalSystemCards:data.externalSystemCards||[],rooms:data.rooms,members:data.members,messages:data.messages};}
      async importBackup(jsonData){const parsed=typeof jsonData==="string"?JSON.parse(jsonData):jsonData; if(!Array.isArray(parsed.rooms)||!Array.isArray(parsed.members)||!Array.isArray(parsed.messages))throw new Error("invalid_backup"); return migrate({nextSeq:parsed.nextSeq,tags:parsed.tags||[],messageKinds:parsed.messageKinds||DEFAULT_KINDS,polls:parsed.polls||[],handoffNotes:parsed.handoffNotes||[],frontingLogs:parsed.frontingLogs||[],tasks:parsed.tasks||[],careLogs:parsed.careLogs||[],careChecklist:parsed.careChecklist||[],systemProfile:parsed.systemProfile,systemProfileVisibility:parsed.systemProfileVisibility,memberRelations:parsed.memberRelations||[],externalSystemCards:parsed.externalSystemCards||[],rooms:parsed.rooms,members:parsed.members,messages:parsed.messages});}
    }
    const storage=new LocalStorageAdapter();
    async function load(){return storage.loadAppData();}
    async function save(){try{return await storage.saveAppData(data);}catch(err){const isQuota=err?.name==="QuotaExceededError"||/quota|exceed|full/i.test(String(err?.message||"")); if(isQuota){alert("本地存储已满。\n\n这次保存没有写入。当前屏幕上的内容可能还没保存。请：\n1. 先复制屏幕上尚未保存的内容\n2. 去 设置 → 数据 → 导出 JSON 备份\n3. 妥善保存导出的文件\n4. 删除一些旧图片、对话背景或聊天记录后再尝试。");}else{alert("保存失败："+(err?.message||"未知错误")+"\n\n这次保存没有写入。建议先复制当前内容再尝试。");} return false;}}
    async function loadPrefs(){return storage.loadPrefs();}
    async function savePrefs(){try{return await storage.savePrefs(prefs);}catch(err){alert("设置保存失败："+(err?.message||"未知错误")); return false;}}
    // 过渡方案：保留少量非关键路径的异步落盘，不阻塞当前 UI。后续接入 SQLite 时应逐步改为显式 await。
    function safeSave(label="保存"){save().catch(err=>console.error(`${label}失败`,err));}
    function safeSavePrefs(label="设置保存"){savePrefs().catch(err=>console.error(`${label}失败`,err));}
    async function loadLedger(){ledgerRecords=await storage.loadLedger(); return ledgerRecords;}
    async function saveLedger(records){ledgerRecords=records; try{return await storage.saveLedger(records);}catch(err){alert("账本保存失败："+(err?.message||"未知错误")); return false;}}
