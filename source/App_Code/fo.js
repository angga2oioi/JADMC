var fs = require("fs");
const cwd = process.cwd();
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
    const loadAllConfig = (arg,cb) => {
        if(typeof arg==="function"){
            cb = arg;
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
    const loadConfig = (arg,cb) => {
        loadAllConfig(function(response){
            if(response.error){
                cb(response);
                return;
            }
            var config = response.data;
            
            var sel = config.filter(e => e.id === arg.id);
            if(!sel || sel.length <1){
                cb({error:1,message:"configuration not found"});
                return;
            }
            cb({error:0,message:"success",data:sel[0]});
        })
        
    }
    const updateConfig = (arg,cb) =>{
        loadAllConfig((response) =>{
            if(response.error){
                cb({error:1,message:"cannot read configuration.json"});
                return;
            }
            var config = response.data;
            var sel = config.filter(e => e.id === arg.id);
            if(!sel || sel.length <1){
                cb({error:1,message:"configuration not found"});
                return;
            }
            var pick = sel[0];
            config.splice(config.indexOf(pick),1);
            config.push(arg);
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
    const removeConfig = (arg,cb)=>{
        loadAllConfig((response) =>{
            if(response.error){
                cb(response);
                return;
            }
            var config = response.data;
            var sel = config.filter(e => e.id === arg.id);
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
    return {
        removeConfig:removeConfig,
        updateConfig:updateConfig,
        loadConfig:loadConfig,
        saveConfig:saveConfig,
        loadAllConfig:loadAllConfig,
    }
}
module.exports=fo();