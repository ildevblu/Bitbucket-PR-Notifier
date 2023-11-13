

const storageCache = { bbUrl: null };

const initStorageCache = chrome.storage.sync.get().then((items) => {
// Copy the data retrieved from storage into storageCache.
	Object.assign(storageCache, items);
});

const updatePRBadgeCount = async () => {
	try {
		await initStorageCache;

		if(!storageCache.bbUrl) throw "bitBucket Url not set";

		fetch(`${storageCache.bbUrl}/rest/api/latest/inbox/pull-requests?role=REVIEWER&start=0&limit=10&avatarSize=64&withAttributes=true&state=OPEN&order=oldest`)
		.then((response) => response.json())
		.then((json) => {
			if(json.size) {
				// Update badge color and count
				chrome.action.setBadgeBackgroundColor({ color: "#FF2020" }); // Imposta il colore di sfondo trasparente
				chrome.action.setBadgeText({ text: "" + json.size });
			} else {
				chrome.action.setBadgeText({text: ""});
			}
		}); 
	} catch (e) {
	console.log(e);
	}	
}

updatePRBadgeCount();

setInterval(function() {
   updatePRBadgeCount();
}, 10000);

