    const POLL_DEFAULT_OPTIONS=["同意","不同意","弃权","需要更多信息","否决"];
    const POLL_STATUS_LABELS={open:"进行中",closed:"已结束",paused:"已暂停",cancelled:"已取消",canceled:"已取消",done:"已结束",decided:"已结束"};
    const POLL_VOTE_MODE_LABELS={simple:"简单多数",consensus:"共识优先"};
    function pollSafeId(value){return String(value||"poll").replace(/[^a-zA-Z0-9_-]/g,"_");}
    function pollCommentInputId(pollId){return `pollComment-${pollSafeId(pollId)}`;}
    function pollDecisionInputId(pollId){return `pollDecisionText-${pollSafeId(pollId)}`;}
    function pollRadioName(pollId){return `poll-${pollSafeId(pollId)}`;}
    function pollPlainObject(value){return !!value&&typeof value==="object"&&!Array.isArray(value);}
    function pollOptions(poll){
      const raw=Array.isArray(poll?.options)?poll.options:[];
      const rows=raw.map((option,index)=>{
        if(typeof option==="string"){
          const text=option.trim();
          return text?{id:text,text}:null;
        }
        if(pollPlainObject(option)){
          const text=String(option.text??option.label??option.value??"").trim();
          if(!text)return null;
          return {...option,id:String(option.id||`option-${index}`),text};
        }
        return null;
      }).filter(Boolean);
      return rows.length?rows:POLL_DEFAULT_OPTIONS.map((text,index)=>({id:`default-${index}`,text}));
    }
    function pollVotes(poll){return pollPlainObject(poll?.votes)?poll.votes:{};}
    function pollComments(poll){return pollPlainObject(poll?.comments)?poll.comments:{};}
    function pollDeadlineText(value){return value?new Date(value).toLocaleString():"未设置";}
    function pollDateTimeText(value,emptyText="可留空"){const d=new Date(value||""); return Number.isNaN(d.getTime())?emptyText:d.toLocaleString();}
    function pollStatusText(status){return POLL_STATUS_LABELS[String(status||"open")]||status||"未记录";}
    function pollVoteModeText(voteMode){return POLL_VOTE_MODE_LABELS[String(voteMode||"simple")]||"简单多数";}
    function getPollById(pollOrId){if(pollPlainObject(pollOrId))return pollOrId; return (data.polls||[]).find(x=>x&&x.id===pollOrId)||null;}
    function getPollVoteCounts(poll){
      const options=pollOptions(poll);
      const counts={};
      options.forEach(option=>{counts[option.id]=0;});
      Object.values(pollVotes(poll)).forEach(optionId=>{
        const value=String(optionId||"");
        if(counts[value]!=null){counts[value]+=1; return;}
        const byText=options.find(option=>option.text===value);
        if(byText)counts[byText.id]+=1;
        else counts.__unknown=(counts.__unknown||0)+1;
      });
      return counts;
    }
    function getPollOptionText(poll,optionId){
      const value=String(optionId||"");
      const option=pollOptions(poll).find(item=>item.id===value||item.text===value);
      return option?.text||"未知选项";
    }
    function getPollTotalVotes(poll){return Object.values(pollVotes(poll)).filter(Boolean).length;}
    function pollVoteCountsText(poll){
      const counts=getPollVoteCounts(poll);
      const lines=pollOptions(poll).map(option=>`${option.text}：${counts[option.id]||0} 票`);
      if(counts.__unknown)lines.push(`未知选项：${counts.__unknown} 票`);
      return lines.join("\n");
    }
    function getPollWinningSummary(poll){
      const options=pollOptions(poll);
      const counts=getPollVoteCounts(poll);
      const total=getPollTotalVotes(poll);
      if(!total)return "暂无投票";
      const ranked=options.slice().sort((a,b)=>(counts[b.id]||0)-(counts[a.id]||0));
      const topCount=counts[ranked[0]?.id]||0;
      if(!topCount)return "暂无有效投票";
      const winners=ranked.filter(option=>(counts[option.id]||0)===topCount);
      if(winners.length>1)return `当前并列：${winners.map(option=>option.text).join(" / ")}（${topCount} 票）`;
      return `最多选择：${winners[0].text}（${topCount} 票）`;
    }
    function getPollCommentItems(poll,maxCount=5){
      const rows=Object.entries(pollComments(poll)).filter(([,text])=>typeof text==="string"&&text.trim()).map(([memberId,text])=>({memberId,memberName:member(memberId)?.name||"未知成员",text:text.trim()}));
      const limit=Math.max(1,Number(maxCount)||5);
      return {items:rows.slice(0,limit),hidden:Math.max(0,rows.length-limit),total:rows.length};
    }
    function getPollCommentsSummary(poll,maxCount=5){
      const summary=getPollCommentItems(poll,maxCount);
      if(!summary.items.length)return "暂无投票理由";
      const lines=summary.items.map(item=>`${item.memberName}：${item.text}`);
      if(summary.hidden)lines.push(`还有 ${summary.hidden} 条投票理由未显示`);
      return lines.join("\n");
    }
    function hasPollVeto(poll){
      const counts=getPollVoteCounts(poll);
      const veto=pollOptions(poll).find(option=>String(option.text||"").trim()==="否决");
      if(veto&&(counts[veto.id]||0)>0)return true;
      return Object.values(pollVotes(poll)).some(optionId=>String(optionId||"").trim()==="否决"||getPollOptionText(poll,optionId)==="否决");
    }
    function isPollReviewDue(poll){
      if(String(poll?.status||"open")!=="closed")return false;
      const t=new Date(poll?.reviewAt||"").getTime();
      return Number.isFinite(t)&&t<=Date.now();
    }
    function buildAutoPollDecisionText(poll){
      return [getPollWinningSummary(poll),pollVoteCountsText(poll),hasPollVeto(poll)?"存在否决，建议继续讨论或复盘。":""].filter(Boolean).join("\n");
    }
    function formatPollDecisionSummary(poll){
      const commentsSummary=getPollCommentsSummary(poll,5);
      const lines=[
        "议题 / 投票结果",
        `议题标题：${poll.title||"未命名议题"}`,
        poll.description?`议题说明：${poll.description}`:"",
        `决策方式：${pollVoteModeText(poll.voteMode)}`,
        poll.deadline?`截止时间：${pollDeadlineText(poll.deadline)}`:"截止时间：未设置",
        `参与：${getPollTotalVotes(poll)} 票`,
        `结果摘要：${getPollWinningSummary(poll)}`,
        `票数：\n${pollVoteCountsText(poll)}`,
        commentsSummary?`投票理由：\n${commentsSummary}`:"",
        `最终决定：\n${poll.decisionText||buildAutoPollDecisionText(poll)}`,
        poll.reviewAt?`复盘时间：${pollDateTimeText(poll.reviewAt)}`:"复盘时间：可留空",
        hasPollVeto(poll)?"存在否决，建议继续讨论或复盘。":""
      ];
      return lines.filter(Boolean).join("\n");
    }
    function pollResultText(poll){return formatPollDecisionSummary(poll);}
    function ensurePollFormDefaults(){
      const options=document.getElementById("pollOptions");
      const voteMode=document.getElementById("pollVoteMode");
      const deadline=document.getElementById("pollDeadline");
      if(options&&!options.value.trim())options.value=POLL_DEFAULT_OPTIONS.join("\n");
      if(voteMode&&!["simple","consensus"].includes(voteMode.value))voteMode.value="simple";
      if(deadline&&!deadline.value){const d=new Date(Date.now()+60*60*1000); d.setSeconds(0,0); deadline.value=d.toISOString().slice(0,16);}
    }
    function resetPollForm(){
      const setValue=(id,value)=>{const el=document.getElementById(id); if(el)el.value=value;};
      setValue("pollTitle","");
      setValue("pollDescription","");
      setValue("pollOptions",POLL_DEFAULT_OPTIONS.join("\n"));
      setValue("pollVoteMode","simple");
      setValue("pollReviewAt","");
      setValue("pollDeadline","");
      ensurePollFormDefaults();
    }
    async function createPoll(){
      const title=document.getElementById("pollTitle").value.trim();
      const description=document.getElementById("pollDescription")?.value.trim()||"";
      const optionLines=document.getElementById("pollOptions").value.split(/\n+/).map(x=>x.trim()).filter(Boolean);
      const voteMode=document.getElementById("pollVoteMode")?.value==="consensus"?"consensus":"simple";
      const deadline=document.getElementById("pollDeadline")?.value||"";
      const reviewAt=document.getElementById("pollReviewAt")?.value||"";
      if(!title){alert(`请先填写${term("decision")}标题。`);return;}
      if(optionLines.length<2){alert("请至少填写两个选项。");return;}
      if(deadline&&new Date(deadline).getTime()<=Date.now()){alert("截止时间需要晚于现在，或留空。");return;}
      const createdAt=now();
      const poll={id:makeId(),roomId:currentRoomId,title,description,options:optionLines.map(text=>({id:makeId(),text})),votes:{},comments:{},voteMode,reviewAt,decisionText:"",deadline,createdAt,updatedAt:createdAt,closedAt:"",status:"open"};
      data.polls=data.polls||[];
      data.polls.push(poll);
      data.messages.push(makeMessage({roomId:currentRoomId,speakerId:"system",speakerName:"系统通知",kind:"系统投票",text:["议题 / 投票已发起",`议题标题：${title}`,description?`议题说明：${description}`:"",`决策方式：${pollVoteModeText(voteMode)}`,deadline?`截止：${pollDeadlineText(deadline)}`:"截止：未设置",reviewAt?`复盘：${pollDateTimeText(reviewAt)}`:"",`选项：\n${optionLines.map((x,i)=>`${i+1}. ${x}`).join("\n")}`].filter(Boolean).join("\n")}));
      if(!(await save()))return;
      resetPollForm();
      renderPolls();
      await render();
    }
    async function votePoll(pollId,optionId){
      const poll=getPollById(pollId);
      const sp=member(speaker.value);
      if(!poll)return;
      if(!sp){alert("请先选择一个成员身份再投票。");return;}
      if(String(poll.status||"open")!=="open"){alert(`这个${term("decision")}当前不能${term("poll")}。`); renderPolls(); return;}
      poll.votes=pollPlainObject(poll.votes)?poll.votes:{};
      poll.comments=pollPlainObject(poll.comments)?poll.comments:{};
      poll.votes[sp.id]=optionId;
      const comment=document.getElementById(pollCommentInputId(poll.id))?.value.trim()||"";
      if(comment)poll.comments[sp.id]=comment;
      else delete poll.comments[sp.id];
      poll.updatedAt=now();
      if(await save())renderPolls();
    }
    function submitPollVoteFromSelection(pollId){
      const poll=getPollById(pollId);
      if(!poll)return;
      const selected=[...document.getElementsByName(pollRadioName(poll.id))].find(input=>input.checked);
      if(!selected){alert("请先选择一个选项。");return;}
      votePoll(poll.id,selected.value);
    }
    async function updatePollStatus(pollId,status){
      const poll=getPollById(pollId);
      if(!poll)return false;
      poll.status=status;
      poll.updatedAt=now();
      if(await save()){renderPolls(); return true;}
      return false;
    }
    function pausePoll(pollId){return updatePollStatus(pollId,"paused");}
    function resumePoll(pollId){return updatePollStatus(pollId,"open");}
    async function cancelPoll(pollId){
      const poll=getPollById(pollId);
      if(!poll)return false;
      if(!confirm(`确定取消${term("decision")}「${poll.title||`未命名${term("decision")}`}」吗？\n\n已有${term("poll")}和理由会保留，但它不会再作为进行中的${term("decision")}。`))return false;
      return updatePollStatus(pollId,"cancelled");
    }
    function closePollRecord(pollOrId,manual=false,options={}){
      const poll=getPollById(pollOrId);
      if(!poll)return false;
      const status=String(poll.status||"open");
      if(status!=="open"&&status!=="paused")return false;
      const decisionInput=options.useDecisionInput?document.getElementById(pollDecisionInputId(poll.id)):null;
      const typedDecision=decisionInput?.value.trim()||"";
      const closedAt=now();
      poll.status="closed";
      poll.closedAt=closedAt;
      poll.updatedAt=closedAt;
      poll.decisionText=typedDecision||String(poll.decisionText||"").trim()||buildAutoPollDecisionText(poll);
      const text=formatPollDecisionSummary(poll)+(manual?"\n结算方式：手动结束":"\n结算方式：到期自动结算");
      data.messages.push(makeMessage({roomId:poll.roomId||currentRoomId,speakerId:"system",speakerName:"系统通知",kind:"系统投票",text}));
      appendHandoff(text,"系统投票",poll.roomId||currentRoomId);
      return true;
    }
    async function closePoll(pollId){
      const changed=closePollRecord(pollId,true,{useDecisionInput:true});
      if(!changed)return false;
      if(await save()){
        renderPolls();
        renderHandoff();
        await render();
        return true;
      }
      return false;
    }
    async function closeDuePolls(){
      let changed=false;
      const t=Date.now();
      (data.polls||[]).forEach(p=>{
        if(String(p?.status||"open")==="open"&&p.deadline&&new Date(p.deadline).getTime()<=t){
          if(closePollRecord(p,false))changed=true;
        }
      });
      if(changed)await save();
      return changed;
    }
    function pollOptionRowsHtml(poll,voted,canVote){
      const counts=getPollVoteCounts(poll);
      const disabled=canVote?"":"disabled";
      const rows=pollOptions(poll).map(option=>`<label class="poll-option-row"><input type="radio" name="${esc(pollRadioName(poll.id))}" value="${esc(option.id)}" ${voted===option.id||voted===option.text?"checked":""} ${disabled} /><span>${esc(option.text)}</span><em>${counts[option.id]||0} 票</em></label>`);
      if(counts.__unknown)rows.push(`<div class="poll-option-unknown">未知选项：${counts.__unknown} 票</div>`);
      return rows.join("");
    }
    function pollCommentsHtml(poll){
      const summary=getPollCommentItems(poll,5);
      if(!summary.items.length)return '<div class="poll-comments"><strong>投票理由</strong><div class="poll-comment-empty">暂无投票理由</div></div>';
      const items=summary.items.map(item=>`<div class="poll-comment-item"><span>${esc(item.memberName)}</span><p>${esc(item.text)}</p></div>`).join("");
      const tail=summary.hidden?`<div class="poll-comment-more">还有 ${summary.hidden} 条投票理由未显示</div>`:"";
      return `<div class="poll-comments"><strong>投票理由</strong>${items}${tail}</div>`;
    }
    function pollDecisionHtml(poll,editable){
      const value=poll.decisionText||"";
      if(editable)return `<label class="poll-decision-box">最终决定 / 后续安排（可留空）<textarea id="${esc(pollDecisionInputId(poll.id))}" placeholder="最终决定 / 后续安排（可留空）">${esc(value)}</textarea></label>`;
      if(!value)return "";
      return `<div class="poll-decision-box readonly"><strong>最终决定</strong><p>${esc(value)}</p></div>`;
    }
    function pollActionButtonsHtml(poll,canVote){
      const id=esc(poll.id);
      const status=String(poll.status||"open");
      const buttons=[];
      if(canVote)buttons.push(`<button class="light small" type="button" onclick="submitPollVoteFromSelection('${id}')">保存${term("poll")} / 理由</button>`);
      if(status==="open"){
        buttons.push(`<button class="light small" type="button" onclick="pausePoll('${id}')">暂停</button>`);
        buttons.push(`<button class="danger small" type="button" onclick="cancelPoll('${id}')">取消</button>`);
        buttons.push(`<button class="danger small" type="button" onclick="finishPoll('${id}')">结束</button>`);
      } else if(status==="paused"){
        buttons.push(`<button class="light small" type="button" onclick="resumePoll('${id}')">恢复</button>`);
        buttons.push(`<button class="danger small" type="button" onclick="cancelPoll('${id}')">取消</button>`);
        buttons.push(`<button class="danger small" type="button" onclick="finishPoll('${id}')">结束</button>`);
      } else if(status==="closed") {
        buttons.push(`<button class="light small" type="button" onclick="copyPollResult('${id}')">再写入交接</button>`);
      }
      buttons.push(`<button class="danger small" type="button" onclick="deletePoll('${id}')">删除${term("poll")}</button>`);
      return buttons.join("");
    }
    function renderPolls(){
      const box=document.getElementById("pollList");
      if(!box)return;
      const activeSpeaker=speaker.value;
      const roomPolls=(data.polls||[]).filter(p=>(p.roomId||"main")===currentRoomId).slice().sort((a,b)=>new Date(b.updatedAt||b.closedAt||b.createdAt||0)-new Date(a.updatedAt||a.closedAt||a.createdAt||0));
      box.innerHTML=roomPolls.length?roomPolls.map(poll=>{
        const status=String(poll.status||"open");
        const canVote=status==="open"&&!!member(activeSpeaker);
        const voted=pollVotes(poll)[activeSpeaker]||"";
        const currentVote=voted?getPollOptionText(poll,voted):(activeSpeaker?`还没有${term("poll")}`:`请先选择${term("member")}`);
        const commentValue=activeSpeaker&&pollComments(poll)[activeSpeaker]?pollComments(poll)[activeSpeaker]:"";
        const statusClass=status==="paused"?"poll-paused":status==="cancelled"||status==="canceled"?"poll-cancelled":status==="closed"?"poll-closed":"";
        const description=poll.description?`<p class="poll-description">${esc(poll.description)}</p>`:"";
        const reviewDue=isPollReviewDue(poll)?'<div class="poll-review-due">需要复盘</div>':"";
        const veto=hasPollVeto(poll)?'<div class="poll-veto-note">存在否决，建议继续讨论或复盘。</div>':"";
        const commentInput=status==="open"?`<label class="poll-comment-field">${term("poll")}理由（可留空）<textarea id="${esc(pollCommentInputId(poll.id))}" placeholder="可以写这次选择的理由，也可以留空">${esc(commentValue)}</textarea></label>`:(commentValue?`<div class="poll-current-comment"><strong>你的${term("poll")}理由</strong><p>${esc(commentValue)}</p></div>`:"");
        return `<div class="poll-card ${statusClass}">
          <div class="poll-card-head"><strong>${esc(poll.title||"未命名议题")}</strong><span class="poll-status-chip ${esc(status)}">${esc(pollStatusText(status))}</span></div>
          ${description}
          <div class="poll-status-row"><span class="poll-vote-mode">决策方式：${esc(pollVoteModeText(poll.voteMode))}</span><span>截止：${esc(pollDeadlineText(poll.deadline))}</span><span>复盘：${esc(pollDateTimeText(poll.reviewAt))}</span><span>${esc(getPollTotalVotes(poll))} 票</span></div>
          ${reviewDue}
          <div class="poll-current-vote">当前${esc(term("member"))}：${esc(currentVote)}</div>
          ${commentInput}
          <div class="poll-options">${pollOptionRowsHtml(poll,voted,canVote)}</div>
          <div class="poll-winning-summary">${esc(getPollWinningSummary(poll))}</div>
          ${pollCommentsHtml(poll)}
          ${pollDecisionHtml(poll,status==="open"||status==="paused")}
          ${veto}
          <div class="poll-actions">${pollActionButtonsHtml(poll,canVote)}</div>
        </div>`;
      }).join(""):`<div class="empty">当前${esc(term("room"))}还没有${esc(term("decision"))} / ${esc(term("poll"))}。</div>`;
    }
    window.votePoll=votePoll;
    window.submitPollVoteFromSelection=submitPollVoteFromSelection;
    window.pausePoll=pausePoll;
    window.resumePoll=resumePoll;
    window.cancelPoll=cancelPoll;
    window.closePoll=closePoll;
    window.finishPoll=async function(id){const poll=getPollById(id); if(!poll)return; if(!confirm(`确定结束这个${term("decision")}，并把结果写入聊天和${term("handoff")}便签吗？`))return; await closePoll(id);};
    window.deletePoll=async function(id){const p=(data.polls||[]).find(x=>x.id===id); if(!p)return; const note=String(p.status||"open")==="open"?`\n\n这个${term("decision")}还在进行中，删除后不会再结算。`:`\n\n已经写入聊天或${term("handoff")}便签的结果不会被删除。`; if(!confirm(`确定删除${term("decision")}「${p.title||`未命名${term("decision")}`}」吗？${note}`))return; data.polls=(data.polls||[]).filter(x=>x.id!==id); if(await save())renderPolls();};
    window.copyPollResult=async function(id){const p=(data.polls||[]).find(x=>x.id===id); if(!p)return; appendHandoff(formatPollDecisionSummary(p),"系统投票",p.roomId||currentRoomId); if(await save()){renderHandoff(); alert(`已追加到${term("handoff")}便签。`);}};
    window.getPollVoteCounts=getPollVoteCounts;
    window.getPollOptionText=getPollOptionText;
    window.getPollWinningSummary=getPollWinningSummary;
    window.getPollCommentsSummary=getPollCommentsSummary;
    window.hasPollVeto=hasPollVeto;
    window.pollStatusText=pollStatusText;
    window.pollVoteModeText=pollVoteModeText;
    window.isPollReviewDue=isPollReviewDue;
    window.formatPollDecisionSummary=formatPollDecisionSummary;
