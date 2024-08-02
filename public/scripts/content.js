const LUFFY_EMBED_URL = "https://www.youtube.com/embed/BJ7rjR1X_3k";
const BLOCKING_ENABLED_KEY = 'blockingEnabled';
const BLOCKED_ON_PAGE_KEY = 'blockedOnPage';

const fixInternalResourcePath = (resourcePath) =>
  resourcePath.replace("/..", "");

const getInjectImage = (imageFile) =>
  chrome.runtime.getURL(`../images/injected/${imageFile}`);

const LUFFY_IMAGES = [
  getInjectImage("luffy2.jpg"),
  getInjectImage("luffy3.jpeg"),
  getInjectImage("luffy4.jpg"),
  getInjectImage("luffy5.jpeg"),
  getInjectImage("luffy6.webp"),
  getInjectImage("luffy7.jpeg"),
  getInjectImage("luffy8.jpeg"),
  getInjectImage("luffy9.png"),
  getInjectImage("luffy10.png"),
];

const LUFFY_IMAGE_CHECK = new Set(LUFFY_IMAGES.map(fixInternalResourcePath));

const LUFFY_VIDEO = chrome.runtime.getURL("../videos/one-piece.mp4");
const LUFFY_VIDEO_CHECK = fixInternalResourcePath(LUFFY_VIDEO);

const DEBUG_INTERVAL_MS = 5000;
const PROD_INTERVAL_MS = 100;

const streamElements = (querySelector) => {
  const elements = document.querySelectorAll(querySelector);

  return Array.from(elements);
};

const getRandomLuffyImage = () => {
  const imageIndex = Math.floor(Math.random() * LUFFY_IMAGES.length);

  return LUFFY_IMAGES[imageIndex];
};

const injectIFrames = () => {
  const iframeNotInjected = (iframe) =>
    iframe.dataset.src != LUFFY_EMBED_URL || iframe.src != LUFFY_EMBED_URL;

  return streamElements("iframe")
    .filter(iframeNotInjected)
    .reduce((numBlocked, element) => {
      element.dataset.src = LUFFY_EMBED_URL;
      element.src = LUFFY_EMBED_URL;

      return numBlocked + 1;
    }, 0);
};

const injectImages = () => {
  const imageNotInjected = (element) =>
    !LUFFY_IMAGE_CHECK.has(element.src) &&
    !LUFFY_IMAGE_CHECK.has(element.srcset);

  return streamElements("img")
    .filter(imageNotInjected)
    .reduce((numBlocked, element) => {
      const image = getRandomLuffyImage();

      element.srcset = image;
      element.src = image;

      return numBlocked + 1;
    }, 0);
};

const injectVideos = () => {
  return streamElements("video")
    .filter((element) => element.src !== LUFFY_VIDEO_CHECK)
    .reduce((numBlocked, element) => {
      element.src = LUFFY_VIDEO;
      element.autoplay = true;

      return numBlocked + 1;
    }, 0);
};

const injectElements = () => {
  const numBlockedElements = injectIFrames() + injectImages() + injectVideos();

  if (numBlockedElements) {
    sendInjectCount(numBlockedElements);
  }
}; 

const sendInjectCount = async (numElementsBlocked) => {
  try {
    const payload = {
      event: BLOCKED_ON_PAGE_KEY,
      numBlocked: numElementsBlocked,
      hostname: location.hostname
    };

    const response = await chrome.runtime.sendMessage(payload);

    console.log(response);
  } catch (error) {
    console.error(`Error - ${error.message}`);
  }
};

const initInjectManager = (injectInterval) => {
  let injectionProcessID = undefined;

  return {
    enableBlocking: () => {
      injectionProcessID = setInterval(injectElements, injectInterval)
      console.log('Started Blocking', injectionProcessID);
    },
    disableBlocking: () => {
      clearInterval(injectionProcessID);
      console.log("Disabled blocking", injectionProcessID);
    }
  }
};

const { enableBlocking, disableBlocking } = initInjectManager(DEBUG_INTERVAL_MS);


const initBlockingOnLoad = async () => {
  const { blockingEnabled } = await chrome.storage.local.get([BLOCKING_ENABLED_KEY]);
  
  if (blockingEnabled) {
    enableBlocking();
  }
};

const defineBlockingListener = () => {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.hasOwnProperty(BLOCKING_ENABLED_KEY)) {
        handleBlockingToggle(changes);
    }
  });
};

const handleBlockingToggle = (changes) => {
    const { blockingEnabled: { newValue, oldValue } } = changes;
      
    console.log(`Old value was "${oldValue}", new value is "${newValue}".`);
    
    if (newValue) {
      enableBlocking();
    } else {
      disableBlocking();
    }
}

const main = async () => {
  try {
    await initBlockingOnLoad();
    defineBlockingListener();

    // setInterval(injectElements, PROD_INTERVAL_MS)
  } catch (error) {
    console.error(`Error on content script - ${error.message}`);
  }
};

main();