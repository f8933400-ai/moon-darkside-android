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
    renderLedger();
    alert("账本备份已导入。");
    return true;
  }catch(err){
    console.error("importLedgerJsonFile failed",err);
    if(err?.message==="main_backup_for_ledger"){
      alert("这看起来是主记录备份。请使用主记录导入功能；账本导入不会读取其中的记录层数据。");
    }else{
      alert("导入失败：请选择有效的账本备份 JSON。");
    }
    return false;
  }
}

function renderLedger(){
  const records=normalizeLedgerRecords(ledgerRecords||[]);
  const totals=ledgerTotals(records);
  document.getElementById("ledgerIncome").textContent=totals.income.toFixed(2);
  document.getElementById("ledgerExpense").textContent=totals.expense.toFixed(2);
  document.getElementById("ledgerBalance").textContent=(totals.income-totals.expense).toFixed(2);
  document.getElementById("ledgerList").innerHTML=records.slice(-12).reverse().map(r=>`<div class="ledger-row"><div><strong>${esc(r.category||"未分类")}</strong><small>${esc(r.date||"")} ${esc(r.note||"")}</small></div><strong class="ledger-amount ${r.type}">${r.type==="income"?"+":"-"}${Number(r.amount||0).toFixed(2)}</strong></div>`).join("")||'<div class="empty">还没有记录</div>';
}

window.ledgerDateRange=ledgerDateRange;
window.ledgerTotals=ledgerTotals;
window.previewLedgerImport=previewLedgerImport;
window.exportLedgerJson=exportLedgerJson;
window.exportLedgerCsv=exportLedgerCsv;
window.importLedgerJsonFile=importLedgerJsonFile;
