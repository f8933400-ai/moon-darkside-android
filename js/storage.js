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

const LEDGER_SETTINGS_KEY="moonLedger.settings.v1";
const LEDGER_DEFAULT_CATEGORIES=[
  {id:"expense-food",type:"expense",name:"餐饮",color:"#ef4444"},
  {id:"expense-transport",type:"expense",name:"交通",color:"#f97316"},
  {id:"expense-shopping",type:"expense",name:"购物",color:"#eab308"},
  {id:"expense-housing",type:"expense",name:"住房",color:"#22c55e"},
  {id:"expense-medical",type:"expense",name:"医疗",color:"#14b8a6"},
  {id:"expense-study",type:"expense",name:"学习",color:"#3b82f6"},
  {id:"expense-fun",type:"expense",name:"娱乐",color:"#8b5cf6"},
  {id:"expense-phone",type:"expense",name:"通讯",color:"#06b6d4"},
  {id:"expense-gift",type:"expense",name:"人情",color:"#ec4899"},
  {id:"expense-other",type:"expense",name:"其他",color:"#64748b"},
  {id:"income-salary",type:"income",name:"工资",color:"#16a34a"},
  {id:"income-part-time",type:"income",name:"兼职",color:"#059669"},
  {id:"income-reimburse",type:"income",name:"报销",color:"#0d9488"},
  {id:"income-refund",type:"income",name:"退款",color:"#0284c7"},
  {id:"income-gift",type:"income",name:"礼金",color:"#7c3aed"},
  {id:"income-other",type:"income",name:"其他",color:"#64748b"}
];

