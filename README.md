# Sync Tab Groups

Sync Tab Groups is an easy way to manage all your tabs. You organize them depending on a topic by group. Groups can be closed and reopend without caring about your session. Moreover, you can esily search, active, move, save and remove your groups and tabs.

Check the [website](https://morikko.github.io/synctabgroups/) for more information (video, explanations, guides...)

[Try it now on Firefox](https://addons.mozilla.org/en-US/firefox/addon/sync-tab-groups/)

# Limitations (Important for not losing data)

 - Tabs in closed group are REALLY closed
 - Switching to a group, close all the current tabs in the window
 - Previous sessions (back button) are lost when closing a group
 - Temporary data like forms are lost when closing a group
 - All tabs are loaded when a group is opened (Will be fixed with Firefox 58 on January) ([More info](https://github.com/Morikko/sync-tab-groups/issues/5#issuecomment-344753295))
 
# Contributing

I would gladly accept other translations. Add it in `_locales/`, while following the en (English) file. Change message and description parts only.

# Bugs
If you find a bug, please [open an issue](https://github.com/Morikko/sync-tab-groups/issues).

# Build

## Makefile
- `make js` compile all .jsx -> .js
- `make watch` launch a daemon that compile all .jsx -> js and do it again when you save a .jsx file
- `make watch REBUILD=` Idem as previous but recompile all .jsx files first
- `make stop-watch` kill previous daemon
- `make release` Create the extension in release mode, a zip and a xpi in build/
- `make` or `make all` Compile all .jsx and export the release
- `make clean` Remove files built in build/ only

## Release mode
1. included scripts are in .production.min.js instead of .development.js
2. Utils.DEBUG_MODE is set to false
3. Extension in build doesn't include
  - .jsx files
  - .development.js libraries
  - tests files
4. ZIP and XPI files are mirror of extension in build/


# Credits
Translation:
 - @bitkleberAST for the German 
 - Александр for the Russian
 - @lucas-mancini for the Spanish

Bootstraped from this project: [denschub/firefox-tabgroups](https://github.com/denschub/firefox-tabgroups)

[Website Repository](https://github.com/Morikko/synctabgroups)

Thank you all of you for helping me improving and fixing the extension :)
