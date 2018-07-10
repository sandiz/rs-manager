# Rocksmith Manager
Rocksmith's UI leaves a lot to be desired especially when you have a lot of songs in your collection.  Rocksmith Manager uses Rocksmith + Steam data to consolidate stats/mastery/dlc/setlists under one roof. 

![Dashboard](https://github.com/sandiz/rs-manager/raw/master/assets/images/dashboard.png)

## Usage
- [Settings](#settings)
    - Use the settings pane to link your Rocksmith and Steam Profile
- [PSARC Explorer](#psarc-explorer)
    - Choose SteamApps/common/Rocksmith2014/ as your `psarc` folder to generate a list of all songs your own. Once the scan is complete the Songs->Owned section will be populated with all the info extracted from the psarc file. (Use this to also keep your song collection up to date after you buy new songs froms Steam)
- [Songs Owned](#songs-owned)
    - Songs->Owned section should now list songs that you own. You can use basic operations like search, sort, filter as well as view YouTube vidoes of your songs or add them to setlists. If you linked your Rocksmith profile in [Settings](#settings) you can Update RS Favorites/Mastery by clicking the appropriate button
- [RS Catalog](#songs-available)
    - This section should already be populated with all the dlc's release so far. You can use the options in this view, to keep the list up to date as well as retreive metadata from steam about ownership/acquire date. (requires steam profile to be linked in Settings)

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


## TODO:
- import all setlists from game
- generate youtube playlist of current view

## Development
- Instructions for dev
    - `npm install` to install all dependencies
    - `npm run start` to launch app in debug mode
- Instructions for build
    - `npm run build` to generate build files
    - `npm run package-mac` for mac builds
    - `npm run package-win` for win builds
