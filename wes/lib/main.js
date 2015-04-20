/* jshint esnext: true */
/* global require: false */

let pageMod = require("sdk/page-mod");
let self = require("sdk/self");
let ss = require("sdk/simple-storage");
let buttons = require("sdk/ui/button/toggle");
let tabs = require("sdk/tabs");
let pageWorkers = require("sdk/page-worker");
//let workers = require("sdk/content/worker");
var panels = require("sdk/panel");

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

function init() {
    //is_wes_enabled
    let is_wes_enabled = localStorage.getItem("is_wes_enabled");
    if (is_wes_enabled == undefined || is_wes_enabled == null) {
        localStorage.setItem("is_wes_enabled", true);
    }
    //is_wikitoc_on_lhs
    let is_wikitoc_on_lhs = localStorage.getItem("is_wikitoc_on_lhs");
    if (is_wikitoc_on_lhs == undefined || is_wikitoc_on_lhs == null) {
        localStorage.setItem("is_wikitoc_on_lhs", true);
    } 
}
init()

//tabs.open("https://en.wikipedia.org/wiki/Telephone_numbers_in_Australia");
//tabs.open("https://en.wikipedia.org/wiki/Telephone_number");

tabs.on('activate', function () {
    if (/wikipedia/.test(tabs.activeTab.url))
    {
        console.log('active: ' + tabs.activeTab.url);
        var json_obj = 
        {
            "is_wes_enabled": localStorage.getItem("is_wes_enabled"),
            "is_wikitoc_on_lhs": localStorage.getItem("is_wikitoc_on_lhs"),
            "wikitoc_margin_position": localStorage.getItem("wikitoc_margin_position"),
        };
        var json_string = JSON.stringify(json_obj);
        console.log('active: ' + json_string);
        var worker = null;
        worker = getActiveWorker();
        if (worker)
        {
            worker.port.emit("refresh_wes", json_string);
        } else
        {
            console.log("main.js: I can't find your worker mate");
        }
    }
});
 
// Create a page mod
// It will run a script whenever a ".org" URL is loaded
// The script replaces the page contents with a message
pageMod.PageMod({
    include: "*",
    contentScriptWhen: "ready",
    contentScriptFile: [
        self.data.url("vendor/jquery/1.7.2/jquery-1.7.2.js"),
        self.data.url("vendor/jqueryui/1.8/jquery-ui.js"),
        self.data.url("vendor/jquery.sidebar.js"),
        self.data.url("wes.js"),
    ],
    contentStyleFile: [
        self.data.url("vendor/jqueryui/1.8/themes/base/jquery-ui.css"),
        self.data.url("vendor/jquery.sidebar.css"),
    ],
    onAttach: function(worker) {
        workers.push(worker);
        worker.on('detach', function () {
            detachWorker(this, workers);
        });

        var json_obj = 
        {
            "is_wes_enabled": localStorage.getItem("is_wes_enabled"),
            "is_wikitoc_on_lhs": localStorage.getItem("is_wikitoc_on_lhs"),
            "wikitoc_margin_position": localStorage.getItem("wikitoc_margin_position"),
        };
        var json_string = JSON.stringify(json_obj);

        worker.port.emit("init_wes", json_string);

        worker.port.on("is_wes_enabled", function(payload) {
            console.log("main.js: port.on is wikitoc_enabled:" + payload);
            localStorage.setItem("is_wes_enabled", payload);
        });
        worker.port.on("is_wikitoc_on_lhs", function(payload) {
            console.log("main.js: port.on is_wikitoc_on_lhs:" + payload);
            localStorage.setItem("is_wikitoc_on_lhs", payload);
        });
        worker.port.on("wikitoc_margin_position", function(payload) {
            console.log("main.js: port.on wikitoc_margin_position:" + payload);
            localStorage.setItem("wikitoc_margin_position", payload);
        });
    }
});


