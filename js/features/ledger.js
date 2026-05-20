function ledgerFilenameStamp(date=new Date()){
  const pad=n=>String(n).padStart(2,"0");
  return `${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

function downloadLedgerFile(filename,type,text){
  if(window.MoonBridge?.saveFile){
    window.MoonBridge.saveFile(filename,type,text);
    return;
  }
  const blob=new Blob([text],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ledgerCsvCell(value){
  return `"${String(value==null?"":value).replace(/"/g,'""')}"`;
}

const LEDGER_EXPENSE_CATEGORIES=["餐饮","交通","购物","住房","医疗","学习","娱乐","其他"];
const LEDGER_INCOME_CATEGORIES=["工资","兼职","报销","退款","礼金","其他"];
const LEDGER_LIST_LIMIT=200;

function ledgerToday(){
  return typeof ledgerLocalDate==="function"?ledgerLocalDate():new Date().toISOString().slice(0,10);
}

function ledgerMonth(){
  return ledgerToday().slice(0,7);
}

function ledgerYear(){
  return ledgerToday().slice(0,4);
}

function ledgerMoney(value){
  const amount=Number(value);
  return (Number.isFinite(amount)?amount:0).toFixed(2);
}

function ledgerText(value,fallback=""){
  const text=String(value==null?"":value).trim();
  return text||fallback;
}

