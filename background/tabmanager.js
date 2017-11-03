var Group = function(id,
  title = "",
  tabs = [],
  windowId = browser.windows.WINDOW_ID_NONE) {
  this.title = title;
  this.tabs = tabs;
  this.id = id; // Equal to index in array groups
  this.windowId = windowId;
}

var groups = [];
var currentGroupIndex = 0;

var TabManager = TabManager || {};

/**
 * Return the groupId displayed in the window with windowId
 * If no group found: return -1
 * @param {Number} - windowId
 * @returns {Number} - group index
 */
TabManager.getGroupIdInWindow = function(windowId) {
  for (group of groups) {
    if (group.windowId === windowId)
      return group.id;
  }
  // Should never occur !!
  return -1;
}

/**
 * Take the current tabs on the desire window and set it as the tabs
 * for the group
 * Asynchronous
 * @param {Number} window id
 */
TabManager.updateGroup = function(windowId) {
  let groupId = TabManager.getGroupIdInWindow(windowId);
  if (groupId === -1) {
    console.log("Group not found for window: " + windowId);
    return;
  }

  browser.tabs.query({
    windowId: windowId
  }).then((tabs) => {
    groups[groupId].tabs = tabs;
  });
}

/**
 * Return true if the url is privileged
 * Privileged url: chrome: URLs, javascript: URLs,
                    data: URLs, file: URLs, about: URLs
 * Non-privileged URLs: about:blank, about:newtab ( should be
 * replaced by null ), all the other ones
 * @param {string} url
 * @returns {boolean}
 */
TabManager.filterPrivilegedURL = function(url) {
  if (url === "about:newtab")
    return false;
  if (url.startsWith("chrome:") ||
    url.startsWith("javascript:") ||
    url.startsWith("data:") ||
    url.startsWith("file:") ||
    url.startsWith("about:"))
    return true;

  return false;
}

/**
 * Sort the groups to be in alphabetical order
 * Change the groups var directly
 * TODO
 */
TabManager.sortGroups = function() {
  console.log("sortGroups not implemented: WONT WORK");
  return;

  if (sort) {
    retGroups.sort((a, b) => {
      if (a.title.toLowerCase() == b.title.toLowerCase()) {
        return 0;
      }

      return a.title.toLowerCase() < b.title.toLowerCase() ? -1 : 1;
    });
  }

  return retGroups;
}

/**
 * Open all the tabs
 * Asynchronous
 * @param {array[Tab]} tabs
 */
TabManager.createListOfTabs = function(tabs) {
  tabs.map((tab, index) => {
    tab.url = (tab.url === "") ? null : tab.url;
    browser.tabs.create({
      url: tab.url,
      active: tab.active,
      pinned: tab.pinned,
      index: index
    });
  });
}

/**
 * Close all the current tabs and open the tabs from the selected group
 * The active tab will be the last one active
 * @param {Number} groupId - the group index
 * @returns {Promise} - the remove tabs promise (last)
 * Asynchronous
 */
TabManager.changeGroupTo = function(groupId) {

  var tabsIds = [];
  return browser.tabs.query({
    currentWindow: true
  }).then((tabs) => {
    // 1. Save current tabs id for removing them after
    tabs.map((tab) => {
      tabsIds.push(tab.id);
    });

    // 2. Add new group tabs
    if (groups[groupId].tabs.length === 0) {
      groups[groupId].tabs.push({
        url: "about:newtab",
        active: true,
        pinned: false
      });
    }
    //createListOfTabs(groups[groupId].tabs);
    groups[groupId].tabs.map((tab, index) => {
      if (!TabManager.filterPrivilegedURL(tab.url)) {
        browser.tabs.create({
          url: (tab.url === "about:newtab") ? null : tab.url,
          active: tab.active,
          pinned: tab.pinned,
          index: index
        });
      }
    });

    // 3. Remove old ones (Wait first tab to be loaded in order to avoid the window to close)
    currentGroupIndex = groupId;
    return browser.tabs.remove(tabsIds);
  });
}

/**
 * Go to the tab specified with tabId
 * The tab needs to be in the window
 * @param {Number} tabIndex - the tab index
 */
TabManager.activeTabInWindow = function(tabIndex) {
  browser.tabs.query({
    currentWindow: true
  }).then((tabs) => {
    console.log(tabs);
    console.log(tabId);
    for (var tab of tabs) {
      if (tab.index === tabId) {
        console.log(tab.index);
        browser.tabs.update(tab.id, {
          active: true
        });
      }
    }
  });
}

