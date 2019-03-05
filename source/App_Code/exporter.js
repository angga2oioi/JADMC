const fs = require("fs");
const main = require("./main");
const Excel = require('exceljs');
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
                args.noLimit = true;
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
                parseDatabaseToJSON(params,(results)=>{
                    if(results.error){
                        cb(results);
                        return;
                    }
                    if(fType==="json"){
                        results.data.network = args.config.network;
                        let jsonString = JSON.stringify(results.data);
                        fPath += "." + fType;
                        writeToFile(fpath,jsonString,(results)=>{
                            cb(results);
                        })
                        return;
                    }
                    if(fType==="sql"){
                        mod.parseDatabaseJSONtoSQL(results.data,(results)=>{
                            if(results.error){
                                cb(results);
                                return;
                            }
                            fPath += "." + fType;
                            writeToFile(fPath,results.data,(results)=>{
                                cb(results);
                            })
                        })
                        return;
                    }
                    if(fType==="xlsx"){
                        let workbook = new Excel.Workbook();
                        const loopxlsx = (wb,arr,cb2)=>{
                            if(!arr || arr.length < 1){
                                cb2(wb);
                                return;
                            }
                            let sel= arr.shift();
                            parseTableJSONToXLSX(wb,sel,(results)=>{
                                if(results.error){
                                    cb(results);
                                    return;
                                }
                                wb = results.data;
                                loopxlsx(wb,arr,cb2);
                            })
                        }
                        loopxlsx(workbook,results.data.table,(wb)=>{
                            fPath += "." + fType;
                            wb.xlsx.writeFile(fPath).then(function() {
								cb({error:false,message:"Saved"});
							});
                        })
                        return;
                    }
                    cb({error:1,message:"invalid file type: " + fType});
                })
            })
            
        })
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
        args.noLimit = true;
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
                parseTableToJSON(params,(results)=>{
                    if(results.error){
                        cb(results);
                        return;
                    }
                    if(fType==="json"){
                        results.data.network = args.config.network;
                        let jsonString = JSON.stringify(results.data);
                        fPath += "." + fType;
                        writeToFile(fPath,jsonString,(results)=>{
                            cb(results);
                        })
                        return;
                    }
                    if(fType==="sql"){
                        mod.parseTableJSONToSQL(results.data,(results)=>{
                            if(results.error){
                                cb(results);
                                return;
                            }
                            fPath += "." + fType;
                            writeToFile(fPath,results.data,(results)=>{
                                cb(results);
                            })
                        })
                        return;
                    }
                    if(fType==="xlsx"){
                        let workbook = new Excel.Workbook();
                        parseTableJSONToXLSX(workbook,results.data,(results)=>{
                            if(results.error){
                                cb(results);
                                return;
                            }
                            fPath += "." + fType;
                            results.data.xlsx.writeFile(fPath).then(function() {
								cb({error:false,message:"Saved"});
							});
                        })
                        return;
                    }
                    
                    cb({error:1,message:"invalid file type: " + fType});
                })
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
    const parseTableJSONToXLSX = (wb,args,cb)=>{
        try{
            let ws = wb.addWorksheet(args.name);
            let cols = 65;
            args.column.forEach((c)=>{
                ws.getCell(String.fromCharCode(cols) + '1').value = c.name;
                cols++;
            });
            let rows = 2;
            args.data.forEach((v)=>{
                cols=65;
                for(var attr in v){
                    ws.getCell(String.fromCharCode(cols) + rows).value = v[attr];
                    cols++;
                }
                rows++;
            });
            ws.state = 'visible';
            cb({error:0,message:"success",data:wb});
        }catch(e){
            cb({error:1,message:JSON.stringify(e)})
        }

    }
    const writeToFile=(fPath,data,cb)=>{
        
        fs.writeFile(fPath,data,(err,response)=>{
            if (err){
                cb({error:1,message:JSON.stringify(err)});
                return;
            }
            cb({error:0,message:"success",data:response});
        })
    }
    const rawData =(args,cb)=>{
        var fType = args.fileType;
        var fPath = args.filePath;
        if(fType==="json"){
            let jsonString = JSON.stringify(args.rawData);
            fPath += "." + fType;
            writeToFile(fPath,jsonString,(results)=>{
                cb(results);
            })
            return;
        }
        if(fType=="xlsx"){
            let wb = new Excel.Workbook();
            let ws = wb.addWorksheet("exported data");
            let cols = 65;
            for(var attr in args.rawData[0]){
                ws.getCell(String.fromCharCode(cols) + '1').value = attr;
                cols++;
            }
            let rows = 2;
            args.rawData.forEach((v)=>{
                cols=65;
                for(var attr in v){
                    ws.getCell(String.fromCharCode(cols) + rows).value = v[attr];
                    cols++;
                }
                rows++;
            });
            ws.state = 'visible';
            fPath += "." + fType;
            wb.xlsx.writeFile(fPath).then(function() {
                cb({error:false,message:"Saved"});
            });
            return;
        }
        cb({error:1,message:"invalid file type: " + fType});

    }
    return{
        table:table,
        database:database,
        rawData:rawData
    }
}
module.exports=exporter();