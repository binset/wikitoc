/* jshint esnext: true */
/* global require: false */

let pageMod = require("sdk/page-mod");
let self = require("sdk/self");
let ss = require("sdk/simple-storage");
let buttons = require("sdk/ui/button/toggle");
let tabs = require("sdk/tabs");
let pageWorkers = require("sdk/page-worker");
//let workers = require("sdk/content/worker");

let localStorage = ss.storage;
localStorage.getItem = function(key) {
	return ss.storage[key];
};
localStorage.setItem = function(key, value) {
	ss.storage[key] = value;
};
localStorage.removeItem = function(key) {
	delete ss.storage[key];
};

let workers = [];
function getActiveWorker() {
    let tab = tabs.activeTab;
    for (let i in workers) {
        if ((typeof workers[i].tab !== 'undefined') && (tab.title === workers[i].tab.title)) {
            return workers[i];
        }
    }
    return null;
}
function detachWorker(worker, workerArray) {
	let index = workerArray.indexOf(worker);
	if (index !== -1) {
		workerArray.splice(index, 1);
	}
}


const lhswikitoc_activated = {
  "label": "Wikipedia Enhancement Suite is now Activated",
  "icon": "./on64.png",
}

const lhswikitoc_deactivated = {
  "label": "Wikipedia Enhancement Suite is now Deactivated",
  "icon": "./off64.png",
}

const wes_locked = {
  "label": "Table of Contents on LHS is now locked",
  "icon": "./on64.png",
}

const wes_unlocked = {
  "label": "Table of Contents on LHS is now unlocked",
  "icon": "./off64.png",
}

var button_activated = buttons.ToggleButton({
  id: "button_activated",
  label: lhswikitoc_activated.label,
  icon: lhswikitoc_activated.icon,
  onClick: handle_activate_click
});
function handle_activate_click(state) {
  button_activated.checked = !button_activated.checked;
  localStorage.setItem("is_wikitoc_on_lhs", button_activated.checked)

  if (button_activated.checked == true) {
    button_activated.state(button_activated, lhswikitoc_activated);
  }
  else {
    button_activated.state(button_activated, lhswikitoc_deactivated);
  }

    worker = getActiveWorker();
    if (worker)
    {
        console.log("main.js: handle_activate_click()");
        worker.port.emit("is_wes_enabled", localStorage.getItem("is_wes_enabled"));
        worker.port.emit("is_wikitoc_locked", localStorage.getItem("is_wikitoc_locked"));
        worker.port.emit("is_wikitoc_on_lhs", localStorage.getItem("is_wikitoc_on_lhs"));
    }
}

var button_locked = buttons.ToggleButton({
  id: "button_locked",
  label: wes_locked.label,
  icon: wes_locked.icon,
  onClick: handle_lock_click
});
function handle_lock_click(state) {
    button_locked.checked = !button_locked.checked;
    localStorage.setItem("is_wikitoc_locked", button_locked.checked)

    if (button_locked.checked == true) {
        button_locked.state(button_locked, wes_locked);
    }
    else {
        button_locked.state(button_locked, wes_unlocked);
    }

    worker = getActiveWorker();
    if (worker)
    {
        console.log("main.js: handle_lock_click()");
        worker.port.emit("is_wes_enabled", localStorage.getItem("is_wes_enabled"));
        worker.port.emit("is_wikitoc_locked", localStorage.getItem("is_wikitoc_locked"));
        worker.port.emit("is_wikitoc_on_lhs", localStorage.getItem("is_wikitoc_on_lhs"));
    }
}

