/**
 * Entry Point of the Extension
 * Init the Data -> Events
 * Manage the messages with all the extensive parts of the Extension

 Sender:
 - refreshOptionsUI
 - refreshUi

 Receiver:
 - onOpenGroupInNewWindow
 - onGroupAdd
 - onGroupAddWithTab
 - onGroupClose
 - onGroupRemove
 - onGroupRename
 - onGroupSelect
 - onTabSelect
 - onMoveTabToGroup
 - onBookmarkSave
 - onOpenSettings
 - changeSynchronizationStateOfWindow
 - onTabClose
 - onTabOpen
 - onImportGroups
 - onExportGroups
 - onGroupChangePosition
 - onTabChangePin
 - onChangeExpand

 - init
 */

TaskManager.fromUI = {
  [TaskManager.CLOSE_REFERENCE]: new TaskManager.DelayedTask(),
  [TaskManager.REMOVE_REFERENCE]: new TaskManager.DelayedTask()
}

/**
 * Only read groups data, never write directly
 */
var Controller = Controller || {};
Controller.updateNotificationId = "UPDATE_NOTIFICATION";

Controller.init = async function() {
  await OptionManager.init();
  await GroupManager.init();

  Controller.initDataEventListener();
  Controller.initTabsEventListener();
  Controller.initWindowsEventListener();
  Controller.initCommandsEventListener();

  browser.runtime.onMessage.addListener(Controller.popupMessenger);
  browser.runtime.onMessage.addListener(Controller.optionMessenger);
  browser.runtime.onMessage.addListener((message)=>{
    if (Utils.UTILS_SHOW_MESSAGES) {
      console.log(message);
    }
  });

  StorageManager.Backup.init();

  Utils.setBrowserActionIcon(OptionManager.options.popup.whiteTheme);

  Controller.refreshUi();
  Controller.refreshOptionsUI();
};

Controller.refreshOptionsUI = function() {
  Utils.sendMessage("Option:Changed", {
    options: OptionManager.options,
  });
};

Controller.refreshUi = function() {
  Utils.sendMessage("Groups:Changed", {
    groups: GroupManager.groups,
    delayedTasks: TaskManager.fromUI
  });
};

Controller.onOpenGroupInNewWindow = function(params) {
  WindowManager.selectGroup(params.groupId, true);
};

Controller.onOpenGuide = function() {
  Utils.openUrlOncePerWindow(
    "https://morikko.github.io/synctabgroups/#guide"
  );
}

Controller.onGroupAdd = function(params) {
  try {
    GroupManager.addGroup(params.title || '');
  } catch (e) {
    console.error("Controller - onGroupAdd failed: " + e);
  }
};

Controller.onGroupAddWithTab = function(params) {
  TabManager.moveTabToNewGroup(
    params.title || '',
    params.sourceGroupId,
    params.tabIndex
  );
};

Controller.onGroupClose = function(params) {
  var delayedFunction = async () => {
    try {
      await WindowManager.closeGroup(
        params.groupId,
        false
      );
      Controller.refreshUi();
      return "Controller.onGroupClose done!";
    } catch (e) {
      let msg = "Controller.onGroupClose failed; " + e;
      console.error(msg);
      return msg;
    }
  };

  TaskManager.fromUI[TaskManager.CLOSE_REFERENCE].manage(
    params.taskRef,
    delayedFunction,
    params.groupId,
  );
};

Controller.onGroupRemove = function(params) {
  var delayedFunction = () => {
    WindowManager.removeGroup(
      params.groupId
    );
  };

  TaskManager.fromUI[TaskManager.REMOVE_REFERENCE].manage(
    params.taskRef,
    delayedFunction,
    params.groupId,
  );
};

Controller.onGroupRename = function(params) {
  GroupManager.renameGroup(
    GroupManager.getGroupIndexFromGroupId(params.groupId),
    params.title
  );
};

Controller.onGroupSelect = function(params) {
  WindowManager.selectGroup(
    params.groupId,
    false
  );
};

Controller.onTabSelect = function(params) {
  TabManager.selectTab(
    params.tabIndex,
    params.groupId,
    params.newWindow,
  );
};

Controller.onMoveTabToGroup = function(params) {
  TabManager.moveTabBetweenGroups(
    params.sourceGroupId,
    params.sourceTabIndex,
    params.targetGroupId,
    params.targetTabIndex,
  );
};

