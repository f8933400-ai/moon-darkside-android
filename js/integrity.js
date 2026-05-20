    function esc(v){return String(v||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");}
    function csvCell(v){return `"${String(v||"").replace(/"/g,'""')}"`;}
    function fileSafe(v){return String(v||"对话").replace(/[\\/:*?"<>|]/g,"_").slice(0,40);}
    function messageText(m){return `${m.text||""}${m.imageData||m.imageId?`${m.text?"\n":""}[图片：${m.imageName||"未命名图片"}]`:""}`;}
    function mdImageAlt(name){return String(name||"图片").replace(/[\[\]\n\r]/g," ").trim()||"图片";}
    function mdImageLabel(name){return String(name||"图片").replace(/[\[\]\n\r]/g," ").trim()||"图片";}
    function mdMessageBody(m){const text=String(m.text||"").replace(/\n/g,"\n  "); const image=m.imageData?`![${mdImageAlt(m.imageName)}](${m.imageData})`:m.imageId?`[图片：${mdImageLabel(m.imageName)}]`:""; return [text,image].filter(Boolean).join(text&&image?"\n\n  ":"");}
    function checksum(v){let h=2166136261; const s=String(v||""); for(let i=0;i<s.length;i++){h^=s.charCodeAt(i); h=Math.imul(h,16777619);} return (h>>>0).toString(16).padStart(8,"0");}
    function calculateNextSeqFromMessages(messages){const rows=Array.isArray(messages)?messages:[]; const maxSeq=rows.reduce((max,m)=>{const seq=Number(m&&m.seq)||0; return seq>max?seq:max;},0); return maxSeq+1;}
    function resetNextSeqFromMessages(){if(typeof data==="undefined"||!data)return 1; data.nextSeq=calculateNextSeqFromMessages(data.messages); return data.nextSeq;}
    function nextMessageSeq(){const fallback=calculateNextSeqFromMessages(data.messages); const seq=Math.max(Number(data.nextSeq)||0,fallback); data.nextSeq=seq+1; return seq;}
    function messageIntegrity(m){
      if(!m.imageId)return checksum([m.seq,m.id,m.roomId,m.speakerId,m.speakerName,m.kind,m.text,m.imageName,m.imageType,m.imageData,m.createdAt].map(v=>v||"").join("\\u001f"));
      // imageMigration v1 会因为 imageData -> imageId 外置迁移而合法重算所有 message integrity。
      const _imgVer=2;
      return checksum([m.seq,m.id,m.roomId,m.speakerId,m.speakerName,m.kind,m.text,m.imageName,m.imageType,m.imageId,_imgVer,m.createdAt].map(v=>v||"").join("\\u001f"));
    }
    function ensureMessage(m){m.id=m.id||makeId(); m.seq=Number(m.seq)||nextMessageSeq(); m.createdAt=m.createdAt||now(); m.integrity=messageIntegrity(m); return m;}
    function integrityOk(m){return m.integrity===messageIntegrity(m);}
    function seqCode(m){return String(Number(m.seq)||0).padStart(4,"0");}
    window.calculateNextSeqFromMessages=calculateNextSeqFromMessages;
    window.resetNextSeqFromMessages=resetNextSeqFromMessages;
    function makeMessage(fields){return ensureMessage({id:makeId(),createdAt:now(),...fields});}
    function bubbleContent(m,imageUrl){const text=m.text?esc(m.text):""; const url=imageUrl||m.imageData||""; const image=url?`<img src="${esc(url)}" alt="${esc(m.imageName||"图片")}" />`:m.imageId?`<div class="img-placeholder">图片已丢失</div>`:""; return `${text}${image}`||"&nbsp;";}
    function first(name){return (name||"?").trim().slice(0,1);} function room(){return data.rooms.find(r=>r.id===currentRoomId)||data.rooms[0];} function member(id){return data.members.find(m=>m.id===id);} function tag(id){return (data.tags||[]).find(t=>t.id===id);} function memberNameByMessage(m){return member(m.speakerId)?.name||m.speakerName||"已移除成员";}
