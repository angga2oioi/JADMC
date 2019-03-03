const { app, BrowserWindow } = require('electron');
const { ipcMain } = require('electron')


var viewDir = "src/";
var arrWin=[];
const main = () => {
    const init = () => {
        app.on('ready',() =>{
            createWindow({
                html:"index.html",
                command:{
                    module:"connection",
                    function:"init",
                }
            });
        })
        app.on('window-all-closed', () => {
            app.quit()
        })
        app.on('activate', () => {
            if (arrWin.length <1 ) {
                createWindow({
                    html:"index.html",
                    command:{
                        module:"connection",
                        function:"init",
                    }
                });
            }
        });
        ipcMain.on('command', (event, arg) => {
            execute(arg,(response)=>{
                event.sender.send(arg.module + '-'+arg.function+'-reply', response);
            });
        });
    }
    const createWindow = (args,cb) => {
        let win;
        win = new BrowserWindow({ 
            width: 960, 
            height: 600, 
            webPreferences: {
                nodeIntegration: true,
            }
        });
        let fpath = viewDir + args.html;
        win.loadFile(fpath)
        win.on('closed', () => {
            try{
                var args = win.customArgument.arg;
                if(args.id && args.network){
                    var modules  = require("./" + args.network);
                    modules.close(args);
                }
            }catch(e){
                
            }
            arrWin.splice(arrWin.indexOf(win),1);
            win = null;
        });
        //win.openDevTools();
        if(args.command){
            win.customArgument= args.command;
        }
        arrWin.push(win);
        if(typeof cb==="function"){
            cb({error:0,message:"success"});
        }
    }
    const execute = (args,cb) => {
        try{
            var modules  = require("./" + args.module);
            modules[args.function](args.arg,cb);
        }catch(e){
            cb({error:1,message:JSON.stringify(e)});
        }
    }
    const emit =(args)=>{
        let sel = arrWin.filter((e)=>{return e.id ===args.id})[0];
        if(!sel){
            return;
        }
        sel.webContents.send(args.channel , args);
    }
    return{
        init:init,
        createWindow:createWindow,
        emit:emit,
    }
}
module.exports=main();