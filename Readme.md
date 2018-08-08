# Rocksmith Manager
Rocksmith's UI leaves a lot to be desired especially when you have a lot of songs in your collection.  Rocksmith Manager uses Rocksmith + Steam data to consolidate stats/mastery/dlc/setlists under one roof. 

![Dashboard](https://github.com/sandiz/rs-manager/raw/master/assets/images/dashboard.png)
## Release
Version v0.6.3 - [Mac](https://github.com/sandiz/rs-manager/releases/latest) | [Windows](https://github.com/sandiz/rs-manager/releases/latest)


## Usage
- [Settings](#settings)
    - Use the settings view to link your Rocksmith and Steam Profile
- [PSARC Explorer](#psarc-explorer)
    - Choose Steam/SteamApps/common/Rocksmith2014/ as your `psarc` folder to generate a list of all songs you own. Once the scan is complete, click the `Update Songs Owned` button. The Songs->Owned section will be populated with all the info extracted from the psarc files. (Use this to also keep your song collection up to date after you buy new songs froms Steam)
- [Songs Owned](#songs-owned)
    - Songs->Owned section should now list songs that you own. You can use basic operations like search, sort, filter as well as view YouTube vidoes of your songs or add them to setlists. If you linked your Rocksmith profile in [Settings](#settings) you can Update RS Favorites/Mastery by clicking the appropriate button
- [RS Catalog](#songs-available)
    - This section should already be populated with all the dlc's released so far. You can use the options in this view to keep the list up to date as well as retreive metadata from steam about ownership/acquire date. (requires steam profile to be linked in Settings)

## Screenshots
### Songs Owned
![Songs Owned](https://github.com/sandiz/rs-manager/raw/master/assets/images/songs.owned.png)
### Songs Available
![Songs Available](https://github.com/sandiz/rs-manager/raw/master/assets/images/songs.available.png)
### Song Preview
![Songs Available](https://github.com/sandiz/rs-manager/raw/master/assets/images/songPreview.png)
### Setlist favorites
![Setlist favorites](https://github.com/sandiz/rs-manager/raw/master/assets/images/setlist.favorites.png)
### Setlist Custom
![Setlist Custom](https://github.com/sandiz/rs-manager/raw/master/assets/images/setlist.practicelist.png)
### PSARC Explorer
![PSARC Explorer](https://github.com/sandiz/rs-manager/raw/master/assets/images/psarcExplorer.png)
### PSARC Info/Extract
![PSARC Explorer](https://github.com/sandiz/rs-manager/raw/master/assets/images/extractFromPsarc.png)
### Settings
![Settings](https://github.com/sandiz/rs-manager/raw/master/assets/images/settings.png)


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

## Contributors

Thanks goes to these wonderful people ([emoji key](https://github.com/kentcdodds/all-contributors#emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore -->
| [<img src="https://avatars3.githubusercontent.com/u/1568662?v=4" width="100px;"/><br /><sub><b>Justin Aiken</b></sub>](https://justinaiken.com)<br />[🐛](https://github.com/sandiz/rs-manager/issues?q=author%3AJustinAiken "Bug reports") [🤔](#ideas-JustinAiken "Ideas, Planning, & Feedback") [💻](https://github.com/sandiz/rs-manager/commits?author=JustinAiken "Code") |
| :---: |
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/kentcdodds/all-contributors) specification. Contributions of any kind welcome!