Controller.onBookmarkSave = function() {
  StorageManager.Bookmark.backUp(GroupManager.getCopy(), true);
};

Controller.onOpenSettings = function(active=true) {
  Utils.openUrlOncePerWindow(browser.extension.getURL(
    "/optionpages/option-page.html"
  ), active);
};

Controller.onRemoveAllGroups = function() {
  GroupManager.removeAllGroups();
};

Controller.onReloadGroups = function() {
  GroupManager.reloadGroupsFromDisk();
};

Controller.changeSynchronizationStateOfWindow = function(params) {
  if (params.isSync) {
    WindowManager.integrateWindow(params.windowId, true);
  } else {
    try {
      let currentGroupId = GroupManager.getGroupIdInWindow(
        params.windowId
      );
      GroupManager.removeGroupFromId(currentGroupId);
    } catch (e) {
      let msg = "synchronizeWindowManager failed; " + e;
      console.error(msg);
      return msg;
    }
  }
};

Controller.onTabClose = async function(params) {
  try {
    await GroupManager.removeTabFromIndexInGroupId(
      params.groupId,
      params.tabIndex
    );
  } catch (e) {
    let msg = "Controller.onTabClose failed; " + e;
    console.error(msg);
    return msg;
  }
};

Controller.onTabOpen = async function(params) {
  try {
    const currentWindow = await browser.windows.getLastFocused();
    await TabManager.openListOfTabs(
      [params.tab],
      currentWindow.id,
      true,
      false,
    )
  } catch (e) {
    let msg = "Controller.onTabOpen failed; " + e;
    console.error(msg);
    return msg;
  }
};

Controller.onImportGroups = function(params) {
  try {
    let groups = StorageManager.File.importGroups(params.content_file);
    GroupManager.addGroups(groups);

    browser.notifications.create({
      "type": "basic",
      "iconUrl": browser.extension.getURL("/share/icons/tabspace-active-64.png"),
      "title": "Import Groups succeeded",
      "message": groups.length + " groups imported.",
      "eventTime": 4000,
    });
  } catch (e) {
    console.error(e);
    browser.notifications.create({
      "type": "basic",
      "iconUrl": browser.extension.getURL("/share/icons/tabspace-active-64.png"),
      "title": "Import Groups failed",
      "message": e.message,
      "eventTime": 4000,
    });
  }
};

Controller.onExportGroups = function() {
  StorageManager.File.exportGroups(GroupManager.getCopy());
};

Controller.onGroupChangePosition = function(params) {
  GroupManager.changeGroupPosition(
    params.groupId,
    params.position
  );
};

Controller.onTabChangePin = function(params) {
  TabManager.changePinState(
    params.groupId,
    params.tabIndex,
  );
};

Controller.onChangeExpand = function(params) {
  GroupManager.changeExpandState(
    params.groupId,
    params.expand,
  );
};

// START of the extension
Controller.init();

// Event from: popup
Controller.popupMessenger = function(message) {
  switch (message.task) {
    case "Group:Add":
      Controller.onGroupAdd(message.params);
      break;
    case "Group:AddWithTab":
      Controller.onGroupAddWithTab(message.params);
      break;
    case "Group:Close":
      Controller.onGroupClose(message.params);
      break;
    case "Group:ChangePosition":
      Controller.onGroupChangePosition(message.params);
      break;
    case "Group:Remove":
      Controller.onGroupRemove(message.params);
      break;
    case "Group:Rename":
      Controller.onGroupRename(message.params);
      break;
    case "Group:Select":
      Controller.onGroupSelect(message.params);
      break;
    case "Group:MoveTab":
      Controller.onMoveTabToGroup(message.params);
      break;
    case "Tab:Select":
      Controller.onTabSelect(message.params);
      break;
    case "Group:OpenGroupInNewWindow":
      Controller.onOpenGroupInNewWindow(message.params);
      break;
    case "Data:Ask":
      Controller.refreshUi();
      Controller.refreshOptionsUI();
      break;
    case "App:OpenSettings":
      Controller.onOpenSettings();
      break;
    case "Window:Sync":
      Controller.changeSynchronizationStateOfWindow(message.params);
      break;
    case "Tab:Open":
      Controller.onTabOpen(message.params);
      break;
    case "Tab:Close":
      Controller.onTabClose(message.params);
      break;
    case "Tab:ChangePin":
      Controller.onTabChangePin(message.params);
      break;
    case "Group:Expand":
      Controller.onChangeExpand(message.params);
      break;
  }
}

