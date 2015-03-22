// ==UserScript==
// @name        Wikipedia TOC Enhanced
// @author      teamrc
// @namespace   https://github.com/teamrc/wikitoc
// @homepage    http://teamrc.github.io/wikitoc/
// @license     GNU GPL version 3.0
// @description Table of Contents Enhancer for Wikipedia
// @require     http://code.jquery.com/jquery-1.3.2.min.js
// @include     *wiki*
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

var is_wes_enabled = null;
var is_wikitoc_on_lhs = null;
var is_wikitoc_locked = null;
var wikitoc_margin_position = null;

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

    init:function()
    {
        //initialise content script port listener events
        util.debug("db: initialisation");
        self.port.on("is_wes_enabled", function(payload) {
            if (payload === true)
                is_wes_enabled = true;
            else 
                is_wes_enabled = false;
            util.debug("db: porttttttttt setting is_wes_enabled:" + payload);
        });

        self.port.on("is_wikitoc_on_lhs", function(payload) {
            if (payload === true)
                is_wikitoc_on_lhs = true;
            else 
                is_wikitoc_on_lhs = false;
            util.debug("db: porttttttttt setting is_wikitoc_on_lhs:" + payload);
        });

        self.port.on("is_wikitoc_locked", function(payload) {
            if (payload === true)
                is_wikitoc_locked = true;
            else 
                is_wikitoc_locked = false;
            util.debug("db: porttttttttt setting is_wikitoc_locked:" + payload);
        });

        self.port.on("wikitoc_margin_position", function(payload) {
            wikitoc_margin_position = payload;
            util.debug("db: porttttttttt setting wikitoc_margin_position:" + payload);
        });
    },
    
    get_wikitoc_status:function()
    {
        util.debug("getting is_wes_enabled:" + is_wes_enabled);
        return is_wes_enabled;
    },
    
    set_wikitoc_status:function(payload)
    {
        is_wes_enabled = payload;
        self.port.emit("is_wes_enabled", is_wes_enabled);
        util.debug("db: setting is_wes_enabled:" + is_wes_enabled);
    },
    
    get_wikitoc_on_lhs:function()
    {
        util.debug("db: getting is_wikitoc_on_lhs:" + is_wikitoc_on_lhs);
        return is_wikitoc_on_lhs;
    },
    
    set_wikitoc_on_lhs:function(payload)
    {
        is_wikitoc_on_lhs = payload;
        self.port.emit("is_wikitoc_on_lhs", is_wikitoc_on_lhs);
        util.debug("db: setting is_wikitoc_on_lhs:" + is_wikitoc_on_lhs);
    },


    get_wikitoc_locked:function()
    {
        util.debug("db: getting is_wikitoc_locked" + is_wikitoc_locked);
        return is_wikitoc_locked;
    },
    
    set_wikitoc_locked:function(payload)
    {
        /** set true if user specifies wikitoc to be locked and always appearing on the LHS
            false otherwise (i.e. TOC is floating)
        */

        is_wikitoc_locked = payload;
        self.port.emit("is_wikitoc_locked", is_wikitoc_locked);
        util.debug("db: setting is_wikitoc_locked" + is_wikitoc_locked);
    },
    
    get_wikitoc_margin_position:function()
    {
        util.debug("db: getting wikitoc_margin_position" + wikitoc_margin_position);
        return wikitoc_margin_position;
    },
    
    set_wikitoc_margin_position:function(payload)
    {
        //wikitoc_margin is the value of the margin of the TOC on LHS in pixels
        
        wikitoc_margin_position = payload;
        self.port.emit("wikitoc_margin_position", wikitoc_margin_position);
        util.debug("db: setting wikitoc_margin_position" + wikitoc_margin_position);
    },
};

