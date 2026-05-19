    (function(){
      const careFields=[
        {key:"hunger",id:"careHunger",label:"饥饿 / 进食"},
        {key:"thirst",id:"careThirst",label:"饮水"},
        {key:"sleep",id:"careSleep",label:"睡眠"},
        {key:"pain",id:"carePain",label:"疼痛 / 不适"},
        {key:"energy",id:"careEnergy",label:"精力"},
        {key:"sensory",id:"careSensory",label:"感官负荷"},
        {key:"mood",id:"careMood",label:"情绪"},
        {key:"meds",id:"careMeds",label:"药物备注"},
        {key:"note",id:"careNote",label:"其他备注"}
      ];

      function careData(){
        try{return data&&typeof data==="object"?data:{};}catch{return {};}
      }
      function careArray(value){
        return Array.isArray(value)?value:[];
      }
      function careEscape(value){
        return typeof esc==="function"?esc(value):String(value||"").replace(/[&<>"']/g,mark=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[mark]));
      }
      function careTimeMs(value){
        const t=new Date(value||"").getTime();
        return Number.isFinite(t)?t:0;
      }
      function careFormatTime(value){
        const d=new Date(value||"");
        return Number.isNaN(d.getTime())?"未记录时间":d.toLocaleString();
      }
      function careMemberName(id){
        const d=careData();
        return careArray(d.members).find(m=>m&&m.id===id)?.name||"未记录成员";
      }
      function careCurrentRoom(){
        try{
          if(typeof room==="function")return room();
        }catch{}
        const d=careData();
        try{return careArray(d.rooms).find(r=>r&&r.id===currentRoomId)||d.rooms?.[0]||null;}catch{return d.rooms?.[0]||null;}
      }
      function careCurrentSpeaker(){
        try{
          const id=speaker?.value||"";
          return id&&typeof member==="function"?member(id):null;
        }catch{return null;}
      }
      function careValue(id){
        const el=document.getElementById(id);
        return el?String(el.value||"").trim():"";
      }
      function careCheckbox(id){
        return !!document.getElementById(id)?.checked;
      }
      function ensureCareArrays(){
        const d=careData();
        if(!Array.isArray(d.careLogs))d.careLogs=[];
        if(!Array.isArray(d.careChecklist))d.careChecklist=[];
        return d;
      }
      function normalizeCareLogForRuntime(log){
        if(typeof window.normalizeCareLogRecord==="function")return window.normalizeCareLogRecord(log);
        const source=log&&typeof log==="object"?log:{};
        const createdAt=source.createdAt||source.at||now();
        return {
          ...source,
          id:source.id||makeId(),
          hunger:String(source.hunger||""),
          thirst:String(source.thirst||""),
          sleep:String(source.sleep||""),
          pain:String(source.pain||""),
          energy:String(source.energy||""),
          sensory:String(source.sensory||""),
          mood:String(source.mood||""),
          meds:String(source.meds||""),
          note:String(source.note||""),
          createdByMemberId:String(source.createdByMemberId||""),
          createdAt
        };
      }
      function normalizeCareChecklistForRuntime(item){
        if(typeof window.normalizeCareChecklistRecord==="function")return window.normalizeCareChecklistRecord(item);
        const source=item&&typeof item==="object"?item:{};
        const createdAt=source.createdAt||now();
        return {...source,id:source.id||makeId(),title:String(source.title||"").trim()||"未命名照护项",done:!!source.done,createdAt,updatedAt:source.updatedAt||createdAt||now()};
      }
      function collectCareLogForm(){
        const values={};
        careFields.forEach(field=>{values[field.key]=careValue(field.id);});
        return values;
      }
      function summarizeCareLog(log){
        const source=log||{};
        const parts=careFields.map(field=>{
          const value=String(source[field.key]||"").trim();
          return value?`${field.label}：${value}`:"";
        }).filter(Boolean);
        return parts.join("；");
      }
      function careLogCard(log){
        const row=normalizeCareLogForRuntime(log);
        const summary=summarizeCareLog(row);
        return `<div class="care-log-card">
          <div class="care-log-head"><strong>${careEscape(careFormatTime(row.createdAt))}</strong><span>${careEscape(careMemberName(row.createdByMemberId))}</span></div>
          <p>${careEscape(summary||"（无摘要）")}</p>
          <div class="care-actions"><button class="danger small" type="button" data-care-log-delete="${careEscape(row.id)}">删除</button></div>
        </div>`;
      }
      function renderCareLogs(){
        const box=document.getElementById("careLogList");
        if(!box)return;
        const d=ensureCareArrays();
        const rows=d.careLogs.slice().map(normalizeCareLogForRuntime).sort((a,b)=>careTimeMs(b.createdAt)-careTimeMs(a.createdAt)).slice(0,10);
        box.innerHTML=rows.length?rows.map(careLogCard).join(""):'<div class="care-empty">还没有照护记录。</div>';
      }
      function renderCareChecklist(){
        const box=document.getElementById("careChecklistList");
        if(!box)return;
        const d=ensureCareArrays();
        const rows=d.careChecklist.slice().map(normalizeCareChecklistForRuntime).sort((a,b)=>{
          const doneRank=(a.done?1:0)-(b.done?1:0);
          if(doneRank)return doneRank;
          return careTimeMs(b.updatedAt||b.createdAt)-careTimeMs(a.updatedAt||a.createdAt);
        });
        if(!rows.length){
          box.innerHTML='<div class="care-empty">还没有照护清单项。</div>';
          return;
        }
        box.innerHTML=rows.map(item=>`<div class="care-check-item ${item.done?"done":""}">
          <label><input type="checkbox" data-care-check-toggle="${careEscape(item.id)}" ${item.done?"checked":""} /><span>${careEscape(item.title)}</span></label>
          <button class="danger small" type="button" data-care-check-delete="${careEscape(item.id)}">删除</button>
        </div>`).join("");
      }
      function resetCareLogForm(){
        careFields.forEach(field=>{const el=document.getElementById(field.id); if(el)el.value="";});
        const write=document.getElementById("careWriteToChat");
        if(write)write.checked=false;
      }
      function openCareModal(){
        ensureCareArrays();
        renderCareLogs();
        renderCareChecklist();
        const write=document.getElementById("careWriteToChat");
        if(write)write.checked=false;
        if(typeof openModal==="function")openModal("careModal");
        else {
          const modal=document.getElementById("careModal");
          if(modal)modal.style.display="flex";
        }
      }
      async function saveCareLog(){
        const d=ensureCareArrays();
        const values=collectCareLogForm();
        if(!Object.values(values).some(Boolean)){
          alert("可以先填写至少一项，或者关闭窗口。");
          return;
        }
        const sp=careCurrentSpeaker();
        const log=normalizeCareLogForRuntime({...values,id:makeId(),createdByMemberId:sp?.id||"",createdAt:now()});
        d.careLogs.push(log);
        let wroteChat=false;
        if(careCheckbox("careWriteToChat")){
          const r=careCurrentRoom();
          if(!r||!r.id){
            alert("当前没有可写入的聊天，照护记录已先保存在照护板。");
          }else{
            const speakerForMessage=sp||{id:"system",name:"系统记录"};
            data.messages.push(makeMessage({
              roomId:r.id,
              speakerId:speakerForMessage.id,
              speakerName:speakerForMessage.name,
              kind:"状态",
              text:`照护记录（生活记录，不是医疗建议）\n${summarizeCareLog(log)}`
            }));
            wroteChat=true;
          }
        }
        if(!(await save()))return;
        renderCareLogs();
        resetCareLogForm();
        if(wroteChat){
          if(typeof renderChat==="function")await renderChat();
          if(typeof renderList==="function")renderList();
        }
      }
      async function deleteCareLog(id){
        if(!id)return;
        if(!confirm("确认删除这条照护记录吗？"))return;
        const d=ensureCareArrays();
        const before=d.careLogs.length;
        d.careLogs=d.careLogs.filter(row=>row&&row.id!==id);
        if(d.careLogs.length===before)return;
        if(!(await save()))return;
        renderCareLogs();
        if(typeof window.renderArrivalCard==="function")window.renderArrivalCard();
      }
      async function addCareChecklistItem(){
        const input=document.getElementById("careChecklistTitle");
        const title=String(input?.value||"").trim();
        if(!title){
          alert("请先填写照护项名称。");
          return;
        }
        const d=ensureCareArrays();
        const createdAt=now();
        d.careChecklist.push(normalizeCareChecklistForRuntime({id:makeId(),title,done:false,createdAt,updatedAt:createdAt}));
        if(!(await save()))return;
        if(input)input.value="";
        renderCareChecklist();
      }
      async function toggleCareChecklistItem(id,doneValue){
        const d=ensureCareArrays();
        const item=d.careChecklist.find(row=>row&&row.id===id);
        if(!item)return;
        item.done=typeof doneValue==="boolean"?doneValue:!item.done;
        item.updatedAt=now();
        if(await save())renderCareChecklist();
      }
      async function deleteCareChecklistItem(id){
        if(!id)return;
        const d=ensureCareArrays();
        const item=d.careChecklist.find(row=>row&&row.id===id);
        if(!item)return;
        if(!confirm(`确认删除照护项「${item.title||"未命名照护项"}」吗？`))return;
        d.careChecklist=d.careChecklist.filter(row=>row&&row.id!==id);
        if(await save())renderCareChecklist();
      }
      function getLatestCareLog(){
        const d=ensureCareArrays();
        return d.careLogs.slice().map(normalizeCareLogForRuntime).sort((a,b)=>careTimeMs(b.createdAt)-careTimeMs(a.createdAt))[0]||null;
      }

      window.openCareModal=openCareModal;
      window.saveCareLog=saveCareLog;
      window.renderCareLogs=renderCareLogs;
      window.renderCareChecklist=renderCareChecklist;
      window.addCareChecklistItem=addCareChecklistItem;
      window.toggleCareChecklistItem=toggleCareChecklistItem;
      window.deleteCareChecklistItem=deleteCareChecklistItem;
      window.deleteCareLog=deleteCareLog;
      window.getLatestCareLog=getLatestCareLog;
      window.summarizeCareLog=summarizeCareLog;
      window.resetCareLogForm=resetCareLogForm;
    })();
