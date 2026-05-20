    const SYSTEM_PROFILE_EXPORT_LABELS={systemName:"系统名称",collectiveName:"集体称呼",systemTypeText:"系统类型 / 自定义描述",description:"系统简介",frontingNotes:"前台/共前台备注",boundaries:"系统边界",comfortMethods:"安抚方式",safetyNotes:"安全提醒"};
    function getRedactionOptions(){const redacted=!!document.getElementById("exportRedacted")?.checked; const aliasMap=buildMemberAliasMap(redacted&&!!document.getElementById("exportHideMemberNames")?.checked); return {redacted,excludePrivate:redacted&&!!document.getElementById("exportExcludePrivate")?.checked,hideMemberNames:redacted&&!!document.getElementById("exportHideMemberNames")?.checked,aliasMap};}
    function shouldUseRedactedExport(){return !!document.getElementById("exportRedacted")?.checked;}
    function updateRedactionControls(){const redacted=shouldUseRedactedExport(); const exclude=document.getElementById("exportExcludePrivate"), hide=document.getElementById("exportHideMemberNames"); if(exclude)exclude.disabled=!redacted; if(hide)hide.disabled=!redacted;}
    function buildMemberAliasMap(hide=true){const map={hide,byId:new Map(),byName:new Map(),unknownCount:0}; if(!hide)return map; (data.members||[]).forEach((m,index)=>{const alias=`成员 ${index+1}`; if(m.id)map.byId.set(m.id,alias); if(m.name)map.byName.set(m.name,alias); (Array.isArray(m.aliases)?m.aliases:[]).forEach(name=>{if(name)map.byName.set(name,alias);});}); return map;}
    function redactMemberName(memberId,map,fallbackName=""){if(!map?.hide)return fallbackName||member(memberId)?.name||"已移除成员"; if(memberId&&map.byId.has(memberId))return map.byId.get(memberId); const source=String(fallbackName||"").trim(); if(source&&map.byName.has(source))return map.byName.get(source); if(source){map.unknownCount+=1; const alias=`成员 ${map.byId.size+map.unknownCount}`; map.byName.set(source,alias); return alias;} return "成员";}
    function redactTextForExport(text,options){let out=String(text||""); if(!options?.hideMemberNames)return out; const pairs=[...options.aliasMap.byName.entries()].filter(([name])=>name).sort((a,b)=>b[0].length-a[0].length); pairs.forEach(([name,alias])=>{out=out.split(name).join(alias);}); return out;}
    function redactSystemProfileForExport(profile,visibility,level="public"){const source={...blankSystemProfile(),...(profile||{})}; const visible=normalizeSystemProfileVisibilityRecord(visibility); const out={}; Object.keys(SYSTEM_PROFILE_EXPORT_LABELS).forEach(key=>{if(visible[key]===level&&String(source[key]||"").trim())out[key]=source[key];}); return out;}
    function filterRoomsForRedactedExport(rooms,options){return options?.redacted&&options.excludePrivate?rooms.filter(r=>!isPrivateRoom(r)):rooms;}
    function filterMessagesForRedactedExport(messages,options,rooms){if(!(options?.redacted&&options.excludePrivate))return messages; const ids=new Set((rooms||[]).map(r=>r.id)); return messages.filter(m=>ids.has(m.roomId));}
    function redactPollForExport(poll,options){const source=poll||{}; return {...source,comments:options?.redacted?{}:source.comments||{},decisionText:redactTextForExport(source.decisionText||"",options)};}
    function redactTaskForExport(task,options){const source=task||{}; return {...source,title:redactTextForExport(source.title||"",options),detail:redactTextForExport(source.detail||"",options)};}
    function redactedRoomName(room,options){return redactTextForExport(roomDisplayName(room)||"未知群组",options);}
    function redactedRoomDesc(room,options){return redactTextForExport(roomDisplayDesc(room)||"",options);}
    function redactedMemberNameByMessage(message,options){if(!options?.hideMemberNames)return memberNameByMessage(message); return redactMemberName(message.speakerId,options.aliasMap,memberNameByMessage(message));}
    function redactedMessageText(message,options){const text=redactTextForExport(message.text||"",options); const hasImage=!!(message.imageData||message.imageId); return `${text}${hasImage?`${text?"\n":""}[含图片]`:""}`;}
    function redactedMdMessageBody(message,options){const text=redactTextForExport(message.text||"",options).replace(/\n/g,"\n  "); const image=(message.imageData||message.imageId)?"[含图片]":""; return [text,image].filter(Boolean).join(text&&image?"\n\n  ":"");}
    function redactedSystemProfileLines(options){const profile=redactSystemProfileForExport(data.systemProfile, data.systemProfileVisibility, "public"); return Object.entries(profile).map(([key,value])=>({label:SYSTEM_PROFILE_EXPORT_LABELS[key]||key,value:redactTextForExport(value,options)}));}
    function redactedSystemProfileBlock(format,options){const lines=redactedSystemProfileLines(options); if(!lines.length)return ""; if(format==="md")return ["## 系统公开资料",...lines.map(row=>`- **${row.label}**：${row.value}`),"","可见性只影响本应用内展示和导出，不是加密隔离。"].join("\n"); return ["【系统公开资料】",...lines.map(row=>`${row.label}：${row.value}`),"可见性只影响本应用内展示和导出，不是加密隔离。"].join("\n");}
    function openExportModal(){document.getElementById("exportRoom").innerHTML=data.rooms.map(r=>`<option value="${r.id}">${esc(roomDisplayName(r))}</option>`).join(""); document.getElementById("exportRoom").value=currentRoomId; document.getElementById("exportScope").value="current"; const redacted=document.getElementById("exportRedacted"), exclude=document.getElementById("exportExcludePrivate"), hide=document.getElementById("exportHideMemberNames"); if(redacted)redacted.checked=false; if(exclude)exclude.checked=true; if(hide)hide.checked=false; resetReviewExportControls(); resetEncryptedImportControls(); updateRedactionControls(); updateExportRoomPicker(); updateReviewExportOptionsVisibility(); updateEncryptedBackupOptionsVisibility(); openModal("exportModal");}
    function updateExportRoomPicker(){const isRoom=document.getElementById("exportScope").value==="room"; document.getElementById("exportRoom").style.display=isRoom?"block":"none"; document.getElementById("exportRoomLabel").style.display=isRoom?"block":"none";}
    function selectedExportRooms(){const scope=document.getElementById("exportScope").value; if(scope==="all")return data.rooms; if(scope==="room")return data.rooms.filter(r=>r.id===document.getElementById("exportRoom").value); return data.rooms.filter(r=>r.id===currentRoomId);}
    function selectedExportData(){const rooms=selectedExportRooms(); const ids=new Set(rooms.map(r=>r.id)); const messages=data.messages.filter(m=>ids.has(m.roomId)); return {rooms,messages};}
    function formatExport(format){
      const selected=selectedExportData();
      const selectedRoomIds=new Set(selected.rooms.map(r=>r.id));
      const includeLedger=document.getElementById("exportScope").value==="all";
      if(format==="json")return {text:JSON.stringify({app:"月之暗面",version:2,exportedAt:now(),nextSeq:data.nextSeq,tags:data.tags||[],messageKinds:data.messageKinds||DEFAULT_KINDS,polls:(data.polls||[]).filter(p=>selectedRoomIds.has(p.roomId)),handoffNotes:(data.handoffNotes||[]).filter(n=>selectedRoomIds.has(n.roomId)),frontingLogs:data.frontingLogs||[],...(includeLedger?{tasks:data.tasks||[],careLogs:data.careLogs||[],careChecklist:data.careChecklist||[],ledgerRecords:normalizeLedgerRecordsForBackup(getRuntimeLedgerRecordsForBackup())}:{}),systemProfile:data.systemProfile||blankSystemProfile(),systemProfileVisibility:normalizeSystemProfileVisibilityRecord(data.systemProfileVisibility),memberRelations:data.memberRelations||[],externalSystemCards:data.externalSystemCards||[],rooms:selected.rooms,members:data.members,messages:selected.messages},null,2),type:"application/json",ext:"json"};
      const options=getRedactionOptions();
      const rooms=filterRoomsForRedactedExport(selected.rooms,options);
      const messages=filterMessagesForRedactedExport(selected.messages,options,rooms);
      if(format==="csv"){
        const header=["群组","时间","校验码","校验","发言者","类型","内容"].map(csvCell).join(",");
        const profileRows=options.redacted?redactedSystemProfileLines(options).map(row=>["系统公开资料",new Date().toLocaleString(),"","", "系统档案",row.label,row.value].map(csvCell).join(",")):[];
        const rows=messages.map(m=>{const r=data.rooms.find(room=>room.id===m.roomId); return [r?redactedRoomName(r,options):"未知群组",new Date(m.createdAt).toLocaleString(),seqCode(m),integrityOk(m)?"正常":"异常",redactedMemberNameByMessage(m,options),m.kind,options.redacted?redactedMessageText(m,options):messageText(m)].map(csvCell).join(",");});
        return {text:[header,...profileRows,...rows].join("\n"),type:"text/csv;charset=utf-8",ext:"csv"};
      }
      const profileBlock=options.redacted?redactedSystemProfileBlock(format,options):"";
      const blocks=rooms.map(r=>{
        const rows=messages.filter(m=>m.roomId===r.id);
        if(format==="md"){
          return [`# ${redactedRoomName(r,options)}`,redactedRoomDesc(r,options)?`> ${redactedRoomDesc(r,options)}`:"",...rows.map(m=>`- **${new Date(m.createdAt).toLocaleString()}｜校验码 ${seqCode(m)}｜${redactedMemberNameByMessage(m,options)}｜${m.kind}**\n\n  ${options.redacted?redactedMdMessageBody(m,options):mdMessageBody(m)}`)].filter(Boolean).join("\n\n");
        }
        return [`【${redactedRoomName(r,options)}】`,redactedRoomDesc(r,options)||"",...rows.map(m=>`[${new Date(m.createdAt).toLocaleString()}] 校验码 ${seqCode(m)} · ${redactedMemberNameByMessage(m,options)} · ${m.kind}\n${options.redacted?redactedMessageText(m,options):messageText(m)}`)].filter(Boolean).join("\n\n");
      });
      return {text:[profileBlock,blocks.join("\n\n---\n\n")].filter(Boolean).join("\n\n---\n\n"),type:"text/plain;charset=utf-8",ext:format};
    }
    const REVIEW_EXPORT_FORMATS=new Set(["review-md","review-txt"]);
    let pendingEncryptedBackupEnvelope=null;
    const REVIEW_TIMELINE_LIMIT=100;
    const REVIEW_ROOM_MESSAGE_LIMIT=10;
    const REVIEW_TEXT_LIMIT=160;
    function isReviewExportFormat(format){return REVIEW_EXPORT_FORMATS.has(String(format||""));}
    function reviewData(){try{return data&&typeof data==="object"?data:{};}catch{return {};}}
    function reviewArray(value){return Array.isArray(value)?value:[];}
    function reviewTerm(key,fallback){try{if(typeof term==="function")return term(key);}catch{} return fallback||key;}
    function reviewLocalDateInput(date){
      const d=date instanceof Date?date:new Date(date||Date.now());
      const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);
      return local.toISOString().slice(0,10);
    }
    function reviewDefaultRangeInputs(date=new Date()){
      const start=new Date(date.getFullYear(),date.getMonth(),1);
      const end=new Date(date.getFullYear(),date.getMonth()+1,0);
      return {start:reviewLocalDateInput(start),end:reviewLocalDateInput(end)};
    }
    function setReviewExportDefaultDates(force=false){
      const defaults=reviewDefaultRangeInputs();
      const start=document.getElementById("reviewExportStart");
      const end=document.getElementById("reviewExportEnd");
      if(start&&(force||!start.value))start.value=defaults.start;
      if(end&&(force||!end.value))end.value=defaults.end;
    }
    function resetReviewExportControls(){
      setReviewExportDefaultDates(true);
      ["reviewIncludeOverview","reviewIncludeTimeline","reviewIncludeMessages","reviewIncludeFronting","reviewIncludeHandoffs","reviewIncludePolls","reviewIncludeTasks","reviewIncludeCare"].forEach(id=>{const el=document.getElementById(id); if(el)el.checked=true;});
    }
    function updateReviewExportOptionsVisibility(){
      const format=document.getElementById("exportFormat")?.value||"";
      const box=document.getElementById("reviewExportOptions");
      if(!box)return;
      const active=isReviewExportFormat(format);
      if(active)setReviewExportDefaultDates(false);
      box.classList.toggle("active",active);
    }
    function updateEncryptedBackupOptionsVisibility(){
      const active=document.getElementById("exportFormat")?.value==="encrypted-json";
      const box=document.getElementById("encryptedBackupOptions");
      if(box)box.hidden=!active;
      if(!active)clearEncryptedBackupPasswordFields();
    }
    function clearEncryptedBackupPasswordFields(){
      const pass=document.getElementById("encryptedBackupPassword");
      const confirm=document.getElementById("encryptedBackupPasswordConfirm");
      if(pass)pass.value="";
      if(confirm)confirm.value="";
    }
    function resetEncryptedImportControls(){
      pendingEncryptedBackupEnvelope=null;
      const box=document.getElementById("encryptedImportBox");
      const input=document.getElementById("importEncryptedBackupPassword");
      const btn=document.getElementById("importBtn");
      if(box)box.hidden=true;
      if(input)input.value="";
      if(btn)btn.textContent="导入 JSON";
    }
    function showEncryptedImportControls(envelope){
      pendingEncryptedBackupEnvelope=envelope;
      const box=document.getElementById("encryptedImportBox");
      const input=document.getElementById("importEncryptedBackupPassword");
      const btn=document.getElementById("importBtn");
      if(box)box.hidden=false;
      if(input){input.value=""; setTimeout(()=>input.focus(),0);}
      if(btn)btn.textContent="解密并导入";
    }
    function getEncryptedBackupPasswordFields(){
      const password=normalizeEncryptedBackupPassword(document.getElementById("encryptedBackupPassword")?.value||"");
      const confirm=normalizeEncryptedBackupPassword(document.getElementById("encryptedBackupPasswordConfirm")?.value||"");
      return {password,confirm};
    }
    function validateEncryptedBackupPasswords(password,confirm){
      if(!password){alert("请填写备份密码。"); return false;}
      if(password.length<8){alert("备份密码至少需要 8 个字符。建议使用更长的密码。"); return false;}
      if(password!==confirm){alert("两次输入的备份密码不一致。"); return false;}
      return true;
    }
    function encryptedBackupFilename(date=new Date()){
      const pad=n=>String(n).padStart(2,"0");
      return `moon-backup-encrypted-${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}.moonenc.json`;
    }
    function encryptedBackupErrorMessage(err){
      if(err?.message==="web_crypto_unavailable")return "当前浏览器不支持本地加密所需的 Web Crypto API。";
      if(err?.message==="decrypt_failed")return "解密失败：密码不正确，或备份文件已损坏。当前数据没有被修改。";
      if(err?.message==="invalid_encrypted_backup")return "这不是有效的月之暗面加密备份。";
      if(err?.message==="invalid_backup")return "解密成功，但内容不是有效的月之暗面 JSON 备份。当前数据没有被修改。";
      return err?.message||err||"未知错误";
    }
    function collectReviewExportOptions(){
      const base=getRedactionOptions();
      const checked=(id,defaultValue=true)=>{const el=document.getElementById(id); return el?!!el.checked:!!defaultValue;};
      const options={...base,startDate:document.getElementById("reviewExportStart")?.value||"",endDate:document.getElementById("reviewExportEnd")?.value||"",include:{overview:checked("reviewIncludeOverview"),timeline:checked("reviewIncludeTimeline"),messages:checked("reviewIncludeMessages"),fronting:checked("reviewIncludeFronting"),handoffs:checked("reviewIncludeHandoffs"),polls:checked("reviewIncludePolls"),tasks:checked("reviewIncludeTasks"),care:checked("reviewIncludeCare")}};
      options.aliasMap=makeReviewMemberAliasMap(options);
      return options;
    }
    function getReviewDateRange(options={}){
      const defaults=reviewDefaultRangeInputs();
      const startInput=String(options.startDate||defaults.start).trim();
      const endInput=String(options.endDate||defaults.end).trim();
      const start=new Date(`${startInput}T00:00:00`);
      const end=new Date(`${endInput}T23:59:59.999`);
      if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime()))return {error:"日期格式无效，请重新选择开始日期和结束日期。"};
      if(end.getTime()<start.getTime())return {error:"结束日期需要不早于开始日期。"};
      return {startInput,endInput,startMs:start.getTime(),endMs:end.getTime(),label:`${startInput} 至 ${endInput}`};
    }
    function reviewTimeMs(value){
      if(!value)return 0;
      if(typeof value==="number")return Number.isFinite(value)?value:0;
      const raw=String(value||"").trim();
      const t=/^\d{4}-\d{2}-\d{2}$/.test(raw)?new Date(`${raw}T12:00:00`).getTime():new Date(raw).getTime();
      return Number.isFinite(t)?t:0;
    }
    function reviewFirstTime(values){
      const list=Array.isArray(values)?values:[values];
      for(const value of list){const t=reviewTimeMs(value); if(t)return t;}
      return 0;
    }
    function reviewDateMatches(values,range){
      const list=(Array.isArray(values)?values:[values]).flat().filter(Boolean);
      if(!list.length)return false;
      return list.some(value=>{const t=reviewTimeMs(value); return t&&t>=range.startMs&&t<=range.endMs;});
    }
    function filterRecordsByReviewDate(records,getDate,range){
      return reviewArray(records).filter(record=>record&&reviewDateMatches(getDate(record),range));
    }
    function makeReviewMemberAliasMap(options){return buildMemberAliasMap(!!(options?.redacted&&options?.hideMemberNames));}
    function reviewMemberById(memberId){return reviewArray(reviewData().members).find(m=>m&&m.id===memberId)||null;}
    function reviewRoomById(roomId){return reviewArray(reviewData().rooms).find(r=>r&&r.id===roomId)||null;}
    function reviewMemberName(memberId,options={},fallbackName=""){
      if(memberId==="system")return fallbackName||"系统记录";
      const name=fallbackName||reviewMemberById(memberId)?.name||`已移除${reviewTerm("member","成员")}`;
      return options?.hideMemberNames?redactMemberName(memberId,options.aliasMap,name):name;
    }
    function reviewRoomName(roomId,options={}){
      const room=reviewRoomById(roomId);
      if(!room)return "未知对话";
      const raw=typeof roomDisplayName==="function"?roomDisplayName(room):(room.name||"未命名对话");
      return options?.hideMemberNames?redactTextForExport(raw,options):raw;
    }
    function summarizeReviewText(text,maxLength=REVIEW_TEXT_LIMIT){
      const max=Math.max(24,Number(maxLength)||REVIEW_TEXT_LIMIT);
      const cleaned=String(text==null?"":text).replace(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g,"[图片内容已省略]").replace(/\s+/g," ").trim();
      return cleaned.length>max?`${cleaned.slice(0,max)}...`:cleaned;
    }
    function reviewFormatDateTime(value){
      const d=new Date(value||"");
      return Number.isNaN(d.getTime())?"未记录时间":d.toLocaleString();
    }
    function reviewFilenameStamp(date=new Date()){
      const pad=n=>String(n).padStart(2,"0");
      return `${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
    }
    function reviewRedactedText(value,options,maxLength=REVIEW_TEXT_LIMIT){
      return summarizeReviewText(redactTextForExport(value||"",options),maxLength);
    }
    function reviewIsPrivateRoomId(roomId){
      const room=reviewRoomById(roomId);
      if(!room)return false;
      try{if(typeof isPrivateRoom==="function")return isPrivateRoom(room);}catch{}
      return room.type==="private";
    }
    function reviewRoomAllowed(roomId,options){
      if(!roomId)return true;
      return !(options?.redacted&&options?.excludePrivate&&reviewIsPrivateRoomId(roomId));
    }
    function reviewLinkedHandoffForTask(task){
      const id=task?.linkedHandoffId||"";
      if(!id)return null;
      return reviewArray(reviewData().handoffNotes).find(note=>note&&note.id===id)||null;
    }
    function reviewTaskRoomId(task){return task?.roomId||reviewLinkedHandoffForTask(task)?.roomId||"";}
    function reviewStatusText(type,value){
      if(type==="fronting"){try{if(typeof window.frontingStateText==="function")return window.frontingStateText(value);}catch{} return {front:reviewTerm("fronting","前台"),cofront:reviewTerm("cofronting","共前台"),near:`靠近${reviewTerm("fronting","前台")}`,observer:"旁观 / 在场",blended:"混合 / 模糊",unknown:"未知 / 不确定"}[value]||reviewTerm("fronting","前台");}
      if(type==="memory"){try{if(typeof window.frontingMemoryText==="function")return window.frontingMemoryText(value);}catch{} return {full:"完整",partial:"部分",none:"无",unknown:"不确定"}[value]||"未记录";}
      if(type==="poll"){try{if(typeof window.pollStatusText==="function")return window.pollStatusText(value);}catch{} return {open:"进行中",closed:"已结束",done:"已结束",decided:"已结束",canceled:"已取消",cancelled:"已取消",paused:"已暂停"}[String(value||"open")]||value||"未记录";}
      if(type==="voteMode"){try{if(typeof window.pollVoteModeText==="function")return window.pollVoteModeText(value);}catch{} return {simple:"简单多数",consensus:"共识优先"}[String(value||"simple")]||"简单多数";}
      if(type==="task")return {todo:"待接力",doing:"进行中",done:"已完成",paused:"已暂停"}[String(value||"todo")]||value||"未记录";
      return value||"未记录";
    }
    function reviewCountTop(rows,reader,limit=5){
      const counts=new Map();
      reviewArray(rows).forEach(row=>{const key=String(reader(row)||"").trim(); if(key)counts.set(key,(counts.get(key)||0)+1);});
      return [...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],"zh-Hans-CN")).slice(0,limit);
    }
    function reviewMessageHasImage(message){return !!(message?.imageId||message?.imageData);}
    function reviewMessageSpeaker(message,options){return reviewMemberName(message?.speakerId,options,message?.speakerName||"未知");}
    function reviewCareSummary(log,options){
      let text="";
      try{if(typeof window.summarizeCareLog==="function")text=window.summarizeCareLog(log);}catch{}
      if(!text){
        text=["hunger","thirst","sleep","pain","energy","sensory","mood","meds","note"].map(key=>String(log?.[key]||"").trim()).filter(Boolean).join("；");
      }
      return reviewRedactedText(text,options,180);
    }
    function reviewPollCommentRows(poll,options){
      if(options?.redacted)return [{hidden:true,text:"投票理由已隐藏"}];
      const comments=poll?.comments;
      const rows=[];
      if(comments&&typeof comments==="object"&&!Array.isArray(comments)){
        Object.entries(comments).forEach(([memberId,text])=>{if(String(text||"").trim())rows.push({memberId,text:String(text||"")});});
      }else if(Array.isArray(comments)){
        comments.forEach(item=>{
          if(typeof item==="string"&&item.trim())rows.push({memberId:"",text:item});
          else if(item&&typeof item==="object"&&String(item.text||item.body||item.note||"").trim())rows.push({memberId:item.memberId||"",memberName:item.memberName||"",text:item.text||item.body||item.note||""});
        });
      }
      return rows.slice(0,8).map(row=>({memberName:reviewMemberName(row.memberId,options,row.memberName||""),text:reviewRedactedText(row.text,options,120)}));
    }
    function buildReviewTimelineEvents(reportData,options){
      const events=[];
      reportData.messages.forEach(message=>{
        const body=reviewRedactedText(message.text||"",options,140);
        const image=reviewMessageHasImage(message)?"含图片":"";
        events.push({time:message.createdAt,type:"消息",summary:[`${reviewMessageSpeaker(message,options)}：${body||"（无正文）"}`,image,message.kind?`分类：${message.kind}`:""].filter(Boolean).join(" · ")});
      });
      reportData.frontingLogs.forEach(log=>events.push({time:log.startAt||log.createdAt,type:reviewTerm("fronting","前台"),summary:[reviewStatusText("fronting",log.stateType||"front"),reviewFrontingMembers(log,options),log.memoryRating?`记忆：${reviewStatusText("memory",log.memoryRating)}`:"",reviewRedactedText(log.note||"",options,120)].filter(Boolean).join(" · ")}));
      reportData.handoffNotes.forEach(note=>events.push({time:note.createdAt,type:reviewTerm("handoff","交接"),summary:[note.roomId?reviewRoomName(note.roomId,options):"",reviewRedactedText(note.text||"",options,150)].filter(Boolean).join(" · ")}));
      reportData.polls.forEach(poll=>events.push({time:reviewFirstTime([poll.updatedAt,poll.closedAt,poll.createdAt]),type:`${reviewTerm("decision","议题")} / ${reviewTerm("poll","投票")}`,summary:[reviewRedactedText(poll.title||`未命名${reviewTerm("decision","议题")}`,options,80),reviewStatusText("poll",poll.status),reviewRedactedText(poll.decisionText||poll.description||"",options,130)].filter(Boolean).join(" · ")}));
      reportData.tasks.forEach(task=>events.push({time:reviewFirstTime([task.updatedAt,task.createdAt,task.dueAt]),type:reviewTerm("task","任务"),summary:[reviewRedactedText(task.title||`未命名${reviewTerm("task","任务")}`,options,90),`状态：${reviewStatusText("task",task.status)}`,task.dueAt?`截止：${reviewFormatDateTime(task.dueAt)}`:"",reviewRedactedText(task.detail||"",options,110)].filter(Boolean).join(" · ")}));
      reportData.careLogs.forEach(log=>events.push({time:log.createdAt,type:reviewTerm("care","照护"),summary:reviewCareSummary(log,options)||"（无摘要）"}));
      reportData.careChecklist.forEach(item=>events.push({time:item.updatedAt||item.createdAt,type:`${reviewTerm("care","照护")}清单`,summary:`${reviewRedactedText(item.title||"未命名照护项",options,100)} · ${item.done?"已完成":"未完成"}`}));
      return events.filter(event=>reviewTimeMs(event.time)).sort((a,b)=>reviewTimeMs(b.time)-reviewTimeMs(a.time));
    }
    function reviewFrontingMembers(log,options){
      const ids=[...new Set([...(Array.isArray(log?.memberIds)?log.memberIds:[]),log?.primaryMemberId].map(id=>String(id||"").trim()).filter(Boolean))];
      return ids.length?ids.map(id=>reviewMemberName(id,options)).join(" / "):`未记录${reviewTerm("member","成员")}`;
    }
    function buildReviewReportData(options){
      const d=reviewData();
      const range=options.range||getReviewDateRange(options);
      const allowedRooms=reviewArray(d.rooms).filter(room=>reviewRoomAllowed(room.id,options));
      const allowedRoomIds=new Set(allowedRooms.map(room=>room.id));
      const roomFilter=recordRoomId=>!recordRoomId||allowedRoomIds.has(recordRoomId);
      const messages=filterRecordsByReviewDate(d.messages,m=>m.createdAt,range).filter(m=>m&&roomFilter(m.roomId));
      const frontingLogs=filterRecordsByReviewDate(d.frontingLogs,f=>[f.startAt,f.createdAt],range);
      const handoffNotes=filterRecordsByReviewDate(d.handoffNotes,n=>[n.createdAt,n.updatedAt],range).filter(n=>n&&roomFilter(n.roomId));
      const polls=filterRecordsByReviewDate(d.polls,p=>[p.createdAt,p.updatedAt,p.closedAt],range).filter(p=>p&&roomFilter(p.roomId));
      const tasks=filterRecordsByReviewDate(d.tasks,t=>[t.createdAt,t.updatedAt,t.dueAt],range).filter(task=>task&&roomFilter(reviewTaskRoomId(task)));
      const careLogs=filterRecordsByReviewDate(d.careLogs,log=>log.createdAt,range);
      const careChecklist=filterRecordsByReviewDate(d.careChecklist,item=>[item.updatedAt,item.createdAt],range);
      const completedTasks=tasks.filter(task=>String(task.status||"todo")==="done");
      const openTasks=tasks.filter(task=>String(task.status||"todo")!=="done");
      const unknownBlended=frontingLogs.filter(log=>["unknown","blended"].includes(String(log.stateType||""))).length;
      const kindTop=reviewCountTop(messages,m=>m.kind||"普通",5);
      const memberTop=reviewCountTop(messages.filter(m=>m.speakerId!=="system"),m=>reviewMessageSpeaker(m,options),5);
      const overview={messages:messages.length,fronting:frontingLogs.length,handoffs:handoffNotes.length,polls:polls.length,completedTasks:completedTasks.length,openTasks:openTasks.length,careLogs:careLogs.length,unknownBlended,kindTop,memberTop};
      const reportData={exportedAt:now(),range,rooms:allowedRooms,messages,frontingLogs,handoffNotes,polls,tasks,careLogs,careChecklist,completedTasks,openTasks,overview,hasPrivateContent:false,timeline:[]};
      reportData.hasPrivateContent=[...messages.map(m=>m.roomId),...handoffNotes.map(n=>n.roomId),...polls.map(p=>p.roomId),...tasks.map(reviewTaskRoomId)].some(reviewIsPrivateRoomId);
      reportData.timeline=buildReviewTimelineEvents(reportData,options);
      return reportData;
    }
    function reviewFormatTop(rows,emptyText){
      return rows.length?rows.map(([label,count])=>`${label}（${count} 次）`).join("、"):emptyText;
    }
    function reviewMessagesByRoom(reportData,options){
      const groups=new Map();
      reportData.messages.forEach(message=>{
        const id=message.roomId||"__unknown";
        if(!groups.has(id))groups.set(id,{id,name:message.roomId?reviewRoomName(message.roomId,options):"未知对话",messages:[]});
        groups.get(id).messages.push(message);
      });
      return [...groups.values()].map(group=>({...group,messages:group.messages.sort((a,b)=>reviewTimeMs(b.createdAt)-reviewTimeMs(a.createdAt))})).sort((a,b)=>reviewTimeMs(b.messages[0]?.createdAt)-reviewTimeMs(a.messages[0]?.createdAt));
    }
    function formatReviewOverviewMarkdown(reportData){
      const o=reportData.overview;
      return ["## 1. 概览统计","",`- 消息数：${o.messages}`,`- ${reviewTerm("fronting","前台")}记录数：${o.fronting}`,`- ${reviewTerm("handoff","交接")}数：${o.handoffs}`,`- ${reviewTerm("decision","议题")} / ${reviewTerm("poll","投票")}数：${o.polls}`,`- 完成${reviewTerm("task","任务")}数：${o.completedTasks}`,`- 未完成${reviewTerm("task","任务")}数：${o.openTasks}`,`- ${reviewTerm("care","照护")}记录数：${o.careLogs}`,`- ${reviewTerm("fronting","前台")} unknown / blended 次数：${o.unknownBlended}`,`- 常见消息分类 top 5：${reviewFormatTop(o.kindTop,"暂无")}`,`- ${reviewTerm("member","成员")}发言记录次数 top 5：${reviewFormatTop(o.memberTop,"暂无")}。这里只是记录次数，不代表谁更重要。`].join("\n");
    }
    function formatReviewTimelineMarkdown(reportData){
      const rows=reportData.timeline.slice(0,REVIEW_TIMELINE_LIMIT);
      const note=reportData.timeline.length>REVIEW_TIMELINE_LIMIT?"\n\n时间线较长，仅显示最近 100 条。":"";
      if(!rows.length)return "## 2. 时间线摘要\n\n没有符合范围的时间线记录。";
      return ["## 2. 时间线摘要","",...rows.map(event=>`- [${reviewFormatDateTime(event.time)}] ${event.type}：${event.summary||"（无摘要）"}`)].join("\n")+note;
    }
    function formatReviewMessagesMarkdown(reportData,options){
      const groups=reviewMessagesByRoom(reportData,options);
      if(!groups.length)return "## 3. 聊天摘要\n\n没有符合范围的聊天记录。";
      const blocks=groups.map(group=>{
        const rows=group.messages.slice(0,REVIEW_ROOM_MESSAGE_LIMIT).map(message=>`  - [${reviewFormatDateTime(message.createdAt)}] ${reviewMessageSpeaker(message,options)} / ${message.kind||"普通"}：${reviewRedactedText(message.text||"",options,130)||"（无正文）"}${reviewMessageHasImage(message)?" · 含图片":""}`);
        return [`### ${group.name}`,`- 消息数量：${group.messages.length}`,...rows].join("\n");
      });
      return ["## 3. 聊天摘要","",...blocks].join("\n\n");
    }
    function formatReviewFrontingMarkdown(reportData,options){
      if(!reportData.frontingLogs.length)return `## 4. ${reviewTerm("fronting","前台")}记录\n\n没有符合范围的${reviewTerm("fronting","前台")}记录。`;
      return [`## 4. ${reviewTerm("fronting","前台")}记录`,"",...reportData.frontingLogs.slice().sort((a,b)=>reviewTimeMs(b.startAt||b.createdAt)-reviewTimeMs(a.startAt||a.createdAt)).map(log=>`- 时间：${reviewFormatDateTime(log.startAt||log.createdAt)}；状态类型：${reviewStatusText("fronting",log.stateType||"front")}；${reviewTerm("member","成员")}：${reviewFrontingMembers(log,options)}；记忆清晰度：${reviewStatusText("memory",log.memoryRating||"")}；备注：${reviewRedactedText(log.note||"",options,150)||"无"}`)].join("\n");
    }
    function formatReviewHandoffsMarkdown(reportData,options){
      if(!reportData.handoffNotes.length)return `## 5. ${reviewTerm("handoff","交接")}\n\n没有符合范围的${reviewTerm("handoff","交接")}。`;
      return [`## 5. ${reviewTerm("handoff","交接")}`,"",...reportData.handoffNotes.slice().sort((a,b)=>reviewTimeMs(b.createdAt)-reviewTimeMs(a.createdAt)).map(note=>`- [${reviewFormatDateTime(note.createdAt)}] ${note.roomId?reviewRoomName(note.roomId,options):"未知对话"}：${reviewRedactedText(note.text||"",options,180)||"（无摘要）"}`)].join("\n");
    }
    function formatReviewPollsMarkdown(reportData,options){
      if(!reportData.polls.length)return `## 6. ${reviewTerm("decision","议题")} / ${reviewTerm("poll","投票")}\n\n没有符合范围的${reviewTerm("decision","议题")} / ${reviewTerm("poll","投票")}。`;
      const blocks=reportData.polls.slice().sort((a,b)=>reviewFirstTime([b.updatedAt,b.closedAt,b.createdAt])-reviewFirstTime([a.updatedAt,a.closedAt,a.createdAt])).map(poll=>{
        const comments=reviewPollCommentRows(poll,options);
        const commentText=comments.length?comments.map(row=>row.hidden?row.text:`${row.memberName||reviewTerm("member","成员")}：${row.text}`).join("；"):"暂无投票理由";
        return [`- 标题：${reviewRedactedText(poll.title||`未命名${reviewTerm("decision","议题")}`,options,120)}`,`  - 状态：${reviewStatusText("poll",poll.status)}`,`  - 决策方式：${reviewStatusText("voteMode",poll.voteMode)}`,`  - 最终决定：${reviewRedactedText(poll.decisionText||"",options,180)||"未记录"}`,`  - 复盘时间：${poll.reviewAt?reviewFormatDateTime(poll.reviewAt):"可留空"}`,`  - 评论摘要：${commentText}`].join("\n");
      });
      return [`## 6. ${reviewTerm("decision","议题")} / ${reviewTerm("poll","投票")}`,"",...blocks].join("\n\n");
    }
    function formatReviewTasksMarkdown(reportData,options){
      const group=(title,rows)=>rows.length?[`### ${title}`,...rows.slice().sort((a,b)=>reviewFirstTime([b.updatedAt,b.createdAt,b.dueAt])-reviewFirstTime([a.updatedAt,a.createdAt,a.dueAt])).map(task=>`- ${reviewRedactedText(task.title||`未命名${reviewTerm("task","任务")}`,options,120)}；状态：${reviewStatusText("task",task.status)}；截止时间：${task.dueAt?reviewFormatDateTime(task.dueAt):"可留空"}；认领成员：${reviewArray(task.assignedMemberIds).length?reviewArray(task.assignedMemberIds).map(id=>reviewMemberName(id,options)).join(" / "):"可留空"}；摘要：${reviewRedactedText(task.detail||"",options,150)||"无"}`)].join("\n"):`### ${title}\n没有记录。`;
      return [`## 7. ${reviewTerm("task","任务")}`,"",group(`未完成${reviewTerm("task","任务")}`,reportData.openTasks),"",group(`已完成${reviewTerm("task","任务")}`,reportData.completedTasks)].join("\n");
    }
    function formatReviewCareMarkdown(reportData,options){
      const done=reportData.careChecklist.filter(item=>item.done).length;
      const open=reportData.careChecklist.length-done;
      const logs=reportData.careLogs.slice().sort((a,b)=>reviewTimeMs(b.createdAt)-reviewTimeMs(a.createdAt)).slice(0,20);
      const lines=[`## 8. ${reviewTerm("care","照护")}记录`,"",`- ${reviewTerm("care","照护")}清单完成 / 未完成：${done} / ${open}`];
      if(logs.length)lines.push(...logs.map(log=>`- [${reviewFormatDateTime(log.createdAt)}] ${reviewMemberName(log.createdByMemberId,options,`未记录${reviewTerm("member","成员")}`)}：${reviewCareSummary(log,options)||"（无摘要）"}`));
      else lines.push(`- 没有符合范围的${reviewTerm("care","照护")}记录。`);
      return lines.join("\n");
    }
    function formatReviewReportMarkdown(reportData,options){
      const parts=["# 月之暗面复盘报告","","- 导出时间："+reviewFormatDateTime(reportData.exportedAt),"- 日期范围："+reportData.range.label,"- 报告说明：\n  本报告基于本机记录生成，仅用于自我整理或与可信对象沟通，不提供诊断、治疗或危机干预。"];
      if(options.include.overview)parts.push(formatReviewOverviewMarkdown(reportData));
      if(options.include.timeline)parts.push(formatReviewTimelineMarkdown(reportData));
      if(options.include.messages)parts.push(formatReviewMessagesMarkdown(reportData,options));
      if(options.include.fronting)parts.push(formatReviewFrontingMarkdown(reportData,options));
      if(options.include.handoffs)parts.push(formatReviewHandoffsMarkdown(reportData,options));
      if(options.include.polls)parts.push(formatReviewPollsMarkdown(reportData,options));
      if(options.include.tasks)parts.push(formatReviewTasksMarkdown(reportData,options));
      if(options.include.care)parts.push(formatReviewCareMarkdown(reportData,options));
      parts.push("## 9. 使用提醒\n\n以上内容只是本地记录整理，不代表状态判断或诊断。导出后请注意现实隐私和分享边界。");
      return parts.filter(Boolean).join("\n\n").replace(/\n{3,}/g,"\n\n").trim()+"\n";
    }
    function markdownToPlainReview(text){
      return String(text||"").replace(/^# (.*)$/gm,"$1\n====================").replace(/^##\s+\d+\.\s+(.*)$/gm,"\n$1\n--------------------").replace(/^###\s+(.*)$/gm,"\n$1").replace(/^\s*-\s+/gm,"- ").replace(/\*\*/g,"").replace(/\n{3,}/g,"\n\n").trim()+"\n";
    }
    function formatReviewReportText(reportData,options){return markdownToPlainReview(formatReviewReportMarkdown(reportData,options));}
    function generateReviewExport(format){
      const options=collectReviewExportOptions();
      options.format=format;
      const range=getReviewDateRange(options);
      if(range.error){alert(range.error); return null;}
      options.range=range;
      const reportData=buildReviewReportData(options);
      if(reportData.hasPrivateContent&&!(options.redacted&&options.excludePrivate)){
        if(!confirm("复盘报告可能包含私聊 / 小群聊内容，是否继续导出？"))return null;
      }
      const isMarkdown=format==="review-md";
      const text=isMarkdown?formatReviewReportMarkdown(reportData,options):formatReviewReportText(reportData,options);
      const ext=isMarkdown?"md":"txt";
      return {text,type:isMarkdown?"text/markdown;charset=utf-8":"text/plain;charset=utf-8",ext,filename:`moon-review-${reviewFilenameStamp()}.${ext}`};
    }
    async function hydrateImagesForJsonExport(exportObj){let anyMissing=false; for(const m of exportObj.messages||[]){if(m.imageId&&!m.imageData){try{const blob=await window.imageStore.getImageBlob(m.imageId); if(blob){m.imageData=await window.imageStore.blobToDataUrl(blob);}else{console.warn("hydrateImagesForJsonExport: missing blob for imageId",m.imageId); anyMissing=true;}}catch(err){console.warn("hydrateImagesForJsonExport: failed to hydrate imageId",m.imageId,err); anyMissing=true;}}} for(const mb of exportObj.members||[]){if(mb.avatarId&&!mb.avatarData){try{const blob=await window.imageStore.getImageBlob(mb.avatarId); if(blob){mb.avatarData=await window.imageStore.blobToDataUrl(blob);}else{console.warn("hydrateImagesForJsonExport: missing blob for avatarId",mb.avatarId); anyMissing=true;}}catch(err){console.warn("hydrateImagesForJsonExport: failed to hydrate avatarId",mb.avatarId,err); anyMissing=true;}}} for(const r of exportObj.rooms||[]){if(r.backgroundId&&!r.backgroundData){try{const blob=await window.imageStore.getImageBlob(r.backgroundId); if(blob){r.backgroundData=await window.imageStore.blobToDataUrl(blob);}else{console.warn("hydrateImagesForJsonExport: missing blob for backgroundId",r.backgroundId); anyMissing=true;}}catch(err){console.warn("hydrateImagesForJsonExport: failed to hydrate backgroundId",r.backgroundId,err); anyMissing=true;}}} return anyMissing;}
    async function formatExportJsonAsync(){const selected=selectedExportData(); const selectedRoomIds=new Set(selected.rooms.map(r=>r.id)); const includeLedger=document.getElementById("exportScope").value==="all"; const exportObj=JSON.parse(JSON.stringify({app:"月之暗面",version:2,exportedAt:now(),nextSeq:data.nextSeq,tags:data.tags||[],messageKinds:data.messageKinds||DEFAULT_KINDS,polls:(data.polls||[]).filter(p=>selectedRoomIds.has(p.roomId)),handoffNotes:(data.handoffNotes||[]).filter(n=>selectedRoomIds.has(n.roomId)),frontingLogs:data.frontingLogs||[],...(includeLedger?{tasks:data.tasks||[],careLogs:data.careLogs||[],careChecklist:data.careChecklist||[],ledgerRecords:normalizeLedgerRecordsForBackup(getRuntimeLedgerRecordsForBackup())}:{}),systemProfile:data.systemProfile||blankSystemProfile(),systemProfileVisibility:normalizeSystemProfileVisibilityRecord(data.systemProfileVisibility),memberRelations:data.memberRelations||[],externalSystemCards:data.externalSystemCards||[],rooms:selected.rooms,members:data.members,messages:selected.messages})); const anyMissing=await hydrateImagesForJsonExport(exportObj); if(anyMissing)alert("警告：部分图片在 IndexedDB 中找不到，备份可能不完整。\n\n建议先运行 window.runImageMigrationToIndexedDB() 迁移旧图片后再导出。"); return {text:JSON.stringify(exportObj,null,2),type:"application/json",ext:"json"};}
    async function downloadExport(){
      const format=document.getElementById("exportFormat").value;
      if(isReviewExportFormat(format)){
        const result=generateReviewExport(format);
        if(!result)return;
        if(!result.text.trim()){alert("没有可导出的内容。"); return;}
        if(window.MoonBridge?.saveFile){window.MoonBridge.saveFile(result.filename,result.type,result.text); closeModal("exportModal"); return;}
        const blob=new Blob([result.text],{type:result.type});
        const url=URL.createObjectURL(blob);
        const a=document.createElement("a");
        a.href=url;
        a.download=result.filename;
        a.click();
        URL.revokeObjectURL(url);
        closeModal("exportModal");
        return;
      }
      const scope=document.getElementById("exportScope").value;
      const rooms=selectedExportRooms();
      const options=getRedactionOptions();
      const isJsonBackup=format==="json"||format==="encrypted-json";
      if(isJsonBackup&&options.redacted)alert("JSON 用于完整备份，默认保留全量数据；脱敏导出请使用 Markdown / TXT / CSV。本次 JSON 会按完整备份导出。");
      if(!isJsonBackup&&options.redacted&&options.excludePrivate&&rooms.length&&!rooms.some(r=>!isPrivateRoom(r))){alert("当前导出范围只包含私聊 / 小群聊，且已选择排除私聊，因此没有可导出的内容。可以取消“排除私聊”，或改选其它范围。"); return;}
      const hasPrivate=rooms.some(isPrivateRoom);
      if(!isJsonBackup&&hasPrivate&&!(options.redacted&&options.excludePrivate)){
        const isCurrentPrivate=scope==="current"&&rooms.length===1&&isPrivateRoom(rooms[0]);
        const msg=isCurrentPrivate?"当前群组是私聊 / 小群聊，是否继续导出？":"当前导出范围包含私聊 / 小群聊，是否继续？";
        if(!confirm(msg))return;
      }
      let result;
      let filename="";
      if(isJsonBackup){
        if(format==="encrypted-json"){
          const fields=getEncryptedBackupPasswordFields();
          if(!validateEncryptedBackupPasswords(fields.password,fields.confirm))return;
        }
        const btn=document.getElementById("confirmExportBtn");
        btn.disabled=true;
        try{
          const jsonResult=await formatExportJsonAsync();
          if(format==="encrypted-json"){
            const fields=getEncryptedBackupPasswordFields();
            const envelope=await exportEncryptedBackup(JSON.parse(jsonResult.text),fields.password);
            result={text:JSON.stringify(envelope,null,2),type:"application/json",ext:"moonenc.json"};
            filename=encryptedBackupFilename();
          }else{
            result=jsonResult;
          }
        }catch(err){
          console.error("downloadExport: JSON export failed",err);
          alert("导出失败："+encryptedBackupErrorMessage(err));
          return;
        }finally{
          btn.disabled=false;
        }
      }else{
        result=formatExport(format);
      }
      if(!result.text.trim()){alert("没有可导出的内容。"); return;}
      if(!filename){
        const label=scope==="all"?"全部对话":(roomDisplayName(rooms[0])||"对话");
        filename=`月之暗面-${fileSafe(options.redacted?`${label}-脱敏`:label)}-${new Date().toISOString().slice(0,10)}.${result.ext}`;
      }
      if(window.MoonBridge?.saveFile){window.MoonBridge.saveFile(filename,result.type,result.text); closeModal("exportModal"); clearEncryptedBackupPasswordFields(); updateEncryptedBackupOptionsVisibility(); return;}
      const blob=new Blob([result.text],{type:result.type});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url;
      a.download=filename;
      a.click();
      URL.revokeObjectURL(url);
      closeModal("exportModal");
      clearEncryptedBackupPasswordFields();
      updateEncryptedBackupOptionsVisibility();
    }
    async function externalizeImagesAfterJsonImport(appData){for(const m of appData.messages||[]){if(m.imageData){const imageId=m.imageId||`msgimg-${m.id}`; const blob=window.imageStore.dataUrlToBlob(m.imageData); const mime=m.imageType||blob.type||"image/*"; await window.imageStore.putImage({id:imageId,blob,mime,name:m.imageName||"图片"}); m.imageId=imageId; delete m.imageData;}else if(m.imageId){const blob=await window.imageStore.getImageBlob(m.imageId).catch(()=>null); if(!blob)console.warn("externalizeImagesAfterJsonImport: imageId not found in IndexedDB",m.imageId);}} for(const mb of appData.members||[]){if(mb.avatarData){const avatarId=mb.avatarId||`avatar-${mb.id}`; const blob=window.imageStore.dataUrlToBlob(mb.avatarData); const mime=blob.type||"image/*"; await window.imageStore.putImage({id:avatarId,blob,mime,name:`${mb.name||"member"}-头像`}); mb.avatarId=avatarId; delete mb.avatarData;}else if(mb.avatarId){const blob=await window.imageStore.getImageBlob(mb.avatarId).catch(()=>null); if(!blob)console.warn("externalizeImagesAfterJsonImport: avatarId not found in IndexedDB",mb.avatarId);}} for(const r of appData.rooms||[]){if(r.backgroundData){const backgroundId=r.backgroundId||`roombg-${r.id}`; const blob=window.imageStore.dataUrlToBlob(r.backgroundData); const mime=blob.type||"image/*"; await window.imageStore.putImage({id:backgroundId,blob,mime,name:`${r.name||r.id||"room"}-背景`}); r.backgroundId=backgroundId; delete r.backgroundData;}else if(r.backgroundId){const blob=await window.imageStore.getImageBlob(r.backgroundId).catch(()=>null); if(!blob)console.warn("externalizeImagesAfterJsonImport: backgroundId not found in IndexedDB",r.backgroundId);}} /* JSON 导入把 DataURL 外置到 IndexedDB：imageData(_imgVer:1) → imageId(_imgVer:2)，按现有规则重算 integrity */ for(const m of appData.messages||[])m.integrity=messageIntegrity(m);}
    async function importParsedBackup(parsed){
      const incoming=await storage.importBackup(parsed);
      const ledgerFromBackup=Array.isArray(parsed.ledgerRecords)?normalizeLedgerRecordsForBackup(parsed.ledgerRecords):null;
      const bad=incoming.messages.filter(m=>!integrityOk(m)).length;
      const note=bad?`\n\n注意：备份中有 ${bad} 条消息校验异常，仍可导入，但建议确认来源。`:"";
      const ledgerNote=ledgerFromBackup?`\n备份包含 ${ledgerFromBackup.length} 条账本记录，导入后会覆盖当前账本。`:"\n备份不包含账本记录，当前账本将保持不变。";
      if(!confirm(`导入会覆盖当前本机数据。\n\n备份包含 ${incoming.rooms.length} 个群组、${incoming.members.length} 个成员、${incoming.messages.length} 条消息。${ledgerNote}${note}\n\n确定导入吗？`))return false;
      await externalizeImagesAfterJsonImport(incoming);
      const previousData=data, previousRoomId=currentRoomId;
      data=incoming;
      currentRoomId=data.rooms[0]?.id||"main";
      if(!(await save())){data=previousData; currentRoomId=previousRoomId; render(); return false;}
      let ledgerFailed=false;
      if(ledgerFromBackup){
        ledgerRecords=ledgerFromBackup;
        if(!(await saveLedger(ledgerFromBackup))){
          ledgerFailed=true;
          console.error("importBackupFile: ledgerRecords save failed after main data import");
        }
      }
      closeModal("exportModal");
      resetEncryptedImportControls();
      if(typeof renderLedger==="function")renderLedger();
      render();
      alert(ledgerFailed?"备份已导入，但账本记录保存失败。当前账本可能没有完成覆盖。":"备份已导入。");
      return true;
    }
    async function importPendingEncryptedBackup(){
      if(!pendingEncryptedBackupEnvelope)return false;
      const input=document.getElementById("importEncryptedBackupPassword");
      const password=normalizeEncryptedBackupPassword(input?.value||"");
      if(!password){alert("请输入备份密码。"); input?.focus(); return false;}
      const btn=document.getElementById("importBtn");
      if(btn)btn.disabled=true;
      try{
        const parsed=await decryptBackupEnvelope(pendingEncryptedBackupEnvelope,password);
        await importParsedBackup(parsed);
      }catch(err){
        if(err?.message!=="decrypt_failed")console.error("importPendingEncryptedBackup failed",err);
        alert(encryptedBackupErrorMessage(err));
        input?.select();
      }finally{
        if(btn)btn.disabled=false;
      }
      return true;
    }
    function handleImportButtonClick(){
      if(pendingEncryptedBackupEnvelope){importPendingEncryptedBackup(); return;}
      resetEncryptedImportControls();
      document.getElementById("importInput")?.click();
    }
    function importBackupFile(file){
      if(!file)return;
      resetEncryptedImportControls();
      const reader=new FileReader();
      reader.onload=async()=>{
        try{
          const parsed=JSON.parse(String(reader.result||""));
          if(isEncryptedBackupEnvelope(parsed)){
            showEncryptedImportControls(parsed);
            return;
          }
          await importParsedBackup(parsed);
        }catch(err){
          console.error("importBackupFile failed",err);
          alert(err?.message==="invalid_backup"?"这不是有效的月之暗面 JSON 备份。":"导入失败：JSON 文件无法读取或图片写入存储失败。");
        }
      };
      reader.onerror=()=>alert("导入失败：文件读取出错。");
      reader.readAsText(file);
    }
