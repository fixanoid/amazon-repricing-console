var ol = {};
ol = {
	itemBucket: '',
	buckets: '',
	exclusions: '',
	port: null,

	init: function() {
		ol.port = chrome.extension.connect({name: 'offer'});
		ol.port.onMessage.addListener(
			function(request) {
				if (request.action == 'exclusionList') {
					// console.log('exclusions received');

					if (request.exclusions)
						ol.exclusions = request.exclusions.split(',');

					if (request.buckets)
						ol.buckets = request.buckets;

					if (request.buckets.indexOf('item') >= 0 ) {
						// need items bucket
						var asin = document.location.href.replace('http://www.amazon.com/gp/offer-listing/', '').replace('http://www.amazon.co.uk/gp/offer-listing/', '');

						// extract asin is there is more stuff in the URL
						if (asin.indexOf('/') > 0) {
							asin = asin.substring(0, asin.indexOf('/'));
						}

						ol.port.postMessage({action: 'requestItemBucket', asin: asin});
					} else {
						// process page
						ol.process();
					}
				} else if (request.action == 'itemBucket') {
					// process page
					ol.itemBucket = request.bucket;

					ol.process();
				}
			});

		// Add exclusions button
		var sellers = document.getElementsByClassName('sellerInformation');
		for (var i = 0; i < sellers.length; i++) {
			var nl = document.createElement('a');
			nl.href = '#';
			nl.innerText = 'Add this vendor to exclusions.'; 

			nl.addEventListener( "click", ol.addNewExclusion, false );

			sellers[i].appendChild(document.createElement('br'));
			sellers[i].appendChild(nl);
		}
	},
	
	addNewExclusion: function(o) {
		o.preventDefault();
		var seller, si = o.target.parentNode;

		try {
			seller = si.children[0].children[0];
			if (seller.nodeName == 'IMG') {
				seller = seller.alt;
			} else {
				seller = seller.children[1].children[0].textContent;
			}
		} catch (errr) {
			// amazon.com case.
			seller = 'Amazon.com';
		}

		// console.log('Posting new exclusion: ' + seller);

		ol.port.postMessage({action: 'new-exclusion', seller: seller});
	},

	process: function() {
		var i, el, p, s, seller, f, lowest, port, cond, excluded = 0,
		 asin = document.location.href.replace('http://www.amazon.com/gp/offer-listing/', '').replace('http://www.amazon.co.uk/gp/offer-listing/', ''),
		 c = document.getElementsByClassName('result');

		// extract asin is there is more stuff in the URL
		if (asin.indexOf('/') > 0) {
			asin = asin.substring(0, asin.indexOf('/'));
		}

		for (i = 0; i < c.length; i++) {
			// detect which bucket its in.
			try {
				var bucket = c[i].parentNode.previousElementSibling;
				bucket = bucket.getElementsByClassName('buckettitle');
				bucket = bucket[0].children[0].innerText;

				if (ol.buckets.indexOf('item') >= 0 ) {
					// console.log('Using items bucket:' + ol.itemBucket);
				} else {

					if ( (ol.buckets.indexOf('featured') < 0 ) && (bucket == 'Featured Merchants') ) {
						// console.log('Skipping featured');
						continue;
					}

					if ( (ol.buckets.indexOf('new') < 0 ) && (bucket == 'New') ) {
						// console.log('Skipping new');
						continue;
					}

					if ( (ol.buckets.indexOf('used') < 0 ) && (bucket == 'Used') ) {
						// console.log('Skipping used');
						continue;
					}
				}

			} catch (err) {
				console.log('Error determining the bucket');
			}

			el = c[i].children[0].children[0];

			try {
				seller = c[i].children[0].children[2].children[0].children[0].children[0];
				if (seller.nodeName == 'IMG') {
					seller = seller.alt;
				} else {
					seller = seller.children[1].children[0].textContent;
				}
			} catch (errr) {
				// amazon.com case.
				seller = 'Amazon.com';
			}

			// check exclusion list
			f = false;
			for (p = 0; p < ol.exclusions.length; p++) {
				if (seller == ol.exclusions[p]) {
					f = true;
					break;
				}
			}

			if (f) {
				// exclusion found
				excluded++;

				continue;
			}

			cond = c[i].children[0].children[1].children[0].innerHTML.replace(/\n/g, '');

			try {
				p = parseFloat(el.children[0].innerHTML.replace('$', '').replace('£', ''));

				try {
					s = parseFloat(el.children[1].children[0].innerHTML.replace('+ $', '').replace('+ £', ''));
				} catch (ee) {
					s = parseFloat(el.children[2].children[0].innerHTML.replace('+ $', '').replace('+ £', ''));
				}

				f = Math.round( (p + (s ? s : 0)) * 100) / 100;

				if ( (ol.buckets.indexOf('item') >= 0 ) && (cond != ol.itemBucket) ) {
					continue;
				}
				
				if (!lowest) {
					lowest = f;
				} else if (lowest > f) {
					lowest = f;
				}
			} catch (e) { }
		}

		if (!lowest) {
			// it appears that we did not find any prices, check if there were too many exclusions?
			if (excluded > 1) {
				// everyone was excluded, try next page.

				var nextPage = document.location.href;
				nextPage = nextPage.replace('startIndex=0', 'startIndex=15');
				document.location.href = nextPage;
			}
		}

		ol.port.postMessage({action: 'lowest-offer', lowest: lowest, asin: asin});
	}
}

window.addEventListener( "load", function() {
	ol.init();
}, false );