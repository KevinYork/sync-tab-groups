
TestManager.DOUBLE_MONITORS = true;

TestManager.splitOnHalfScreen = async function(windowId){
  try {
    return browser.windows.update(windowId, {
        left: TestManager.DOUBLE_MONITORS?window.screen.width:0,
        top: 3,
        width: Math.round(window.screen.width/2),
        height: window.screen.height,
    });
  } catch (e) {
    let msg = "TestManager.splitOnHalfScreen failed on window " + windowId + " and " + e;
    console.error(msg);
    return msg;
  }
}

TestManager.splitOnHalfTopScreen = async function(windowId){
  try {
    return browser.windows.update(windowId, {
        left: TestManager.DOUBLE_MONITORS?window.screen.width:0,
        top: 1,
        width: Math.round(window.screen.width/2),
        height: Math.round(screen.width/2),
    });
  } catch (e) {
    let msg = "TestManager.splitOnHalfTopScreen failed on window " + windowId + " and " + e;
    console.error(msg);
    return msg;
  }
}

TestManager.splitOnHalfBottomScreen = async function(windowId){
  try {
    return browser.windows.update(windowId, {
        left: TestManager.DOUBLE_MONITORS?window.screen.width:0,
        top: Math.round(screen.width/2),
        width: Math.round(window.screen.width/2),
        height: Math.round(screen.width/2),
    });
  } catch (e) {
    let msg = "TestManager.splitOnHalfBottomScreen failed on window " + windowId + " and " + e;
    console.error(msg);
    return msg;
  }
}

TestManager.getGroup = (groups, id)=>{
  return GroupManager.groups[groups[id].groupIndex];
};

TestManager.countDiscardedTabs = function (tabs) {
  return tabs.filter((tab)=>{
      if ( tab.discarded || tab.url.includes(Utils.LAZY_PAGE_URL) ) {
        return true;
      }
      return false;
  }).length;
}

TestManager.resetActiveProperties = function (tabs) {
  tabs.forEach((tab)=>{
    tab.active = false;
  });
}

TestManager.resetIndexProperties = function (tabs) {
  tabs.forEach((tab, index)=>{
    tab.index = index;
  });
}

TestManager.swapOptions = function (params) {
  let previousValues = {};
  for (let p in params ) {
    previousValues[p] = OptionManager.getOptionValue(p);
    OptionManager.updateOption(p, params[p]);
  }
  return previousValues;
}

/**
 * @param {Number} start
 * @param {Number} end
 * @return {Number} - random number btw start and end included
 */
TestManager.getRandom = function (start, end){
  return Math.floor((Math.random() * (end+1-start)) + start);
}
