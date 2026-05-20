function ledgerLocalDate(date=new Date()){
  const d=date instanceof Date?date:new Date(date||Date.now());
  const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,10);
}

function normalizeLedgerRecord(record){
  const source=record&&typeof record==="object"?record:{};
  const amount=Number(source.amount);
  const createdAt=String(source.createdAt||now());
  return {
    id:String(source.id||makeId()),
    type:source.type==="income"?"income":"expense",
    amount:Number.isFinite(amount)?amount:0,
    category:String(source.category||""),
    date:String(source.date||ledgerLocalDate()),
    note:String(source.note||""),
    createdAt,
    account:String(source.account||""),
    paymentMethod:String(source.paymentMethod||""),
    updatedAt:String(source.updatedAt||createdAt||now())
  };
}

function normalizeLedgerRecords(records){
  return Array.isArray(records)?records.map(normalizeLedgerRecord):[];
}

function normalizeLedgerRecordsForBackup(records){
  return normalizeLedgerRecords(records);
}

function getRuntimeLedgerRecordsForBackup(){
  try{return typeof ledgerRecords!=="undefined"&&Array.isArray(ledgerRecords)?ledgerRecords:[];}
  catch{return [];}
}

function currentLedgerRecordsForBackup(){
  return getRuntimeLedgerRecordsForBackup();
}

function buildLedgerBackup(records=getRuntimeLedgerRecordsForBackup()){
  return {
    app:"moon-ledger",
    kind:"ledger-backup",
    version:1,
    createdAt:now(),
    records:normalizeLedgerRecords(records)
  };
}

async function exportLedgerBackup(){
  return buildLedgerBackup();
}

function importLedgerBackup(records){
  return normalizeLedgerRecords(records);
}

function normalizePrefsForStorage(value){
  const source=value&&typeof value==="object"&&!Array.isArray(value)?value:{};
  const out={...defaultPrefs,...source};
  out.terms=window.normalizeTerms?window.normalizeTerms(source.terms):{...DEFAULT_TERMS};
  return out;
}

class LocalStorageAdapter{
  async init(){}

  async loadAppData(){
    try{
      const raw=localStorage.getItem(KEY)||localStorage.getItem(OLD_KEY);
      return migrate(raw?JSON.parse(raw):JSON.parse(JSON.stringify(initial)));
    }catch(err){
      console.error("loadAppData failed",err);
      return migrate(JSON.parse(JSON.stringify(initial)));
    }
  }

  async saveAppData(value){
    try{
      localStorage.setItem(KEY,JSON.stringify(value));
      return true;
    }catch(err){
      console.error("saveAppData failed",err);
      throw err;
    }
  }

  async loadPrefs(){
    try{
      return normalizePrefsForStorage(JSON.parse(localStorage.getItem(PREF_KEY)||"{}"));
    }catch(err){
      console.error("loadPrefs failed",err);
      return normalizePrefsForStorage({});
    }
  }

  async savePrefs(value){
    try{
      localStorage.setItem(PREF_KEY,JSON.stringify(normalizePrefsForStorage(value)));
      return true;
    }catch(err){
      console.error("savePrefs failed",err);
      throw err;
    }
  }

  async loadLedger(){
    try{
      return normalizeLedgerRecords(JSON.parse(localStorage.getItem(LEDGER_KEY)||"[]"));
    }catch(err){
      console.error("loadLedger failed",err);
      return [];
    }
  }

  async saveLedger(records){
    try{
      localStorage.setItem(LEDGER_KEY,JSON.stringify(normalizeLedgerRecords(records)));
      return true;
    }catch(err){
      console.error("saveLedger failed",err);
      throw err;
    }
  }

  async exportBackup(){
    const backup=JSON.parse(JSON.stringify({
      app:"月之暗面",
      version:2,
      exportedAt:now(),
      nextSeq:data.nextSeq,
      tags:data.tags||[],
      messageKinds:data.messageKinds||DEFAULT_KINDS,
      polls:data.polls||[],
      handoffNotes:data.handoffNotes||[],
      frontingLogs:data.frontingLogs||[],
      tasks:data.tasks||[],
      careLogs:data.careLogs||[],
      careChecklist:data.careChecklist||[],
      systemProfile:data.systemProfile||blankSystemProfile(),
      systemProfileVisibility:normalizeSystemProfileVisibilityRecord(data.systemProfileVisibility),
      memberRelations:data.memberRelations||[],
      externalSystemCards:data.externalSystemCards||[],
      rooms:data.rooms,
      members:data.members,
      messages:data.messages
    }));
    if(typeof hydrateImagesForJsonExport==="function")await hydrateImagesForJsonExport(backup);
    return backup;
  }

