const fo = require("./fo.js");
const main = require("./main");
const exporter = ()=>{
    
    const parseDatabaseToJSON=(args,cb)=>{
        try{
            let jsonDatabase={
                name:args.name,
                table:[]
            }
            let loopTable= (tbl,cb)=>{
                if(!tbl || tbl.length <1){
                    cb();
                    return;
                }
                var sel = tbl.shift();
                var params={
                    name:sel.table,
                    data:sel.data,
                    column:sel.column
                }
                parseTableToJSON(params,(results)=>{
                    if(results.error){
                        cb(results);
                        return;
                    }
                    jsonDatabase.table.push(results.data);
                    loopTable(tbl,cb);
                })

            }
            loopTable(args.table,()=>{
                cb({error:0,message:"updated",data:jsonDatabase});
            })
            
        }catch(e){
            console.log(e);
            cb({error:1,message:JSON.stringify(e)});
        }
    }
    const database=(args,cb)=>{
        var fType = args.fileType;
        var fPath = args.filePath;
        var mod = require("./"+args.config.network);
        var params = {
            name:args.config.database,
        }
        let msgParam={
            id:args.winId,
            channel:'loading-notif',
        }
        msgParam.message="List table";
        main.emit(msgParam);
        mod.listTable(args,(results)=>{
            if(results.error){
                cb(results);
                return;
            }
            let loopTable =(idx,tbl,cb2)=>{
                if(idx >= tbl.length){
                    cb2(tbl)
                    return;
                }
                args.config.table = tbl[idx].table;
                msgParam.message="List data from " + args.config.table;
                main.emit(msgParam);
                
                mod.browseTable(args,(results)=>{
                    if(results.error){
                        cb(results);
                        return;
                    }
                    tbl[idx].data= results.data;
                    
                    msgParam.message="List column from " + args.config.table;
                    main.emit(msgParam);
                    
                    mod.structureTable(args,(results)=>{
                        if(results.error){
                            cb(results);
                            return;
                        }
                        tbl[idx].column =results.data;
                        loopTable(idx+1,tbl,cb2);
                    })
                })

            }
            loopTable(0,results.data,(rv)=>{
                if(results.error){
                    cb(results);
                    return;
                }
                params.table = rv;
                if(fType==="json"){
                    parseDatabaseToJSON(params,(results)=>{
                        if(results.error){
                            cb(results);
                            return;
                        }
                        results.data.network = args.config.network;
                        let jsonString = JSON.stringify(results.data);
                        fPath += "." + fType;
                        fo.saveToFile({data:jsonString,path:fPath},(response)=>{
                            cb(response);
                        })
                    })
                    return;
                }
                cb({error:1,message:"invalid file type " + fType});
                
            })
            
        })
    }
    const parseTableToJSON = (args,cb)=>{
        try{
            var jsonTable={
                name:args.name
            }
            jsonTable.data = args.data;
            jsonTable.column=[];
            args.column.forEach((v)=>{
                var temp = {
                    name:v.Field,
                    
                    index:(v.Key=="PRI" ? "primary" : ((v.Key==="MUL") ? "index": ((v.Key==="UNI") ? "unique" : ""))),
                    null:(v.Null=="NO" ? false: true ),
                    default:(v.Default ? v.Default + " " + v.Extra : ""),
                }
                var t=v.Type.split("(");
                temp.type= t[0],
                temp.length = (t[1] ? t[1].replace(")",""): ""),               
                jsonTable.column.push(temp);
            });
            cb({error:0,message:"updated",data:jsonTable});
        }catch(e){
            console.log(e);
            cb({error:1,message:JSON.stringify(e)});
            return;
        }
    }
    const table = (args,cb)=>{
        
        var fType = args.fileType;
        var fPath = args.filePath;
        var mod = require("./"+args.config.network);
        var params = {
            name:args.config.table,
        }
        let msgParam={
            id:args.winId,
            channel:'loading-notif',
        }
        msgParam.message="List data from " + params.name;
        main.emit(msgParam);
        
        mod.browseTable(args,(results)=>{
            if(results.error){
                cb(results);
                return;
            }
            params.data = results.data;
            msgParam.message="List column" + params.name;
            main.emit(msgParam);
           
            mod.structureTable(args,(results)=>{
                if(results.error){
                    cb(results);
                    return;
                }
                params.column = results.data;
                if(fType==="json"){
                    parseTableToJSON(params,(results)=>{
                        if(results.error){
                            cb(results);
                            return;
                        }
                        results.data.network = args.config.network;
                        let jsonString = JSON.stringify(results.data);
                        fPath += "." + fType;
                        
                        fo.saveToFile({data:jsonString,path:fPath},(response)=>{
                            cb(response);
                        })
                    })
                    return;
                }
                cb({error:1,message:"invalid file type" + fType});

            })
        })

    }
    return{
        table:table,
        database:database
    }
}
module.exports=exporter();