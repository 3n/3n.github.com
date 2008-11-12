function jsonFlickrFeed(r){
	$('main').adopt(
		r.items.map(function(x){
			var elem = new Element('img', {
				'src' 	: x.media.m,
				'title'	: x.title,
				'styles': { 'display':'none'	}
			}).inject($('main'))
			
			elem.on_has_width(function(){ 
				this.setStyle('display','block').thumbnail(140,140,'single-block')
			}.bind(elem))
	  })
	)
}

window.addEvent('domready', function(){
	
	// todo extend jsonp to allow for creating a window.foo function that just calls the generated callback
	new JsonP("http://api.flickr.com/services/feeds/photos_public.gne", {
		callBackKey : 'jsonFlickrFeed',
		data: {
			id 	 	 : "52179512@N00",
			lang 	 : "en-us",
			format : 'json'
		}
	}).request();
	
	new JsonP("http://twitter.com/statuses/user_timeline/8846642.json", {
		onComplete: function(r){
			$('main').adopt(
				r.map(function(tweet){
					return new Element('div', { html : tweet.text, 'class' : 'single-block' })
				})
			)
		}
	}).request();
	
})