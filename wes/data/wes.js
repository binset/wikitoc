// ==UserScript==
// @name        Wikipedia TOC Enhanced
// @author      teamrc
// @namespace   https://github.com/teamrc/wikitoc
// @homepage    http://teamrc.github.io/wikitoc/
// @license     GNU GPL version 3.0
// @description Table of Contents Enhancer for Wikipedia
// @require     http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js
// @require     http://ajax.googleapis.com/ajax/libs/jqueryui/1.8/jquery-ui.min.js
// @resource    jqUI_CSS  http://ajax.googleapis.com/ajax/libs/jqueryui/1.8/themes/base/jquery-ui.css
// @grant       GM_addStyle
// @grant       GM_getResourceText
// @grant       GM_getValue
// @grant       GM_setValue
// @version     1
// @compatible  Greasemonkey
// ==/UserScript==


/** Wiki TOC Enhancer - Users' Guide
    This is a Greasemonkey user script that enhances the TOC(Table of Content) on wikipedia.org.
    It moves the TOC to the left hand side panel, and highlights the current section that the reader is on.
    It also retains the ability for the user to jump to different sections on the TOC by clicking on the links.
*/


var db = 
{
    /** 
        DB is an API to store/retrieve wikitoc values using greasemonkey's GM_setValue/GM_getValue functions
        Saves variables serialised, into a single variable named wikitoc
        
        Saved values include:
        1) whether user has enabled wikitoc to run
        2) whether TOC should be on LHS (for this current site)
        3) the width of TOC when TOC is on the LHS (for this current site)
        
    */

    is_wes_enabled: null,
    is_wikitoc_on_lhs: null,
    wikitoc_margin_position: null,

    init:function()
    {
        //initialise content script port listener events
        util.debug("db: initialisation");
        self.port.on("is_wes_enabled", function(payload) {
            if (payload == true)
                db.set_wikitoc_on_lhs(true);
            else 
                db.set_wikitoc_on_lhs(false);
            util.debug("db: port.on setting is_wes_enabled:" + payload);
        });

        self.port.on("is_wikitoc_on_lhs", function(payload) {
            if (payload == true)
            {
                db.set_wikitoc_on_lhs(true);
                wiki_toc.toc_open();
            }
            else 
            {
                db.set_wikitoc_on_lhs(false);
                wiki_toc.toc_close();
            }

            //resize the main content section on RHS on fit the size of the TOC on LHS
            wiki_toc.event_update_content_margin();

            util.debug("db: port.on setting is_wikitoc_on_lhs:" + payload);
        });

        self.port.on("wikitoc_margin_position", function(payload) {
            db.set_wikitoc_margin_position(payload);
            util.debug("db: port.on setting wikitoc_margin_position:" + payload);
        });
    },

    get_wikitoc_status:function()
    {
        util.debug("getting is_wes_enabled:" + this.is_wes_enabled);
        return this.is_wes_enabled;
    },
    
    set_wikitoc_status:function(payload)
    {
        this.is_wes_enabled = payload;
        self.port.emit("is_wes_enabled", this.is_wes_enabled);
        util.debug("db: port.emit is_wes_enabled:" + this.is_wes_enabled);
    },
    
    get_wikitoc_on_lhs:function()
    {
        util.debug("db: getting is_wikitoc_on_lhs:" + this.is_wikitoc_on_lhs);
        return this.is_wikitoc_on_lhs;
    },
    
    set_wikitoc_on_lhs:function(payload)
    {
        this.is_wikitoc_on_lhs = payload;
        self.port.emit("is_wikitoc_on_lhs", this.is_wikitoc_on_lhs);
        util.debug("db: port.emit is_wikitoc_on_lhs:" + this.is_wikitoc_on_lhs);
    },

    get_wikitoc_margin_position:function()
    {
        util.debug("db: getting wikitoc_margin_position" + this.wikitoc_margin_position);
        return this.wikitoc_margin_position;
    },
    
    set_wikitoc_margin_position:function(payload)
    {
        //wikitoc_margin is the value of the margin of the TOC on LHS in pixels
        
        this.wikitoc_margin_position = payload;
        self.port.emit("wikitoc_margin_position", this.wikitoc_margin_position);
        util.debug("db: port.emit wikitoc_margin_position" + this.wikitoc_margin_position);
    },
};

