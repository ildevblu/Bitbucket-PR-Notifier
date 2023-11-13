const storageCache = {bbUrl : null};

const setupSection = document.querySelector("#setupSection");
const setupBtn = document.querySelector("#setupBtn");
const bitbucketUrlTxt = document.querySelector("#bitbucketUrl");
const bitbucketErrorLabel = document.querySelector("#bitbucketErrorLabel");

const prSection = document.querySelector("#prSection");
const clearStorageBtn = document.querySelector("#clearStorageBtn");
const prListUL = document.querySelector("#prList");

document.addEventListener("DOMContentLoaded", async () => {
  // step 1: check if app is already setup
  const storage = await chrome.storage.sync.get();
  // step 2: update storage cache
  Object.assign(storageCache, storage);
  // step 3: if setup ok > show list, else show setup
  if (storageCache.bbUrl) {
    fetch(
      `${storageCache.bbUrl}/rest/api/latest/inbox/pull-requests?role=REVIEWER&start=0&limit=10&avatarSize=64&withAttributes=true&state=OPEN&order=oldest`
    )
      .then((response) => response.json())
      .then((json) => {
        updatePRBadgeCount(json.size);
        showPRs(json.values);
        prSection.removeAttribute("hidden");
      });
  } else {
    updatePRBadgeCount(0);
    setupSection.removeAttribute("hidden");
  }
});

const afterSetup = async (bbUrl) => {
  storageCache.bbUrl = bbUrl;
  await chrome.storage.sync.set(storageCache);

  if (bbUrl) {
    setupSection.setAttribute("hidden", true);
    prSection.removeAttribute("hidden");
  } else {
    prSection.setAttribute("hidden", true);
    setupSection.removeAttribute("hidden");
    updatePRBadgeCount(0);
  }
};

clearStorageBtn.addEventListener("click", async (ev) => {
  afterSetup(null);
});

setupBtn.addEventListener("click", async (ev) => {
  const bbUrl = bitbucketUrlTxt.value;
  if (!bbUrl) return;

  try {
    const response = await fetch(
      `${bbUrl}/rest/api/latest/inbox/pull-requests?role=REVIEWER&start=0&limit=10&avatarSize=64&withAttributes=true&state=OPEN&order=oldest`
    );
    const jsonResp = await response.json();

    afterSetup(bbUrl);
    showPRs(jsonResp.values);
    updatePRBadgeCount(jsonResp.size);
  } catch (e) {
    bitbucketErrorLabel.removeAttribute("hidden");
  }
});

const updatePRBadgeCount = (count) => {
  if (count) {
    // Update badge color and count
    chrome.action.setBadgeBackgroundColor({ color: "#FF2020" }); // Imposta il colore di sfondo trasparente
    chrome.action.setBadgeText({ text: "" + count });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
};

const showPRs = (prList) => {
  prListUL.innerHTML = "";
  prList.forEach((pr) => {
    prListUL.innerHTML += `<li><a target="_blank" href="${pr.links.self[0]?.href}">${pr.title}</a><div>${pr.description}</div></li>`;
  });
};
