

const updatePRBadgeCount = async () => {
	try {
		const storage = await chrome.storage.sync.get();
		if(!storage.bbUrl) throw "bitBucket Url not set";

		const prCount = await(await fetch(`${storage.bbUrl}/rest/api/latest/inbox/pull-requests/count`)).json();	
		chrome.action.setBadgeText({ text: prCount.count ? "" + prCount.count : ""});
	} catch (e) {
		chrome.action.setBadgeText({text: ""});
		console.log(e);
	}	
}

chrome.action.setBadgeBackgroundColor({ color: "#FF2020" });
chrome.action.setBadgeTextColor({color:"white"});

updatePRBadgeCount();

setInterval(function() {
   updatePRBadgeCount();
}, 120000);

