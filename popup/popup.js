const store = Redux.createStore(Reducer);

var sendMessage = function ( _task, _params ) {
  browser.runtime.sendMessage({
    task: _task,
    params: _params
  });
}

const Actions = {
  addGroup: function() {
    sendMessage("Group:Add", {});
  },

  addGroupWithTab: function(sourceGroupID, tabIndex) {
    sendMessage("Group:AddWithTab", {sourceGroupID:sourceGroupID, tabIndex:tabIndex});
  },

  closeGroup: function(groupID) {
    sendMessage("Group:Close", {groupID:groupID});
  },

  uiHeightChanged: function() {
    sendMessage("UI:Resize", {
      width: document.body.clientWidth,
      height: document.body.clientHeight
    });
  },

  renameGroup: function(groupID, title) {
    sendMessage("Group:Rename", {
      groupID:groupID,
      title:title
    });
  },

  selectGroup: function(groupID) {
    sendMessage("Group:Select", {groupID:groupID});
  },

  moveTabToGroup: function(sourceGroupID, tabIndex, targetGroupID) {
    sendMessage("Group:Drop", {sourceGroupID:sourceGroupID, tabIndex:tabIndex, targetGroupID:targetGroupID});
  },

  selectTab: function(groupID, tabIndex) {
    sendMessage("Tab:Select", {groupID:groupID, tabIndex:tabIndex});
  },

  dragTab: function(groupID, tabIndex) {
    sendMessage("Tab:Drag", {groupID:groupID, tabIndex:tabIndex});
  },

  dragTabStart: function(groupID, tabIndex) {
    sendMessage("Tab:DragStart", {groupID:groupID, tabIndex:tabIndex});
  }
};

document.addEventListener("DOMContentLoaded", () => {
  ReactDOM.render(
    React.createElement(
      ReactRedux.Provider,
      {store: store},
      React.createElement(App, {
        onGroupAddClick: Actions.addGroup,
        onGroupAddDrop: Actions.addGroupWithTab,
        onGroupClick: Actions.selectGroup,
        onGroupDrop: Actions.moveTabToGroup,
        onGroupCloseClick: Actions.closeGroup,
        onGroupTitleChange: Actions.renameGroup,
        onTabClick: Actions.selectTab,
        onTabDrag: Actions.dragTab,
        onTabDragStart: Actions.dragTabStart,
        uiHeightChanged: Actions.uiHeightChanged
      })
    ),
    document.getElementById("content")
  );
});

var popupMessenger = function ( message, sender, sendResponse ) {
  switch ( message.task ) {
    case "Groups:Changed":
      store.dispatch(ActionCreators.setTabgroups(message.params.tabgroups));
      break;
    case "Groups:CloseTimeoutChanged":
      store.dispatch(ActionCreators.setGroupCloseTimeout(message.params.timeout));
      break;
    default:

  }
  console.log( message );
  console.log( sender );
}

browser.runtime.onMessage.addListener(popupMessenger);