// Event from: option
Controller.optionMessenger = function(message) {
  switch (message.task) {
    case "Option:Ask":
      Controller.refreshOptionsUI();
      break;
    case "Option:Change":
      OptionManager.updateOption(message.params.optionName, message.params.optionValue);
      Controller.refreshOptionsUI();
      break;
    case "Option:BackUp":
      Controller.onBookmarkSave();
      break;
    case "Option:Import":
      Controller.onImportGroups(message.params);
      Controller.refreshUi();
      break;
    case "Option:Export":
      Controller.onExportGroups();
      break;
    case "Option:DeleteAllGroups":
      Controller.onRemoveAllGroups();
      break;
    case "Option:ReloadGroups":
      Controller.onReloadGroups();
      break;
    case "Option:OpenGuide":
      Controller.onOpenGuide();
      break;
    case "Option:UndiscardLazyTabs":
      Controller.undiscardAll();
      break;
  }
}




/**** Update *****/
Controller.initDataEventListener = function() {
  GroupManager.eventlistener.on(GroupManager.EVENT_CHANGE,
    () => {
      Controller.refreshUi();
    });

  OptionManager.eventlistener.on(OptionManager.EVENT_CHANGE,
    () => {
      Controller.refreshOptionsUI();
    });
}


/**** Event about tabs *****/
Controller.initTabsEventListener = function() {
  browser.tabs.onActivated.addListener(async (activeInfo) => {
    // Necessary for Chrome, this event is fired before the onRemovedWindow event
    // Else the group is finally updated with empty tabs.
    setTimeout(() => {
      TabManager.updateTabsInGroup(activeInfo.windowId);
    }, 300);
  });
  browser.tabs.onCreated.addListener((tab) => {
    TabManager.updateTabsInGroup(tab.windowId);
  });
  browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
    /* Bug: onRemoved is fired before the tab is really close
     * Workaround: keep a delay
     * https://bugzilla.mozilla.org/show_bug.cgi?id=1396758
     */
    setTimeout(() => {
      if ( !removeInfo.isWindowClosing ) {
        TabManager.updateTabsInGroup(removeInfo.windowId);
      }
    }, 300);
  });
  browser.tabs.onMoved.addListener((tabId, moveInfo) => {
    TabManager.updateTabsInGroup(moveInfo.windowId);
  });
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    TabManager.updateTabsInGroup(tab.windowId);
  });
  browser.tabs.onAttached.addListener((tabId, attachInfo) => {
    TabManager.updateTabsInGroup(attachInfo.newWindowId);
  });
  browser.tabs.onDetached.addListener((tabId, detachInfo) => {
    TabManager.updateTabsInGroup(detachInfo.oldWindowId);
  });
}


/**** Event about windows *****/
Controller.initWindowsEventListener = function() {
  browser.windows.onCreated.addListener((window) => {
    if ( !OptionManager.options.privateWindow.sync
          && window.incognito) {
              return; // Don't lose time
    }

    // Let time for opening well and be sure it is a new one
    setTimeout(() => {
      if ( !WindowManager.WINDOW_EXCLUDED[window.id] ) {
        WindowManager.integrateWindow(window.id);
      }
    }, 300); // Below 400, it can fail
  });

  browser.windows.onRemoved.addListener((windowId) => {
    WindowManager.WINDOW_CURRENTLY_CLOSING[windowId] = true;

    setTimeout(()=>{
      delete WindowManager.WINDOW_CURRENTLY_CLOSING[windowId];
    }, 5000);

    GroupManager.detachWindow(windowId);
  });
  /* TODO: doenst update context menu well if right click on a tab from another window
   */
  browser.windows.onFocusChanged.addListener(async (windowId) => {
    Controller.refreshUi();

    try {
      const w = await browser.windows.getLastFocused();
      await ContextMenu.updateMoveFocus(w.id);

      let groupId = GroupManager.getGroupIdInWindow(windowId, false);
      if (groupId >= 0) { // Only grouped window
        GroupManager.setLastAccessed(groupId, Date.now());
      }
    } catch (e) {
      let msg = "onFocusChanged.listener failed; " + e;
      console.error(msg);
      return msg;
    }
  });
}

