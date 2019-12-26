v3.0.6
- fix for update toaster popping too many times in rslive
- fix for performance regression with highcharts (pinned to 6.2.0)
v3.0.5
- fix for steam login not working (electron cookie api change)
v3.0.4
- bump all package versions to latest (dec 2019)
- react-datepicker still pinned to 1.8.0
- i18next pinned to 15.1.3
- react-i18next pinned to 9.0.10
v3.0.3
- bump all package versions to latest (nov 2019) (electron@7)
- react-datepicker still pinned to 1.8.0
- i18next pinned to 15.1.3
- react-i18next pinned to 9.0.10
v3.0.2
- add support for custom tags for arrangements
- add support for filtering by song tags in songowned, setlist (rs, manual, generated)
- add support for custom css
v3.0.1
- update all packages
- add file watcher
v3.0.0
- meta release containing v2.2.0 - v2.7.5
v2.7.5
- add drag drop to custom columns setting option
- update packages to latest (also removes functions that are deprecated by react)
- convert dlc name/tags formatter to flex
- update react-select api usage
v2.7.0
- add custom columns settings option
- add generateColumns api to generate columns based on the above setting
v2.6.0
- gh-pages 
- move screenshots to docs/screenshots
v2.5.0
- add ftue wizard for new users (triggers when songcount == 0)
- metaWorker for (import psarc, update songs db and update stats) task.
- add getRocksmithInstallFolder to detect rs install folder
v2.4.0
- performance improvements for sqlite and psarc operations
    - batch all sqlite inserts
    - psarc reads are now parallelized
- tabs are now cached instead of getting created on switch
- async operations are now independent of tabs (uses message passing via dispatcher service)
v2.3.0
- translated most views (todo: rslive, settings options)
- updated showOpenDialog and showSaveDialog to async
- fixed crash with localization load, electron window is now created after all i18n resources are loaded
- added `ellipsy-text` css to fields which are affected by long translations
v2.2.0
- updateed all packages to latest released version (aug 2019)
- react-datepicker is now pinned to 1.8 since it depends on moment
- electron-rebuild deprecated, electron upgraded to 6, node to 12
- electron-builder now builds dmg, zip, nsis
- setZoomFactor removed from preload.js to fix ready-to-show regression