  async importBackup(jsonData){
    const parsed=typeof jsonData==="string"?JSON.parse(jsonData):jsonData;
    if(!Array.isArray(parsed.rooms)||!Array.isArray(parsed.members)||!Array.isArray(parsed.messages))throw new Error("invalid_backup");
    return migrate({
      nextSeq:parsed.nextSeq,
      tags:parsed.tags||[],
      messageKinds:parsed.messageKinds||DEFAULT_KINDS,
      polls:parsed.polls||[],
      handoffNotes:parsed.handoffNotes||[],
      frontingLogs:parsed.frontingLogs||[],
      tasks:parsed.tasks||[],
      careLogs:parsed.careLogs||[],
      careChecklist:parsed.careChecklist||[],
      systemProfile:parsed.systemProfile,
      systemProfileVisibility:parsed.systemProfileVisibility,
      memberRelations:parsed.memberRelations||[],
      externalSystemCards:parsed.externalSystemCards||[],
      rooms:parsed.rooms,
      members:parsed.members,
      messages:parsed.messages
    });
  }
}

const storage=new LocalStorageAdapter();
let debouncedSaveTimer=null;
let debouncedSavePromise=null;
let debouncedSaveResolve=null;
const DEBOUNCED_SAVE_DELAY_MS=600;

async function load(){return storage.loadAppData();}

async function save(){
  let pendingResolve=null;
  if(debouncedSaveTimer){
    clearTimeout(debouncedSaveTimer);
    debouncedSaveTimer=null;
    pendingResolve=debouncedSaveResolve;
    debouncedSavePromise=null;
    debouncedSaveResolve=null;
  }
  try{
    const ok=await storage.saveAppData(data);
    if(pendingResolve)pendingResolve(ok);
    return ok;
  }catch(err){
    const isQuota=err?.name==="QuotaExceededError"||/quota|exceed|full/i.test(String(err?.message||""));
    if(isQuota){
      alert("本地存储已满。\n\n这次保存没有写入。当前屏幕上的内容可能还没保存。请：\n1. 先复制屏幕上尚未保存的内容\n2. 去 设置 → 数据 → 导出 JSON 备份\n3. 妥善保存导出的文件\n4. 删除一些旧图片、对话背景或聊天记录后再尝试。");
    }else{
      alert("保存失败："+(err?.message||"未知错误")+"\n\n这次保存没有写入。建议先复制当前内容再尝试。");
    }
    if(pendingResolve)pendingResolve(false);
    return false;
  }
}

function debouncedSave(label="保存",delayMs=DEBOUNCED_SAVE_DELAY_MS){
  if(debouncedSaveTimer)clearTimeout(debouncedSaveTimer);
  if(!debouncedSavePromise)debouncedSavePromise=new Promise(resolve=>{debouncedSaveResolve=resolve;});
  debouncedSaveTimer=setTimeout(async()=>{
    debouncedSaveTimer=null;
    const resolve=debouncedSaveResolve;
    debouncedSavePromise=null;
    debouncedSaveResolve=null;
    const ok=await save();
    if(resolve)resolve(ok);
  },Math.max(0,Number(delayMs)||0));
  return debouncedSavePromise.catch(err=>{
    console.error(`${label}失败`,err);
    return false;
  });
}

async function loadPrefs(){return storage.loadPrefs();}

async function savePrefs(){
  try{return await storage.savePrefs(prefs);}
  catch(err){
    alert("设置保存失败："+(err?.message||"未知错误"));
    return false;
  }
}

// 过渡方案：保留少量非关键路径的异步落盘，不阻塞当前 UI。后续接入 SQLite 时应逐步改为显式 await。
function safeSave(label="保存"){save().catch(err=>console.error(`${label}失败`,err));}

function safeSavePrefs(label="设置保存"){savePrefs().catch(err=>console.error(`${label}失败`,err));}

async function loadLedger(){
  ledgerRecords=await storage.loadLedger();
  return ledgerRecords;
}

async function saveLedger(records){
  const normalized=normalizeLedgerRecords(records);
  ledgerRecords=normalized;
  try{return await storage.saveLedger(normalized);}
  catch(err){
    alert("账本保存失败："+(err?.message||"未知错误"));
    return false;
  }
}

window.normalizeLedgerRecord=normalizeLedgerRecord;
window.normalizeLedgerRecords=normalizeLedgerRecords;
window.normalizeLedgerRecordsForBackup=normalizeLedgerRecordsForBackup;
window.getRuntimeLedgerRecordsForBackup=getRuntimeLedgerRecordsForBackup;
window.currentLedgerRecordsForBackup=currentLedgerRecordsForBackup;
window.buildLedgerBackup=buildLedgerBackup;
window.exportLedgerBackup=exportLedgerBackup;
window.importLedgerBackup=importLedgerBackup;
