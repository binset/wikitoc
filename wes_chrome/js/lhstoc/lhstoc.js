//'use strict';
console.log("lhstoc.js");
var production = false;

var util = 
{
	debug:function(message)
	{
        if (production !== true )
        {
			console.log(arguments.callee.caller.name + "():\t" + message);
			//console.log("debug:" + message);
		}
	},

	inject_css:function(filename)
	{
		var style = document.createElement('link');
		style.rel = 'stylesheet';
		style.type = 'text/css';
		//style.href = chrome.extension.getURL(filename);
		style.href = filename;
		(document.head||document.documentElement).appendChild(style);
	},

    pixels_to_int:function(a)
    {
        var pixels = parseInt(a);
        
        if ( pixels >= 0)
        {
            return pixels;
        } else 
        {
            util.debug("Invalid pixel value here: " + a);
            return null;
        }
    },
    
    pixels_addition:function(a, b)
    {
        var pixels_a = util.pixels_to_int(a);
        var pixels_b = util.pixels_to_int(b);
        
        return pixels_a + pixels_b;
    },
    
    pixels_subtraction:function(a, b)
    {
        var pixels_a = util.pixels_to_int(a);
        var pixels_b = util.pixels_to_int(b);
        
        return pixels_a - pixels_b;
    },

    wwhs:function()
    {
        /** returns:
                clientWidth
                clientHeight
                scrollLeft
                scrollTop
        */
        if (window.innerHeight) 
            return [window.innerWidth-10,window.innerHeight-10,window.pageXOffset,window.pageYOffset];
        else if (document.documentElement.clientHeight) 
            return [document.documentElement.clientWidth-10,document.documentElement.clientHeight-10,document.documentElement.scrollLeft,document.documentElement.scrollTop];
            
            return [document.body.clientWidth,document.body.clientHeight,document.body.scrollLeft,document.body.scrollTop];
    },

    pos:function(obj)
    {
        var rtn=[0,0];
        while(obj)
        {
            rtn[0]+=obj.offsetLeft;
            rtn[1]+=obj.offsetTop;
            obj=obj.offsetParent;
        }
        return rtn;
    },
};