function ledgerSafe(value){
  if(typeof esc==="function")return esc(value);
  return String(value==null?"":value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}

function ledgerSetText(id,value){
  const el=document.getElementById(id);
  if(el)el.textContent=String(value);
}

function ledgerCategoryLabel(record){
  return ledgerText(record?.category,"未分类");
}

function ledgerAccountLabel(record){
  return ledgerText(record?.account,"未填写");
}

function ledgerTimestamp(record){
  const value=record?.updatedAt||record?.createdAt||record?.date||"";
  const time=new Date(value).getTime();
  return Number.isFinite(time)?time:0;
}

function sortLedgerRecords(records){
  return [...records].sort((a,b)=>{
    const dateCompare=String(b.date||"").localeCompare(String(a.date||""));
    if(dateCompare)return dateCompare;
    return ledgerTimestamp(b)-ledgerTimestamp(a);
  });
}

function syncLedgerCategoryOptions(){
  const type=document.getElementById("ledgerType")?.value==="income"?"income":"expense";
  const datalist=document.getElementById("ledgerCategoryOptions");
  if(!datalist)return;
  const defaults=type==="income"?LEDGER_INCOME_CATEGORIES:LEDGER_EXPENSE_CATEGORIES;
  const existing=normalizeLedgerRecords(ledgerRecords||[]).map(r=>r.category).filter(Boolean);
  const values=[...new Set([...defaults,...existing])];
  datalist.innerHTML=values.map(value=>`<option value="${ledgerSafe(value)}"></option>`).join("");
}

function setLedgerInitialInputValues(force=false){
  const date=document.getElementById("ledgerDate");
  const viewDate=document.getElementById("ledgerViewDate");
  const viewMonth=document.getElementById("ledgerViewMonth");
  const viewYear=document.getElementById("ledgerViewYear");
  if(date&&(force||!date.value))date.value=ledgerToday();
  if(viewDate&&(force||!viewDate.value))viewDate.value=ledgerToday();
  if(viewMonth&&(force||!viewMonth.value))viewMonth.value=ledgerMonth();
  if(viewYear&&(force||!viewYear.value))viewYear.value=ledgerYear();
}

function syncLedgerFilterControls(){
  const mode=document.getElementById("ledgerViewMode")?.value||"day";
  const dateWrap=document.querySelector(".ledger-view-date-wrap");
  const monthWrap=document.querySelector(".ledger-view-month-wrap");
  const yearWrap=document.querySelector(".ledger-view-year-wrap");
  if(dateWrap)dateWrap.hidden=mode!=="day";
  if(monthWrap)monthWrap.hidden=mode!=="month";
  if(yearWrap)yearWrap.hidden=mode!=="year";
}

function resetLedgerFilters(){
  const mode=document.getElementById("ledgerViewMode");
  const type=document.getElementById("ledgerTypeFilter");
  const category=document.getElementById("ledgerCategoryFilter");
  if(mode)mode.value="day";
  if(type)type.value="all";
  if(category)category.value="";
  setLedgerInitialInputValues(true);
  syncLedgerFilterControls();
}

function resetLedgerForm(){
  const title=document.getElementById("ledgerFormTitle");
  const submit=document.getElementById("ledgerSubmitBtn");
  const cancel=document.getElementById("ledgerCancelEditBtn");
  const type=document.getElementById("ledgerType");
  const amount=document.getElementById("ledgerAmount");
  const category=document.getElementById("ledgerCategory");
  const account=document.getElementById("ledgerAccount");
  const payment=document.getElementById("ledgerPaymentMethod");
  const note=document.getElementById("ledgerNote");
  const date=document.getElementById("ledgerDate");
  if(title)title.textContent="新增收支记录";
  if(submit)submit.textContent="记一笔";
  if(cancel)cancel.hidden=true;
  if(type)type.value="expense";
  if(amount)amount.value="";
  if(category)category.value="";
  if(account)account.value="";
  if(payment)payment.value="";
  if(note)note.value="";
  if(date)date.value=ledgerToday();
  syncLedgerCategoryOptions();
}

function populateLedgerForm(record){
  const normalized=normalizeLedgerRecord(record);
  const title=document.getElementById("ledgerFormTitle");
  const submit=document.getElementById("ledgerSubmitBtn");
  const cancel=document.getElementById("ledgerCancelEditBtn");
  const type=document.getElementById("ledgerType");
  if(title)title.textContent="编辑收支记录";
  if(submit)submit.textContent="保存修改";
  if(cancel)cancel.hidden=false;
  if(type)type.value=normalized.type;
  document.getElementById("ledgerAmount")&&(document.getElementById("ledgerAmount").value=String(normalized.amount));
  document.getElementById("ledgerDate")&&(document.getElementById("ledgerDate").value=normalized.date||ledgerToday());
  document.getElementById("ledgerCategory")&&(document.getElementById("ledgerCategory").value=normalized.category||"");
  document.getElementById("ledgerAccount")&&(document.getElementById("ledgerAccount").value=normalized.account||"");
  document.getElementById("ledgerPaymentMethod")&&(document.getElementById("ledgerPaymentMethod").value=normalized.paymentMethod||"");
  document.getElementById("ledgerNote")&&(document.getElementById("ledgerNote").value=normalized.note||"");
  syncLedgerCategoryOptions();
  document.getElementById("ledgerForm")?.scrollIntoView({block:"start",behavior:"smooth"});
}

function ledgerDateRange(records){
  const dates=normalizeLedgerRecords(records).map(r=>r.date).filter(Boolean).sort();
  if(!dates.length)return {start:"",end:"",label:"无日期"};
  return {start:dates[0],end:dates[dates.length-1],label:dates[0]===dates[dates.length-1]?dates[0]:`${dates[0]} 至 ${dates[dates.length-1]}`};
}

function ledgerTotals(records){
  return normalizeLedgerRecords(records).reduce((totals,record)=>{
    const amount=Number(record.amount)||0;
    if(record.type==="income")totals.income+=amount;
    else totals.expense+=amount;
    return totals;
  },{income:0,expense:0});
}

function ledgerFilterState(){
  const mode=document.getElementById("ledgerViewMode")?.value||"day";
  return {
    mode:["day","month","year","all"].includes(mode)?mode:"day",
    day:document.getElementById("ledgerViewDate")?.value||ledgerToday(),
    month:document.getElementById("ledgerViewMonth")?.value||ledgerMonth(),
    year:String(document.getElementById("ledgerViewYear")?.value||ledgerYear()).slice(0,4),
    type:document.getElementById("ledgerTypeFilter")?.value||"all",
    category:ledgerText(document.getElementById("ledgerCategoryFilter")?.value,"")
  };
}

function ledgerViewTitle(state=ledgerFilterState()){
  if(state.mode==="all")return "全部收支";
  if(state.mode==="day")return state.day===ledgerToday()?"今日收支":`${state.day} 收支`;
  if(state.mode==="month")return state.month===ledgerMonth()?"本月收支":`${state.month} 收支`;
  return state.year===ledgerYear()?"本年收支":`${state.year} 年收支`;
}

function ledgerExpenseTitle(state=ledgerFilterState()){
  if(state.mode==="day"&&state.day===ledgerToday())return "今日支出";
  if(state.mode==="month"&&state.month===ledgerMonth())return "本月支出";
  if(state.mode==="year"&&state.year===ledgerYear())return "本年支出";
  return "支出合计";
}

function ledgerMatchesView(record,state){
  const date=String(record.date||"");
  if(state.mode==="all")return true;
  if(state.mode==="day")return date===state.day;
  if(state.mode==="month")return date.slice(0,7)===state.month;
  return date.slice(0,4)===state.year;
}

function ledgerFilteredRecords(records,state=ledgerFilterState()){
  const category=state.category.toLowerCase();
  return sortLedgerRecords(normalizeLedgerRecords(records).filter(record=>{
    if(!ledgerMatchesView(record,state))return false;
    if(state.type==="expense"&&record.type!=="expense")return false;
    if(state.type==="income"&&record.type!=="income")return false;
    if(category&&!ledgerCategoryLabel(record).toLowerCase().includes(category))return false;
    return true;
  }));
}

function ledgerGroupByCategory(records,type){
  const totals=new Map();
  normalizeLedgerRecords(records).forEach(record=>{
    if(record.type!==type)return;
    const key=ledgerCategoryLabel(record);
    totals.set(key,(totals.get(key)||0)+(Number(record.amount)||0));
  });
  return [...totals.entries()].map(([label,amount])=>({label,amount})).sort((a,b)=>b.amount-a.amount||a.label.localeCompare(b.label,"zh-Hans-CN"));
}

function ledgerGroupByAccount(records){
  const totals=new Map();
  normalizeLedgerRecords(records).forEach(record=>{
    const key=ledgerAccountLabel(record);
    const row=totals.get(key)||{label:key,income:0,expense:0};
    const amount=Number(record.amount)||0;
    if(record.type==="income")row.income+=amount;
    else row.expense+=amount;
    totals.set(key,row);
  });
  return [...totals.values()].map(row=>({...row,balance:row.income-row.expense,total:row.income+row.expense})).sort((a,b)=>b.total-a.total||a.label.localeCompare(b.label,"zh-Hans-CN"));
}

function renderLedgerCategoryRows(rows,emptyText){
  if(!rows.length)return `<div class="ledger-empty compact">${ledgerSafe(emptyText)}</div>`;
  return rows.map(row=>`<div class="ledger-summary-row"><span>${ledgerSafe(row.label)}</span><strong>${ledgerMoney(row.amount)}</strong></div>`).join("");
}

function renderLedgerAccountRows(rows){
  if(!rows.length)return '<div class="ledger-empty compact">还没有账户记录</div>';
  return rows.map(row=>`<div class="ledger-summary-row ledger-account-row"><span>${ledgerSafe(row.label)}<small>支出 ${ledgerMoney(row.expense)} / 收入 ${ledgerMoney(row.income)}</small></span><strong>${ledgerMoney(row.balance)}</strong></div>`).join("");
}

function renderLedgerRecords(records){
  if(!records.length)return '<div class="ledger-empty">当前筛选下还没有收支记录。</div>';
  const visible=records.slice(0,LEDGER_LIST_LIMIT);
  return visible.map(record=>{
    const typeLabel=record.type==="income"?"收入":"支出";
    const sign=record.type==="income"?"+":"-";
    const account=ledgerText(record.account,"未填写");
    const payment=ledgerText(record.paymentMethod,"未填写");
    const note=ledgerText(record.note,"");
    return `<article class="ledger-record-card" data-ledger-record-id="${ledgerSafe(record.id)}">
      <div class="ledger-record-main">
        <div class="ledger-record-title">
          <span class="ledger-type-chip ${record.type}">${typeLabel}</span>
          <strong>${ledgerSafe(ledgerCategoryLabel(record))}</strong>
        </div>
        <div class="ledger-record-meta">
          <span>${ledgerSafe(record.date||"未填写日期")}</span>
          <span>账户 / 钱包：${ledgerSafe(account)}</span>
          <span>支付方式：${ledgerSafe(payment)}</span>
        </div>
        ${note?`<p>${ledgerSafe(note)}</p>`:""}
      </div>
      <div class="ledger-record-side">
        <strong class="ledger-amount ${record.type}">${sign}${ledgerMoney(record.amount)}</strong>
        <div class="ledger-record-actions">
          <button class="light small" type="button" data-ledger-action="edit" data-ledger-id="${ledgerSafe(record.id)}">编辑</button>
          <button class="danger small" type="button" data-ledger-action="delete" data-ledger-id="${ledgerSafe(record.id)}">删除</button>
        </div>
      </div>
    </article>`;
  }).join("");
}

function previewLedgerImport(records){
  const normalized=normalizeLedgerRecords(records);
  const range=ledgerDateRange(normalized);
  const totals=ledgerTotals(normalized);
  return {
    count:normalized.length,
    range,
    income:totals.income,
    expense:totals.expense,
    text:[
      `记录数量：${normalized.length}`,
      `日期范围：${range.label}`,
      `总收入：${totals.income.toFixed(2)}`,
      `总支出：${totals.expense.toFixed(2)}`,
      "导入方式：替换当前账本"
    ].join("\n")
  };
}

function ledgerHasMainBackupFields(obj){
  if(!obj||typeof obj!=="object"||Array.isArray(obj))return false;
  return ["rooms","messages","members","frontingLogs","tasks","careLogs","polls","handoffNotes"].some(key=>Array.isArray(obj[key]));
}

function readLedgerJsonFile(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result||""));
    reader.onerror=()=>reject(new Error("file_read_failed"));
    reader.readAsText(file);
  });
}