var util = 
{
    debug:function(debug_string)
    {
        var debugging = true;
        if (debugging)
        {
            console.log("_________wes.js: " + debug_string);
        }
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

var wiki_toc=
{
    o: {},
    init:function()
    {
        // process TOC chapter listing
        // then save TOC CSS settings
        // then save frame CSS settings
        // then add buttons to TOC
        // then run toc_open()
        // then adds the page_scroll event
        
        this.o.events = {}; //stores hash of event handlers
        
        db.set_wikitoc_status(true);

        if (db.get_wikitoc_status() == true) 
        {
            if ($("#lhs_toc").length == 0)
            {
                //lhs_toc doesn't exist, we can recreate it

                var cloned_toc = $("#toc").clone().attr('id', 'lhs_toc');
                cloned_toc.find('#toctitle').attr('id', 'lhs_toctitle');
                cloned_toc.insertAfter("#p-lang");

                var that = this;
                $('#lhs_toc').resizable({
                  handles: "e",
                  stop: function(e, ui){
                      that.event_update_content_margin();
                    },
                });
                $("#lhs_toc").removeClass("toc");
                $("#lhs_toc").addClass("sidebar left");
                $("#lhs_toc").sidebar({speed: 1});
                $("#lhs_toc").css("width", db.get_wikitoc_margin_position());

                var btn_div = document.createElement('div');
                btn_div.setAttribute("id", "btn_div");

                var btn_toggle = document.createElement('button');
                btn_toggle.setAttribute("id", "btn_toggle");
                btn_toggle.innerHTML = "toggle";
                btn_div.appendChild(btn_toggle);
                $("#lhs_toc")[0].appendChild(btn_div);

                $("#btn_div").css("left", db.get_wikitoc_margin_position());
                $("#btn_div").css("position", "relative");
                $("#btn_toggle").css("bottom", "20px");
                $("#btn_toggle").css("position", "fixed");

                $("#btn_toggle").on("click", function () {
                    wiki_toc.toc_toggle();
                });
            }

            util.debug("Initialising wiki_toc()...1");
            this.init_save_positions();
            util.debug("Initialising wiki_toc()...2");
            this.init_toc_chapter_listing();
            util.debug("Initialising wiki_toc()...3");

            if (db.get_wikitoc_on_lhs() == null)
            {
                //initialise wikitoc on lhs for new sites to be LHS
                db.set_wikitoc_on_lhs(true);
            }
            util.debug("Initialising wiki_toc()...4");

            if (db.get_wikitoc_on_lhs() == true)
            {
                var that = this;
                setTimeout( function() {
                        that.toc_open();
                }, 20);
            }
            util.debug("Initialising wiki_toc()...5");
            this.init_html_buttons();
            util.debug("Initialising wiki_toc()...6");
            this.init_events();
            util.debug("Initialising wiki_toc() is done!");
            util.debug("");

        } else {
            util.debug("wiki_toc() is not running");
        }
        
    },
    
    init_events:function()
    {
        this.event_add(window,'scroll','event_page_scroll',this.o);
        this.event_page_scroll();
        
        var toctoggle = document.getElementById("toctoggle");
        this.event_add(toctoggle,'click','toc_toggle',this.o);

        var toc_enable = document.getElementById("toc_enable");
        this.event_add(toc_enable,'click','toc_open',this.o);
        
        var toc_disable = document.getElementById("toc_disable");
        this.event_add(toc_disable,'click','toc_close',this.o);

        this.event_add(window,'resize','toc_open',this.o);
    },
    
    init_save_positions:function()
    {
        //save original toc settings
        this.o.toc_original = {};
        this.o.toc_original["height"] = $("#toc").css("height");
        this.o.toc_original["width"] = $("#toc").css("width");
        this.o.toc_original["overflow"] = $("#toc").css("overflow");
        this.o.toc_original["border"] = $("#toc").css("border");
        this.o.toc_original["position"] = $("#toc").css("position");
        this.o.toc_original["left"] = $("#toc").css("left");
        this.o.toc_original["top"] = $("#toc").css("top");
        
        //save LHS frame settings
        this.o.frame_left_navigation = $("#left-navigation").css('margin-left');
        this.o.frame_content = $("#content").css('margin-left');
        this.o.frame_footer = $("#footer").css('margin-left');
    },

    init_html_buttons:function()
    {
        /** add html control buttons to TOC
        */
        
        // find <div id="toctitle"
        // then create the buttons
        // then add the created buttons to the HTML page.
        
        
        var toctitle = document.getElementById('toctitle');
        
        //Main toc toggle button
        var toctoggle = document.createElement('a');
        toctoggle.setAttribute("id", "toctoggle");
        toctoggle.setAttribute("title", "Click here to toggle TOC between Left Hand or Right Hand panel");
        var toctoggle_img = document.createElement('img');
        toctoggle_img.setAttribute("width", "13");
        toctoggle_img.setAttribute("height", "13");
        toctoggle_img.setAttribute("srcset", "13");
        toctoggle_img.setAttribute("src", "http://openiconlibrary.sourceforge.net/gallery2/open_icon_library-full/icons/png/64x64/actions/draw-text-2.png");
        toctoggle_img.setAttribute("alt", "toggle_toc");
        toctoggle.appendChild(toctoggle_img);
        
        var toc_enable = document.createElement('a');
        toc_enable.setAttribute("id", "toc_enable");
        toc_enable.setAttribute("title", "Click here to activate the LHS TOC");
        toc_enable.appendChild(document.createTextNode("  | active toc")); 

        var toc_disable = document.createElement('a');
        toc_disable.setAttribute("id", "toc_disable");
        toc_disable.setAttribute("title", "Click here to unactivate the LHS TOC");
        toc_disable.appendChild(document.createTextNode("  | unactive toc")); 


        //Now add all the created elements into the HTML document
        toctitle.appendChild(toctoggle);
        toctitle.appendChild(toc_enable);
        toctitle.appendChild(toc_disable);
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
        
        for (i=0; i<chapters_listing.length; i++)
        {
            //util.debug("verifying: " + chapters_listing[i][1].outerHTML);
            var j = 0;
        }
    },
    
    toc_toggle:function()
    {
        util.debug("toc_toggle()");
        if (db.get_wikitoc_on_lhs() == true)
        {
            util.debug("going to move TOC to right");
            this.toc_close();
            
        } else 
        {
            util.debug("going to move TOC to left");
            this.toc_open();
        }
    },

    toc_open:function()
    {
        /**toggle TOC to LHS
        */
        util.debug("toc_open()");
        
        var toc_height = window.innerHeight.toString() + "px";
        var toc_width = db.get_wikitoc_margin_position(); 
        if (toc_width == null)
        {
            //toc_width = $("#toc").css('width');
            toc_width = $("#p-namespaces")[0].getBoundingClientRect().left ;
        }
        
     
        //$("#lhs_toc").css({"z-index": "9999", height: toc_height, width: toc_width, overflow: 'auto', border: '1px solid black', position: 'fixed', left:'2px', top: '0px' });
        var lhs_mwpanel_yposition = $("#mw-panel").position()['top'];
        var lhs_panel_yposition = $("#p-lang").position()['top'];
        var lhs_panel_height = $("#p-lang").height();
        var lhs_toc_position = util.pixels_addition(lhs_panel_height, lhs_panel_yposition);
        lhs_toc_position += "px";

        $("#lhs_toc").trigger("sidebar:open");
        $("#lhs_toc").css("overflow", "auto");
        $("#lhs_toc").css("overflow-x", "hidden");
        //$("#lhs_toc").css({"z-index": "1", height: toc_height, width: toc_width, overflow: 'auto', position: 'absolute', left:'0px', top: lhs_toc_position });
        //$("#lhs_toc").css("display", "block");
        //$("#lhs_toc").css("padding-left", "0px");
        //$("#lhs_toc").css("padding-right", "0px");

        //$("#lhs_toc").css("top", 0);
        //$("#lhs_toc").css("position", "fixed");


        db.set_wikitoc_on_lhs(true);
        
        //resize the main content section on RHS on fit the size of the TOC on LHS
        this.event_update_content_margin();
    },
    
    toc_close:function()
    {
        /* move TOC to LHS
        uses original toc values from o.toc_original dictionary.
        */
        util.debug("|||||||toc_close()");
        
        $("#lhs_toc").trigger("sidebar:close");
        
        $("#left-navigation").css('margin-left', this.o.frame_left_navigation);
        $("#content").css('margin-left', this.o.frame_content);
        $("#footer").css('margin-left', this.o.frame_footer);
        $("#btn_div").css("left", 0);
        $("#btn_div").css("position", "fixed");
        db.set_wikitoc_on_lhs(false);
    },
    
    
    event_update_content_margin:function()
    {
        /** based on the width of lhs_toc, update the position of the main CONTENTS margin to follow that of the lhs_toc */
        
        util.debug("|||||||event_update_content_margin()");
        if (db.get_wikitoc_on_lhs())
        {
            var lhs_toc_width = parseInt($("#lhs_toc").css('width'));
            $("#left-navigation").css('margin-left', lhs_toc_width + "px");
            $("#content").css('margin-left', lhs_toc_width + "px" );
            $("#footer").css('margin-left', lhs_toc_width + "px" );
            $("#btn_div").css("left", lhs_toc_width);
            $("#btn_div").css("position", "relative");
            db.set_wikitoc_margin_position(lhs_toc_width); 
        }
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
            (this.pos(this.o.chapters_listing[i][0])[1]-this.wwhs()[3]-this.wwhs()[1]/100)<0?nu=i:null;
            
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

        var toc_table_ul = document.getElementById("lhs_toc");
        if (toc_table_ul == null)
        {
            return;
        }
        
        //Given the <ul> of the TOC, find each <a href> and look for current_section
        var anchor_links = toc_table_ul.getElementsByTagName("a");
        for (var index in anchor_links) 
        {
            try 
            {
                var section_tmp = anchor_links[index].getAttribute("href");
                section_tmp = section_tmp.substring(1); //strip away leading # from a href
                if (section_tmp == current_section)
                {
                    //Found the right section, now <highlight> the text of this section
                    
                    var new_element = document.createElement("SPAN");
                    new_element.textContent = anchor_links[index].lastChild.textContent;
                    new_element.setAttribute('style','background-color: #FFFF00');
                    anchor_links[index].lastChild.textContent = "";
                    anchor_links[index].lastChild.appendChild(new_element);
                    
                } else 
                {
                    //Not the  right section, remove any <underline> of this section
                    
                    var section_name = anchor_links[index].lastChild.lastChild.textContent;
                    anchor_links[index].lastChild.removeChild(anchor_links[index].lastChild.lastChild);
                    anchor_links[index].lastChild.textContent = section_name;
                }
            } catch (err)
            {
                //util.debug("well, you can't quite handle " + anchor_links[index].innerHTML + " " + err);
            }
        }
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
    event_remove:function (event_object,event_name, function_name) 
    {
        var event_handler = this.o.events[event_object + event_name + function_name];
        util.debug("event_remove() what is event_handler:" + event_handler);
        if (event_object.removeEventListener)  
        {
            util.debug("EVENT: removing event:" + event_name + " handler:" + handler);
            event_object.removeEventListener(event_name,event_handler,false);
        }
        else if (event_object.detachEvent)
        {
            util.debug("EVENT: removing event:" + event_name + " handler:" + handler);
            event_object.detachEvent ('on'+event_name,event_handler); 
        } else 
        {
            util.debug("EVENT: unable to remove event:" + event_name + " handler:" + handler);
        }
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

db.init();
self.port.on("refresh_wes", function(json_string) {
    var json_obj = JSON.parse(json_string);

    db.is_wes_enabled = json_obj.is_wes_enabled;
    db.is_wikitoc_on_lhs = json_obj.is_wikitoc_on_lhs;
    db.is_wikitoc_locked = json_obj.is_wikitoc_locked;
    db.wikitoc_margin_position = json_obj.wikitoc_margin_position; 

    util.debug("refresh_wes(): refreshingggggg!!!");
    util.debug("refresh_wes(): " + json_string);
    util.debug("refresh_wes(): wikitoc on lhs?" + json_obj.is_wikitoc_on_lhs);

    if (json_obj.is_wikitoc_on_lhs == true )
    {
        $("#lhs_toc").css("width", db.get_wikitoc_margin_position());
        db.set_wikitoc_margin_position(json_obj.wikitoc_margin_position);
        wiki_toc.toc_open();
        util.debug("refresh_wes(): lets set wikitoc on LHS ");
    }
    else if (json_obj.is_wikitoc_on_lhs == false)
    {
        wiki_toc.toc_open();
        util.debug("refresh_wes(): lets toggle right");
    }
    else 
    {
        util.debug("refresh_wes(): lets do nothing");
    }

    $("#lhs_toc").css("width", db.get_wikitoc_margin_position());
    util.debug("refresh_wes(): what is lhs_toc's width?: " + $("#lhs_toc").css("width"));
    db.set_wikitoc_margin_position(json_obj.wikitoc_margin_position);
    wiki_toc.event_update_content_margin();
    util.debug("refresh_wes():_lets update content margin: " + json_obj.wikitoc_margin_position);
});


self.port.on("init_wes", function(json_string) {
    if ($("#toc").length == 0 ||  
        $("#left-navigation").length == 0 || 
        $("#content").length == 0 || 
        $("#toctitle").length == 0 ) 
    {
        util.debug("wiki_toc() is not going to run as this is not a wiki page with a toc");
        return;
    } else 
    {
        
        var json_obj = JSON.parse(json_string);
        db.set_wikitoc_status(json_obj.is_wes_enabled);
        db.set_wikitoc_on_lhs(json_obj.is_wikitoc_on_lhs);
        db.set_wikitoc_margin_position(json_obj.wikitoc_margin_position);

        setTimeout( function() { wiki_toc.init() }, 50);
    }
});
