var bg = chrome.extension.getBackgroundPage();

function init() {
	document.getElementById('status').innerHTML = (bg.disabled ? 'Off' : 'On' );
	document.getElementById('status').style.color = (bg.disabled ? 'red' : 'green' );
	document.getElementById('currentStatus').innerHTML = bg.currentStatus;
	document.getElementById('runs').innerHTML = bg.runs;
	document.getElementById('save').innerHTML = (bg.disabled ? 'Enable' : 'Disable' );
	document.getElementById('last').innerHTML =  (bg.lastRunTime ? (bg.lastRunTime.toLocaleDateString() + " " + bg.lastRunTime.toLocaleTimeString()) : ''  );

	if (bg.runs === 0) {
		document.getElementById('runs-row').style.display = 'none';
		document.getElementById('last-row').style.display = 'none';
	}
}

function enableBackground() {
	if (bg.hasExpired()) {
		chrome.tabs.create({ url: 'purchase.html'});
		return;
	}

	bg.disabled = !bg.disabled;
	bg.heartbeatSensor();
	// load iframe to kick off the process.
	bg.startBackground();
	window.close();
}

function openDb() {
	chrome.tabs.create({ url: 'database.html'});
	window.close();
}

function updateCompetitors() {
	bg.updateCompetitors();
	window.close();
}

function loadItems() {
	bg.pageFlag = false;
	bg.loadItems();
	window.close();
}

function options() {
	chrome.tabs.create({ url: 'options.html'});
	window.close();
}

document.addEventListener('DOMContentLoaded', function () {
	init();
	document.getElementById('save').addEventListener('click', function () { enableBackground(); });
	document.getElementById('options').addEventListener('click', function () { options(); });
	document.getElementById('db').addEventListener('click', function () { openDb(); });
});