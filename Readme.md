<p align="center">
<img width=12.5% src="https://github.com/sandiz/rs-manager/blob/master/src/assets/icons/icon-1024x1024.png">
</p>
<p align="center">
<a href="https://github.com/sandiz/rs-manager/releases/latest"><img src="https://img.shields.io/github/release/sandiz/rs-manager.svg" /></a>
<a href="https://github.com/sandiz/rs-manager/issues"><img src="https://img.shields.io/github/issues/sandiz/rs-manager.svg" /> </a>
<img src="https://img.shields.io/badge/contributions-welcome-orange.svg" />
<img src="https://img.shields.io/github/license/sandiz/rs-manager.svg" />
</p>


# Rocksmith Manager
Rocksmith's UI leaves a lot to be desired especially when you have a lot of songs in your collection.  Rocksmith Manager uses Rocksmith + Steam data to consolidate stats/mastery/dlc/setlists under one roof. It also tracks your live session, showing you your accuracy, notes hit/missed in realtime.

![Dashboard](https://github.com/sandiz/rs-manager/raw/master/screenshots/images/dashboard.png)
![Rocksmith Live](https://github.com/sandiz/rs-manager/raw/master/screenshots/images/rs-live.png)

## Usage
- [Settings](#settings)
    - Use the settings view to link your Rocksmith and Steam Profile
- [PSARC Explorer](#psarc-explorer)
    - Choose Steam/SteamApps/common/Rocksmith2014/ as your `psarc` folder to generate a list of all songs you own. Once the scan is complete, click the `Update Songs Owned` button. The Songs->Owned section will be populated with all the info extracted from the psarc files. (Use this to also keep your song collection up to date after you buy new songs froms Steam)
- [Songs Owned](#songs-owned)
    - Songs->Owned section should now list songs that you own. You can use basic operations like search, sort, filter as well as view YouTube vidoes of your songs or add them to setlists. If you linked your Rocksmith profile in [Settings](#settings) you can Update RS Favorites/Mastery by clicking the appropriate button
- [RS Catalog](#songs-available)
    - This section should already be populated with all the dlc's released so far. You can use the options in this view to keep the list up to date as well as retreive metadata from steam about ownership/acquire date. (requires steam profile to be linked in Settings)
- [Setlist](#setlist)
    - This section is used to create custom setlists from your songs library. There are two types of setlists, [Manual](#setlist-custom) setlist where you add songs manually from the library and [Generated](#generated-setlist) setlist where you use filters to select songs from the library.
- [Rocksmith Live](#rocksmith-live)
    - Rocksmith Live tracks your current live rocksmith session, showing accuracy, hit/miss streaks
    and other song info. Needs mono installed, requires elevated privileges on macOS

## Screenshots
### Stats - Learn a song and Score Attacks stats
![Stats](https://github.com/sandiz/rs-manager/raw/master/screenshots/images/dashboard.stats.png)
### Songs Owned - All the songs imported via psarc explorer
![Songs Owned](https://github.com/sandiz/rs-manager/raw/master/screenshots/images/songs.owned.png)
### Rocksmith Live - Rocksmith Live stats like accuracy, streaks, hits and misses
![Rocksmith Live](https://github.com/sandiz/rs-manager/raw/master/screenshots/images/rs-live.png)
### Songs Available - Catalog of all steam DLC released
![Songs Available](https://github.com/sandiz/rs-manager/raw/master/screenshots/images/songs.available.png)
### Song Preview - YouTube preview for song selected and other options
![Songs Available](https://github.com/sandiz/rs-manager/raw/master/screenshots/images/songPreview.png)
### Setlist
### Generated Setlist - list of songs chosen via Setlist filters
![Filter One](https://raw.githubusercontent.com/sandiz/rs-manager/master/screenshots/images/custom.setlist.filterone.jpg)

![Filter Two](https://raw.githubusercontent.com/sandiz/rs-manager/master/screenshots/images/custom.setlist.filtertwo.jpg)
### RS favorites - All the songs in rocksmith favorites in-game playlist
![Setlist favorites](https://github.com/sandiz/rs-manager/raw/master/screenshots/images/setlist.favorites.png)
### Setlist Custom - list of songs manually added to setlist
![Setlist Custom](https://github.com/sandiz/rs-manager/raw/master/screenshots/images/setlist.practicelist.png)
### PSARC Explorer - scan and import all Rocksmith songs
![PSARC Explorer](https://github.com/sandiz/rs-manager/raw/master/screenshots/images/psarcExplorer.png)
### PSARC Info/Extract - inspect psarc files for more details
![PSARC Explorer](https://github.com/sandiz/rs-manager/raw/master/screenshots/images/extractFromPsarc.png)
### Settings
![Settings](https://github.com/sandiz/rs-manager/raw/master/screenshots/images/settings.png)


## TODO
- generate youtube playlist of current view

## Development
- Instructions for dev
    - `yarn install` to install all dependencies
    - `yarn start` to launch app in debug mode
- Instructions for build
    - `yarn run build` to generate build files
    - `yarn run package-mac` for mac builds
    - `yarn run package-win` for win builds

## Thanks
   - [kokolihapihvi](https://github.com/kokolihapihvi/RockSniffer) for the awesome `RockSniffer` tool.
   - [zorgiepoo](https://github.com/zorgiepoo/Bit-Slicer) for the awesome `Bit-Slicer` tool.

## Contributors

Thanks goes to these wonderful people ([emoji key](https://github.com/kentcdodds/all-contributors#emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore -->
| [<img src="https://avatars3.githubusercontent.com/u/1568662?v=4" width="100px;"/><br /><sub><b>Justin Aiken</b></sub>](https://justinaiken.com)<br />[🐛](https://github.com/sandiz/rs-manager/issues?q=author%3AJustinAiken "Bug reports") [🤔](#ideas-JustinAiken "Ideas, Planning, & Feedback") [💻](https://github.com/sandiz/rs-manager/commits?author=JustinAiken "Code") |
| :---: |
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/kentcdodds/all-contributors) specification. Contributions of any kind welcome!
