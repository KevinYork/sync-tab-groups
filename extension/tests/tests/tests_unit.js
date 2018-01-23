// Reminder

describe("Comparator: ", ()=>{
  beforeEach(function() {
    jasmine.addMatchers(tabGroupsMatchers);
  });

  it("toEqualTabs", ()=>{
    let tabs = Session.createTabs({tabsLength: 7, pinnedTabs: 2});

    expect(tabs).toEqualTabs(tabs);

    let alter_tabs = Session.createTabs(
      {tabsLength: 7, pinnedTabs: 2}
    );

    expect(tabs).not.toEqualTabs(alter_tabs);

    expect(undefined).not.toEqualTabs(tabs);
    expect(tabs).not.toEqualTabs(undefined);
  })

  it("toEqualGroup", ()=>{
    let groups = Session.createGroup({tabsLength: 7, pinnedTabs: 2, incognito: false});
    expect(groups).toEqualGroup(groups);

    let groups_alter = Utils.getCopy(groups);
    groups_alter.incognito = true;

    let groups_alter_tabs = Utils.getCopy(groups);
    groups_alter_tabs.tabs = Session.createTabs(
      {tabsLength: 7, pinnedTabs: 2}
    );

    expect(groups).not.toEqualGroup(groups_alter);
    expect(groups).not.toEqualGroup(groups_alter_tabs);

    expect(undefined).not.toEqualGroup(groups);
    expect(groups).not.toEqualGroup(undefined);
  });

  it("toEqualGroups", ()=>{
    // TODO
  });

});

describe("Session: ", () => {

  describe("createGroup", () => {
    beforeAll(function() {
      jasmine.addMatchers(tabGroupsMatchers);
    });

    it("Group with normal tabs, title", () => {
      let title = "coucou",
        length = 5;
      let group = Session.createGroup({tabsLength: length, title: title});
      expect(group.tabs.length).toEqual(length);
      expect(group.title).toEqual(title);
    });

    it("Group with normal tabs and pinned tabs", () => {
      let pinnedLength = 2,
        length = 5;
      let group = Session.createGroup({tabsLength: length, pinnedTabs: pinnedLength});
      actualPinnedLength = group.tabs.reduce((a, b) => {
        return a + b.pinned;
      }, 0);

      expect(group.tabs.length).toEqual(length);
      expect(actualPinnedLength).toEqual(pinnedLength);
    });

    it("Group incognito", () => {
      let group = Session.createGroup({tabsLength: 1, incognito: true});
      expect(group.incognito).toBe(true);
    });

    it("Group with normal tabs, priv and ext", () => {
      let length = 5,
        privLength = 2,
        extLength = 2;
      let group = Session.createGroup({tabsLength: length, privilegedLength: privLength, extensionUrlLength: extLength});
      let actualPrivLength = group.tabs.filter((tab)=>{
        return Session.ListOfPrivTabURLs.filter((list)=>{
          return tab.url.includes(list.url);
        }).length;
      }).length;
      let actualExtLength = group.tabs.filter((tab)=>{
        return Session.ListOfExtensionTabURLs.filter((list)=>{
          return tab.url.includes(list.url);
        }).length;
      }).length;

      expect(group.tabs.length).toEqual(length);
      expect(actualPrivLength).toEqual(privLength);
      expect(actualExtLength).toEqual(extLength);
    });

    it("Manage pinned tabs overflow", () => {
      let pinnedLength = 7,
        length = 5;
      let group = Session.createGroup({tabsLength: length, pinnedTabs: pinnedLength});
      actualPinnedLength = group.tabs.reduce((a, b) => {
        return a + b.pinned;
      }, 0);

      expect(group.tabs.length).toEqual(length);
      expect(actualPinnedLength).toEqual(length);
    });

    it("Manage ext/priv tabs overflow", () => {
      let length = 3,
        privLength = 2,
        extLength = 2;
      let group = Session.createGroup({tabsLength: length, privilegedLength: privLength, extensionUrlLength: extLength});
      let actualPrivLength = group.tabs.filter((tab)=>{
        return Session.ListOfPrivTabURLs.filter((list)=>{
          return tab.url.includes(list.url);
        }).length;
      }).length;
      let actualExtLength = group.tabs.filter((tab)=>{
        return Session.ListOfExtensionTabURLs.filter((list)=>{
          return tab.url.includes(list.url);
        }).length;
      }).length;

      expect(group.tabs.length).toEqual(length);
      expect(actualPrivLength).toEqual(privLength);
      expect(actualExtLength).toEqual(length - privLength);
    });

    it("Lazy and Open Privileged urls", ()=>{
      let length = 5,
        privLength = 2,
        extLength = 2;
      let group = Session.createGroup({
        tabsLength: length,
        privilegedLength: privLength,
        extensionUrlLength: extLength,
        active: 3,
        lazyMode: true,
        openPrivileged: true,
      });
      let actualPrivLength = group.tabs.filter((tab)=>{
        return Session.ListOfPrivTabURLs.filter((list)=>{
          return Utils.extractTabUrl(tab.url).includes(list.url);
        }).length;
      }).length;

      let actualExtLength = group.tabs.filter((tab)=>{
        return Session.ListOfExtensionTabURLs.filter((list)=>{
          return  Utils.extractTabUrl(tab.url).includes(list.url);
        }).length;
      }).length;

      let openPrivLength = group.tabs.filter((tab)=>{
        return Utils.extractLazyUrl(tab.url).includes(Utils.PRIV_PAGE_URL);
      }).length;

      let lazyLength = group.tabs.filter((tab)=>{
        return tab.url.includes(Utils.LAZY_PAGE_URL);
      }).length;

      expect(group.tabs.length).toEqual(length);
      expect(actualPrivLength).toEqual(privLength);
      expect(actualExtLength).toEqual(extLength);
      expect(openPrivLength).toEqual(privLength);
      expect(lazyLength).toEqual(length-1);
    });

    it("Group global", () => {
      let title = "coucou",
        length = 5;
      let [id, group] = Session.createGroup({tabsLength: length, title: title, global: true});

      let groupIndex = GroupManager.getGroupIndexFromGroupId(id);

      TestManager.resetActiveProperties(GroupManager.groups[groupIndex].tabs);

      expect(group).toEqualGroups(GroupManager.groups[groupIndex]);

      GroupManager.removeGroupFromId(id);
    });
  });
});