function normalizeLedgerColor(value,type="expense"){
  const color=String(value||"").trim();
  if(/^#[0-9a-fA-F]{6}$/.test(color))return color;
  return type==="income"?"#16a34a":"#ef4444";
}

function normalizeLedgerCategory(category){
  const source=category&&typeof category==="object"?category:{};
  const type=source.type==="income"?"income":"expense";
  const createdAt=String(source.createdAt||now());
  const name=String(source.name||"").trim()||"其他";
  return {
    id:String(source.id||makeId()),
    name,
    type,
    color:normalizeLedgerColor(source.color,type),
    archived:!!source.archived,
    createdAt,
    updatedAt:String(source.updatedAt||createdAt||now())
  };
}

function normalizeLedgerBudget(budget){
  const source=budget&&typeof budget==="object"?budget:{};
  const amount=Number(source.amount);
  const createdAt=String(source.createdAt||now());
  const month=String(source.month||ledgerLocalDate().slice(0,7)).slice(0,7);
  return {
    id:String(source.id||makeId()),
    scope:"monthly",
    month:/^\d{4}-\d{2}$/.test(month)?month:ledgerLocalDate().slice(0,7),
    categoryId:String(source.categoryId||""),
    categoryName:String(source.categoryName||"").trim(),
    amount:Number.isFinite(amount)&&amount>=0?amount:0,
    note:String(source.note||""),
    createdAt,
    updatedAt:String(source.updatedAt||createdAt||now())
  };
}

function defaultLedgerSettings(){
  const createdAt=now();
  return {
    categories:LEDGER_DEFAULT_CATEGORIES.map(category=>normalizeLedgerCategory({...category,createdAt,updatedAt:createdAt})),
    budgets:[],
    defaultViewMode:"month"
  };
}

function isPlainLedgerObject(value){
  return !!value&&typeof value==="object"&&!Array.isArray(value);
}

function normalizeLedgerCategoryList(categories){
  if(!Array.isArray(categories))return [];
  const normalized=[];
  const seen=new Set();
  categories.forEach(category=>{
    if(!isPlainLedgerObject(category))return;
    const name=String(category.name||"").trim();
    if(!name)return;
    const item=normalizeLedgerCategory({...category,name});
    const key=`${item.type}:${item.name.trim().toLowerCase()}`;
    if(seen.has(key))return;
    seen.add(key);
    normalized.push(item);
  });
  return normalized;
}

function normalizeLedgerBudgetList(budgets,categories){
  if(!Array.isArray(budgets))return [];
  const categoryById=new Map((Array.isArray(categories)?categories:[]).map(category=>[category.id,category]));
  return budgets.filter(isPlainLedgerObject).map(normalizeLedgerBudget).map(budget=>{
    if(!budget.categoryName&&budget.categoryId&&categoryById.has(budget.categoryId)){
      return {...budget,categoryName:categoryById.get(budget.categoryId).name};
    }
    return budget;
  });
}

function normalizeLedgerSettings(settings){
  const source=isPlainLedgerObject(settings)?settings:{};
  const defaults=defaultLedgerSettings();
  const hasCategoryArray=Array.isArray(source.categories);
  const categories=hasCategoryArray&&source.categories.length>0?normalizeLedgerCategoryList(source.categories):defaults.categories;
  const budgets=normalizeLedgerBudgetList(source.budgets,categories);
  return {
    categories,
    budgets,
    defaultViewMode:["day","month","year","all"].includes(source.defaultViewMode)?source.defaultViewMode:"month"
  };
}

function normalizeLedgerSettingsForBackup(settings){
  return normalizeLedgerSettings(settings);
}

function validateLedgerBackupSettingsPayload(settings){
  if(!isPlainLedgerObject(settings))throw new Error("invalid_ledger_settings");
  if("categories" in settings&&!Array.isArray(settings.categories))throw new Error("invalid_ledger_settings");
  if("budgets" in settings&&!Array.isArray(settings.budgets))throw new Error("invalid_ledger_settings");
  return true;
}

function getRuntimeLedgerRecordsForBackup(){
  try{return typeof ledgerRecords!=="undefined"&&Array.isArray(ledgerRecords)?ledgerRecords:[];}
  catch{return [];}
}

function getRuntimeLedgerSettingsForBackup(){
  try{return typeof ledgerSettings!=="undefined"&&ledgerSettings&&typeof ledgerSettings==="object"?ledgerSettings:defaultLedgerSettings();}
  catch{return defaultLedgerSettings();}
}

function currentLedgerRecordsForBackup(){
  return getRuntimeLedgerRecordsForBackup();
}

function currentLedgerSettingsForBackup(){
  return getRuntimeLedgerSettingsForBackup();
}

function buildLedgerBackup(records=getRuntimeLedgerRecordsForBackup(),settings=getRuntimeLedgerSettingsForBackup()){
  return {
    app:"moon-ledger",
    kind:"ledger-backup",
    version:2,
    createdAt:now(),
    records:normalizeLedgerRecords(records),
    settings:normalizeLedgerSettingsForBackup(settings)
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

  async loadLedgerSettings(){
    try{
      return normalizeLedgerSettings(JSON.parse(localStorage.getItem(LEDGER_SETTINGS_KEY)||"{}"));
    }catch(err){
      console.error("loadLedgerSettings failed",err);
      return defaultLedgerSettings();
    }
  }

  async saveLedgerSettings(settings){
    try{
      localStorage.setItem(LEDGER_SETTINGS_KEY,JSON.stringify(normalizeLedgerSettings(settings)));
      return true;
    }catch(err){
      console.error("saveLedgerSettings failed",err);
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

async function loadLedgerSettings(){
  ledgerSettings=await storage.loadLedgerSettings();
  return ledgerSettings;
}

async function saveLedgerSettings(settings){
  const normalized=normalizeLedgerSettings(settings);
  try{
    const ok=await storage.saveLedgerSettings(normalized);
    if(ok)ledgerSettings=normalized;
    return ok;
  }
  catch(err){
    alert("账本设置保存失败："+(err?.message||"未知错误"));
    return false;
  }
}

window.LEDGER_SETTINGS_KEY=LEDGER_SETTINGS_KEY;
window.normalizeLedgerRecord=normalizeLedgerRecord;
window.normalizeLedgerRecords=normalizeLedgerRecords;
window.normalizeLedgerRecordsForBackup=normalizeLedgerRecordsForBackup;
window.defaultLedgerSettings=defaultLedgerSettings;
window.normalizeLedgerSettings=normalizeLedgerSettings;
window.normalizeLedgerSettingsForBackup=normalizeLedgerSettingsForBackup;
window.normalizeLedgerColor=normalizeLedgerColor;
window.normalizeLedgerCategory=normalizeLedgerCategory;
window.normalizeLedgerBudget=normalizeLedgerBudget;
window.validateLedgerBackupSettingsPayload=validateLedgerBackupSettingsPayload;
window.getRuntimeLedgerRecordsForBackup=getRuntimeLedgerRecordsForBackup;
window.getRuntimeLedgerSettingsForBackup=getRuntimeLedgerSettingsForBackup;
window.currentLedgerRecordsForBackup=currentLedgerRecordsForBackup;
window.currentLedgerSettingsForBackup=currentLedgerSettingsForBackup;
window.buildLedgerBackup=buildLedgerBackup;
window.exportLedgerBackup=exportLedgerBackup;
window.importLedgerBackup=importLedgerBackup;
window.loadLedgerSettings=loadLedgerSettings;
window.saveLedgerSettings=saveLedgerSettings;
