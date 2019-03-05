const mysql = require("mysql");
const moment = require("moment");
let pool=[];
const db = ()=>{
    const createConnection = (args,cb)=>{
        var config = {
            host     : args.host,
            user     : args.username,
        }
        if(args.password && typeof args.password=="string"){
            config.password = args.password;
        }
        if(args.database && typeof args.database=="string"){
            config.database = args.database;
        }
        var sel = pool.filter((e)=>{return e.id===args.id})[0];
        if(sel){
            cb(sel.connection)
            return; 
        }
        config.multipleStatements=true;
        var connection = mysql.createConnection(config);
        connection.connect((err) =>{
            if (err) {
              cb(false);
              return;
            }
            args.connection = connection;
            pool.push(args);
            cb(connection);
        });
        
        return 
    }
    const execQuery = (args,cb)=>{
        createConnection(args.config,(conn)=>{
            if(!conn){
                cb({error:1,message:"fail to established connection"});
                return;
            }
            if(args.escape && args.escape.length >0){
                conn.query(args.query,args.escape,(err,results)=>{
                    if(err){
                        cb({error:1,message:JSON.stringify(err)});
                        return;
                    }
                    cb({error:0,message:"success",data:results});
                })
                return;
            }
            conn.query(args.query,(err,results)=>{
                
                if(err){
                    cb({error:1,message:JSON.stringify(err)});
                    return;
                }
                cb({error:0,message:"success",data:results});
            })
        });
    }
    const listDb = (args,cb)=> {
        args.query="SHOW DATABASES";
        execQuery(args,(rv)=>{
            cb(rv);
            
        })
    }
    const createDb =(args,cb)=>{
        args.query="CREATE DATABASE IF NOT EXISTS `"+args.name+"`";
        execQuery(args,(result)=>{
            if(result.error){
                cb(result);
                return;
            }
            listDb(args,(result) =>{
                cb(result)   
            })
        })
    }
    const dropDb =(args,cb)=>{
        args.query="DROP DATABASE `"+args.escape[0]+"`";
        execQuery(args,(result)=>{
            if(result.error){
                cb(result);
                return;
            }
            listDb(args,(result) =>{
                cb(result)   
            })
        })
    }
    const query = (args,cb)=>{
        let temp=[];
        let rv=[];
        
        execQuery(args,(results)=>{
            if(results && !results.error && results.data){
                results.data.forEach((v)=>{
                    if(v instanceof Array){
                        rv.push(v);
                        if(temp.length >0){
                            rv.push(temp);
                            temp = [];
                        }
                    }else{
                        temp.push(v);
                    }
                });
                if(temp.length >0){
                    rv.push(temp);
                }
                results.data = rv;
            }
            cb(results);
        })
    }
    const listTable = (args,cb)=>{
        args.query = "USE "+ args.config.database;
        execQuery(args,(results)=>{
            if(results.error){
                cb(results);
                return;
            }
            args.query = "show tables";
            execQuery(args,(results)=>{
                if(results.error){
                    cb(results);
                    return;
                }
                var rv=[];
                results.data.forEach((v)=>{
                    for(var k in v){
                        rv.push({table:v[k]})
                    }
                })
                cb({error:0,message:"updated",data:rv});
            })
            
        })
    }
    const createTable =(args,cb)=>{
        try{
            var schema = args.table;
        
            var query = "CREATE TABLE IF NOT EXISTS "+schema.name+" (";
			for (i=0;i<schema.column.length;i++){
				query += schema.column[i].name +" "+ schema.column[i].type;
				if(schema.column[i].length &&schema.column[i].length !=""){
					query +="("+ schema.column[i].length +")";
                }
                if(schema.column[i].index==="unique"){
                    query +=" UNIQUE ";
                }
                if(!schema.column[i].null){
					query +=" NOT NULL ";
                }
                if(schema.column[i].default &&schema.column[i].default !=""){
					query +=" DEFAULT "+ schema.column[i].default;
                }
				if (i<schema.column.length-1){
					query +=",";
				}
			}
				
			for (i=0;i<schema.column.length;i++){
                if(schema.column[i].index &&schema.column[i].index !=""){
					if(schema.column[i].index==="primary"){
                        query +=",PRIMARY KEY ("+schema.column[i].name+")"
                    }else if(schema.column[i].index==="index"){
                        query +=",INDEX "+schema.name+"_index_"+schema.column[i].name+" ("+schema.column[i].name+")";
                    }
                }
			}
            query +=")";
            args.query = "USE "+ args.config.database;
            execQuery(args,(results)=>{
                if(results.error){
                    cb(results);
                    return;
                }
                args.query = query;
                execQuery(args,(result)=>{
                    if(result.error){
                        cb(result);
                        return;
                    }
                    listTable(args,(result) =>{
                        cb(result)   
                    })
                })
            });
            
        }catch(e){
            console.log(e);
            cb({error:1,message:JSON.stringify(e)});
        }
    }
    const dropTable = (args,cb)=>{
        args.query = "DROP TABLE "+args.tableName;
        execQuery(args,(result)=>{
            if(result.error){
                cb(result);
                return;
            }
            listTable(args,(result) =>{
                cb(result)   
            })
        })
    }
    const truncateTable = (args,cb)=>{
        args.query = "TRUNCATE TABLE "+args.tableName;
        execQuery(args,(result)=>{
            cb(result);
        })
    }
    const browseTable = (args,cb)=>{
        if(!args.noLimit){
            let limitStr = " LIMIT 25";
            if(args.offset){
                limitStr = " LIMIT "+args.offset + ",25";
                args.offset += 25;
            }else{
                args.offset = 25;
            }
            args.query = "SELECT * FROM  "+args.config.table + limitStr;
        }else{
            args.query = "SELECT * FROM  "+args.config.table;
        }
        execQuery(args,(results)=>{
            results.offset = args.offset
            cb(results);
        })
    }
    const structureTable = (args,cb)=>{
        args.query = "DESCRIBE  "+args.config.table;
        execQuery(args,(result)=>{
            cb(result);
        })
    }
    const dropColumn = (args,cb)=>{
        args.query="ALTER TABLE "+args.config.table+" DROP COLUMN "+args.columnName;
        execQuery(args,(result)=>{
            cb(result);
        })
    }
    const createColumn =(args,cb)=>{
        try{
            let query="";
            args.column.forEach((v)=>{
                query +="ALTER TABLE " + args.config.table + " ADD COLUMN " + v.name +" " + v.type;
                if(v.length &&v.length !=""){
					query +="("+ v.length +")";
                }
                if(v.index==="unique"){
                    query +=" UNIQUE ";
                }
                if(!v.null){
					query +=" NOT NULL ";
                }
                if(v.default &&v.default !=""){
					query +=" DEFAULT "+ v.default;
                }
                if(v.index &&v.index !=""){
                    query +=",";
					if(v.index==="primary"){
                        query +="ADD PRIMARY KEY ("+v.name+")"
                    }else if(v.index==="index"){
                        query +="ADD INDEX "+args.config.table+"_index_"+v.name+" ("+v.name+")";
                    }
                }
				query +=";";
            })
            
            args.query = "USE "+ args.config.database;
            execQuery(args,(results)=>{
                if(results.error){
                    cb(results);
                    return;
                }
                args.query = query;
                execQuery(args,(result)=>{
                    if(result.error){
                        cb(result);
                        return;
                    }
                    listTable(args,(result) =>{
                        cb(result)   
                    })
                })
            });
            
        }catch(e){
            console.log(e);
            cb({error:1,message:JSON.stringify(e)});
        }
    }
    const close = (args)=>{
        var sel = pool.filter((e)=>{return e.id===args.id})[0];
        if(sel){
            sel.connection.end()
            pool.splice(pool.indexOf(sel),1);
        }
        return;
    }
    const insertMultiple = (args,cb)=>{
        
        const loopData=(idx,data,cb2)=>{
            try{
                if(idx >=data.length){
                    cb2({error:0,message:"success"});
                    return;
                }
                var sel = data[idx];
                var insertquery="(";
                var insertquery2="(";
                var escape =[];
                for (var attrname in sel) { 
                    insertquery += '`'+attrname+'`,';
                    insertquery2 += "?,";
                    escape.push(sel[attrname]);				
                }
                insertquery = insertquery.slice(0, - 1) + ")";
                insertquery2 = insertquery2.slice(0, - 1) + ")";
                args.query = "INSERT INTO "+args.table+" "+insertquery+" VALUES "+insertquery2;
                args.escape = escape;	
                execQuery(args,(results)=>{
                    if(results.error){
                        cb(results);
                        return;
                    }
                    loopData(idx+1,data,cb2);
                })
            }catch(e){
                cb({error:1,message:JSON.stringify(e)});
            }
        }
        loopData(0,args.data,(results)=>{
            cb(results);
        })

    }
    const parseTableJSONToSQL =(args,cb)=>{
        try{
            let schema = {
                name:args.name,
                column:args.column
            };
            var query = "CREATE TABLE IF NOT EXISTS "+schema.name+" (";
            for (i=0;i<schema.column.length;i++){
                query += schema.column[i].name +" "+ schema.column[i].type;
                if(schema.column[i].length &&schema.column[i].length !=""){
                    query +="("+ schema.column[i].length +")";
                }
                if(schema.column[i].index==="unique"){
                query +=" UNIQUE ";
                }
                if(!schema.column[i].null){
                    query +=" NOT NULL ";
                }
                if(schema.column[i].default &&schema.column[i].default !=""){
                    query +=" DEFAULT "+ schema.column[i].default;
                }
                if (i<schema.column.length-1){
                    query +=",";
                }
            }
            for (i=0;i<schema.column.length;i++){
                if(schema.column[i].index &&schema.column[i].index !=""){
                    if(schema.column[i].index==="primary"){
                        query +=",PRIMARY KEY ("+schema.column[i].name+")"
                    }else if(schema.column[i].index==="index"){
                        query +=",INDEX "+schema.name+"_index_"+schema.column[i].name+" ("+schema.column[i].name+")";
                    }
                }
            }
            query +=");\n";
            args.data.forEach((v)=>{
                let insertquery="(";
                let insertquery2="(";
                let val
                for (var attrname in v) { 
                    val = v[attrname];
                    let test =moment(v[attrname], "YYYY-MM-DD HH:mm:ss", true).isValid();
                    if(test===true){
                        val = moment(v[attrname]).format("YYYY-MM-DD HH:mm:ss");
                    }
                    insertquery += '`'+attrname+'`,';
                    insertquery2 += "'"+val+"',";	
                }
                insertquery = insertquery.slice(0, - 1) + ")";
                insertquery2 = insertquery2.slice(0, - 1) + ")";
                query +="INSERT INTO "+schema.name+" "+insertquery+" VALUES "+insertquery2 + ";\n";
            })
            cb({error:0,message:"success",data:query});
        }catch(e){
            cb({error:1,message:JSON.stringify(e)});
        }
    }
    const parseDatabaseJSONtoSQL = (args,callback)=>{
        const loopTable=(idx,queryString,tbl,cb2)=>{
            try{
                if(!tbl || idx >=tbl.length){
                    cb2(queryString)
                    return;
                }
                parseTableJSONToSQL(tbl[idx],(results)=>{
                    if(results.error){
                        callback(results);
                        return;
                    }
                    queryString+=results.data;
                    loopTable(idx+1,queryString,tbl,cb2);
                })
            }catch(e){
                console.log(e);
                callback({error:1,message:JSON.stringify(e)})
            }
        }
        let query="CREATE DATABASE IF NOT EXISTS `"+args.name+"`;\n USE "+args.name + "; \n";
        loopTable(0,query,args.table,(query)=>{
            callback({error:0,message:"sucess",data:query});
        });
    }
    const importFromSQL=(args,data,cb)=>{
        let qArr = data.split(";");
        const loopQuery = (args,arr,cb2)=>{
            if(!arr || arr.length <1){
                cb2({error:0,message:"success"});
                return;
            }
            let sel = arr.shift();
            args.query = sel;
            execQuery(args,(results)=>{
                if(results.error){
                    cb2(results);
                    return;
                }
                loopQuery(args,arr,cb2);
            })
        }
        loopQuery(args,qArr,(results)=>{
            cb(results);
        })
    }
    return{
        listDb:listDb,
        createDb:createDb,
        dropDb:dropDb,
        query:query,
        listTable:listTable,
        createTable:createTable,
        dropTable:dropTable,
        truncateTable:truncateTable,
        browseTable:browseTable,
        structureTable:structureTable,
        createColumn:createColumn,
        dropColumn:dropColumn,
        close:close,
        insertMultiple:insertMultiple,
        parseTableJSONToSQL:parseTableJSONToSQL,
        parseDatabaseJSONtoSQL:parseDatabaseJSONtoSQL,
        importFromSQL:importFromSQL,
    }
}
module.exports=db();