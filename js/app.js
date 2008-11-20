var _3n = {}

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
		var tmp = new Element('div', {
			'class': 'cell ' + this.options.main_class + ' ' + this.options.custom_class + ' ' + (coin_toss(0.1) ? 'inverted' : '')
		})
		if 			($type(this.html) === 'element') tmp.adopt(this.html)
		else if ($type(this.html) === 'string')  tmp.set('html', this.html)
		
		tmp.store('source',  this.options.source)
		tmp.store('title',   this.options.title)
		tmp.store('created', this.options.created_on.timeAgoInWords())
		
		return tmp
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
		this.element.act_like_link(this.options.source)
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


var FeedGrid = new Class({
	initialize: function(data){
		this.cells = this.create_cells(data)
		return this
	},
	
	to_html: function(limit){
		return this.cells.first(limit||100).map(function(c){
			return c.to_html()
		})
	}
})


var FlickrGrid = new Class({
	Extends: FeedGrid,
	initialize: function(data){
		return this.parent(data)
	},
	
	create_cells: function(data){
		return data.items.map(function(flickr_item){
			return new ImageCell(flickr_item.media.m, { 
				'title' 		: flickr_item.title, 
				'created_on': Date.parse(flickr_item.date_taken),
				'source' 		: flickr_item.link
			})
	  })
	}
})

var TwitterGrid = new Class({
	Extends: FeedGrid,
	initialize: function(data){
		return this.parent(data)
	},
	
	create_cells: function(data){
		return data.results.map(function(tweet,i){
			var tweet_html = tweet.text.make_urls_links().link_replies().link_hashcodes()
			return new Cell(tweet_html, { 
				'main_class'	 : (i==0 || tweet.text.length > 100) ? 'double-wide' : 'single-wide',
				'custom_class' : 'text tweet ' + (i==0 ? 'first' : ''),
				'created_on'	 : Date.parse(tweet.created_at),
				'source'			 : "http://www.twitter.com/" + tweet.from_user + "/status/" + tweet.id
			})
		})
	}
})

var LastFMGrid = new Class({
  Extends: FeedGrid,
  initialize: function(data){
    return this.parent(data)
  },
  
  create_cells: function(data){
		var tmp = []
		
		for (var i=0; i<data.groups.lol.length; i+=3){
			var artist = data.groups.lol[i].all[0].value
			var track  = data.groups.lol[i+1].all[0].value
			var html   = "<span class='artist'>" + artist + "</span> <span class='track'>" + track + "</span>"

			if (artist.test(/It’s/)) continue;

			if (i > 2 && data.groups.lol[i-3].all[0].value === artist ){
				if (prev_cell) {
					prev_cell.html += "<span class='track'>, " + track + "</span>"
					prev_cell.options.main_class = 'double-wide'
					prev_cell.update_element()
				}
			} else {
				var prev_cell = new Cell(html, { 'custom_class' : 'text lastfm-song' })
				tmp.push(prev_cell)
			}
		}
		
		return tmp
  }
})

var DeliciousGrid = new Class({
	Extends: FeedGrid,
	initialize: function(data){
		return this.parent(data)
	},
	
	create_cells: function(data){
		return data.map(function(bookmark,i){
			var html = new Element('a', {html:bookmark.d, href:bookmark.u})
			
			if (bookmark.u.test(/png|gif|jpg|jpeg|bmp|svg/i)) { // todo put in brawndo
			  return new ImageCell(bookmark.u, {
			    'title'        : bookmark.d,
  				'created_on'	 : Date.parse(bookmark.dt),
  				'source'			 : bookmark.u
  			})
			} else {
			 	return new Cell(html, {
  				'main_class'	 : 'single-wide',
  				'custom_class' : 'delicious ' + (i==0 ? 'first' : ''),
  				'created_on'	 : Date.parse(bookmark.dt),
  				'source'			 : bookmark.u
  			}) 
			}
		})
	}
})

var DeliciousCell = new Class({
	initialize: function(data){		
		this.element = this.generate_element(data)
		return this
	},
	
	generate_element: function(data){
		var tmp = new Element('div', {'id':'delicious-block', 'class':'cell full-width'}).adopt([
			data.map(function(bookmark,i){
				return new Element('a', {
					'html':bookmark.d,
					'class':'delicious-bookmark ' + (i.is_even() ? 'even' : 'odd')
				}).set('href', bookmark.u)
			})
		])		
		return tmp
	},
	
	to_html: function(){
		return this.element
	}
})

