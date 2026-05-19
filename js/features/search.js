    (function(){
      const SEARCH_LIMIT=100;
      const typeCheckboxIds={
        messages:"advancedSearchTypeMessages",
        members:"advancedSearchTypeMembers",
        rooms:"advancedSearchTypeRooms",
        handoffs:"advancedSearchTypeHandoffs",
        polls:"advancedSearchTypePolls",
        fronting:"advancedSearchTypeFronting",
        tasks:"advancedSearchTypeTasks"
      };
      const searchTypeLabels={
        message:"消息",
        member:"成员",
        room:"群组 / 私聊",
        handoff:"交接",
        poll:"投票",
        fronting:"前台",
        task:"任务"
      };
      const frontingStateLabels={front:"前台",cofront:"共前台",near:"靠近前台",observer:"旁观 / 在场",blended:"混合 / 模糊",unknown:"未知 / 不确定"};
      const frontingMemoryLabels={full:"完整",partial:"部分",none:"无",unknown:"不确定"};
      const taskStatusLabels={todo:"待接力",doing:"进行中",done:"已完成",paused:"已暂停"};
      const pollStatusLabels={open:"进行中",closed:"已结束",done:"已结束",decided:"已结束",canceled:"已取消",cancelled:"已取消",paused:"已暂停"};

      function searchData(){try{return data&&typeof data==="object"?data:{};}catch{return {};}}
      function searchArray(value){return Array.isArray(value)?value:[];}
      function searchCurrentRoomId(){try{return currentRoomId||"";}catch{return "";}}
      function searchEscape(value){return typeof esc==="function"?esc(value):String(value||"").replace(/[&<>"']/g,mark=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[mark]));}
      function searchMemberById(id){return searchArray(searchData().members).find(m=>m&&m.id===id)||null;}
      function searchRoomById(id){return searchArray(searchData().rooms).find(r=>r&&r.id===id)||null;}
      function searchTagById(id){return searchArray(searchData().tags).find(t=>t&&t.id===id)||null;}
      function searchRoomName(roomOrId){
        const r=typeof roomOrId==="object"?roomOrId:searchRoomById(roomOrId);
        if(!r)return "未知对话";
        try{if(typeof roomDisplayName==="function")return roomDisplayName(r);}catch{}
        return r.name||"未命名对话";
      }
      function searchRoomDesc(roomOrId){
        const r=typeof roomOrId==="object"?roomOrId:searchRoomById(roomOrId);
        if(!r)return "";
        try{if(typeof roomDisplayDesc==="function")return roomDisplayDesc(r);}catch{}
        return r.desc||r.description||r.note||"";
      }
      function searchMemberName(id,fallback="已移除成员"){
        const m=searchMemberById(id);
        return m?.name||fallback;
      }
      function searchMemberDisplayNameForMessage(message){
        if(!message)return "未知";
        return searchMemberById(message.speakerId)?.name||message.speakerName||"已移除成员";
      }
      function normalizeSearchText(value){
        if(value==null)return "";
        let text="";
        try{
          if(Array.isArray(value))text=value.map(normalizeSearchText).join(" ");
          else if(typeof value==="object")text=JSON.stringify(value);
          else text=String(value);
        }catch{
          text=String(value||"");
        }
        try{text=text.normalize("NFKC");}catch{}
        return text.toLowerCase().replace(/\s+/g," ").trim();
      }
      function searchTextIncludes(haystack,needle){
        const query=normalizeSearchText(needle);
        if(!query)return true;
        return normalizeSearchText(haystack).includes(query);
      }
      function compactSearchText(value){
        return String(value==null?"":value).replace(/\s+/g," ").trim();
      }
      function getSearchResultSummary(value,maxLength=120){
        const max=Math.max(24,Number(maxLength)||120);
        const text=compactSearchText(value);
        if(!text)return "（无摘要）";
        return text.length>max?`${text.slice(0,max)}...`:text;
      }
      function getSearchTypeLabel(type){
        return searchTypeLabels[type]||"记录";
      }
      function dateRangeBounds(filters){
        const start=filters?.startDate?new Date(`${filters.startDate}T00:00:00`).getTime():Number.NEGATIVE_INFINITY;
        const end=filters?.endDate?new Date(`${filters.endDate}T23:59:59.999`).getTime():Number.POSITIVE_INFINITY;
        return {
          start:Number.isFinite(start)?start:Number.NEGATIVE_INFINITY,
          end:Number.isFinite(end)?end:Number.POSITIVE_INFINITY,
          active:!!(filters?.startDate||filters?.endDate)
        };
      }
      function searchTimeMs(value){
        const t=new Date(value||"").getTime();
        return Number.isFinite(t)?t:0;
      }
      function matchesDateWindow(values,filters){
        const bounds=dateRangeBounds(filters);
        if(!bounds.active)return true;
        const list=(Array.isArray(values)?values:[values]).filter(Boolean);
        if(!list.length)return false;
        return list.some(value=>{
          const t=searchTimeMs(value);
          return t&&t>=bounds.start&&t<=bounds.end;
        });
      }
      function formatSearchTime(value,emptyText="未记录时间"){
        const d=new Date(value||"");
        return Number.isNaN(d.getTime())?emptyText:d.toLocaleString();
      }
      function resultTimestamp(values){
        const list=Array.isArray(values)?values:[values];
        return Math.max(0,...list.map(searchTimeMs));
      }
      function optionHtml(value,label,selected){
        return `<option value="${searchEscape(value)}" ${String(value)===String(selected)?"selected":""}>${searchEscape(label)}</option>`;
      }
      function setSelectOptions(select,defaultLabel,items,selected){
        if(!select)return;
        select.innerHTML=[optionHtml("",defaultLabel,selected),...items.map(item=>optionHtml(item.value,item.label,selected))].join("");
        select.value=items.some(item=>String(item.value)===String(selected))?selected:"";
      }
      function populateAdvancedSearchFilters(){
        const d=searchData();
        const memberSelect=document.getElementById("advancedSearchMember");
        const roomSelect=document.getElementById("advancedSearchRoom");
        const kindSelect=document.getElementById("advancedSearchKind");
        setSelectOptions(memberSelect,"全部成员",searchArray(d.members).map(m=>({value:m.id,label:m.name||"未命名成员"})),memberSelect?.value||"");
        setSelectOptions(roomSelect,"全部对话",searchArray(d.rooms).map(r=>({value:r.id,label:searchRoomName(r)})),roomSelect?.value||"");
        let defaultKinds=[];
        try{defaultKinds=Array.isArray(DEFAULT_KINDS)?DEFAULT_KINDS:[];}catch{defaultKinds=[];}
        const kindSet=new Set([...(searchArray(d.messageKinds).length?d.messageKinds:defaultKinds),...searchArray(d.messages).map(m=>m?.kind||"")].map(v=>String(v||"").trim()).filter(Boolean));
        setSelectOptions(kindSelect,"全部分类",[...kindSet].map(k=>({value:k,label:k})),kindSelect?.value||"");
      }
      function renderAdvancedSearchIntro(){
        const box=document.getElementById("advancedSearchResults");
        if(box)box.innerHTML='<div class="search-empty">可以输入关键词，也可以只用筛选条件搜索。</div>';
      }
      function openAdvancedSearchModal(){
        populateAdvancedSearchFilters();
        const keyword=document.getElementById("advancedSearchKeyword");
        const sidebar=document.getElementById("search");
        if(keyword&&!keyword.value&&sidebar?.value)keyword.value=sidebar.value;
        renderAdvancedSearchIntro();
        if(typeof openModal==="function")openModal("advancedSearchModal");
        else {
          const modal=document.getElementById("advancedSearchModal");
          if(modal)modal.style.display="flex";
        }
        setTimeout(()=>keyword?.focus(),0);
      }
      function closeAdvancedSearchModal(){
        if(typeof window.closeModal==="function")window.closeModal("advancedSearchModal");
        else {
          const modal=document.getElementById("advancedSearchModal");
          if(modal)modal.style.display="none";
        }
      }
      function setChecked(id,value){
        const el=document.getElementById(id);
        if(el)el.checked=!!value;
      }
      function resetAdvancedSearchFilters(){
        populateAdvancedSearchFilters();
        const setValue=(id,value)=>{const el=document.getElementById(id); if(el)el.value=value;};
        setValue("advancedSearchKeyword","");
        setValue("advancedSearchMember","");
        setValue("advancedSearchRoom","");
        setValue("advancedSearchKind","");
        setValue("advancedSearchStart","");
        setValue("advancedSearchEnd","");
        setChecked("advancedSearchHasImage",false);
        setChecked("advancedSearchCurrentRoomOnly",false);
        Object.values(typeCheckboxIds).forEach(id=>setChecked(id,true));
        renderAdvancedSearchIntro();
      }
      function readChecked(id,defaultValue=false){
        const el=document.getElementById(id);
        return el?!!el.checked:!!defaultValue;
      }
      function collectAdvancedSearchFilters(){
        return {
          keyword:document.getElementById("advancedSearchKeyword")?.value||"",
          memberId:document.getElementById("advancedSearchMember")?.value||"",
          roomId:document.getElementById("advancedSearchRoom")?.value||"",
          kind:document.getElementById("advancedSearchKind")?.value||"",
          startDate:document.getElementById("advancedSearchStart")?.value||"",
          endDate:document.getElementById("advancedSearchEnd")?.value||"",
          hasImage:readChecked("advancedSearchHasImage",false),
          currentRoomOnly:readChecked("advancedSearchCurrentRoomOnly",false),
          types:Object.fromEntries(Object.entries(typeCheckboxIds).map(([type,id])=>[type,readChecked(id,true)]))
        };
      }
      function typeEnabled(filters,key){
        return !filters?.types||filters.types[key]!==false;
      }
      function matchesKeyword(values,filters){
        const keyword=filters?.keyword||"";
        if(!normalizeSearchText(keyword))return true;
        return searchTextIncludes(values,keyword);
      }
      function roomAllowed(roomId,filters){
        if(filters?.roomId&&roomId!==filters.roomId)return false;
        if(filters?.currentRoomOnly&&roomId!==searchCurrentRoomId())return false;
        return true;
      }
      function nonMessageBlockedByMessageOnlyFilters(filters){
        return !!(filters?.kind||filters?.hasImage);
      }
      function memberExtraText(member){
        const aliases=Array.isArray(member?.aliases)?member.aliases.join(" "):String(member?.aliases||"");
        const custom=searchArray(member?.customFields).map(field=>`${field?.name||""} ${field?.value||""}`).join(" ");
        const statusLabel=typeof statusText==="function"?statusText(member?.status):"";
        return [member?.name,member?.role,member?.status,statusLabel,member?.note,searchTagById(member?.tagId)?.name,member?.pronouns,aliases,member?.comfortMethods,member?.boundaries,member?.avoidNotes,member?.communicationStyle,member?.frontingPreferences,custom].join(" ");
      }
      function collectMessageResults(filters){
        const d=searchData();
        return searchArray(d.messages).filter(m=>{
          if(!m)return false;
          if(filters.memberId&&m.speakerId!==filters.memberId)return false;
          if(!roomAllowed(m.roomId,filters))return false;
          if(filters.kind&&m.kind!==filters.kind)return false;
          if(filters.hasImage&&!(m.imageId||m.imageData))return false;
          if(!matchesDateWindow(m.createdAt,filters))return false;
          const roomName=searchRoomName(m.roomId);
          const memberName=searchMemberDisplayNameForMessage(m);
          return matchesKeyword([m.text,m.speakerName,m.kind,m.imageName,roomName,memberName],filters);
        }).map(m=>{
          const hasImage=!!(m.imageId||m.imageData);
          const speaker=searchMemberDisplayNameForMessage(m);
          const roomName=searchRoomName(m.roomId);
          return {
            type:"message",
            id:m.id,
            timestamp:resultTimestamp(m.createdAt),
            title:speaker||"消息",
            meta:[formatSearchTime(m.createdAt),m.kind||"普通",roomName,hasImage?"含图片":""],
            summary:getSearchResultSummary(m.text||m.imageName||"（只有图片或空白内容）",150),
            actionLabel:"跳转",
            roomId:m.roomId
          };
        });
      }
      function collectMemberResults(filters){
        if(nonMessageBlockedByMessageOnlyFilters(filters))return [];
        return searchArray(searchData().members).filter(m=>{
          if(!m)return false;
          if(filters.memberId&&m.id!==filters.memberId)return false;
          if(!matchesDateWindow([m.createdAt,m.updatedAt],filters))return false;
          return matchesKeyword(memberExtraText(m),filters);
        }).map(m=>({
          type:"member",
          id:m.id,
          timestamp:resultTimestamp([m.updatedAt,m.createdAt]),
          title:m.name||"未命名成员",
          meta:[m.role||"未填写角色",typeof statusText==="function"?statusText(m.status):m.status||"状态未记录"],
          summary:getSearchResultSummary(memberExtraText(m),150),
          actionLabel:"编辑"
        }));
      }
      function collectRoomResults(filters){
        if(nonMessageBlockedByMessageOnlyFilters(filters))return [];
        return searchArray(searchData().rooms).filter(r=>{
          if(!r)return false;
          if(!roomAllowed(r.id,filters))return false;
          if(!matchesDateWindow([r.createdAt,r.updatedAt],filters))return false;
          return matchesKeyword([r.name,r.type,r.note,r.description,r.desc,r.id,searchRoomName(r),searchRoomDesc(r)],filters);
        }).map(r=>{
          const isPrivate=r.type==="private";
          return {
            type:"room",
            typeLabel:isPrivate?"私聊":"群组",
            id:r.id,
            timestamp:resultTimestamp([r.updatedAt,r.createdAt]),
            title:searchRoomName(r),
            meta:[isPrivate?"私聊 / 小群聊":"群组"],
            summary:getSearchResultSummary(searchRoomDesc(r)||r.id,150),
            actionLabel:"跳转",
            roomId:r.id
          };
        });
      }
      function linkedTaskTitlesForHandoff(noteId){
        if(!noteId)return "";
        return searchArray(searchData().tasks).filter(t=>t&&t.linkedHandoffId===noteId).map(t=>t.title||"").join(" ");
      }
      function collectHandoffResults(filters){
        if(nonMessageBlockedByMessageOnlyFilters(filters))return [];
        return searchArray(searchData().handoffNotes).filter(n=>{
          if(!n)return false;
          if(!roomAllowed(n.roomId,filters))return false;
          if(!matchesDateWindow([n.createdAt,n.updatedAt],filters))return false;
          return matchesKeyword([n.text,n.source,searchRoomName(n.roomId),n.createdAt,linkedTaskTitlesForHandoff(n.id)],filters);
        }).map(n=>({
          type:"handoff",
          id:n.id,
          timestamp:resultTimestamp([n.updatedAt,n.createdAt]),
          title:n.source||"交接",
          meta:[formatSearchTime(n.createdAt),searchRoomName(n.roomId)],
          summary:getSearchResultSummary(n.text,170),
          actionLabel:"打开交接",
          roomId:n.roomId
        }));
      }
      function pollStatusText(status){
        return pollStatusLabels[String(status||"open")]||status||"未记录";
      }
      function pollOptionsText(poll){
        return searchArray(poll?.options).map(option=>typeof option==="string"?option:(option?.text||"")).join(" ");
      }
      function pollCommentsText(poll){
        const comments=poll?.comments;
        if(Array.isArray(comments))return comments.map(c=>typeof c==="string"?c:[c?.text,c?.body,c?.note,c?.memberName].join(" ")).join(" ");
        return comments||"";
      }
      function pollResultSummary(poll){
        if(!poll)return "";
        if(poll.decisionText)return poll.decisionText;
        if(typeof poll.result==="string")return poll.result;
        if(poll.result&&typeof poll.result==="object"){try{return JSON.stringify(poll.result);}catch{}}
        return [poll.description,pollOptionsText(poll)].filter(Boolean).join(" ");
      }
      function collectPollResults(filters){
        if(nonMessageBlockedByMessageOnlyFilters(filters))return [];
        return searchArray(searchData().polls).filter(p=>{
          if(!p)return false;
          if(filters.roomId||filters.currentRoomOnly){
            if(!p.roomId||!roomAllowed(p.roomId,filters))return false;
          }
          if(!matchesDateWindow([p.createdAt,p.updatedAt,p.closedAt,p.deadline],filters))return false;
          return matchesKeyword([p.title,p.description,p.decisionText,pollOptionsText(p),pollCommentsText(p),p.result,p.status,searchRoomName(p.roomId)],filters);
        }).map(p=>({
          type:"poll",
          id:p.id,
          timestamp:resultTimestamp([p.updatedAt,p.closedAt,p.createdAt,p.deadline]),
          title:p.title||"未命名投票",
          meta:[pollStatusText(p.status),p.deadline?`截止 ${formatSearchTime(p.deadline)}`:"未设置截止",p.roomId?searchRoomName(p.roomId):""],
          summary:getSearchResultSummary(pollResultSummary(p),170),
          actionLabel:"打开投票",
          roomId:p.roomId||""
        }));
      }
      function frontingNamesForSearch(row){
        const ids=searchArray(row?.memberIds);
        const names=ids.map(id=>searchMemberName(id)).join(" / ");
        const primary=row?.primaryMemberId?searchMemberName(row.primaryMemberId,""):"";
        return [names,primary].filter(Boolean).join(" ");
      }
      function collectFrontingResults(filters){
        if(nonMessageBlockedByMessageOnlyFilters(filters)||filters.roomId||filters.currentRoomOnly)return [];
        return searchArray(searchData().frontingLogs).filter(f=>{
          if(!f)return false;
          const ids=searchArray(f.memberIds);
          if(filters.memberId&&!(ids.includes(filters.memberId)||f.primaryMemberId===filters.memberId))return false;
          if(!matchesDateWindow([f.startAt,f.createdAt],filters))return false;
          return matchesKeyword([f.note,f.stateType,frontingStateLabels[f.stateType],f.memoryRating,frontingMemoryLabels[f.memoryRating],frontingNamesForSearch(f)],filters);
        }).map(f=>({
          type:"fronting",
          id:f.id,
          timestamp:resultTimestamp([f.updatedAt,f.endAt,f.startAt,f.createdAt]),
          title:frontingStateLabels[f.stateType]||f.stateType||"前台",
          meta:[frontingNamesForSearch(f)||"未记录成员",`${formatSearchTime(f.startAt||f.createdAt)} → ${f.endAt?formatSearchTime(f.endAt):"仍在进行"}`],
          summary:getSearchResultSummary(f.note||frontingMemoryLabels[f.memoryRating]||"",170),
          actionLabel:"打开前台日志"
        }));
      }
      function taskAssignedNames(task){
        const ids=searchArray(task?.assignedMemberIds);
        return ids.length?ids.map(id=>searchMemberName(id)).join(" / "):"可留空";
      }
      function linkedHandoffText(task){
        if(!task?.linkedHandoffId)return "";
        return searchArray(searchData().handoffNotes).find(n=>n&&n.id===task.linkedHandoffId)?.text||"";
      }
      function collectTaskResults(filters){
        if(nonMessageBlockedByMessageOnlyFilters(filters)||filters.roomId||filters.currentRoomOnly)return [];
        return searchArray(searchData().tasks).filter(t=>{
          if(!t)return false;
          const ids=searchArray(t.assignedMemberIds);
          if(filters.memberId&&!ids.includes(filters.memberId))return false;
          if(!matchesDateWindow([t.createdAt,t.updatedAt,t.dueAt],filters))return false;
          return matchesKeyword([t.title,t.detail,t.status,taskStatusLabels[t.status],taskAssignedNames(t),linkedHandoffText(t)],filters);
        }).map(t=>({
          type:"task",
          id:t.id,
          timestamp:resultTimestamp([t.updatedAt,t.createdAt,t.dueAt]),
          title:t.title||"未命名任务",
          meta:[taskStatusLabels[t.status]||t.status||"未记录状态",t.dueAt?`截止 ${formatSearchTime(t.dueAt)}`:"截止可留空",`认领：${taskAssignedNames(t)}`],
          summary:getSearchResultSummary([t.detail,linkedHandoffText(t)].filter(Boolean).join(" "),170),
          actionLabel:"打开任务列表"
        }));
      }
      function collectSearchResults(filters){
        const items=[];
        if(typeEnabled(filters,"messages"))items.push(...collectMessageResults(filters));
        if(!filters?.hasImage){
          if(typeEnabled(filters,"members"))items.push(...collectMemberResults(filters));
          if(typeEnabled(filters,"rooms"))items.push(...collectRoomResults(filters));
          if(typeEnabled(filters,"handoffs"))items.push(...collectHandoffResults(filters));
          if(typeEnabled(filters,"polls"))items.push(...collectPollResults(filters));
          if(typeEnabled(filters,"fronting"))items.push(...collectFrontingResults(filters));
          if(typeEnabled(filters,"tasks"))items.push(...collectTaskResults(filters));
        }
        items.sort((a,b)=>(b.timestamp||0)-(a.timestamp||0));
        const limited=items.slice(0,SEARCH_LIMIT);
        limited.totalCount=items.length;
        limited.limited=items.length>SEARCH_LIMIT;
        return limited;
      }
      function renderAdvancedSearchResults(results){
        const box=document.getElementById("advancedSearchResults");
        if(!box)return;
        const rows=Array.isArray(results)?results:[];
        if(!rows.length){
          box.innerHTML='<div class="search-empty">没有找到匹配结果。可以换个关键词，或放宽筛选条件。</div>';
          return;
        }
        const note=rows.limited?'<div class="search-limit-note">结果较多，仅显示前 100 条。</div>':"";
        box.innerHTML=note+rows.map(result=>{
          const meta=searchArray(result.meta).filter(Boolean).map(searchEscape).join(" · ");
          const typeLabel=result.typeLabel||getSearchTypeLabel(result.type);
          return `<div class="advanced-search-result"><div class="advanced-search-result-title"><span>${searchEscape(typeLabel)}</span><strong>${searchEscape(result.title||typeLabel)}</strong></div>${meta?`<div class="advanced-search-result-meta">${meta}</div>`:""}<div class="advanced-search-result-summary">${searchEscape(result.summary||"（无摘要）")}</div><div class="advanced-search-result-actions"><button class="light small" type="button" data-search-type="${searchEscape(result.type)}" data-search-id="${searchEscape(result.id)}">${searchEscape(result.actionLabel||"打开")}</button></div></div>`;
        }).join("");
      }
      function openModalById(id){
        if(typeof openModal==="function")openModal(id);
        else {
          const modal=document.getElementById(id);
          if(modal)modal.style.display="flex";
        }
      }
      function renderAfterJump(afterRender){
        try{
          const result=typeof render==="function"?render():null;
          Promise.resolve(result).then(()=>afterRender&&afterRender()).catch(err=>{console.error("search jump render failed",err); afterRender&&afterRender();});
        }catch(err){
          console.error("search jump render failed",err);
          afterRender&&afterRender();
        }
      }
      function selectSearchTab(next){
        try{
          if(typeof setTab==="function"){setTab(next); return;}
        }catch(err){console.warn("search setTab failed",err);}
        try{
          tab=next;
          document.getElementById("tabRooms")?.classList.toggle("active",next==="rooms");
          document.getElementById("tabPrivate")?.classList.toggle("active",next==="private");
          document.getElementById("tabMembers")?.classList.toggle("active",next==="members");
          if(typeof renderList==="function")renderList();
        }catch(err){console.warn("search tab fallback failed",err);}
      }
      function jumpToSearchResult(type,id){
        try{
          if(!type||!id){alert("这个搜索结果缺少定位信息。"); return;}
          const d=searchData();
          if(type==="message"){
            const message=searchArray(d.messages).find(m=>m&&m.id===id);
            if(!message){alert("这条消息可能已经被删除。"); return;}
            const targetRoom=searchRoomById(message.roomId);
            if(!targetRoom){alert("这条消息所属对话已经不存在。"); return;}
            currentRoomId=message.roomId;
            selectSearchTab(targetRoom.type==="private"?"private":"rooms");
            window._pendingSearchHitMessageId=id;
            closeAdvancedSearchModal();
            renderAfterJump(()=>highlightSearchHitMessage(id));
            return;
          }
          if(type==="room"){
            const targetRoom=searchRoomById(id);
            if(!targetRoom){alert("这个对话可能已经被删除。"); return;}
            currentRoomId=targetRoom.id;
            selectSearchTab(targetRoom.type==="private"?"private":"rooms");
            closeAdvancedSearchModal();
            renderAfterJump();
            return;
          }
          if(type==="member"){
            const targetMember=searchMemberById(id);
            if(!targetMember){alert("这个成员可能已经被删除。"); return;}
            closeAdvancedSearchModal();
            selectSearchTab("members");
            renderAfterJump(()=>{if(typeof window.editMember==="function")window.editMember(id);});
            return;
          }
          if(type==="handoff"){
            const note=searchArray(d.handoffNotes).find(n=>n&&n.id===id);
            if(!note){alert("这条交接可能已经被删除。"); return;}
            if(note.roomId&&searchRoomById(note.roomId))currentRoomId=note.roomId;
            closeAdvancedSearchModal();
            if(typeof window.openHandoffModal==="function")window.openHandoffModal();
            else {if(typeof renderHandoff==="function")renderHandoff(); openModalById("handoffModal");}
            return;
          }
          if(type==="poll"){
            const poll=searchArray(d.polls).find(p=>p&&p.id===id);
            if(!poll){alert("这个投票可能已经被删除。"); return;}
            if(poll.roomId&&searchRoomById(poll.roomId))currentRoomId=poll.roomId;
            closeAdvancedSearchModal();
            if(typeof renderPolls==="function")renderPolls();
            openModalById("pollModal");
            return;
          }
          if(type==="fronting"){
            const log=searchArray(d.frontingLogs).find(f=>f&&f.id===id);
            if(!log){alert("这条前台记录可能已经被删除。"); return;}
            closeAdvancedSearchModal();
            if(typeof window.openFrontingModal==="function")window.openFrontingModal();
            else {if(typeof window.renderFrontingList==="function")window.renderFrontingList(); openModalById("frontingModal");}
            return;
          }
          if(type==="task"){
            const task=searchArray(d.tasks).find(t=>t&&t.id===id);
            if(!task){alert("这个任务可能已经被删除。"); return;}
            const linked=task.linkedHandoffId?searchArray(d.handoffNotes).find(n=>n&&n.id===task.linkedHandoffId):null;
            if(linked?.roomId&&searchRoomById(linked.roomId))currentRoomId=linked.roomId;
            closeAdvancedSearchModal();
            if(typeof window.openHandoffModal==="function")window.openHandoffModal();
            else openModalById("handoffModal");
            if(typeof window.renderTasks==="function")window.renderTasks();
            return;
          }
          alert("暂时不能定位这个类型的搜索结果。");
        }catch(err){
          console.error("jumpToSearchResult failed",err);
          alert("定位失败了。可以刷新后再试一次。");
        }
      }
      function searchSelectorValue(value){
        return String(value||"").replace(/\\/g,"\\\\").replace(/"/g,'\\"');
      }
      function highlightSearchHitMessage(messageId,attempt=0){
        const id=String(messageId||"");
        if(!id)return false;
        const el=document.querySelector(`.msg[data-message-id="${searchSelectorValue(id)}"]`);
        if(!el){
          if(attempt<8)setTimeout(()=>highlightSearchHitMessage(id,attempt+1),80);
          return false;
        }
        try{el.scrollIntoView({behavior:"smooth",block:"center"});}catch{el.scrollIntoView();}
        el.classList.add("search-hit-flash");
        window._pendingSearchHitMessageId=id;
        setTimeout(()=>{
          el.classList.remove("search-hit-flash");
          if(window._pendingSearchHitMessageId===id)window._pendingSearchHitMessageId="";
        },1800);
        return true;
      }

      window.openAdvancedSearchModal=openAdvancedSearchModal;
      window.closeAdvancedSearchModal=closeAdvancedSearchModal;
      window.populateAdvancedSearchFilters=populateAdvancedSearchFilters;
      window.resetAdvancedSearchFilters=resetAdvancedSearchFilters;
      window.collectAdvancedSearchFilters=collectAdvancedSearchFilters;
      window.collectSearchResults=collectSearchResults;
      window.renderAdvancedSearchResults=renderAdvancedSearchResults;
      window.jumpToSearchResult=jumpToSearchResult;
      window.normalizeSearchText=normalizeSearchText;
      window.searchTextIncludes=searchTextIncludes;
      window.highlightSearchHitMessage=highlightSearchHitMessage;
      window.getSearchResultSummary=getSearchResultSummary;
      window.getSearchTypeLabel=getSearchTypeLabel;
    })();