function parseLedgerImportPayload(payload){
  if(ledgerHasMainBackupFields(payload)){
    throw new Error("main_backup_for_ledger");
  }
  if(payload?.kind==="ledger-backup"&&Array.isArray(payload.records)){
    return payload.records;
  }
  if(Array.isArray(payload?.ledgerRecords)){
    return payload.ledgerRecords;
  }
  throw new Error("invalid_ledger_backup");
}

function exportLedgerJson(){
  const backup=buildLedgerBackup(ledgerRecords||[]);
  downloadLedgerFile(`moon-ledger-backup-${ledgerFilenameStamp()}.json`,"application/json",JSON.stringify(backup,null,2));
}

function exportLedgerCsv(){
  const records=normalizeLedgerRecords(ledgerRecords||[]);
  const header=["date","type","amount","category","account","paymentMethod","note","createdAt","updatedAt"];
  const rows=records.map(record=>header.map(key=>ledgerCsvCell(record[key])).join(","));
  downloadLedgerFile(`moon-ledger-${ledgerFilenameStamp()}.csv`,"text/csv;charset=utf-8",[header.join(","),...rows].join("\n"));
}

async function importLedgerJsonFile(file){
  if(!file)return false;
  try{
    const parsed=JSON.parse(await readLedgerJsonFile(file));
    const records=parseLedgerImportPayload(parsed);
    const normalizedRecords=normalizeLedgerRecords(records);
    const preview=previewLedgerImport(normalizedRecords);
    const ok=confirm(`确认用此账本备份替换当前账本吗？这不会影响记录界面的任何数据。\n\n${preview.text}`);
    if(!ok)return false;
    if(!(await saveLedger(normalizedRecords)))return false;
    if(typeof resetLedgerForm==="function")resetLedgerForm();
    renderLedger();
    alert("账本备份已导入。");
    return true;
  }catch(err){
    console.error("importLedgerJsonFile failed",err);
    if(err?.message==="main_backup_for_ledger"){
      alert("这看起来是主记录备份。请使用主记录导入功能；账本导入不会读取其中的其他数据。");
    }else{
      alert("导入失败：请选择有效的账本备份 JSON。");
    }
    return false;
  }
}

