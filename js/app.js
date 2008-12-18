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
		
		if (!this.element.getElement('.new-icon'))
			this.element.adopt(new Element('div', {
				'class' : 'new-icon', 
				'title' : "I'm new, to you.",
				'html'  : "new"
			}))

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
			this.setStyle('display','block').thumbnail.delay(1, this, [140,140])
		}.bind(this.html))
		
		return this.parent()
	}
})


var Model = new Class({
	Implements: Events,
	initialize: function(){
		this.db = []		
		return this
	},
	
	get_data: function(){
		new JsonP(
			this.json_url, 
			$merge(	{abortAfter : 1000, retries : 1, onComplete : this.process_data.bind(this) }, this.json_opts) 
		).request()
		return this
	},
	
	process_data: function(){
		this.fireEvent('dataReady', this)
		_3n.grid_latest.set( this.site_name, this.db[0].created_on.toString())
	},
	
	sort_by: function(field){
		return this._sort_by.cache(this)(field)
	},
	_sort_by: function(field){
		return this.db.sort(function(a,b){
			a[field] - b[field]
		})
	},
	new_items: function(){
		return this.db.filter(function(x){
			return x.is_new
		})
	},
	
	to_cells: function(limit){
		var limit = limit || 100
		this.cells = [this.title_elem].combine(this.db.map(function(row){ 
			if (limit > 1) {
				var cell = this._to_cell.apply(row)
				cell.element.hasClass('double-wide') ? limit -= 2 : --limit
				return cell.to_html()
			}
		}.bind(this))).flatten()
		
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
				tags        : json_item.tags,
				is_new      : Date.parse(json_item.date_taken) > Date.parse(_3n.grid_latest.get(this.site_name))
			}
	  }.bind(this))

		this.parent()
		return this.db
	},
	
	_to_cell: function(){
		return new ImageCell(this.img_url, { 
			'title' 		   : this.title, 
			'created_on'   : this.created_on,
			'source' 		   : this.source,
			'custom_class' : (this.is_new ? 'new' : '')
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
				html        : json_item.text.make_urls_links().link_replies().link_hashcodes(),
				is_new      : Date.parse(json_item.created_at) > Date.parse(_3n.grid_latest.get(this.site_name))
			}
	  }.bind(this))
	
		this.parent()
		return this.db
	},					
	
	_to_cell: function(){
		return new Cell(this.html, { 
			'main_class'	 : (this.title.length > 90) ? 'double-wide' : 'single-wide',
			'custom_class' : 'text tweet ' + (this.is_new ? 'new' : ''),
			'created_on'	 : this.created_on,
			'source'			 : this.source
		})
	}	
})

