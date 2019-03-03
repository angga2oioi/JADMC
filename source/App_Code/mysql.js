const mysql = require("mysql");
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
        var qArr = args.query.replace(/\n|\r/g, "").split(";");
        var rv=[];
        const queryStep = (arr,callback)=>{
           
            if(!arr || arr.length <1){
                callback(rv);
                return;
            }
            var sel = arr.shift();
            if(!sel || sel===""){
                queryStep(arr,callback);
                return;
            }
            args.query = sel;
            
            execQuery(args,(results)=>{
                if(results.error){
                    cb(results);
                    return;
                }
                if(results.data instanceof Array){
                    rv.push(results.data);
                }else{
                    rv.push([results.data]);
                }
                queryStep(arr,callback);
            })
        }
        queryStep(qArr,(rv)=>{
            cb({error:0,message:"success",data:rv});
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
        
            var query = "CREATE TABLE "+schema.name+" (";
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
        args.query = "SELECT * FROM  "+args.config.table;
        execQuery(args,(result)=>{
            cb(result);
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
        dropColumn:dropColumn,
        close:close,
        insertMultiple:insertMultiple,
    }
}
module.exports=db();