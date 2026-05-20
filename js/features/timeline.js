    (function(){
      const TIMELINE_LIMIT=300;
      const TYPE_CHECKBOX_IDS={
        messages:"timelineTypeMessages",
        fronting:"timelineTypeFronting",
        handoffs:"timelineTypeHandoffs",
        polls:"timelineTypePolls",
        tasks:"timelineTypeTasks",
        care:"timelineTypeCare"
      };
      const FRONTING_STATE_LABELS={front:"前台",cofront:"共前台",near:"靠近前台",observer:"旁观 / 在场",blended:"混合 / 模糊",unknown:"未知 / 不确定"};
      const FRONTING_MEMORY_LABELS={full:"完整",partial:"部分",none:"无",unknown:"不确定"};
      const TASK_STATUS_LABELS={todo:"待接力",doing:"进行中",done:"已完成",paused:"已暂停"};
      const POLL_STATUS_LABELS={open:"进行中",closed:"已结束",done:"已结束",decided:"已结束",canceled:"已取消",cancelled:"已取消",paused:"已暂停"};

      function timelineData(){try{return data&&typeof data==="object"?data:{};}catch{return {};}}
      function timelineArray(value){return Array.isArray(value)?value:[];}
      function timelineEscape(value){return typeof esc==="function"?esc(value):String(value==null?"":value).replace(/[&<>"']/g,mark=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[mark]));}
      function timelineTerm(key,fallback){try{if(typeof term==="function")return term(key);}catch{} return fallback||key;}
      function timelineCurrentRoomId(){try{return currentRoomId||"";}catch{return "";}}
      function timelineRoomById(id){return timelineArray(timelineData().rooms).find(r=>r&&r.id===id)||null;}
      function timelineMemberById(id){return timelineArray(timelineData().members).find(m=>m&&m.id===id)||null;}
      function timelineRoomName(roomId){
        const room=timelineRoomById(roomId);
        if(!room)return "";
        try{if(typeof roomDisplayName==="function")return roomDisplayName(room);}catch{}
        return room.name||"未命名对话";
      }
      function timelineMemberName(id,fallback){
        const m=timelineMemberById(id);
        return m?.name||fallback||`已移除${timelineTerm("member","成员")}`;
      }
      function timelineMemberNameByMessage(message){
        try{if(typeof memberNameByMessage==="function")return memberNameByMessage(message);}catch{}
        return timelineMemberName(message?.speakerId,message?.speakerName||"未知");
      }
      function timelineCompact(value,maxLength=120){
        const max=Math.max(24,Number(maxLength)||120);
        const text=String(value==null?"":value).replace(/\s+/g," ").trim();
        return text.length>max?`${text.slice(0,max)}...`:text;
      }
      function timelineTimeMs(value){
        const t=new Date(value||"").getTime();
        return Number.isFinite(t)?t:0;
      }
      function firstTimelineTime(values){
        const list=Array.isArray(values)?values:[values];
        for(const value of list){
          const t=timelineTimeMs(value);
          if(t)return t;
        }
        return 0;
      }
      function timelineDateKey(ms){
        const d=new Date(ms||0);
        if(Number.isNaN(d.getTime()))return "时间未记录";
        const y=d.getFullYear();
        const m=String(d.getMonth()+1).padStart(2,"0");
        const day=String(d.getDate()).padStart(2,"0");
        return `${y}-${m}-${day}`;
      }
      function timelineTimeText(ms){
        const d=new Date(ms||0);
        return Number.isNaN(d.getTime())?"时间未记录":d.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
      }
      function timelineDateTimeText(value,emptyText="未记录"){
        const d=new Date(value||"");
        return Number.isNaN(d.getTime())?emptyText:d.toLocaleString();
      }
      function cleanIds(ids){
        return [...new Set(timelineArray(ids).map(id=>String(id||"").trim()).filter(Boolean))];
      }
      function optionHtml(value,label,selected){
        return `<option value="${timelineEscape(value)}" ${String(value)===String(selected)?"selected":""}>${timelineEscape(label)}</option>`;
      }
      function setTimelineSelectOptions(select,defaultLabel,items,selected){
        if(!select)return;
        select.innerHTML=[optionHtml("",defaultLabel,selected),...items.map(item=>optionHtml(item.value,item.label,selected))].join("");
        select.value=items.some(item=>String(item.value)===String(selected))?selected:"";
      }
      function setTimelineLabelText(labelId,text){
        const label=document.getElementById(labelId);
        if(!label)return;
        const node=[...label.childNodes].find(child=>child.nodeType===Node.TEXT_NODE);
        if(node)node.nodeValue=text;
        else label.insertBefore(document.createTextNode(text),label.firstChild);
      }
      function setTimelineCheckboxText(inputId,text){
        const input=document.getElementById(inputId);
        const label=input?.closest("label");
        if(!label)return;
        const node=[...label.childNodes].find(child=>child.nodeType===Node.TEXT_NODE);
        if(node)node.nodeValue=` ${text}`;
        else label.appendChild(document.createTextNode(` ${text}`));
      }
      function timelineGroupLabel(group){
        if(group==="messages")return "消息";
        if(group==="fronting")return timelineTerm("fronting","前台");
        if(group==="handoffs")return timelineTerm("handoff","交接");
        if(group==="polls")return `${timelineTerm("decision","议题")} / ${timelineTerm("poll","投票")}`;
        if(group==="tasks")return timelineTerm("task","任务");
        if(group==="care")return timelineTerm("care","照护");
        return "记录";
      }
      function updateTimelineTerms(){
        const title=document.getElementById("timelineModalTitle");
        if(title)title.textContent="时间线 / 回顾";
        setTimelineLabelText("timelineMemberLabel",timelineTerm("member","成员"));
        setTimelineLabelText("timelineRoomLabel","对话");
        setTimelineCheckboxText(TYPE_CHECKBOX_IDS.messages,"消息");
        setTimelineCheckboxText(TYPE_CHECKBOX_IDS.fronting,timelineTerm("fronting","前台"));
        setTimelineCheckboxText(TYPE_CHECKBOX_IDS.handoffs,timelineTerm("handoff","交接"));
        setTimelineCheckboxText(TYPE_CHECKBOX_IDS.polls,`${timelineTerm("decision","议题")} / ${timelineTerm("poll","投票")}`);
        setTimelineCheckboxText(TYPE_CHECKBOX_IDS.tasks,timelineTerm("task","任务"));
        setTimelineCheckboxText(TYPE_CHECKBOX_IDS.care,timelineTerm("care","照护"));
      }
      function populateTimelineFilters(){
        updateTimelineTerms();
        const d=timelineData();
        const memberSelect=document.getElementById("timelineMember");
        const roomSelect=document.getElementById("timelineRoom");
        setTimelineSelectOptions(memberSelect,`全部${timelineTerm("member","成员")}`,timelineArray(d.members).map(m=>({value:m.id,label:m.name||`未命名${timelineTerm("member","成员")}`})),memberSelect?.value||"");
        setTimelineSelectOptions(roomSelect,"全部对话",timelineArray(d.rooms).map(r=>({value:r.id,label:timelineRoomName(r.id)||r.name||"未命名对话"})),roomSelect?.value||"");
      }
      function readTimelineChecked(id,defaultValue=false){
        const el=document.getElementById(id);
        return el?!!el.checked:!!defaultValue;
      }
      function collectTimelineFilters(){
        return {
          startDate:document.getElementById("timelineStart")?.value||"",
          endDate:document.getElementById("timelineEnd")?.value||"",
          memberId:document.getElementById("timelineMember")?.value||"",
          roomId:document.getElementById("timelineRoom")?.value||"",
          currentRoomOnly:readTimelineChecked("timelineCurrentRoomOnly",false),
          types:Object.fromEntries(Object.entries(TYPE_CHECKBOX_IDS).map(([key,id])=>[key,readTimelineChecked(id,true)]))
        };
      }
      function timelineDateBounds(filters){
        const start=filters?.startDate?new Date(`${filters.startDate}T00:00:00`).getTime():Number.NEGATIVE_INFINITY;
        const end=filters?.endDate?new Date(`${filters.endDate}T23:59:59.999`).getTime():Number.POSITIVE_INFINITY;
        return {
          start:Number.isFinite(start)?start:Number.NEGATIVE_INFINITY,
          end:Number.isFinite(end)?end:Number.POSITIVE_INFINITY
        };
      }
      function timelineTypeEnabled(filters,group){
        return !filters?.types||filters.types[group]!==false;
      }
      function timelineEventMatches(event,filters){
        if(!event||!event.timestamp)return false;
        if(!timelineTypeEnabled(filters,event.group))return false;
        const bounds=timelineDateBounds(filters);
        if(event.timestamp<bounds.start||event.timestamp>bounds.end)return false;
        if(filters?.memberId&&!timelineArray(event.memberIds).includes(filters.memberId))return false;
        if(filters?.roomId&&event.roomId!==filters.roomId)return false;
        if(filters?.currentRoomOnly&&event.roomId!==timelineCurrentRoomId())return false;
        return true;
      }
      function frontingStateLabel(value){
        try{if(typeof window.frontingStateText==="function")return window.frontingStateText(value);}catch{}
        return FRONTING_STATE_LABELS[value]||timelineTerm("fronting","前台");
      }
      function frontingMemoryLabel(value){
        try{if(typeof window.frontingMemoryText==="function")return window.frontingMemoryText(value);}catch{}
        return FRONTING_MEMORY_LABELS[value]||"未记录";
      }
      function pollStatusLabel(status){
        try{if(typeof window.pollStatusText==="function")return window.pollStatusText(status);}catch{}
        return POLL_STATUS_LABELS[String(status||"open")]||status||"未记录";
      }
      function taskStatusLabel(status){
        return TASK_STATUS_LABELS[String(status||"todo")]||status||"未记录";
      }
      function pollMemberIds(poll){
        const ids=[];
        if(poll?.votes&&typeof poll.votes==="object"&&!Array.isArray(poll.votes))ids.push(...Object.keys(poll.votes));
        if(poll?.comments&&typeof poll.comments==="object"&&!Array.isArray(poll.comments))ids.push(...Object.keys(poll.comments));
        return cleanIds(ids);
      }
      function linkedHandoffForTask(task,d){
        if(!task?.linkedHandoffId)return null;
        return timelineArray(d.handoffNotes).find(note=>note&&note.id===task.linkedHandoffId)||null;
      }
      function taskRoomId(task,d){
        return linkedHandoffForTask(task,d)?.roomId||"";
      }
      function careLogSummary(log){
        try{if(typeof window.summarizeCareLog==="function")return window.summarizeCareLog(log);}catch{}
        const fields=["hunger","thirst","sleep","pain","energy","sensory","mood","meds","note"];
        return fields.map(key=>String(log?.[key]||"").trim()).filter(Boolean).join("；");
      }
      function addTimelineEvent(events,filters,event){
        if(timelineEventMatches(event,filters))events.push(event);
      }
      function collectTimelineEvents(filters=collectTimelineFilters()){
        const d=timelineData();
        const events=[];
        timelineArray(d.messages).forEach(message=>{
          if(!message)return;
          const timestamp=firstTimelineTime(message.createdAt);
          const hasImage=!!(message.imageId||message.imageData);
          const text=timelineCompact(message.text||"",160);
          const summary=[text||"",hasImage?"含图片":"",message.kind?`分类：${message.kind}`:""].filter(Boolean).join(" · ")||"（无摘要）";
          addTimelineEvent(events,filters,{
            group:"messages",
            type:"message",
            id:message.id||"",
            timestamp,
            typeLabel:"消息",
            title:timelineMemberNameByMessage(message)||"消息",
            summary,
            memberIds:cleanIds([message.speakerId]),
            roomId:message.roomId||"",
            actionType:"message",
            actionLabel:"跳转"
          });
        });
        timelineArray(d.frontingLogs).forEach(log=>{
          if(!log)return;
          const timestamp=firstTimelineTime([log.startAt,log.createdAt]);
          const memberIds=cleanIds([...(timelineArray(log.memberIds)),log.primaryMemberId]);
          addTimelineEvent(events,filters,{
            group:"fronting",
            type:"fronting",
            id:log.id||"",
            timestamp,
            typeLabel:timelineTerm("fronting","前台"),
            title:frontingStateLabel(log.stateType||"front"),
            summary:[`记忆：${frontingMemoryLabel(log.memoryRating||"")}`,timelineCompact(log.note||"",150)].filter(Boolean).join(" · "),
            memberIds,
            roomId:"",
            actionType:"fronting",
            actionLabel:`打开${timelineTerm("fronting","前台")}日志`
          });
        });
        timelineArray(d.handoffNotes).forEach(note=>{
          if(!note)return;
          const timestamp=firstTimelineTime([note.createdAt,note.updatedAt]);
          addTimelineEvent(events,filters,{
            group:"handoffs",
            type:"handoff",
            id:note.id||"",
            timestamp,
            typeLabel:timelineTerm("handoff","交接"),
            title:note.source||timelineTerm("handoff","交接"),
            summary:timelineCompact(note.text||"",170)||"（无摘要）",
            memberIds:[],
            roomId:note.roomId||"",
            actionType:"handoff",
            actionLabel:`打开${timelineTerm("handoff","交接")}`
          });
        });
        timelineArray(d.polls).forEach(poll=>{
          if(!poll)return;
          const timestamp=firstTimelineTime([poll.updatedAt,poll.closedAt,poll.createdAt]);
          const status=pollStatusLabel(poll.status);
          const summary=timelineCompact(poll.decisionText||poll.description||"",170)||status;
          addTimelineEvent(events,filters,{
            group:"polls",
            type:"poll",
            id:poll.id||"",
            timestamp,
            typeLabel:`${timelineTerm("decision","议题")} / ${timelineTerm("poll","投票")}`,
            title:poll.title||`未命名${timelineTerm("decision","议题")}`,
            summary,
            memberIds:pollMemberIds(poll),
            roomId:poll.roomId||"",
            actionType:"poll",
            actionLabel:`打开${timelineTerm("poll","投票")}`
          });
        });
        timelineArray(d.tasks).forEach(task=>{
          if(!task)return;
          const timestamp=firstTimelineTime([task.updatedAt,task.createdAt,task.dueAt]);
          const due=task.dueAt?`截止：${timelineDateTimeText(task.dueAt)}`:"截止可留空";
          const summary=[`状态：${taskStatusLabel(task.status)}`,due,timelineCompact(task.detail||"",150)].filter(Boolean).join(" · ");
          addTimelineEvent(events,filters,{
            group:"tasks",
            type:"task",
            id:task.id||"",
            timestamp,
            typeLabel:timelineTerm("task","任务"),
            title:task.title||`未命名${timelineTerm("task","任务")}`,
            summary,
            memberIds:cleanIds(task.assignedMemberIds),
            roomId:taskRoomId(task,d),
            actionType:"task",
            actionLabel:`打开${timelineTerm("task","任务")}`
          });
        });
        timelineArray(d.careLogs).forEach(log=>{
          if(!log)return;
          const timestamp=firstTimelineTime(log.createdAt);
          addTimelineEvent(events,filters,{
            group:"care",
            type:"care",
            id:log.id||"",
            timestamp,
            typeLabel:timelineTerm("care","照护"),
            title:`${timelineTerm("care","照护")}记录`,
            summary:timelineCompact(careLogSummary(log),170)||"（无摘要）",
            memberIds:cleanIds([log.createdByMemberId]),
            roomId:"",
            actionType:"care",
            actionLabel:`打开${timelineTerm("care","照护")}`
          });
        });
        timelineArray(d.careChecklist).forEach(item=>{
          if(!item)return;
          const timestamp=firstTimelineTime([item.updatedAt,item.createdAt]);
          addTimelineEvent(events,filters,{
            group:"care",
            type:"careChecklist",
            id:item.id||"",
            timestamp,
            typeLabel:`${timelineTerm("care","照护")}清单`,
            title:item.title||`未命名${timelineTerm("care","照护")}项`,
            summary:item.done?"已完成":"未完成",
            memberIds:[],
            roomId:"",
            actionType:"careChecklist",
            actionLabel:`打开${timelineTerm("care","照护")}`
          });
        });
        events.sort((a,b)=>(b.timestamp||0)-(a.timestamp||0));
        return events;
      }
      function renderTimelineSummary(all,shown,filters){
        const box=document.getElementById("timelineSummary");
        if(!box)return;
        const counts={messages:0,fronting:0,handoffs:0,polls:0,tasks:0,care:0};
        all.forEach(event=>{if(Object.prototype.hasOwnProperty.call(counts,event.group))counts[event.group]+=1;});
        const parts=Object.entries(counts).filter(([,count])=>count>0).map(([group,count])=>`${timelineGroupLabel(group)} ${count}`);
        const range=[filters.startDate?`从 ${filters.startDate}`:"",filters.endDate?`到 ${filters.endDate}`:""].filter(Boolean).join(" ");
        const member=filters.memberId?`成员：${timelineMemberName(filters.memberId)}`:"";
        const roomFilter=filters.currentRoomOnly?`当前对话：${timelineRoomName(timelineCurrentRoomId())||"未知对话"}`:(filters.roomId?`对话：${timelineRoomName(filters.roomId)||"未知对话"}`:"");
        box.innerHTML=`<strong>匹配 ${timelineEscape(all.length)} 条记录</strong><span>${timelineEscape([range,member,roomFilter,parts.join(" · ")].filter(Boolean).join(" ｜ ")||"显示全部时间线来源")}</span>`;
      }
      function renderTimelineEvent(event){
        const memberNames=timelineArray(event.memberIds).map(id=>timelineMemberName(id,"")).filter(Boolean).join(" / ");
        const roomName=event.roomId?timelineRoomName(event.roomId):"";
        const meta=[timelineTimeText(event.timestamp),memberNames?`${timelineTerm("member","成员")}：${memberNames}`:"",roomName?`对话：${roomName}`:""].filter(Boolean).join(" · ");
        const action=event.actionType&&event.id?`<button class="light small" type="button" data-timeline-type="${timelineEscape(event.actionType)}" data-timeline-id="${timelineEscape(event.id)}">${timelineEscape(event.actionLabel||"打开")}</button>`:"";
        return `<article class="timeline-event"><div class="timeline-event-main"><div class="timeline-event-title"><span>${timelineEscape(event.typeLabel||"记录")}</span><strong>${timelineEscape(event.title||"未命名记录")}</strong></div><div class="timeline-event-summary">${timelineEscape(event.summary||"（无摘要）")}</div><div class="timeline-event-meta">${timelineEscape(meta)}</div></div><div class="timeline-event-actions">${action}</div></article>`;
      }
      function renderTimelineList(all){
        const box=document.getElementById("timelineList");
        if(!box)return;
        const shown=all.slice(0,TIMELINE_LIMIT);
        const limitNote=all.length>TIMELINE_LIMIT?'<div class="timeline-limit-note">结果较多，仅显示最近 300 条。</div>':"";
        if(!shown.length){
          box.innerHTML=`${limitNote}<div class="timeline-empty">没有找到符合条件的记录。可以放宽筛选条件，或稍后再记录一些内容。</div>`;
          return;
        }
        const groups=[];
        shown.forEach(event=>{
          const key=timelineDateKey(event.timestamp);
          let group=groups[groups.length-1];
          if(!group||group.key!==key){group={key,events:[]}; groups.push(group);}
          group.events.push(event);
        });
        box.innerHTML=limitNote+groups.map(group=>`<section class="timeline-day-group"><h3>${timelineEscape(group.key)}</h3><div class="timeline-day-events">${group.events.map(renderTimelineEvent).join("")}</div></section>`).join("");
      }
      function renderTimeline(){
        populateTimelineFilters();
        const filters=collectTimelineFilters();
        const all=collectTimelineEvents(filters);
        renderTimelineSummary(all,all.slice(0,TIMELINE_LIMIT),filters);
        renderTimelineList(all);
      }
      function resetTimelineFilters(){
        populateTimelineFilters();
        const setValue=(id,value)=>{const el=document.getElementById(id); if(el)el.value=value;};
        setValue("timelineStart","");
        setValue("timelineEnd","");
        setValue("timelineMember","");
        setValue("timelineRoom","");
        Object.values(TYPE_CHECKBOX_IDS).forEach(id=>{const el=document.getElementById(id); if(el)el.checked=true;});
        const currentOnly=document.getElementById("timelineCurrentRoomOnly");
        if(currentOnly)currentOnly.checked=false;
        renderTimeline();
        const review=document.getElementById("monthlyReviewPanel");
        if(review)review.innerHTML="";
      }
      function openTimelineModal(){
        populateTimelineFilters();
        if(typeof openModal==="function")openModal("timelineModal");
        else {
          const modal=document.getElementById("timelineModal");
          if(modal)modal.style.display="flex";
        }
        renderTimeline();
      }
      function closeTimelineModal(){
        if(typeof window.closeModal==="function")window.closeModal("timelineModal");
        else {
          const modal=document.getElementById("timelineModal");
          if(modal)modal.style.display="none";
        }
      }
      function fallbackTimelineJump(type,id){
        const d=timelineData();
        if(type==="message"){
          const message=timelineArray(d.messages).find(m=>m&&m.id===id);
          if(!message){alert("这条消息可能已经被删除。"); return;}
          if(message.roomId&&timelineRoomById(message.roomId))currentRoomId=message.roomId;
          window._pendingSearchHitMessageId=id;
          if(typeof render==="function")Promise.resolve(render()).then(()=>window.highlightSearchHitMessage&&window.highlightSearchHitMessage(id));
          return;
        }
        if(type==="handoff"){
          const note=timelineArray(d.handoffNotes).find(n=>n&&n.id===id);
          if(!note){alert(`这条${timelineTerm("handoff","交接")}可能已经被删除。`); return;}
          if(note.roomId&&timelineRoomById(note.roomId))currentRoomId=note.roomId;
          if(typeof window.openHandoffModal==="function")window.openHandoffModal();
          else if(typeof openModal==="function")openModal("handoffModal");
          return;
        }
        if(type==="poll"){
          const poll=timelineArray(d.polls).find(p=>p&&p.id===id);
          if(!poll){alert(`这个${timelineTerm("poll","投票")}可能已经被删除。`); return;}
          if(poll.roomId&&timelineRoomById(poll.roomId))currentRoomId=poll.roomId;
          if(typeof renderPolls==="function")renderPolls();
          if(typeof openModal==="function")openModal("pollModal");
          return;
        }
        if(type==="fronting"){
          const log=timelineArray(d.frontingLogs).find(f=>f&&f.id===id);
          if(!log){alert(`这条${timelineTerm("fronting","前台")}记录可能已经被删除。`); return;}
          if(typeof window.openFrontingModal==="function")window.openFrontingModal();
          else if(typeof openModal==="function")openModal("frontingModal");
          return;
        }
        if(type==="task"){
          const task=timelineArray(d.tasks).find(t=>t&&t.id===id);
          if(!task){alert(`这个${timelineTerm("task","任务")}可能已经被删除。`); return;}
          const linked=linkedHandoffForTask(task,d);
          if(linked?.roomId&&timelineRoomById(linked.roomId))currentRoomId=linked.roomId;
          if(typeof window.openHandoffModal==="function")window.openHandoffModal();
          else if(typeof openModal==="function")openModal("handoffModal");
          if(typeof window.renderTasks==="function")window.renderTasks();
        }
      }
      function timelineJumpToEvent(type,id){
        try{
          if(!type||!id){alert("这条时间线记录缺少定位信息。"); return;}
          const d=timelineData();
          if(type==="care"||type==="careChecklist"){
            const exists=type==="care"?timelineArray(d.careLogs).some(log=>log&&log.id===id):timelineArray(d.careChecklist).some(item=>item&&item.id===id);
            if(!exists){alert(`${timelineTerm("care","照护")}记录可能已经被删除。`); return;}
            closeTimelineModal();
            if(typeof window.openCareModal==="function")window.openCareModal();
            else if(typeof openModal==="function")openModal("careModal");
            return;
          }
          closeTimelineModal();
          if(typeof window.jumpToSearchResult==="function"&&["message","handoff","poll","fronting","task","member","room"].includes(type)){
            window.jumpToSearchResult(type,id);
            return;
          }
          fallbackTimelineJump(type,id);
        }catch(err){
          console.error("timelineJumpToEvent failed",err);
          alert("跳转失败了，可以刷新后再试一次。");
        }
      }
      function monthBounds(date=new Date()){
        const year=date.getFullYear();
        const month=date.getMonth();
        const start=new Date(year,month,1,0,0,0,0);
        const end=new Date(year,month+1,1,0,0,0,0);
        return {start:start.getTime(),end:end.getTime(),label:`${year}-${String(month+1).padStart(2,"0")}`};
      }
      function timeInMonth(values,bounds){
        const list=Array.isArray(values)?values:[values];
        return list.some(value=>{
          const t=timelineTimeMs(value);
          return t>=bounds.start&&t<bounds.end;
        });
      }
      function countMapTop(rows,reader,limit=5){
        const counts=new Map();
        rows.forEach(row=>{
          const key=String(reader(row)||"").trim();
          if(!key)return;
          counts.set(key,(counts.get(key)||0)+1);
        });
        return [...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],"zh-Hans-CN")).slice(0,limit);
      }
      function reviewStatCard(label,value,detail){
        return `<div class="review-stat-card"><span>${timelineEscape(label)}</span><strong>${timelineEscape(value)}</strong>${detail?`<small>${timelineEscape(detail)}</small>`:""}</div>`;
      }
      function reviewRankList(title,rows,emptyText){
        const body=rows.length?`<ol>${rows.map(([label,count])=>`<li><span>${timelineEscape(label)}</span><strong>${timelineEscape(count)} 次</strong></li>`).join("")}</ol>`:`<div class="timeline-empty compact">${timelineEscape(emptyText)}</div>`;
        return `<section class="review-rank-section"><h3>${timelineEscape(title)}</h3>${body}</section>`;
      }
      function renderMonthlyReview(){
        const panel=document.getElementById("monthlyReviewPanel");
        if(!panel)return;
        const d=timelineData();
        const bounds=monthBounds();
        const messages=timelineArray(d.messages).filter(m=>m&&timeInMonth(m.createdAt,bounds));
        const fronting=timelineArray(d.frontingLogs).filter(f=>f&&timeInMonth([f.startAt,f.createdAt],bounds));
        const handoffs=timelineArray(d.handoffNotes).filter(n=>n&&timeInMonth([n.createdAt,n.updatedAt],bounds));
        const polls=timelineArray(d.polls).filter(p=>p&&timeInMonth([p.updatedAt,p.closedAt,p.createdAt],bounds));
        const tasks=timelineArray(d.tasks).filter(t=>t&&timeInMonth([t.updatedAt,t.createdAt,t.dueAt],bounds));
        const careLogs=timelineArray(d.careLogs).filter(log=>log&&timeInMonth(log.createdAt,bounds));
        const completedTasks=tasks.filter(task=>String(task.status||"todo")==="done");
        const openTasks=tasks.filter(task=>String(task.status||"todo")!=="done");
        const unknownFronting=fronting.filter(log=>log.stateType==="unknown").length;
        const blendedFronting=fronting.filter(log=>log.stateType==="blended").length;
        const kindTop=countMapTop(messages,m=>m.kind||"普通",5);
        const memberRows=countMapTop(messages.filter(m=>m.speakerId!=="system"),m=>timelineMemberName(m.speakerId,m.speakerName||""),5);
        const cards=[
          reviewStatCard("本月消息数",messages.length),
          reviewStatCard(`本月${timelineTerm("fronting","前台")}记录数`,fronting.length),
          reviewStatCard(`本月${timelineTerm("handoff","交接")}数`,handoffs.length),
          reviewStatCard(`本月${timelineTerm("decision","议题")} / ${timelineTerm("poll","投票")}数`,polls.length),
          reviewStatCard(`本月完成${timelineTerm("task","任务")}数`,completedTasks.length),
          reviewStatCard(`本月${timelineTerm("care","照护")}记录数`,careLogs.length),
          reviewStatCard(`${timelineTerm("fronting","前台")} unknown / blended 次数`,`${unknownFronting} / ${blendedFronting}`),
          reviewStatCard(`${timelineTerm("task","任务")}未完成数`,openTasks.length)
        ].join("");
        panel.innerHTML=`<h3>本月回顾 · ${timelineEscape(bounds.label)}</h3><p class="monthly-review-note">这些只是本地记录统计，不代表状态判断或诊断。</p><div class="review-stat-grid">${cards}</div><div class="review-rank-grid">${reviewRankList("最近常见消息分类 top 5",kindTop,"本月还没有消息分类记录。")}${reviewRankList(`${timelineTerm("member","成员")}记录次数（按消息发言）`,memberRows,"本月还没有成员发言记录。")}</div>`;
      }

      window.openTimelineModal=openTimelineModal;
      window.populateTimelineFilters=populateTimelineFilters;
      window.collectTimelineFilters=collectTimelineFilters;
      window.collectTimelineEvents=collectTimelineEvents;
      window.renderTimeline=renderTimeline;
      window.resetTimelineFilters=resetTimelineFilters;
      window.timelineJumpToEvent=timelineJumpToEvent;
      window.renderMonthlyReview=renderMonthlyReview;
      window.updateTimelineTerms=updateTimelineTerms;
    })();
