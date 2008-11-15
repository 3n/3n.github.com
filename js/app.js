var _3n = {}

var Cell = new Class({
	Extends: Options,
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
		
		this.element = this.create_element()
		
		this.add_events()
		
		return this
	},
	
	create_element: function(){
		var tmp = new Element('div', {
			'class': 'cell ' + this.options.main_class + ' ' + this.options.custom_class
		})
		if 			($type(this.html) === 'element') tmp.adopt(this.html)
		else if ($type(this.html) === 'string')  tmp.set('html', this.html)
		return tmp
	},
	
	add_events: function(){
		this.element.act_like_link(this.options.source)

		new JustTheTip(this.element, {
			tip_html   : "<a class='title' href='" + this.options.source + "'>" + this.options.title + "</a><span class='date'>" + this.options.created_on.timeAgoInWords() + "</span>",
			showDelay  : 400,
			x_location : 'left',
			y_location : 'bottom',
			fade_in_duration  : 100,
			fade_out_duration : 200
		})
	},
	
	to_html: function(){
		return this.element
	}
})

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
				'created_on': Date.parse(flickr_item.published),
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
				'custom_class' : 'tweet',
				'created_on'	 : Date.parse(tweet.created_at),
				'source'			 : "http://www.twitter.com/" + tweet.from_user + "/status/" + tweet.id
			})
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
			data.map(function(bookmark){
				return new Element('a', {
					'html':bookmark.d,
					'class':'delicious-bookmark'
				}).set('href', bookmark.u)
			})
		])		
		return tmp
	},
	
	to_html: function(){
		return this.element
	}
})

function get_user_names(){
	[['twitter_user','3n'], ['flickr_user','52179512@N00'	], ['delicious_user','3n']].each(function(u){
		_3n[u[0]] = params()[u[0]] || u[1]
	})
}

window.addEvent('domready', function(){
	
	get_user_names()

	new JsonP("http://api.flickr.com/services/feeds/photos_public.gne", {
		global_function : 'jsonFlickrFeed',
		data: {
			id 	 	 : _3n.flickr_user,
			lang 	 : "en-us",
			format : 'json'
		},
		onComplete: function(r){
			_3n.flickr_grid = new FlickrGrid(r)
			$('main').adopt( _3n.flickr_grid.to_html() )
		}
	}).request();
	
	new JsonP("http://search.twitter.com/search.json", {
		data: {
			q : "from:" + _3n.twitter_user
		},
		onComplete: function(r){
			_3n.twitter_grid = new TwitterGrid(r)
			$('main').adopt( _3n.twitter_grid.to_html() )
		}
	}).request();
	
	new JsonP("http://feeds.delicious.com/v2/json/" + _3n.delicious_user + "/awesome", {
		data: { count : 100	},
		onComplete: function(r){
			_3n.delicious_cell = new DeliciousCell(r)
			$('main').adopt( _3n.delicious_cell.to_html() )
		}
	}).request()
	
}) 

