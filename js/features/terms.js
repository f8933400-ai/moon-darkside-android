    (function(){
      const FALLBACK_TERMS={member:"成员",system:"系统",fronting:"前台",cofronting:"共前台",room:"群组",privateRoom:"私聊",handoff:"交接",poll:"投票",decision:"议题",task:"任务",care:"照护",continuity:"接续",backupHealth:"备份健康检查"};
      const TERM_INPUT_IDS={member:"termMember",system:"termSystem",fronting:"termFronting",cofronting:"termCofronting",room:"termRoom",privateRoom:"termPrivateRoom",handoff:"termHandoff",poll:"termPoll",decision:"termDecision",task:"termTask",care:"termCare",continuity:"termContinuity",backupHealth:"termBackupHealth"};
      function defaultTerms(){
        const source=(typeof DEFAULT_TERMS==="object"&&DEFAULT_TERMS)?DEFAULT_TERMS:FALLBACK_TERMS;
        return {...source};
      }
      function normalizeTerms(terms){
        const defaults=defaultTerms();
        const source=terms&&typeof terms==="object"&&!Array.isArray(terms)?terms:{};
        const out={};
        Object.keys(defaults).forEach(key=>{
          const value=source[key];
          out[key]=typeof value==="string"&&value.trim()?value.trim():defaults[key];
        });
        return out;
      }
      function runtimePrefs(){
        try{return typeof prefs==="undefined"?null:prefs;}catch{return null;}
      }
      function term(key){
        const defaults=defaultTerms();
        const safeKey=String(key||"");
        if(!Object.prototype.hasOwnProperty.call(defaults,safeKey))return safeKey;
        const p=runtimePrefs();
        const value=p?.terms?.[safeKey];
        return typeof value==="string"&&value.trim()?value.trim():defaults[safeKey];
      }
      function termsSnapshot(){
        const p=runtimePrefs();
        return normalizeTerms(p?.terms||{});
      }
      function getTermInputValue(key){
        const id=TERM_INPUT_IDS[key];
        const el=id?document.getElementById(id):null;
        return el?el.value:"";
      }
      function setTextById(id,text){
        const el=document.getElementById(id);
        if(el)el.textContent=text;
      }
      function setTermTextById(id,key,fallbackSuffix){
        setTextById(id,`${term(key)}${fallbackSuffix||""}`);
      }
      function setModalTitle(modalId,text){
        const title=document.querySelector(`#${modalId} h2`);
        if(title)title.textContent=text;
      }
      function setInputPlaceholder(id,text){
        const el=document.getElementById(id);
        if(el)el.placeholder=text;
      }
      function setLabelTextForControl(id,text){
        const control=document.getElementById(id);
        const label=control?.closest("label")||document.querySelector(`label[for="${id}"]`);
        if(!label)return;
        const node=[...label.childNodes].find(child=>child.nodeType===Node.TEXT_NODE);
        if(node)node.nodeValue=text;
        else label.insertBefore(document.createTextNode(text),label.firstChild);
      }
      function setCheckboxLabelText(id,text){
        const control=document.getElementById(id);
        const label=control?.closest("label");
        if(!label)return;
        const node=[...label.childNodes].find(child=>child.nodeType===Node.TEXT_NODE);
        if(node)node.nodeValue=` ${text}`;
        else label.appendChild(document.createTextNode(` ${text}`));
      }
      function setSelectOptionText(selectId,labels){
        const select=document.getElementById(selectId);
        if(!select)return;
        Object.entries(labels).forEach(([value,text])=>{
          const option=[...select.options].find(item=>item.value===value);
          if(option)option.textContent=text;
        });
      }
      function applyRoomModalTerms(){
        const roomId=document.getElementById("roomId")?.value||"";
        let isPrivate=false;
        try{
          const row=(data?.rooms||[]).find(r=>r&&r.id===roomId);
          isPrivate=!!(row&&typeof isPrivateRoom==="function"&&isPrivateRoom(row));
        }catch{}
        const roomWord=isPrivate?term("privateRoom"):term("room");
        setTextById("roomModalTitle",roomId?`编辑${roomWord}`:`新建${term("room")}`);
        setTextById("roomNameLabel",`${roomWord}名称`);
        setTextById("roomDescLabel",isPrivate?`${term("privateRoom")}说明`:"说明");
      }
      function applyAdvancedSearchTerms(){
        setInputPlaceholder("advancedSearchKeyword",`搜索消息、${term("member")}、${term("handoff")}、${term("poll")}、${term("fronting")}或${term("task")}`);
        setLabelTextForControl("advancedSearchMember",term("member"));
        setLabelTextForControl("advancedSearchRoom",`${term("room")} / ${term("privateRoom")}`);
        setCheckboxLabelText("advancedSearchTypeMembers",term("member"));
        setCheckboxLabelText("advancedSearchTypeRooms",`${term("room")} / ${term("privateRoom")}`);
        setCheckboxLabelText("advancedSearchTypeHandoffs",term("handoff"));
        setCheckboxLabelText("advancedSearchTypePolls",term("poll"));
        setCheckboxLabelText("advancedSearchTypeFronting",term("fronting"));
        setCheckboxLabelText("advancedSearchTypeTasks",term("task"));
      }
      function applyTermsToStaticLabels(){
        const p=runtimePrefs();
        if(p)p.terms=normalizeTerms(p.terms);
        setTextById("tabRooms",term("room"));
        setTextById("tabPrivate",term("privateRoom"));
        setTextById("tabMembers",term("member"));
        setTextById("addRoomBtn",`新建${term("room")}`);
        setTextById("addPrivateBtn",`新建${term("privateRoom")}`);
        setTextById("addMemberBtn",`新建${term("member")}`);
        setTermTextById("systemBtn","system");
        setTermTextById("handoffBtn","handoff");
        setTermTextById("pollBtn","poll");
        setTermTextById("careBtn","care");
        setTermTextById("arrivalBtn","continuity");
        setTermTextById("backupHealthBtn","backupHealth");
        setInputPlaceholder("search",`搜索${term("room")}、${term("privateRoom")}或${term("member")}`);
        const memberTitle=document.getElementById("memberModalTitle");
        if(memberTitle)memberTitle.textContent=document.getElementById("memberId")?.value?`编辑${term("member")}`:`新建${term("member")}`;
        applyRoomModalTerms();
        setModalTitle("privateModal",`创建${term("privateRoom")} / 小群聊`);
        setModalTitle("systemModal",`${term("system")}档案`);
        setModalTitle("frontingModal",`${term("fronting")}记录`);
        setModalTitle("handoffModal",`${term("handoff")}便签`);
        setModalTitle("pollModal",`${term("decision")} / ${term("poll")}`);
        setModalTitle("careModal",`${term("care")} / 需求看板`);
        setModalTitle("arrivalModal",`${term("continuity")}面板`);
        setModalTitle("backupHealthModal",term("backupHealth"));
        setTextById("createPollBtn",`发起${term("decision")}`);
        setTextById("saveCareLogBtn",`保存${term("care")}记录`);
        setTextById("frontingEndBtn",`结束当前${term("fronting")}`);
        setTextById("arrivalWriteHandoffBtn",`写${term("handoff")}`);
        setTextById("arrivalOpenFrontingBtn",`记下当前${term("fronting")}`);
        const taskTitle=document.querySelector(".task-list-title");
        if(taskTitle)taskTitle.textContent=term("task");
        const systemTabs={systemProfilePanel:`${term("system")}简介`,memberRelationsPanel:`${term("member")}关系`,systemCardPanel:`${term("system")}名片`};
        Object.entries(systemTabs).forEach(([panel,text])=>{
          const btn=document.querySelector(`#systemModal .settings-tabs button[data-panel="${panel}"]`);
          if(btn)btn.textContent=text;
        });
        const careTitles=document.querySelectorAll("#careModal .care-section h3");
        if(careTitles[1])careTitles[1].textContent=`最近${term("care")}记录`;
        if(careTitles[2])careTitles[2].textContent=`${term("care")}清单`;
        const pollLabels=document.querySelectorAll("#pollModal .poll-modal > label");
        if(pollLabels[0])pollLabels[0].textContent=`${term("decision")}标题`;
        if(pollLabels[1])pollLabels[1].textContent=`${term("decision")}说明（可留空）`;
        setLabelTextForControl("handoffTemplate",`${term("handoff")}模板`);
        setCheckboxLabelText("handoffCreateTask",`同时创建接力${term("task")}`);
        setCheckboxLabelText("showAllPrivateRooms",`管理模式：全${term("system")}视角显示所有${term("privateRoom")} / 小群聊`);
        setCheckboxLabelText("showArrivalOnEnter",`进入记录界面时显示${term("continuity")}面板`);
        setSelectOptionText("frontingStateType",{front:term("fronting"),cofront:term("cofronting"),near:`靠近${term("fronting")}`});
        applyAdvancedSearchTerms();
        if(typeof renderFrontingStatus==="function")renderFrontingStatus();
      }
      function populateTermsSettings(){
        const snapshot=termsSnapshot();
        Object.entries(TERM_INPUT_IDS).forEach(([key,id])=>{
          const el=document.getElementById(id);
          if(el)el.value=snapshot[key]||defaultTerms()[key]||"";
        });
      }
      async function saveTermsFromSettings(){
        const p=runtimePrefs();
        if(!p)return;
        const raw={};
        Object.keys(TERM_INPUT_IDS).forEach(key=>{raw[key]=getTermInputValue(key);});
        p.terms=normalizeTerms(raw);
        if(typeof savePrefs==="function"&&!(await savePrefs()))return;
        populateTermsSettings();
        applyTermsToStaticLabels();
        if(typeof render==="function"){
          await Promise.resolve(render());
          applyTermsToStaticLabels();
        }
      }
      async function resetTermsToDefault(){
        if(!confirm("确认恢复默认术语吗？"))return;
        const p=runtimePrefs();
        if(!p)return;
        p.terms=defaultTerms();
        if(typeof savePrefs==="function"&&!(await savePrefs()))return;
        populateTermsSettings();
        applyTermsToStaticLabels();
        if(typeof render==="function"){
          await Promise.resolve(render());
          applyTermsToStaticLabels();
        }
      }
      window.defaultTerms=defaultTerms;
      window.normalizeTerms=normalizeTerms;
      window.term=term;
      window.termsSnapshot=termsSnapshot;
      window.setTermTextById=setTermTextById;
      window.applyTermsToStaticLabels=applyTermsToStaticLabels;
      window.populateTermsSettings=populateTermsSettings;
      window.saveTermsFromSettings=saveTermsFromSettings;
      window.resetTermsToDefault=resetTermsToDefault;
      window.getTermInputValue=getTermInputValue;
    })();
