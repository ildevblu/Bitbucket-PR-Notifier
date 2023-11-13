const storageCache = { bbUrl: null };

const initStorageCache = chrome.storage.sync.get().then((items) => {
  // Copy the data retrieved from storage into storageCache.
  Object.assign(storageCache, items);
});

const afterSetup = (bbUrl) => {
  storageCache.bbUrl = bbUrl;
  chrome.storage.sync.set(storageCache);
};

const setupBtn = document.querySelector("#setupBtn");
setupBtn.addEventListener("click", async (ev) => {
  const bitbucketUrlTxt = document.querySelector("#bitbucketUrl");
  const bbUrl = bitbucketUrlTxt.value;
  if (!bbUrl) return;

  try {
    const response = await fetch(
      `${bbUrl}/rest/api/latest/inbox/pull-requests?role=REVIEWER&start=0&limit=10&avatarSize=64&withAttributes=true&state=OPEN&order=oldest`
    );
    const jsonResp = await response.json();

    afterSetup(bbUrl);
    showPRs(jsonResp.values);
  } catch (e) {
    console.log(e);
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  // step 1: check if app is already setup
  await initStorageCache;
  // step 2: if setup ok > show list, else show setup
  if (storageCache.bbUrl) {
    fetch(
      `${storageCache.bbUrl}/rest/api/latest/inbox/pull-requests?role=REVIEWER&start=0&limit=10&avatarSize=64&withAttributes=true&state=OPEN&order=oldest`
    )
      .then((response) => response.json())
      .then((json) => {
        updatePRBadgeCount(json.size);
        showPRs(json.values);
        document.querySelector("#prSection").removeAttribute("hidden");
      });
  } else {
    document.querySelector("#setupSection").removeAttribute("hidden");
  }
});

const updatePRBadgeCount = (count) => {
  if(count) {
    // Update badge color and count
    chrome.action.setBadgeBackgroundColor({ color: "#FF2020" }); // Imposta il colore di sfondo trasparente
    chrome.action.setBadgeText({ text: "" + count });
  } else {
    chrome.action.setBadgeText({text: ""});
  }
}

const showPRs = (prList) => {
  const prListUL = document.querySelector("#prList");
  prList.forEach((pr) => {
    prListUL.innerHTML += `<li><a target="_blank" href="${pr.links.self[0]?.href}">${pr.title}</a><div>${pr.description}</div></li>`;
  });

  // browserAction.onClicked.addListener(function (tab) {
  //   console.log("Icona cliccata!");
  // });
};