/**
 * Move tab beetwen groups
 * @param {Number} sourceGroupID
 * @param {Number} tabIndex
 * @param {Number} targetGroupID
 * TODO
 */
TabManager.moveTabToGroup = function(sourceGroupID, tabIndex, targetGroupID) {
  // Case 1: same group
  if (currentGroupIndex === targetGroupID) {
    return;
  }

  let tab = groups[sourceGroupID].tabs[tabIndex];

  // Case 2: Closed Group -> Closed Group
  groups[targetGroupID].tabs.push(tab);
  groups[sourceGroupID].tabs.splice(tabIndex, 1);

  // Case 3: Open Group -> Closed Group
  groups[targetGroupID].tabs.push(tab);
  browser.tabs.remove([tab.id]);

  // Case 4: Closed Group -> Open Group
  browser.tabs.create([tab.id]);
  groups[sourceGroupID].tabs.splice(tabIndex, 1);

  // Case 5: Open Group -> Open Group
  browser.tabs.move();

}

/**
 * Return a promise on the last action
 * Asynchronous
 */
TabManager.removeUnallowedURL = function(groupID) {
  // Get not supported link tab id
  var tabsIds = [];
  groups[groupID].tabs.map((tab) => {
    if (TabManager.filterPrivilegedURL(tab.url))
      tabsIds.push(tab.id);
  });

  // Remove them
  browser.tabs.remove(tabsIds).then(() => {
    // Update data
    browser.tabs.query({
      currentWindow: true
    }).then((tabs) => {
      groups[groupID].tabs = tabs;
    });
  });

}

/**
 * Selects a given group.
 * @param {Number} groupID - the groupID
 * @param {Number} tabIndex - the tab to activate
 */
TabManager.selectGroup = function(groupID) {
  if (currentGroupIndex === groupID) {
    // API compatibility
    return Promise.resolve('Already the good group, nothing to do.');
  }

  TabManager.removeUnallowedURL(currentGroupIndex);

  return TabManager.changeGroupTo(groupID);
}

/**
 * Selects a given tab.
 * Switch to another group if necessary
 * @param {Number} index - the tabs index
 * @param {Number} groupID - the tabs groupID
 */
TabManager.selectTab = function(tabId, groupID) {
  TabManager.selectGroup(groupID).then(() => {
    TabManager.activeTabInWindow(tabId);
  });
}

/**
 * Selects the next or previous group in the list
 * direction>0, go to the next groups OR direction<0, go to the previous groups
 * @param {Number} direction
 */
TabManager.selectNextPrevGroup = function(direction) {
  // Should never happen
  if (groups.length == 0) {
    console.log("selectNextPrevGroup can't go to the next group as there is no other one.");
    return;
  }

  targetGroupID = (currentGroupIndex + direction + groups.length) % groups.length;

  TabManager.changeGroupTo(targetGroupID);
}

/**
 * Renames a given group.
 *
 * @param {Number} groupID - the groupID
 * @param {String} title - the new title
 */
TabManager.renameGroup = function(groupID, title) {
  groups[groupID].title = title;
}

/**
 * Add a new group with one tab: "newtab"
 * No window is associated with this group
 * Title is kept blank if not given
 */
TabManager.addGroup = function(title = "",
  windowId = browser.windows.WINDOW_ID_NONE) {
  let tabs = [];
  tabs.push({
    url: "about:newtab",
    active: true,
    pinned: false
  });

  groups.push(new Group(groups.length,
    title,
    tabs,
    windowId
  ));
}

/**
 * Adds a group with associated tab
 *
 * @param {Array[Tab]} tabs - the tabs to place into the new group
 * @param {String} title - the name to give to that group
 */
TabManager.addGroupWithTab = function(tabs,
  title = ""
  ){
  if ( tabs.length === 0 ){
    TabManager.addGroup( title );
    return;
  }
  groups.push(new Group(groups.length, title, tabs, tabs[0].windowId));
}

/**
 * Closes a group and all attached tabs
 *
 * @param {Number} groupID - the groupID
 */
TabManager.removeGroup = function(groupID) {
  // Switch group
  if (currentGroupIndex == groupID) {
    if (groups.length === 0)
      TabManager.addGroup();
    TabManager.selectNextPrevGroup(1);
  }
  groups.splice(groupID, 1);
}
