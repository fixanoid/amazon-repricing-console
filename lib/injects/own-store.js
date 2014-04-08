window.addEventListener( "load", function() {
	if (document.location.href.indexOf('gp/help-content/home.html') > 0) {
		try {
			var ownImage = document.getElementById('idImageDetailsContainer').children[0].src;
			ownImage = decodeURIComponent(ownImage.substring(ownImage.lastIndexOf('/') + 1));

			chrome.extension.sendMessage({page: "own-store", image: ownImage}, function(response) {});
		} catch (e) {
			// no image, let background know to load from account info.
			chrome.extension.sendMessage({page: "own-store", missing: true}, function(response) {});
		}
	} else if (document.location.href.indexOf('gp/on-board/configuration/global-seller-profile/index.html') > 0) {
		var display = document.getElementById('friendlyName').value;
		chrome.extension.sendMessage({page: "own-store", display: display}, function(response) {});
	}
}, false );