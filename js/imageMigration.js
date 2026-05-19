    (function(){
      const MAIN_KEY="osddDidLocalJournal.v2";
      const BACKUP_KEY="backupBeforeImageMigration.v1";
      const DONE_KEY="imageMigrationDone";
      const AT_KEY="imageMigrationAt";
      const VERSION_KEY="imageMigrationVersion";

      function currentMainRaw(){
        return localStorage.getItem(MAIN_KEY);
      }

      function dataUrlLength(value){
        return typeof value==="string"?value.length:0;
      }

      function countPreview(){
        const messageImages=(data.messages||[]).filter(m=>m.imageData&&!m.imageId).length;
        const memberAvatars=(data.members||[]).filter(m=>m.avatarData&&!m.avatarId).length;
        const roomBackgrounds=(data.rooms||[]).filter(r=>r.backgroundData&&!r.backgroundId).length;
        const alreadyMigrated={
          messageImages:(data.messages||[]).filter(m=>m.imageId).length,
          memberAvatars:(data.members||[]).filter(m=>m.avatarId).length,
          roomBackgrounds:(data.rooms||[]).filter(r=>r.backgroundId).length
        };
        const estimatedDataUrlChars=[
          ...(data.messages||[]).map(m=>dataUrlLength(m.imageData)),
          ...(data.members||[]).map(m=>dataUrlLength(m.avatarData)),
          ...(data.rooms||[]).map(r=>dataUrlLength(r.backgroundData))
        ].reduce((sum,n)=>sum+n,0);
        const dataSnapshot=JSON.stringify(data);
        const jsonLengthBefore=dataSnapshot.length;
        const estimatedJsonLengthAfter=Math.max(0,jsonLengthBefore-estimatedDataUrlChars);
        const estimatedReducedChars=jsonLengthBefore-estimatedJsonLengthAfter;
        return {
          ok:true,
          messageImages,
          memberAvatars,
          roomBackgrounds,
          totalImages:messageImages+memberAvatars+roomBackgrounds,
          jsonLengthBefore,
          estimatedDataUrlChars,
          estimatedJsonLengthAfter,
          estimatedReducedChars,
          estimatedReducedRatio:jsonLengthBefore?estimatedReducedChars/jsonLengthBefore:0,
          alreadyMigrated,
          backupExists:!!localStorage.getItem(BACKUP_KEY),
          migrationDone:localStorage.getItem(DONE_KEY)==="1"
        };
      }

      function previewImageMigration(){
        const result=countPreview();
        console.log("image migration preview",result);
        return result;
      }

      function backupMainData(options={}){
        const existing=localStorage.getItem(BACKUP_KEY);
        if(existing&&!options.forceBackup)return {ok:true,created:false,existing:true};
        const raw=currentMainRaw();
        if(raw==null)throw new Error("main_data_missing");
        localStorage.setItem(BACKUP_KEY,raw);
        return {ok:true,created:true,existing:false};
      }

      async function migrateOne(kind,item,id,dataUrl,mime,name){
        const blob=imageStore.dataUrlToBlob(dataUrl);
        await imageStore.putImage({id,blob,mime:mime||blob.type||"image/*",name:name||"图片"});
        if(kind==="message"){
          item.imageId=id;
          delete item.imageData;
        }else if(kind==="member"){
          item.avatarId=id;
          delete item.avatarData;
        }else if(kind==="room"){
          item.backgroundId=id;
          delete item.backgroundData;
        }
      }

      async function runImageMigrationToIndexedDB(options={}){
        if(options?.confirm!==true)return {ok:false,reason:"confirm_required"};
        const preview=previewImageMigration();
        if(preview.totalImages===0)return {ok:true,migrated:{messageImages:0,memberAvatars:0,roomBackgrounds:0,totalImages:0},jsonLengthBefore:preview.jsonLengthBefore,jsonLengthAfter:preview.jsonLengthBefore,reducedChars:0,reducedRatio:0};
        const dataSnapshot=JSON.stringify(data);
        const jsonLengthBefore=dataSnapshot.length;
        try{
          backupMainData(options);
          const migrated={messageImages:0,memberAvatars:0,roomBackgrounds:0,totalImages:0};
          for(const m of data.messages||[]){
            if(!m.imageData||m.imageId)continue;
            const id=`msgimg-${m.id}`;
            try{
              await migrateOne("message",m,id,m.imageData,m.imageType||"",""+(m.imageName||"图片"));
              migrated.messageImages+=1;
            }catch(err){
              throw {reason:"message_image_failed",error:err,failedItem:{type:"message",id:m.id,imageId:id}};
            }
          }
          for(const mem of data.members||[]){
            if(!mem.avatarData||mem.avatarId)continue;
            const id=`avatar-${mem.id}`;
            try{
              const blob=imageStore.dataUrlToBlob(mem.avatarData);
              await imageStore.putImage({id,blob,mime:blob.type||"image/*",name:`${mem.name||"member"}-头像`});
              mem.avatarId=id;
              delete mem.avatarData;
              migrated.memberAvatars+=1;
            }catch(err){
              throw {reason:"member_avatar_failed",error:err,failedItem:{type:"member",id:mem.id,imageId:id}};
            }
          }
          for(const r of data.rooms||[]){
            if(!r.backgroundData||r.backgroundId)continue;
            const id=`roombg-${r.id}`;
            try{
              const blob=imageStore.dataUrlToBlob(r.backgroundData);
              await imageStore.putImage({id,blob,mime:blob.type||"image/*",name:`${r.name||r.id||"room"}-背景`});
              r.backgroundId=id;
              delete r.backgroundData;
              migrated.roomBackgrounds+=1;
            }catch(err){
              throw {reason:"room_background_failed",error:err,failedItem:{type:"room",id:r.id,imageId:id}};
            }
          }
          migrated.totalImages=migrated.messageImages+migrated.memberAvatars+migrated.roomBackgrounds;
          (data.messages||[]).forEach(m=>{m.integrity=messageIntegrity(m);});
          if(!(await save()))throw new Error("save_failed");
          localStorage.setItem(DONE_KEY,"1");
          localStorage.setItem(AT_KEY,now());
          localStorage.setItem(VERSION_KEY,"1");
          const jsonLengthAfter=JSON.stringify(data).length;
          const result={ok:true,migrated,jsonLengthBefore,jsonLengthAfter,reducedChars:jsonLengthBefore-jsonLengthAfter,reducedRatio:jsonLengthBefore?(jsonLengthBefore-jsonLengthAfter)/jsonLengthBefore:0};
          console.log("image migration completed",result);
          return result;
        }catch(err){
          try{data=JSON.parse(dataSnapshot);}catch(restoreErr){console.error("image migration memory restore failed",restoreErr);}
          const reason=err?.reason||"migration_failed";
          const error=err?.error||err;
          const failedItem=err?.failedItem||null;
          const result={ok:false,reason,error:error?.message||String(error),failedItem};
          console.error("image migration failed",result,error);
          return result;
        }
      }

      function rollbackImageMigrationFromBackup(){
        const raw=localStorage.getItem(BACKUP_KEY);
        if(!raw)return {ok:false,reason:"backup_missing"};
        localStorage.setItem(MAIN_KEY,raw);
        localStorage.removeItem(DONE_KEY);
        localStorage.removeItem(AT_KEY);
        localStorage.removeItem(VERSION_KEY);
        const result={ok:true,restored:true,message:"已从图片迁移备份恢复，请刷新页面"};
        console.warn(result.message);
        return result;
      }

      window.previewImageMigration=previewImageMigration;
      window.runImageMigrationToIndexedDB=runImageMigrationToIndexedDB;
      window.rollbackImageMigrationFromBackup=rollbackImageMigrationFromBackup;
    })();
