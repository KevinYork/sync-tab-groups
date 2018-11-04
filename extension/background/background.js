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

import LogManager from "./error/logmanager"
// TabManager & Selector
import Utils from './utils/utils'

import TaskManager from './utils/taskManager'

import StorageManager from './storage/storageManager'

import Events from './event/event'
import Messenger from './messenger/messenger'

import TabManager from './core/tabmanager/tabManager'
import OptionManager from './core/optionmanager'
import GroupManager from './core/groupmanager'
import WindowManager from './core/windowmanager'

import ContextMenu from './core/contextmenus'
import Selector from './core/selector'

LogManager.LOCATION = LogManager.BACK

TaskManager.fromUI = {
  [TaskManager.CLOSE_REFERENCE]: new TaskManager.DelayedTask(),
  [TaskManager.REMOVE_REFERENCE]: new TaskManager.DelayedTask(),
}

/**
 * Only read groups data, never write directly
 */
const Background = {};
Background.updateNotificationId = "UPDATE_NOTIFICATION";

Background.init = async function() {
  LogManager.init();
  LogManager.information(LogManager.EXTENSION_START);

  await OptionManager.init();
  await GroupManager.init();

  Events.Install.prepareExtensionForUpdate(
    Background.lastVersion,
    (browser.runtime.getManifest()).version
  );

  Events.Extension.initSendDataEventListener();
  Events.Tabs.initTabsEventListener();
  Events.Windows.initWindowsEventListener();
  Events.Commands.initCommandsEventListener();
  ContextMenu.initContextMenus();

  browser.runtime.onMessage.addListener(Messenger.Groups.popupMessenger);
  browser.runtime.onMessage.addListener(Messenger.Options.optionMessenger);
  browser.runtime.onMessage.addListener(Messenger.Selector.selectorMessenger);
  browser.runtime.onMessage.addListener((message)=>{
    if (Utils.UTILS_SHOW_MESSAGES) {
      console.log(message);
    }
  });

  Utils.setBrowserActionIcon(OptionManager.options.popup.whiteTheme);

  Background.refreshUi();
  Background.refreshOptionsUI();

  await Utils.wait(2000);
  StorageManager.Local.planBackUp();
  StorageManager.Backup.init();
  Background.install = false;

  LogManager.information(LogManager.EXTENSION_INITIALIZED, {
    groups: GroupManager.groups.map((group) => ({
      id: group.id,
      tabsLength: group.tabs.length,
      windowId: group.windowId,
    })),
  });
};

Background.refreshOptionsUI = function() {
  Utils.sendMessage("Option:Changed", {
    options: OptionManager.options,
  });
};

Background.refreshBackupListUI = async function() {
  Utils.sendMessage("BackupList:Changed", {
    backupList: await StorageManager.Local.getBackUpList(),
  });
};

Background.refreshUi = function() {
  Utils.sendMessage("Groups:Changed", {
    groups: GroupManager.groups,
    delayedTasks: TaskManager.fromUI,
  });
};

/* Background.onRemoveHiddenTab = function({tabId}) {
  TabHidden.closeHiddenTabs(tabId);
};

Background.onRemoveHiddenTabsInGroup = function({groupId}) {
  const groupIndex = GroupManager.getGroupIndexFromGroupId(groupId);
  const tabIds = GroupManager.groups[groupIndex].tabs.map(({id}) => id);
  TabHidden.closeHiddenTabs(tabIds);
}; */

Background.onOpenGroupInNewWindow = function({groupId}) {
  WindowManager.selectGroup(groupId, {newWindow: true});
};

Background.onOpenGuide = function() {
  Utils.openUrlOncePerWindow(
    "https://morikko.github.io/synctabgroups/#guide"
  );
}

Background.onGroupAdd = function({title}) {
  try {
    GroupManager.addGroup({title});
  } catch (e) {
    LogManager.error(e);
  }
};

Background.onGroupAddWithTab = function({
  title,
  sourceGroupId,
  tabIndex,
}) {
  TabManager.moveTabToNewGroup(
    sourceGroupId,
    tabIndex,
    title,
  );
};

Background.onGroupClose = function({
  groupId,
  taskRef,
}) {
  let delayedFunction = async() => {
    try {
      await WindowManager.closeGroup(
        groupId,
        {close_window: false}
      );
      Background.refreshUi();
      return "Background.onGroupClose done!";
    } catch (e) {
      LogManager.error(e);
    }
  };

  TaskManager.fromUI[TaskManager.CLOSE_REFERENCE].manage(
    taskRef,
    delayedFunction,
    groupId,
  );
};

Background.onGroupRemove = async function({
  groupId,
  taskRef,
}) {
  return new Promise((resolve, reject)=>{
    let delayedFunction = async() => {
      await WindowManager.removeGroup(
        groupId
      );
      resolve();
    };

    TaskManager.fromUI[TaskManager.REMOVE_REFERENCE].manage(
      taskRef,
      delayedFunction,
      groupId,
    );
  })
};

Background.onGroupRename = function({
  groupId,
  title,
}) {
  GroupManager.renameGroup(
    GroupManager.getGroupIndexFromGroupId(groupId),
    title
  );
};

Background.onGroupSelect = function({groupId}) {
  WindowManager.selectGroup(
    groupId,
    {newWindow: false}
  );
};

