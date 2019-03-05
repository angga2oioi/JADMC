var fs = require("fs");
const { app } = require('electron');
const cwd = app.getPath("userData");
const fpath = cwd +"/connection.json";
const parameter = require("./helper/parameter.js");
const string = require("./helper/string.js");
const  fo = () => {
    const saveConfig = (args,cb) => {
        var p = new parameter();
        var params = p.test(args,["configName","network","host","port","username","password"],["password"]);
        if(!params){
            cb({error:1,message:p.error() + " cannot be empty"})
            return;
        }
       
        params.id = string.random(12);
        loadAllConfig((response)=>{
            if(response.error){
                cb(response)
                return;
            }
            var config = response.data;
            if (config.filter(e => e.configName === params.configName).length > 0) {
                cb({error:1,message:params.configName + " is already used, please choose another name"})
                return;
            }
            config.push(params);
            var json = JSON.stringify(config);
            fs.writeFile(fpath, json,(err)=>{
                if(err){
                    cb({error:1,message:JSON.stringify(err)});
                    return;
                }
                cb({error:0,message:"updated",data:config});
            });
        });
    }
    const loadAllConfig = (args,cb) => {
        if(typeof args==="function"){
            cb = args;
        }
        if(!fs.existsSync(fpath)){
            cb({error:0,message:"no data",data:[]});
            return;
        }
        fs.readFile(fpath, 'utf8', (err, data) => {
            if (err){
                cb({error:1,message:JSON.stringify(err)});
            };
            var config = JSON.parse(data);
            cb({error:0,message:"success",data:config});
        });
    }
    const loadConfig = (args,cb) => {
        loadAllConfig(function(response){
            if(response.error){
                cb(response);
                return;
            }
            var config = response.data;
            
            var sel = config.filter(e => e.id === args.id);
            if(!sel || sel.length <1){
                cb({error:1,message:"configuration not found"});
                return;
            }
            cb({error:0,message:"success",data:sel[0]});
        })
        
    }
    const updateConfig = (args,cb) =>{
        loadAllConfig((response) =>{
            if(response.error){
                cb({error:1,message:"cannot read configuration.json"});
                return;
            }
            var config = response.data;
            var sel = config.filter(e => e.id === args.id);
            if(!sel || sel.length <1){
                cb({error:1,message:"configuration not found"});
                return;
            }
            var pick = sel[0];
            config.splice(config.indexOf(pick),1);
            config.push(args);
            var json = JSON.stringify(config);
            fs.writeFile(fpath, json,(err)=>{
                if(err){
                    cb({error:1,message:JSON.stringify(err)});
                    return;
                }
                cb({error:0,message:"updated",data:config});
            });
        })
    }
    const removeConfig = (args,cb)=>{
        loadAllConfig((response) =>{
            if(response.error){
                cb(response);
                return;
            }
            var config = response.data;
            var sel = config.filter(e => e.id === args.id);
            if(!sel || sel.length <1){
                cb({error:1,message:"configuration not found"});
                return;
            }
            var pick = sel[0];
            config.splice(config.indexOf(pick),1);
            var json = JSON.stringify(config);
            fs.writeFile(fpath, json,(err)=>{
                if(err){
                    cb({error:1,message:JSON.stringify(err)});
                    return;
                }
                cb({error:0,message:"updated",data:config});
            });
        })
    }
    const saveToFile =(args,cb)=>{
        fs.writeFile(args.path, args.data,(err)=>{
            if(err){
                cb({error:1,message:JSON.stringify(err)});
                return;
            }
            cb({error:0,message:"File Saved"});
        });
    }
    const readFile = (fpath,cb)=>{
        
        fs.readFile(fpath, 'utf8', function (err, data) {
            if (err){
                
                cb({error:1,message:JSON.stringify(err)});
                return;
            }
            
            cb({error:0,message:"success",data:data});
        });
    }
    return {
        removeConfig:removeConfig,
        updateConfig:updateConfig,
        loadConfig:loadConfig,
        saveConfig:saveConfig,
        loadAllConfig:loadAllConfig,
        saveToFile:saveToFile,
        readFile:readFile,
    }
}
module.exports=fo();