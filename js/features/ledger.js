function ledgerFilenameStamp(date=new Date()){
  const pad=n=>String(n).padStart(2,"0");
  return `${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

async function downloadLedgerFile(filename,type,text){
  if(window.downloadTextFile)return window.downloadTextFile(filename,type,text);
  const blob=new Blob([text],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=filename;
  a.click();
  URL.revokeObjectURL(url);
  return {ok:true,filename};
}

function ledgerCsvCell(value){
  return `"${String(value==null?"":value).replace(/"/g,'""')}"`;
}

const LEDGER_EXPENSE_CATEGORIES=["餐饮","交通","购物","住房","医疗","学习","娱乐","通讯","人情","其他"];
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

function ledgerAmountToCents(value){
  const amount=Number(value);
  return Number.isFinite(amount)?Math.round(amount*100):0;
}

function ledgerCentsToAmount(cents){
  const value=Number(cents);
  return (Number.isFinite(value)?value:0)/100;
}

function ledgerMoneyFromCents(cents){
  return ledgerCentsToAmount(cents).toFixed(2);
}

function ledgerMoney(value){
  return ledgerMoneyFromCents(ledgerAmountToCents(value));
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

let ledgerInlineMessageTimer=null;
function ledgerShowMessage(id,message,type="success",timeout=2600){
  const el=document.getElementById(id);
  if(!el)return;
  el.textContent=String(message||"");
  el.className=`ledger-inline-message ${type}`;
  el.hidden=!message;
  if(id==="ledgerInlineMessage"){
    if(ledgerInlineMessageTimer)clearTimeout(ledgerInlineMessageTimer);
    if(message&&timeout>0){
      ledgerInlineMessageTimer=setTimeout(()=>{el.hidden=true;},timeout);
    }
  }
}

function ledgerClearMessage(id){
  const el=document.getElementById(id);
  if(el){el.textContent=""; el.hidden=true;}
}

function ledgerClampPercent(value){
  const number=Number(value);
  if(!Number.isFinite(number)||number<0)return 0;
  if(number>100)return 100;
  return number;
}

function ledgerCurrentSettings(){
  if(typeof normalizeLedgerSettings==="function")return normalizeLedgerSettings(typeof ledgerSettings!=="undefined"?ledgerSettings:null);
  return {categories:[],budgets:[],defaultViewMode:"month"};
}

function ledgerCategoryColor(type,name){
  const category=ledgerCurrentSettings().categories.find(item=>item.type===type&&item.name===name);
  return category?.color||"";
}

function ledgerColor(value,type="expense"){
  if(typeof normalizeLedgerColor==="function")return normalizeLedgerColor(value,type);
  const color=String(value||"").trim();
  if(/^#[0-9a-fA-F]{6}$/.test(color))return color;
  return type==="income"?"#16a34a":"#ef4444";
}

function ledgerCategories(type,{includeArchived=false}={}){
  return ledgerCurrentSettings().categories.filter(category=>(!type||category.type===type)&&(includeArchived||!category.archived));
}

function ledgerCategoryNameExists(name,type,excludeId=""){
  const target=ledgerText(name).toLowerCase();
  if(!target)return false;
  return ledgerCurrentSettings().categories.some(category=>category.id!==excludeId&&category.type===type&&category.name.trim().toLowerCase()===target);
}

function ledgerRecordsUseCategory(name){
  const target=ledgerText(name);
  if(!target)return false;
  return normalizeLedgerRecords(ledgerRecords||[]).some(record=>ledgerCategoryLabel(record)===target);
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
  const hint=document.getElementById("ledgerCategoryHint");
  const typeLabel=type==="income"?"收入":"支出";
  const settingsCategories=ledgerCategories(type,{includeArchived:false}).map(category=>category.name);
  const values=[...new Set(settingsCategories)].filter(Boolean).sort((a,b)=>a.localeCompare(b,"zh-Hans-CN"));
  if(datalist)datalist.innerHTML=values.map(value=>`<option value="${ledgerSafe(value)}"></option>`).join("");
  if(hint){
    hint.textContent=settingsCategories.length
      ?`${typeLabel}常用分类 ${settingsCategories.length} 个，也可以直接输入新分类。`
      :`当前没有可用的${typeLabel}常用分类，也可以直接输入分类名称。`;
  }
}

function syncLedgerFilterCategoryOptions(){
  const datalist=document.getElementById("ledgerFilterCategoryOptions");
  if(!datalist)return;
  const type=document.getElementById("ledgerTypeFilter")?.value||"all";
  const settingsCategories=ledgerCurrentSettings().categories
    .filter(category=>type==="all"||category.type===type)
    .map(category=>category.name);
  const recordCategories=normalizeLedgerRecords(ledgerRecords||[])
    .filter(record=>type==="all"||record.type===type)
    .map(record=>ledgerCategoryLabel(record));
  const values=[...new Set([...settingsCategories,...recordCategories])].filter(Boolean).sort((a,b)=>a.localeCompare(b,"zh-Hans-CN"));
  datalist.innerHTML=values.map(value=>`<option value="${ledgerSafe(value)}"></option>`).join("");
}

function syncLedgerBudgetCategoryOptions(){
  const select=document.getElementById("ledgerBudgetCategory");
  if(!select)return;
  const categories=ledgerCategories("expense",{includeArchived:true});
  select.innerHTML=categories.length
    ?categories.map(category=>`<option value="${ledgerSafe(category.id)}">${ledgerSafe(category.name)}${category.archived?"（已归档）":""}</option>`).join("")
    :'<option value="">暂无支出分类</option>';
}

function applyLedgerDefaultViewMode(){
  const mode=document.getElementById("ledgerViewMode");
  if(!mode)return;
  const preferred=ledgerCurrentSettings().defaultViewMode||"month";
  if(["day","month","year","all"].includes(preferred))mode.value=preferred;
}

function setLedgerInitialInputValues(force=false){
  const date=document.getElementById("ledgerDate");
  const viewDate=document.getElementById("ledgerViewDate");
  const viewMonth=document.getElementById("ledgerViewMonth");
  const viewYear=document.getElementById("ledgerViewYear");
  const budgetMonth=document.getElementById("ledgerBudgetMonth");
  if(date&&(force||!date.value))date.value=ledgerToday();
  if(viewDate&&(force||!viewDate.value))viewDate.value=ledgerToday();
  if(viewMonth&&(force||!viewMonth.value))viewMonth.value=ledgerMonth();
  if(viewYear&&(force||!viewYear.value))viewYear.value=ledgerYear();
  if(budgetMonth&&(force||!budgetMonth.value))budgetMonth.value=ledgerMonth();
}

function syncLedgerFilterControls(){
  const mode=document.getElementById("ledgerViewMode")?.value||ledgerCurrentSettings().defaultViewMode||"month";
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
  if(mode)mode.value=ledgerCurrentSettings().defaultViewMode||"month";
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
  ledgerShowMessage("ledgerInlineMessage","正在编辑这条记录。保存后会更新原记录。","info",0);
  document.getElementById("ledgerForm")?.scrollIntoView({block:"start",behavior:"smooth"});
}

function resetLedgerCategoryForm(){
  try{if(typeof editingLedgerCategoryId!=="undefined")editingLedgerCategoryId=null;}catch{}
  const name=document.getElementById("ledgerCategoryName");
  const type=document.getElementById("ledgerCategoryType");
  const color=document.getElementById("ledgerCategoryColor");
  const submit=document.getElementById("addLedgerCategoryBtn");
  const cancel=document.getElementById("cancelLedgerCategoryEditBtn");
  if(name)name.value="";
  if(type)type.value="expense";
  if(color)color.value="#ef4444";
  if(submit)submit.textContent="添加分类";
  if(cancel)cancel.hidden=true;
  ledgerClearMessage("ledgerCategoryMessage");
}

function populateLedgerCategoryForm(categoryId){
  const category=ledgerCurrentSettings().categories.find(item=>item.id===categoryId);
  if(!category)return false;
  const name=document.getElementById("ledgerCategoryName");
  const type=document.getElementById("ledgerCategoryType");
  const color=document.getElementById("ledgerCategoryColor");
  const submit=document.getElementById("addLedgerCategoryBtn");
  const cancel=document.getElementById("cancelLedgerCategoryEditBtn");
  if(name)name.value=category.name;
  if(type)type.value=category.type;
  if(color)color.value=ledgerColor(category.color,category.type);
  if(submit)submit.textContent="保存分类";
  if(cancel)cancel.hidden=false;
  ledgerShowMessage("ledgerCategoryMessage","正在编辑分类。改名不会自动修改已有记录。","info",0);
  document.getElementById("ledgerCategoryName")?.focus();
  return true;
}

async function saveLedgerCategoryFromForm(categoryId=""){
  const name=ledgerText(document.getElementById("ledgerCategoryName")?.value,"");
  const type=document.getElementById("ledgerCategoryType")?.value==="income"?"income":"expense";
  const color=ledgerColor(document.getElementById("ledgerCategoryColor")?.value,type);
  if(!name){alert("请填写分类名称。"); return false;}
  if(ledgerCategoryNameExists(name,type,categoryId)){alert("同类型下已经有这个分类。"); return false;}
  const settings=ledgerCurrentSettings();
  const savedAt=now();
  if(categoryId){
    const index=settings.categories.findIndex(category=>category.id===categoryId);
    if(index<0){alert("没有找到要编辑的分类。"); return false;}
    settings.categories[index]=normalizeLedgerCategory({...settings.categories[index],name,type,color,updatedAt:savedAt});
  }else{
    settings.categories.push(normalizeLedgerCategory({id:makeId(),name,type,color,archived:false,createdAt:savedAt,updatedAt:savedAt}));
  }
  if(!(await saveLedgerSettings(settings)))return false;
  resetLedgerCategoryForm();
  renderLedger();
  return true;
}

async function setLedgerCategoryArchived(categoryId,archived){
  const settings=ledgerCurrentSettings();
  const index=settings.categories.findIndex(category=>category.id===categoryId);
  if(index<0)return false;
  settings.categories[index]=normalizeLedgerCategory({...settings.categories[index],archived:!!archived,updatedAt:now()});
  if(!(await saveLedgerSettings(settings)))return false;
  renderLedger();
  return true;
}

function renderLedgerCategoryList(){
  const box=document.getElementById("ledgerCategoryList");
  if(!box)return;
  const categories=[...ledgerCurrentSettings().categories].sort((a,b)=>{
    if(a.archived!==b.archived)return a.archived?1:-1;
    return a.name.localeCompare(b.name,"zh-Hans-CN");
  });
  if(!categories.length){
    box.innerHTML='<div class="ledger-empty compact">还没有分类。</div>';
    return;
  }
  const renderItem=category=>{
    const archived=category.archived;
    const used=ledgerRecordsUseCategory(category.name);
    return `<div class="ledger-category-item ${archived?"archived":""}" data-ledger-category-id="${ledgerSafe(category.id)}">
      <div class="ledger-category-main">
        <span class="ledger-category-color" style="background:${ledgerSafe(ledgerColor(category.color,category.type))}"></span>
        <div>
          <strong>${ledgerSafe(category.name)}</strong>
          <small>${archived?"已归档":"常用分类"}${used?" · 已有记录":""}</small>
        </div>
      </div>
      <div class="ledger-record-actions">
        <button class="light small" type="button" data-ledger-category-action="edit" data-ledger-category-id="${ledgerSafe(category.id)}">编辑</button>
        ${archived
          ?`<button class="light small" type="button" data-ledger-category-action="restore" data-ledger-category-id="${ledgerSafe(category.id)}">恢复</button>`
          :`<button class="light small" type="button" data-ledger-category-action="archive" data-ledger-category-id="${ledgerSafe(category.id)}">归档</button>`}
      </div>
    </div>`;
  };
  box.innerHTML=[
    ["expense","支出分类"],
    ["income","收入分类"]
  ].map(([type,label])=>{
    const items=categories.filter(category=>category.type===type);
    return `<section class="ledger-category-group">
      <div class="ledger-category-group-head"><strong>${label}</strong><span>${items.length} 个</span></div>
      ${items.length?items.map(renderItem).join(""):'<div class="ledger-empty compact">还没有这类分类。</div>'}
    </section>`;
  }).join("");
}

function ledgerBudgetMonthValue(){
  const month=String(document.getElementById("ledgerBudgetMonth")?.value||ledgerMonth()).slice(0,7);
  return /^\d{4}-\d{2}$/.test(month)?month:ledgerMonth();
}

function ledgerBudgetFor(month,categoryName=""){
  const key=ledgerText(categoryName,"");
  return ledgerCurrentSettings().budgets.find(budget=>budget.month===month&&ledgerText(budget.categoryName,"")===key)||null;
}

function ledgerBudgetsForMonth(month){
  return ledgerCurrentSettings().budgets
    .filter(budget=>budget.month===month)
    .sort((a,b)=>{
      if(!a.categoryName&&b.categoryName)return -1;
      if(a.categoryName&&!b.categoryName)return 1;
      return ledgerText(a.categoryName,"本月总预算").localeCompare(ledgerText(b.categoryName,"本月总预算"),"zh-Hans-CN");
    });
}

function ledgerMonthExpenseRecords(month){
  return normalizeLedgerRecords(ledgerRecords||[]).filter(record=>record.type==="expense"&&String(record.date||"").slice(0,7)===month);
}

function ledgerMonthExpenseByCategory(month){
  const totals=new Map();
  ledgerMonthExpenseRecords(month).forEach(record=>{
    const category=ledgerCategoryLabel(record);
    totals.set(category,(totals.get(category)||0)+ledgerAmountToCents(record.amount));
  });
  return totals;
}

function ledgerBudgetProgressPercent(spent,budget){
  const budgetCents=ledgerAmountToCents(budget);
  const spentCents=ledgerAmountToCents(spent);
  if(budgetCents<=0)return spentCents>0?100:0;
  return Math.min(100,Math.max(0,(spentCents/budgetCents)*100));
}

function renderLedgerProgress(spent,budget,color){
  const percent=ledgerClampPercent(ledgerBudgetProgressPercent(spent,budget));
  return `<div class="ledger-progress" aria-hidden="true"><span class="ledger-progress-bar" style="width:${percent.toFixed(2)}%;background:${ledgerSafe(color)}"></span></div>`;
}

function ledgerBudgetStatusText(spent,budget){
  const remainingCents=ledgerAmountToCents(budget)-ledgerAmountToCents(spent);
  if(remainingCents<0)return `已超出 ${ledgerMoneyFromCents(Math.abs(remainingCents))} 元`;
  return `剩余额度 ${ledgerMoneyFromCents(remainingCents)} 元`;
}

async function upsertLedgerBudget(month,categoryName,amount,categoryId=""){
  const settings=ledgerCurrentSettings();
  const name=ledgerText(categoryName,"");
  const savedAt=now();
  const index=settings.budgets.findIndex(budget=>budget.month===month&&ledgerText(budget.categoryName,"")===name);
  const next=normalizeLedgerBudget({
    ...(index>=0?settings.budgets[index]:{}),
    id:index>=0?settings.budgets[index].id:makeId(),
    scope:"monthly",
    month,
    categoryId:name?categoryId:"",
    categoryName:name,
    amount,
    createdAt:index>=0?settings.budgets[index].createdAt:savedAt,
    updatedAt:savedAt
  });
  if(index>=0)settings.budgets[index]=next;
  else settings.budgets.push(next);
  if(!(await saveLedgerSettings(settings)))return false;
  renderLedger();
  return true;
}

async function saveLedgerMonthlyBudgetFromForm(){
  const month=ledgerBudgetMonthValue();
  const raw=String(document.getElementById("ledgerMonthlyBudgetAmount")?.value||"").trim();
  const amount=Number(raw);
  if(raw===""||!Number.isFinite(amount)||amount<0){alert("请填写有效预算金额。"); return false;}
  return upsertLedgerBudget(month,"",amount,"");
}

async function saveLedgerCategoryBudgetFromForm(){
  const month=ledgerBudgetMonthValue();
  const select=document.getElementById("ledgerBudgetCategory");
  const categoryId=select?.value||"";
  const category=ledgerCurrentSettings().categories.find(item=>item.id===categoryId);
  if(!category){alert("请选择支出分类。"); return false;}
  const raw=String(document.getElementById("ledgerCategoryBudgetAmount")?.value||"").trim();
  const amount=Number(raw);
  if(raw===""||!Number.isFinite(amount)||amount<0){alert("请填写有效预算金额。"); return false;}
  return upsertLedgerBudget(month,category.name,amount,category.id);
}

async function deleteLedgerBudget(budgetId){
  const settings=ledgerCurrentSettings();
  const next=settings.budgets.filter(budget=>budget.id!==budgetId);
  if(next.length===settings.budgets.length)return false;
  settings.budgets=next;
  if(!(await saveLedgerSettings(settings)))return false;
  renderLedger();
  return true;
}

function renderLedgerBudgetList(){
  const box=document.getElementById("ledgerBudgetList");
  if(!box)return;
  const month=ledgerBudgetMonthValue();
  const budgets=ledgerBudgetsForMonth(month);
  if(!budgets.length){
    box.innerHTML='<div class="ledger-empty compact">还没有设置这个月的预算。</div>';
    return;
  }
  box.innerHTML=budgets.map(budget=>{
    const isTotal=!ledgerText(budget.categoryName,"");
    const label=isTotal?"本月总预算":budget.categoryName;
    return `<div class="ledger-budget-item" data-ledger-budget-id="${ledgerSafe(budget.id)}">
      <div>
        <strong>${ledgerSafe(label)}</strong>
        <small>${ledgerSafe(budget.month)} · ${isTotal?"总预算":"分类预算"}</small>
      </div>
      <div class="ledger-budget-side">
        <strong>${ledgerMoney(budget.amount)}</strong>
        <button class="danger small" type="button" data-ledger-budget-delete="${ledgerSafe(budget.id)}">删除</button>
      </div>
    </div>`;
  }).join("");
}

function renderLedgerBudgetControls(){
  const month=ledgerBudgetMonthValue();
  const monthInput=document.getElementById("ledgerBudgetMonth");
  if(monthInput&&!monthInput.value)monthInput.value=month;
  syncLedgerBudgetCategoryOptions();
  const totalBudget=ledgerBudgetFor(month,"");
  const totalInput=document.getElementById("ledgerMonthlyBudgetAmount");
  if(totalInput&&document.activeElement!==totalInput)totalInput.value=totalBudget?String(totalBudget.amount):"";
  const categoryInput=document.getElementById("ledgerCategoryBudgetAmount");
  if(categoryInput&&document.activeElement!==categoryInput)categoryInput.value="";
  renderLedgerBudgetList();
}

function renderLedgerBudgetUsage(state=ledgerFilterState()){
  const box=document.getElementById("ledgerBudgetUsage");
  if(!box)return;
  if(state.mode!=="month"){
    box.innerHTML='<div class="ledger-empty compact">切换到按月视图查看预算使用情况。</div>';
    return;
  }
  const month=state.month;
  const budgets=ledgerBudgetsForMonth(month);
  if(!budgets.length){
    box.innerHTML='<div class="ledger-empty compact">还没有设置本月预算。</div>';
    return;
  }
  const expenseTotal=ledgerTotals(ledgerMonthExpenseRecords(month)).expense;
  const byCategory=ledgerMonthExpenseByCategory(month);
  const totalBudget=budgets.find(budget=>!ledgerText(budget.categoryName,""));
  const categoryBudgets=budgets.filter(budget=>ledgerText(budget.categoryName,""));
  const totalPercent=totalBudget?Math.round(ledgerBudgetProgressPercent(expenseTotal,totalBudget.amount)):0;
  const totalHtml=totalBudget?`<div class="ledger-budget-item featured">
    <div>
      <strong>${ledgerSafe(month)} 总预算</strong>
      <small>已用 ${ledgerMoney(expenseTotal)} / 预算 ${ledgerMoney(totalBudget.amount)} · ${ledgerBudgetStatusText(expenseTotal,totalBudget.amount)}</small>
      ${renderLedgerProgress(expenseTotal,totalBudget.amount,"#ef4444")}
    </div>
    <strong class="ledger-budget-percent">${totalPercent}%</strong>
  </div>`:"";
  const categoryHtml=categoryBudgets.map(budget=>{
    const spent=ledgerCentsToAmount(byCategory.get(budget.categoryName)||0);
    const color=ledgerCategoryColor("expense",budget.categoryName)||"#ef4444";
    const percent=Math.round(ledgerBudgetProgressPercent(spent,budget.amount));
    return `<div class="ledger-budget-item">
      <div>
        <strong>${ledgerSafe(budget.categoryName)}</strong>
        <small>已用 ${ledgerMoney(spent)} / 预算 ${ledgerMoney(budget.amount)} · ${ledgerBudgetStatusText(spent,budget.amount)}</small>
        ${renderLedgerProgress(spent,budget.amount,color)}
      </div>
      <strong class="ledger-budget-percent">${percent}%</strong>
    </div>`;
  }).join("");
  const categoryEmpty=totalBudget&&!categoryBudgets.length?'<div class="ledger-empty compact">还没有设置分类预算。</div>':"";
  box.innerHTML=totalHtml+categoryHtml+categoryEmpty||'<div class="ledger-empty compact">还没有设置本月预算。</div>';
}

function ledgerDateRange(records){
  const dates=normalizeLedgerRecords(records).map(r=>r.date).filter(Boolean).sort();
  if(!dates.length)return {start:"",end:"",label:"无日期"};
  return {start:dates[0],end:dates[dates.length-1],label:dates[0]===dates[dates.length-1]?dates[0]:`${dates[0]} 至 ${dates[dates.length-1]}`};
}

function ledgerTotals(records){
  const cents=normalizeLedgerRecords(records).reduce((totals,record)=>{
    const amountCents=ledgerAmountToCents(record.amount);
    if(record.type==="income")totals.incomeCents+=amountCents;
    else totals.expenseCents+=amountCents;
    return totals;
  },{incomeCents:0,expenseCents:0});
  return {income:ledgerCentsToAmount(cents.incomeCents),expense:ledgerCentsToAmount(cents.expenseCents),incomeCents:cents.incomeCents,expenseCents:cents.expenseCents};
}

function ledgerFilterState(){
  const defaultMode=ledgerCurrentSettings().defaultViewMode||"month";
  const mode=document.getElementById("ledgerViewMode")?.value||defaultMode;
  return {
    mode:["day","month","year","all"].includes(mode)?mode:defaultMode,
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

function ledgerFilterTypeLabel(type){
  if(type==="expense")return "只看支出";
  if(type==="income")return "只看收入";
  return "全部类型";
}

function renderLedgerFilterSummary(state,visibleCount,totalCount){
  const box=document.getElementById("ledgerFilterSummary");
  if(!box)return;
  const category=state.category?`分类包含“${state.category}”`:"全部分类";
  const status=visibleCount===0&&totalCount>0?"当前筛选没有匹配记录":`${visibleCount} 条记录`;
  box.textContent=`当前筛选：${ledgerViewTitle(state)} · ${ledgerFilterTypeLabel(state.type)} · ${category} · ${status}`;
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
    totals.set(key,(totals.get(key)||0)+ledgerAmountToCents(record.amount));
  });
  return [...totals.entries()].map(([label,cents])=>({label,cents,amount:ledgerCentsToAmount(cents)})).sort((a,b)=>b.cents-a.cents||a.label.localeCompare(b.label,"zh-Hans-CN"));
}

function ledgerGroupByAccount(records){
  const totals=new Map();
  normalizeLedgerRecords(records).forEach(record=>{
    const key=ledgerAccountLabel(record);
    const row=totals.get(key)||{label:key,incomeCents:0,expenseCents:0};
    const amountCents=ledgerAmountToCents(record.amount);
    if(record.type==="income")row.incomeCents+=amountCents;
    else row.expenseCents+=amountCents;
    totals.set(key,row);
  });
  return [...totals.values()].map(row=>({
    ...row,
    income:ledgerCentsToAmount(row.incomeCents),
    expense:ledgerCentsToAmount(row.expenseCents),
    balance:ledgerCentsToAmount(row.incomeCents-row.expenseCents),
    total:ledgerCentsToAmount(row.incomeCents+row.expenseCents),
    totalCents:row.incomeCents+row.expenseCents
  })).sort((a,b)=>b.totalCents-a.totalCents||a.label.localeCompare(b.label,"zh-Hans-CN"));
}

function renderLedgerCategoryRows(rows,emptyText,type="expense"){
  if(!rows.length)return `<div class="ledger-empty compact">${ledgerSafe(emptyText)}</div>`;
  const maxCents=Math.max(...rows.map(row=>Number(row.cents)||ledgerAmountToCents(row.amount)),0);
  return `<div class="ledger-chart-list">${rows.map(row=>{
    const cents=Number(row.cents)||ledgerAmountToCents(row.amount);
    const percent=maxCents>0?ledgerClampPercent(Math.max(4,(cents/maxCents)*100)):0;
    const color=ledgerCategoryColor(type,row.label)||ledgerColor("",type);
    return `<div class="ledger-chart-row">
      <div class="ledger-chart-head">
        <span><i class="ledger-category-color" style="background:${ledgerSafe(color)}"></i>${ledgerSafe(row.label)}</span>
        <strong>${ledgerMoneyFromCents(cents)}</strong>
      </div>
      <div class="ledger-chart-track" aria-hidden="true"><span class="ledger-chart-bar" style="width:${percent.toFixed(2)}%;background:${ledgerSafe(color)}"></span></div>
    </div>`;
  }).join("")}</div>`;
}

function renderLedgerAccountRows(rows){
  if(!rows.length)return '<div class="ledger-empty compact">还没有账户记录</div>';
  return rows.map(row=>`<div class="ledger-summary-row ledger-account-row"><span>${ledgerSafe(row.label)}<small>支出 ${ledgerMoney(row.expense)} / 收入 ${ledgerMoney(row.income)}</small></span><strong>${ledgerMoney(row.balance)}</strong></div>`).join("");
}

function renderLedgerRecords(records,totalCount=normalizeLedgerRecords(ledgerRecords||[]).length){
  if(!records.length){
    return totalCount
      ?'<div class="ledger-empty">当前筛选没有匹配记录。</div>'
      :'<div class="ledger-empty">还没有记录，先添加一笔收支。</div>';
  }
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

function previewLedgerImport(records,settings=ledgerCurrentSettings(),hasSettings=false){
  const normalized=normalizeLedgerRecords(records);
  const normalizedSettings=normalizeLedgerSettings(settings);
  const range=ledgerDateRange(normalized);
  const totals=ledgerTotals(normalized);
  const importMode=hasSettings?"导入方式：替换当前账本记录和账本设置":"导入方式：只替换账本记录，保留当前账本设置";
  return {
    count:normalized.length,
    range,
    income:totals.income,
    expense:totals.expense,
    categories:normalizedSettings.categories.length,
    budgets:normalizedSettings.budgets.length,
    text:[
      `记录数量：${normalized.length}`,
      `日期范围：${range.label}`,
      `总收入：${ledgerMoney(totals.income)}`,
      `总支出：${ledgerMoney(totals.expense)}`,
      `分类数量：${normalizedSettings.categories.length}`,
      `预算数量：${normalizedSettings.budgets.length}`,
      importMode
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
    const version=Number(payload.version)||1;
    const hasSettings=version>=2;
    if(hasSettings)validateLedgerBackupSettingsPayload(payload.settings);
    return {
      version,
      records:payload.records,
      settings:hasSettings?payload.settings:ledgerCurrentSettings(),
      hasSettings
    };
  }
  if(Array.isArray(payload?.ledgerRecords)){
    return {version:1,records:payload.ledgerRecords,settings:ledgerCurrentSettings(),hasSettings:false};
  }
  throw new Error("invalid_ledger_backup");
}

async function rollbackLedgerImport(previousRecords,previousSettings,restoreSettings=true){
  ledgerRecords=normalizeLedgerRecords(previousRecords);
  ledgerSettings=normalizeLedgerSettings(previousSettings);
  try{await storage.saveLedger(ledgerRecords);}
  catch(err){console.warn("rollbackLedgerImport: records restore failed",err);}
  if(restoreSettings){
    try{await storage.saveLedgerSettings(ledgerSettings);}
    catch(err){console.warn("rollbackLedgerImport: settings restore failed",err);}
  }
  renderLedger();
}

async function saveLedgerRecordsForImport(records){
  const normalized=normalizeLedgerRecords(records);
  try{
    await storage.saveLedger(normalized);
    ledgerRecords=normalized;
    return true;
  }catch(err){
    console.warn("saveLedgerRecordsForImport failed",err);
    return false;
  }
}

async function saveLedgerSettingsForImport(settings){
  const normalized=normalizeLedgerSettings(settings);
  try{
    await storage.saveLedgerSettings(normalized);
    ledgerSettings=normalized;
    return true;
  }catch(err){
    console.warn("saveLedgerSettingsForImport failed",err);
    return false;
  }
}

async function exportLedgerJson(){
  const backup=buildLedgerBackup(ledgerRecords||[],ledgerCurrentSettings());
  return downloadLedgerFile(`moon-ledger-backup-${ledgerFilenameStamp()}.json`,"application/json",JSON.stringify(backup,null,2));
}

async function exportLedgerCsv(){
  const records=normalizeLedgerRecords(ledgerRecords||[]);
  const header=["date","type","amount","category","account","paymentMethod","note","createdAt","updatedAt"];
  const rows=records.map(record=>header.map(key=>ledgerCsvCell(record[key])).join(","));
  return downloadLedgerFile(`moon-ledger-${ledgerFilenameStamp()}.csv`,"text/csv;charset=utf-8",[header.join(","),...rows].join("\n"));
}

async function importLedgerJsonFile(file){
  if(!file)return false;
  try{
    const parsed=JSON.parse(await readLedgerJsonFile(file));
    const payload=parseLedgerImportPayload(parsed);
    const normalizedRecords=normalizeLedgerRecords(payload.records);
    const normalizedSettings=payload.hasSettings?normalizeLedgerSettings(payload.settings):ledgerCurrentSettings();
    const preview=previewLedgerImport(normalizedRecords,normalizedSettings,payload.hasSettings);
    const ok=confirm(`确认用此账本备份替换当前账本吗？这不会影响记录界面的任何数据。\n\n${preview.text}`);
    if(!ok)return false;
    const previousRecords=normalizeLedgerRecords(ledgerRecords||[]);
    const previousSettings=ledgerCurrentSettings();
    if(payload.hasSettings){
      const savedRecords=await saveLedgerRecordsForImport(normalizedRecords);
      const savedSettings=savedRecords?await saveLedgerSettingsForImport(normalizedSettings):false;
      if(!savedRecords||!savedSettings){
        await rollbackLedgerImport(previousRecords,previousSettings,true);
        alert("导入失败，已尽量保留原账本。");
        return false;
      }
    }else if(!(await saveLedgerRecordsForImport(normalizedRecords))){
      await rollbackLedgerImport(previousRecords,previousSettings,false);
      alert("导入失败，已尽量保留原账本。");
      return false;
    }
    if(typeof resetLedgerForm==="function")resetLedgerForm();
    if(typeof resetLedgerCategoryForm==="function")resetLedgerCategoryForm();
    renderLedger();
    alert("账本备份已导入。");
    ledgerShowMessage("ledgerInlineMessage","账本备份已导入。","success");
    return true;
  }catch(err){
    console.warn("importLedgerJsonFile failed",err);
    if(err?.message==="main_backup_for_ledger"){
      alert("这看起来是主记录备份。请使用主记录导入功能；账本导入不会读取其中的其他数据。");
    }else if(err?.message==="invalid_ledger_settings"){
      alert("导入失败：账本设置格式不正确。");
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
  syncLedgerFilterCategoryOptions();
  syncLedgerBudgetCategoryOptions();
  const state=ledgerFilterState();
  const allRecords=normalizeLedgerRecords(ledgerRecords||[]);
  const records=ledgerFilteredRecords(allRecords,state);
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
  if(expenseBox)expenseBox.innerHTML=renderLedgerCategoryRows(ledgerGroupByCategory(records,"expense"),"当前筛选下没有支出记录","expense");
  if(incomeBox)incomeBox.innerHTML=renderLedgerCategoryRows(ledgerGroupByCategory(records,"income"),"当前筛选下没有收入记录","income");
  if(accountBox)accountBox.innerHTML=renderLedgerAccountRows(ledgerGroupByAccount(records));
  renderLedgerFilterSummary(state,records.length,allRecords.length);
  if(note)note.textContent=records.length>LEDGER_LIST_LIMIT?"记录较多，仅显示最近 200 条。":"按日期倒序排列。";
  if(list)list.innerHTML=renderLedgerRecords(records,allRecords.length);
  renderLedgerCategoryList();
  renderLedgerBudgetControls();
  renderLedgerBudgetUsage(state);
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
window.ledgerShowMessage=ledgerShowMessage;
window.setLedgerInitialInputValues=setLedgerInitialInputValues;
window.syncLedgerCategoryOptions=syncLedgerCategoryOptions;
window.syncLedgerFilterCategoryOptions=syncLedgerFilterCategoryOptions;
window.syncLedgerBudgetCategoryOptions=syncLedgerBudgetCategoryOptions;
window.applyLedgerDefaultViewMode=applyLedgerDefaultViewMode;
window.syncLedgerFilterControls=syncLedgerFilterControls;
window.resetLedgerFilters=resetLedgerFilters;
window.resetLedgerForm=resetLedgerForm;
window.populateLedgerForm=populateLedgerForm;
window.resetLedgerCategoryForm=resetLedgerCategoryForm;
window.populateLedgerCategoryForm=populateLedgerCategoryForm;
window.saveLedgerCategoryFromForm=saveLedgerCategoryFromForm;
window.setLedgerCategoryArchived=setLedgerCategoryArchived;
window.saveLedgerMonthlyBudgetFromForm=saveLedgerMonthlyBudgetFromForm;
window.saveLedgerCategoryBudgetFromForm=saveLedgerCategoryBudgetFromForm;
window.deleteLedgerBudget=deleteLedgerBudget;
window.renderLedger=renderLedger;
