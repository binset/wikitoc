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

};

var lhstoc=
{
    o: {},
    is_valid_wiki_page:function() 
    {
        var is_valid = false;
        if ($("#toc").length === 0 ||  
            $("#left-navigation").length === 0 || 
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
		$("#lhstoc ul").css("display", ""); //show the ul in case it is already hidden
		$("#lhstoc #toctitle").remove();

        $("#lhstoc").addClass("sidebar");
        $("#lhstoc").addClass("left");
        $("#lhstoc").addClass("ui-resizable-w");
        $("#lhstoc").sidebar({side: "left"});

        $('#lhstoc').resizable({
          handles: "e",
          stop: function(e, ui){
              console.log("lhstoc resized");
            },
        });
	},

    init_lhstoc_button:function()
	{
		//#btn_toggle
		var btn_toggle = document.createElement('button');
		btn_toggle.setAttribute("id", "btn_toggle");
		var htmltext = document.createTextNode("Toggle Table of Contents");
		btn_toggle.appendChild(htmltext);
		$("#btn_toggle").css("font-size", "0.7em");
		$("#btn_toggle").css("bottom", "20px");
		$("#btn_toggle").css("position", "fixed");
		$("#btn_toggle").css("z-index", "10");
		$("#btn_toggle").on("click", this.lhstoc_toggle);

		$("#btn_toggle>span").css("-ms-transform", "scale(1.5)"); /* IE 9 */
		$("#btn_toggle>span").css("-webkit-transform", "scale(1.5)"); /* Chrome, Safari, Opera */
		$("#btn_toggle>span").css("transform", "scale(1.5)"); 

		//#btn_divv
		var btn_div = document.createElement('div');
		btn_div.setAttribute("id", "btn_div");
		btn_div.appendChild(btn_toggle);
		$("#btn_div").css("position", "relative");

		$("#mw-navigation")[0].appendChild(btn_div);
    },

	lhstoc_toggle:function(o) 
	{
		util.debug("lhstoc_toggle()");
		$("#lhstoc").trigger("sidebar:toggle");
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

    test_db:function()
	{
		this.o.events = {}; //stores hash of event handlers

		//{ "lhstoc_enabled", "lhstoc_on_lhs", "lhstoc_margin" }
		chrome.storage.sync.set({"lhstoc_enabled": 1, "hh": 2});
		chrome.storage.sync.get( null , function (items) {
			for (var key in items) {
				util.debug(key + ": " + items[key]);
			}
			//lhstoc.init_lhstoc();
			//lhstoc.init_html_buttons();
		});
	},

    init:function()
	{
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

			util.debug(lhstoc_on_lhs);
			if (lhstoc_enabled === true)
			{
				$( document ).ready(function() {
					lhstoc.init_lhstoc();
					lhstoc.init_lhstoc_button();
					if (lhstoc_on_lhs === true)
					{
						lhstoc.lhstoc_show();
					}
					else
					{
						lhstoc.lhstoc_hide();
					}
				});
			}
		});
	},
};
console.log("lhstoc.js");
