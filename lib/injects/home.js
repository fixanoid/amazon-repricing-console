window.addEventListener( 'load', function() {
	chrome.extension.sendMessage({page: 'home', url: document.location.href}, function(response) {});
}, false );
