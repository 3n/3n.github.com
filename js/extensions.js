var InvisibleDimensions = new Class({
	Implements: Options,
	
	options : {
		getSize_updates_width : false,
		getSize_nulls_height	: false
	},
	
	initialize: function(element, options){
		this.setOptions(options)
		this.element = element;
		
		if (element.get('tag') == 'img'){
			this.fake_div = new Element('img').set('src', this.element.get('src').replace('"',''));
		}else{
			this.fake_div = new Element('div').set('html', this.element.get('html'));
			if (this.element.get('tag') == 'input') this.fake_div.set('html', "DUMMY");
		}

		this.fake_div.setStyles({
			'position': 			'absolute',
			'left':           '-100000px',
			'top': 						'-100000px'
		});

		this.fake_div.copyStyles(this.element,[
			'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
			'font-weight', 'font-size', 'font-family', 'border-width', 'border-style', 'line-height', 'width'
		]);
		
		return this;
	},
	getSize: function(){
		this.fake_div.inject(this.element,'before')
								 .destroy.delay(3000, this.fake_div)
		
		if (this.options.getSize_updates_width) this.fake_div.setStyle('width', this.element.getWidth())
		if (this.options.getSize_nulls_height) 	this.fake_div.setStyle('height', null)
		
		return this.fake_div.getSize();
	}
});

Element.implement({
	invisibleSize: function(){
		return new InvisibleDimensions(this).getSize()
	}
})




Element.implement({
	thumbnail: function(x,y,c){
		var height = this.getHeight()
		var width  = this.getWidth()

		if (height > width)
			this.setStyles({'width':x, 'height':1/(width/height)*x})
		else
			this.setStyles({'height':x, 'width':(width/height)*x})
			
		new Element('div', {
			'class' 			: c || '',
			'styles':{
				"overflow"	: "hidden",
				"width"			: x + "px",
				"height"		: y + "px"
			}
		}).wraps(this)
		
		return this
	},
	copyStyles: function(elem, styles){
		[styles].flatten().each(function(s){
			try {
				this.setStyle(s,elem.getStyle(s))
			}catch(e){}
		},this)
		return this
	},
	on_has_width: function(fun){
		if (this.invisibleSize().x > 0) fun()
		else this.on_has_width.delay(10, this, fun)
		return this
	}
})


/*
Script: JsonP.js
	Defines JsonP, a class for cross domain javascript via script injection.

License:
	http://clientside.cnet.com/wiki/cnet-libraries#license
*/
var JsonP = new Class({
	Implements: [Options, Events],
	options: {
//	onComplete: $empty,
		callBackKey: "callback",
		queryString: "",
		data: {},
		timeout: 5000,
		retries: 0
	},
	initialize: function(url, options){
		this.setOptions(options);
		this.url = this.makeUrl(url).url;
		this.fired = false;
		this.scripts = [];
		this.requests = 0;
		this.triesRemaining = [];
	},
	request: function(url, requestIndex){
		var u = this.makeUrl(url);
		if(!$chk(requestIndex)) {
			requestIndex = this.requests;
			this.requests++;
		}
		if(!$chk(this.triesRemaining[requestIndex])) this.triesRemaining[requestIndex] = this.options.retries;
		var remaining = this.triesRemaining[requestIndex]; //saving bytes
		dbug.log('retrieving by json script method: %s', u.url);
		var dl = (Browser.Engine.trident)?50:0; //for some reason, IE needs a moment here...
		(function(){
			var script = new Element('script', {
				src: u.url, 
				type: 'text/javascript',
				id: 'jsonp_'+u.index+'_'+requestIndex
			});
			this.fired = true;
			this.addEvent('onComplete', function(){
				try {script.dispose();}catch(e){}
			}.bind(this));
			script.inject(document.head);

			if(remaining) {
				(function(){
					this.triesRemaining[requestIndex] = remaining - 1;
					if(script.getParent() && remaining) {
						dbug.log('removing script (%o) and retrying: try: %s, remaining: %s', requestIndex, remaining);
						script.dispose();
						this.request(url, requestIndex);
					}
				}).delay(this.options.timeout, this);
			}
		}.bind(this)).delay(dl);
		return this;
	},
	makeUrl: function(url){
		var index;
		if (JsonP.requestors.contains(this)) {
			index = JsonP.requestors.indexOf(this);
		} else {
			index = JsonP.requestors.push(this) - 1;
			JsonP.requestors['request_'+index] = this;
		}
		if(url) {
			var separator = (url.test('\\?'))?'&':'?';
			var jurl = url + separator + this.options.callBackKey + "=JsonP.requestors.request_" +
				index+".handleResults";
			if(this.options.queryString) jurl += "&"+this.options.queryString;
			jurl += "&"+Hash.toQueryString(this.options.data);
		} else var jurl = this.url;
		
		// begin 3n
		if ($chk(this.options.global_function))
			window[this.options.global_function] = function(r){
				JsonP.requestors[index].handleResults(r)
			}
		// end 3n
		
		return {url: jurl, index: index};
	},
	handleResults: function(data){
		dbug.log('jsonp received: ', data);
		this.fireEvent('onComplete', [data, this]);
	}
});
JsonP.requestors = [];