Controller.initCommandsEventListener = function() {
  // Commands
  browser.commands.onCommand.addListener(async function(command) {
    try {
      if (!OptionManager.options.shortcuts.allowGlobal) { // disable by user
        return "";
      }
      switch (command) {
        case "swtich_next_group":
          WindowManager.selectNextGroup(1, false);
          break;
        case "swtich_previous_group":
          WindowManager.selectNextGroup(-1, false);
          break;
        case "create_group_swtich":
          let newGroupId = GroupManager.addGroup();
          WindowManager.selectGroup(newGroupId);
          break;
        case "focus_next_group":
          WindowManager.selectNextGroup(1, true);
          break;
        case "focus_previous_group":
          WindowManager.selectNextGroup(-1, true);
          break;
        case "remove_group_swtich":
          await WindowManager.removeGroup();
          //WindowManager.selectNextGroup(1, false);
          break;
        default:
      }
    } catch (e) {
      let msg = "Commands.listener failed on " + command + " " + e;
      console.error(msg);
      return msg;
    }
  });
};

browser.runtime.onInstalled.addListener((details) => {
  // Only when the extension is installed for the first time
  if ( details.reason === "install" ) {
    Controller.install = true;
    Controller.onOpenSettings(false);
  }

  // Development mode detection
  if( (!Utils.isChrome() && details.temporary)  // FF
      || (Utils.isChrome() && details.reason === "update" && (browser.runtime.getManifest()).version === details.previousVersion)) { // Chrome
    Utils.openUrlOncePerWindow(
      browser.extension.getURL("/tests/test-page/test-page.html"),
      false,
    );
  }

  // Extension update detection
  if ( details.reason === "update"
      && (browser.runtime.getManifest()).version !== details.previousVersion ) {
    // Focus Settings if click on notification
    browser.notifications.onClicked.addListener((notificationId)=>{
      if ( notificationId === Controller.updateNotificationId ) {
        Controller.onOpenSettings(true);
      }
    });
    // Generic message
    browser.notifications.create(Controller.updateNotificationId, {
      "type": "basic",
      "iconUrl": browser.extension.getURL("/share/icons/tabspace-active-64.png"),
      "title": browser.i18n.getMessage("notification_update_title") + " " + browser.runtime.getManifest().version,
      "message": browser.i18n.getMessage("notification_update_message"),
    });
  }
});

if (Utils.isChrome()) {
  browser.runtime.onUpdateAvailable.addListener(Controller.undiscardAll);
}

Controller.undiscardAll = async function (globalCount = 0, callbackAfterFirstUndiscard=undefined) {
  return new Promise(async function(resolve, reject){
    let queue = Promise.resolve();

    let hadDiscarded = false;

    //console.log("Clean: " + globalCount);
    let tabs = await browser.tabs.query({});
    tabs.forEach(async (tab)=>{
      queue = queue.then(async function(){
        //console.log(tab.url)
        if( tab.url.includes(Utils.LAZY_PAGE_URL)) {
          hadDiscarded = true;

          try {
            // Change
            await browser.tabs.update(tab.id, {
              url: Utils.extractTabUrl(tab.url)
            });
            //console.log("Update tab: " + tab.id);
            if ( callbackAfterFirstUndiscard ) { // For tests purpose
              callbackAfterFirstUndiscard();
              callbackAfterFirstUndiscard = undefined;
            }
            await Utils.wait(300);
            // Wait full loading
            let count = 0;
            while( ((await browser.tabs.get(tab.id)).status === "loading")
                && count < 30 ) { // Wait max ~ 10s
              await Utils.wait(300);
              count++;
            }

            // Discard but Check active (due to loading waiting)
            if ( (await browser.tabs.get(tab.id)).status === "complete") {
              await browser.tabs.discard(tab.id);
            }

          } catch ( e ) { // Tab has changed (closed, moved, actived...)
            // Do nothing but avoid a crash
            //console.log("Error in Controller.undiscardAll: " + e)
          }

        }
        return;
        })
    });

    queue.then(function(lastResponse){
      if ( hadDiscarded
        && globalCount < 10 ) {
        resolve(Controller.undiscardAll(++globalCount));
      } else {
        //browser.runtime.reload();
        resolve();
        //console.log("Done!");
      }
    });
  });
}
