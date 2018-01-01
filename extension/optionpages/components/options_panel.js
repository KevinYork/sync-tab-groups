const OptionsPanel = React.createClass({
  propTypes: {
    onOptionChange: React.PropTypes.func,
    onBackUpClick: React.PropTypes.func,
    onImportClick: React.PropTypes.func,
    onExportClick: React.PropTypes.func,
    selected: React.PropTypes.string
  },

  render: function () {
    return React.createElement(
      "div",
      { id: "panel" },
      React.createElement(SettingsSection, {
        options: this.props.options, onOptionChange: this.props.onOptionChange,
        selected: this.props.selected }),
      React.createElement(ShortcutsSection, {
        options: this.props.options, onOptionChange: this.props.onOptionChange,
        selected: this.props.selected }),
      React.createElement(InterfaceSection, {
        options: this.props.options, onOptionChange: this.props.onOptionChange,
        selected: this.props.selected }),
      React.createElement(SaveSection, {
        options: this.props.options, onOptionChange: this.props.onOptionChange,
        onImportClick: this.props.onImportClick,
        onExportClick: this.props.onExportClick,
        selected: this.props.selected
        /* TODO: end of bookmark auto-save
        onBackUpClick: this.props.onBackUpClick*/ }),
      React.createElement(AboutSection, {
        selected: this.props.selected }),
      React.createElement(HelpSection, {
        selected: this.props.selected })
    );
  }
});