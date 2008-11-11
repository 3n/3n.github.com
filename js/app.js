function jsonFlickrFeed(o){
	$('main').adopt(
		o.items.map(function(x){
			return new Element('img', {
				'src' 	: x.media.m,
				'title'	: x.title
			})
	  })
	)
}

window.addEvent('domready', function(){
	new Element('script', { src : "http://api.flickr.com/services/feeds/photos_public.gne?id=52179512@N00&lang=en-us&format=json" })
		.inject(document.body)
})