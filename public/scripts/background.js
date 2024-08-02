const BLOCKING_ENABLED_KEY = 'blockingEnabled';
const BLOCKED_ON_PAGE_KEY = 'blockedOnPage';

const initBlocking = async () => {
  await chrome.storage.local.set({
    [BLOCKING_ENABLED_KEY]: true
  });

  console.log("Blocking enabled");
}

const defineMessageListener = () => {
    chrome.runtime.onMessage.addListener(async (msg, sender, response) => {
        try {
            switch (msg.event) {
                case BLOCKED_ON_PAGE_KEY:
                    await handleNumBlockedPageUpdate(msg, sender.tab.id)
                    response('handled by background script');

                    break;
                default:
                    response('unknown request');
                    break;
            }
        } catch (error) {
            console.error(`Error - ${error.message}`);
        }
    });
  }
  
const handleNumBlockedPageUpdate = async (msg, tabID) => {
    const blockedOnPageDBKey = getBlockedPageDBKey(tabID);

    const { [blockedOnPageDBKey]: prevValue } = await chrome.storage.local.get([blockedOnPageDBKey]);

    const prevNumBlocked = prevValue?.numBlocked;

    const { numBlocked, hostname } = msg;

    await chrome.storage.local.set({
        [blockedOnPageDBKey]: {
            hostname,
            numBlocked: numBlocked + (prevNumBlocked ?? 0)
        }
    });
}

const defineOnTabCloseListener = () => {
    chrome.tabs.onRemoved.addListener(async (tabID, _info) => {
        const blockedOnPageDBKey = getBlockedPageDBKey(tabID);
         
        await chrome.storage.local.remove([blockedOnPageDBKey]);
    })
}

const handlePageNavigation = async (details) => {
    const ifNavigationMainFrame = details.frameId === 0;

    if (ifNavigationMainFrame) {
        handleHostnameSwitch(details)
    }
}

const handleHostnameSwitch = async (details) => {
    const { hostname: newHostname } = new URL(details.url);

    const blockedOnPageDBKey = getBlockedPageDBKey(details.tabId);
    const { [blockedOnPageDBKey]: { hostname }} = await chrome.storage.local.get([blockedOnPageDBKey]);

    if (newHostname !== hostname) {
        await chrome.storage.local.set({
            [blockedOnPageDBKey]: {
                hostname: newHostname,
                numBlocked: 0
            }
        })
    }
}

const defineNavigationHandlers = () => {
    chrome.webNavigation.onCompleted.addListener(handlePageNavigation); 
    chrome.webNavigation.onHistoryStateUpdated.addListener(handlePageNavigation);
    chrome.webNavigation.onReferenceFragmentUpdated.addListener(handlePageNavigation);
}

const getBlockedPageDBKey = (tabID) => `${BLOCKED_ON_PAGE_KEY}:${tabID}`;

const main = async () => {
  try {
    defineMessageListener();
    defineNavigationHandlers();
    defineOnTabCloseListener();

    await initBlocking();
  } catch (error) {
    console.error(`Error in service worker - ${error.message}`);
  }
};

main();
