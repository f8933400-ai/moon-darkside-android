    (function(){
      let arrivalShownThisSession=false;
      let arrivalManageMode=false;

      function arrivalData(){
        try{return data||{};}catch{return {};}
      }
      function arrivalPrefs(){
        try{return prefs||{};}catch{return {};}
      }
      function arrivalArray(value){
        return Array.isArray(value)?value:[];
      }
      function arrivalEscape(value){
        return typeof esc==="function"?esc(value):String(value||"").replace(/[&<>"']/g,mark=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[mark]));
      }
      function arrivalTimeMs(value){
        const t=new Date(value||"").getTime();
        return Number.isFinite(t)?t:0;
      }
      function arrivalFormatTime(value,emptyText="未记录时间"){
        const d=new Date(value||"");
        return Number.isNaN(d.getTime())?emptyText:d.toLocaleString();
      }
      function arrivalShortText(value,max=120){
        const text=String(value||"").replace(/\s+/g," ").trim();
        return text.length>max?`${text.slice(0,max)}...`:text;
      }
      function arrivalMemberName(id,emptyText="已移除成员"){
        const d=arrivalData();
        return arrivalArray(d.members).find(m=>m&&m.id===id)?.name||emptyText;
      }
      function arrivalRoomById(roomId){
        const d=arrivalData();
        return arrivalArray(d.rooms).find(r=>r&&r.id===roomId)||null;
      }
      function arrivalRoomName(roomId){
        const r=arrivalRoomById(roomId);
        if(!r)return "未知对话";
        if(typeof roomDisplayName==="function")return roomDisplayName(r);
        return r.name||"未命名对话";
      }
      function arrivalStateText(value){
        if(typeof frontingStateText==="function")return frontingStateText(value);
        return {front:"前台",cofront:"共前台",near:"靠近前台",observer:"旁观 / 在场",blended:"混合 / 模糊",unknown:"未知 / 不确定"}[value]||"前台";
      }
      function arrivalMemoryText(value){
        if(typeof frontingMemoryText==="function")return frontingMemoryText(value);
        return {full:"完整",partial:"部分",none:"无",unknown:"不确定"}[value]||"未记录";
      }
      function arrivalCurrentRoomId(){
        try{return currentRoomId||"";}catch{return "";}
      }
      function arrivalSection(title,body){
        return `<h3 class="arrival-section-title">${arrivalEscape(title)}</h3>${body}`;
      }
      function arrivalMeta(parts){
        const text=parts.filter(Boolean).map(arrivalEscape).join(" · ");
        return text?`<div class="arrival-meta">${text}</div>`:"";
      }
      function arrivalEmpty(text){
        return `<div class="arrival-empty">${arrivalEscape(text)}</div>`;
      }
      function arrivalDeleteButton(action,id,label){
        if(!arrivalManageMode||!id)return "";
        return `<div class="arrival-item-actions"><button class="danger small" type="button" data-arrival-action="${arrivalEscape(action)}" data-id="${arrivalEscape(id)}">${arrivalEscape(label)}</button></div>`;
      }
      function arrivalActionButton(action,label){
        if(!arrivalManageMode)return "";
        return `<div class="arrival-item-actions"><button class="danger small" type="button" data-arrival-action="${arrivalEscape(action)}">${arrivalEscape(label)}</button></div>`;
      }

      function getArrivalCurrentFrontingSummary(){
        const d=arrivalData();
        let log=null;
        if(typeof window.getCurrentFrontingLog==="function"){
          try{log=window.getCurrentFrontingLog();}catch(err){console.warn("arrival current fronting failed",err);}
        }
        if(!log){
          const openRows=arrivalArray(d.frontingLogs).filter(item=>item&&item.endAt===null);
          log=openRows.sort((a,b)=>arrivalTimeMs(b.startAt||b.createdAt)-arrivalTimeMs(a.startAt||a.createdAt))[0]||null;
        }
        if(!log)return null;
        const memberIds=arrivalArray(log.memberIds);
        const primaryId=log.primaryMemberId&&memberIds.includes(log.primaryMemberId)?log.primaryMemberId:null;
        const memberNames=memberIds.map(id=>arrivalMemberName(id)).filter(Boolean);
        return {
          log,
          stateText:arrivalStateText(log.stateType||"front"),
          memberText:memberNames.length?memberNames.join(" / "):"暂不确定",
          primaryText:primaryId?arrivalMemberName(primaryId):"",
          startText:arrivalFormatTime(log.startAt||log.createdAt),
          memoryText:arrivalMemoryText(log.memoryRating||""),
          note:arrivalShortText(log.note||"")
        };
      }

      function getArrivalRecentHandoffs(){
        const d=arrivalData();
        const roomId=arrivalCurrentRoomId();
        const notes=arrivalArray(d.handoffNotes).filter(Boolean).sort((a,b)=>arrivalTimeMs(b.createdAt||b.updatedAt)-arrivalTimeMs(a.createdAt||a.updatedAt));
        const selected=[];
        const used=new Set();
        notes.filter(n=>n.roomId===roomId).forEach(n=>{
          if(selected.length<3){selected.push(n); used.add(n.id||`${n.roomId}-${n.createdAt}-${selected.length}`);}
        });
        notes.forEach(n=>{
          const key=n.id||`${n.roomId}-${n.createdAt}-${n.text}`;
          if(selected.length<3&&!used.has(key)){selected.push(n); used.add(key);}
        });
        return selected.slice(0,3).map(n=>({
          id:n.id||"",
          time:arrivalFormatTime(n.createdAt||n.updatedAt),
          roomName:arrivalRoomName(n.roomId),
          source:n.source||"交接",
          text:arrivalShortText(n.text||"")
        }));
      }

      function arrivalIsDisplayMessage(m){
        if(!m)return false;
        const kind=String(m.kind||"");
        if(m.speakerId==="system")return false;
        if(kind==="系统"||kind.includes("系统"))return false;
        if(!m.speakerId&&/^系统/.test(String(m.text||"")))return false;
        return true;
      }

      function getArrivalRecentMessages(){
        const d=arrivalData();
        const roomId=arrivalCurrentRoomId();
        return arrivalArray(d.messages).filter(m=>m&&m.roomId===roomId&&arrivalIsDisplayMessage(m)).sort((a,b)=>arrivalTimeMs(b.createdAt)-arrivalTimeMs(a.createdAt)).slice(0,5).map(m=>({
          id:m.id||"",
          time:arrivalFormatTime(m.createdAt),
          speakerName:typeof memberNameByMessage==="function"?memberNameByMessage(m):(arrivalMemberName(m.speakerId,m.speakerName||"已移除成员")),
          kind:m.kind||"普通",
          text:arrivalShortText(m.text||""),
          hasImage:!!(m.imageId||m.imageData)
        }));
      }

      function arrivalPollStatusText(status){
        const value=String(status||"open");
        if(value==="open")return "进行中";
        if(value==="closed"||value==="done"||value==="decided")return "已结束";
        if(value==="canceled"||value==="cancelled")return "已取消";
        if(value==="paused")return "已暂停";
        return value||"未记录";
      }
      function arrivalPollRank(p){
        const status=String(p?.status||"open");
        if(status==="closed"||status==="done"||status==="decided")return 0;
        if(status==="open")return 1;
        return 2;
      }
      function arrivalPollOptionSummary(p){
        const options=arrivalArray(p.options);
        const votes=p.votes&&typeof p.votes==="object"?p.votes:{};
        const counts={};
        options.forEach(option=>{counts[option.id]=0;});
        Object.values(votes).forEach(optionId=>{if(counts[optionId]!=null)counts[optionId]+=1;});
        if(!options.length)return "";
        const parts=options.slice(0,4).map(option=>`${option.text||"选项"}：${counts[option.id]||0} 票`);
        const tail=options.length>4?`等 ${options.length} 项`:"";
        return [...parts,tail].filter(Boolean).join(" · ");
      }
      function arrivalPollSummary(p){
        if(p.decisionText)return arrivalShortText(p.decisionText);
        if(typeof p.result==="string")return arrivalShortText(p.result);
        if(p.result&&typeof p.result==="object")return arrivalShortText(JSON.stringify(p.result));
        const optionText=arrivalPollOptionSummary(p);
        if(optionText)return optionText;
        if(p.closedAt)return `结束于 ${arrivalFormatTime(p.closedAt)}`;
        return p.description?arrivalShortText(p.description):"还没有结果摘要。";
      }
      function getArrivalRecentPolls(){
        const d=arrivalData();
        return arrivalArray(d.polls).filter(Boolean).sort((a,b)=>{
          const rank=arrivalPollRank(a)-arrivalPollRank(b);
          if(rank)return rank;
          return arrivalTimeMs(b.updatedAt||b.closedAt||b.createdAt||b.deadline)-arrivalTimeMs(a.updatedAt||a.closedAt||a.createdAt||a.deadline);
        }).slice(0,3).map(p=>({
          id:p.id||"",
          title:p.title||"未命名投票",
          statusText:arrivalPollStatusText(p.status),
          summary:arrivalPollSummary(p),
          time:arrivalFormatTime(p.updatedAt||p.closedAt||p.createdAt||p.deadline,"未记录时间")
        }));
      }

      function arrivalTaskStatusText(status){
        return {todo:"待接力",doing:"进行中",paused:"已暂停",done:"已完成"}[status]||status||"未记录";
      }
      function getArrivalOpenTasks(){
        let tasks=null;
        if(typeof window.getOpenTasks==="function"){
          try{tasks=window.getOpenTasks();}catch(err){console.warn("arrival getOpenTasks failed",err);}
        }
        const d=arrivalData();
        if(!Array.isArray(tasks)&&Array.isArray(d.tasks)){
          const openStatuses=new Set(["todo","doing","paused"]);
          tasks=d.tasks.filter(task=>task&&openStatuses.has(String(task.status||"todo")));
        }
        if(!Array.isArray(tasks))return {available:false,items:[]};
        const items=tasks.slice().sort((a,b)=>arrivalTimeMs(a.dueAt||a.deadline||a.updatedAt||a.createdAt)-arrivalTimeMs(b.dueAt||b.deadline||b.updatedAt||b.createdAt)).slice(0,5).map(task=>{
          const memberIds=Array.isArray(task.assignedMemberIds)?task.assignedMemberIds:[task.assigneeMemberId||task.ownerMemberId||task.memberId||task.claimedBy||""].filter(Boolean);
          return {
            id:task.id||"",
            title:task.title||task.text||task.name||"未命名任务",
            status:arrivalTaskStatusText(task.status||"todo"),
            dueAt:task.dueAt||task.deadline||task.reviewAt||"",
            assignee:memberIds.length?memberIds.map(id=>arrivalMemberName(id,"未记录成员")).join(" / "):"未认领"
          };
        });
        return {available:true,items};
      }

      function getArrivalCareSafetySummary(){
        const d=arrivalData();
        const safetyNotes=d.systemProfile?.safetyNotes||"";
        const messages=arrivalArray(d.messages).filter(m=>m&&String(m.kind||"").includes("状态"));
        const roomId=arrivalCurrentRoomId();
        const currentRoomStatus=messages.filter(m=>m.roomId===roomId).sort((a,b)=>arrivalTimeMs(b.createdAt)-arrivalTimeMs(a.createdAt))[0]||null;
        const globalStatus=messages.sort((a,b)=>arrivalTimeMs(b.createdAt)-arrivalTimeMs(a.createdAt))[0]||null;
        const status=currentRoomStatus||globalStatus;
        const careLog=arrivalArray(d.careLogs).filter(Boolean).sort((a,b)=>arrivalTimeMs(b.updatedAt||b.createdAt||b.at)-arrivalTimeMs(a.updatedAt||a.createdAt||a.at))[0]||null;
        return {
          safetyText:safetyNotes?arrivalShortText(safetyNotes):"",
          status:status?{
            id:status.id||"",
            time:arrivalFormatTime(status.createdAt),
            speakerName:typeof memberNameByMessage==="function"?memberNameByMessage(status):(arrivalMemberName(status.speakerId,status.speakerName||"已移除成员")),
            text:arrivalShortText(status.text||"")
          }:null,
          careLog:careLog?{
            id:careLog.id||"",
            time:arrivalFormatTime(careLog.updatedAt||careLog.createdAt||careLog.at),
            text:arrivalShortText(careLog.summary||careLog.note||careLog.text||careLog.body||"")
          }:null
        };
      }

      function renderArrivalFronting(){
        const summary=getArrivalCurrentFrontingSummary();
        if(!summary)return arrivalSection("当前前台状态",arrivalEmpty("当前没有进行中的前台记录。可以稍后补记。"));
        const chips=[
          `<span class="arrival-chip">${arrivalEscape(summary.stateText)}</span>`,
          `<span class="arrival-chip">成员：${arrivalEscape(summary.memberText)}</span>`,
          summary.primaryText?`<span class="arrival-chip">焦点：${arrivalEscape(summary.primaryText)}</span>`:"",
          `<span class="arrival-chip">记忆：${arrivalEscape(summary.memoryText)}</span>`
        ].filter(Boolean).join("");
        const note=summary.note?`<p>${arrivalEscape(summary.note)}</p>`:"";
        return arrivalSection("当前前台状态",`<div class="arrival-item"><div class="arrival-chip-row">${chips}</div>${arrivalMeta([`开始：${summary.startText}`])}${note}${arrivalDeleteButton("fronting",summary.log?.id||"","删除这条前台记录")}</div>`);
      }
      function renderArrivalHandoffs(){
        const rows=getArrivalRecentHandoffs();
        if(!rows.length)return arrivalSection("最近交接",arrivalEmpty("最近没有交接记录。"));
        return arrivalSection("最近交接",rows.map(row=>`<div class="arrival-item">${arrivalMeta([row.time,row.roomName,row.source])}<p>${arrivalEscape(row.text||"（无正文）")}</p>${arrivalDeleteButton("handoff",row.id,"删除交接")}</div>`).join(""));
      }
      function renderArrivalMessages(){
        const rows=getArrivalRecentMessages();
        if(!rows.length)return arrivalSection("最近消息",arrivalEmpty("当前对话最近没有可显示的消息。"));
        return arrivalSection("最近消息",rows.map(row=>{
          const image=row.hasImage?`<span class="arrival-chip">含图片</span>`:"";
          return `<div class="arrival-item">${arrivalMeta([row.time,row.speakerName,row.kind])}<p>${arrivalEscape(row.text||"（只有图片或空白内容）")}</p>${image}${arrivalDeleteButton("message",row.id,"删除消息")}</div>`;
        }).join(""));
      }
      function renderArrivalPolls(){
        const rows=getArrivalRecentPolls();
        if(!rows.length)return arrivalSection("最近投票 / 决定",arrivalEmpty("最近没有投票或决定记录。"));
        return arrivalSection("最近投票 / 决定",rows.map(row=>`<div class="arrival-item"><strong>${arrivalEscape(row.title)}</strong>${arrivalMeta([row.statusText,row.time])}<p>${arrivalEscape(row.summary)}</p>${arrivalDeleteButton("poll",row.id,"删除投票")}</div>`).join(""));
      }
      function renderArrivalTasks(){
        const result=getArrivalOpenTasks();
        if(!result.available)return arrivalSection("今日待办",arrivalEmpty("还没有任务模块。之后可以通过交接创建接力任务。"));
        if(!result.items.length)return arrivalSection("今日待办",arrivalEmpty("当前没有未完成的接力任务。"));
        return arrivalSection("今日待办",result.items.map(task=>`<div class="arrival-item"><strong>${arrivalEscape(task.title)}</strong>${arrivalMeta([`状态：${task.status}`,task.dueAt?`截止：${arrivalFormatTime(task.dueAt)}`:"未记录截止",`认领：${task.assignee}`])}${arrivalDeleteButton("task",task.id,"删除任务")}</div>`).join(""));
      }
      function renderArrivalCareSafety(){
        const summary=getArrivalCareSafetySummary();
        const safety=summary.safetyText?`<div class="arrival-item"><strong>安全提醒</strong><p>${arrivalEscape(summary.safetyText)}</p>${arrivalActionButton("clear-safety","清空安全提醒")}</div>`:`<div class="arrival-item"><strong>安全提醒</strong><p>没有设置安全提醒。</p></div>`;
        const status=summary.status?`<div class="arrival-item"><strong>最近状态</strong>${arrivalMeta([summary.status.time,summary.status.speakerName])}<p>${arrivalEscape(summary.status.text)}</p>${arrivalDeleteButton("message",summary.status.id,"删除这条状态记录")}</div>`:arrivalEmpty("最近没有状态记录。");
        const care=summary.careLog?`<div class="arrival-item"><strong>照护记录</strong>${arrivalMeta([summary.careLog.time])}<p>${arrivalEscape(summary.careLog.text||"（无摘要）")}</p>${arrivalDeleteButton("care-log",summary.careLog.id,"删除照护记录")}</div>`:"";
        return arrivalSection("身体与安全提醒",`${safety}${status}${care}<div class="arrival-note">这里显示的是记录提醒，不是医疗建议。</div>`);
      }

      function renderArrivalManageState(){
        const modal=document.querySelector("#arrivalModal .arrival-modal");
        const btn=document.getElementById("arrivalManageToggleBtn");
        const note=document.getElementById("arrivalManageNote");
        if(modal)modal.classList.toggle("arrival-manage-on",arrivalManageMode);
        if(btn)btn.textContent=arrivalManageMode?"退出管理":"管理";
        if(note)note.hidden=!arrivalManageMode;
      }
      function toggleArrivalManageMode(){
        arrivalManageMode=!arrivalManageMode;
        renderArrivalCard();
      }
      async function arrivalRefreshAfterChange(options={}){
        try{
          if(options.fronting&&typeof renderFrontingStatus==="function")renderFrontingStatus();
          if(options.handoff&&typeof renderHandoff==="function")renderHandoff();
          if(options.polls&&typeof renderPolls==="function")renderPolls();
          if(options.tasks&&typeof renderTasks==="function")renderTasks();
          if(options.systemProfile&&typeof renderSystemProfile==="function")renderSystemProfile();
          if(options.full&&typeof render==="function")await render();
          renderArrivalCard();
        }catch(err){
          console.error("arrival refresh failed",err);
        }
      }
      async function arrivalSaveAndRefresh(options={}){
        try{
          if(!(await save()))return false;
        }catch(err){
          console.error("arrival save failed",err);
          alert("保存失败，请重试。");
          return false;
        }
        await arrivalRefreshAfterChange(options);
        return true;
      }
      async function deleteArrivalFrontingLog(id){
        if(!id){renderArrivalCard(); return;}
        if(!confirm("确认删除这条前台记录吗？这不会删除成员，只会删除这条前台日志。"))return;
        const d=arrivalData();
        const before=arrivalArray(d.frontingLogs).length;
        d.frontingLogs=arrivalArray(d.frontingLogs).filter(row=>row&&row.id!==id);
        if(d.frontingLogs.length===before){renderArrivalCard(); return;}
        await arrivalSaveAndRefresh({fronting:true,full:true});
      }
      async function deleteArrivalHandoff(id){
        if(!id){renderArrivalCard(); return;}
        if(!confirm("确认删除这条交接记录吗？"))return;
        const d=arrivalData();
        const before=arrivalArray(d.handoffNotes).length;
        d.handoffNotes=arrivalArray(d.handoffNotes).filter(row=>row&&row.id!==id);
        if(d.handoffNotes.length===before){renderArrivalCard(); return;}
        await arrivalSaveAndRefresh({handoff:true,full:true});
      }
      async function deleteArrivalMessage(id){
        if(!id){renderArrivalCard(); return;}
        if(!confirm("确认删除这条消息吗？如果消息含图片，只会删除消息记录；图片存储清理可通过图片健康检查处理。"))return;
        const d=arrivalData();
        const before=arrivalArray(d.messages).length;
        d.messages=arrivalArray(d.messages).filter(row=>row&&row.id!==id);
        if(d.messages.length===before){renderArrivalCard(); return;}
        await arrivalSaveAndRefresh({full:true});
      }
      async function deleteArrivalPoll(id){
        if(!id){renderArrivalCard(); return;}
        if(!confirm("确认删除这个投票 / 决定记录吗？"))return;
        const d=arrivalData();
        const before=arrivalArray(d.polls).length;
        d.polls=arrivalArray(d.polls).filter(row=>row&&row.id!==id);
        if(d.polls.length===before){renderArrivalCard(); return;}
        await arrivalSaveAndRefresh({polls:true,full:true});
      }
      async function deleteArrivalTask(id){
        if(!id){renderArrivalCard(); return;}
        if(!confirm("确认删除这个接力任务吗？"))return;
        const d=arrivalData();
        const exists=arrivalArray(d.tasks).some(row=>row&&row.id===id);
        if(!exists){renderArrivalCard(); return;}
        if(typeof window.deleteTask==="function"){
          try{
            const ok=await window.deleteTask(id,{skipConfirm:true});
            if(ok===false)return;
            await arrivalRefreshAfterChange({tasks:true,full:true});
          }catch(err){
            console.error("arrival task delete failed",err);
            alert("任务删除失败，请重试。");
          }
          return;
        }
        d.tasks=arrivalArray(d.tasks).filter(row=>row&&row.id!==id);
        await arrivalSaveAndRefresh({tasks:true,full:true});
      }
      async function clearArrivalSafetyNotes(){
        const d=arrivalData();
        if(!d.systemProfile||!d.systemProfile.safetyNotes){renderArrivalCard(); return;}
        if(!confirm("确认清空系统档案里的安全提醒吗？"))return;
        d.systemProfile.safetyNotes="";
        d.systemProfile.updatedAt=now();
        await arrivalSaveAndRefresh({systemProfile:true,full:true});
      }
      async function deleteArrivalCareLog(id){
        if(!id){renderArrivalCard(); return;}
        if(!confirm("确认删除这条照护记录吗？"))return;
        const d=arrivalData();
        const before=arrivalArray(d.careLogs).length;
        d.careLogs=arrivalArray(d.careLogs).filter(row=>row&&row.id!==id);
        if(d.careLogs.length===before){renderArrivalCard(); return;}
        await arrivalSaveAndRefresh({full:true});
      }

      function renderArrivalCard(){
        const timeBox=document.getElementById("arrivalCurrentTime");
        if(timeBox)timeBox.textContent=`现在：${new Date().toLocaleString()}`;
        const fronting=document.getElementById("arrivalFrontingSection");
        const handoff=document.getElementById("arrivalHandoffSection");
        const messages=document.getElementById("arrivalMessagesSection");
        const polls=document.getElementById("arrivalPollsSection");
        const tasks=document.getElementById("arrivalTasksSection");
        const care=document.getElementById("arrivalCareSafetySection");
        if(fronting)fronting.innerHTML=renderArrivalFronting();
        if(handoff)handoff.innerHTML=renderArrivalHandoffs();
        if(messages)messages.innerHTML=renderArrivalMessages();
        if(polls)polls.innerHTML=renderArrivalPolls();
        if(tasks)tasks.innerHTML=renderArrivalTasks();
        if(care)care.innerHTML=renderArrivalCareSafety();
        renderArrivalManageState();
        bindArrivalControls();
        initArrivalEvents();
      }

      function closeArrivalModal(){
        if(typeof window.closeModal==="function")window.closeModal("arrivalModal");
        else {
          const modal=document.getElementById("arrivalModal");
          if(modal)modal.style.display="none";
        }
      }
      function openArrivalModal(){
        arrivalManageMode=false;
        renderArrivalCard();
        if(typeof openModal==="function")openModal("arrivalModal");
        else {
          const modal=document.getElementById("arrivalModal");
          if(modal)modal.style.display="flex";
        }
      }
      function openArrivalHandoff(){
        closeArrivalModal();
        if(typeof window.openHandoffModal==="function"){
          window.openHandoffModal();
          return;
        }
        if(typeof renderHandoff==="function")renderHandoff();
        if(typeof openModal==="function")openModal("handoffModal");
        else {
          const modal=document.getElementById("handoffModal");
          if(modal)modal.style.display="flex";
        }
      }
      function openArrivalFronting(){
        closeArrivalModal();
        if(typeof window.openFrontingModal==="function"){
          window.openFrontingModal();
          return;
        }
        if(typeof openModal==="function")openModal("frontingModal");
        else {
          const modal=document.getElementById("frontingModal");
          if(modal)modal.style.display="flex";
        }
      }
      function bindArrivalControls(){
        const handoffBtn=document.getElementById("arrivalWriteHandoffBtn");
        const frontingBtn=document.getElementById("arrivalOpenFrontingBtn");
        if(handoffBtn)handoffBtn.onclick=openArrivalHandoff;
        if(frontingBtn)frontingBtn.onclick=openArrivalFronting;
      }
      function initArrivalEvents(){
        const modal=document.getElementById("arrivalModal");
        if(!modal||modal.dataset.arrivalEventsBound==="1")return;
        modal.dataset.arrivalEventsBound="1";
        modal.addEventListener("click",event=>{
          const manageBtn=event.target.closest("#arrivalManageToggleBtn");
          if(manageBtn){event.preventDefault(); toggleArrivalManageMode(); return;}
          const btn=event.target.closest("[data-arrival-action]");
          if(!btn||!modal.contains(btn))return;
          event.preventDefault();
          const id=btn.dataset.id||"";
          const action=btn.dataset.arrivalAction||"";
          if(action==="fronting")deleteArrivalFrontingLog(id);
          if(action==="handoff")deleteArrivalHandoff(id);
          if(action==="message")deleteArrivalMessage(id);
          if(action==="poll")deleteArrivalPoll(id);
          if(action==="task")deleteArrivalTask(id);
          if(action==="clear-safety")clearArrivalSafetyNotes();
          if(action==="care-log")deleteArrivalCareLog(id);
        });
      }
      function arrivalOverlayVisible(id){
        const el=document.getElementById(id);
        if(!el)return false;
        return getComputedStyle(el).display!=="none";
      }
      function maybeShowArrivalOnEnter(){
        const p=arrivalPrefs();
        if(arrivalShownThisSession)return;
        if(!p.showArrivalOnEnter)return;
        try{
          if(typeof appMode!=="undefined"&&appMode!=="journal")return;
        }catch{return;}
        if(arrivalOverlayVisible("disclaimerBackdrop")||arrivalOverlayVisible("lockBackdrop"))return;
        arrivalShownThisSession=true;
        openArrivalModal();
      }
      function resetArrivalAutoPopupSessionFlag(){
        arrivalShownThisSession=false;
      }

      bindArrivalControls();
      initArrivalEvents();
      window.toggleArrivalManageMode=toggleArrivalManageMode;
      window.deleteArrivalFrontingLog=deleteArrivalFrontingLog;
      window.deleteArrivalHandoff=deleteArrivalHandoff;
      window.deleteArrivalMessage=deleteArrivalMessage;
      window.deleteArrivalPoll=deleteArrivalPoll;
      window.deleteArrivalTask=deleteArrivalTask;
      window.clearArrivalSafetyNotes=clearArrivalSafetyNotes;
      window.deleteArrivalCareLog=deleteArrivalCareLog;
      window.initArrivalEvents=initArrivalEvents;
      window.openArrivalModal=openArrivalModal;
      window.closeArrivalModal=closeArrivalModal;
      window.renderArrivalCard=renderArrivalCard;
      window.getArrivalCurrentFrontingSummary=getArrivalCurrentFrontingSummary;
      window.getArrivalRecentHandoffs=getArrivalRecentHandoffs;
      window.getArrivalRecentMessages=getArrivalRecentMessages;
      window.getArrivalRecentPolls=getArrivalRecentPolls;
      window.getArrivalOpenTasks=getArrivalOpenTasks;
      window.getArrivalCareSafetySummary=getArrivalCareSafetySummary;
      window.maybeShowArrivalOnEnter=maybeShowArrivalOnEnter;
      window.resetArrivalAutoPopupSessionFlag=resetArrivalAutoPopupSessionFlag;
    })();
