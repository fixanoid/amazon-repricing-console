var country = {};
country = {
	port: '',
	em: '',
	pa: '',
	bu: '',
	init: function() {
		var lin = true;
		country.em = document.getElementById('username');
		country.pa = document.getElementById('password');
		country.bu = document.getElementById('sign-in-button');

		if (country.em && country.pa) {
			console.log('login page.');
			lin = false;
		}


		country.port = chrome.extension.connect({name: 'country'});
		country.port.postMessage({action: 'sendUrl', url: document.location.href, loggedIn: lin});

		country.port.onMessage.addListener(
		  function(request) {
		    if (request.action == 'login') {
					if ( (request.login) && (request.pass) ) {
						console.log('attempting login');
						country.em.value = request.login;
						country.pa.value = request.pass;
						country.bu.click();
					}
		    }
		  });
	}
}

window.addEventListener( "load", function() {
	country.init();
}, false );