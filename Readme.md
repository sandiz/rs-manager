<p align="center">
<img width=12.5% src="https://github.com/sandiz/rs-manager/raw/master/src/assets/icons/icon-1024x1024.png">
</p>
<p align="center">
<a href="https://github.com/sandiz/rs-manager/releases/latest"><img src="https://img.shields.io/github/release/sandiz/rs-manager.svg" /></a>
<a href="https://travis-ci.com/sandiz/rs-manager/builds/"><img src="https://travis-ci.com/sandiz/rs-manager.svg?branch=master" /></a>
<a href="https://github.com/sandiz/rs-manager/issues"><img src="https://img.shields.io/github/issues/sandiz/rs-manager.svg" /> </a>
<img src="https://img.shields.io/badge/contributions-welcome-orange.svg" />
<img src="https://img.shields.io/github/license/sandiz/rs-manager.svg" />

</p>

# Rocksmith Manager (Windows/Mac [Download](https://github.com/sandiz/rs-manager/releases/latest))
Rocksmith's UI leaves a lot to be desired especially when you have a lot of songs in your collection.  Rocksmith Manager uses Rocksmith + Steam data to consolidate stats/mastery/dlc/setlists under one roof. It also tracks your live session, showing you your accuracy, notes hit/missed in realtime.

![Dashboard](https://github.com/sandiz/rs-manager/raw/master/screenshots/images/dashboard.png)
![RSLive - Phrases](https://raw.githubusercontent.com/sandiz/rs-manager/master/screenshots/images/rslive-phrases.png)

## Features
 - Stats
    - High level mastery/completion/score attack [stats](#stats) of your entire collection / setlists
    - Low level stats ( [mastery](#songs-owned), [progress history](#progress-history))
 - Steam
    - steam integration (dlc catalog + purchased [stats](#songs-available))
    - sort by acquired date
    - discover similar dlcs (genre based)
 - Realtime
    - [track](#hit-tracking) note hit on a per phrase level
    - [track](#perfect-tracking) perfect hits on a per phrase level (score attack)
    - [record](#record-audio) raw audio
 - Setlists
    - unlimited setlists to sort your collection
    - supports manual, filter based and rocksmith in-game song lists
    - [export](#export-setlist) to Rocksmith song list

## Screenshots
### Stats
![Stats](https://github.com/sandiz/rs-manager/raw/master/screenshots/images/dashboard.stats-2.png)
### Songs Owned
![Songs Owned](https://github.com/sandiz/rs-manager/raw/master/screenshots/images/songs.owned.png)
### Rocksmith Live - Rocksmith Live stats like accuracy, streaks, hits and misses
![Rocksmith Live](https://github.com/sandiz/rs-manager/raw/master/screenshots/images/rs-live.png)
### Progress History
![Progress History](https://github.com/sandiz/rs-manager/raw/master/screenshots/images/progress-history.png)
### Hit Tracking
![Percent](https://github.com/sandiz/rs-manager/raw/master/screenshots/images/hit-percent-chart-guitar.png)
### Perfect Tracking
![Percent](https://github.com/sandiz/rs-manager/raw/master/screenshots/images/perfect-percent-chart-guitar.png)
### Record Audio
![Record](https://github.com/sandiz/rs-manager/raw/master/screenshots/images/raw-record-finish.png)
### Songs Available
![Songs Available](https://github.com/sandiz/rs-manager/raw/master/screenshots/images/songs.available.png)
### Song Preview - YouTube preview for song selected and other options
![Songs Available](https://github.com/sandiz/rs-manager/raw/master/screenshots/images/songPreview.png)
### Setlist
### Generated Setlist - list of songs chosen via Setlist filters
![Filter One](https://raw.githubusercontent.com/sandiz/rs-manager/master/screenshots/images/custom.setlist.filterone.jpg)

![Filter Two](https://raw.githubusercontent.com/sandiz/rs-manager/master/screenshots/images/custom.setlist.filtertwo.jpg)
### PSARC Explorer - scan and import all Rocksmith songs
![PSARC Explorer](https://github.com/sandiz/rs-manager/raw/master/screenshots/images/psarcExplorer.png)
### PSARC Info/Extract - inspect psarc files for more details
![PSARC Explorer](https://github.com/sandiz/rs-manager/raw/master/screenshots/images/extractFromPsarc.png)
### Settings
![Settings](https://github.com/sandiz/rs-manager/raw/master/screenshots/images/settings.png)
### Export Setlist
<img width=100% src="https://raw.githubusercontent.com/sandiz/rs-manager/master/screenshots/images/exportsetlistmain.png"/>


## Development
- Instructions for dev
    - `yarn install` to install all dependencies
    - `yarn start` to launch app in debug mode
- Instructions for build
    - `yarn run build` to generate build files
    - `yarn run package-mac` for mac builds
    - `yarn run package-win` for win builds

## Thanks
   - [@kokolihapihvi](https://github.com/kokolihapihvi/RockSniffer) for the awesome `RockSniffer` tool.
   - [@zorgiepoo](https://github.com/zorgiepoo/Bit-Slicer) for the awesome `Bit-Slicer` tool.
   - [@BuongiornoTexas](https://github.com/BuongiornoTexas/rsrtools) for the fantastic `rsrtools` package

## Contributors

Thanks goes to these wonderful people ([emoji key](https://github.com/kentcdodds/all-contributors#emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore -->
| [<img src="https://avatars3.githubusercontent.com/u/1568662?v=4" width="100px;"/><br /><sub><b>Justin Aiken</b></sub>](https://justinaiken.com)<br />[🐛](https://github.com/sandiz/rs-manager/issues?q=author%3AJustinAiken "Bug reports") [🤔](#ideas-JustinAiken "Ideas, Planning, & Feedback") [💻](https://github.com/sandiz/rs-manager/commits?author=JustinAiken "Code") |
| :---: |
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/kentcdodds/all-contributors) specification. Contributions of any kind welcome!
