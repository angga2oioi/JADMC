const { ipcRenderer } = require('electron');
const {dialog} = require('electron').remote;
const remote = require('electron').remote;
const prompt = require('electron-prompt');
let vm;
document.addEventListener('DOMContentLoaded',()=>{ 
    JADMC.init();
}, false);


let JADMC={
    init:()=>{
        vm = new Vue({
            el: "#jadmc-app",
            props:[],
            data:{
                componentKey:0,
                data:{
                    activeConfig:{}
                }
            },
            methods: {
                forceRerender() {
                  this.componentKey += 1;  
                },
            },
            mounted: function () {
                this.$nextTick(function () {
                    JADMC.element.init();
                })
            },
            updated: function () {
                this.$nextTick(function () {
                    JADMC.element.init();
                })
              }
        });
        var customArgument = remote.getCurrentWindow().customArgument;
        if(customArgument){
            JADMC.execute(customArgument);
        }

    },
    emit:(args,cb)=>{
        document.getElementsByClassName("overlay")[0].classList.remove("hidden")
        ipcRenderer.once(args.module+'-'+args.function+'-reply', (event, response) => {
            document.getElementsByClassName("overlay")[0].classList.add("hidden")
            cb(response);
        })
        ipcRenderer.send("command",args);
    },
    execute:(args)=>{
        try{
            JADMC[args.module][args.function](args.arg);
        }catch(e){
            alert("Fail to execute " + args.module + ":" + args.function + " - " + JSON.stringify(e));
        }
    },
    element:{
        init:function(){
            document.querySelectorAll("[data-tooltip]").forEach((e)=>{
                var toolSpan = e.getElementsByClassName("tooltiptext")[0];
                if(!toolSpan){
                    var x = document.createElement("span");                        
                    var t = document.createTextNode(e.getAttribute("data-tooltip"));
                    x.classList.add("tooltiptext");
                    x.appendChild(t);
                    e.appendChild(x);                 
                }
            });
            //yep, i prefer use this rather than v-on:click simply because less attribute on the element
            document.querySelectorAll("[data-action-click]").forEach((e)=>{
                e.removeEventListener("click", JADMC.element.execute);
                e.addEventListener("click",JADMC.element.execute);
            });
            document.querySelectorAll("[data-target]").forEach((e)=>{
                e.removeEventListener("click", JADMC.element.switchView);
                e.addEventListener("click",JADMC.element.switchView);
            })
            
        },
        switchView:(e)=>{
            var obj = e.currentTarget;
            var tgt = document.getElementById(obj.getAttribute("data-target").replace("#",""));
            var c = obj.parentElement.children;
            for(i=0; i< c.length;i++){
                c[i].classList.remove("button-primary")
            }
            obj.classList.add("button-primary");

            c = tgt.parentElement.children;
            for(i=0; i< c.length;i++){
                c[i].classList.remove("active")
            }
            tgt.classList.add("active");

        },
        execute:(e)=>{
            var args={}
            args.arg = e.currentTarget;
            var c = args.arg.getAttribute('data-action-click');
            args.module= c.split("-")[0];
            args.function = c.split("-")[1];
            JADMC.execute(args);
        },
        autoresize:(obj)=>{
            obj.style.height = "5px";
            obj.style.height = (obj.scrollHeight)+"px";
        }
    },
    connection:{
        init:()=>{
            JADMC.connection.loadAllConfig();
        },
        loadAllConfig:()=>{
            JADMC.emit({module:"fo",function:"loadAllConfig"},(response)=>{
                if(!response){
                    alert("fail to get response")
                    return;
                }
                if(response.error){
                    alert(response.message)
                    return;
                }
                if(response.data && typeof response.data === "object"){
                    vm.$set(vm.data, 'configList', response.data);
                    return;
                }
            })
        },
        removeConfig:(el)=>{
            var id = el.getAttribute("data-args");
            const dialogOptions = {type: 'info', buttons: ['OK', 'Cancel'], message: 'Remove it?'}
            dialog.showMessageBox(dialogOptions,(r)=>{
                if(r===0){
                    JADMC.emit({module:"fo",function:"removeConfig",arg:{id:id}},(response)=>{
                        if(response.error){
                            alert(response.message);
                            return;
                        }
                        vm.$set(vm.data, 'configList', response.data);
                    });
                }
            })
        },
        newConnectionWindow:()=>{
            vm.$set(vm.data, 'activeConfig', {});
            var c = document.getElementById("connectionEditWindow").parentElement.children;
            for(var i = 0;i<c.length ;i++){
                c[i].classList.add("hidden");
            }
            document.getElementById("connectionEditWindow").classList.remove("hidden");
        },
        backToConnectionManagerWindow:()=>{
            var c = document.getElementById("connectionListWindow").parentElement.children;
            for(var i = 0;i<c.length ;i++){
                c[i].classList.add("hidden");
            }
            document.getElementById("connectionListWindow").classList.remove("hidden");
            JADMC.connection.loadAllConfig();
        },
        editConnectionWindow:(el)=>{
            var id = el.getAttribute('data-args');
            JADMC.connection.loadConfig({id:id});
            
            var c = document.getElementById("connectionEditWindow").parentElement.children;
            for(var i = 0;i<c.length ;i++){
                c[i].classList.add("hidden");
            }
            document.getElementById("connectionEditWindow").classList.remove("hidden");
        },
        saveAndConnect:()=>{
            prompt({
                title: 'Enter configuration name',
                label: 'Name:',
                value: vm.data.activeConfig.host,
                inputAttrs: {
                    type: 'text'
                }
            })
            .then((configName) => {
                if(configName === null) {
                    return;
                }
                vm.data.activeConfig.configName = configName;
                JADMC.emit({module:"fo",function:"saveConfig",arg:vm.data.activeConfig},(response)=>{
                   
                    if(response.error){
                        alert(response.message);
                        return;
                    }
                    JADMC.connection.quickConnect();
                });
            })
        },
        quickConnect:()=>{
            JADMC.emit({
                module:"main",
                function:"createWindow",
                arg:{
                    html:"database.html",
                    command:{
                        module:"server",
                        function:"init",
                        arg:vm.data.activeConfig
                    }
                }
            },(response)=>{
                JADMC.connection.backToConnectionManagerWindow();
            });
        },
        
        loadConfig:(args)=>{
            JADMC.emit({module:"fo",function:"loadConfig",arg:args},(response)=>{
                if(!response){
                    alert("fail to get response")
                    return;
                }
                if(response.error){
                    alert(response.message)
                    return;
                }
                vm.$set(vm.data, 'activeConfig', response.data);
            })
        },
        updateConfig:()=>{
            JADMC.emit({module:"fo",function:"updateConfig",arg:vm.data.activeConfig},(response)=>{
                if(response.error){
                    alert(response.message);
                    return;
                }
                JADMC.connection.backToConnectionManagerWindow();
            });
        },
        connectNow:(el)=>{
            var id = el.getAttribute('data-args');
            JADMC.emit({module:"fo",function:"loadConfig",arg:{id:id}},(response)=>{
                if(!response){
                    alert("fail to get response")
                    return;
                }
                if(response.error){
                    alert(response.message)
                    return;
                }
                JADMC.emit({
                    module:"main",
                    function:"createWindow",
                    arg:{
                        html:"database.html",
                        command:{
                            module:"server",
                            function:"init",
                            arg:response.data
                        }
                    }
                },(response)=>{
                    JADMC.connection.backToConnectionManagerWindow();
                });
            })
        },
    },
    server:{
        init:(args)=>{
            var c = document.getElementsByClassName("block-container");
            for(var i = 0 ;i < c.length ; i++){
                c[i].classList.remove("active");
            }
            document.getElementsByClassName("block-container server")[0].classList.add("active");
            
            if(typeof vm.data.activeConfig.id==="undefined"){
                vm.data.activeConfig = args;
            }
            if(vm.data.activeConfig.database){
                delete vm.data.activeConfig.database;
            }
            vm.data.breadcrumbList=[
                {
                    init:"server-init",
                    name:"Server:"+vm.data.activeConfig.host,
                    class:'active',
                    args:"",
                }
            ]
            document.title = "JADMC | " + vm.data.activeConfig.host;
            JADMC.server.listDb();
            return;
        },
        listDb:()=>{
            var config = vm.data.activeConfig;
            if(!config || typeof config !="object"){
                alert("no active configuration");
                return;
            }
            JADMC.emit({
                module:config.network,
                function:"listDb",
                arg:{
                    config:config
                }
            },(response)=>{
                if(!response){
                    alert("fail to get response")
                    return;
                }
                if(response.error){
                    alert(response.message)
                    return;
                }
                vm.$set(vm.data, 'databaseList', response.data);
            })
        },
        createDb:()=>{
            var config = vm.data.activeConfig;
            if(!config || typeof config !="object"){
                alert("no active configuration");
                return;
            }
            prompt({
                title: 'Enter database name',
                label: 'Name:',
                inputAttrs: {
                    type: 'text'
                }
            })
            .then((dbName) => {
                if(dbName === null) {
                    return;
                }
                
                JADMC.emit({
                    module:config.network,
                    function:"createDb",
                    arg:{
                        config:config,
                        escape:[dbName],
                    }
                },(response)=>{
                    if(!response){
                        alert("fail to get response")
                        return;
                    }
                    if(response.error){
                        alert(response.message)
                        return;
                    }
                    vm.$set(vm.data, 'databaseList', response.data);
                })
            })
            
        },
        dropDb:(obj)=>{
            var config = vm.data.activeConfig;
            if(!config || typeof config !="object"){
                alert("no active configuration");
                return;
            }
            var dbName = obj.getAttribute('data-args');
            const dialogOptions = {type: 'info', buttons: ['OK', 'Cancel'], message: 'Drop '+dbName+' ?'}
            dialog.showMessageBox(dialogOptions,(r)=>{
                if(r===0){
                    JADMC.emit({
                        module:config.network,
                        function:"dropDb",
                        arg:{
                            config:config,
                            escape:[dbName]
                        }
                    },(response)=>{
                        if(response.error){
                            alert(response.message);
                            return;
                        }
                        vm.$set(vm.data, 'databaseList', response.data);
                    });
                    return;
                }
            })
        },
        sqlQuery:()=>{
            var config = vm.data.activeConfig;
            if(!config || typeof config !="object"){
                alert("no active configuration");
                return;
            }
            var queryString = document.getElementById("server-sql").querySelectorAll("[name=query]")[0].value;
            JADMC.emit({
                module:config.network,
                function:"query",
                arg:{
                    config:config,
                    query:queryString,
                }
            },(response)=>{
                if(!response){
                    alert("fail to get response");
                    return;
                }
                if(response.error){
                    alert(response.message);
                    return;
                }
                JADMC.server.listDb();
                vm.$set(vm.data, 'serverQueryList', response.data);
            });
        }
    },
    database:{
        init:(obj)=>{

            var c = document.getElementsByClassName("block-container");
            for(var i = 0 ;i < c.length ; i++){
                c[i].classList.remove("active");
            }
            document.getElementsByClassName("block-container database")[0].classList.add("active");
                
            vm.data.activeConfig.database =obj.getAttribute("data-args");
            let breadcrumbList=[
                {
                    init:"server-init",
                    name:"Server:"+vm.data.activeConfig.host,
                    class:'',
                    args:"",
                },
                {
                    init:"database-init",
                    name:"Database:"+vm.data.activeConfig.database,
                    class:'active',
                    args:vm.data.activeConfig.database,
                }
            ]
            document.title = "JADMC | " + vm.data.activeConfig.host + " | " +vm.data.activeConfig.database;
            vm.$set(vm.data, 'breadcrumbList', breadcrumbList);
            JADMC.database.listTable();
        },
        listTable:()=>{
            var config = vm.data.activeConfig;
            if(!config || typeof config !="object"){
                alert("no active configuration");
                return;
            }
            JADMC.emit({
                module:config.network,
                function:"listTable",
                arg:{
                    config:config
                }
            },(response)=>{
                if(!response){
                    alert("fail to get response")
                    return;
                }
                if(response.error){
                    alert(response.message)
                    return;
                }
                if(response && typeof response === "object"){
                    vm.$set(vm.data, 'tableList', response.data);
                    return;
              }
            })
        },
        dropTable:(obj)=>{
            
            var config = vm.data.activeConfig;
            if(!config || typeof config !="object"){
                alert("no active configuration");
                return;
            }
            var tableName = obj.getAttribute('data-args');
            const dialogOptions = {type: 'info', buttons: ['OK', 'Cancel'], message: 'Drop '+tableName+' ?'}
            dialog.showMessageBox(dialogOptions,(r)=>{
                if(r===0){
                    JADMC.emit({
                        module:config.network,
                        function:"dropTable",
                        arg:{
                            config:config,
                            tableName:tableName
                        }
                    },(response)=>{
                        if(!response){
                            alert("fail to get response")
                            return;
                        }
                        if(response.error){
                            alert(response.message)
                            return;
                        }
                        if(response.data && typeof response.data === "object"){
                            vm.$set(vm.data, 'tableList', response.data);
                            return;
                        }
                    })
                }
            })
            
        },
        truncateTable:(obj)=>{
            
            var config = vm.data.activeConfig;
            if(!config || typeof config !="object"){
                alert("no active configuration");
                return;
            }
            var tableName = obj.getAttribute('data-args');
            const dialogOptions = {type: 'info', buttons: ['OK', 'Cancel'], message: 'Truncate '+tableName+' ?'}
            dialog.showMessageBox(dialogOptions,(r)=>{
                if(r===0){
                    JADMC.emit({
                        module:config.network,
                        function:"truncateTable",
                        arg:{
                            config:config,
                            tableName:tableName
                        }
                    },(response)=>{
                        if(!response){
                            alert("fail to get response")
                            return;
                        }
                        if(response.error){
                            alert(response.message)
                            return;
                        }
                        
                    })
                }
            })  
        },
        sqlQuery:()=>{
            var config = vm.data.activeConfig;
            if(!config || typeof config !="object"){
                alert("no active configuration");
                return;
            }
            var queryString = document.getElementById("database-sql").querySelectorAll("[name=query]")[0].value;
            JADMC.emit({
                module:config.network,
                function:"query",
                arg:{
                    config:config,
                    query:queryString,
                }
            },(response)=>{
                if(!response){
                    alert("fail to get response");
                    return;
                }
                if(response.error){
                    alert(response.message);
                    return;
                }
                vm.$set(vm.data, 'databaseQueryList', response.data);
                JADMC.database.listTable();
            });
        },
        createSchema:()=>{
            var c = document.getElementById("database-table-create").parentElement.children;
            for(var i = 0 ;i < c.length ; i++){
                c[i].classList.remove("active");
            }
            document.getElementById("database-table-create").classList.add("active");
            vm.$set(vm.data, 'newSchema', []);
        },
        addSchemaColumn:()=>{
            var formData={};
            var d = document.getElementById("database-schema-form").querySelectorAll("[name]")
            for(var i = 0;i<d.length ; i++){
                var name = d[i].getAttribute("name");
                if (d[i].type && d[i].type === 'checkbox') {
                    formData[name] = d[i].checked;
                }else{
                    formData[name] = d[i].value;
                }
                
            }
            if(!formData.name || formData.name ==="" || !formData.type || formData.type===""){
                return;
            }
            formData._schemaId = new Date().getTime().toString();
            var currentSchema = vm.data.newSchema;

            currentSchema.push(formData);
            vm.$set(vm.data, 'newSchema', currentSchema);

            d = document.getElementById("database-schema-form").querySelectorAll("[name]")
            for(var i = 0;i<d.length ; i++){
                var name = d[i].getAttribute("name");
                if (d[i].type && d[i].type === 'checkbox') {
                    d[i].checked=false;
                }else{
                    d[i].value="";
                }
            }
        },
        removeSchemaColumn:(obj)=>{
            var schemaId=obj.getAttribute("data-args");
            var currentSchema = vm.data.newSchema;
            var sel = currentSchema.filter(e => e._schemaId === schemaId);
            if(!sel || sel.length <1){
                return;
            }
            var pick = sel[0];

            var idx = currentSchema.indexOf(pick);
            currentSchema.splice(idx,1);
            vm.$set(vm.data, 'newSchema', currentSchema);
        },
        createTable:()=>{
            var config = vm.data.activeConfig;
            if(!config || typeof config !="object"){
                alert("no active configuration");
                return;
            }
            prompt({
                title: 'Enter table name',
                label: 'Name:',
                value: "",
                inputAttrs: {
                    type: 'text'
                }
            })
            .then((tableName) => {
                if(tableName === null) {
                    return;
                }
                JADMC.emit({
                    module:config.network,
                    function:"createTable",
                    arg:{
                        config:config,
                        table:{
                            name:tableName,
                            column:vm.data.newSchema,
                        }
                    }
                },(response)=>{
                    if(!response){
                        alert("fail to get response")
                        return;
                    }
                    if(response.error){
                        alert(response.message)
                        return;
                    }
                    JADMC.database.listTable();
                    document.querySelectorAll("[data-target='#database-table']")[0].click();
                })
            })
            
        }
    },
    table:{
        init:(obj)=>{
            vm.data.activeConfig.table= obj.getAttribute("data-args");
            var c = document.getElementsByClassName("block-container");
            for(var i = 0 ;i < c.length ; i++){
                c[i].classList.remove("active");
            }
            document.getElementsByClassName("block-container table")[0].classList.add("active");

            let breadcrumbList=[
                {
                    init:"server-init",
                    name:"Server:"+vm.data.activeConfig.host,
                    class:'',
                    args:"",
                },
                {
                    init:"database-init",
                    name:"Database:"+vm.data.activeConfig.database,
                    class:'',
                    args:vm.data.activeConfig.database,
                },
                {
                    init:"table-init",
                    name:"Table:"+vm.data.activeConfig.table,
                    class:'active',
                    args:vm.data.activeConfig.table,
                }
            ]
            document.title = "JADMC | " + vm.data.activeConfig.host + " | " +vm.data.activeConfig.database + " | " + vm.data.activeConfig.table;
            vm.$set(vm.data, 'breadcrumbList', breadcrumbList);
            JADMC.table.browse();
            JADMC.table.listStructure();
        },
        browse:()=>{
            var config = vm.data.activeConfig;
            if(!config || typeof config !="object"){
                alert("no active configuration");
                return;
            }
            JADMC.emit({
                module:config.network,
                function:"browseTable",
                arg:{
                    config:config,
                }
            },(response)=>{
                if(!response){
                    alert("fail to get response")
                    return;
                }
                if(response.error){
                    alert(response.message)
                    return;
                }
                vm.$set(vm.data, 'browseTableList', response.data);
            })
            return;
        },
        listStructure:()=>{
            var config = vm.data.activeConfig;
            if(!config || typeof config !="object"){
                alert("no active configuration");
                return;
            }
            JADMC.emit({
                module:config.network,
                function:"structureTable",
                arg:{
                    config:config,
                }
            },(response)=>{
                if(!response){
                    alert("fail to get response")
                    return;
                }
                if(response.error){
                    alert(response.message)
                    return;
                }
                vm.$set(vm.data, 'structureTableList', response.data);
            })
            return;
        },
        sqlQuery:()=>{
            var config = vm.data.activeConfig;
            if(!config || typeof config !="object"){
                alert("no active configuration");
                return;
            }
            var queryString = document.getElementById("table-sql").querySelectorAll("[name=query]")[0].value;
            JADMC.emit({
                module:config.network,
                function:"query",
                arg:{
                    config:config,
                    query:queryString,
                }
            },(response)=>{
                if(!response){
                    alert("fail to get response");
                    return;
                }
                if(response.error){
                    alert(response.message);
                    return;
                }
                vm.$set(vm.data, 'tableQueryList', response.data);
                JADMC.table.browse();
                JADMC.table.listStructure();
            });
        },
        dropColumn:(obj)=>{
            var config = vm.data.activeConfig;
            if(!config || typeof config !="object"){
                alert("no active configuration");
                return;
            }
            var columnName = obj.getAttribute('data-args');
            const dialogOptions = {type: 'info', buttons: ['OK', 'Cancel'], message: 'Drop '+columnName+' ?'}
            dialog.showMessageBox(dialogOptions,(r)=>{
                if(r===0){
                    JADMC.emit({
                        module:config.network,
                        function:"dropColumn",
                        arg:{
                            config:config,
                            columnName:columnName,
                        }
                    },(response)=>{
                        if(!response){
                            alert("fail to get response")
                            return;
                        }
                        if(response.error){
                            alert(response.message)
                            return;
                        }
                        JADMC.table.browse();
                        JADMC.table.listStructure();
                    })
                    return;
                }
            })
        }
    }
}