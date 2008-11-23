var _3n = {}
get_user_names()

var Cell = new Class({
	Implements: Options,
	options: {
		main_class    : 'single-wide',
		custom_class	: '',
		title 				: '',
		created_on		: new Date(1985,5,31),
		source				: '#'
	},
	initialize: function(html, options){
		this.setOptions(options)
		this.html = html
		
		this.update_element()
		
		this.setup_tip()
		this.add_events()
		
		return this
	},
	
	create_element: function(){
		this.element = this.element || new Element('div')
		this.element.addClass('cell')
								.addClass(this.options.main_class)
								.addClass(this.options.custom_class)
								.addClass((coin_toss(0.1) ? 'inverted' : ''))
		
		if 			($type(this.html) === 'element') this.element.adopt(this.html)
		else if ($type(this.html) === 'string')  this.element.set('html', this.html)

		this.element.store('source',  this.options.source)
		this.element.store('title',   this.options.title)
		this.element.store('created', this.options.created_on.timeDiffInWords())

		return this.element
	},
	
	update_element: function(){
		this.element = this.create_element()
		return this
	},
	
	setup_tip: function(){
	  Cell.tip = Cell.tip || new JustTheTip(null, {
    	showDelay  : 400,
    	x_location : 'left',
    	y_location : 'bottom',
    	fade_in_duration  : 100,
    	fade_out_duration : 200
    }).addEvent('tipShown', function(tip,elem){
        tip.set('html', "<a class='title' href='" + elem.retrieve('source') + "'>" + elem.retrieve('title') + "</a><span class='date'>" + elem.retrieve('created') + "</span>")
      })
	},
	
	add_events: function(){
		if (this.options.source.length > 4) this.element.act_like_link(this.options.source)
		Cell.tip.add_element(this.element)
	},
	
	to_html: function(){
		return this.element
	}
})
Cell.tip = null

var ImageCell = new Class({
	Extends: Cell,
	initialize: function(src, options){
		this.setOptions(options)
		
		var elem = new Element('img', {
			'src' 	: src,
			'styles': { 'display':'none'	}
		})
		
		return this.parent(elem, options)
	},
	
	to_html: function(){
		this.html.on_has_width(function(){ 
			this.setStyle('display','block').thumbnail(140,140)
		}.bind(this.html))
		
		return this.parent()
	}
})


var Model = new Class({
	Implements: Events,
	initialize: function(){
		this.db = []
		
		this.title_elem = new Element('div', {
			'class' : 'cell single-wide grid-title ' + this.site_name, 
			'html'  : this.nombre
		}).act_like_link(this.web_source)
		
		return this
	},
	
	get_data: function(){
		new JsonP(
			this.json_url, 
			$merge(	{abortAfter : 1500, onComplete : this.process_data.bind(this) }, this.json_opts) 
		).request()
		return this
	},
	
	sort_by: function(field){
		return this.db.sort(function(a,b){
			a[field] - b[field]
		})
	},
	
	to_cells: function(limit){	
		var limit = limit || 100	
		this.cells = [this.title_elem].combine(this.db.map(function(row){ 
			var cell = this._to_cell.apply(row)
			cell.element.hasClass('double-wide') ? limit -= 2 : --limit
			if (limit > 0) return cell.to_html()
		}.bind(this)).flatten())
		return this.cells
		// return [this.title_elem].combine(this.db.map(function(row){ return this._to_cell.apply(row).to_html() }.bind(this))).first(limit||100)
	},
	
	current_user: function(){
		return current_user(this.site_name)
	}
})

var Flickr = new Class({
	Extends: Model,
	
	site_name  : "flickr",
	nombre     : "SEEING", 
	json_url   : "http://api.flickr.com/services/feeds/photos_public.gne",
	web_source : "http://www.flickr.com/photos/" + current_user('flickr'),
	json_opts  : { globalFunction : 'jsonFlickrFeed',
								 data: { id     : _3n.flickr_id,
												 lang   : "en-us",
									       format : 'json' } },
 	initial_limit : 15,									
	
	initialize: function(){
		if (this.json_opts.data.id === '') this.json_url = null
		return this.parent()
	},
	
	process_data: function(json){
		this.db = json.items.map(function(json_item){
			return {
				title       : json_item.title,
				created_on  : Date.parse(json_item.date_taken),
				img_url     : json_item.media.m,
				source      : json_item.link,
				description : json_item.description,
				tags        : json_item.tags
			}
	  })
	
		this.fireEvent('dataReady', this)		
		return this.db
	},
	
	_to_cell: function(){
		return new ImageCell(this.img_url, { 
			'title' 		: this.title, 
			'created_on': this.created_on,
			'source' 		: this.source
		})
	}
})

