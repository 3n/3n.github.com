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