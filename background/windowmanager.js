/**
 * Functions that update the windows in browser
 * All are insynchronous functions
 * ALL functions HAVE TO return a new Promises that is resolved when everything is done
 * Have direct access (R/W) to the data
 */

var WindowManager = WindowManager || {};

WindowManager.WINDOW_GROUPID = "GROUPID";

/**
 * Close all the current tabs and open the tabs from the selected group
 * in the window with windowId
 * The active tab will be the last one active
 * @param {Number} oldGroupId - the group id opened
 * @param {Number} newGroupId - the group id to open
 * @returns {Promise} - the remove tabs promise (last)
 */
WindowManager.changeGroupInWindow = async function(oldGroupId, newGroupId) {
  try {
    let newGroupIndex = GroupManager.getGroupIndexFromGroupId(
      newGroupId
    );
    let oldGroupIndex = GroupManager.getGroupIndexFromGroupId(
      oldGroupId
    );
    let windowId = GroupManager.getWindowIdFromGroupId(
      oldGroupId
    );

    await TabManager.removeTabsWithUnallowedURL(oldGroupId);
    await TabManager.updateTabsInGroup(windowId);

    const tabs = await browser.tabs.query({
      windowId: windowId
    });

    // 1. Prepare tabs to open and remove
    var tabsToRemove = [];
    tabs.map((tab) => {
      if ((OptionManager.options.pinnedTab.sync && tab.pinned) ||
        !tab.pinned) {
        tabsToRemove.push(tab.id);
      }
    });

    var tabsToOpen = GroupManager.groups[newGroupIndex].tabs;
    // Switch window associated
    GroupManager.detachWindowFromGroupId(oldGroupId);
    await GroupManager.attachWindowWithGroupId(newGroupId, windowId);

    // Create tmp blank tab
    const blank_tab = await TabManager.openListOfTabs([], windowId, true, true);

    // Remove old ones (Wait first tab to be loaded in order to avoid the window to close)
    await browser.tabs.remove(tabsToRemove);

    // Open new group tabs
    await TabManager.openListOfTabs(tabsToOpen, windowId, false, true);

    // Remove tmp blank tab
    await browser.tabs.remove([blank_tab[0].id]);

    return "WindowManager.changeGroupInWindow done!";

  } catch (e) {
    let msg = "WindowManager.changeGroupInWindow failed; " + e;
    console.error(msg);
    return msg;
  }
}


/**
 * Selects a given group, with the tab active was the last one before closing.
 * If not open, switch to it
 * If open is another window, switch to that window
 * @param {Number} newGroupId - the group id
 * @return {Promise}
 */
WindowManager.selectGroup = async function(newGroupId) {
  try {
    let newGroupIndex = GroupManager.getGroupIndexFromGroupId(
      newGroupId
    );

    // Case 1: Another window
    if (GroupManager.isGroupIndexInOpenWindow(newGroupIndex)) {
      await browser.windows.update(
        GroupManager.groups[newGroupIndex].windowId, {
          focused: true
        });
      return "WindowManager.selectGroup done!";
    }
    // Case 2: switch group
    else {
      // So that the user can change the window without disturbing
      const currentWindow = await browser.windows.getCurrent();
      let currentGroupId = GroupManager.getGroupIdInWindow(
        currentWindow.id
      );
      await WindowManager.changeGroupInWindow(currentGroupId, newGroupId);
      return "WindowManager.selectGroup done!";
    }
  } catch (e) {
    let msg = "WindowManager.selectGroup failed: " + e;
    console.error(msg);
    return msg;
  }
}

/**
 * Open the next group in the list that is not opened.
 * If no group available, create an empty one.
 * @param {Number} sourceGroupId -- group id ref
 * @return {Promise}
 */
WindowManager.selectNextGroup = async function(sourceGroupId) {
  try {
    let nextGroupId = -1;
    let sourceGroupIndex = GroupManager.getGroupIndexFromGroupId(
      sourceGroupId
    );

    // Search next unopened group
    for (let i = sourceGroupIndex; i < sourceGroupIndex + GroupManager.groups.length; i++) {
      let targetGroupIndex = (i) % GroupManager.groups.length;

      if (GroupManager.groups[targetGroupIndex].windowId === browser.windows.WINDOW_ID_NONE) {
        nextGroupId = GroupManager.groups[targetGroupIndex].id;
        break;
      }
    }

    // No group found, create one
    if (nextGroupId === -1) {
      nextGroupId = GroupManager.addGroup();
    }

    await WindowManager.changeGroupInWindow(sourceGroupId, nextGroupId);

    return "WindowManager.selectNextGroup done!";
  } catch (e) {
    let msg = "WindowManager.selectNextGroup failed; " + e;
    console.error(msg);
    return msg;
  }
}

/**
 * Close an open window and detach the group from it
 * @param {Number} groupID
 * @return {Promise}
 */
WindowManager.closeWindowFromGroupId = async function(groupID) {
  try {
    let windowId = GroupManager.getWindowIdFromGroupId(
      groupID
    );

    // Clean windowId in success or fail
    try {
      await browser.windows.remove(windowId);
    } finally {
      GroupManager.detachWindow(windowId);
      return "WindowManager.closeWindowFromGroupId done on groupId " + groupID;
    }

  } catch (e) {
    let msg = "TabManager.closeWindowFromGroupId failed; " + e;
    console.error(msg);
    return msg;
  }
}


/**
 * Closes a group and all attached tabs.
 * If group is in current window, open the next available group (WindowManager.selectNextGroup).
 * If group is in another window, close the window.
 * @param {Number} groupID
 * @return {Promise}
 */
