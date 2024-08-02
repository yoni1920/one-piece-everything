import './style.css'
const BLOCKING_ENABLED_KEY = "blockingEnabled";
const BLOCKED_ON_PAGE_KEY = 'blockedOnPage';

const defineCurrentTab = async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const { url, id } = tabs[0];

  const { hostname } = new URL(url);

  document.querySelector("#current-url").innerHTML = hostname;

  return id
};

const initBlockToggleState = async () => {
  const { blockingEnabled } = await chrome.storage.local.get([BLOCKING_ENABLED_KEY]);
  const blockingToggle = document.querySelector('#enable-blocking');
  
  blockingToggle.checked = blockingEnabled; 
};

const disableBlocking = () => {
  chrome.storage.local.set({
    [BLOCKING_ENABLED_KEY]: false
  })
  .then(() => console.log("Blocking disabled"));
};

const enableBlocking = () => {
  chrome.storage.local.set({
    [BLOCKING_ENABLED_KEY]: true
  })
  .then(() => console.log("Blocking enabled"));
};

const defineBlockToggleChange = () => {
  const blockingToggle = document.querySelector('#enable-blocking');
  
  blockingToggle.addEventListener('change', () => {
    const { checked } = blockingToggle;
    
    if (checked) {
      enableBlocking();
    } else {
      disableBlocking();
    }
  });
};

const defineDBChangeListener = (tabID) => {
  const blockedOnPageDBKey = getBlockedPageDBKey(tabID);

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.hasOwnProperty(blockedOnPageDBKey)) {
      handleBlockedPageUpdate(blockedOnPageDBKey, changes);
    }
  });
};

const handleBlockedPageUpdate = (blockedOnPageKey, changes) => {
  const { [blockedOnPageKey]: { newValue } } = changes;
  console.log('changes', changes);

  const updatedNumBlocked = newValue.numBlocked;

  updateNumBlockedPageElement(updatedNumBlocked)
}

const getInitialBlockedOnPage = async (tabID) => {
  const blockedOnPageDBKey = getBlockedPageDBKey(tabID);
  const { [blockedOnPageDBKey]: initDBValue } = await chrome.storage.local.get([blockedOnPageDBKey]);

  const numBlockedOnPage = initDBValue?.numBlocked ?? 0;

  updateNumBlockedPageElement(numBlockedOnPage);
}

const updateNumBlockedPageElement = (numBlocked) => {
  const blockedIndicator = document.querySelector('#num-blocked');

  blockedIndicator.innerHTML = numBlocked.toLocaleString('en', {useGrouping:true});
}

const getBlockedPageDBKey = (tabID) => `${BLOCKED_ON_PAGE_KEY}:${tabID}`;

const main = async () => {
  try {
    const tabID = await defineCurrentTab();

    await Promise.all([
      initBlockToggleState(), 
      getInitialBlockedOnPage(tabID)
    ])
    
    defineDBChangeListener(tabID);
    defineBlockToggleChange();
  } catch (error) {
    console.error(`Error on popup.js - ${error.message}`);
  }
};

main();


