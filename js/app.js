    /* ── Tauri 桌面端桥接：让现有 MoonBridge 接口在 Tauri 下生效 ── */
    (function setupTauriBridge(){if(!window.__TAURI_INTERNALS__)return; const invoke=window.__TAURI_INTERNALS__.invoke; if(typeof invoke!=="function")return; window.MoonBridge=window.MoonBridge||{}; window.MoonBridge.authenticate=function(){invoke("moon_authenticate").then(()=>{window.onMoonAuthResult&&window.onMoonAuthResult(true,"");}).catch(err=>{const msg=String(err?.message||err||""); const display=/cancel|user.*cancel|取消/i.test(msg)?"已取消":("验证失败："+(msg||"未知错误")); window.onMoonAuthResult&&window.onMoonAuthResult(false,display);});};})();
    (function setupViewportHeight(){const sync=()=>{document.body.style.setProperty("--app-height",`${window.innerHeight}px`);}; sync(); window.addEventListener("resize",sync,{passive:true}); window.addEventListener("orientationchange",()=>setTimeout(sync,240),{passive:true}); if(window.visualViewport)window.visualViewport.addEventListener("resize",sync,{passive:true});})();
    let data; let prefs; let ledgerRecords=[]; let currentRoomId="main"; let tab="rooms"; let pendingMemberAvatar=null; let pendingRoomBg=null; let pendingChatImage=null; let pendingSystemCardPayload=null; let pendingSystemCardImage=null; let pendingSystemCardBg=null; let pendingReceivedSystemCard=null; let longPressTimer=null; let appMode="cover";
    const list=document.getElementById("list"), messages=document.getElementById("messages"), roomName=document.getElementById("roomName"), roomDesc=document.getElementById("roomDesc"), speaker=document.getElementById("speaker"), kind=document.getElementById("kind"), search=document.getElementById("search"), fontSize=document.getElementById("fontSize"), fontSizeValue=document.getElementById("fontSizeValue"), themeBtn=document.getElementById("themeBtn"), contextMenu=document.getElementById("contextMenu"), imageInput=document.getElementById("imageInput"), importInput=document.getElementById("importInput"), memberAvatarInput=document.getElementById("memberAvatarInput"), roomBgInput=document.getElementById("roomBgInput"), drawerBtn=document.getElementById("drawerBtn"), drawerBackdrop=document.getElementById("drawerBackdrop");
    function showMenu(e,items){e.preventDefault(); e.stopPropagation(); contextMenu.innerHTML=items.map((item,i)=>`<button class="${item.danger?"danger-action":""}" data-i="${i}">${esc(item.label)}</button>`).join(""); contextMenu.style.display="block"; const rect=contextMenu.getBoundingClientRect(); contextMenu.style.left=Math.min(e.clientX,window.innerWidth-rect.width-8)+"px"; contextMenu.style.top=Math.min(e.clientY,window.innerHeight-rect.height-8)+"px"; contextMenu.querySelectorAll("button").forEach(btn=>btn.onclick=()=>{const item=items[Number(btn.dataset.i)]; closeMenu(); item.action();});}
    function closeMenu(){contextMenu.style.display="none"; contextMenu.innerHTML="";}
    function startLongPress(e,type,id){if(e.pointerType==="mouse")return; cancelLongPress(); const x=e.clientX,y=e.clientY; longPressTimer=setTimeout(()=>{const fake={preventDefault(){},stopPropagation(){},clientX:x,clientY:y}; if(type==="room"||type==="private")showRoomMenu(fake,id); if(type==="member")showMemberMenu(fake,id); if(type==="message")showMessageMenu(fake,id);},560);}
    function cancelLongPress(){if(longPressTimer){clearTimeout(longPressTimer); longPressTimer=null;}}
    function openDrawer(){document.body.classList.add("drawer-open");}
    function closeDrawer(){document.body.classList.remove("drawer-open");}
    window.selectRoom=function(id){const r=data.rooms.find(x=>x.id===id); currentRoomId=id; if(r&&isPrivateRoom(r))maybeShowPrivateRoomNotice(); render(); closeDrawer();}; window.closeModal=function(id){document.getElementById(id).style.display="none";}; function openModal(id){closeDrawer(); closeMenu(); document.getElementById(id).style.display="flex";}
    function setAppMode(mode){appMode=mode; prefs.lastAppMode=mode; if(prefs.resetToCover===false)safeSavePrefs("记录应用模式"); applyAppMode();}
    function applyAppMode(){const cover=appMode!=="journal"; const app=document.querySelector(".app"); document.getElementById("coverApp").style.display=cover?"flex":"none"; app.style.display=cover?"none":""; document.getElementById("disclaimerBackdrop").style.display=cover?"none":"flex"; document.getElementById("lockBackdrop").style.display="none"; if(cover){renderLedger();} else {startDisclaimer(); startLock();}}
    function promptArrivalIfReady(){if(typeof window.maybeShowArrivalOnEnter==="function")setTimeout(()=>window.maybeShowArrivalOnEnter(),0);}
    window.forceCoverMode=function(){if(prefs.resetToCover!==false)setAppMode("cover");};
    window.showRoomMenu=function(e,roomId){const r=data.rooms.find(x=>x.id===roomId); const noun=isPrivateRoom(r)?"私聊":"群组"; showMenu(e,[{label:`改名 / 修改${noun}`,action:()=>editRoom(roomId)},{label:`删除${noun}`,danger:true,action:()=>deleteRoom(roomId)}]);};
    window.showMemberMenu=function(e,memberId){showMenu(e,[{label:"打开私聊",action:()=>openPrivateWith(memberId)},{label:"编辑成员",action:()=>editMember(memberId)},{label:"删除成员",danger:true,action:()=>deleteMember(memberId)}]);};
    window.showMessageMenu=function(e,messageId){showMenu(e,[{label:"删除这条对话",danger:true,action:()=>deleteMessage(messageId)}]);};
    window.editMember=async function(memberId){try{const m=member(memberId); if(!m)return; document.getElementById("memberModalTitle").textContent="编辑系统成员"; document.getElementById("memberId").value=m.id; document.getElementById("memberName").value=m.name||""; document.getElementById("memberStatus").value=m.status||"active"; renderTagOptions(m.tagId||""); syncTagEditor(); document.getElementById("memberRole").value=m.role||""; document.getElementById("memberNote").value=m.note||""; setMemberExtraForm(m); pendingMemberAvatar=(m.avatarId||m.avatarData)?"__KEEP__":null; setPreview("memberAvatarPreview",await resolveStoredImageUrl(m,"avatarId","avatarData"),"头像"); openModal("memberModal");}catch(err){console.error("editMember failed",err);}};
    window.deleteMember=async function(memberId){const m=member(memberId); if(!m)return; const ok=confirm(`确定从成员列表删除「${m.name}」吗？\n\n建议：如果只是暂时不在、休眠或消失，可以选择“改”并把状态设为休眠/消失。\n\n删除后，过往消息会保留名字，但这个成员不能再作为发言身份。与该成员相关的成员关系也会被删除。`); if(!ok)return; data.members=data.members.filter(x=>x.id!==memberId); data.memberRelations=(data.memberRelations||[]).filter(r=>r.fromMemberId!==memberId&&r.toMemberId!==memberId); addSystemMessage(`成员变动：${m.name} 已从成员列表移除。过往记录保留。`); if(!data.members.length)speaker.innerHTML='<option value="">无可用成员</option>'; if(await save())render();};
    window.editRoom=async function(roomId){try{const r=data.rooms.find(x=>x.id===roomId); if(!r)return; setRoomModalText(isPrivateRoom(r)?"private":"group"); if(!isPrivateRoom(r))document.getElementById("roomModalTitle").textContent="编辑群组"; document.getElementById("roomId").value=r.id; document.getElementById("newRoomName").value=r.name||""; document.getElementById("newRoomDesc").value=r.desc||""; pendingRoomBg=(r.backgroundId||r.backgroundData)?"__KEEP__":null; setPreview("roomBgPreview",await resolveStoredImageUrl(r,"backgroundId","backgroundData"),"背景"); openModal("roomModal");}catch(err){console.error("editRoom failed",err);}};
    window.deleteRoom=async function(roomId){const r=data.rooms.find(x=>x.id===roomId); if(!r)return; const groupRooms=data.rooms.filter(x=>!isPrivateRoom(x)); if(!isPrivateRoom(r)&&groupRooms.length<=1){alert("至少需要保留一个群组。可以先添加新群组，再删除这个群组。");return;} const count=data.messages.filter(m=>m.roomId===roomId).length; const noun=isPrivateRoom(r)?"私聊":"群组"; const ok=confirm(`确定删除${noun}「${roomDisplayName(r)}」吗？\n\n这个${noun}里的 ${count} 条聊天记录也会一起删除。此操作不可恢复，建议先导出备份。`); if(!ok)return; data.rooms=data.rooms.filter(x=>x.id!==roomId); data.messages=data.messages.filter(m=>m.roomId!==roomId); data.polls=(data.polls||[]).filter(p=>p.roomId!==roomId); data.handoffNotes=(data.handoffNotes||[]).filter(n=>n.roomId!==roomId); if(currentRoomId===roomId)currentRoomId=(data.rooms.find(x=>!isPrivateRoom(x))||data.rooms[0])?.id||"main"; if(await save())render();};
    window.deleteMessage=async function(messageId){const m=data.messages.find(x=>x.id===messageId); if(!m)return; if(!confirm("确定删除这条对话吗？此操作不可恢复。"))return; data.messages=data.messages.filter(x=>x.id!==messageId); if(await save())render();};
    document.addEventListener("click",closeMenu); document.addEventListener("keydown",e=>{if(e.key==="Escape")closeMenu();}); window.addEventListener("resize",closeMenu);
    drawerBtn.onclick=openDrawer; drawerBackdrop.onclick=closeDrawer; document.addEventListener("keydown",e=>{if(e.key==="Escape")closeDrawer();});
    document.getElementById("settingsBtn").onclick=()=>openModal("settingsModal");
    document.getElementById("systemBtn").onclick=openSystemModal;
    document.getElementById("coverSettingsBtn").onclick=()=>openModal("coverSettingsModal");
    const enterJournalBtn=document.getElementById("enterJournalBtn"); let enterHoldTimer=null; let enterHoldReady=false; let enterPressing=false;
    function showCoverDeclaration(){alert("月之暗面 v2\n本地记账记录工具。");}
    function beginHiddenEntry(e){e?.preventDefault(); if(enterPressing)return; enterPressing=true; enterHoldReady=false; clearTimeout(enterHoldTimer); enterHoldTimer=setTimeout(()=>{enterHoldReady=true; enterPressing=false; closeModal("coverSettingsModal"); setAppMode("journal");},1200);}
    function endHiddenEntry(e){e?.preventDefault(); clearTimeout(enterHoldTimer); if(enterPressing&&!enterHoldReady)showCoverDeclaration(); enterPressing=false; enterHoldReady=false;}
    enterJournalBtn.addEventListener("pointerdown",beginHiddenEntry);
    enterJournalBtn.addEventListener("pointerup",endHiddenEntry);
    enterJournalBtn.addEventListener("pointerleave",endHiddenEntry);
    enterJournalBtn.addEventListener("pointercancel",endHiddenEntry);
    enterJournalBtn.addEventListener("touchstart",beginHiddenEntry,{passive:false});
    enterJournalBtn.addEventListener("touchend",endHiddenEntry);
    enterJournalBtn.addEventListener("contextmenu",e=>e.preventDefault());
    enterJournalBtn.addEventListener("selectstart",e=>e.preventDefault());
    enterJournalBtn.onclick=e=>e.preventDefault();
    document.getElementById("coverModeBtn").onclick=()=>{closeModal("settingsModal"); setAppMode("cover");};
    document.getElementById("resetToCover").onchange=async e=>{prefs.resetToCover=e.target.checked; if(prefs.resetToCover)prefs.lastAppMode="cover"; else prefs.lastAppMode=appMode; await savePrefs();};
    document.getElementById("showAllPrivateRooms").onchange=async e=>{prefs.showAllPrivateRooms=e.target.checked; await savePrefs(); renderList();};
    document.getElementById("showArrivalOnEnter").onchange=async e=>{prefs.showArrivalOnEnter=e.target.checked; await savePrefs();};
    document.getElementById("viewSelect").onchange=async e=>{prefs.currentViewMemberId=e.target.value||""; await savePrefs(); const r=room(); if(r&&isPrivateRoom(r)&&!isRoomVisibleInView(r)){const fallback=data.rooms.find(x=>!isPrivateRoom(x))||data.rooms[0]; currentRoomId=fallback?.id||"main"; setTab("rooms");} else {renderList();} render();};
    document.getElementById("ledgerDate").value=new Date().toISOString().slice(0,10);
    document.getElementById("ledgerForm").addEventListener("submit",async e=>{e.preventDefault(); const amount=Number(document.getElementById("ledgerAmount").value); if(!Number.isFinite(amount)||amount<=0){alert("请填写有效金额。");return;} const records=[...(ledgerRecords||[])]; records.push({id:makeId(),type:document.getElementById("ledgerType").value,amount,category:document.getElementById("ledgerCategory").value.trim()||"未分类",date:document.getElementById("ledgerDate").value||new Date().toISOString().slice(0,10),note:document.getElementById("ledgerNote").value.trim(),createdAt:now()}); if(!(await saveLedger(records)))return; document.getElementById("ledgerAmount").value=""; document.getElementById("ledgerCategory").value=""; document.getElementById("ledgerNote").value=""; renderLedger();});
    document.querySelectorAll(".settings-tabs button").forEach(btn=>btn.onclick=()=>{const modal=btn.closest(".modal")||document; modal.querySelectorAll(".settings-tabs button").forEach(x=>x.classList.remove("active")); modal.querySelectorAll(".settings-panel").forEach(x=>x.classList.remove("active")); btn.classList.add("active"); document.getElementById(btn.dataset.panel).classList.add("active");});
    function setTab(next){tab=next; document.getElementById("tabRooms").classList.toggle("active",tab==="rooms"); document.getElementById("tabPrivate").classList.toggle("active",tab==="private"); document.getElementById("tabMembers").classList.toggle("active",tab==="members"); renderList();}
    document.getElementById("tabRooms").onclick=()=>setTab("rooms"); document.getElementById("tabPrivate").onclick=()=>setTab("private"); document.getElementById("tabMembers").onclick=()=>setTab("members"); search.oninput=renderList;
    const advancedSearchBtn=document.getElementById("advancedSearchBtn");
    const advancedSearchRunBtn=document.getElementById("advancedSearchRunBtn");
    const advancedSearchResetBtn=document.getElementById("advancedSearchResetBtn");
    const advancedSearchCloseBtn=document.getElementById("advancedSearchCloseBtn");
    const advancedSearchResults=document.getElementById("advancedSearchResults");
    const advancedSearchKeyword=document.getElementById("advancedSearchKeyword");
    if(advancedSearchBtn)advancedSearchBtn.onclick=()=>window.openAdvancedSearchModal&&window.openAdvancedSearchModal();
    if(advancedSearchRunBtn)advancedSearchRunBtn.onclick=()=>{if(!window.collectAdvancedSearchFilters||!window.collectSearchResults||!window.renderAdvancedSearchResults)return; const filters=window.collectAdvancedSearchFilters(); const results=window.collectSearchResults(filters); window.renderAdvancedSearchResults(results);};
    if(advancedSearchResetBtn)advancedSearchResetBtn.onclick=()=>window.resetAdvancedSearchFilters&&window.resetAdvancedSearchFilters();
    if(advancedSearchCloseBtn)advancedSearchCloseBtn.onclick=()=>window.closeAdvancedSearchModal&&window.closeAdvancedSearchModal();
    if(advancedSearchKeyword)advancedSearchKeyword.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault(); advancedSearchRunBtn?.click();}});
    if(advancedSearchResults)advancedSearchResults.addEventListener("click",e=>{const btn=e.target.closest("[data-search-type][data-search-id]"); if(!btn||!advancedSearchResults.contains(btn))return; window.jumpToSearchResult&&window.jumpToSearchResult(btn.dataset.searchType,btn.dataset.searchId);});
    document.getElementById("kindManageBtn").onclick=()=>{renderKindManager(); openModal("kindModal");};
    document.getElementById("saveKindBtn").onclick=saveKind;
    document.getElementById("deleteKindBtn").onclick=()=>deleteKind(kind.value);
    document.getElementById("messageForm").addEventListener("submit",async e=>{e.preventDefault(); const text=document.getElementById("message").value.trim(); const sp=member(speaker.value); if(!text||!sp)return; data.messages.push(makeMessage({roomId:currentRoomId,speakerId:sp.id,speakerName:sp.name,kind:document.getElementById("kind").value,text})); if(!(await save()))return; document.getElementById("message").value=""; render();});
    document.getElementById("imageBtn").onclick=()=>imageInput.click();
    imageInput.onchange=()=>{const file=imageInput.files?.[0]; imageInput.value=""; if(!file)return; openSendImagePreview(file);};
    document.getElementById("chooseMemberAvatarBtn").onclick=()=>memberAvatarInput.click();
    document.getElementById("removeMemberAvatarBtn").onclick=()=>{pendingMemberAvatar=null; setPreview("memberAvatarPreview",null,"头像");};
    memberAvatarInput.onchange=()=>{const file=memberAvatarInput.files?.[0]; memberAvatarInput.value=""; readImageForCrop(file,src=>openCropper({src,aspectRatio:1,outputWidth:512,outputHeight:512,quality:.86,title:"裁剪头像",mode:"cover",allowModeSwitch:false,onDone:dataUrl=>{pendingMemberAvatar=dataUrl; setPreview("memberAvatarPreview",pendingMemberAvatar,"头像");}}));};
    document.getElementById("memberTag").onchange=syncTagEditor;
    document.getElementById("saveTagBtn").onclick=saveTagFromEditor;
    document.getElementById("deleteTagBtn").onclick=deleteSelectedTag;
    document.getElementById("addMemberCustomFieldBtn").onclick=()=>addMemberCustomFieldRow({});
    document.getElementById("chooseRoomBgBtn").onclick=()=>roomBgInput.click();
    document.getElementById("removeRoomBgBtn").onclick=()=>{pendingRoomBg=null; setPreview("roomBgPreview",null,"背景");};
    roomBgInput.onchange=()=>{const file=roomBgInput.files?.[0]; roomBgInput.value=""; readImageForCrop(file,src=>openCropper({src,aspectRatio:16/9,outputWidth:1280,outputHeight:720,quality:.82,title:"裁剪背景",mode:"contain",fillColor:"#f7f8fa",onDone:dataUrl=>{pendingRoomBg=dataUrl; setPreview("roomBgPreview",pendingRoomBg,"背景");}}));};
    document.getElementById("cropZoom").oninput=e=>{cropper.zoom=Number(e.target.value)||1; drawCropper();};
    document.getElementById("cropMode").onchange=resetCropperView;
    document.getElementById("cropResetBtn").onclick=resetCropperView;
    document.getElementById("cropCancelBtn").onclick=()=>{cropper.img=null; cropper.opts=null; closeModal("cropModal");};
    document.getElementById("cropConfirmBtn").onclick=confirmCropper;
    document.getElementById("sendImageCancelBtn").onclick=()=>{pendingChatImage=null; closeModal("imageEditModal"); closeModal("sendImageModal");};
    document.getElementById("sendImageOriginalBtn").onclick=async()=>{if(pendingChatImage)await sendChatImage(pendingChatImage.dataUrl);};
    document.getElementById("sendImageEditBtn").onclick=openImageEditor;
    document.getElementById("editImageRotateBtn").onclick=rotatePendingChatImage;
    document.getElementById("editImageCropBtn").onclick=cropPendingChatImage;
    document.getElementById("editImageAnnotateBtn").onclick=openAnnotator;
    document.getElementById("editImageDoneBtn").onclick=()=>closeModal("imageEditModal");
    document.getElementById("annotatePenBtn").onclick=()=>setAnnotateTool("pen");
    document.getElementById("annotateTextBtn").onclick=()=>setAnnotateTool("text");
    document.getElementById("annotateArrowBtn").onclick=()=>setAnnotateTool("arrow");
    document.getElementById("annotateUndoBtn").onclick=undoAnnotate;
    document.getElementById("annotateClearBtn").onclick=clearAnnotate;
    document.getElementById("annotateCancelBtn").onclick=()=>{annotator.current=null; annotator.drawing=false; closeModal("annotateModal");};
    document.getElementById("annotateConfirmBtn").onclick=confirmAnnotate;
    annotateCanvas().addEventListener("pointerdown",beginAnnotate);
    annotateCanvas().addEventListener("pointermove",moveAnnotate);
    annotateCanvas().addEventListener("pointerup",endAnnotate);
    annotateCanvas().addEventListener("pointercancel",endAnnotate);
    annotateCanvas().addEventListener("pointerleave",endAnnotate);
    cropCanvas().addEventListener("mousedown",beginCropDrag);
    window.addEventListener("mousemove",moveCropDrag);
    window.addEventListener("mouseup",endCropDrag);
    cropCanvas().addEventListener("touchstart",beginCropDrag,{passive:false});
    window.addEventListener("touchmove",moveCropDrag,{passive:false});
    window.addEventListener("touchend",endCropDrag);
    speaker.onchange=renderChat;
    fontSize.oninput=()=>{prefs.fontSize=Number(fontSize.value); applyPrefs(); safeSavePrefs("字号设置保存");};
    themeBtn.onclick=async()=>{prefs.dark=!prefs.dark; applyPrefs(); await savePrefs();};
    document.getElementById("message").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();document.getElementById("messageForm").requestSubmit();}});
    document.getElementById("addMemberBtn").onclick=()=>{resetMemberModal();openModal("memberModal");}; document.getElementById("addRoomBtn").onclick=()=>{resetRoomModal();openModal("roomModal");}; document.getElementById("addPrivateBtn").onclick=()=>openPrivateModal(); document.getElementById("dailyBtn").onclick=()=>openModal("dailyModal"); document.getElementById("roomBgQuickBtn").onclick=()=>editRoom(currentRoomId);
    document.getElementById("pollBtn").onclick=()=>{if(typeof ensurePollFormDefaults==="function")ensurePollFormDefaults(); else if(!document.getElementById("pollDeadline").value){const d=new Date(Date.now()+60*60*1000); d.setSeconds(0,0); document.getElementById("pollDeadline").value=d.toISOString().slice(0,16);} renderPolls(); openModal("pollModal");};
    const frontingBtn=document.getElementById("frontingBtn"); if(frontingBtn)frontingBtn.onclick=openFrontingModal;
    const arrivalBtn=document.getElementById("arrivalBtn"); if(arrivalBtn)arrivalBtn.onclick=()=>window.openArrivalModal&&window.openArrivalModal();
    const careBtn=document.getElementById("careBtn"); if(careBtn)careBtn.onclick=()=>window.openCareModal&&window.openCareModal();
    const saveCareLogBtn=document.getElementById("saveCareLogBtn"); if(saveCareLogBtn)saveCareLogBtn.onclick=()=>window.saveCareLog&&window.saveCareLog();
    const addCareChecklistBtn=document.getElementById("addCareChecklistBtn"); if(addCareChecklistBtn)addCareChecklistBtn.onclick=()=>window.addCareChecklistItem&&window.addCareChecklistItem();
    const careChecklistTitle=document.getElementById("careChecklistTitle"); if(careChecklistTitle)careChecklistTitle.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault(); window.addCareChecklistItem&&window.addCareChecklistItem();}});
    const careChecklistList=document.getElementById("careChecklistList");
    if(careChecklistList){
      careChecklistList.addEventListener("change",e=>{
        const input=e.target.closest("[data-care-check-toggle]");
        if(!input||!careChecklistList.contains(input))return;
        window.toggleCareChecklistItem&&window.toggleCareChecklistItem(input.dataset.careCheckToggle,!!input.checked);
      });
      careChecklistList.addEventListener("click",e=>{
        const btn=e.target.closest("[data-care-check-delete]");
        if(!btn||!careChecklistList.contains(btn))return;
        window.deleteCareChecklistItem&&window.deleteCareChecklistItem(btn.dataset.careCheckDelete);
      });
    }
    const careLogList=document.getElementById("careLogList");
    if(careLogList)careLogList.addEventListener("click",e=>{
      const btn=e.target.closest("[data-care-log-delete]");
      if(!btn||!careLogList.contains(btn))return;
      window.deleteCareLog&&window.deleteCareLog(btn.dataset.careLogDelete);
    });
    const frontingStartBtn=document.getElementById("frontingStartBtn"); if(frontingStartBtn)frontingStartBtn.onclick=startFronting;
    const frontingSaveBtn=document.getElementById("frontingSaveBtn"); if(frontingSaveBtn)frontingSaveBtn.onclick=saveFrontingLogFromForm;
    const frontingCancelEditBtn=document.getElementById("frontingCancelEditBtn"); if(frontingCancelEditBtn)frontingCancelEditBtn.onclick=resetFrontingForm;
    const frontingEndBtn=document.getElementById("frontingEndBtn"); if(frontingEndBtn)frontingEndBtn.onclick=endFronting;
    document.getElementById("handoffBtn").onclick=()=>{if(typeof window.openHandoffModal==="function")window.openHandoffModal(); else {renderHandoff(); openModal("handoffModal");}};
    const handoffTemplateEl=document.getElementById("handoffTemplate"); if(handoffTemplateEl)handoffTemplateEl.onchange=()=>window.applyHandoffTemplate&&window.applyHandoffTemplate();
    const handoffCreateTaskEl=document.getElementById("handoffCreateTask"); if(handoffCreateTaskEl)handoffCreateTaskEl.onchange=()=>window.toggleHandoffTaskFields&&window.toggleHandoffTaskFields();
    document.getElementById("createPollBtn").onclick=createPoll;
    document.getElementById("refreshPollBtn").onclick=async()=>{await closeDuePolls(); render();};
    document.getElementById("saveHandoffBtn").onclick=saveManualHandoff;
    document.getElementById("saveSystemProfileBtn").onclick=saveSystemProfile;
    document.getElementById("saveRelationBtn").onclick=saveRelation;
    document.getElementById("resetRelationBtn").onclick=resetRelationForm;
    document.querySelectorAll("#systemCardPanel .card-options input").forEach(input=>{input.onchange=e=>{pendingSystemCardImage=null; if(e.target.id==="cardFieldMembers")document.getElementById("cardMemberBox").style.display=e.target.checked?"block":"none";};});
    document.getElementById("previewSystemCardBtn").onclick=()=>makeSystemCardImage();
    document.getElementById("saveSystemCardImageBtn").onclick=saveSystemCardImage;
    document.getElementById("chooseSystemCardBgBtn").onclick=()=>document.getElementById("systemCardBgInput").click();
    document.getElementById("removeSystemCardBgBtn").onclick=()=>{pendingSystemCardBg=null; pendingSystemCardImage=null; document.getElementById("systemCardBgPreview").textContent="未选择背景";};
    document.getElementById("systemCardBgInput").onchange=e=>{const file=e.target.files?.[0]; e.target.value=""; readImageFile(file,3,dataUrl=>{pendingSystemCardBg=dataUrl; pendingSystemCardImage=null; document.getElementById("systemCardBgPreview").innerHTML=`<img src="${esc(dataUrl)}" alt="名片背景" />`;},{compress:true,maxSide:1440,quality:.82});};
    document.getElementById("cardImageMode").onchange=()=>{pendingSystemCardImage=null;};
    document.getElementById("cardCustomText").oninput=()=>{pendingSystemCardImage=null;};
    document.getElementById("cardBgColor").oninput=()=>{pendingSystemCardImage=null;};
    document.getElementById("chooseSystemCardQrBtn").onclick=()=>document.getElementById("systemCardQrInput").click();
    document.getElementById("systemCardQrInput").onchange=e=>{const file=e.target.files?.[0]; e.target.value=""; parseSystemCardImage(file).catch(()=>alert("二维码图片读取或识别失败。"));};
    document.getElementById("parseSystemCardCodeBtn").onclick=()=>parseSystemCardCode(document.getElementById("systemCardCodeInput").value.trim(),"manual");
    document.getElementById("viewSystemCardOnlyBtn").onclick=()=>closeModal("systemCardPreviewModal");
    document.getElementById("cancelSystemCardSaveBtn").onclick=()=>{pendingReceivedSystemCard=null; closeModal("systemCardPreviewModal");};
    document.getElementById("saveExternalSystemCardBtn").onclick=saveReceivedSystemCard;
    document.getElementById("clearHandoffBtn").onclick=async()=>{if(!confirm("确定清空当前群组的交接便签吗？"))return; data.handoffNotes=(data.handoffNotes||[]).filter(n=>n.roomId!==currentRoomId); if(await save())renderHandoff();};
    document.getElementById("saveMemberBtn").onclick=async()=>{
      const memberId=document.getElementById("memberId").value;
      const name=document.getElementById("memberName").value.trim();
      if(!name)return;
      const status=document.getElementById("memberStatus").value;
      const tagId=document.getElementById("memberTag").value;
      const role=document.getElementById("memberRole").value.trim();
      const note=document.getElementById("memberNote").value.trim();
      const extra=collectMemberExtraFormValues();
      const applyAvatarToMember=async(m)=>{
        if(pendingMemberAvatar==="__KEEP__")return;
        if(pendingMemberAvatar===null){
          const oldId=m.avatarId;
          delete m.avatarId;
          delete m.avatarData;
          if(oldId)window.imageStore.deleteImage(oldId).catch(()=>{});
          return;
        }
        const blob=window.imageStore.dataUrlToBlob(pendingMemberAvatar);
        const mime=blob.type||"image/*";
        await window.imageStore.putImage({id:`avatar-${m.id}`,blob,mime,name:"头像"});
        m.avatarId=`avatar-${m.id}`;
        delete m.avatarData;
      };
      if(memberId){
        const m=member(memberId);
        if(!m)return;
        const oldName=m.name;
        const oldStatus=m.status||"";
        const savedAt=now();
        const statusHistory=normalizeMemberStatusHistory(m.statusHistory);
        Object.assign(m,{name,status,tagId,role,note,...extra,statusHistory,updatedAt:savedAt});
        if(oldStatus!==status)m.statusHistory.push({fromStatus:oldStatus,toStatus:status,note:"",createdAt:savedAt});
        try{await applyAvatarToMember(m);}catch(err){console.error("Failed to save avatar",err); alert("头像保存失败，请重试。"); return;}
        if(oldName!==name||oldStatus!==status){addSystemMessage(`成员变动：${oldName} 更新为 ${name}，状态：${statusText(oldStatus)} → ${statusText(status)}。`);}
      } else {
        const savedAt=now();
        const m=normalizeMemberRecord({id:makeId(),name,role,status,tagId,note,...extra,statusHistory:[],createdAt:savedAt,updatedAt:savedAt});
        try{await applyAvatarToMember(m);}catch(err){console.error("Failed to save avatar",err); alert("头像保存失败，请重试。"); return;}
        data.members.push(m);
        addSystemMessage(`成员变动：新增成员 ${name}，状态：${statusText(status)}。`);
      }
      if(!(await save()))return;
      closeModal("memberModal");
      resetMemberModal();
      setTab("members");
      render();
    };
    document.getElementById("createPrivateBtn").onclick=createPrivateRoom;
    document.getElementById("saveRoomBtn").onclick=async()=>{const roomId=document.getElementById("roomId").value; const name=document.getElementById("newRoomName").value.trim(); if(!name)return; const desc=document.getElementById("newRoomDesc").value.trim(); const applyBgToRoom=async(r)=>{if(pendingRoomBg==="__KEEP__")return; if(pendingRoomBg===null){const oldId=r.backgroundId; delete r.backgroundId; delete r.backgroundData; if(oldId)window.imageStore.deleteImage(oldId).catch(()=>{}); return;} const blob=window.imageStore.dataUrlToBlob(pendingRoomBg); const mime=blob.type||"image/*"; await window.imageStore.putImage({id:`roombg-${r.id}`,blob,mime,name:"背景"}); r.backgroundId=`roombg-${r.id}`; delete r.backgroundData;}; if(roomId){const r=data.rooms.find(x=>x.id===roomId); if(!r)return; r.name=name; r.desc=desc; try{await applyBgToRoom(r);}catch(err){console.error("Failed to save room background",err); alert("背景保存失败，请重试。"); return;}} else {const newRoom={id:makeId(),type:"group",memberIds:[],name,desc,createdAt:now()}; try{await applyBgToRoom(newRoom);}catch(err){console.error("Failed to save room background",err); alert("背景保存失败，请重试。"); return;} data.rooms.push(newRoom); currentRoomId=newRoom.id;} if(!(await save()))return; resetRoomModal(); closeModal("roomModal"); render();};
    document.getElementById("saveDailyBtn").onclick=async()=>{const front=document.getElementById("frontNow").value.trim()||"未填写"; const mood=document.getElementById("bodyMood").value.trim()||"未填写"; const note=document.getElementById("dailyNote").value.trim()||"无"; const sp=member(speaker.value)||data.members[0]; data.messages.push(makeMessage({roomId:currentRoomId,speakerId:sp?.id||"system",speakerName:sp?.name||"系统记录",kind:"状态",text:`今日状态\n当前靠前/在场：${front}\n身体与情绪：${mood}\n提醒：${note}`})); if(!(await save()))return; document.getElementById("frontNow").value=""; document.getElementById("bodyMood").value=""; document.getElementById("dailyNote").value=""; closeModal("dailyModal"); render();};
    document.getElementById("exportBtn").onclick=()=>{closeModal("settingsModal"); openExportModal();};
    document.getElementById("exportScope").onchange=updateExportRoomPicker;
    document.getElementById("exportRedacted").onchange=e=>{if(e.target.checked){document.getElementById("exportExcludePrivate").checked=true;} updateRedactionControls();};
    document.getElementById("exportFormat").onchange=updateRedactionControls;
    document.getElementById("confirmExportBtn").onclick=()=>downloadExport().catch(err=>{console.error("导出失败",err); alert("导出失败："+(err.message||err));});
    document.getElementById("importBtn").onclick=()=>importInput.click();
    importInput.onchange=()=>{const file=importInput.files?.[0]; importInput.value=""; importBackupFile(file);};
    document.getElementById("lockSettingsBtn").onclick=()=>{closeModal("settingsModal"); document.getElementById("newLockPassword").value=""; document.getElementById("useBiometric").checked=!!prefs.useBiometric; openModal("lockSettingsModal");};
    document.getElementById("saveLockBtn").onclick=saveLockSettings;
    document.getElementById("disableLockBtn").onclick=disableLock;
    document.getElementById("unlockBtn").onclick=unlockWithPassword;
    document.getElementById("biometricUnlockBtn").onclick=requestBiometricUnlock;
    document.getElementById("unlockPassword").addEventListener("keydown",e=>{if(e.key==="Enter")unlockWithPassword();});
    document.getElementById("clearBtn").onclick=()=>{closeModal("settingsModal"); document.getElementById("clearMessages").checked=false; document.getElementById("clearMembers").checked=false; document.getElementById("clearRooms").checked=false; openModal("clearModal");};
    document.getElementById("confirmClearBtn").onclick=async()=>{const clearMessages=document.getElementById("clearMessages").checked; const clearMembers=document.getElementById("clearMembers").checked; const clearRooms=document.getElementById("clearRooms").checked; if(!clearMessages&&!clearMembers&&!clearRooms){alert("请先选择要清空的内容。");return;} const targets=[]; if(clearMessages)targets.push("聊天记录"); if(clearMembers)targets.push("成员栏"); if(clearRooms)targets.push("群组（含私聊 / 小群聊）"); if(!confirm(`确定清空：${targets.join("、")}？\n\n此操作不可恢复，建议先导出备份。`))return; if(clearMessages)data.messages=[]; if(clearRooms){data.rooms=JSON.parse(JSON.stringify(initial.rooms)); currentRoomId=data.rooms[0].id; if(!clearMessages)data.messages=data.messages.filter(m=>m.roomId===currentRoomId);} if(clearMembers){data.members=JSON.parse(JSON.stringify(initial.members)); data.memberRelations=[]; prefs.currentViewMemberId=""; await savePrefs(); if(!clearMessages)addSystemMessage("成员栏已清空，并恢复默认记录身份。"); tab="members"; document.getElementById("tabMembers").classList.add("active"); document.getElementById("tabRooms").classList.remove("active");} if(clearRooms&&!clearMessages)addSystemMessage("群组已清空，并恢复默认群组。"); currentRoomId=room()?.id||data.rooms[0]?.id||"main"; if(!(await save()))return; closeModal("clearModal"); render();};
    function b64uEnc(buf){return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}
    function b64uDec(s){s=String(s).replace(/-/g,"+").replace(/_/g,"/"); while(s.length%4)s+="="; const bin=atob(s); const buf=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i); return buf.buffer;}
    async function webauthnSupported(){if(!window.PublicKeyCredential||!navigator.credentials)return false; try{return !!(await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());}catch{return false;}}
    async function webauthnRegister(){const challenge=crypto.getRandomValues(new Uint8Array(32)); const userId=crypto.getRandomValues(new Uint8Array(16)); const cred=await navigator.credentials.create({publicKey:{challenge,rp:{name:"月之暗面"},user:{id:userId,name:"moon-local-user",displayName:"本地用户"},pubKeyCredParams:[{type:"public-key",alg:-7},{type:"public-key",alg:-257}],authenticatorSelection:{authenticatorAttachment:"platform",userVerification:"required",residentKey:"preferred"},timeout:60000,attestation:"none"}}); if(!cred)throw new Error("注册被取消"); return b64uEnc(cred.rawId);}
    async function webauthnAuthenticate(credentialIdB64u){const challenge=crypto.getRandomValues(new Uint8Array(32)); const result=await navigator.credentials.get({publicKey:{challenge,allowCredentials:[{type:"public-key",id:b64uDec(credentialIdB64u)}],userVerification:"required",timeout:60000}}); if(!result)throw new Error("认证未完成"); return true;}
    async function sha256(text){if(!crypto.subtle)return "local-"+checksum("moon-lock:"+text); const bytes=new TextEncoder().encode(text); const digest=await crypto.subtle.digest("SHA-256",bytes); return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");}
    async function startLock(){const locked=!!prefs.lockHash; document.getElementById("lockBackdrop").style.display=locked?"flex":"none"; let bio=false; if(prefs.useBiometric){if(window.MoonBridge?.authenticate)bio=true; else if(prefs.webauthnCredentialId&&await webauthnSupported())bio=true;} document.getElementById("biometricUnlockBtn").style.display=bio?"inline-block":"none"; if(locked)setTimeout(()=>document.getElementById("unlockPassword").focus(),80);}
    async function unlockWithPassword(){const input=document.getElementById("unlockPassword"); if(!prefs.lockHash){document.getElementById("lockBackdrop").style.display="none"; promptArrivalIfReady(); return;} const hash=await sha256(input.value); if(hash===prefs.lockHash){input.value=""; document.getElementById("lockBackdrop").style.display="none"; promptArrivalIfReady();} else {alert("密码不正确。"); input.select();}}
    async function saveLockSettings(){const password=document.getElementById("newLockPassword").value; const wantBio=document.getElementById("useBiometric").checked; if(password){if(password.length<4){alert("密码至少 4 位。");return;} prefs.lockHash=await sha256(password);} if(wantBio&&!window.MoonBridge?.authenticate){if(!await webauthnSupported()){alert("当前浏览器不支持平台生物识别。\n要求：HTTPS / localhost，且系统已设置指纹或面容。");document.getElementById("useBiometric").checked=false; prefs.useBiometric=false; await savePrefs(); return;} if(!prefs.webauthnCredentialId){try{prefs.webauthnCredentialId=await webauthnRegister();}catch(err){const name=err?.name||""; const msg=name==="NotAllowedError"?"已取消或超时。":(err?.message||name||"未知错误"); alert("生物识别注册失败："+msg); document.getElementById("useBiometric").checked=false; prefs.useBiometric=false; await savePrefs(); return;}}} if(!wantBio)prefs.webauthnCredentialId=""; prefs.useBiometric=wantBio; if(await savePrefs()){closeModal("lockSettingsModal"); alert(prefs.lockHash?"密码锁设置已保存。":"设置已保存。");}}
    async function disableLock(){if(!confirm("确定关闭进入密码锁吗？"))return; prefs.lockHash=""; prefs.useBiometric=false; prefs.webauthnCredentialId=""; if(await savePrefs()){closeModal("lockSettingsModal"); document.getElementById("lockBackdrop").style.display="none";}}
    async function requestBiometricUnlock(){if(!prefs.useBiometric){alert("请先在密码设置中允许使用系统指纹 / 面容解锁。");return;} if(window.MoonBridge?.authenticate){window.MoonBridge.authenticate();return;} if(prefs.webauthnCredentialId){if(!await webauthnSupported()){alert("当前浏览器不支持平台生物识别。");return;} try{await webauthnAuthenticate(prefs.webauthnCredentialId); document.getElementById("unlockPassword").value=""; document.getElementById("lockBackdrop").style.display="none"; promptArrivalIfReady();}catch(err){const name=err?.name||""; if(name==="NotAllowedError")alert("已取消或未通过验证。"); else if(name==="InvalidStateError")alert("找不到已注册的凭据，请用密码登入后重新启用。"); else alert("生物识别失败："+(err?.message||name||"未知错误"));} return;} alert("当前环境不支持系统指纹 / 面容解锁。");}
    window.onMoonAuthResult=function(ok,message){if(ok){document.getElementById("unlockPassword").value=""; document.getElementById("lockBackdrop").style.display="none"; promptArrivalIfReady();} else if(message){alert(message);}};
    let disclaimerTimer=null;
    function startDisclaimer(){const btn=document.getElementById("enterBtn"); if(disclaimerTimer){clearInterval(disclaimerTimer);disclaimerTimer=null;} let left=3; btn.disabled=true; btn.textContent=`请等待 ${left} 秒`; disclaimerTimer=setInterval(()=>{left-=1; if(left>0){btn.textContent=`请等待 ${left} 秒`; return;} clearInterval(disclaimerTimer); disclaimerTimer=null; btn.disabled=false; btn.textContent="我已了解，进入";},1000); btn.onclick=()=>{if(btn.disabled)return; document.getElementById("disclaimerBackdrop").style.display="none"; promptArrivalIfReady();};}
    setInterval(async()=>{const changed=await closeDuePolls(); renderPolls(); renderChat(); renderHandoff(); if(changed)renderList();},60000);
    async function runAutoImageMigrationIfNeeded(){
      if(localStorage.getItem("imageMigrationDone")==="1")return;
      const hasLegacyImages=(data.messages||[]).some(m=>m.imageData)||(data.members||[]).some(m=>m.avatarData)||(data.rooms||[]).some(r=>r.backgroundData);
      if(!hasLegacyImages){
        localStorage.setItem("imageMigrationDone","1");
        localStorage.setItem("imageMigrationAt",new Date().toISOString());
        localStorage.setItem("imageMigrationVersion","1");
        return;
      }
      try{
        const result=await window.runImageMigrationToIndexedDB({confirm:true});
        if(result?.ok)console.log("自动图片迁移完成",result);
        else console.error("自动图片迁移失败，保留旧数据并继续启动：",result);
      }catch(err){
        console.error("自动图片迁移失败，保留旧数据并继续启动：",err);
      }
    }
    async function boot(){
      await storage.init();
      data=await load();
      prefs=await loadPrefs();
      ledgerRecords=await loadLedger();
      currentRoomId=data.rooms[0]?.id||"main";
      appMode=prefs.resetToCover===false?(prefs.lastAppMode||"cover"):"cover";
      await closeDuePolls();
      await runAutoImageMigrationIfNeeded();
      applyPrefs();
      render();
      applyAppMode();
    }
    boot().catch(err=>{console.error(err); alert("数据加载失败，请检查备份或控制台错误。");});