describe("GroupManager: ", () => {

  describe("coherentActiveTabInGroups function: ", () => {

    beforeEach(function() {
      jasmine.addMatchers(tabGroupsMatchers);
      this.groups = [Session.createGroup({
          tabsLength: 5,
          global: false,
          pinnedTabs: 1,
          privilegedLength: 0,
          extensionUrlLength: 0,
          incognito: false,
          active: -1,
          title: "Debug coherentActiveTabInGroups"
        })];
    });

    it("No active in group", function () {
      let good_groups = Utils.getCopy(this.groups);
      good_groups[0].tabs[good_groups[0].tabs.length-1].active = true;

      GroupManager.coherentActiveTabInGroups(this.groups);

      expect(this.groups).toEqualGroup(good_groups);
    });

    it("1 active in group", function() {
      this.groups[0].tabs[3].active = true;
      let good_groups = Utils.getCopy(this.groups);

      GroupManager.coherentActiveTabInGroups(this.groups);

      expect(this.groups).toEqualGroup(good_groups);
    });

    it("3 active in group", function() {
      let good_groups = Utils.getCopy(this.groups);

      this.groups[0].tabs[3].active = true;
      this.groups[0].tabs[2].active = true;
      this.groups[0].tabs[4].active = true;

      good_groups[0].tabs[2].active = true;

      GroupManager.coherentActiveTabInGroups(this.groups);

      expect(this.groups).toEqualGroup(good_groups);
    });

    it("Empty Group", function() {
      this.groups = [Session.createGroup({
          tabsLength: 0,
          global: false,
          title: "Debug coherentActiveTabInGroups"
        })]
      let good_groups = Utils.getCopy(this.groups);

      GroupManager.coherentActiveTabInGroups(this.groups);

      expect(this.groups).toEqualGroups(good_groups);
    });
  });

});

describe("Search", () => {
  describe("Results: ", () => {

    it("Single keyword NOT found", () => {
      expect(Utils.search("coucou les amis", "dd")).toBe(false);
    });

    it("Single keyword found", () => {
      expect(Utils.search("coucou les amis", "cou")).toBe(true);
    });

    it("Multiple keywords found", () => {
      expect(Utils.search("coucou les amis", "cou les")).toBe(true);
    });

    it("Multiple keywords NOT found", () => {
      expect(Utils.search("coucou les amis", "cou du")).toBe(false);
    });

    it("Not Case Sensitive", () => {
      expect(Utils.search("coucou les amis", "CoU")).toBe(true);
    });

    it("Accept Symbols", () => {
      expect(Utils.search("coucou les @mis", "@mis")).toBe(true);
    });

    it("Accept special caracters", () => {
      expect(Utils.search("Je m'appelle éric", "m'a eric")).toBe(true);
    });
  });

  describe("Split Search in Group/Tab: ", function() {
    // Extract search value
    let groupList = new GroupList({});

    it("Group and tab", () => {
      [groupSearch, tabSearch] = groupList.extractSearchValue("g/text coucou/grow throw");
      expect(groupSearch).toBe("text coucou");
      expect(tabSearch).toBe("grow throw");
    });

    it("Group only", () => {
      [groupSearch, tabSearch] = groupList.extractSearchValue("g/text coucou/");
      expect(groupSearch).toBe("text coucou");
      expect(tabSearch).toBe("");
    });

    it("Group only without last separator", () => {
      [groupSearch, tabSearch] = groupList.extractSearchValue("g/text coucou");
      expect(groupSearch).toBe("text coucou");
      expect(tabSearch).toBe("");
    });

    it("Tab only", () => {
      [groupSearch, tabSearch] = groupList.extractSearchValue("grow throw");
      expect(groupSearch).toBe("");
      expect(tabSearch).toBe("grow throw");
    });
  });
})
