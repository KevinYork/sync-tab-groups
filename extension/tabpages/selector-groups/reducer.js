const INITIAL_STATE = Immutable.Map({
  groups: [],
  options: OPTION_CONSTANTS.TEMPLATE(),
});

const Reducer = function(state = INITIAL_STATE, action) {
  switch (action.type) {
  case "GROUPS_RECEIVE":
    return state.set("groups", action.groups);
  case "OPTIONS_RECEIVE":
    return state.set("options", action.options);
  }
  return state;
};

const groupStore = Redux.createStore(Reducer);
