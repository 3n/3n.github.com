var Cell = new Class({
	Extends: Options,
	options: {
		custom_class	: '',
		title 				: '',
		created_on		: new Date(1985,5,31)	
	},
	initialize: function(html, options){
		this.setOptions(options)
		this.html = html
	},
	
	to_html: function(){
		var tmp = new Element('div', {
			'class': 'single-block ' + this.options.custom_class,
			'title': this.options.title
		})
		if 			($type(this.html) === 'element') tmp.adopt(this.html)
		else if ($type(this.html) === 'string')  tmp.set('html', this.html)
		return tmp
	}
})

var ImageCell = new Class({
	Extends: Cell,
	initialize: function(src, options){
		
		var elem = new Element('img', {
			'src' 	: src,
			'styles': { 'display':'none'	}
		})

		elem.on_has_width(function(){ 
			this.setStyle('display','block').thumbnail(140,140)
		}.bind(elem))
		
		return this.parent(elem, options)
	}
})


var FeedGrid = new Class({
	initialize: function(data){
		this.cells = this.create_cells(data)
		return this
	},
	
	to_html: function(){
		return this.cells.map(function(c){
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
				'created_on': new Date( Date.parse(flickr_item.published) ) })
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
			return new Cell(tweet.text, { custom_class: 'tweet' })
		})
	}
})

window.addEvent('domready', function(){

	new JsonP("http://api.flickr.com/services/feeds/photos_public.gne", {
		global_function : 'jsonFlickrFeed',
		data: {
			id 	 	 : "52179512@N00",
			lang 	 : "en-us",
			format : 'json'
		},
		onComplete: function(r){
			$('main').adopt( new FlickrGrid(r).to_html() )
		}
	}).request();
	
	new JsonP("http://twitter.com/statuses/user_timeline/8846642.json", {
		onComplete: function(r){
			$('main').adopt( new TwitterGrid(r).to_html() )
		}
	}).request();
	
})