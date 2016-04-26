chrome.extension.sendMessage({}, function(response) {
	var readyStateCheckInterval = setInterval(function() {
		//if (document.readyState === "complete") {
			clearInterval(readyStateCheckInterval);
			lhstoc.init();
		//}
	}, 10);
});
