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
                    await handleNumBlockedPageUpdate(msg.numElementsBlocked, sender.tab.id)
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
  
const handleNumBlockedPageUpdate = async (numElementsBlocked, tabID) => {
    const blockedOnPageDBKey = getBlockedPageDBKey(tabID);

    const { [blockedOnPageDBKey]: prevNumBlocked } = await chrome.storage.local.get([blockedOnPageDBKey]);

    console.log(prevNumBlocked);

    await chrome.storage.local.set({
        [blockedOnPageDBKey]: numElementsBlocked + (prevNumBlocked ?? 0)
    });
}

const defineOnTabCloseListener = () => {
    chrome.tabs.onRemoved.addListener(async (tabID, _info) => {
        const blockedOnPageDBKey = getBlockedPageDBKey(tabID);
         
        await chrome.storage.local.remove([blockedOnPageDBKey]);
    })
}

const getBlockedPageDBKey = (tabID) => `${BLOCKED_ON_PAGE_KEY}:${tabID}`;

const main = async () => {
  try {
    defineMessageListener();
    defineOnTabCloseListener();

    await initBlocking();
  } catch (error) {
    console.error(`Error in service worker - ${error.message}`);
  }
};

main();
