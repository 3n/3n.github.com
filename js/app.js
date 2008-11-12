var _3n = {}

var Cell = new Class({
	Extends: Options,
	options: {
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
	},
	
	create_element: function(){
		var tmp = new Element('div', {
			'class': 'single-block ' + this.options.custom_class,
			'title': this.options.title
		})
		if 			($type(this.html) === 'element') tmp.adopt(this.html)
		else if ($type(this.html) === 'string')  tmp.set('html', this.html)
		return tmp
	},
	
	add_events: function(){
		this.element.addEvent('click', function(){
			document.location = this.options.source
		}.bind(this))
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
		return data.map(function(tweet){
			return new Cell(tweet.text, { 
				'custom_class' : 'tweet',
				'created_on'	 : new Date( Date.parse(tweet.created_at) ),
				'source'			 : "http://www.twitter.com/" + tweet.user.screen_name + "/status/" + tweet.id
			})
		})
	}
})

window.addEvent('domready', function(){
	
	_3n.twitter_user = params()['twitter_user'] || '8846642'
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
			$('main').adopt( _3n.flickr_grid.to_html(5) )
		}
	}).request();
	
	new JsonP("http://twitter.com/statuses/user_timeline/" + _3n.twitter_user + ".json", {
		onComplete: function(r){
			_3n.twitter_grid = new TwitterGrid(r)
			$('main').adopt( _3n.twitter_grid.to_html(10) )
		}
	}).request();
	
})