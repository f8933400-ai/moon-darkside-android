    (function(){
      function currentData(){
        if(window.data)return window.data;
        if(typeof data!=="undefined")return data;
        return {messages:[],members:[],rooms:[]};
      }

      function requireImageStore(){
        if(!window.imageStore)throw new Error("imageStore is not available.");
        if(typeof window.imageStore.listImages!=="function")throw new Error("imageStore.listImages is not available.");
        return window.imageStore;
      }

      function emptyMissing(){
        return {messageImages:[],memberAvatars:[],roomBackgrounds:[],total:0};
      }

      function collectReferences(appData){
        const refs={messageImages:[],memberAvatars:[],roomBackgrounds:[]};
        for(const m of appData.messages||[]){
          if(m.imageId)refs.messageImages.push({id:m.imageId,messageId:m.id,roomId:m.roomId,imageName:m.imageName||""});
        }
        for(const member of appData.members||[]){
          if(member.avatarId)refs.memberAvatars.push({id:member.avatarId,memberId:member.id,memberName:member.name||""});
        }
        for(const room of appData.rooms||[]){
          const name=typeof roomDisplayName==="function"?roomDisplayName(room):room.name||"";
          if(room.backgroundId)refs.roomBackgrounds.push({id:room.backgroundId,roomId:room.id,roomName:name});
        }
        return refs;
      }

      function referencedIds(refs){
        return new Set([
          ...refs.messageImages.map(x=>x.id),
          ...refs.memberAvatars.map(x=>x.id),
          ...refs.roomBackgrounds.map(x=>x.id)
        ].filter(Boolean));
      }

      async function missingReferences(refs,imageStore){
        const missing=emptyMissing();
        for(const ref of refs.messageImages){
          if(!(await imageStore.getImageBlob(ref.id)))missing.messageImages.push(ref);
        }
        for(const ref of refs.memberAvatars){
          if(!(await imageStore.getImageBlob(ref.id)))missing.memberAvatars.push(ref);
        }
        for(const ref of refs.roomBackgrounds){
          if(!(await imageStore.getImageBlob(ref.id)))missing.roomBackgrounds.push(ref);
        }
        missing.total=missing.messageImages.length+missing.memberAvatars.length+missing.roomBackgrounds.length;
        return missing;
      }

      async function buildImageStorageHealthReport(){
        const imageStore=requireImageStore();
        const appData=currentData();
        const refs=collectReferences(appData);
        const ids=referencedIds(refs);
        const records=await imageStore.listImages();
        const missing=await missingReferences(refs,imageStore);
        const orphaned=records.filter(record=>!ids.has(record.id));
        return {
          ok:missing.total===0,
          referenced:{
            messageImages:refs.messageImages.length,
            memberAvatars:refs.memberAvatars.length,
            roomBackgrounds:refs.roomBackgrounds.length,
            total:refs.messageImages.length+refs.memberAvatars.length+refs.roomBackgrounds.length
          },
          missing,
          orphaned,
          indexedDbTotal:records.length
        };
      }

      function tableReport(report){
        if(console.table){
          console.table([
            ...report.missing.messageImages.map(x=>({type:"messageImage",...x})),
            ...report.missing.memberAvatars.map(x=>({type:"memberAvatar",...x})),
            ...report.missing.roomBackgrounds.map(x=>({type:"roomBackground",...x}))
          ]);
          console.table(report.orphaned);
        }
      }

      async function runImageStorageHealthCheck(){
        const report=await buildImageStorageHealthReport();
        console.log("image storage health check",report);
        tableReport(report);
        return report;
      }

      async function listImageStoreRecords(){
        const records=await requireImageStore().listImages();
        if(console.table)console.table(records);
        else console.log(records);
        return records;
      }

      async function cleanOrphanImages(options={}){
        if(options.confirm!==true)return {ok:false,reason:"confirm_required"};
        const imageStore=requireImageStore();
        const report=await buildImageStorageHealthReport();
        console.warn(`cleanOrphanImages: deleting ${report.orphaned.length} orphaned images`);
        const failed=[];
        let deleted=0;
        for(const record of report.orphaned){
          try{
            await imageStore.deleteImage(record.id);
            deleted+=1;
          }catch(err){
            failed.push({id:record.id,error:err?.message||String(err)});
          }
        }
        const after=await buildImageStorageHealthReport();
        const result={ok:failed.length===0,deleted,failed,remainingOrphaned:after.orphaned.length};
        console.log("cleanOrphanImages result",result);
        return result;
      }

      function parseBackup(backupJsonOrObject){
        const backup=typeof backupJsonOrObject==="string"?JSON.parse(backupJsonOrObject):backupJsonOrObject;
        return {
          backup:backup||{},
          messages:backup?.messages||[],
          members:backup?.members||[],
          rooms:backup?.rooms||[]
        };
      }

      function emptyRepairCounts(){
        return {messageImages:0,memberAvatars:0,roomBackgrounds:0,total:0};
      }

      function emptyCannotRepairCounts(){
        return {messageImages:0,memberAvatars:0,roomBackgrounds:0,total:0};
      }

      function finalizeCounts(counts){
        counts.total=counts.messageImages+counts.memberAvatars+counts.roomBackgrounds;
        return counts;
      }

      function findBackupMessage(messages,missing){
        return messages.find(m=>m.id===missing.messageId||m.imageId===missing.id);
      }

      function findBackupMember(members,missing){
        return members.find(member=>member.id===missing.memberId||member.avatarId===missing.id);
      }

      function findBackupRoom(rooms,missing){
        return rooms.find(room=>room.id===missing.roomId||room.backgroundId===missing.id);
      }

      async function previewRepairMissingImagesFromBackupJson(backupJsonOrObject){
        const health=await runImageStorageHealthCheck();
        const parsed=parseBackup(backupJsonOrObject);
        const canRepair=emptyRepairCounts();
        const cannotRepair=emptyCannotRepairCounts();
        for(const item of health.missing.messageImages){
          const match=findBackupMessage(parsed.messages,item);
          if(match?.imageData)canRepair.messageImages+=1;
          else cannotRepair.messageImages+=1;
        }
        for(const item of health.missing.memberAvatars){
          const match=findBackupMember(parsed.members,item);
          if(match?.avatarData)canRepair.memberAvatars+=1;
          else cannotRepair.memberAvatars+=1;
        }
        for(const item of health.missing.roomBackgrounds){
          const match=findBackupRoom(parsed.rooms,item);
          if(match?.backgroundData)canRepair.roomBackgrounds+=1;
          else cannotRepair.roomBackgrounds+=1;
        }
        const result={missingTotal:health.missing.total,canRepair:finalizeCounts(canRepair),cannotRepair:finalizeCounts(cannotRepair)};
        console.log("previewRepairMissingImagesFromBackupJson",result);
        return result;
      }

      function makeRepairReport(){
        return {ok:false,repaired:emptyRepairCounts(),stillMissing:emptyMissing(),skipped:[],errors:[]};
      }

      async function putBackupImage(report,kind,id,dataUrl,putOptions){
        const imageStore=requireImageStore();
        try{
          if(!putOptions.overwrite&&await imageStore.getImageBlob(id)){
            report.skipped.push({type:kind,id,reason:"exists"});
            return false;
          }
          const blob=imageStore.dataUrlToBlob(dataUrl);
          await imageStore.putImage({id,blob,mime:putOptions.mime||blob.type||"image/*",name:putOptions.name||"图片"});
          report.repaired[kind]+=1;
          return true;
        }catch(err){
          report.errors.push({id,error:err?.message||String(err)});
          return false;
        }
      }

      async function repairMissingImagesFromBackupJson(backupJsonOrObject,options={}){
        const health=await runImageStorageHealthCheck();
        const report=makeRepairReport();
        if(health.missing.total===0){
          report.ok=true;
          report.repaired=finalizeCounts(report.repaired);
          console.log("repairMissingImagesFromBackupJson",report);
          return report;
        }
        const parsed=parseBackup(backupJsonOrObject);
        for(const item of health.missing.messageImages){
          const match=findBackupMessage(parsed.messages,item);
          if(!match){
            report.stillMissing.messageImages.push(item);
            continue;
          }
          if(!match.imageData){
            report.skipped.push({type:"messageImages",id:item.id,messageId:item.messageId,reason:"missing_imageData"});
            continue;
          }
          await putBackupImage(report,"messageImages",item.id,match.imageData,{overwrite:options.overwrite===true,mime:match.imageType||"",name:match.imageName||item.imageName||"图片"});
        }
        for(const item of health.missing.memberAvatars){
          const match=findBackupMember(parsed.members,item);
          if(!match){
            report.stillMissing.memberAvatars.push(item);
            continue;
          }
          if(!match.avatarData){
            report.skipped.push({type:"memberAvatars",id:item.id,memberId:item.memberId,reason:"missing_avatarData"});
            continue;
          }
          await putBackupImage(report,"memberAvatars",item.id,match.avatarData,{overwrite:options.overwrite===true,name:`${match.name||item.memberName||"member"}-头像`});
        }
        for(const item of health.missing.roomBackgrounds){
          const match=findBackupRoom(parsed.rooms,item);
          if(!match){
            report.stillMissing.roomBackgrounds.push(item);
            continue;
          }
          if(!match.backgroundData){
            report.skipped.push({type:"roomBackgrounds",id:item.id,roomId:item.roomId,reason:"missing_backgroundData"});
            continue;
          }
          await putBackupImage(report,"roomBackgrounds",item.id,match.backgroundData,{overwrite:options.overwrite===true,name:`${match.name||item.roomName||match.id||"room"}-背景`});
        }
        report.repaired=finalizeCounts(report.repaired);
        const after=await runImageStorageHealthCheck();
        report.stillMissing=after.missing;
        report.ok=report.stillMissing.total===0&&report.errors.length===0;
        console.log("repairMissingImagesFromBackupJson",report);
        return report;
      }

      function repairMissingImagesFromBackupFile(file,options){
        return new Promise((resolve,reject)=>{
          const reader=new FileReader();
          reader.onerror=()=>reject(reader.error);
          reader.onload=async()=>{
            try{
              const result=await repairMissingImagesFromBackupJson(reader.result,options);
              resolve(result);
            }catch(err){
              reject(err);
            }
          };
          reader.readAsText(file);
        });
      }

      window.runImageStorageHealthCheck=runImageStorageHealthCheck;
      window.listImageStoreRecords=listImageStoreRecords;
      window.cleanOrphanImages=cleanOrphanImages;
      window.repairMissingImagesFromBackupJson=repairMissingImagesFromBackupJson;
      window.repairMissingImagesFromBackupFile=repairMissingImagesFromBackupFile;
      window.previewRepairMissingImagesFromBackupJson=previewRepairMissingImagesFromBackupJson;
    })();
