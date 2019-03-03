const fo = require("./fo");
const importer = ()=>{

    const table= (args,cb)=>{
        
        fo.readFile(args.filePath[0],function (results) {
            if (results.error){
                cb(results);
                return;
            }
            
            try{
                let jsonTable = JSON.parse(results.data);
                let mod = require("./"+ jsonTable.network);
                args.table ={
                    name:jsonTable.name,
                    column:jsonTable.column
                };
                
                mod.createTable(args,(results)=>{
                    if (results.error){
                        cb(results);
                        return;
                    }
                    args.data = jsonTable.data;
                    args.table = jsonTable.name;
                    mod.insertMultiple(args,(results)=>{
                        cb(results);
                    })
                })
            }catch(e){
                cb({error:1,message:JSON.stringify(e)});
            }
            
        });
        return;
    }
    const database= (args,cb)=>{
        
        fo.readFile(args.filePath[0], (results)=>{
            if (results.error){
                cb(results);
                return;
            }
            
            try{
                let jsonTable = JSON.parse(results.data);
                let mod = require("./"+ jsonTable.network);
                args.name = jsonTable.name;
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
                        args.query = "USE "+ jsonTable.name;
                        mod.query(args,(results)=>{
                            
                            if (results.error){
                                cb2(results);
                                return;
                            }
                            
                            params.config.database = jsonTable.name;
                            mod.createTable(params,(results)=>{
                                
                                if (results.error){
                                    cb2(results);
                                    return;
                                }
                                params.data = arr[idx].data;
                                params.table = arr[idx].name;
                                mod.insertMultiple(params,(results)=>{
                                    if (results.error){
                                        cb2(results);
                                        return;
                                    }
                                    loopTable(idx+1,arr,cb2);
                                })
                            })
                        })
                    }
                    
                    loopTable(0,jsonTable.table,(results)=>{
                        cb(results);
                    })
                })
                
               
            }catch(e){
                cb({error:1,message:JSON.stringify(e)});
            }
            
        });
        return;
    }
    return{
        database:database,
        table:table
    }
}
module.exports=importer();