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