var util = 
{
    debug:function(debug_string)
    {
        var debugging = true;
        if (debugging)
        {
            console.log("DEBUG: " + debug_string);
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
    init:function(o)
    {
        // process TOC chapter listing
        // then save TOC CSS settings
        // then save frame CSS settings
        // then add buttons to TOC
        // then run toc_toggle_left()
        // then adds the page_scroll event
        
        o.events = {}; //stores hash of event handlers
        db.set_wikitoc_status(true);
        
        if (db.get_wikitoc_status() == true) 
        {
            util.debug("Initialising wiki_toc()...1");
            this.init_save_positions(o);
            util.debug("Initialising wiki_toc()...2");
            this.init_toc_chapter_listing(o);
            util.debug("Initialising wiki_toc()...3");
            
            if (db.get_wikitoc_on_lhs() == null)
            {
                //initialise wikitoc on lhs for new sites to be LHS
                db.set_wikitoc_on_lhs(true);
            }
            util.debug("Initialising wiki_toc()...4");
            
            if (db.get_wikitoc_on_lhs() == true)
            {
                this.toc_toggle_left(o);
            }
            util.debug("Initialising wiki_toc()...5");
            this.init_html_buttons(o);
            util.debug("Initialising wiki_toc()...6");
            this.init_events(o);
            util.debug("Initialising wiki_toc() is done!");
            util.debug("");
            util.debug("is_wes_enabled           " + is_wes_enabled);
            util.debug("is_wikitoc_on_lhs        " + is_wikitoc_on_lhs);
            util.debug("is_wikitoc_locked        " + is_wikitoc_locked);
            util.debug("wikitoc_margin_position  " + wikitoc_margin_position);

        } else {
            util.debug("wiki_toc() is not running");
        }
        
    },
    
    init_events:function(o)
    {
        this.event_add(o, window,'scroll','event_page_scroll',o);
        this.event_page_scroll(o);
        
        var toctoggle = document.getElementById("toctoggle");
        this.event_add(o, toctoggle,'click','toc_toggle',o);

        var toc_lock = document.getElementById("toc_lock");
        this.event_add(o, toc_lock,'click','set_state_on_and_locked',o);

        var toc_unlock = document.getElementById("toc_unlock");
        this.event_add(o, toc_unlock,'click','set_state_on_and_unlocked',o);
        
        this.event_add(o, window,'scroll','event_toc_scroll_lock',o);
        this.event_toc_scroll_lock(o);

        this.event_add(o, window,'resize','toc_toggle_left',o);
    },
    
    init_save_positions:function(o)
    {
        //save original toc settings
        o.toc_original = {};
        o.toc_original["height"] = $("#toc").css("height");
        o.toc_original["width"] = $("#toc").css("width");
        o.toc_original["overflow"] = $("#toc").css("overflow");
        o.toc_original["border"] = $("#toc").css("border");
        o.toc_original["position"] = $("#toc").css("position");
        o.toc_original["left"] = $("#toc").css("left");
        o.toc_original["top"] = $("#toc").css("top");
        
        //save LHS frame settings
        o.frame_left_navigation = $("#left-navigation").css('margin-left');
        o.frame_content = $("#content").css('margin-left');
    },

    init_html_buttons:function(o)
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
        
        var toc_lock = document.createElement('a');
        toc_lock.setAttribute("id", "toc_lock");
        toc_lock.setAttribute("title", "Click here to lock the LHS TOC");
        toc_lock.appendChild(document.createTextNode("  | lock toc")); 

        var toc_unlock = document.createElement('a');
        toc_unlock.setAttribute("id", "toc_unlock");
        toc_unlock.setAttribute("title", "Click here to unlock the LHS TOC");
        toc_unlock.appendChild(document.createTextNode("  | unlock toc")); 

        //Now add all the created elements into the HTML document
        toctitle.appendChild(toctoggle);
        toctitle.appendChild(toc_lock);
        toctitle.appendChild(toc_unlock);
    },
    
    init_toc_chapter_listing:function(o)
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
        
        o.chapters_listing = chapters_listing;
        
        for (i=0; i<chapters_listing.length; i++)
        {
            //util.debug("verifying: " + chapters_listing[i][1].outerHTML);
            var j = 0;
        }
    },
    
    toc_toggle:function(o)
    {
        util.debug("toc_toggle()");
        if (db.get_wikitoc_on_lhs() == true)
        {
            util.debug("going to move TOC to right");
            this.toc_toggle_right(o);
            
        } else 
        {
            util.debug("going to move TOC to left");
            this.toc_toggle_left(o);
        }
    },

    set_state_on_and_unlocked:function(o)
    {
        /** activates lhstoc on the left hand panel, and let it float */
        this.event_toc_unlock(o);
        this.toc_toggle_left(o);
    },

    set_state_on_and_locked:function(o)
    {
        /** activates lhstoc on the left hand panel, and set it locked, so it always appear on lhs*/
        this.event_toc_lock(o);
        this.toc_toggle_left(o);
    },

    set_state_off:function(o)
    {
        /** deactivate lhstoc on the left hand panel*/
        this.toc_toggle_right(o);
    },
        
    toc_toggle_left:function(o)
    {
        /**toggle TOC to LHS
        */
        
        util.debug("toc_toggle_left 1");
        var toc_height = window.innerHeight.toString() + "px";
        //var toc_width = $("#content").offsetLeft + "px";
        //var toc_width =  $("#mw-head-base").css('margin-left');
        var toc_width = db.get_wikitoc_margin_position(); 
        if (toc_width == null)
        {
            //toc_width = $("#toc").css('width');
            toc_width = $("#p-namespaces")[0].getBoundingClientRect().left ;
        }
        
        util.debug("toc_toggle_left 2");
     
        //$("#lhs_toc").css({"z-index": "9999", height: toc_height, width: toc_width, overflow: 'auto', border: '1px solid black', position: 'fixed', left:'2px', top: '0px' });
        var lhs_mwpanel_yposition = $("#mw-panel").position()['top'];
        var lhs_panel_yposition = $("#p-lang").position()['top'];
        var lhs_panel_height = $("#p-lang").height();
        lhs_toc_position = util.pixels_addition(lhs_panel_height, lhs_panel_yposition);
        lhs_toc_position += "px";

        util.debug("toc_toggle_left 3");

        if ($("#lhs_toc").length == 0)
        {
        util.debug("toc_toggle_left 3a");
            //lhs_toc doesn't exist, we can recreate it

            var cloned_toc = $("#toc").clone().attr('id', 'lhs_toc');
            cloned_toc.find('#toctitle').attr('id', 'lhs_toctitle');
            cloned_toc.insertAfter("#p-lang");

            var that = this;
            $('#lhs_toc').resizable({
              handles: "e",
              stop: function(e, ui){
        util.debug("toc_toggle_left 3b");
                  that.event_update_content_margin(o);
                },
            });
        }
        util.debug("toc_toggle_left 4");

        $("#lhs_toc").css({"z-index": "1", height: toc_height, width: toc_width, overflow: 'auto', position: 'absolute', left:'0px', top: lhs_toc_position });
        $("#lhs_toc").css("display", "block");
        $("#lhs_toc").css("padding-left", "0px");
        $("#lhs_toc").css("padding-right", "0px");

        db.set_wikitoc_on_lhs(true);
        
        util.debug("toc_toggle_left 5");
        //resize the main content section on RHS on fit the size of the TOC on LHS
        this.event_update_content_margin(o);
        util.debug("toc_toggle_left 6");
        this.event_toc_scroll_lock(o);
        util.debug("toc_toggle_left 7");
    },
    
    toc_toggle_right:function(o)
    {
        /* move TOC to LHS
        uses original toc values from o.toc_original dictionary.
        */
        
        $("#lhs_toc").resizable( "destroy" ); //remove scrolling and associated events
        $("#lhs_toc").remove();
        
        $("#left-navigation").css('margin-left', o.frame_left_navigation);
        $("#content").css('margin-left',  o.frame_content);
        db.set_wikitoc_on_lhs(false);
    },
    
    
    event_update_content_margin:function(o)
    {
        /** based on the width of lhs_toc, update the position of the main CONTENTS margin to follow that of the lhs_toc */
        
        if (db.get_wikitoc_on_lhs())
        {
            var lhs_toc_width = parseInt($("#lhs_toc").css('width'));
            $("#left-navigation").css('margin-left', lhs_toc_width + "px");
            $("#content").css('margin-left', lhs_toc_width + "px" );
            db.set_wikitoc_margin_position(lhs_toc_width); 
        }
    },

    event_toc_lock:function(o)
    {
        /** event that locks the lhs_toc to always appear on the LHS */
        db.set_wikitoc_locked(true);
        this.event_toc_scroll_lock(o); //refresh the toc
    },

    event_toc_unlock:function(o)
    {
        /** event that sets the lhs_toc to only appear if the user scrolls past the lhs language options */
        db.set_wikitoc_locked(false);
        this.event_toc_scroll_lock(o); //refresh the toc
    },
                              
    event_toc_scroll_lock:function(o)
    {
        /** event that lock position of lhs toc if user scrolls below the lhs panel */

        if (db.get_wikitoc_locked() == true)
        {
            //lock the position
            $("#lhs_toc").css("top", 0);
            $("#lhs_toc").css("position", "fixed");
        } else 
        {
            var lhs_panel_yposition = $("#p-lang").position()['top'];
            var lhs_panel_height = $("#p-lang").height();
            var lhs_toc_position = util.pixels_addition(lhs_panel_height, lhs_panel_yposition);

            var lhs_mwpanel_yposition = $("#mw-panel").position()['top'];
            var lhs_toc_scroll_lock = util.pixels_addition(lhs_toc_position, lhs_mwpanel_yposition);


            var curr_scrolltop = (document.documentElement || document.body.parentNode || document.body).scrollTop;
            if (curr_scrolltop > lhs_toc_scroll_lock) {
                //lock the position
                $("#lhs_toc").css("top", 0);
                $("#lhs_toc").css("position", "fixed");
            } else {
                //let it float
                $("#lhs_toc").css("top", lhs_toc_position);
                $("#lhs_toc").css("position", "absolute");
            }
        }
    },
    
    event_page_scroll:function(o)
    {
        /** event that gets called when user scrolls.
            Hightlights current chapter in the TOC
        */
        
        var nu = 0;
        for (nu=0,i=0; i<o.chapters_listing.length; i++){
            o.chapters_listing[i][1].className=o.chapters_listing[i][2];
            //(this.pos(o.chapters_listing[i][0])[1]-this.wwhs()[3]-this.wwhs()[1]/2)<0?nu=i:null;
            (this.pos(o.chapters_listing[i][0])[1]-this.wwhs()[3]-this.wwhs()[1]/100)<0?nu=i:null;
            
        }
        if (nu !== null) {
            //util.debug("hit paydirt: chapter is " + o.chapters_listing[nu][0].outerHTML);
            o.chapters_listing[nu][1].className=o.chapters_listing[nu][3];
            
            var current_section = o.chapters_listing[nu][0].getAttribute("id");
            this.update_toc(o, current_section);
        }
    },
    
    update_toc:function(o, current_section)
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
    
    
    event_add:function(o, event_object, event_name, function_name,p)
    {
        /*
            Docs for EventTarget.addEventListener:
            target.addEventListener(type, listener[, useCapture]);
            target.addEventListener(type, listener[, useCapture, wantsUntrusted Non-standard]); // Gecko/Mozilla only
        */
        var oop=this;
        var event_handler;
        if (event_object.addEventListener){
            o.events[event_object + event_name + function_name] = function(e){ return oop[function_name](p,e);};
            event_handler = o.events[event_object + event_name + function_name];

            event_object.addEventListener(event_name, event_handler, false);
            util.debug("EVENT: adding event listener:" + event_name + " function_name:" + function_name + " p:" + p);
        }
        else if (event_object.attachEvent){
            o.events[event_object + event_name + function_name] = function(e){ return oop[function_name](p,e); };
            event_handler = o.events[event_object + event_name + function_name];

            event_object.attachEvent('on'+event_name, event_handler);
            util.debug("EVENT: adding attach event :" + event_name + " function_name:" + function_name + " p:" + p);
        } else 
        {
            util.debug("EVENT: unable to add event :" + event_name + " function_name:" + function_name + " p:" + p);
        }
    },
    event_remove:function (o, event_object,event_name, function_name) 
    {
        var event_handler = o.events[event_object + event_name + function_name];
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


$(document).ready(function() {
    db.init();
    setTimeout( function() { wiki_toc.init({}) }, 200);
});
