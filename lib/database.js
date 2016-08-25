	// TODO: arrow relation to original price or set price or competitor?

	var bg, step = Math.round( parseInt( ( localStorage['step'] ? localStorage['step'] : 1 ) ) * 100) / 100 / 100,
	 afnPercentage = parseInt( ( localStorage['afnPercentage'] ? localStorage['afnPercentage'] : 26 ) ),
	 merchantPercentage = parseInt( ( localStorage['merchantPercentage'] ? localStorage['merchantPercentage'] : 16 ) ),
	 merchantMinimumFormula = ( localStorage['merchantMinimumFormula'] ? localStorage['merchantMinimumFormula'] : '(originalPrice + margin + shipping) + ( ( (originalPrice + margin + shipping) / 100 ) * merchantPercentage )' ),
	 afnMinimumFormula = ( localStorage['afnMinimumFormula'] ? localStorage['afnMinimumFormula'] : '(originalPrice + margin) + ( ( (originalPrice + margin) / 100 ) * afnPercentage )' );

	function init() {
		bg = chrome.extension.getBackgroundPage();
		var c = 1, e = '', t = document.getElementById('db');

		for (var i in bg.db) {
			var s = '<tr>';
			s += '<td>' + c + '</td>';
			s += '<td style="white-space:nowrap;">' + i + '</td>';
			s += '<td style="white-space:nowrap;">' + bg.db[i].sku + '</td>';
			s += '<td>' + bg.db[i].name + '</td>';
			s += '<td>' + (bg.db[i].isAfn ? 'AFN' : 'Merchant') + '</td>';
			s += '<td>' + (bg.db[i].condition ? bg.db[i].condition : '') + '</td>';
			s += '<td>' + format((bg.db[i].price ? bg.db[i].price : '')) + '</td>';
			s += '<td>' + format(bg.db[i].lowestCompetitor ? bg.db[i].lowestCompetitor : '') + '</td>';

			// original price
			s += '<td align="center"><input type="text" id="originalPrice-' + i + '" value="' + (bg.db[i].originalPrice ? bg.db[i].originalPrice : '') +
				'" size="2" maxlength="50"></td>';

			// shipping
			if (!bg.db[i].isAfn) {
				s += '<td align="center"><input type="text" id="shipping-' + i + '" value="' + (bg.db[i].shipping ? bg.db[i].shipping : '') +
 					'" size="2" maxlength="50"></td>';
			} else {
				s += '<td>&nbsp;</td>';
			}

			// margin
			s += '<td><input type="text" id="margin-' + i + '" value="' + (bg.db[i].margin ? bg.db[i].margin : '') + '" size="2" maxlength="50" style="margin-left: 3px;"></td>';

			s += '<td id="minimum-' + i + '">' + format(bg.db[i].minimumPrice ?  (Math.round( bg.db[i].minimumPrice * 100 ) /100) : '') + '</td>';
			s += '<td id="newPrice-' + i + '" nowrap>' + arrow(i) + format(bg.db[i].newPrice ? bg.db[i].newPrice : '') + '</td>';
			s += '</tr>';

			e += s;
			c++;
		}

		t.innerHTML = t.innerHTML + e;

		for (var i in bg.db) {
			try {
				document.getElementById('originalPrice-' + i).addEventListener('change', function (e) { var id = e.srcElement.id.replace('originalPrice-', ''); update('originalPrice', id); });
				document.getElementById('margin-' + i).addEventListener('change', function (e) { var id = e.srcElement.id.replace('margin-', ''); update('margin', id); });
				if (!bg.db[i].isAfn)
					document.getElementById('shipping-' + i).addEventListener('change', function (e) { var id = e.srcElement.id.replace('shipping-', ''); update('shipping', id); });
			} catch (err) {
				console.log('[database.init] error attaching event');
			}
		}
	}

	function update(prop, asin, nv) {
		var v = document.getElementById(prop + '-' + asin).value;

		if (nv) { v = nv; }

		bg.db[asin][prop] = v;

		localStorage[asin + '|' + prop] = v;

		updatePriceAndMinimum(asin);
	}

	function updatePriceAndMinimum(asin) {
		var c = document.getElementById('minimum-' + asin);

		if (bg.db[asin].isAfn) {
			bg.db[asin].minimumPrice = parseFloat( bg.db[asin].originalPrice ) + parseFloat( bg.db[asin].margin );
			bg.db[asin].minimumPrice = bg.db[asin].minimumPrice + ( (bg.db[asin].minimumPrice / 100) * afnPercentage);

			if (bg.db[asin].lowestCompetitor) {
				bg.db[asin].newPrice = parseFloat( bg.db[asin].lowestCompetitor );

				if (bg.db[asin].newPrice >= bg.db[asin].minimumPrice) {
					bg.db[asin].newPrice = Math.round( (bg.db[asin].lowestCompetitor - step) * 100) / 100;
				} else {
					bg.db[asin].newPrice = Math.round( bg.db[asin].minimumPrice * 100) / 100;
				}
			} else {
				if (bg.db[asin].price <= bg.db[asin].minimumPrice) {
					bg.db[asin].newPrice = bg.db[asin].minimumPrice;
				} else {
					bg.db[asin].newPrice = bg.db[asin].price;
				}
			}
		} else {
			bg.db[asin].minimumPrice = parseFloat( bg.db[asin].originalPrice ) + parseFloat( bg.db[asin].margin ) + parseFloat( bg.db[asin].shipping );
			bg.db[asin].minimumPrice = bg.db[asin].minimumPrice + ( (bg.db[asin].minimumPrice / 100) * merchantPercentage);

			if (bg.db[asin].lowestCompetitor) {
				bg.db[asin].newPrice = parseFloat( bg.db[asin].lowestCompetitor );

				if (bg.db[asin].newPrice >= bg.db[asin].minimumPrice) {
					bg.db[asin].newPrice = Math.round( (bg.db[asin].lowestCompetitor - step) * 100) / 100;
				} else {
					bg.db[asin].newPrice = Math.round( bg.db[asin].minimumPrice * 100) / 100;
				}
			} else {
				if (bg.db[asin].price <= bg.db[asin].minimumPrice) {
					bg.db[asin].newPrice = bg.db[asin].minimumPrice;
				} else {
					bg.db[asin].newPrice = bg.db[asin].price;
				}
			}
		}

		c.innerHTML = format(bg.db[asin].minimumPrice ?  (Math.round( bg.db[asin].minimumPrice * 100 ) / 100) : '');

		c = document.getElementById('newPrice-' + asin);
		c.innerHTML = arrow(asin) + format(bg.db[asin].newPrice ? bg.db[asin].newPrice : '');
	}

	function format(value) {
		if (!value) { return ''; }
		var value = value.toString().split('.');
		var cent = value.length == 1 ? '' : ( value[1].length == 1 ? "." + value[1] + "0" : "." + value[1].substring(0,2) );

		if (!cent) {
			cent = '.00';
		}

		return(value[0] + cent);
	}

	function arrow(asin) {
		var a = '';

		if (bg.db[asin].price < bg.db[asin].newPrice) {
			// up
			a = '<i class="fa fa-arrow-up" style="color:green;"></i> ';//<img src="images/up.gif"> ';
		} else if (bg.db[asin].price > bg.db[asin].newPrice) {
			// down
			a = '<i class="fa fa-arrow-down" style="color:red;"></i> ';
		}

		return a;
	}

	function resetDb() {
		if (!bg.disabled) {
			alert('Extensions is in the middle of processing items.\nPlease disable the process first');
			return;
		} else {
			bg.resetDb();
			window.location.reload();
		}
	}

	function applyDefault(prop) {
		var confirm = window.confirm('This will overwrite all other setting for this property.\nAre you sure?');

		if (!confirm) { return };

		if (prop == 'margin') {
			for (var i in bg.db) {
 				update('margin', i, localStorage['defaultMargin']);
			}
		} else if (prop == 'shipping') {
			for (var i in bg.db) {
				if (!bg.db[i].isAfn) {
					update('shipping', i, localStorage['defaultShipping']);
	   		}
			}
		}

		window.location.reload();
	}

	function loadItems() {
		document.getElementById('loader').style.display = '';

		console.log('[database.loadItems] loading items');
		bg = chrome.extension.getBackgroundPage();
		bg.pageFlag = false;
		bg.loadItems();
		setTimeout(function() {
			window.location.reload();
		}, 20 * 1000);
	}

	function updateCompetitors() {
		if (bg.hasExpired()) {
			chrome.tabs.create({ url: 'purchase.html'});
			return;
		}

		$('#updateCompetitors').popover('destroy');

		if (_.isEmpty(bg.db)) {
			$('#updateCompetitors').popover({
				title:'Database Empty',
				placement:'bottom',
				content:'You will need to load your items from the seller central first.'
			});

			$('#updateCompetitors').popover('show');

			setTimeout(function() {
				$('#updateCompetitors').popover('destroy');
			}, 3 * 1000);

			return;
		}

		var readyDb = _.filter(bg.db, function(entry) {
				if (entry.isAfn) {
					if ( (!entry.margin) || (!entry.originalPrice) )
						return false;
				} else {
					if ( (!entry.margin) || (!entry.originalPrice) || (!entry.shipping) )
						return false;
				}

				return true;
		});

		var manual = true;
		if (_.isEmpty(readyDb)) {
			$('#updateCompetitors').popover({
				title:'Warning',
				placement:'bottom',
				content:'Manual competitor price retrieval will now occur, but for automated repricing you will need to fill in the items margin, shipping, and original prices.'
			});

			$('#updateCompetitors').popover('show');

			setTimeout(function() {
				$('#updateCompetitors').popover('destroy');
			}, 5 * 1000);
		} else if (_.size(readyDb) != _.size(bg.db)) {
			$('#updateCompetitors').popover({
				title:'Warning',
				placement:'bottom',
				content:'Retrieving prices only for items that are completely set up.'
			});

			$('#updateCompetitors').popover('show');

			setTimeout(function() {
				$('#updateCompetitors').popover('destroy');
			}, 5 * 1000);

			manual = false;
		}

		document.getElementById('loader').style.display = '';
		bg.updateCompetitors(manual);

		setInterval(function() {
			if (!bg.updatingCompetitors) {
				setTimeout( function() {
					window.location.reload();
				}, 5 * 1000);
			}
		}, 1 * 1000);
	}

document.addEventListener('DOMContentLoaded', function () {
	init();
	document.getElementById('loadItems').addEventListener('click', function () { loadItems(); });
	document.getElementById('updateCompetitors').addEventListener('click', function () { updateCompetitors(); });
	document.getElementById('applyDefaultMargin').addEventListener('click', function () { applyDefault('margin'); });
	document.getElementById('applyDefaultShipping').addEventListener('click', function () { applyDefault('shipping'); });
	document.getElementById('resetDb').addEventListener('click', function () { resetDb(); });
	document.getElementById('loadItems').addEventListener('click', function () { loadItems(); });
	document.getElementById('options').addEventListener('click', function () { chrome.tabs.create({ url: 'options.html'}); });
});