WindowManager.closeGroup = async function(groupID) {
  try {
    let groupIndex = GroupManager.getGroupIndexFromGroupId(
      groupID
    );
    let windowId = GroupManager.getWindowIdFromGroupId(
      groupID
    );

    const currentWindow = await browser.windows.getCurrent();
    if (currentWindow.id === windowId)
      await WindowManager.selectNextGroup(groupID);
    else
      await WindowManager.closeWindowFromGroupId(groupID);
    return "WindowManager.closeGroup done!";

  } catch (e) {
    let msg = "WindowManager.closeGroup failed; " + e;
    console.error(msg);
    return msg;
  }
}

/**
 * Remove a group
 * If group is opened, close it (WindowManager.closeGroup)
 * @param {Number} groupID
 * @return {Promise}
 */
WindowManager.removeGroup = async function(groupID) {
  try {
    let groupIndex = GroupManager.getGroupIndexFromGroupId(
      groupID
    );

    // Is open
    if (GroupManager.isGroupIndexInOpenWindow(groupIndex)) {
      await WindowManager.closeGroup(groupID);
      GroupManager.removeGroupFromId(groupID);
      // Is close
    } else {
      GroupManager.removeGroupFromId(groupID);
    }
    return "WindowManager.removeGroup done on groupId " + groupID;

  } catch (e) {
    let msg = "WindowManager.removeGroup failed; " + e;
    console.error(msg);
    return msg;
  }
}

/**
 * Open a group in a new window directly
 * @param {Number} groupID
 * @return {Promise}
 */
WindowManager.openGroupInNewWindow = async function(groupID) {
  try {
    let groupIndex = GroupManager.getGroupIndexFromGroupId(
      groupID
    );

    const w = await browser.windows.create({
      state: "maximized",
    });

    await GroupManager.attachWindowWithGroupId(groupID, w.id);

    await TabManager.openListOfTabs(GroupManager.groups[groupIndex].tabs, w.id, false, true);

    // Remove first new tab open with window
    await browser.tabs.remove([w.tabs[0].id]);
    return "WindowManager.openGroupInNewWindow done!";

  } catch (e) {
    let msg = "WindowManager.openGroupInNewWindow failed; " + e;
    console.error(msg);
    return msg;
  }
}

/**
 * Use sessions tools to associate the groupid to window.
 * If window is restored, even if windowId change, the value is still associated with the window.
 * @param {Number} windowId
 * @param {Number} groupId
 * @return {Promise}
 */
WindowManager.associateGroupIdToWindow = async function(windowId, groupId) {
  return browser.sessions.setWindowValue(
    windowId, // integer
    WindowManager.WINDOW_GROUPID, // string
    groupId.toString()
  );
}

/**
 * Use sessions tools to associate the groupid to window.
 * If window is restored, even if windowId change, the value is still associated with the window.
 * @param {Number} windowId
 * @param {Number} groupId
 * @return {Promise}
 */
WindowManager.associateGroupIdToWindow = async function(windowId, groupId) {
  return browser.sessions.setWindowValue(
    windowId, // integer
    WindowManager.WINDOW_GROUPID, // string
    groupId.toString()
  );
}

/**
 * Remove groupid stored with the window
 * @param {Number} windowId
 * @return {Promise}
 */
WindowManager.desassociateGroupIdToWindow = async function(windowId) {
  return browser.sessions.removeWindowValue(
    windowId, // integer
    WindowManager.WINDOW_GROUPID, // string
  );
}

/**
 * Take the tabs from a current opened window and create a new group
 * @param {Number} windowId
 * @return {Promise}
 */
WindowManager.addGroupFromWindow = async function(windowId) {
  try {
    const tabs = await browser.tabs.query({
      windowId: windowId
    });

    console.log(tabs);

    var newGroupId = GroupManager.addGroupWithTab(tabs, windowId);
    await WindowManager.associateGroupIdToWindow(
      windowId,
      newGroupId
    );
    return "WindowManager.integrateWindow done on New Window with window " + windowId;

  } catch (e) {
    let msg = "WindowManager.integrateWindow failed on New Window with window " + windowId + " and " + e;
    console.error(msg);
    return msg;
  }
}

/**
 * Link an existing window to the groups
 * 1. If already linked, update the link
 * 2. If new window, add group
 * @param {Number} windowId
 * @return {Promise}
 */
WindowManager.integrateWindow = async function(windowId) {
  try {
    const window = await browser.windows.get(windowId);

    if (window.type !== 'normal') {
      return "WindowManager.integrateWindow not done for windowId " + windowId + " because window is not normal";
    }

    // Private Window sync
    if (!OptionManager.options.privateWindow.sync &&
      window.incognito) {
      return "WindowManager.integrateWindow not done for windowId " + windowId + " because private window are not synchronized";
    }

    const key = await browser.sessions.getWindowValue(
      windowId, // integer
      WindowManager.WINDOW_GROUPID // string
    );
    // New Window
    if (key === undefined) {
      await WindowManager.addGroupFromWindow(windowId);
      // Update Group
    } else {
      try {
        GroupManager.attachWindowWithGroupId(parseInt(key, 10), windowId);
      } catch (e) {
        // Has a key but a wrong, start from 0
        await WindowManager.addGroupFromWindow(windowId);
        return "WindowManager.integrateWindow done for windowId " + windowId;
      }
    }
    return "WindowManager.integrateWindow done for windowId " + windowId;
  } catch (e) {
    let msg = "WindowManager.integrateWindow failed on Get Key Value for windowId " + windowId + "\n Error msg: " + e;
    console.error(msg);
    return msg;
  }
}
