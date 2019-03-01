function parameter(){
	var error="";
	var errParam= [];
	function check(req,needed,allowed){
		if (!allowed){allowed=[];}
		var param = this.parseHttpRequest(req);
		return this.test(param,needed,allowed);
	}
	function getError(){
		return errParam.join(",");
	}
	function test(params,needed,allowed){
		if (!allowed){allowed=[];}
		var keys = Object.keys(params);
		var isOK = true;
		for (var i = 0; i < needed.length; i++) {

			if (keys.indexOf(needed[i]) < 0 && allowed.indexOf(needed[i]) < 0){
				//if parameter is not exists and not allowed to be not exists
				errParam.push(needed[i]);
				isOK =  false;
				continue;
			}
			if(!params[needed[i]] && allowed.indexOf(needed[i]) < 0){
				//if params is exists but no value and not allowed to be empty
				errParam.push(needed[i]);
				isOK =  false;
				continue;
			}
			if (keys.indexOf(needed[i]) < 0 && allowed.indexOf(needed[i]) >= 0){
				//if parameter is not exists but allowed to be not exists
				params[needed[i]]= null;
				continue;
			}

		}
		if(!isOK){
			return false;
		}
		var reparam = JSON.parse( JSON.stringify( params ) );;
		for (var attrname in reparam) {
			if (needed.indexOf(attrname) < 0){
				delete reparam[attrname];
			}
		}

		return reparam;
	}
	function parseHttpRequest(req){
		var param = {};
	    for (var attrname in req.query) { param[attrname] = req.query[attrname]; }
	    for (var attrname in req.body) { param[attrname] = req.body[attrname]; }
		for (var attrname in req.params) { param[attrname] = req.params[attrname]; }

		return param;
	}
	return {
		error:getError,
		test:test,
		parseHttpRequest:parseHttpRequest,
		check:check
	}
}
module.exports=parameter;
