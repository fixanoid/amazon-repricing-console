/*
Seller Central Inventory page inject: New Style
*/

var ascc = {};
ascc = {
	page: 1,
	pages: 1,
	port: null,
	db: {},
	ifr: false,
	expired: false,
	count: 0,

	init: function() {
		var cols, b, tbody, i, e, p, row, rowNum = {}, c = 0, mt = document.querySelector('.mt-table tbody');

		// check if the user is logged in.
		// if (document.title == 'Expired Session') {
		// 	ascc.expired = true;
		// }

		// if logged out and its a work frame, attempt to force login.
		// if (ascc.expired && ascc.ifr) {
		// 	ascc.port = chrome.extension.connect({name: 'ascc'});
		// 	ascc.port.postMessage({action: 'pageExpired'});

		// 	return;
		// }


		// determining if were in a work frame
		try {
			if (window.top.location != window.location) {
				ascc.ifr = true;
			} else {
				ascc.ifr = false;
			}
		} catch (e) {
			ascc.ifr = true;
		}

		// manageTable not available, stopping
		if (!mt) return;

		for (i = 0; i < mt.children.length; i++) {
			// skip header row
			if (mt.children[i].id === 'head-row') {
				continue;
			}


			try {
				var row = mt.children[i],
				 rowData = JSON.parse(row.dataset.rowData),
				 rowDataDelayed = JSON.parse(row.dataset.delayedRowData);

				ascc.db[row.id] = {};
				ascc.db[row.id]['asin'] = rowData.asin;
				ascc.db[row.id]['created'] = rowData.date;
				ascc.db[row.id]['isAfn'] = rowData.fnsku ? true : false;
				ascc.db[row.id]['name'] = rowData.title;
				ascc.db[row.id]['price'] = rowData.price;
				ascc.db[row.id]['sku'] = rowData.sku;
				ascc.db[row.id]['condition'] = rowDataDelayed['MYIService.OfferCondition'];
				ascc.db[row.id]['type'] = rowData.productType;

				ascc.count++;
			} catch (err) {
				debug('[inventory.init] Looks like page isn\'t ready yet, reloading');
				
				ascc.db = {};

				setTimeout(function() { ascc.init(); }, 2000);

				return;
			}
		}

		debug('[inventory.init] page processed: ' + ascc.page + ' | inventory count: ' + ascc.count);

		// flip page as needed, only in frame request
		if (ascc.ifr) {
			var pages = document.querySelectorAll('.a-pagination li a');

			if (pages) {
				var next = ascc.page + 1;

				for (i = 0; i < pages.length; i++) {
					if (pages[i].innerHTML == next) {
						debug('[inventory.init] flipping to: ' + next);

						// next page exists, flip.
						ascc.page = next;
						pages[i].click();

						setTimeout(function() {
								ascc.init();
							}, 4000);

						// done with the page, lets quit init
						return;
					}
				}
			}
		}

		ascc.port.postMessage({action: 'pageDatabase', page: ascc.page, db: ascc.db, url: document.location.href, frame: ascc.ifr});
	},

	updateMarkers: function(bgDb) {
		debug('[inventory.updateMarkers] Updating markers');

		var e, i, c, n;

		for (e in ascc.db) {
			i = ascc.db[e];
			j = bgDb[i.asin];
			c = '';
			n = document.querySelectorAll('#' + e + '-price input')[0];

			if ( (j) && (j.newPrice) && (n) && (i.price) ) {
				if (i.price < j.newPrice) {
					c = 'green';
				} else if (i.price > j.newPrice) {
					c = 'red';
				}

				if (!isNaN(j.newPrice)) {
					n.value = (Math.round( j.newPrice * 100) / 100).toFixed(2);
				}

				if (c)
					n.style.border = '5px solid ' + c;
			}
		}

		// for future debugging of saving, start here.
		// ascc.ajaxSave(bgDb);
	},

	ajaxSave: function(bgDb) {
		debug('[inventory.ajaxSave] ajaxSave called');


		var payload = {
			"tableId": "myitable",
			"updatedRecords": [],
			"viewContext": {
				"action":"TABLE_SAVED",
				"pageNumber":1,
				"recordsPerPage":250,
				"sortedColumnId":"date",
				"sortOrder":"DESCENDING","searchText":"","tableId":"myitable","filters":[{"filterGroupId":"LISTINGS_VIEW","filterCriteria":[{"value":"true","filterId":"Catalog"}]},{"filterGroupId":"FULFILLMENT","filterCriteria":[{"value":"true","filterId":"AllChannels"}]}],
				"clientState":{"recordsAboveTheFold":"25","enableMultiPageSelect":"true","confirmActionPageMaxRecords":"250","viewId":"FBA","customActionType":""}
			}
		};

		try {
			var f = false;

			for (var e in ascc.db) {
				var i = ascc.db[e];
				var j = bgDb[i.asin];

				if (!j.newPrice) continue;

				if (i.price == j.newPrice) {
					continue;
				}

				f = true;

				payload.updatedRecords.push({
					recordId: e,
					updatedFields: [{
						fieldId: "price",
						changedValue: j.newPrice,
						beforeValue: i.price
					}]
				});
/*

asin: "B002OJDJ6M"condition: "New"created: "06/26/2015 11:13:53"isAfn: truename: "Fairy Tales Rosemary Repel Shampoo, 32 Ounce"price: "22.38"sku: "3K-GR73-493K"type: "BEAUTY"

endpoint
	https://sellercentral.amazon.com/hz/inventory/save?ref_=xx_xx_save_xx

method
	post

Content-Type:application/json

payload
	{
		"tableId":"myitable",
		"updatedRecords":
			[{
				"recordId":"R1UtQ00zMi1OSUw1",
				"updatedFields":
					[{
						"fieldId":"price",
						"changedValue":"81.44",
						"beforeValue":"81.47"
					}]
			}],
			"viewContext":{
				"action":"TABLE_SAVED",
				"pageNumber":1,
				"recordsPerPage":250,
				"sortedColumnId":"date",
				"sortOrder":"DESCENDING","searchText":"","tableId":"myitable","filters":[{"filterGroupId":"LISTINGS_VIEW","filterCriteria":[{"value":"true","filterId":"Catalog"}]},{"filterGroupId":"FULFILLMENT","filterCriteria":[{"value":"true","filterId":"AllChannels"}]}],"clientState":{"recordsAboveTheFold":"25","enableMultiPageSelect":"true","confirmActionPageMaxRecords":"250","viewId":"FBA","customActionType":""}
			}
	}

*/

			}

			if (f) {
				$.ajax({
					type: "POST",
					dataType: "json",
					url: 'https://sellercentral.amazon.com/hz/inventory/save?ref_=xx_xx_save_xx',
					contentType: 'application/json; charset=utf-8',
					data: JSON.stringify(payload),
					success: function(data) {
						debug(['[inventory.ajaxSave] server response', data]);
						ascc.port.postMessage({action: 'saved', page: ascc.page, from: 'hz'});
						ascc.port.postMessage({action: 'pageFinished', page: 1, pages: 1, frame: ascc.ifr});

						document.location.reload(true);
					},
					error: function(data) {
						debug(['[inventory.ajaxSave] remote error', data]);
					},
					timeout: 60000
				});
			} else {
				ascc.port.postMessage({action: 'skipped', page: ascc.page, from: 'hz'});
				ascc.port.postMessage({action: 'pageFinished', page: 1, pages: 1, frame: ascc.ifr});

				debug('[inventory.ajaxSave] nothing to save, skipping');
			}

		} catch (err) {
			debug(['[inventory.ajaxSave] script error', err]);
		}
	},

	trim: function(str) {
		var newstr;
		newstr = str.replace(/^\s*/, "").replace(/\s*$/, ""); 
		newstr = newstr.replace(/\s{2,}/, " "); 
		return newstr;
	},

	format: function (value) {
		if (!value) { return ''; }
		var value = value.toString().split('.');
		var cent = value.length == 1 ? '' : ( value[1].length == 1 ? "." + value[1] + "0" : "." + value[1].substring(0,2) );

		if (!cent) {
			cent = '.00';
		}

		return(value[0] + cent);
	}
}

function debug() {
	if (arguments.length > 0) {
		var d = new Date(Date.now());

		var o = [];
		o.push('[' + d.getHours() + ':'+ ( d.getMinutes() < 9 ? '0' + d.getMinutes() : d.getMinutes() ) + ']');

		for (var i = 0; i < arguments.length; i++) {
			o.push(arguments[i]);
		}

		console.log(o.join(' '));
	}
}

window.addEventListener( "load", function() {
	setTimeout(function() {
			ascc.init();
		}, 4000);

	ascc.port = chrome.extension.connect({name: 'ascc'});
	ascc.port.onMessage.addListener(
		function(request) {
			if (request.action === 'dbReady') {
				// prices processed, let background know
				ascc.port.postMessage({action: 'pageFinished', page: 1, pages: 1, frame: ascc.ifr});
			} else if (request.action == 'save') {
				try {
					debug('[inventory.init] save requested');
					ascc.ajaxSave(request.db);
				} catch (e) {
					ascc.port.postMessage({action: 'exceptionOnSave', page: 1, error: e});
				}
			} else if (request.action == 'updateMarkers') {
				ascc.updateMarkers(request.db);
			}
		});
}, false );