function init() {
    {
        //is_wes_enabled
        let is_wikitoc_on_lhs = localStorage.getItem("is_wikitoc_on_lhs");
        if (is_wikitoc_on_lhs == undefined || is_wikitoc_on_lhs == null) {
            localStorage.setItem("is_wikitoc_on_lhs", true);
        }

        is_wikitoc_on_lhs = localStorage.getItem("is_wikitoc_on_lhs");
        if (is_wikitoc_on_lhs == true) {
            button_activated.checked = true;
            button_activated.state(button_activated, lhswikitoc_activated);
        } else {
            button_activated.checked = false;
            button_activated.state(button_activated, lhswikitoc_deactivated);
        }
    }

    {
        //is_wikitoc_on_lhs
        let is_wikitoc_on_lhs = localStorage.getItem("is_wikitoc_on_lhs");
        if (is_wikitoc_on_lhs == undefined || is_wikitoc_on_lhs == null) {
            localStorage.setItem("is_wikitoc_on_lhs", true);
        } 

        is_wikitoc_on_lhs = localStorage.getItem("is_wikitoc_on_lhs");
        if (is_wikitoc_on_lhs == true) {
            button_activated.checked = true;
            button_activated.state(button_activated, wes_locked);
        } else {
            button_activated.checked = false;
            button_activated.state(button_activated, wes_unlocked);
        }
    }

    {
        //is_wikitoc_locked
        let is_wikitoc_locked = localStorage.getItem("is_wikitoc_locked");
        if (is_wikitoc_locked == undefined || is_wikitoc_locked == null) {
            localStorage.setItem("is_wikitoc_locked", true);
        } 

        is_wikitoc_locked = localStorage.getItem("is_wikitoc_locked");
        if (is_wikitoc_locked == true) {
            button_locked.checked = true;
            button_locked.state(button_locked, wes_locked);
        } else {
            button_locked.checked = false;
            button_locked.state(button_locked, wes_unlocked);
        }
    }
}


init()
 
// Create a page mod
// It will run a script whenever a ".org" URL is loaded
// The script replaces the page contents with a message
pageMod.PageMod({
  include: "*",
	contentScriptWhen: "ready",
  contentScriptFile: [
    self.data.url("vendor/jquery/1.7.2/jquery.min.js"),
    self.data.url("vendor/jqueryui/1.8/jquery-ui.min.js"),
    self.data.url("wes.js"),
  ],
  contentStyleFile: [
    self.data.url("vendor/jqueryui/1.8/themes/base/jquery-ui.css"),
  ],
  onAttach: function(worker) {
    workers.push(worker);
    worker.on('detach', function () {
        detachWorker(this, workers);
    });

    var json_obj = 
    {
        "is_wes_enabled": localStorage.getItem("is_wes_enabled"),
        "is_wikitoc_locked": localStorage.getItem("is_wikitoc_locked"),
        "is_wikitoc_on_lhs": localStorage.getItem("is_wikitoc_on_lhs"),
        "wikitoc_margin_position": localStorage.getItem("wikitoc_margin_position"),
    };
    var json_string = JSON.stringify(json_obj);

    worker.port.emit("init_wes", json_string);

    worker.port.on("is_wes_enabled", function(payload) {
        console.log("main.js: setting is wikitoc_enabled:" + payload);
        localStorage.setItem("is_wes_enabled", payload);
    });
    worker.port.on("is_wikitoc_on_lhs", function(payload) {
        console.log("main.js: setting is_wikitoc_on_lhs:" + payload);
        localStorage.setItem("is_wikitoc_on_lhs", payload);
        if (payload == true) {
            button_activated.state(button_activated, lhswikitoc_activated);
        }
        else {
            button_activated.state(button_activated, lhswikitoc_deactivated);
        }
    });
    worker.port.on("is_wikitoc_locked", function(payload) {
        console.log("main.js: setting is_wikitoc_locked:" + payload);
        localStorage.setItem("is_wikitoc_locked", payload);
        if (payload == true) {
            button_locked.state(button_locked, wes_locked);
        }
        else {
            button_locked.state(button_locked, wes_unlocked);
        }
    });
    worker.port.on("wikitoc_margin_position", function(payload) {
        console.log("main.js: setting wikitoc_margin_position:" + payload);
        localStorage.setItem("wikitoc_margin_position", payload);
    });
  }
});


