
/* this module enables keyboard navigation
 * using the number keys, you can jump to the relevant section of the TOC section
 */
//http://seriouscoding.com/2009/08/16/keyboard-navigation-with-javascript-and-jquery/

var keycodes = {
    BACKSPACE: 8,
    CAPS_LOCK: 20,
    COMMA: 188,
    CONTROL: 17,
    DELETE: 46,
    DOWN: 40,
    END: 35,
    ENTER: 13,
    ESCAPE: 27,
    HOME: 36,
    INSERT: 45,
    LEFT: 37,
    NUMPAD_ADD: 107,
    NUMPAD_DECIMAL: 110,
    NUMPAD_DIVIDE: 111,
    NUMPAD_ENTER: 108,
    NUMPAD_MULTIPLY: 106,
    NUMPAD_SUBTRACT: 109,
    PAGE_DOWN: 34,
    PAGE_UP: 33,
    PERIOD: 190,
    RIGHT: 39,
    SHIFT: 16,
    SPACE: 32,
    TAB: 9,
    UP: 38,
    0: 48,
    1: 49,
    2: 50,
    3: 51,
    4: 52,
    5: 53,
    6: 54,
    7: 55,
    8: 56,
    9: 57
};

function process_keycode(keycode)
{
    if ( keycodes["1"] <= keycode && keycode <= keycodes["9"] ) {
        //console.log("wes_keyboard.js: found a key between 1-9: " + keycode);
        var number = keycode - keycodes["0"]; //get numerical value of num keypress
        var number_str = "" + number; //get string representation

        var toc_table_ul = document.getElementById("toc");
        if (toc_table_ul === null)
        {
            return;
        }
        var anchor_links = toc_table_ul.getElementsByTagName("a");
        if (anchor_links === null)
        {
            return;
        }

        //lets click on the link
        var possible_hits = $("#toc span");
        for (var i = 0; i < possible_hits.length; i++) 
        {
            if (possible_hits[i].innerHTML == number_str)
            {
                //found it
                var ahref = possible_hits[i].parentNode;
                ahref.click(); //try clicking the link
            }
        }
    }
};

if (util.is_valid_wiki_page())
{
    jQuery(document).bind('keydown', function (event)
    {
        var key = event.keyCode || event.which;

        if(event.target.type !== 'textarea')
        {
            if (event.target.type !== 'text') 
            {
                //Not in a textarea or textbox
                process_keycode(key);
            }
        }
    });
}