var lhstoc=
{
    o: {},
    is_valid_wiki_page:function() 
    {
        var is_valid = false;
        if ( $("#left-navigation").length === 0 || 
            $("#content").length === 0 || 
            $("#toctitle").length === 0 ||
            $("#footer").length === 0)
        {
            is_valid = false; //doesnt look like a valid wikimedia page
        }
        else 
        {
            is_valid = true; //looks like a valid wikimedia page
        }

        return is_valid;
    },

    init_lhstoc:function()
    {
        var cloned_toc = $("#toc").clone().attr('id', 'lhstoc');
        cloned_toc.addClass("toc");
        cloned_toc.addClass("mw-body-content");
        cloned_toc.find('.toctoggle').remove();
        cloned_toc.insertAfter("#p-lang");
		$("#lhstoc #toctitle").remove();
		$("#lhstoc ul").css("display", ""); //restore #lhstoc just in case it's hidden

        //$("#lhstoc").addClass("ui-resizable");
        $("#lhstoc").addClass("ui-resizable-e");

        $('#toc').resizable({
			handles: "e",
        });
		var that = this;
        $('#lhstoc').resizable({
			handles: "e",
          stop: function(e, ui){
              var lhstoc_width = parseInt($("#lhstoc").css("width"));
              console.log("lhstoc resized to: " + lhstoc_width);
			  chrome.storage.sync.set({"lhstoc_margin": lhstoc_width});
			  that.event_update_content_margin();
            },
        });

        $("#lhstoc").addClass("sidebar");
        $("#lhstoc").addClass("left");
        $("#lhstoc").sidebar({side: "left"}); 

		//var toc_height = window.innerHeight.toString() + "px";
        //$("#lhstoc").css("height",  toc_height);

	},

    init_lhstoc_button:function()
	{
		//#btn_toggle
		var btn_toggle = document.createElement('button');
		btn_toggle.setAttribute("id", "btn_toggle");
		var htmltext = document.createTextNode("Toggle Table of Contents");
		btn_toggle.appendChild(htmltext);

		//#btn_div
		var btn_div = document.createElement('div');
		btn_div.setAttribute("id", "btn_div");
		btn_div.appendChild(btn_toggle);
		$("#mw-navigation")[0].appendChild(btn_div);

		$("#btn_toggle>span").css("-ms-transform", "scale(1.5)"); /* IE 9 */
		$("#btn_toggle>span").css("-webkit-transform", "scale(1.5)"); /* Chrome, Safari, Opera */
		$("#btn_toggle>span").css("transform", "scale(1.5)"); 

		$("#btn_toggle").on("click", this.lhstoc_toggle);
    },

    init_lhstoc_margin:function(margin)
	{
		util.debug("margin:" + margin);
		$("#lhstoc").css("width", margin);
	},

    init_toc_chapter_listing:function()
    {
        var div_list=document.getElementsByClassName('mw-headline');
        var content_listing = [];
        var chapters_listing = [];
        var cloned_node;
        var i = 0;
        for (i=0; i<div_list.length; i++)
        {
            //util.debug(div_list[i].outerHTML);
            content_listing.push(div_list[i]);
        }
        
        for (i=0; i<content_listing.length; i++)
        {
            cloned_node = content_listing[i].cloneNode(true);
            //obj.appendChild(cloned_node);
            var anchor_class = content_listing[i].className;
            var active_class = "";
            
            chapters_listing[i]=[
                content_listing[i],
                cloned_node,
                anchor_class,
                anchor_class+' '+active_class,
                100 //scrollspeed
            ];
            
            //util.debug("adding: " + content_listing[i].outerHTML );
        }
        
        this.o.chapters_listing = chapters_listing;
        
		/*
        for (i=0; i<chapters_listing.length; i++)
        {
            util.debug("verifying: " + chapters_listing[i][1].outerHTML);
        }
		*/
    },

    init_events:function()
    {
        this.event_add(window,'scroll','event_page_scroll',this.o);
        this.event_page_scroll();
	},

	lhstoc_toggle:function(o) 
	{
		util.debug("lhstoc_toggle()");
		$("#lhstoc").trigger("sidebar:toggle");
		var that = this;
		chrome.storage.sync.get("lhstoc_on_lhs", function(item){
			if (item["lhstoc_on_lhs"] === true)
			{
				util.debug("lhstoc on lhs");
				lhstoc.lhstoc_hide();
			}
			else
			{
				util.debug("lhstoc NOT on lhs");
				lhstoc.lhstoc_show();
			}
		});
	},

	lhstoc_show:function()
	{
		chrome.storage.sync.set({"lhstoc_on_lhs": true});
		util.debug("lhstoc_show()");
		$("#lhstoc").trigger("sidebar:open");
	},

	lhstoc_hide:function()
	{
		chrome.storage.sync.set({"lhstoc_on_lhs": false});
		util.debug("lhstoc_hide()");
		$("#lhstoc").trigger("sidebar:close");
	},

    init:function()
	{
		var that = this;
		util.inject_css("https://code.jquery.com/ui/1.11.4/themes/smoothness/jquery-ui.css");

		this.o.events = {}; //stores hash of event handlers
		chrome.storage.sync.get( null , function (items) {
			for (var key in items)
			{
				util.debug("get " + key + ": " + items[key]);
			}	
			var lhstoc_enabled = true;
			var lhstoc_on_lhs =  true;
			var lhstoc_margin =  "270px";

			if ("lhstoc_enabled" in items)
				lhstoc_enabled = items["lhstoc_enabled"];
			if ("lhstoc_on_lhs" in items)
				lhstoc_on_lhs =  items["lhstoc_on_lhs"];
			if ("lhstoc_margin" in items)
				lhstoc_margin =  items["lhstoc_margin"];

			util.debug("margin" + lhstoc_margin);
			if (lhstoc_enabled === true)
			{
				$( document ).ready(function() {

					that.init_lhstoc();
					that.init_lhstoc_button();
					that.event_update_content_margin();
					if (that.is_valid_wiki_page() === true)
					{
						util.debug("is_valid_wiki_page()");
						that.init_lhstoc_margin(lhstoc_margin);
						that.init_toc_chapter_listing();
						that.init_events();
						if (lhstoc_on_lhs === true)
						{
							that.lhstoc_show();
						}
						else
						{
							that.lhstoc_hide();
						}
					}
				});
			}
		});
	},

    event_update_content_margin:function()
    {
        /** based on the width of lhstoc, update the position of the main CONTENTS margin to follow that of the lhstoc */
        
        util.debug("|||||||event_update_content_margin()");
		chrome.storage.sync.get(null, function(item){
			var lhstoc_width = item["lhstoc_margin"];
			lhstoc_width += 15; //magic css number

			util.debug("event_update_content_margin() margin is: " + lhstoc_width);
			$("#left-navigation").css('margin-left', lhstoc_width);
			$("#content").css('margin-left', lhstoc_width);
			$("#footer").css('margin-left', lhstoc_width);
			btn_toggle_width = parseInt($("#btn_toggle").css("width"));
			$("#btn_div").css("left", lhstoc_width-btn_toggle_width-10);
			//$("#btn_div").css("position", "relative");

			//chrome.storage.sync.set({"lhstoc_margin": lhstoc_width});
		});
    },

    event_page_scroll:function()
    {
        /** event that gets called when user scrolls.
            Hightlights current chapter in the TOC
        */
        
        var nu = 0;
        var i = 0;
        for (nu=0,i=0; i < this.o.chapters_listing.length; i++){
            this.o.chapters_listing[i][1].className=this.o.chapters_listing[i][2];
            //(this.pos(this.o.chapters_listing[i][0])[1]-this.wwhs()[3]-this.wwhs()[1]/2)<0?nu=i:null;
            (util.pos(this.o.chapters_listing[i][0])[1]-util.wwhs()[3]-util.wwhs()[1]/100)<0?nu=i:null;
            
        }
        if (nu !== null) {
            //util.debug("hit paydirt: chapter is " + this.o.chapters_listing[nu][0].outerHTML);
            this.o.chapters_listing[nu][1].className=this.o.chapters_listing[nu][3];
            
            var current_section = this.o.chapters_listing[nu][0].getAttribute("id");
            this.update_toc(current_section);
        }
    },

    update_toc:function(current_section)
    {
        /**given the name of the current_section, update the toc (table of contents) to highlight this section, and also unhighlight any other highlighted sections
        */
        var anchor_links = $("#lhstoc a")
		for (var index=0; index < anchor_links.length; index++ )
		{
			var section_tmp = anchor_links[index].getAttribute("href");
			section_tmp = section_tmp.substring(1); //strip away leading # from a href
			if (section_tmp === current_section)
			{
				//Found the right section, now <highlight> the text of this section
				
				var new_element = document.createElement("SPAN");
				new_element.textContent = anchor_links[index].lastChild.textContent;
				new_element.setAttribute('style','background-color: #FFFF00');
				anchor_links[index].lastChild.textContent = "";
				anchor_links[index].lastChild.appendChild(new_element);

				//anchor_links[index].focus(); //try to hover/focus this element
				util.debug(section_tmp);
				jquery_selector = "#lhstoc a[href='#" + section_tmp + "']";
				$(jquery_selector).scrollintoview({ duration: 8 });
			} else 
			{
				//Not the  right section, remove any <underline> of this section
				
				var section_name = anchor_links[index].lastChild.lastChild.textContent;
				anchor_links[index].lastChild.removeChild(anchor_links[index].lastChild.lastChild);
				anchor_links[index].lastChild.textContent = section_name;
			}
		}
	},

    event_add:function(event_object, event_name, function_name,p)
    {
        /*
            Docs for EventTarget.addEventListener:
            target.addEventListener(type, listener[, useCapture]);
            target.addEventListener(type, listener[, useCapture, wantsUntrusted Non-standard]); // Gecko/Mozilla only
        */
        var oop=this;
        var event_handler;
        if (event_object.addEventListener){
            this.o.events[event_object + event_name + function_name] = function(e){ return oop[function_name](p,e);};
            event_handler = this.o.events[event_object + event_name + function_name];

            event_object.addEventListener(event_name, event_handler, false);
            util.debug("EVENT: adding event listener:" + event_name + " function_name:" + function_name + " p:" + p);
        }
        else if (event_object.attachEvent){
            this.o.events[event_object + event_name + function_name] = function(e){ return oop[function_name](p,e); };
            event_handler = this.o.events[event_object + event_name + function_name];

            event_object.attachEvent('on'+event_name, event_handler);
            util.debug("EVENT: adding attach event :" + event_name + " function_name:" + function_name + " p:" + p);
        } else 
        {
            util.debug("EVENT: unable to add event :" + event_name + " function_name:" + function_name + " p:" + p);
        }
    },
};
console.log("lhstoc.js");
