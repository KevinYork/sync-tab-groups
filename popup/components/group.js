/*
Copyright (c) 2017 Eric Masseran

From: https://github.com/denschub/firefox-tabgroups
Copyright (c) 2015 Dennis Schubert
*/
const Group = React.createClass({
  propTypes: {
    group: React.PropTypes.object.isRequired,
    currentWindowId: React.PropTypes.number.isRequired,
    currentlyClosing: React.PropTypes.bool.isRequired,
    currentlyRemoving: React.PropTypes.bool.isRequired,
    onGroupClick: React.PropTypes.func,
    onGroupDrop: React.PropTypes.func,
    onGroupCloseClick: React.PropTypes.func,
    onGroupRemoveClick: React.PropTypes.func,
    onGroupTitleChange: React.PropTypes.func,
    onTabClick: React.PropTypes.func,
    onTabDrag: React.PropTypes.func,
    onTabDragStart: React.PropTypes.func,
    onOpenInNewWindowClick: React.PropTypes.func,
    onCloseTab: React.PropTypes.func,
    onOpenTab: React.PropTypes.func,
    searchGroupResult: React.PropTypes.object,
    currentlySearching: React.PropTypes.bool,
    showTabsNumber: React.PropTypes.bool,
  },

  getInitialState: function() {
    return {
      // Removing is more priority
      closing: this.props.currentlyClosing && !this.props.currentlyRemoving,
      removing: this.props.currentlyRemoving,
      editing: false,
      currentlySearching: this.props.currentlySearching,
      expanded: false,
      opened: this.props.group.windowId !== browser.windows.WINDOW_ID_NONE,
      draggingOverCounter: 0,
      dragSourceGroup: false,
      newTitle: Utils.getGroupTitle(this.props.group)
    };
  },

  findExpandedState: function(current_state, previous_searching, current_searching) {
    if (previous_searching !== current_searching) {
      return current_searching;
    } else {
      return current_state;
    }
  },

  // When a component got new props, use this to update
  componentWillReceiveProps: function(nextProps) {
    let expanded_state = this.findExpandedState(
      this.state.expanded,
      this.state.currentlySearching,
      nextProps.currentlySearching
    );
    this.setState({
      closing: nextProps.currentlyClosing && !nextProps.currentlyRemoving,
      removing: nextProps.currentlyRemoving,
      opened: nextProps.group.windowId !== browser.windows.WINDOW_ID_NONE,
      expanded: expanded_state,
      currentlySearching: nextProps.currentlySearching,
    })
  },

  render: function() {

    let titleElement;
    if (this.state.editing) {
      titleElement = React.DOM.input({
        type: "text",
        defaultValue: Utils.getGroupTitle(this.props.group),
        onChange: (event) => {
          this.setState({
            newTitle: event.target.value
          });
        },
        onClick: (event) => {
          event.stopPropagation();
        },
        onKeyUp: this.handleGroupTitleInputKey
      });
    } else {
      let title = Utils.getGroupTitle(this.props.group);
      if (this.props.showTabsNumber) {
        title = title + "  (" + this.props.group.tabs.length + ")";
      }
      titleElement = React.DOM.span({
          className: "group-title-text"
        },
        title
      );
    }

    let groupClasses = classNames({
      active: (this.props.group.windowId > -1),
      editing: this.state.editing,
      closing: this.state.closing,
      removing: this.state.removing,
      draggingOver: this.state.draggingOverCounter !== 0,
      dragSourceGroup: this.state.dragSourceGroup,
      expanded: this.state.expanded,
      focusGroup: this.props.currentWindowId === this.props.group.windowId,
      group: true,
      hiddenBySearch: !this.props.searchGroupResult.atLeastOneResult,
    });

    return (
      React.DOM.li({
          className: groupClasses,
          onClick: this.handleGroupClick,
          onDragOver: this.handleGroupDragOver,
          onDragEnter: this.handleGroupDragEnter,
          onDragLeave: this.handleGroupDragLeave,
          onDrop: this.handleGroupDrop
        },
        React.DOM.span({
            className: "group-title"
          },
          titleElement,
          React.createElement(
            GroupControls, {
              closing: this.state.closing,
              removing: this.state.removing,
              editing: this.state.editing,
              expanded: this.state.expanded,
              opened: this.state.opened,
              onClose: this.handleGroupCloseClick,
              onRemove: this.handleGroupRemoveClick,
              onEdit: this.handleGroupEditClick,
              onEditAbort: this.handleGroupEditAbortClick,
              onEditSave: this.handleGroupEditSaveClick,
              onExpand: this.handleGroupExpandClick,
              onUndoCloseClick: this.handleGroupCloseAbortClick,
              onOpenInNewWindow: this.handleOpenInNewWindowClick
            }
          )
        ),
        this.state.expanded && React.createElement(
          TabList, {
            tabs: this.props.group.tabs,
            group: this.props.group,
            onTabClick: this.props.onTabClick,
            onTabDrag: this.props.onTabDrag,
            onTabDragStart: this.props.onTabDragStart,
            onTabDragEnd: this.props.onTabDragEnd,
            opened: this.state.opened,
            onCloseTab: this.props.onCloseTab,
            onOpenTab: this.props.onOpenTab,
            searchTabsResults: this.props.searchGroupResult.searchTabsResults,
          }
        )
      )
    );
  },

  handleOpenInNewWindowClick: function(event) {
    event.stopPropagation();
    this.props.onOpenInNewWindowClick(this.props.group.id);
  },

  handleGroupRemoveClick: function(event) {
    event.stopPropagation();
    this.setState({
      editing: false,
      closing: false
    });

    // Already click once, do it now
    if (this.state.removing) {
      this.setState({
        removing: false
      });
      this.props.onGroupRemoveClick(TaskManager.FORCE, this.props.group.id);
      // Delayed close
    } else {
      this.setState({
        removing: true
      });
      this.props.onGroupRemoveClick(TaskManager.ASK, this.props.group.id);
    }

  },

  handleGroupCloseClick: function(event) {
    event.stopPropagation();
    this.setState({
      editing: false,
      removing: false
    });

    // Already click once, do it now
    if (this.state.closing) {
      this.setState({
        closing: false
      });
      this.props.onGroupCloseClick(TaskManager.FORCE, this.props.group.id);
      // Delayed close
    } else {
      this.setState({
        closing: true
      });
      this.props.onGroupCloseClick(TaskManager.ASK, this.props.group.id);
    }

  },

  handleGroupCloseAbortClick: function(event) {
    event.stopPropagation();

    this.props.onGroupCloseClick(TaskManager.CANCEL, this.props.group.id);
    this.props.onGroupRemoveClick(TaskManager.CANCEL, this.props.group.id);

    this.setState({
      closing: false,
      removing: false
    });
  },

  handleGroupClick: function(event) {
    event.stopPropagation();
    if (this.props.currentWindowId !== this.props.group.windowId)
      this.props.onGroupClick(this.props.group.id);
    window.close();
  },

  handleGroupEditClick: function(event) {
    event.stopPropagation();
    this.setState({
      editing: !this.state.editing
    });
  },

  handleGroupEditAbortClick: function(event) {
    event.stopPropagation();
    this.setState({
      editing: false
    });
  },

  handleGroupEditSaveClick: function(event) {
    event.stopPropagation();
    this.setState({
      editing: false
    });
    this.props.onGroupTitleChange(this.props.group.id, this.state.newTitle);
  },

  handleGroupExpandClick: function(event) {
    event.stopPropagation();
    this.setState({
      expanded: !this.state.expanded
    });
  },

  handleGroupTitleInputKey: function(event) {
    event.stopPropagation();
    if (event.keyCode === 13) { // Enter key
      this.setState({
        editing: false
      });
      this.props.onGroupTitleChange(this.props.group.id, this.state.newTitle);
    }
  },

  handleGroupDrop: function(event) {
    event.stopPropagation();

    this.setState({
      draggingOverCounter: 0
    });

    // -0 to get
    let sourceGroup = parseInt(event.dataTransfer.getData("tab/group"), 10);
    let tabIndex = parseInt(event.dataTransfer.getData("tab/index"), 10);

    this.props.onGroupDrop(
      sourceGroup,
      tabIndex,
      this.props.group.id
    );
  },

  handleGroupDragOver: function(event) {
    event.stopPropagation();
    event.preventDefault();
    return false;
  },

  handleGroupDragEnter: function(event) {
    event.stopPropagation();
    event.preventDefault();

    let sourceGroupId = event.dataTransfer.getData("tab/group");
    let isSourceGroup = sourceGroupId == this.props.group.id;
    this.setState({
      dragSourceGroup: isSourceGroup
    });

    let draggingCounterValue = (this.state.draggingOverCounter == 1) ? 2 : 1;
    this.setState({
      draggingOverCounter: draggingCounterValue
    });
  },

  handleGroupDragLeave: function(event) {
    event.stopPropagation();
    event.preventDefault();

    if (this.state.draggingOverCounter == 2) {
      this.setState({
        draggingOverCounter: 1
      });
    } else if (this.state.draggingOverCounter == 1) {
      this.setState({
        draggingOverCounter: 0
      });
    }

    return false;
  },
});
