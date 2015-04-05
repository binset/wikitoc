var response = document.getElementById("response");

window.addEventListener("init", function(event) {
    window.port = event.ports[0];
    window.port.onmessage = receive;
});



function receive(event) {
    console.log("what is the data??" + event.data);
    console.log("what is the data??" + event);
    response.textContent = event.data;
}


self.port.on("panelclick", function(payload) {
    document.getElementById("is_wes_enabled").textContent = payload.is_wes_enabled;
    document.getElementById("is_wikitoc_on_lhs").textContent = payload.is_wikitoc_on_lhs;
    document.getElementById("is_wikitoc_locked").textContent = payload.is_wikitoc_locked;
    document.getElementById("wikitoc_margin_position").textContent = payload.wikitoc_margin_position;
});

document.getElementById("is_wes_enabled").onclick = function()
{
    var value = document.getElementById("is_wes_enabled").textContent;
    var newvalue;
    if (value == "true")
        newvalue = !true;
    else
        newvalue = !false;
    console.log("clicking is_wes_enabled... gonna be:" + newvalue);
    self.port.emit("is_wes_enabled", newvalue);
    document.getElementById("is_wes_enabled").textContent = newvalue;
};

document.getElementById("is_wikitoc_on_lhs").onclick = function()
{
    var value = document.getElementById("is_wikitoc_on_lhs").textContent;
    var newvalue;
    if (value == "true")
        newvalue = !true;
    else
        newvalue = !false;
    console.log("clicking is_wikitoc_on_lhs.. gonna be:" + newvalue);
    self.port.emit("is_wikitoc_on_lhs", newvalue);
    document.getElementById("is_wikitoc_on_lhs").textContent = newvalue;;
};

document.getElementById("is_wikitoc_locked").onclick = function()
{
    var value = document.getElementById("is_wikitoc_locked").textContent;
    var newvalue;
    if (value == "true")
        newvalue = !true;
    else
        newvalue = !false;
    console.log("clicking is_wikitoc_locked.. gonna be:" + newvalue);
    self.port.emit("is_wikitoc_locked", newvalue);
    document.getElementById("is_wikitoc_locked").textContent = newvalue;
};

document.getElementById("wikitoc_margin_position").onclick = function()
{
    console.log("clicking wikitoc_margin_position");
};
