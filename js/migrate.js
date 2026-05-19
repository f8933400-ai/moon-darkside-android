    const FRONTING_STATE_TYPES=["front","cofront","near","observer","blended","unknown"];
    const FRONTING_MEMORY_RATINGS=["","full","partial","none","unknown"];
    const TASK_STATUSES=["todo","doing","done","paused"];
    const TASK_SOURCES=["manual","handoff"];
    const CARE_LOG_FIELDS=["hunger","thirst","sleep","pain","energy","sensory","mood","meds","note"];
    const MEMBER_FIELD_VISIBILITIES=["private","system","trusted","public"];
    const SYSTEM_PROFILE_VISIBILITY_KEYS=["systemName","collectiveName","systemTypeText","description","frontingNotes","boundaries","comfortMethods","safetyNotes"];
    const MIGRATE_DEFAULT_POLL_OPTIONS=["同意","不同意","弃权","需要更多信息","否决"];
    const MIGRATE_POLL_VOTE_MODES=["simple","consensus"];
    const MIGRATE_POLL_STATUSES=["open","closed","paused","cancelled"];
    function migratePlainObject(value){return !!value&&typeof value==="object"&&!Array.isArray(value);}
    function systemProfileVisibilityText(value){return {private:"仅本机记录",system:"系统内可见",trusted:"可信对象可见",public:"可公开"}[value]||"仅本机记录";}
    function normalizeVisibilityValue(value,defaultValue="private"){return MEMBER_FIELD_VISIBILITIES.includes(value)?value:defaultValue;}
    function normalizeSystemProfileVisibilityValue(key,value){const defaults=blankSystemProfileVisibility(); return normalizeVisibilityValue(value,defaults[key]||"private");}
    function normalizeSystemProfileVisibilityRecord(record){const source=migratePlainObject(record)?record:{}; const out={}; SYSTEM_PROFILE_VISIBILITY_KEYS.forEach(key=>{out[key]=normalizeSystemProfileVisibilityValue(key,source[key]);}); return out;}
    function migratePollOptionText(option){
      if(typeof option==="string")return option.trim();
      if(migratePlainObject(option))return String(option.text??option.label??option.value??"").trim();
      return "";
    }
    function migrateNormalizePollOptions(options){
      const raw=Array.isArray(options)?options:[];
      const normalized=[];
      const textToId={};
      const indexToId={};
      raw.forEach((option,index)=>{
        const text=migratePollOptionText(option);
        if(!text)return;
        const source=migratePlainObject(option)?option:{};
        const id=String(source.id||"").trim()||makeId();
        normalized.push({...source,id,text});
        if(!textToId[text])textToId[text]=id;
        indexToId[String(index)]=id;
        indexToId[String(index+1)]=id;
      });
      const finalOptions=normalized.length?normalized:MIGRATE_DEFAULT_POLL_OPTIONS.map(text=>({id:makeId(),text}));
      return {options:finalOptions,textToId,indexToId,optionIds:new Set(finalOptions.map(option=>option.id))};
    }
    function migrateNormalizePollVotes(votes,optionMap){
      if(!migratePlainObject(votes))return {};
      const out={};
      Object.entries(votes).forEach(([memberId,optionId])=>{
        const key=String(memberId||"").trim();
        let value=String(optionId==null?"":optionId).trim();
        if(!key||!value)return;
        if(optionMap&&!optionMap.optionIds.has(value)){
          value=optionMap.textToId[value]||optionMap.indexToId[value]||value;
        }
        out[key]=value;
      });
      return out;
    }
    function migrateNormalizePollComments(comments){
      if(!migratePlainObject(comments))return {};
      const out={};
      Object.entries(comments).forEach(([memberId,text])=>{
        if(typeof text!=="string")return;
        const key=String(memberId||"").trim();
        const value=text.trim();
        if(key&&value)out[key]=value;
      });
      return out;
    }
    function migrateNormalizePollRecord(poll){
      const source=migratePlainObject(poll)?poll:{};
      const optionMap=migrateNormalizePollOptions(source.options);
      const createdAt=source.createdAt||now();
      const updatedAt=source.updatedAt||createdAt||now();
      let rawStatus=String(source.status||"").trim();
      if(rawStatus==="canceled")rawStatus="cancelled";
      const status=MIGRATE_POLL_STATUSES.includes(rawStatus)?rawStatus:((source.closed||source.closedAt||source.result)?"closed":"open");
      let closedAt=source.closedAt||"";
      if(status==="closed"&&!closedAt)closedAt=updatedAt||createdAt||now();
      return {...source,id:source.id||makeId(),roomId:source.roomId||"main",title:String(source.title||""),description:String(source.description||""),options:optionMap.options,votes:migrateNormalizePollVotes(source.votes,optionMap),comments:migrateNormalizePollComments(source.comments),voteMode:MIGRATE_POLL_VOTE_MODES.includes(source.voteMode)?source.voteMode:"simple",reviewAt:source.reviewAt||"",decisionText:String(source.decisionText||""),status,deadline:source.deadline||"",createdAt,updatedAt,closedAt};
    }
    function normalizeMemberAliasesInput(value){const raw=Array.isArray(value)?value:(typeof value==="string"?value.split(/[\n,，]+/):[]); const seen=new Set(); return raw.map(v=>String(v||"").trim()).filter(Boolean).filter(v=>{if(seen.has(v))return false; seen.add(v); return true;});}
    function normalizeMemberCustomFieldVisibility(value){return MEMBER_FIELD_VISIBILITIES.includes(value)?value:"private";}
    function normalizeMemberCustomFields(fields){if(!Array.isArray(fields))return []; return fields.map(field=>{const source=field&&typeof field==="object"?field:{}; const name=String(source.name||"").trim(); if(!name)return null; return {...source,id:source.id||makeId(),name,value:source.value==null?"":String(source.value),visibility:normalizeMemberCustomFieldVisibility(source.visibility)};}).filter(Boolean);}
    function normalizeMemberStatusHistory(rows){if(!Array.isArray(rows))return []; return rows.map(row=>{const source=row&&typeof row==="object"?row:{}; return {...source,fromStatus:String(source.fromStatus||""),toStatus:String(source.toStatus||""),note:String(source.note||""),createdAt:source.createdAt||now()};});}
    function normalizeMemberRecord(member,oldDefaultTags=new Set()){const source=member&&typeof member==="object"?member:{}; return {...source,id:source.id||makeId(),name:String(source.name||""),role:String(source.role||""),status:source.status||"active",tagId:oldDefaultTags.has(source.tagId)?"":source.tagId||"",note:String(source.note||""),pronouns:String(source.pronouns||""),aliases:normalizeMemberAliasesInput(source.aliases),comfortMethods:String(source.comfortMethods||""),boundaries:String(source.boundaries||""),avoidNotes:String(source.avoidNotes||""),communicationStyle:String(source.communicationStyle||""),frontingPreferences:String(source.frontingPreferences||""),customFields:normalizeMemberCustomFields(source.customFields),statusHistory:normalizeMemberStatusHistory(source.statusHistory),createdAt:source.createdAt||now(),updatedAt:source.updatedAt||source.createdAt||now()};}
    function normalizeFrontingLogRecord(f){const source=f&&typeof f==="object"?f:{}; const memberIds=Array.isArray(source.memberIds)?source.memberIds.map(id=>String(id||"")).filter(Boolean):[]; let primary=source.primaryMemberId?String(source.primaryMemberId):null; if(!memberIds.length||!memberIds.includes(primary))primary=null; const startAt=source.startAt||source.createdAt||now(); const createdAt=source.createdAt||startAt||now(); return {...source,id:source.id||makeId(),memberIds,primaryMemberId:primary,stateType:FRONTING_STATE_TYPES.includes(source.stateType)?source.stateType:"front",startAt,endAt:source.endAt?source.endAt:null,memoryRating:FRONTING_MEMORY_RATINGS.includes(source.memoryRating)?source.memoryRating:"",note:source.note||"",createdAt,updatedAt:source.updatedAt||createdAt||startAt||now()};}
    function normalizeTaskRecord(task,validMemberIds){const source=task&&typeof task==="object"?task:{}; const detail=source.detail==null?"":String(source.detail); const rawTitle=String(source.title||"").trim(); const titleBase=(rawTitle||detail.slice(0,20)||"未命名任务").trim()||"未命名任务"; const legacyMemberIds=[source.assigneeMemberId,source.ownerMemberId,source.memberId,source.claimedBy].map(id=>String(id||"")).filter(Boolean); const rawIds=Array.isArray(source.assignedMemberIds)?source.assignedMemberIds.map(id=>String(id||"")).filter(Boolean):legacyMemberIds; const assignedMemberIds=[...new Set(rawIds)].filter(id=>!validMemberIds||!validMemberIds.size||validMemberIds.has(id)); const createdAt=source.createdAt||now(); return {...source,id:source.id||makeId(),title:titleBase,detail,status:TASK_STATUSES.includes(source.status)?source.status:"todo",assignedMemberIds,dueAt:source.dueAt||"",source:TASK_SOURCES.includes(source.source)?source.source:"manual",linkedHandoffId:source.linkedHandoffId||"",createdAt,updatedAt:source.updatedAt||createdAt||now()};}
    function normalizeCareLogRecord(log){const source=log&&typeof log==="object"?log:{}; const createdAt=source.createdAt||source.at||now(); const out={...source,id:source.id||makeId(),createdByMemberId:source.createdByMemberId==null?"":String(source.createdByMemberId),createdAt}; CARE_LOG_FIELDS.forEach(key=>{out[key]=source[key]==null?"":String(source[key]);}); return out;}
    function normalizeCareChecklistDone(value){return value===true||value===1||value==="1"||String(value).toLowerCase()==="true";}
    function normalizeCareChecklistRecord(item){const source=item&&typeof item==="object"?item:{}; const createdAt=source.createdAt||now(); const title=String(source.title||"").trim()||"未命名照护项"; return {...source,id:source.id||makeId(),title,done:normalizeCareChecklistDone(source.done),createdAt,updatedAt:source.updatedAt||createdAt||now()};}
    function migrate(raw){const copy=raw||initial; const oldDefaultTags=new Set(["tag-front","tag-safe","tag-boundary","tag-memory"]); copy.tags=(copy.tags||[]).filter(t=>!oldDefaultTags.has(t.id)).map(t=>({...t,color:t.color||"#a78bfa",name:t.name||"未命名"})); const kinds=[...(Array.isArray(copy.messageKinds)?copy.messageKinds:DEFAULT_KINDS),...(copy.messages||[]).map(m=>m.kind).filter(k=>k&&!["系统提示","成员变动","图片"].includes(k))].map(k=>String(k).trim()).filter(Boolean); copy.messageKinds=[...new Set(kinds)]; copy.polls=Array.isArray(copy.polls)?copy.polls.map(migrateNormalizePollRecord):[]; copy.handoffNotes=(copy.handoffNotes||[]).map(n=>({...n,id:n.id||makeId(),createdAt:n.createdAt||now(),roomId:n.roomId||"main",text:n.text||""})); copy.frontingLogs=Array.isArray(copy.frontingLogs)?copy.frontingLogs.map(normalizeFrontingLogRecord):[]; copy.systemProfile={...blankSystemProfile(),...(copy.systemProfile||{})}; copy.systemProfileVisibility=normalizeSystemProfileVisibilityRecord(copy.systemProfileVisibility); if(!copy.systemProfile.updatedAt)copy.systemProfile.updatedAt=now(); copy.memberRelations=(copy.memberRelations||[]).map(r=>({id:r.id||makeId(),fromMemberId:r.fromMemberId||"",toMemberId:r.toMemberId||"",relationType:r.relationType||"不确定",note:r.note||"",createdAt:r.createdAt||now(),updatedAt:r.updatedAt||r.createdAt||now()})); copy.externalSystemCards=(copy.externalSystemCards||[]).map(x=>({id:x.id||makeId(),source:x.source||"manual",receivedAt:x.receivedAt||now(),card:normalizeSystemCard(x.card||x)})); copy.members=(copy.members&&copy.members.length?copy.members:initial.members).map(m=>normalizeMemberRecord(m,oldDefaultTags)); const validTaskMemberIds=new Set((copy.members||[]).map(m=>m.id)); copy.tasks=Array.isArray(copy.tasks)?copy.tasks.map(t=>normalizeTaskRecord(t,validTaskMemberIds)):[]; copy.careLogs=Array.isArray(copy.careLogs)?copy.careLogs.map(normalizeCareLogRecord):[]; copy.careChecklist=Array.isArray(copy.careChecklist)?copy.careChecklist.map(normalizeCareChecklistRecord):[]; copy.rooms=(copy.rooms&&copy.rooms.length?copy.rooms:initial.rooms).map(r=>({...r,type:r.type||"group",memberIds:r.memberIds||[]})); let nextSeq=Math.max(0,...(copy.messages||[]).map(m=>Number(m.seq)||0))+1; copy.messages=(copy.messages||[]).map(m=>{const base=m.kind==="成员变动"||m.text==="这里可以像聊天一样记录系统内的交流、状态、需求、边界和记忆。"?{...m,speakerId:"system",speakerName:"系统通知",kind:m.kind==="成员变动"?"成员变动":"系统提示"}:{...m,speakerName:m.speakerName||copy.members.find(x=>x.id===m.speakerId)?.name||"未知"}; const hadSeq=!!Number(base.seq); base.id=base.id||makeId(); base.seq=Number(base.seq)||nextSeq++; base.createdAt=base.createdAt||now(); if(!base.integrity||!hadSeq)base.integrity=messageIntegrity(base); return base;}); copy.nextSeq=Math.max(Number(copy.nextSeq)||0,nextSeq); return copy;}
    function makeMigrationAssetId(kind,ownerId){return `asset_${kind}_${String(ownerId||makeId()).replace(/[^a-zA-Z0-9_-]/g,"_")}`;}
    function migrationActiveRows(rows){return (rows||[]).filter(r=>!r.deleted_at);}
    function normalizeForStorage(appData,prefsData={},ledgerRows=[]){
      const source=appData||{};
      const kinds=Array.isArray(source.messageKinds)?source.messageKinds:(Array.isArray(source.kinds)?source.kinds:DEFAULT_KINDS);
      const handoff=Array.isArray(source.handoffNotes)?source.handoffNotes:(Array.isArray(source.handoff)?source.handoff:[]);
      const tables={app_meta:[],prefs:[],tags:[],message_kinds:[],members:[],rooms:[],room_members:[],messages:[],assets:[],polls:[],poll_options:[],poll_votes:[],handoff_notes:[],fronting_logs:[],tasks:[],care_logs:[],care_checklist:[],system_profile:[],member_relations:[],external_system_cards:[],ledger_records:[]};
      const addAsset=(kind,ownerId,dataUrl,mimeType="",name="")=>{
        if(!dataUrl)return "";
        const id=makeMigrationAssetId(kind,ownerId);
        tables.assets.push({id,kind,storage_type:"data_url",mime_type:mimeType||"",name:name||"",data_url:dataUrl,file_path:null,byte_size:String(dataUrl||"").length,checksum:checksum(dataUrl),created_at:now(),updated_at:now(),deleted_at:null});
        return id;
      };
      tables.app_meta.push({id:1,schema_version:1,data_version:2,app_version:"",next_seq:Number(source.nextSeq)||1,created_at:now(),updated_at:now()});
      Object.entries(prefsData||{}).forEach(([key,value])=>tables.prefs.push({key,value_json:JSON.stringify(value),updated_at:now()}));
      (source.tags||[]).forEach((t,i)=>tables.tags.push({id:t.id,name:t.name||"",color:t.color||"#a78bfa",sort_order:i,created_at:t.createdAt||"",updated_at:t.updatedAt||"",deleted_at:null}));
      (kinds||[]).forEach((name,i)=>tables.message_kinds.push({name:String(name),sort_order:i,created_at:"",updated_at:""}));
      (source.members||[]).forEach((m,i)=>{const row=normalizeMemberRecord(m); const avatar_asset_id=addAsset("member_avatar",row.id,row.avatarData,"image/*",`${row.name||"avatar"}-avatar`); tables.members.push({id:row.id,name:row.name||"",role:row.role||"",status:row.status||"active",tag_id:row.tagId||"",note:row.note||"",pronouns:row.pronouns||"",aliases_json:JSON.stringify(row.aliases||[]),comfort_methods:row.comfortMethods||"",boundaries:row.boundaries||"",avoid_notes:row.avoidNotes||"",communication_style:row.communicationStyle||"",fronting_preferences:row.frontingPreferences||"",custom_fields_json:JSON.stringify(row.customFields||[]),status_history_json:JSON.stringify(row.statusHistory||[]),avatar_asset_id,created_at:row.createdAt||"",updated_at:row.updatedAt||"",deleted_at:null,sort_order:i});});
      (source.rooms||[]).forEach((r,i)=>{const background_asset_id=addAsset("room_background",r.id,r.backgroundData,"image/*",`${r.name||"room"}-background`); tables.rooms.push({id:r.id,type:r.type||"group",name:r.name||"",desc:r.desc||"",background_asset_id,created_at:r.createdAt||"",updated_at:r.updatedAt||"",deleted_at:null,sort_order:i}); (r.memberIds||[]).forEach((memberId,j)=>tables.room_members.push({room_id:r.id,member_id:memberId,sort_order:j}));});
      (source.messages||[]).forEach((m,i)=>{const image_asset_id=addAsset("message_image",m.id,m.imageData,m.imageType||"",m.imageName||""); tables.messages.push({id:m.id,seq:Number(m.seq)||0,room_id:m.roomId||"",speaker_id:m.speakerId||"",speaker_name_snapshot:m.speakerName||"",kind:m.kind||"",text:m.text||"",image_asset_id,image_name:m.imageName||"",image_type:m.imageType||"",integrity:m.integrity||"",created_at:m.createdAt||"",updated_at:m.updatedAt||"",deleted_at:null,sort_order:i});});
      (source.polls||[]).forEach((p,i)=>{const row=migrateNormalizePollRecord(p); tables.polls.push({id:row.id,room_id:row.roomId||"",title:row.title||"",description:row.description||"",vote_mode:row.voteMode||"simple",review_at:row.reviewAt||"",decision_text:row.decisionText||"",comments_json:JSON.stringify(row.comments||{}),deadline:row.deadline||"",status:row.status||"open",created_at:row.createdAt||"",closed_at:row.closedAt||"",updated_at:row.updatedAt||"",deleted_at:null,sort_order:i}); (row.options||[]).forEach((o,j)=>tables.poll_options.push({id:o.id,poll_id:row.id,text:o.text||"",sort_order:j})); Object.entries(row.votes||{}).forEach(([memberId,optionId])=>tables.poll_votes.push({poll_id:row.id,member_id:memberId,option_id:optionId,updated_at:row.updatedAt||row.closedAt||row.createdAt||now()}));});
      handoff.forEach((n,i)=>tables.handoff_notes.push({id:n.id,room_id:n.roomId||"",source:n.source||"",text:n.text||"",created_at:n.createdAt||"",updated_at:n.updatedAt||"",deleted_at:null,sort_order:i}));
      (source.frontingLogs||[]).forEach((row,i)=>{const f=normalizeFrontingLogRecord(row); tables.fronting_logs.push({id:f.id,member_ids_json:JSON.stringify(f.memberIds),primary_member_id:f.primaryMemberId,state_type:f.stateType,start_at:f.startAt||"",end_at:f.endAt||null,memory_rating:f.memoryRating,note:f.note||"",created_at:f.createdAt||f.startAt||"",updated_at:f.updatedAt||f.createdAt||f.startAt||"",sort_order:i});});
      (source.tasks||[]).forEach((row,i)=>{const t=normalizeTaskRecord(row,new Set((source.members||[]).map(m=>m.id))); tables.tasks.push({id:t.id,title:t.title||"",detail:t.detail||"",status:t.status||"todo",assigned_member_ids_json:JSON.stringify(t.assignedMemberIds||[]),due_at:t.dueAt||"",source:t.source||"manual",linked_handoff_id:t.linkedHandoffId||"",created_at:t.createdAt||"",updated_at:t.updatedAt||"",deleted_at:null,sort_order:i});});
      (source.careLogs||[]).forEach((row,i)=>{const c=normalizeCareLogRecord(row); tables.care_logs.push({id:c.id,hunger:c.hunger||"",thirst:c.thirst||"",sleep:c.sleep||"",pain:c.pain||"",energy:c.energy||"",sensory:c.sensory||"",mood:c.mood||"",meds:c.meds||"",note:c.note||"",created_by_member_id:c.createdByMemberId||"",created_at:c.createdAt||"",deleted_at:null,sort_order:i});});
      (source.careChecklist||[]).forEach((row,i)=>{const c=normalizeCareChecklistRecord(row); tables.care_checklist.push({id:c.id,title:c.title||"",done:c.done?1:0,created_at:c.createdAt||"",updated_at:c.updatedAt||"",deleted_at:null,sort_order:i});});
      const profile={...blankSystemProfile(),...(source.systemProfile||{})};
      const profileVisibility=normalizeSystemProfileVisibilityRecord(source.systemProfileVisibility);
      tables.system_profile.push({id:1,system_name:profile.systemName||"",collective_name:profile.collectiveName||"",system_type_text:profile.systemTypeText||"",description:profile.description||"",fronting_notes:profile.frontingNotes||"",boundaries:profile.boundaries||"",comfort_methods:profile.comfortMethods||"",safety_notes:profile.safetyNotes||"",visibility_json:JSON.stringify(profileVisibility),updated_at:profile.updatedAt||""});
      (source.memberRelations||[]).forEach((r,i)=>tables.member_relations.push({id:r.id,from_member_id:r.fromMemberId||"",to_member_id:r.toMemberId||"",relation_type:r.relationType||"不确定",note:r.note||"",created_at:r.createdAt||"",updated_at:r.updatedAt||"",deleted_at:null,sort_order:i}));
      (source.externalSystemCards||[]).forEach((x,i)=>tables.external_system_cards.push({id:x.id,source:x.source||"manual",received_at:x.receivedAt||"",card_json:JSON.stringify(x.card||{}),created_at:x.createdAt||x.receivedAt||"",updated_at:x.updatedAt||x.receivedAt||"",deleted_at:null,sort_order:i}));
      (ledgerRows||[]).forEach((r,i)=>tables.ledger_records.push({id:r.id,type:r.type||"expense",amount:Number(r.amount)||0,category:r.category||"",date:r.date||"",note:r.note||"",created_at:r.createdAt||"",updated_at:r.updatedAt||"",deleted_at:null,sort_order:i}));
      return tables;
    }
    function denormalizeFromStorage(tables){
      const assetById=new Map(migrationActiveRows(tables.assets).map(a=>[a.id,a]));
      const byOrder=(rows)=>migrationActiveRows(rows).slice().sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0));
      const prefsOut={};
      (tables.prefs||[]).forEach(row=>{try{prefsOut[row.key]=JSON.parse(row.value_json);}catch{prefsOut[row.key]=row.value_json;}});
      const meta=(tables.app_meta||[])[0]||{};
      const tags=byOrder(tables.tags).map(t=>({id:t.id,name:t.name||"",color:t.color||"#a78bfa"}));
      const messageKinds=(tables.message_kinds||[]).slice().sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0)).map(k=>k.name);
      const members=byOrder(tables.members).map(m=>{const avatar=m.avatar_asset_id?assetById.get(m.avatar_asset_id):null; const parseArray=value=>{try{const parsed=JSON.parse(value||"[]"); return Array.isArray(parsed)?parsed:[];}catch{return [];}}; return normalizeMemberRecord({id:m.id,name:m.name||"",role:m.role||"",status:m.status||"active",tagId:m.tag_id||"",note:m.note||"",pronouns:m.pronouns||"",aliases:parseArray(m.aliases_json),comfortMethods:m.comfort_methods||"",boundaries:m.boundaries||"",avoidNotes:m.avoid_notes||"",communicationStyle:m.communication_style||"",frontingPreferences:m.fronting_preferences||"",customFields:parseArray(m.custom_fields_json),statusHistory:parseArray(m.status_history_json),avatarData:avatar?.storage_type==="data_url"?(avatar.data_url||""):"",createdAt:m.created_at||"",updatedAt:m.updated_at||""});});
      const memberIdsByRoom={};
      (tables.room_members||[]).slice().sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0)).forEach(rm=>{(memberIdsByRoom[rm.room_id]||(memberIdsByRoom[rm.room_id]=[])).push(rm.member_id);});
      const rooms=byOrder(tables.rooms).map(r=>{const bg=r.background_asset_id?assetById.get(r.background_asset_id):null; return {id:r.id,type:r.type||"group",memberIds:memberIdsByRoom[r.id]||[],name:r.name||"",desc:r.desc||"",backgroundData:bg?.storage_type==="data_url"?(bg.data_url||""):"",createdAt:r.created_at||""};});
      const messagesOut=byOrder(tables.messages).map(m=>{const img=m.image_asset_id?assetById.get(m.image_asset_id):null; const out={id:m.id,roomId:m.room_id||"",speakerId:m.speaker_id||"",speakerName:m.speaker_name_snapshot||"",kind:m.kind||"",text:m.text||"",createdAt:m.created_at||"",seq:Number(m.seq)||0,integrity:m.integrity||""}; if(m.image_asset_id||m.image_name||m.image_type){out.imageData=img?.storage_type==="data_url"?(img.data_url||""):""; out.imageName=m.image_name||img?.name||""; out.imageType=m.image_type||img?.mime_type||"";} return out;});
      const optsByPoll={}, votesByPoll={};
      (tables.poll_options||[]).slice().sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0)).forEach(o=>{(optsByPoll[o.poll_id]||(optsByPoll[o.poll_id]=[])).push({id:o.id,text:o.text||""});});
      (tables.poll_votes||[]).forEach(v=>{(votesByPoll[v.poll_id]||(votesByPoll[v.poll_id]={}))[v.member_id]=v.option_id;});
      const polls=byOrder(tables.polls).map(p=>{let comments={}; try{comments=migrateNormalizePollComments(JSON.parse(p.comments_json||"{}"));}catch{comments={};} return migrateNormalizePollRecord({id:p.id,roomId:p.room_id||"",title:p.title||"",description:p.description||"",options:optsByPoll[p.id]||[],votes:votesByPoll[p.id]||{},comments,voteMode:p.vote_mode||"simple",reviewAt:p.review_at||"",decisionText:p.decision_text||"",deadline:p.deadline||"",createdAt:p.created_at||"",updatedAt:p.updated_at||"",status:p.status||"open",closedAt:p.closed_at||""});});
      const handoffNotes=byOrder(tables.handoff_notes).map(n=>({id:n.id,roomId:n.room_id||"",source:n.source||"",text:n.text||"",createdAt:n.created_at||""}));
      const frontingLogs=byOrder(tables.fronting_logs).map(f=>{const memberIds=(()=>{try{const p=JSON.parse(f.member_ids_json||"[]"); return Array.isArray(p)?p:[];}catch{return [];}})(); return normalizeFrontingLogRecord({id:f.id||makeId(),memberIds,primaryMemberId:f.primary_member_id||null,stateType:f.state_type||"front",startAt:f.start_at||"",endAt:f.end_at||null,memoryRating:f.memory_rating||"",note:f.note||"",createdAt:f.created_at||f.start_at||"",updatedAt:f.updated_at||f.created_at||f.start_at||""});});
      const taskMemberIds=new Set((members||[]).map(m=>m.id));
      const tasks=byOrder(tables.tasks).map(t=>{const assignedMemberIds=(()=>{try{const p=JSON.parse(t.assigned_member_ids_json||"[]"); return Array.isArray(p)?p:[];}catch{return [];}})(); return normalizeTaskRecord({id:t.id,title:t.title||"",detail:t.detail||"",status:t.status||"todo",assignedMemberIds,dueAt:t.due_at||"",source:t.source||"manual",linkedHandoffId:t.linked_handoff_id||"",createdAt:t.created_at||"",updatedAt:t.updated_at||""},taskMemberIds);});
      const careLogs=byOrder(tables.care_logs).map(c=>normalizeCareLogRecord({id:c.id,hunger:c.hunger||"",thirst:c.thirst||"",sleep:c.sleep||"",pain:c.pain||"",energy:c.energy||"",sensory:c.sensory||"",mood:c.mood||"",meds:c.meds||"",note:c.note||"",createdByMemberId:c.created_by_member_id||"",createdAt:c.created_at||""}));
      const careChecklist=byOrder(tables.care_checklist).map(c=>normalizeCareChecklistRecord({id:c.id,title:c.title||"",done:c.done,createdAt:c.created_at||"",updatedAt:c.updated_at||""}));
      const p=(tables.system_profile||[])[0]||{};
      const systemProfile={systemName:p.system_name||"",collectiveName:p.collective_name||"",systemTypeText:p.system_type_text||"",description:p.description||"",frontingNotes:p.fronting_notes||"",boundaries:p.boundaries||"",comfortMethods:p.comfort_methods||"",safetyNotes:p.safety_notes||"",updatedAt:p.updated_at||""};
      let systemProfileVisibility={};
      try{systemProfileVisibility=normalizeSystemProfileVisibilityRecord(JSON.parse(p.visibility_json||"{}"));}catch{systemProfileVisibility=normalizeSystemProfileVisibilityRecord({});}
      const memberRelations=byOrder(tables.member_relations).map(r=>({id:r.id,fromMemberId:r.from_member_id||"",toMemberId:r.to_member_id||"",relationType:r.relation_type||"不确定",note:r.note||"",createdAt:r.created_at||"",updatedAt:r.updated_at||""}));
      const externalSystemCards=byOrder(tables.external_system_cards).map(x=>{let card={}; try{card=JSON.parse(x.card_json||"{}");}catch{} return {id:x.id,source:x.source||"manual",receivedAt:x.received_at||"",card};});
      const ledgerOut=byOrder(tables.ledger_records).map(r=>({id:r.id,type:r.type||"expense",amount:Number(r.amount)||0,category:r.category||"",date:r.date||"",note:r.note||"",createdAt:r.created_at||""}));
      return {data:{tags,messageKinds:messageKinds.length?messageKinds:[...DEFAULT_KINDS],polls,handoffNotes,frontingLogs,tasks,careLogs,careChecklist,systemProfile,systemProfileVisibility,memberRelations,externalSystemCards,members,rooms,messages:messagesOut,nextSeq:Number(meta.next_seq)||1},prefs:prefsOut,ledgerRecords:ledgerOut};
    }
    function comparableMigrationSnapshot(input){
      const app=input?.data||{};
      return {data:{nextSeq:Number(app.nextSeq)||1,tags:app.tags||[],messageKinds:Array.isArray(app.messageKinds)?app.messageKinds:(Array.isArray(app.kinds)?app.kinds:DEFAULT_KINDS),members:(app.members||[]).map(m=>{const row=normalizeMemberRecord(m); return {id:row.id,name:row.name||"",role:row.role||"",status:row.status||"active",tagId:row.tagId||"",note:row.note||"",pronouns:row.pronouns||"",aliases:row.aliases||[],comfortMethods:row.comfortMethods||"",boundaries:row.boundaries||"",avoidNotes:row.avoidNotes||"",communicationStyle:row.communicationStyle||"",frontingPreferences:row.frontingPreferences||"",customFields:row.customFields||[],statusHistory:row.statusHistory||[],avatarData:row.avatarData||"",createdAt:row.createdAt||"",updatedAt:row.updatedAt||""};}),rooms:(app.rooms||[]).map(r=>({id:r.id,type:r.type||"group",memberIds:r.memberIds||[],name:r.name||"",desc:r.desc||"",backgroundData:r.backgroundData||"",createdAt:r.createdAt||""})),messages:(app.messages||[]).map(m=>{const out={id:m.id,roomId:m.roomId||"",speakerId:m.speakerId||"",speakerName:m.speakerName||"",kind:m.kind||"",text:m.text||"",createdAt:m.createdAt||"",seq:Number(m.seq)||0,integrity:m.integrity||""}; if(m.imageData||m.imageName||m.imageType){out.imageData=m.imageData||""; out.imageName=m.imageName||""; out.imageType=m.imageType||"";} return out;}),polls:(app.polls||[]).map(p=>{const row=migrateNormalizePollRecord(p); return {id:row.id,roomId:row.roomId||"",title:row.title||"",description:row.description||"",options:(row.options||[]).map(o=>({id:o.id,text:o.text||""})),votes:row.votes||{},comments:row.comments||{},voteMode:row.voteMode||"simple",reviewAt:row.reviewAt||"",decisionText:row.decisionText||"",deadline:row.deadline||"",createdAt:row.createdAt||"",updatedAt:row.updatedAt||"",status:row.status||"open",closedAt:row.closedAt||""};}),handoffNotes:(Array.isArray(app.handoffNotes)?app.handoffNotes:(Array.isArray(app.handoff)?app.handoff:[])).map(n=>({id:n.id,roomId:n.roomId||"",source:n.source||"",text:n.text||"",createdAt:n.createdAt||""})),frontingLogs:(app.frontingLogs||[]).map(f=>{const row=normalizeFrontingLogRecord(f); return {id:row.id,memberIds:row.memberIds,primaryMemberId:row.primaryMemberId,stateType:row.stateType,startAt:row.startAt||"",endAt:row.endAt||null,memoryRating:row.memoryRating,note:row.note||"",createdAt:row.createdAt||row.startAt||"",updatedAt:row.updatedAt||row.createdAt||row.startAt||""};}),tasks:(app.tasks||[]).map(t=>{const row=normalizeTaskRecord(t,new Set((app.members||[]).map(m=>m.id))); return {id:row.id,title:row.title||"",detail:row.detail||"",status:row.status,assignedMemberIds:row.assignedMemberIds||[],dueAt:row.dueAt||"",source:row.source||"manual",linkedHandoffId:row.linkedHandoffId||"",createdAt:row.createdAt||"",updatedAt:row.updatedAt||""};}),careLogs:(app.careLogs||[]).map(c=>{const row=normalizeCareLogRecord(c); return {id:row.id,hunger:row.hunger||"",thirst:row.thirst||"",sleep:row.sleep||"",pain:row.pain||"",energy:row.energy||"",sensory:row.sensory||"",mood:row.mood||"",meds:row.meds||"",note:row.note||"",createdByMemberId:row.createdByMemberId||"",createdAt:row.createdAt||""};}),careChecklist:(app.careChecklist||[]).map(c=>{const row=normalizeCareChecklistRecord(c); return {id:row.id,title:row.title||"",done:!!row.done,createdAt:row.createdAt||"",updatedAt:row.updatedAt||""};}),systemProfile:{...blankSystemProfile(),...(app.systemProfile||{})},systemProfileVisibility:normalizeSystemProfileVisibilityRecord(app.systemProfileVisibility),memberRelations:(app.memberRelations||[]).map(r=>({id:r.id,fromMemberId:r.fromMemberId||"",toMemberId:r.toMemberId||"",relationType:r.relationType||"不确定",note:r.note||"",createdAt:r.createdAt||"",updatedAt:r.updatedAt||""})),externalSystemCards:(app.externalSystemCards||[]).map(x=>({id:x.id,source:x.source||"manual",receivedAt:x.receivedAt||"",card:x.card||{}}))},prefs:input?.prefs||{},ledgerRecords:(input?.ledgerRecords||[]).map(r=>({id:r.id,type:r.type||"expense",amount:Number(r.amount)||0,category:r.category||"",date:r.date||"",note:r.note||"",createdAt:r.createdAt||""}))};
    }
    function compareMigrationRoundTrip(original,restored){
      const left=comparableMigrationSnapshot(original), right=comparableMigrationSnapshot(restored), diffs=[];
      const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
      const walk=(a,b,path)=>{if(same(a,b))return; if(Array.isArray(a)||Array.isArray(b)){if(!Array.isArray(a)||!Array.isArray(b)){diffs.push({path,original:a,restored:b,issue:"类型不一致"});return;} if(a.length!==b.length)diffs.push({path:`${path}.length`,original:a.length,restored:b.length,issue:"长度不一致"}); for(let i=0;i<Math.max(a.length,b.length);i++)walk(a[i],b[i],`${path}[${i}]`); return;} if(a&&b&&typeof a==="object"&&typeof b==="object"){const keys=[...new Set([...Object.keys(a),...Object.keys(b)])].sort(); keys.forEach(k=>walk(a[k],b[k],`${path}.${k}`)); return;} diffs.push({path,original:a,restored:b,issue:"值不一致"});};
      walk(left.data.nextSeq,right.data.nextSeq,"data.nextSeq");
      ["tags","messageKinds","members","rooms","messages","polls","handoffNotes","frontingLogs","tasks","careLogs","careChecklist","systemProfile","systemProfileVisibility","memberRelations","externalSystemCards"].forEach(k=>walk(left.data[k],right.data[k],`data.${k}`));
      walk(left.prefs,right.prefs,"prefs");
      walk(left.ledgerRecords,right.ledgerRecords,"ledgerRecords");
      return diffs;
    }
    function migrationTableCounts(tables){return Object.fromEntries(Object.entries(tables).map(([name,rows])=>[name,Array.isArray(rows)?rows.length:0]));}
    function runMigrationRoundTripCheck(){
      const original={data,prefs,ledgerRecords};
      const tables=normalizeForStorage(data,prefs,ledgerRecords);
      const restored=denormalizeFromStorage(tables);
      const diffs=compareMigrationRoundTrip(original,restored);
      console.log("迁移往返表行数统计",migrationTableCounts(tables));
      if(console.table)console.table(diffs); else console.log(diffs);
      if(!diffs.length)console.log("迁移往返校验通过");
      else console.warn(`迁移往返校验发现 ${diffs.length} 个差异`,diffs);
      return {ok:diffs.length===0,diffCount:diffs.length,diffs,tables,restored};
    }
    window.MEMBER_FIELD_VISIBILITIES=MEMBER_FIELD_VISIBILITIES;
    window.SYSTEM_PROFILE_VISIBILITY_KEYS=SYSTEM_PROFILE_VISIBILITY_KEYS;
    window.systemProfileVisibilityText=systemProfileVisibilityText;
    window.normalizeVisibilityValue=normalizeVisibilityValue;
    window.normalizeSystemProfileVisibilityValue=normalizeSystemProfileVisibilityValue;
    window.normalizeSystemProfileVisibilityRecord=normalizeSystemProfileVisibilityRecord;
    window.normalizeMemberAliasesInput=normalizeMemberAliasesInput;
    window.normalizeMemberCustomFieldVisibility=normalizeMemberCustomFieldVisibility;
    window.normalizeMemberCustomFields=normalizeMemberCustomFields;
    window.normalizeMemberStatusHistory=normalizeMemberStatusHistory;
    window.normalizeMemberRecord=normalizeMemberRecord;
    window.normalizeCareLogRecord=normalizeCareLogRecord;
    window.normalizeCareChecklistRecord=normalizeCareChecklistRecord;
    window.normalizeForStorage=normalizeForStorage;
    window.denormalizeFromStorage=denormalizeFromStorage;
    window.compareMigrationRoundTrip=compareMigrationRoundTrip;
    window.runMigrationRoundTripCheck=runMigrationRoundTripCheck;