Background.onTabSelect = function({
  tabIndex,
  groupId,
  newWindow,
}) {
  TabManager.selectTab(
    tabIndex,
    groupId,
    newWindow,
  );
};

Background.onMoveTabToGroup = async function({
  sourceGroupId,
  sourceTabIndex,
  targetGroupId,
  targetTabIndex,
}) {
  await TabManager.moveTabBetweenGroups(
    sourceGroupId,
    sourceTabIndex,
    targetGroupId,
    targetTabIndex,
  );
};

Background.onBookmarkSave = function() {
  StorageManager.Bookmark.backUp(GroupManager.getCopy(), true);
};

Background.onOpenSettings = function(active=true) {
  Utils.openUrlOncePerWindow(browser.extension.getURL(
    "/optionpages/option-page.html"
  ), active);
};

Background.onRemoveAllGroups = function() {
  GroupManager.removeAllGroups();
};

Background.onReloadGroups = function() {
  GroupManager.reloadGroupsFromDisk();
};

Background.changeSynchronizationStateOfWindow = async function({
  isSync,
  windowId,
}) {
  try {
    if (isSync) {
      await WindowManager.integrateWindow(windowId, {even_new_one: true});
    } else {
      try {
        let currentGroupId = GroupManager.getGroupIdInWindow(
          windowId
        );
        GroupManager.removeGroupFromId(currentGroupId);
      } catch (e) {
        LogManager.error(e, {
          isSync,
          windowId,
        });
      }
    }
  } catch (e) {
    LogManager.error(e, {arguments});
  }
};

Background.onTabClose = async function({
  groupId,
  tabIndex,
}) {
  try {
    await GroupManager.removeTabFromIndexInGroupId(
      groupId,
      tabIndex
    );
  } catch (e) {
    LogManager.error(e);
  }
};

Background.onTabOpen = async function({
  tab,
}) {
  try {
    const currentWindow = await browser.windows.getLastFocused();
    await TabManager.openListOfTabs(
      [tab],
      currentWindow.id, {
        inLastPos: true,
      })
  } catch (e) {
    LogManager.error(e);
  }
};

Background.onImportGroups = function({
  content_file,
  filename,
}) {
  Selector.onOpenGroupsSelector({
    title: 'From file: ' + filename,
    groups: StorageManager.File.importGroupsFromFile(content_file),
    type: Selector.TYPE.IMPORT,
  });
};

Background.onExportGroups = function() {
  Selector.onOpenGroupsSelector({
    title: 'Current groups at ' + new Date(),
    groups: GroupManager.getCopy(),
    type: Selector.TYPE.EXPORT,
  });
};

Background.onExportBackUp = async function(id) {
  Selector.onOpenGroupsSelector({
    title: 'Back up: ' + StorageManager.Local.getBackUpDate(id),
    groups: (await StorageManager.Local.getBackUp(id)),
    type: Selector.TYPE.EXPORT,
  });
};

Background.onImportBackUp = async function(id) {
  Selector.onOpenGroupsSelector({
    title: 'Back up: ' + StorageManager.Local.getBackUpDate(id),
    groups: (await StorageManager.Local.getBackUp(id)),
    type: Selector.TYPE.IMPORT,
  });
};

Background.onRemoveBackUp = async function(ids) {
  await StorageManager.Local.removeBackup(ids);
};

Background.onGroupChangePosition = async function({
  groupId,
  position,
}) {
  await GroupManager.changeGroupPosition(
    groupId,
    position
  );
};

Background.onTabChangePin = async function({
  groupId,
  tabIndex,
}) {
  await TabManager.changePinState(
    groupId,
    tabIndex,
  );
};

Background.onChangeExpand = function({
  groupId,
  expand,
}) {
  GroupManager.changeExpandState(
    groupId,
    expand,
  );
};

Background.refreshData = function({
  all_tabs=false,
}={}) {
  if (all_tabs) {
    Background.sendAllTabs();
  } else {
    Background.refreshUi();
  }
  Background.refreshOptionsUI();
}

Background.sendAllTabs = async function() {
  const windows = await browser.windows.getAll({populate: true});
  const groups = windows.map((window, index) =>{
    return new GroupManager.Group({
      id: index,
      title: "Window " + window.id,
      tabs: window.tabs,
      windowId: window.id,
      incognito: window.incognito,
    })
  })
  Utils.sendMessage("Tabs:All", {
    groups,
  });
}



/*** Init CRITICAL Event ***/
browser.runtime.onInstalled.addListener((details) => {
  // Only when the extension is installed for the first time
  if (details.reason === "install") {
    Events.Install.onNewInstall();
    LogManager.information(LogManager.EXTENSION_INSTALLED);
  // Development mode detection
  } else if ((Utils.isFirefox() && details.temporary)
      || (Utils.isChrome() && details.reason === "update" && (browser.runtime.getManifest()).version === details.previousVersion)) {

    Events.Install.onDevelopmentInstall();
  // Extension update detection
  } else if (details.reason === "update"
      && (browser.runtime.getManifest()).version !== details.previousVersion) {
    Events.Install.onUpdate(details.previousVersion);
    LogManager.information(LogManager.EXTENSION_UPDATED);
  }
});

if (Utils.isChrome()) { // Extension tabs are closed on update
  browser.runtime.onUpdateAvailable.addListener(TabManager.undiscardAll);
}

// START of the extension
Background.init();