var Twitter = new Class({
	Extends: Model,
	
	site_name  : "twitter",
	nombre     : "SAYING",
	json_url   : "http://search.twitter.com/search.json",
	web_source : "http://www.twitter.com/" + current_user('twitter'),
	json_opts  : { data: { q : "from:" + current_user('twitter') } },
 	initial_limit : 15,	
  
  initialize: function(){
		return this.parent()
  },

	process_data: function(json){
		this.db = json.results.map(function(json_item){
			return {
				title       : json_item.text,
				created_on  : Date.parse(json_item.created_at),
				source      : "http://www.twitter.com/" + json_item.from_user + "/status/" + json_item.id,
				html        : json_item.text.make_urls_links().link_replies().link_hashcodes()
			}
	  })
	
		this.fireEvent('dataReady', this)		
		return this.db
	},					
	
	_to_cell: function(){
		return new Cell(this.html, { 
			'main_class'	 : (this.title.length > 90) ? 'double-wide' : 'single-wide',
			'custom_class' : 'text tweet ',
			'created_on'	 : this.created_on,
			'source'			 : this.source
		})
	}	
})

var LastFM = new Class({
	Extends: Model,
	
	site_name  : "lastfm",
	nombre     : "HEARING",
	json_url   : "http://lastfm-api-ext.appspot.com/2.0/",
	web_source : "http://www.last.fm/user/" + current_user('lastfm'),
	json_opts  : { data : { method  : 'user.getRecentTracks',
	 												user    : current_user('lastfm'),
													api_key : 'b25b959554ed76058ac220b7b2e0a026',
													limit   : 100,
													outtype : 'js' } },
 	initial_limit : 10,													
													
  initialize: function(){
		return this.parent()
  },

	process_data: function(json){
		this.db = json.recenttracks.map(function(json_item){
			return {
				track       : json_item.name,
				track_url   : json_item.url,
				artist      : json_item.artist.name,
				html        : "<span class='artist'>" + json_item.artist.name + "</span> <a class='track' href='" + json_item.url + "'>" + json_item.name + "</span>",
				created_on  : Date.parse(json_item.date.text).decrement('hour',8)
			}
	  })

		this.fireEvent('dataReady', this)		
		return this.db
	},					

	_to_cell: function(){
		return new Cell(this.html, { 
			'custom_class' : 'text lastfm-song',
			'created_on'	 : this.created_on
		})
	},
	
	to_cells: function(limit){	
		var tmp = []
		var limit = limit || 100
		
		for (var i=0; i < this.db.length; i++){
			if (i > 0 && this.db[i-1].artist === this.db[i].artist ){
				if (prev_cell) {
					prev_cell.html += "<span class='track'>, " + this.db[i].track + "</span>"
					prev_cell.options.main_class = 'double-wide'
					prev_cell.update_element()
				}
			} else {
				var prev_cell = this._to_cell.apply(this.db[i])
				tmp.push(prev_cell)
			}
		}
		
		// return [this.title_elem].combine(tmp.map(function(t){ return t.to_html() })).first(limit||100)
		this.cells = [this.title_elem].combine(tmp.map(function(cell){ 
			cell.element.hasClass('double-wide') ? limit -= 2 : --limit
			if (limit > 0) return cell.to_html()
		}.bind(this)).flatten())
		
		return this.cells
	}

})

var Delicious = new Class({
	Extends: Model,
	
	site_name  : "delicious",
	jsonp_opts : {data: { count: 20 }},
	initial_limit : 10,														
  
  initialize: function(tag){
		this.tag = tag
		this.nombre = tag.toUpperCase()
		this.json_url = "http://feeds.delicious.com/v2/json/" + this.current_user() + "/" + this.tag
		this.web_source = "http://www.delicious.com/" + this.current_user() + "/" + this.tag
		return this.parent()
  },

	process_data: function(json){
		this.db = json.map(function(json_item){
			return {
				href        : json_item.u,
				created_on  : Date.parse(json_item.dt),
				text        : json_item.d,
				html        : new Element('a', {html:json_item.d, href:json_item.u})
			}
	  })
	
		this.fireEvent('dataReady', this)		
		return this.db
	},					
	
	_to_cell: function(){
		if (this.href.test(/png|gif|jpg|jpeg|bmp|svg/i)) { // todo put in brawndo
		  return new ImageCell(this.href, {
		    'title'        : this.text,
				'created_on'	 : this.created_on,
				'source'			 : this.href
			})
		} else {
		 	return new Cell(this.html, {
				'main_class'	 : (this.text.length > 90) ? 'double-wide' : 'single-wide',
				'custom_class' : 'delicious',
				'created_on'	 : this.created_on,
				'source'			 : this.href
			}) 
		}
	}	
})

