var ascc = {};
ascc = {
	page: 1,
	pages: 0,
	port: null,
	db: {},
	ifr: false,
	expired: false,

	init: function() {
		var cols, b, tbody, i, e, p, row, rowNum = {}, c = 0, mt = document.querySelector('.manageTable');

		// check if the user is logged in.
		if (document.title == 'Expired Session') {
			ascc.expired = true;
		}

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

		// if logged out and its a work frame, attempt to force login.
		if (ascc.expired && ascc.ifr) {
			ascc.port = chrome.extension.connect({name: 'ascc'});
			ascc.port.postMessage({action: 'pageExpired'});

			return;
		}

		// manageTable not available, stopping
		if (!mt) return;

		// Read the columns
		var cols = document.getElementsByClassName('subToolBar')[0];
		for (i = 0; i < cols.children.length; i++) {
			b = cols.children[i];

			if (b.children.length > 0) {
				b = b.children[0];
			}

			b = this.trim(b.innerHTML);

			if ( b == 'Merchant SKU' ) {
				rowNum['sku'] = i;
			} else if ( b == 'ASIN/ISBN' ) {
				rowNum['asin'] = i;
			} else if ( b == 'Product Name' ) {
				rowNum['name'] = i;
			} else if ( b == 'Available' ) {
				rowNum['quantity'] = i;
			} else if ( b == 'Your Price' ) {
				rowNum['price'] = i;
			} else if ( b == 'Low Price' ) {
				rowNum['lowPrice'] = i;
			} else if ( b == 'Fulfilled By' ) {
				rowNum['by'] = i;
			} else if ( b == 'Date Created' ) {
				rowNum['created'] = i;
			} else if ( b == 'Condition' ) {
				rowNum['condition'] = i;
			} else if ( b == 'Status' ) {
				rowNum['status'] = i;
			}
		}

		for (b = 0; b < mt.children.length; b++) {
			tbody = mt.children[b];

			// this occurs when you have sub children of an item.
			if ( (tbody.id) || (tbody.id != '') ) {continue;}

			for (i = 0; i < tbody.children.length; i++) {
				row = tbody.children[i];
				if (row.id) {
					if (this.trim(row.children[rowNum['status']].children[0].innerHTML.toLowerCase())  != 'active') {
						continue;
					}

					this.db[c] = {};
					this.db[c]['id'] = row.id;
					(rowNum['sku']) && (this.db[c]['sku'] = row.children[rowNum['sku']].innerHTML);
					(rowNum['asin']) && (this.db[c]['asin'] = this.trim(row.children[rowNum['asin']].firstChild.innerHTML));
					(rowNum['name']) && (this.db[c]['name'] = this.trim(row.children[rowNum['name']].firstChild.innerHTML));
					(rowNum['created']) && (this.db[c]['created'] = row.children[rowNum['created']].innerHTML);
					(rowNum['condition']) && (this.db[c]['condition'] = this.trim(row.children[rowNum['condition']].children[0].innerHTML));

					try {
						if ( row.children[rowNum['quantity']].children.length == 1 )
							this.db[c]['isAfn'] = true;
						else {
							this.db[c]['quantity'] = row.children[rowNum['quantity']].children[1].value;
							this.db[c]['quantityInput'] = row.children[rowNum['quantity']].children[0].firstChild;

							// skip the item if quantity is 0
							if (this.db[c]['quantity'] == 0) continue;
						}

						p = document.getElementsByName('price|' + this.db[c]['sku'] + '|' + this.db[c]['asin']);
						p = p[0];
						this.db[c]['price'] = parseFloat(p.value);
						this.db[c]['priceInput'] = p;
					} catch (err) {
						console.log(['error reading inventory', err]);
					}
				}

				c++;
			}
		}

		this.getPages();

		// prices processed, let background know
		ascc.port = chrome.extension.connect({name: 'ascc'});
		ascc.port.onMessage.addListener(
		  function(request) {
		    if (request.action == 'save') {
		    	try {
					console.log('save requested');
					ascc.ajaxSave(request.db);
					//ascc.save(request.db);
				} catch (e) {
					ascc.port.postMessage({action: 'exceptionOnSave', page: ascc.page, error: e});
				}
		    } else if (request.action == 'flipPage') {
		    	ascc.goto(request.page);
		    } else if (request.action == 'updateMarkers') {
		    	ascc.updateMarkers(request.db);
		    }
		});

		ascc.port.postMessage({action: 'pageFinished', page: ascc.page, pages: ascc.pages, frame: ascc.ifr});


		var db = {};
		for (e in ascc.db) {
			db[ascc.db[e].id] = {};
			db[ascc.db[e].id]['asin'] = ascc.db[e].asin;
			db[ascc.db[e].id]['created'] = ascc.db[e].created;
			db[ascc.db[e].id]['isAfn'] = ascc.db[e].isAfn;
			db[ascc.db[e].id]['name'] = ascc.db[e].name;
			db[ascc.db[e].id]['price'] = ascc.db[e].price;
			db[ascc.db[e].id]['sku'] = ascc.db[e].sku;
			db[ascc.db[e].id]['condition'] = ascc.db[e].condition;
		}

		ascc.port.postMessage({action: 'pageDatabase', page: ascc.page, db: db, url: document.location.href, frame: ascc.ifr});
	},

	getPages: function() {
		var e = document.getElementById('goToPage');

		if (e) {
			this.page = e.value;
			e = e.parentNode;
			this.pages = e.lastChild.textContent.replace(' of ', ''); // of X
		} else {
			// pager missing, most likely only a single page.
			this.page = 1;
			this.pages = 1;
		}
	},

	updateMarkers: function(bgDb) {
		console.log('Updating markers');

		var e, i, c, n;

		for (e in ascc.db) {
			i = ascc.db[e];
			j = bgDb[i.asin];
			c = '';

			if ( (j) && (j.newPrice) && (i.priceInput) && (i.price) ) {
				if (i.price < j.newPrice) {
					c = 'green';

					if (!isNaN(j.newPrice))
						i.priceInput.value = Math.round( j.newPrice * 100) / 100;
				} else if (i.price > j.newPrice) {
					c = 'red';
				}

				if (c)
					i.priceInput.style.border = '2px solid ' + c;
			}
		}

		// for future debugging of saving, start here.
		// ascc.ajaxSave(bgDb);
	},

	ajaxSave: function(bgDb) {
		console.log('ajaxSave called');

		try {
			var f;
			for (var i = 0; i < document.getElementsByTagName('form').length; i++) {
				if ( 'itemSummaryForm' == this.trim(document.getElementsByTagName('form')[i].name) ) {
					f = document.getElementsByTagName('form')[i];
				}
			}

			if ( !f || !f.elements ) {
				return;
			}

			var action = f.action;
			action = action.replace(/;jsessionid=[\d|\D|0-9]*/g,"");
			action += ".ajax";
			var params = new Array();
			var priceMetricDataJsonString = {};

			for (var e in ascc.db) {
				var i = ascc.db[e];
				var j = bgDb[i.asin];
				var key = 'price|' + i.sku + '|' + i.asin;


				if (!j.newPrice) continue;

				if (i.price == j.newPrice) {
					continue;
				}

				i.priceInput.value = Math.round( j.newPrice * 100) / 100;

				priceMetricDataJsonString[i.sku] = {"lowPriceShippingCharge":null,"lowPriceItemPrice":null,"yourPriceShippingCharge":" $0.00","salePrice":null};

				if (f.elements[key].length > 1) {
					for (index = 0; index < f.elements[key].length; ++index) {
						f.elements[key] = f.elements[key][index];
						f.elements['H' + key] = f.elements['H' + key][index];
						f.elements['HL' + key] = f.elements['HL' + key][index];
					}
				}
				
				params.push(f.elements[key]);
				params.push(f.elements['H' + key]);
			}

			if (params.length > 0) {
				f.elements['formOperation'].value = 'ajaxUpdate';
				params.push(f.elements['formOperation']);
				params.push(f.elements['marketplaceID']);

				priceMetricDataJsonString = JSON.stringify(priceMetricDataJsonString);
				var postData = jQuery.param(params) + "&pricingMetricsJson=" + priceMetricDataJsonString;

				console.log(['ascc inject data', action, postData]);

				$.ajax({
					type: "POST",
					dataType: "json",
					url: action,
					data: postData,
					success: function(data) {
						console.log(['[ascc.ajaxSave server response]', data]);
						ascc.port.postMessage({action: 'saving', page: ascc.page});

						document.location.reload(true);
					},
					error: function(data) {
						console.log(['[ascc.ajaxSave remote error]', data]);
					},
					timeout: 60000
				});
			}
		} catch (err) {
			console.log(['[ascc.ajaxSave script error]', err]);
		}
	},

	// this currently seems not to work.
	save: function(bgDb) {
		var i, j, evt, e;

		// process database items and then save.
		for (e in ascc.db) {
			i = ascc.db[e];
			j = bgDb[i.asin];

			if ( (j) && (j.newPrice) && (i.priceInput) && (i.price) ) {
				if (i.price != j.newPrice) {
					console.log('Setting new price for: ' + i.asin + ' previous: ' + i.price + ' new: ' + j.newPrice);
					i.priceInput.value = Math.round( j.newPrice * 100) / 100;
				} else {
					// console.log('Price unchanged for: ' + i.asin + ' skipping');
				}
			}
		}

		ascc.port.postMessage({action: 'saving', page: ascc.page});

		e = document.getElementsByTagName('form');
		for (i = 0; i < e.length; i++) {
			if ( 'itemSummaryForm' == this.trim(e[i].name) ) {
				e[i].formOperation.value = 'saveChanges';
				e[i].submit();
			}
		}
	},

	goto: function(page) {
		document.location.href = 'https://sellercentral.amazon.com/myi/search/ProductSummary?searchPageOffset=' + page;
	},

	trim: function(str) {
		var newstr;
		newstr = str.replace(/^\s*/, "").replace(/\s*$/, ""); 
		newstr = newstr.replace(/\s{2,}/, " "); 
		return newstr;
	}
}

window.addEventListener( "load", function() {
	setTimeout(function() {
			ascc.init();
		}, 2000);
}, false );