var DataSource = new Class({
	Implements: Options,
	options : {
		limit : 100
	},
	initialize: function(url, nombre, link_href, wrapper_class, jsonp_opts, options){
		this.setOptions(options)
		
		this.url           = url
		this.nombre        = nombre
		this.link_href     = link_href
		this.wrapper_class = wrapper_class
		this.jsonp_opts    = jsonp_opts || {}
		
		this.jsonp_opts.onComplete = this.jsonp_opts.onComplete || function(r){
			var title_elem = new Element('div', {
				'class' : 'cell single-wide grid-title', 
				'html'  : this.nombre
			}).act_like_link(this.link_href)
			this.wrapper_instance = new wrapper_class(r)
			$('main').adopt( title_elem, this.wrapper_instance.to_html(this.options.limit) )
		}.bind(this)
		
		this.get_data()
		
		return this
	},
	
	get_data: function(){
		new JsonP(this.url, this.jsonp_opts).request()
	}
})

var DeliciousCellSource = new Class({
	Extends: DataSource,
	initialize: function(tag){
		var url = "http://feeds.delicious.com/v2/json/" + _3n.delicious_user + "/" + tag
		var nombre = "delicious_" + tag
		var href   = "http://www.delicious.com/" + _3n.delicious_user + "/" + tag
		
		return this.parent(url, nombre, href, DeliciousCell, {data: { count: 20 }})
	}
})

var DeliciousGridSource = new Class({
	Extends: DataSource,
	initialize: function(tag){
		var url = "http://feeds.delicious.com/v2/json/" + _3n.delicious_user + "/" + tag
		var nombre = tag.toUpperCase()
    var href   = "http://www.delicious.com/" + _3n.delicious_user + "/" + tag
		
		return this.parent(url, nombre, href, DeliciousGrid, {data: { count: 20 }}, { limit : 9 })
	}
})

function get_user_names(){
	[['twitter_user','3n'], ['flickr_user','52179512@N00'	], ['flickr_name','3n'], ['delicious_user','3n']].each(function(u){
		_3n[u[0]] = params()[u[0]] || u[1]
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

window.addEvent('domready', function(){

  document.body.set('html', '<div id="wrapper"><h1 id="title">3N</h1><div id="main"></div></div>')

	// haha lol
	$('main').addEvent('click', function(){ 
		this.rotate(360,6000, this.rotate.bind(this, [0.01,0.01])); 
	}) 
	$('title').addEvent('click', function(){ 
		this.rotate(1800,2000, this.rotate.bind(this, [0.01,0.01])) 
	})
	window.addEvent('keyup', function(e){
		if (e.key == 'g'){
			var sex = new Element('div', {'styles':{'float':'left','border':'10px solid red'}}).adopt(
				new Element('iframe', {'src':'http://www.google.com', 'width':'500px', 'height':'500px'})
			).inject(document.body,'top')	
			sex.addEvent('click', sex.rotate.bind(sex, [1080,5000]))
		}else
		if (e.key == 'b'){
			$$('body').rotate(1800,2000, $$('body').rotate.bind($$('body'), [0.01,0.01])) 
		}
	})


	if (navigator.userAgent.match('iPhone'))
		document.body.addClass('iphone')
	
	get_user_names()
	
	new DataSource (
		"http://api.flickr.com/services/feeds/photos_public.gne", 
		"SEEING",
		"http://www.flickr.com/photos/" + _3n.flickr_name,
		FlickrGrid, 
		{ globalFunction : 'jsonFlickrFeed',
			data: {
				id 	 	 : _3n.flickr_user,
				lang 	 : "en-us",
				format : 'json'
			}
		},
		{ limit : 14 }
	)
	
	new DataSource (
		"http://search.twitter.com/search.json", 
		"SAYING",
		"http://www.twitter.com/" + _3n.twitter_user,
		TwitterGrid, 
		{ data: {
				q : "from:" + _3n.twitter_user
			}
		},
		{ limit : 19 }
	)
	
	new DeliciousGridSource('awesome')
	new DeliciousGridSource('humor')

  // todo make the timeout work in jsonp	
	// new DataSource (
	//   "http://www.dapper.net/transform.php?dappName=lastfmrecentlyplayed3n&transformer=JSON&extraArg_callbackFunctionWrapper=lastFMData&applyToUrl=http%3A%2F%2Fwww.last.fm%2Fuser%2F3N%2Ftracks",
	//   "HEARING",
	//   "http://www.last.fm/user/3N",
	//   LastFMGrid,
	//   { globalFunction : 'lastFMData', timeout : 1000 },
	//   { limit : 9 }
	// )
	
  if ( !document.location.href.match(/~ian/) ) goog()
	
}) 

