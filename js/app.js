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
			'class': 'cell ' + this.options.main_class + ' ' + this.options.custom_class,
			'title': this.options.title
		})
		if 			($type(this.html) === 'element') tmp.adopt(this.html)
		else if ($type(this.html) === 'string')  tmp.set('html', this.html)
		return tmp
	},
	
	add_events: function(){
		this.element.act_like_link(this.options.source)
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
				'created_on': new Date( Date.parse(flickr_item.published) ),
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
			return new Cell(tweet.text, { 
				'main_class'	 : (i==0 || tweet.text.length > 100) ? 'double-wide' : 'single-wide',
				'custom_class' : 'tweet',
				'created_on'	 : new Date( Date.parse(tweet.created_at) ),
				'source'			 : "http://www.twitter.com/" + tweet.from_user + "/status/" + tweet.id
			})
		})
	}
})

window.addEvent('domready', function(){
	
	_3n.twitter_user = params()['twitter_user'] || '3n'
	_3n.flickr_user  = params()['flickr_user']  || '52179512@N00'	

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
	
})