var LastFM = new Class({
	Extends: Model,
	
	site_name  : "lastfm",
	nombre     : "HEARING",
	web_source : "http://www.last.fm/user/" + current_user('lastfm'),
	json_url   : "http://lastfm-api-ext.appspot.com/2.0/",
	json_opts  : { data : { method  : 'user.getRecentTracks',
	 												user    : current_user('lastfm'),
													api_key : 'b25b959554ed76058ac220b7b2e0a026',
													limit   : 100,
													outtype : 'js' } },
	// json_url   : "http://www.dapper.net/transform.php",
	// json_opts  : { data : { dappName    : '3NsRecentlyPlayedTracks',
	//  												transformer : 'JSON',
	// 												applyToUrl  : 'http://ws.audioscrobbler.com/2.0/user/3n/recenttracks.rss?limit=100',
	// 												extraArg_callbackFunctionWrapper : 'shitPoop' },
	// 							 globalFunction : 'shitPoop' },
	
 	initial_limit : 10,													
													
  initialize: function(){
		return this.parent()
  },

	process_data: function(json){
		// this.db = json.groups.RSS_Item.map(function(json_item){
		// 	return {
		// 		track       : json_item.Title[0].value.match(/\– (.+)/)[1],
		// 		track_url   : json_item.Title[0].href,
		// 		artist      : json_item.Title[0].value.match(/(.+)\s–/)[1],
		// 		html        : "<span class='artist'>" + json_item.Title[0].value.match(/(.+)\s–/)[1] + "</span> <a class='track' href='" + json_item.Title[0].href + "'>" + json_item.Title[0].value.match(/\– (.+)/)[1] + "</a>",
		// 		created_on  : Date.parse(json_item.Publication_Date[0].value).decrement('hour',8),
		// 		is_new      : Date.parse(json_item.Publication_Date[0].value).decrement('hour',8) > Date.parse(_3n.grid_latest.get(this.site_name))
		// 	}
		// 	  }.bind(this))
		this.db = json.recenttracks.map(function(json_item){
			return {
				track       : json_item.name,
				track_url   : json_item.url,
				artist      : json_item.artist.name,
				html        : "<span class='artist'>" + json_item.artist.name + "</span> <a class='track' href='" + json_item.url + "'>" + json_item.name + "</a>",
				created_on  : Date.parse(json_item.date.text).decrement('hour',8),
				is_new      : Date.parse(json_item.date.text).decrement('hour',8) > Date.parse(_3n.grid_latest.get(this.site_name))
			}
			  }.bind(this))

		this.parent()
		return this.db
	},					

	_to_cell: function(){
		return new Cell(this.html, { 
			'custom_class' : 'text lastfm-song ' + (this.is_new ? 'new' : ''),
			'created_on'	 : this.created_on
		})
	},
	
	to_cells: function(limit){	
		var tmp = []
		var limit = limit || 100
		
		for (var i=0; i < this.db.length; i++){
			if (i > 0 && this.db[i-1].artist === this.db[i].artist ){
				if (prev_cell) {
					prev_cell.html += ", <a class='track' href='" + this.db[i].track_url + "'>" + this.db[i].track + "</a>"
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
		if (json.length == 0) return
		this.db = json.map(function(json_item){
			return {
				href        : json_item.u,
				created_on  : Date.parse(json_item.dt),
				text        : json_item.d,
				html        : "<a href='" + json_item.u + "'>" + json_item.d + "</a>",
				is_new      : Date.parse(json_item.dt) > Date.parse(_3n.grid_latest.get(this.site_name + '-' + this.tag))
			}
	  }.bind(this))
	
		this.fireEvent('dataReady', this)
		_3n.grid_latest.set( this.site_name + '-' + this.tag, this.db[0].created_on.toString())
		
		return this.db
	},					
	
	_to_cell: function(){
		if (this.href.test(/png|gif|jpg|jpeg|bmp|svg/i)) { // todo put in brawndo
		  return new ImageCell(this.href, {
		    'title'        : this.text,
				'created_on'	 : this.created_on,
				'source'			 : this.href,
				'custom_class' : (this.is_new ? 'new' : '')
			})
		} else {
		 	return new Cell(this.html, {
				'main_class'	 : (this.text.length > 90) ? 'double-wide' : 'single-wide',
				'created_on'	 : this.created_on,
				'source'			 : this.href,
				'custom_class' : (this.is_new ? 'new' : '')				
			}) 
		}
	}	
})

// both methods in here should be renamed to represent their sort order
var Grid = new Class({
	Implements : Events,
	initialize: function(elem, buckets){
		this.element = $(elem)
		this.buckets = buckets
		
		this.nav = new FixedNav(new Element('ul', {'id':'grid-nav'}).inject(this.element, 'before'), this.element)
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
		if (model.db.length === 0) return
		var finished_models = this.buckets.flatten().filter(function(m){ return m.cells })
		var injected = false
						
		model.nav = model.nav || new Element('li', {
			'class' : model.site_name + (model.new_items().length > 0 ? ' opaque' : ''),
			'html'  : model.nombre + ' ' + (model.new_items().length || '')
		}).addEvent('click', function(){ this.removeClass('opaque') })
		
		model.title_elem = model.title_elem || new Element('div', {
			'class' : 'cell single-wide grid-title ' + model.site_name, 
			'html'  : model.nombre
		}).act_like_link(model.web_source)
			.adopt( new Element('span', {'class':'show-all','html':'SHOW ' + model.db.length}).addEvent('click', this.model_toggle_all.bind(model)) )
			
		model.db.first(10).each(function(row,i){
			var text = $pick(row.title, row.text, row.html, '')
			var the_match = text.match(/\b([A-Z]\w+)(\s[A-Z]\w+){0,5}/)
			if (the_match && !['the'].contains(the_match[0].toLowerCase())) 
				$('fun-zone').adopt( 
					new Element('span', {'class':'word','html':the_match[0]})
						.addEvent('click', function(){ model.cells[i+1].scroll_to(10,true) })
				)
		})

		if (finished_models.length > 0){
			finished_models.each(function(fm){
				if (model.bucket < fm.bucket || (fm.sort_by('created_on').first().created_on < model.sort_by('created_on').first().created_on && fm.bucket >= model.bucket)){
					if (!model.cells){						
						model.to_cells(model.initial_limit).each(function(cell){ cell.inject(fm.title_elem,'before') }, this)
						this.nav.add_pair( [model.nav.inject(fm.nav, 'before'), model.title_elem] )
					}						
					injected = true
				}
			}, this)
		}
		
		if (!injected) {
			this.element.adopt( model.to_cells(model.initial_limit))
			this.nav.add_pair( [model.nav.inject(this.nav.element, 'bottom'), model.title_elem] )
		}
		
		if (finished_models.length == this.buckets.flatten().length - 1){
			this.fireEvent('shitsDoneScro')
			this.nav.handle_hash_scroll()
		}			
	},
	
	model_toggle_all: function(e){
		e.stop()
		this.cells.filter(function(c){ return !c.hasClass('grid-title') }.bind(this)).each(function(cell){ cell.destroy() })
		this.title_elem.getFirst('span').set('html', this.cells.length > this.initial_limit ? 'SHOW ' + this.db.length : 'SHOW ' + this.initial_limit)
		this.to_cells(this.cells.length > this.initial_limit ? this.initial_limit : null).reverse().each(function(cell){ cell.inject(this.title_elem,'after') }, this)
	}
})

var FixedNav = new Class({
	initialize: function(elem, bff, pairs){
		this.element = elem
		this.bff     = bff
		this.pairs   = pairs || []
		
		this.set_styles()
		this.pairs.each(this.add_pair.bind(this))
		
		this.element.addEvent('click', function(e){
			e.stopPropagation()
			document.location.hash = '#'
		}.bind(this))
	
		window.addEvent('resize', this.set_styles.bind(this))
		this.set_styles.delay(1000, this)
	}, 
	
	set_styles: function(){
		this.element.setStyles({
			'position' : 'fixed',
			'top'      : this.bff.getTop(),
			'left'     : this.bff.getLeft() + this.bff.getWidth()
		})
	},
	
	add_pair: function(pair){
		var nav_elem = pair[0]
		var bff_elem = pair[1]
		
		this.pairs.include(pair)
		
		nav_elem.addEvent('click', function(e){
			e.stopPropagation()
			hash_clear_off()
			bff_elem.scroll_to(79, null, hash_clear_on.create({delay:10}))
			document.location.hash = nav_elem.get('html').match(/^(\w)+/)[0].clean().toLowerCase()
		})
	},
	
	handle_hash_scroll: function(){
		this.pairs.each(function(pair){
			if (pair[0].get('html').match(/^(\w)+/)[0].clean().toLowerCase() === document.location.hash.slice(1))
				pair[1].scroll_to(79, null, hash_clear_on.create({delay:10}))
		})
	}
})

function current_user(site){
	return _3n[site + '_user'] || _3n.global_user
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

function hash_clear_on(){
	_3n.hash_clear = _3n.hash_clear || function(){ if (document.location.hash !== "#/") document.location.hash = "/" }
	window.addEvent('scroll', _3n.hash_clear)
}
function hash_clear_off(){
	_3n.hash_clear = _3n.hash_clear || function(){ if (document.location.hash !== "#/") document.location.hash = "/" }
	window.removeEvent('scroll', _3n.hash_clear)
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

  $(document.body)
		.set('html', '<div id="wrapper"><h1 id="title">3N</h1><div id="fun-zone"></div><div id="main"></div><div id="footer"><p>This is the personal site of <span class="highlighted">Ian Collins</span> a.k.a. <span class="highlighted">3n</span>. What you see above is a summary of my online acivity and roughly, my life. Upon your first visit this site will remember what you have seen and on subsequent visits, it will mark anything that is new for you. You can create your own version of this site by adding query params to the url like <span class="code">lastfm_user=username</span> or <span class="code">delicious_tags=tag1-tag2</span> example <a href="http://www.iancollins.me/?global_user=takeo&flickr_id=93851177@N00&delicious_user=tobys&lastfm_user=tobysterrett">takeo</a></p><p>This site is made exclusively with Javscript through the wonders of JSONP. I made this using <a href="http://www.mootools.net">Mootools</a> & <a href="http://www.clientcide.com">Clientcide</a> on an <a href="http://www.apple.com">Apple</a>. Special thanks to: <a href="http://www.flickr.com">Flickr</a>, <a href="http://www.delicious.com">del.icio.us</a>, <a href="http://www.twitter.com">Twitter</a> and <a href="http://www.last.fm">LastFM</a>. </p><p>Oh I also like <a href="http://www.achewood.com">Achewood</a> and <a href="http://www.butterflyonline.com/">Butterfly</a>.</p></div></div>')
		.addClass('loading')
		
	if (_3n.global_user) {
		new Element('p', {'class':'shits_custom', html:"This site has been customized for " + _3n.global_user + "."}).inject($('footer'),'before')
		$('footer').addClass('custom')
	} 
		
	$('fun-zone').set('html', '<span class="title">in</span><span class="title">summary</span>')	

	if (navigator.userAgent.match('iPhone')) document.body.addClass('iphone');
	
	_3n.delicious_tags = params()['delicious_tags'] || 'humor-awesome'
	
	if (!$defined(Cookie.read('grid_latest_'+_3n.global_user))) $(document.body).addClass('all-new')
	_3n.grid_latest = new Hash.Cookie('grid_latest_'+_3n.global_user, {duration:100, path: '/'})
	
	new Grid('main', [
		[ new Flickr, 
		  new Twitter ],
		[ new LastFM  ],
		_3n.delicious_tags.split('-').map(function(tag){ return new Delicious(tag) })
	]).addEvent('shitsDoneScro', function(){ $(document.body).removeClass('loading') })
		.to_html()
	
	if ( Browser.Engine.webkit ) they_spinnin()
  if ( !document.location.href.match(/~ian/) ) goog()
	
}) 

