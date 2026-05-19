    (function(){
      const validStatuses=["todo","doing","done","paused"];
      const validSources=["manual","handoff"];
      const statusOrder={todo:0,doing:1,paused:2,done:3};
      const taskStatusLabels={todo:"待接力",doing:"进行中",done:"已完成",paused:"已暂停"};
      const sourceText={manual:"手动",handoff:"交接"};

      function taskData(){
        try{return data||{};}catch{return {};}
      }
      function taskEscape(value){
        return typeof esc==="function"?esc(value):String(value||"").replace(/[&<>"']/g,mark=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[mark]));
      }
      function compactTaskText(value,max){
        const text=String(value||"").replace(/\s+/g," ").trim();
        return text.length>max?`${text.slice(0,max)}...`:text;
      }
      function taskTimeMs(value,emptyValue){
        const t=new Date(value||"").getTime();
        return Number.isFinite(t)?t:emptyValue;
      }
      function taskFormatTime(value,emptyText){
        const d=new Date(value||"");
        return Number.isNaN(d.getTime())?emptyText:d.toLocaleString();
      }
      function taskMembers(){
        const d=taskData();
        return Array.isArray(d.members)?d.members:[];
      }
      function taskMemberName(id){
        return taskMembers().find(m=>m&&m.id===id)?.name||`已移除${term("member")}`;
      }
      function taskSourceText(source){
        if(source==="handoff")return term("handoff");
        return sourceText[source]||source||"手动";
      }
      function normalizeTask(task){
        const source=task&&typeof task==="object"?task:{};
        const detail=source.detail==null?"":String(source.detail);
        const rawTitle=String(source.title||"").trim();
        const title=(rawTitle||detail.slice(0,20)||"未命名任务").trim()||"未命名任务";
        const validMemberIds=new Set(taskMembers().map(m=>m.id));
        const legacyIds=[source.assigneeMemberId,source.ownerMemberId,source.memberId,source.claimedBy].map(id=>String(id||"")).filter(Boolean);
        const rawIds=Array.isArray(source.assignedMemberIds)?source.assignedMemberIds.map(id=>String(id||"")).filter(Boolean):legacyIds;
        const assignedMemberIds=[...new Set(rawIds)].filter(id=>!validMemberIds.size||validMemberIds.has(id));
        const createdAt=source.createdAt||now();
        return {...source,id:source.id||makeId(),title,detail,status:validStatuses.includes(source.status)?source.status:"todo",assignedMemberIds,dueAt:source.dueAt||"",source:validSources.includes(source.source)?source.source:"manual",linkedHandoffId:source.linkedHandoffId||"",createdAt,updatedAt:source.updatedAt||createdAt||now()};
      }
      function compareOpenTasks(a,b){
        const due=taskTimeMs(a.dueAt,Number.POSITIVE_INFINITY)-taskTimeMs(b.dueAt,Number.POSITIVE_INFINITY);
        if(due)return due;
        const rank=(statusOrder[a.status]??9)-(statusOrder[b.status]??9);
        if(rank)return rank;
        return taskTimeMs(b.updatedAt||b.createdAt,0)-taskTimeMs(a.updatedAt||a.createdAt,0);
      }
      function compareDisplayTasks(a,b){
        const doneRank=(a.status==="done"?1:0)-(b.status==="done"?1:0);
        if(doneRank)return doneRank;
        const rank=(statusOrder[a.status]??9)-(statusOrder[b.status]??9);
        if(rank)return rank;
        const due=taskTimeMs(a.dueAt,Number.POSITIVE_INFINITY)-taskTimeMs(b.dueAt,Number.POSITIVE_INFINITY);
        if(due)return due;
        return taskTimeMs(b.updatedAt||b.createdAt,0)-taskTimeMs(a.updatedAt||a.createdAt,0);
      }
      function getOpenTasks(){
        const d=taskData();
        if(!Array.isArray(d.tasks))return [];
        return d.tasks.filter(task=>task&&task.status!=="done").slice().sort(compareOpenTasks);
      }
      function createTask(taskInput){
        const d=taskData();
        d.tasks=Array.isArray(d.tasks)?d.tasks:[];
        const task=normalizeTask(taskInput||{});
        d.tasks.push(task);
        return task;
      }
      async function updateTaskStatus(taskId,status){
        if(!validStatuses.includes(status))return null;
        const d=taskData();
        if(!Array.isArray(d.tasks))d.tasks=[];
        const task=d.tasks.find(item=>item&&item.id===taskId);
        if(!task)return null;
        task.status=status;
        task.updatedAt=now();
        if(await save())renderTasks();
        return task;
      }
      function startTask(taskId){return updateTaskStatus(taskId,"doing");}
      function completeTask(taskId){return updateTaskStatus(taskId,"done");}
      function pauseTask(taskId){return updateTaskStatus(taskId,"paused");}
      function resumeTask(taskId){return updateTaskStatus(taskId,"todo");}
      async function deleteTask(taskId,options={}){
        const d=taskData();
        if(!Array.isArray(d.tasks))d.tasks=[];
        const task=d.tasks.find(item=>item&&item.id===taskId);
        if(!task)return false;
        if(!options.skipConfirm&&!confirm(`确定删除${term("task")}「${task.title||`未命名${term("task")}`}」吗？`))return false;
        d.tasks=d.tasks.filter(item=>item&&item.id!==taskId);
        if(await save()){renderTasks(); return true;}
        return false;
      }
      function taskMembersText(task){
        const ids=Array.isArray(task.assignedMemberIds)?task.assignedMemberIds:[];
        return ids.length?ids.map(taskMemberName).join(" / "):"可留空";
      }
      function taskActionButtons(task){
        const id=taskEscape(task.id);
        const buttons=[];
        if(task.status==="todo"||task.status==="paused")buttons.push(`<button class="light small" type="button" data-task-action="start" data-task-id="${id}">开始</button>`);
        if(task.status==="todo"||task.status==="doing"||task.status==="paused")buttons.push(`<button class="light small" type="button" data-task-action="complete" data-task-id="${id}">完成</button>`);
        if(task.status==="todo"||task.status==="doing")buttons.push(`<button class="light small" type="button" data-task-action="pause" data-task-id="${id}">暂停</button>`);
        if(task.status==="paused")buttons.push(`<button class="light small" type="button" data-task-action="resume" data-task-id="${id}">恢复</button>`);
        buttons.push(`<button class="danger small" type="button" data-task-action="delete" data-task-id="${id}">删除</button>`);
        return buttons.join("");
      }
      function taskCard(task){
        const detail=compactTaskText(task.detail,120);
        const linked=task.linkedHandoffId?`<span>来自${term("handoff")}</span>`:"";
        return `<div class="task-card ${task.status==="done"?"done":""}">
          <div class="task-card-head"><strong>${taskEscape(task.title)}</strong><span class="task-status ${taskEscape(task.status)}">${taskEscape(taskStatusLabels[task.status]||task.status)}</span></div>
          ${detail?`<p>${taskEscape(detail)}</p>`:""}
          <div class="task-meta">
            <span>截止：${taskEscape(taskFormatTime(task.dueAt,"可留空"))}</span>
            <span>${taskEscape(term("member"))}：${taskEscape(taskMembersText(task))}</span>
            <span>来源：${taskEscape(taskSourceText(task.source))}</span>
            ${linked}
            <span>创建：${taskEscape(taskFormatTime(task.createdAt,"未记录"))}</span>
            <span>更新：${taskEscape(taskFormatTime(task.updatedAt||task.createdAt,"未记录"))}</span>
          </div>
          <div class="task-actions">${taskActionButtons(task)}</div>
        </div>`;
      }
      function renderTasks(){
        const box=document.getElementById("taskList");
        if(!box)return;
        bindTaskListEvents();
        const d=taskData();
        const tasks=Array.isArray(d.tasks)?d.tasks.slice().map(normalizeTask).sort(compareDisplayTasks):[];
        const open=tasks.filter(task=>task.status!=="done");
        const done=tasks.filter(task=>task.status==="done").sort((a,b)=>taskTimeMs(b.updatedAt||b.createdAt,0)-taskTimeMs(a.updatedAt||a.createdAt,0)).slice(0,5);
        if(!open.length&&!done.length){
          box.innerHTML=`<div class="task-empty">还没有${taskEscape(term("task"))}。可以在保存${taskEscape(term("handoff"))}时一并创建。</div>`;
          return;
        }
        box.innerHTML=[
          open.length?`<div class="task-section-title">未完成</div>${open.map(taskCard).join("")}`:`<div class="task-empty">当前没有未完成${taskEscape(term("task"))}。</div>`,
          done.length?`<div class="task-section-title">已完成（最近 5 条）</div>${done.map(taskCard).join("")}`:""
        ].filter(Boolean).join("");
      }
      function renderTaskMemberPicker(){
        const box=document.getElementById("handoffTaskMemberPicker");
        if(!box)return;
        const members=taskMembers();
        if(!members.length){
          box.innerHTML=`<div class="task-empty compact">还没有${taskEscape(term("member"))}，可先留空。</div>`;
          return;
        }
        box.innerHTML=members.map(m=>{
          const state=typeof window.statusText==="function"?window.statusText(m.status):m.status;
          return `<label class="task-member-row"><input type="checkbox" value="${taskEscape(m.id)}" /><span>${taskEscape(m.name||`未命名${term("member")}`)}</span><small>${taskEscape(state||"")}</small></label>`;
        }).join("");
      }
      function collectTaskAssignedMemberIds(containerId){
        const box=document.getElementById(containerId||"handoffTaskMemberPicker");
        if(!box)return [];
        return [...box.querySelectorAll('input[type="checkbox"]:checked')].map(input=>input.value).filter(Boolean);
      }
      function resetHandoffTaskForm(){
        const create=document.getElementById("handoffCreateTask");
        const title=document.getElementById("handoffTaskTitle");
        const detail=document.getElementById("handoffTaskDetail");
        const due=document.getElementById("handoffTaskDueAt");
        if(create)create.checked=false;
        if(title)title.value="";
        if(detail)detail.value="";
        if(due)due.value="";
        const box=document.getElementById("handoffTaskMemberPicker");
        if(box)box.querySelectorAll('input[type="checkbox"]').forEach(input=>{input.checked=false;});
        toggleHandoffTaskFields();
      }
      function toggleHandoffTaskFields(){
        const create=document.getElementById("handoffCreateTask");
        const fields=document.getElementById("handoffTaskFields");
        if(fields)fields.style.display=create&&create.checked?"block":"none";
      }
      function bindTaskListEvents(){
        const box=document.getElementById("taskList");
        if(!box||box.dataset.bound==="1")return;
        box.dataset.bound="1";
        box.addEventListener("click",event=>{
          const btn=event.target.closest("[data-task-action]");
          if(!btn)return;
          const id=btn.dataset.taskId;
          const action=btn.dataset.taskAction;
          if(action==="start")startTask(id);
          if(action==="complete")completeTask(id);
          if(action==="pause")pauseTask(id);
          if(action==="resume")resumeTask(id);
          if(action==="delete")deleteTask(id);
        });
      }

      bindTaskListEvents();
      window.normalizeTask=normalizeTask;
      window.getOpenTasks=getOpenTasks;
      window.renderTasks=renderTasks;
      window.createTask=createTask;
      window.updateTaskStatus=updateTaskStatus;
      window.completeTask=completeTask;
      window.pauseTask=pauseTask;
      window.resumeTask=resumeTask;
      window.startTask=startTask;
      window.deleteTask=deleteTask;
      window.renderTaskMemberPicker=renderTaskMemberPicker;
      window.collectTaskAssignedMemberIds=collectTaskAssignedMemberIds;
      window.resetHandoffTaskForm=resetHandoffTaskForm;
      window.toggleHandoffTaskFields=toggleHandoffTaskFields;
    })();
