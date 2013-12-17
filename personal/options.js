	var bg, i, exclusions, o;

	function init() {
		bg = chrome.extension.getBackgroundPage();
		exclusions = localStorage['exclusions'];

		if (!exclusions) {
			exclusions = [];
		} else {
			exclusions = exclusions.split(',');
		}
		excludeList();

		// step in cents
		localStorage['step'] = ( localStorage['step'] ? localStorage['step'] : 1 );
		document.getElementById('step').value = localStorage['step'];
		
		// percentages
		localStorage['afnPercentage'] = ( localStorage['afnPercentage'] ? localStorage['afnPercentage'] : 26 );
		localStorage['merchantPercentage'] = ( localStorage['merchantPercentage'] ? localStorage['merchantPercentage'] : 16 );
		document.getElementById('afnPercentage').value = localStorage['afnPercentage'];
		document.getElementById('merchantPercentage').value = localStorage['merchantPercentage'];

		// defaults
		localStorage['defaultMargin'] = ( localStorage['defaultMargin'] ? localStorage['defaultMargin'] : 0 );
		document.getElementById('defaultMargin').value = localStorage['defaultMargin'];
		
		localStorage['defaultShipping'] = ( localStorage['defaultShipping'] ? localStorage['defaultShipping'] : 0 );
		document.getElementById('defaultShipping').value = localStorage['defaultShipping'];

		// formulas
		/* Merchant: Lowest Comp -- minimum + 15% (unless its smaller than OP + M + S) */
		/* minimum: (originalPrice + margin + shipping) + ( ( (originalPrice + margin + shipping) / 100 ) * merchantPercentage ) */
		/* newPrice: { (lowestCompetitor - stepInCents) } or { (minimum) when (lowestCompetitor > minimum) }  */
		localStorage['merchantMinimumFormula'] = ( localStorage['merchantMinimumFormula'] ? localStorage['merchantMinimumFormula'] : '(originalPrice + margin + shipping) + ( ( (originalPrice + margin + shipping) / 100 ) * merchantPercentage )' );
		// dimas: '(originalPrice + margin + shipping) + ( ( (originalPrice + margin + shipping) / 100 ) * merchantPercentage )';
		formulaExample('merchantMinimumFormula');

		/* AFN:  Lowest Comp -- minimum + 25% (unless its smaller than OP + M) */
		/* minimum: (originalPrice + margin) + ( ( (originalPrice + margin) / 100 ) * afnPercentage ) */
		/* newPrice: { (lowestCompetitor - stepInCents) } or { (minimum) when (lowestCompetitor > minimum) } */
		localStorage['afnMinimumFormula'] = ( localStorage['afnMinimumFormula'] ? localStorage['afnMinimumFormula'] : '(originalPrice + margin) + ( ( (originalPrice + margin) / 100 ) * afnPercentage )' );
		// dimas: '(originalPrice + margin) + ( ( (originalPrice + margin) / 100 ) * afnPercentage )';
		formulaExample('afnMinimumFormula');

		// buckets
		localStorage['bucketFeatured'] = ( localStorage['bucketFeatured'] ? localStorage['bucketFeatured'] : true );
		document.getElementById('bucketFeatured').checked = (localStorage['bucketFeatured'] === 'true');

		localStorage['bucketNew'] = ( localStorage['bucketNew'] ? localStorage['bucketNew'] : false );
		document.getElementById('bucketNew').checked = (localStorage['bucketNew'] === 'true');

		localStorage['bucketUsed'] = ( localStorage['bucketUsed'] ? localStorage['bucketUsed'] : false );
		document.getElementById('bucketUsed').checked = (localStorage['bucketUsed'] === 'true');

		localStorage['bucketItem'] = ( localStorage['bucketItem'] ? localStorage['bucketItem'] : false );
		document.getElementById('bucketItem').checked = (localStorage['bucketItem'] === 'true');

		// Amazon.com info
		localStorage['amazonLogin'] = ( localStorage['amazonLogin'] ? localStorage['amazonLogin'] : '' );
		document.getElementById('amazonLogin').value = localStorage['amazonLogin'];

		localStorage['amazonPass'] = ( localStorage['amazonPass'] ? localStorage['amazonPass'] : '' );
		document.getElementById('amazonPass').value = localStorage['amazonPass'];
	}

	function formulaExample(formula) {
		var f = localStorage[formula], ap = localStorage['afnPercentage'], mp = localStorage['merchantPercentage'];
		var price = 100, margin = 10, shipping = 5;

		f = f.replace(/originalPrice/g, price)
				 .replace(/margin/g, margin)
				 .replace(/shipping/g, shipping)
				 .replace(/merchantPercentage/g, mp)
				 .replace(/afnPercentage/g, ap)
				 .replace(/lowestCompetitor/g, 10);

		var p = new MathProcessor();

		document.getElementById(formula + 'Example').innerHTML = '<br>Minimum example:<br>Price: $' + format(price) + ' Margin: $' + format(margin) + ' Shipping: $' + format(shipping) + ' Lowest Competitor: $10<br>' + 'Formula: ' + f + ' = $' + format( p.parse(f) );

		document.getElementById(formula + 'String').innerHTML = '<b>Current formula: </b>' + localStorage[formula];
	}

	function excludeList() {
		o = '';
		for (i = 0; i < exclusions.length; i++) {
			if (exclusions[i].indexOf('.jpg') != -1) {
				o += '<span><button id="excluded-' + i + '" alt="delete" ascc-excluded-id="' + i + '">X</button><img src="' + exclusions[i] + '"/><br></span>';
			} else {
				o += '<span><button id="excluded-' + i + '" alt="delete" ascc-excluded-id="' + i + '">X</button>' + exclusions[i] + '<br></span>';
			}
		}

		document.getElementById('excludeList').innerHTML = o;

		for (i = 0; i < exclusions.length; i++) {
			document.getElementById('excluded-' + i).addEventListener('click', function () { excludeDelete(this.getAttribute('ascc-excluded-id')); });
		}
	}

	function excludeNew() {
		i = document.getElementById('newExclude').value;
		i = i.trim();

		if (!i) {
			return;
		}

		document.getElementById('newExclude').value = '';
		exclusions.push(i);
		localStorage['exclusions'] = exclusions.join(',');
		excludeList();
	}

	function excludeDelete(index) {
		exclusions.splice(index, 1);
		localStorage['exclusions'] = exclusions.join(',');
		excludeList();
	}

	function save(prop) {
		i = document.getElementById(prop).value;

		if (!i) {
			return;
		}

		localStorage[prop] = i;

		formulaExample('merchantMinimumFormula');
		formulaExample('afnMinimumFormula');
	}

	function saveCheckbox(prop) {
		if (document.getElementById(prop).checked) {
			localStorage[prop] = 'true';
		} else {
			localStorage[prop] = 'false';
		}
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

document.addEventListener('DOMContentLoaded', function () {
	init();
	document.getElementById('addExclude').addEventListener('click', function () { excludeNew(); });
	document.getElementById('afnMinimumFormula').addEventListener('change', function () { save('afnMinimumFormula'); });
	document.getElementById('merchantMinimumFormula').addEventListener('change', function () { save('merchantMinimumFormula'); });
	document.getElementById('afnPercentage').addEventListener('change', function () { save('afnPercentage'); });
	document.getElementById('merchantPercentage').addEventListener('change', function () { save('merchantPercentage'); });
	document.getElementById('step').addEventListener('change', function () { save('step'); });
	document.getElementById('defaultMargin').addEventListener('change', function () { save('defaultMargin'); });
	document.getElementById('defaultShipping').addEventListener('change', function () { save('defaultShipping'); });
	document.getElementById('amazonLogin').addEventListener('change', function () { save('amazonLogin'); });
	document.getElementById('amazonPass').addEventListener('change', function () { save('amazonPass'); });

	document.getElementById('bucketFeatured').addEventListener('change', function () { save('bucketFeatured'); });
	document.getElementById('bucketNew').addEventListener('change', function () { save('bucketNew'); });
	document.getElementById('bucketUsed').addEventListener('change', function () { save('bucketUsed'); });
	document.getElementById('bucketItem').addEventListener('change', function () { save('bucketItem'); });
});