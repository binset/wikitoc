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