/*
Script: dbug.js
	A wrapper for Firebug console.* statements.

License:
	http://clientside.cnet.com/wiki/cnet-libraries#license
*/
var dbug = {
	logged: [],	
	timers: {},
	firebug: false, 
	enabled: false, 
	log: function() {
		dbug.logged.push(arguments);
	},
	nolog: function(msg) {
		dbug.logged.push(arguments);
	},
	time: function(name){
		dbug.timers[name] = new Date().getTime();
	},
	timeEnd: function(name){
		if (dbug.timers[name]) {
			var end = new Date().getTime() - dbug.timers[name];
			dbug.timers[name] = false;
			dbug.log('%s: %s', name, end);
		} else dbug.log('no such timer: %s', name);
	},
	enable: function(silent) { 
		if(dbug.firebug) {
			try {
				dbug.enabled = true;
				dbug.log = function(){
						(console.debug || console.log).apply(console, arguments);
				};
				dbug.time = function(){
					console.time.apply(console, arguments);
				};
				dbug.timeEnd = function(){
					console.timeEnd.apply(console, arguments);
				};
				if(!silent) dbug.log('enabling dbug');
				for(var i=0;i<dbug.logged.length;i++){ dbug.log.apply(console, dbug.logged[i]); }
				dbug.logged=[];
			} catch(e) {
				dbug.enable.delay(400);
			}
		}
	},
	disable: function(){ 
		if(dbug.firebug) dbug.enabled = false;
		dbug.log = dbug.nolog;
		dbug.time = function(){};
		dbug.timeEnd = function(){};
	},
	cookie: function(set){
		var value = document.cookie.match('(?:^|;)\\s*jsdebug=([^;]*)');
		var debugCookie = value ? unescape(value[1]) : false;
		if((!$defined(set) && debugCookie != 'true') || ($defined(set) && set)) {
			dbug.enable();
			dbug.log('setting debugging cookie');
			var date = new Date();
			date.setTime(date.getTime()+(24*60*60*1000));
			document.cookie = 'jsdebug=true;expires='+date.toGMTString()+';path=/;';
		} else dbug.disableCookie();
	},
	disableCookie: function(){
		dbug.log('disabling debugging cookie');
		document.cookie = 'jsdebug=false;path=/;';
	}
};

(function(){
	var fb = typeof console != "undefined";
	var debugMethods = ['debug','info','warn','error','assert','dir','dirxml'];
	var otherMethods = ['trace','group','groupEnd','profile','profileEnd','count'];
	function set(methodList, defaultFunction) {
		for(var i = 0; i < methodList.length; i++){
			dbug[methodList[i]] = (fb && console[methodList[i]])?console[methodList[i]]:defaultFunction;
		}
	};
	set(debugMethods, dbug.log);
	set(otherMethods, function(){});
})();
if (typeof console != "undefined" && console.warn){
	dbug.firebug = true;
	var value = document.cookie.match('(?:^|;)\\s*jsdebug=([^;]*)');
	var debugCookie = value ? unescape(value[1]) : false;
	if(window.location.href.indexOf("jsdebug=true")>0 || debugCookie=='true') dbug.enable();
	if(debugCookie=='true')dbug.log('debugging cookie enabled');
	if(window.location.href.indexOf("jsdebugCookie=true")>0){
		dbug.cookie();
		if(!dbug.enabled)dbug.enable();
	}
	if(window.location.href.indexOf("jsdebugCookie=false")>0)dbug.disableCookie();
}
