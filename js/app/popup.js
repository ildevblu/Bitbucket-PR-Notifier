const storageCache = { bbUrl: null, lastBbUrl: null };

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
    const prs = fetch(
      `${storageCache.bbUrl}/rest/api/latest/inbox/pull-requests?role=REVIEWER&start=0&limit=10&avatarSize=64&withAttributes=true&state=OPEN&order=oldest`
    ).then((response) => response.json());
    const recent = fetch(
      `${storageCache.bbUrl}/rest/awesome-graphs/latest/people/recent`
    ).then((response) => response.json());

    Promise.all([prs, recent])
      .then(async ([prs, recent]) => {
        await updateSelfProfile(recent);
        updatePRBadgeCount(prs.size);
        showPRs(prs.values);
        prSection.removeAttribute("hidden");
      })
      .catch((error) => {
        console.error(error);
      });
  } else {
    updatePRBadgeCount(0);
    showSetupSection();
  }
});

const updateSelfProfile = async (profile) => {
  storageCache.email = profile[0]?.meta[0];
  await chrome.storage.sync.set(storageCache);
};

const showSetupSection = () => {
  if (storageCache.lastBbUrl) {
    bitbucketUrlTxt.value = storageCache.lastBbUrl;
  }
  setupSection.removeAttribute("hidden");
};

const afterSetup = async (bbUrl) => {
  if (storageCache.bbUrl) storageCache.lastBbUrl = storageCache.bbUrl; // save last bbUrl
  storageCache.bbUrl = bbUrl;

  await chrome.storage.sync.set(storageCache);

  if (bbUrl) {
    setupSection.setAttribute("hidden", true);
    prSection.removeAttribute("hidden");
  } else {
    prSection.setAttribute("hidden", true);
    showSetupSection();
    updatePRBadgeCount(0);
  }
};

clearStorageBtn.addEventListener("click", async (ev) => {
  await afterSetup(null);
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
    chrome.action.setBadgeBackgroundColor({ color: "#FF2020" });
    chrome.action.setBadgeText({ text: "" + count });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
};

const showReviewers = (pr) => {
  let htmlOutput = "";

  //find ourselves
  const selfProfile = pr.reviewers.find(
    (reviewer) => reviewer.user.emailAddress === storageCache.email
  );
  let remainingReviewers = pr.reviewers.filter(
    (reviewer) => reviewer.user.emailAddress !== storageCache.email
  );
  // find others by status
  const unapprovedReviewers = remainingReviewers.filter(
    (reviewer) => reviewer.status === "UNAPPROVED"
  );
  const approvedReviewers = remainingReviewers.filter(
    (reviewer) => reviewer.status === "APPROVED"
  );
  const needWorkReviewers = remainingReviewers.filter(
    (reviewer) =>
      reviewer.status !== "APPROVED" && reviewer.status !== "UNAPPROVED"
  );

  let needWorkReviewersToShow = 0;
  let approvedReviewersToShow = 0;
  let unapprovedReviewersToShow = 2;

  if (needWorkReviewers.length > 0) {
    unapprovedReviewersToShow--;
    needWorkReviewersToShow++;
  }

  if (approvedReviewers.length > 0) {
    unapprovedReviewersToShow--;
    approvedReviewersToShow++;
  }

  if (pr.properties?.commentCount) {
    htmlOutput += `<span class="comments"><img class="commentIcon" src="../../img/speech.png">${pr.properties.commentCount}</span>`;
  }

  if (pr.reviewers.length > 3) {
    htmlOutput += `<span class="avatar reviewer others">${
      pr.reviewers.length - 3
    }</span>`;
  }

  for (
    let i = 0;
    i < approvedReviewersToShow && i < approvedReviewers.length;
    i++
  ) {
    htmlOutput += `<span class="badge"><img class="badgeIcon" src="../../img/check.svg"></span>`;
    htmlOutput += `<img class="avatar reviewer" src=${storageCache.bbUrl}${approvedReviewers[i]?.user?.avatarUrl}>`;
  }

  for (
    let i = 0;
    i < unapprovedReviewersToShow && i < unapprovedReviewers.length;
    i++
  ) {
    htmlOutput += `<img class="avatar reviewer" src=${storageCache.bbUrl}${unapprovedReviewers[i]?.user?.avatarUrl}>`;
  }

  for (
    let i = 0;
    i < needWorkReviewersToShow && i < needWorkReviewersToShow.length;
    i++
  ) {
    htmlOutput += `<span class="badge"><img class="badgeIcon needwork" src="../../img/needwork.png"></span>`;
    htmlOutput += `<img class="avatar reviewer" src=${storageCache.bbUrl}${needWorkReviewers[i]?.user?.avatarUrl}>`;
  }

  htmlOutput += `<img class="avatar reviewer" src=${storageCache.bbUrl}${selfProfile.user?.avatarUrl}>`;

  return htmlOutput;
};

const showPRs = (prList) => {
  prListUL.innerHTML = "";
  if (prList.length) {
    prList.forEach((pr) => {
      prListUL.innerHTML += `
    <li class="pr">
      <img class="avatar author" src=${storageCache.bbUrl}${
        pr.author.user.avatarUrl
      }>
      <div class="prLinkContainer">
        <a class="prLink" target="_blank" href="${pr.links.self[0]?.href}">${
        pr.title
      }</a>
        <div class="repo">${pr.fromRef?.repository?.project?.name} / ${
        pr.fromRef?.repository?.name
      }</div>
      </div>
      <div class="reviewers">
        ${showReviewers(pr)}
      </div>
    </li>`;
    });
  } else {
    prListUL.innerHTML += `<div class="inboxZero"><img src="./../../img/inbox_zero.png"><span>Inbox zero</span><div>`;
  }
};
