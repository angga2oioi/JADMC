var crypto = require('crypto');
function string(){
	function allescape(data){
		for(x in data){
			if(typeof data[x] =='object'){
				data[x]=allescape(data[x]);
			}
			if(typeof data[x]=='string'){
				data[x]=data[x].replace(/\n/g, "<br>")
								.replace(/\r/g, "")
								.replace(/\t/g, "&#09;")
                               .replace(/'/g, "&#39;")
                               .replace(/"/g, "&#34");
			}
		}
		return data;
	}

	function unescape(input){	
		return input.replace(/\\/g, '');
	}
	function random(min,max){
		
		var text = "";
		var possible = "abcdefghijklmnopqrstuvwxyz0123456789";
		if(!max){
			var max = min;
			min = Math.ceil(max/2);
		}
		var nlen = Math.floor(Math.random() * (max-min+1)+min);
		for( var i=0; i < nlen; i++ )
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		return text;
		
		//return crypto.randomBytes(len).toString('base64').replace(/\W+/g,"x");
	}
	function randomNumber(min,max){
		
		var text = "";
		var possible = "0123456789";
		if(!max){
			var max = min;
			min = Math.ceil(max/2);
		}
		var nlen = Math.floor(Math.random() * (max-min+1)+min);
		for( var i=0; i < nlen; i++ )
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		return text;
		
		//return crypto.randomBytes(len).toString('base64').replace(/\W+/g,"x");
	}
	function makeLinkUrl(string){
		var urlPattern = /\b(?:https?|ftp):\/\/[a-z0-9-+&@#\/%?=~_|!:,.;]*[a-z0-9-+&@#\/%=~_|]/gim;

        // www. sans http:// or https://
        var pseudoUrlPattern = /(^|[^\/])(www\.[\S]+(\b|$))/gim;

        // Email addresses
        var emailAddressPattern = /[\w.]+@[a-zA-Z_-]+?(?:\.[a-zA-Z]{2,6})+/gim;

        return string.replace(urlPattern, '<a href="$&" data-mode="linkify">$&</a>').replace(pseudoUrlPattern, '$1<a href="http://$2" data-mode="linkify">$2</a>').replace(emailAddressPattern, '<a href="mailto:$&" data-mode="linkify">$&</a>');
	}
	function mapObject(obj){
	    var mapped = "";
		for(var i in obj){
		    mapped +=i+"="+obj[i] + ";";
		}
		return mapped;
	}
	return {
		unescape:unescape,
		random:random,
		randomNumber:randomNumber,
		makeLinkUrl:makeLinkUrl,
		allescape:allescape,
		map:mapObject,
	}
}
module.exports=string();