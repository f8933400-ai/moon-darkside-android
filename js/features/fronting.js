    const FRONTING_UI_STATE_TYPES=["front","cofront","near","observer","blended","unknown"];
    const FRONTING_UI_MEMORY_RATINGS=["","full","partial","none","unknown"];
    function frontingStateText(value){
      return {front:term("fronting"),cofront:term("cofronting"),near:`靠近${term("fronting")}`,observer:"旁观 / 在场",blended:"混合 / 模糊",unknown:"未知 / 不确定"}[value]||term("fronting");
    }
    function frontingMemoryText(value){
      return {full:"完整",partial:"部分",none:"无",unknown:"不确定"}[value]||"未记录";
    }
    function frontingTimeMs(value){
      const t=new Date(value||"").getTime();
      return Number.isFinite(t)?t:0;
    }
    function getCurrentFrontingLog(){
      const rows=(Array.isArray(data?.frontingLogs)?data.frontingLogs:[]).filter(f=>f&&f.endAt===null);
      return rows.slice().sort((a,b)=>frontingTimeMs(b.startAt||b.createdAt)-frontingTimeMs(a.startAt||a.createdAt))[0]||null;
    }
    function currentFrontingLog(){
      return getCurrentFrontingLog();
    }
    function normalizeFrontingFormTime(value){
      const raw=String(value||"").trim();
      if(!raw)return "";
      const d=new Date(raw);
      return Number.isNaN(d.getTime())?"":d.toISOString();
    }
    function frontingIsoToLocalInput(value){
      const d=new Date(value||"");
      if(Number.isNaN(d.getTime()))return "";
      const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);
      return local.toISOString().slice(0,16);
    }
    function formatFrontingTime(iso,emptyText="时间未记录"){
      const d=new Date(iso||"");
      return Number.isNaN(d.getTime())?emptyText:d.toLocaleString();
    }
    function formatFrontingDuration(startAt,endAt){
      const start=new Date(startAt||""), end=endAt?new Date(endAt):new Date();
      if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime())||end<start)return "时长未知";
      const minutes=Math.max(0,Math.round((end-start)/60000));
      if(minutes<=1)return "1分钟内";
      const hours=Math.floor(minutes/60), rest=minutes%60;
      if(hours>=24){const days=Math.floor(hours/24), h=hours%24; return h?`${days}天${h}小时`:`${days}天`;}
      return hours>0?`${hours}小时${rest}分`:`${minutes}分钟`;
    }
    function frontingMemberName(id){
      return data.members.find(m=>m.id===id)?.name||`已移除${term("member")}`;
    }
    function frontingNames(memberIds,emptyText=`未记录${term("member")}`){
      const ids=Array.isArray(memberIds)?memberIds:[];
      if(!ids.length)return emptyText;
      return ids.map(frontingMemberName).join(" / ");
    }
    function frontingNamesWithFocus(memberIds,primaryMemberId,emptyText=`未记录${term("member")}`){
      const ids=Array.isArray(memberIds)?memberIds:[];
      if(!ids.length)return emptyText;
      const primary=primaryMemberId&&ids.includes(primaryMemberId)?primaryMemberId:null;
      if(primary)return `焦点：${frontingMemberName(primary)} · 在场：${frontingNames(ids)}`;
      return frontingNames(ids,emptyText);
    }
    function readSelectedFrontingMemberIds(){
      const ids=[...document.querySelectorAll("#frontingMemberPicker .fronting-member-check:checked")].map(input=>input.value).filter(Boolean);
      return [...new Set(ids)];
    }
    function syncFrontingPrimaryOptions(memberIds,preferredId){
      const select=document.getElementById("frontingPrimaryMemberId");
      if(!select)return;
      const ids=Array.isArray(memberIds)?memberIds:[];
      const current=preferredId!==undefined?preferredId:select.value;
      select.innerHTML=[`<option value="">不指定</option>`,...ids.map(id=>`<option value="${esc(id)}">${esc(frontingMemberName(id))}</option>`)].join("");
      select.value=current&&ids.includes(current)?current:"";
    }
    function renderFrontingMemberPicker(selectedIds){
      const box=document.getElementById("frontingMemberPicker");
      if(!box)return;
      const selected=new Set(Array.isArray(selectedIds)?selectedIds:readSelectedFrontingMemberIds());
      box.innerHTML=(data.members||[]).length?(data.members||[]).map(m=>`<label class="fronting-member-row"><input type="checkbox" class="fronting-member-check" value="${esc(m.id)}" ${selected.has(m.id)?"checked":""} /> <span class="fronting-member-name">${esc(m.name)}</span></label>`).join(""):`<div class="empty">还没有${esc(term("member"))}，也可以先保存无${esc(term("member"))}记录。</div>`;
      document.querySelectorAll("#frontingMemberPicker .fronting-member-check").forEach(cb=>{cb.onchange=()=>syncFrontingPrimaryOptions(readSelectedFrontingMemberIds());});
      syncFrontingPrimaryOptions([...selected]);
    }
    function updateFrontingEditorMode(){
      const editing=!!document.getElementById("frontingEditId")?.value;
      const saveBtn=document.getElementById("frontingSaveBtn");
      const cancelBtn=document.getElementById("frontingCancelEditBtn");
      if(saveBtn)saveBtn.textContent=editing?"保存修改":"保存记录";
      if(cancelBtn)cancelBtn.style.display=editing?"":"none";
    }
    function fillFrontingForm(log){
      if(!log)return;
      document.getElementById("frontingEditId").value=log.id||"";
      document.getElementById("frontingStateType").value=FRONTING_UI_STATE_TYPES.includes(log.stateType)?log.stateType:"front";
      document.getElementById("frontingMemoryRating").value=FRONTING_UI_MEMORY_RATINGS.includes(log.memoryRating)?log.memoryRating:"";
      document.getElementById("frontingStartAt").value=frontingIsoToLocalInput(log.startAt||log.createdAt||now());
      document.getElementById("frontingEndAt").value=log.endAt?frontingIsoToLocalInput(log.endAt):"";
      renderFrontingMemberPicker(Array.isArray(log.memberIds)?log.memberIds:[]);
      syncFrontingPrimaryOptions(Array.isArray(log.memberIds)?log.memberIds:[],log.primaryMemberId||"");
      document.getElementById("frontingNote").value=log.note||"";
      updateFrontingEditorMode();
      document.getElementById("frontingStateType")?.focus();
    }
    function resetFrontingForm(){
      const stamp=frontingIsoToLocalInput(now());
      document.getElementById("frontingEditId").value="";
      document.getElementById("frontingStateType").value="front";
      document.getElementById("frontingMemoryRating").value="";
      document.getElementById("frontingStartAt").value=stamp;
      document.getElementById("frontingEndAt").value="";
      document.getElementById("frontingNote").value="";
      renderFrontingMemberPicker([]);
      syncFrontingPrimaryOptions([],"");
      updateFrontingEditorMode();
    }
    function collectFrontingForm(){
      const memberIds=readSelectedFrontingMemberIds();
      let primaryMemberId=document.getElementById("frontingPrimaryMemberId")?.value||null;
      if(primaryMemberId&&!memberIds.includes(primaryMemberId))primaryMemberId=null;
      const stateType=document.getElementById("frontingStateType")?.value||"front";
      const memoryRating=document.getElementById("frontingMemoryRating")?.value||"";
      const startAt=normalizeFrontingFormTime(document.getElementById("frontingStartAt")?.value)||now();
      const endRaw=normalizeFrontingFormTime(document.getElementById("frontingEndAt")?.value);
      const endAt=endRaw||null;
      if(endAt&&frontingTimeMs(endAt)<frontingTimeMs(startAt)){
        alert("结束时间需要晚于开始时间，或者留空表示仍在进行。");
        return null;
      }
      return {memberIds,primaryMemberId,stateType:FRONTING_UI_STATE_TYPES.includes(stateType)?stateType:"front",startAt,endAt,memoryRating:FRONTING_UI_MEMORY_RATINGS.includes(memoryRating)?memoryRating:"",note:document.getElementById("frontingNote")?.value.trim()||""};
    }
    function closeOtherOpenFrontingLogs(activeId,endAt){
      const stamp=endAt||now();
      (data.frontingLogs||[]).forEach(log=>{
        if(log.id!==activeId&&log.endAt===null){
          log.endAt=stamp;
          log.updatedAt=now();
        }
      });
    }
    async function saveFrontingLogFromForm(){
      const payload=collectFrontingForm();
      if(!payload)return;
      data.frontingLogs=Array.isArray(data.frontingLogs)?data.frontingLogs:[];
      const editId=document.getElementById("frontingEditId")?.value||"";
      const stamp=now();
      let savedLog=null;
      if(editId){
        savedLog=data.frontingLogs.find(f=>f.id===editId)||null;
        if(!savedLog){
          alert("没有找到要编辑的记录，可能已经被删除。");
          resetFrontingForm();
          renderFrontingList();
          return;
        }
        Object.assign(savedLog,payload,{updatedAt:stamp});
        if(!savedLog.createdAt)savedLog.createdAt=savedLog.startAt||stamp;
      } else {
        savedLog={id:makeId(),...payload,createdAt:stamp,updatedAt:stamp};
        data.frontingLogs.push(savedLog);
      }
      if(savedLog.endAt===null)closeOtherOpenFrontingLogs(savedLog.id,savedLog.startAt||stamp);
      try{
        if(!(await save()))throw new Error("save returned false");
      }catch(err){
        console.error("fronting save failed",err);
        alert(`${term("fronting")}记录保存失败，请重试。`);
        return;
      }
      resetFrontingForm();
      renderFrontingCurrent();
      renderFrontingList();
      renderFrontingStatus();
    }
    function editFrontingLog(id){
      const log=(data.frontingLogs||[]).find(f=>f.id===id);
      if(!log)return;
      fillFrontingForm(log);
    }
    async function deleteFrontingLog(id){
      const log=(data.frontingLogs||[]).find(f=>f.id===id);
      if(!log)return;
      if(!confirm(`确定删除这条${term("fronting")}记录吗？此操作不可恢复。`))return;
      data.frontingLogs=(data.frontingLogs||[]).filter(f=>f.id!==id);
      try{
        if(!(await save()))throw new Error("save returned false");
      }catch(err){
        console.error("fronting delete failed",err);
        alert(`${term("fronting")}记录删除失败，请重试。`);
        return;
      }
      resetFrontingForm();
      renderFrontingCurrent();
      renderFrontingList();
      renderFrontingStatus();
    }
    async function endFronting(){
      const current=getCurrentFrontingLog();
      if(!current)return;
      const stamp=now();
      current.endAt=stamp;
      current.updatedAt=stamp;
      try{
        if(!(await save()))throw new Error("save returned false");
      }catch(err){
        console.error("fronting end failed",err);
        alert(`${term("fronting")}记录保存失败，请重试。`);
        return;
      }
      resetFrontingForm();
      renderFrontingCurrent();
      renderFrontingList();
      renderFrontingStatus();
    }
    function renderFrontingCurrent(){
      const box=document.getElementById("frontingCurrentBox");
      const endBtn=document.getElementById("frontingEndBtn");
      if(!box)return;
      const current=getCurrentFrontingLog();
      if(current){
        box.innerHTML=`<strong>当前记录</strong><span>${esc(frontingStateText(current.stateType))} · ${esc(frontingNamesWithFocus(current.memberIds,current.primaryMemberId,`未记录${term("member")}`))}</span><small>从 ${esc(formatFrontingTime(current.startAt))} 开始 · ${esc(formatFrontingDuration(current.startAt,null))}</small>`;
      } else {
        box.innerHTML=`<strong>当前记录</strong><span>没有正在进行的${term("fronting")}记录。</span><small>保存时结束时间留空，就会成为当前记录。</small>`;
      }
      if(endBtn){
        endBtn.disabled=!current;
        endBtn.style.display="";
      }
    }
    function renderFrontingList(){
      const box=document.getElementById("frontingList");
      if(!box)return;
      const all=(Array.isArray(data.frontingLogs)?data.frontingLogs:[]).slice().sort((a,b)=>frontingTimeMs(b.startAt||b.createdAt)-frontingTimeMs(a.startAt||a.createdAt));
      const rows=all.slice(0,30);
      const limited=all.length>30?'<div class="fronting-list-limit">仅显示最近 30 条。</div>':"";
      box.innerHTML=rows.length?rows.map(f=>{
        const ids=Array.isArray(f.memberIds)?f.memberIds:[];
        const primary=f.primaryMemberId&&ids.includes(f.primaryMemberId)?f.primaryMemberId:null;
        const endText=f.endAt?formatFrontingTime(f.endAt):"仍在进行";
        const duration=formatFrontingDuration(f.startAt,f.endAt);
        return `<div class="fronting-log-card fronting-card"><div class="fronting-log-head"><div><div class="fronting-who">${esc(frontingNamesWithFocus(ids,primary,`未记录${term("member")}`))}</div><div class="fronting-log-meta"><span class="fronting-chip">${esc(frontingStateText(f.stateType))}</span><span>记忆：${esc(frontingMemoryText(f.memoryRating))}</span></div></div><div class="fronting-log-actions"><button class="light small" type="button" onclick="editFrontingLog('${esc(f.id)}')">编辑</button><button class="danger small" type="button" onclick="deleteFrontingLog('${esc(f.id)}')">删除</button></div></div><div class="fronting-time">${esc(formatFrontingTime(f.startAt))} → ${esc(endText)} · ${esc(duration)}</div>${f.note?`<div class="fronting-note">${esc(f.note)}</div>`:""}</div>`;
      }).join("")+limited:`<div class="empty">还没有${esc(term("fronting"))}记录。</div>`;
    }
    function bindFrontingControls(){
      const saveBtn=document.getElementById("frontingSaveBtn");
      const startBtn=document.getElementById("frontingStartBtn");
      const cancelBtn=document.getElementById("frontingCancelEditBtn");
      const endBtn=document.getElementById("frontingEndBtn");
      if(saveBtn)saveBtn.onclick=saveFrontingLogFromForm;
      if(startBtn)startBtn.onclick=startFronting;
      if(cancelBtn)cancelBtn.onclick=resetFrontingForm;
      if(endBtn)endBtn.onclick=endFronting;
    }
    function openFrontingModal(){
      bindFrontingControls();
      resetFrontingForm();
      renderFrontingCurrent();
      renderFrontingList();
      if(typeof applyTermsToStaticLabels==="function")applyTermsToStaticLabels();
      openModal("frontingModal");
    }
    async function startFronting(){
      await saveFrontingLogFromForm();
    }
    window.openFrontingModal=openFrontingModal;
    window.startFronting=startFronting;
    window.endFronting=endFronting;
    window.editFrontingLog=editFrontingLog;
    window.deleteFrontingLog=deleteFrontingLog;
    window.renderFrontingList=renderFrontingList;
    window.getCurrentFrontingLog=getCurrentFrontingLog;
    window.currentFrontingLog=currentFrontingLog;
    window.saveFrontingLogFromForm=saveFrontingLogFromForm;
    window.fillFrontingForm=fillFrontingForm;
    window.resetFrontingForm=resetFrontingForm;
    window.collectFrontingForm=collectFrontingForm;
    window.normalizeFrontingFormTime=normalizeFrontingFormTime;
    window.bindFrontingControls=bindFrontingControls;