function renderLedger(){
  setLedgerInitialInputValues(false);
  syncLedgerFilterControls();
  syncLedgerCategoryOptions();
  const state=ledgerFilterState();
  const records=ledgerFilteredRecords(ledgerRecords||[],state);
  const totals=ledgerTotals(records);
  const title=ledgerViewTitle(state);
  ledgerSetText("ledgerHeaderSubtitle",title);
  ledgerSetText("ledgerSummaryTitle",title);
  ledgerSetText("ledgerExpenseLabel",ledgerExpenseTitle(state));
  ledgerSetText("ledgerIncome",ledgerMoney(totals.income));
  ledgerSetText("ledgerExpense",ledgerMoney(totals.expense));
  ledgerSetText("ledgerBalance",ledgerMoney(totals.income-totals.expense));
  ledgerSetText("ledgerRecordCount",records.length);
  const expenseBox=document.getElementById("ledgerExpenseCategorySummary");
  const incomeBox=document.getElementById("ledgerIncomeCategorySummary");
  const accountBox=document.getElementById("ledgerAccountSummary");
  const list=document.getElementById("ledgerList");
  const note=document.getElementById("ledgerListNote");
  if(expenseBox)expenseBox.innerHTML=renderLedgerCategoryRows(ledgerGroupByCategory(records,"expense"),"当前筛选下没有支出记录");
  if(incomeBox)incomeBox.innerHTML=renderLedgerCategoryRows(ledgerGroupByCategory(records,"income"),"当前筛选下没有收入记录");
  if(accountBox)accountBox.innerHTML=renderLedgerAccountRows(ledgerGroupByAccount(records));
  if(note)note.textContent=records.length>LEDGER_LIST_LIMIT?"记录较多，仅显示最近 200 条。":"按日期倒序排列。";
  if(list)list.innerHTML=renderLedgerRecords(records);
}

window.ledgerToday=ledgerToday;
window.ledgerMonth=ledgerMonth;
window.ledgerYear=ledgerYear;
window.ledgerDateRange=ledgerDateRange;
window.ledgerTotals=ledgerTotals;
window.ledgerFilteredRecords=ledgerFilteredRecords;
window.ledgerGroupByCategory=ledgerGroupByCategory;
window.previewLedgerImport=previewLedgerImport;
window.exportLedgerJson=exportLedgerJson;
window.exportLedgerCsv=exportLedgerCsv;
window.importLedgerJsonFile=importLedgerJsonFile;
window.setLedgerInitialInputValues=setLedgerInitialInputValues;
window.syncLedgerCategoryOptions=syncLedgerCategoryOptions;
window.syncLedgerFilterControls=syncLedgerFilterControls;
window.resetLedgerFilters=resetLedgerFilters;
window.resetLedgerForm=resetLedgerForm;
window.populateLedgerForm=populateLedgerForm;
window.renderLedger=renderLedger;
