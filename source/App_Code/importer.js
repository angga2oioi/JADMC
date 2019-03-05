const fs = require("fs");
const main = require("./main");
const path = require("path");

const importer = ()=>{

    
    const table= (args,cb)=>{
        let msgParam={
            id:args.winId,
            channel:'loading-notif',
        }
        msgParam.message="Open file";
        main.emit(msgParam);
        fs.readFile(args.filePath[0], 'utf8', function (err, data) {
            if (err){
                cb({error:1,message:JSON.stringify(err)});
                return;
            }
            let ext = path.extname(args.filePath[0]);
            if(ext ==".json"){
                importTableFromJSON(args,data,(results)=>{
                    cb(results);
                });
                return;
            }
            /*if(ext==".sql"){
                let mod = require("./"+ args.config.network);
                mod.importFromSQL(args,data,(results)=>{
                    cb(results);
                })
                return;
            }*/
            cb({error:1,message:"unknown file type"})
            
        });
        return;
    }
    const importTableFromJSON=(args,data,cb)=>{
        try{
            let jsonTable = JSON.parse(data);
            let mod = require("./"+ jsonTable.network);
            args.table ={
                name:jsonTable.name,
                column:jsonTable.column
            };
            let msgParam={
                id:args.winId,
                channel:'loading-notif',
            }
            msgParam.message="Creating table "+ jsonTable.name;
            main.emit(msgParam);
            
            mod.createTable(args,(results)=>{
                if (results.error){
                    cb(results);
                    return;
                }
                args.data = jsonTable.data;
                args.table = jsonTable.name;
                let msgParam={
                    id:args.winId,
                    channel:'loading-notif',
                }
                msgParam.message="Insert table " + jsonTable.name;
                main.emit(msgParam);
               
                mod.insertMultiple(args,(results)=>{
                    cb(results);
                })
            })
        }catch(e){
            cb({error:1,message:JSON.stringify(e)});
        }
    }
    const importDatabaseFromJSON = (args,data,cb)=>{
        try{
            let jsonTable = JSON.parse(data);
            let mod = require("./"+ jsonTable.network);
            args.name = jsonTable.name;
            
            let msgParam={
                id:args.winId,
                channel:'loading-notif',
            }

            msgParam.message="Create DB";
            main.emit(msgParam); 
            mod.createDb(args,(results)=>{
                if(results.error){
                    cb(results);
                    return;
                }
                
                const loopTable=(idx,arr,cb2)=>{
                    if(idx>=arr.length){
                        cb2({error:0,message:"updated"});
                        return;
                    }
                    var params={
                        config:args.config,
                        table:{
                            name:arr[idx].name,
                            column:arr[idx].column
                        }
                    }
                    
                    msgParam.message="creating table " + arr[idx].name;
                    main.emit(msgParam);

                    params.config.database = jsonTable.name;
                    mod.createTable(params,(results)=>{
                            
                        if (results.error){
                            cb2(results);
                            return;
                        }
                        params.data = arr[idx].data;
                        params.table = arr[idx].name;

                        msgParam.message="Insert table " + arr[idx].name;
                        main.emit(msgParam);

                        mod.insertMultiple(params,(results)=>{
                            if (results.error){
                                cb2(results);
                                return;
                            }
                            loopTable(idx+1,arr,cb2);
                        })
                    })
                }
                
                loopTable(0,jsonTable.table,(results)=>{
                    cb(results);
                })
            })
            
           
        }catch(e){
            console.log(e);
            cb({error:1,message:JSON.stringify(e)});
        }
    }
    const database= (args,cb)=>{
        let msgParam={
            id:args.winId,
            channel:'loading-notif',
        }
        msgParam.message="Open file";
        main.emit(msgParam);
        fs.readFile(args.filePath[0], 'utf8', function (err, data) {
            if (err){
                cb({error:1,message:JSON.stringify(e)});
                return;
            }
            let ext = path.extname(args.filePath[0]);
            if(ext ==".json"){
                importDatabaseFromJSON(args,data,(results)=>{
                    cb(results);
                });
                return;
            }
            /*if(ext==".sql"){
                let mod = require("./"+ args.config.network);
                mod.importFromSQL(args,data,(results)=>{
                    cb(results);
                })
                return;
            }*/
            cb({error:1,message:"unknown file type"})
        });
        return;
    }
    return{
        database:database,
        table:table
    }
}
module.exports=importer();