// both methods in here should be renamed to represent their sort order
var Grid = new Class({
	initialize: function(elem, buckets){
		this.element = $(elem)
		this.buckets = buckets
	},
	
	to_html: function(){
		this.buckets.each(function(b,i){
			b.each(function(m){
				m.bucket = i
				m.addEvent('dataReady', this.handle_model.bind(this))
				 .get_data()
			}, this)
		}, this)
	},
	
	handle_model: function(model){		
		var finished_models = this.buckets[model.bucket].filter(function(m){ return m.cells })
		var injected = false
		
		if (finished_models.length > 0){			
			finished_models.each(function(fm){
				if (fm.sort_by('created_on').first().created_on < model.sort_by('created_on').first().created_on && fm.bucket <= model.bucket){
					if (!model.cells) model.to_cells(model.initial_limit).each(function(cell){ cell.inject(fm.cells.first(),'before') })
					injected = true
				}
			})
		}
		
		if (!injected) this.element.adopt( model.to_cells(model.initial_limit))
	}
})

function current_user(site){
	return _3n.global_user || _3n[site + '_user']
}

function get_user_names(){
	[['global_user',null],['twitter_user','3n'],['flickr_id','52179512@N00'],['flickr_user','3n'],['delicious_user','3n'],['lastfm_user','3n']].each(function(u){
		var passed_in = params()[u[0]]
		_3n[u[0]] = ((_3n.global_user && !passed_in) || passed_in === '') ? '' : (passed_in || u[1])
	})
}

function goog(){    
  var gaJsHost = (("https:" == document.location.protocol) ? "https://ssl." : "http://www.");
  new Element('script', {'src':gaJsHost + 'google-analytics.com/ga.js', 'type':'text/javascript'}).inject(document.body, 'bottom')
  try {
    var pageTracker = _gat._getTracker("UA-6319958-1");
    pageTracker._trackPageview();
  } catch(err) {}    
}

function they_spinnin(){
	$('main').addEvent('click', function(e){ 
		if (e.target.id !== 'main') return;
		this.rotate(this.get_transform_int() + 180,{
			duration   : 3000,
			transition : 'ease-in-out'
		}); 
	}) 
	$('title').addEvent('click', function(){ 
		this.rotate(1440,{
			duration   : 2000,
			onComplete : this.rotate.bind(this, [0.01,{duration:0.01}]),
			transition : 'cubic-bezier(0.3,0.1,0.1,1)'
		}) 
	})
	window.addEvent('keyup', function(e){
		if (e.key == 'g'){
			var sex = new Element('div', {'styles':{'float':'left','border':'10px solid red'}}).adopt(
				new Element('iframe', {'src':'http://www.google.com', 'width':'500px', 'height':'500px'})
			).inject(document.body,'top')	
			sex.addEvent('click', sex.rotate.bind(sex, [360,{
				duration   : 2000, 
				onComplete : sex.rotate.bind(sex,[0.01,{duration:0.01}])
			}]))
		}else
		if (e.key == 'b'){
			$$('body').rotate(1440,{
				duration   : 2000, 
				onComplete : $$('body').rotate.bind($$('body'), [0.01,{duration:0.01}]),
				transition : 'cubic-bezier(0.3,0.1,0,1)'
			}) 
		}
	})
}

window.addEvent('domready', function(){

  document.body.set('html', '<div id="wrapper"><h1 id="title">3N</h1><div id="main"></div></div>')	

	if (navigator.userAgent.match('iPhone')) document.body.addClass('iphone');
	
	_3n.delicious_tags = params()['delicious_tags'] || 'humor-awesome'
	
	new Grid('main', [
		[ new Flickr, 
		  new Twitter, 
		  new LastFM ],
		_3n.delicious_tags.split('-').map(function(tag){ return new Delicious(tag) })
	]).to_html()
	
	if ( Browser.Engine.webkit ) they_spinnin()
  if ( !document.location.href.match(/~ian/) ) goog()
	
}) 

