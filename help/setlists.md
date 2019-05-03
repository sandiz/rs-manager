## Setlists - Custom list containing only arrangements you want
![](https://github.com/sandiz/rs-manager/raw/master/screenshots/images/setlist.favorites.png)

#### Type of Setlists
 - Manual
   * manually add arrangements to list via Song Details->Add to setlist
   * supports basic filters (see next point)
 - RSSetlist
   * starts with `RS`, this is a special setlist imported from in-game song list.
   * You can import `Favorites` and `Songlists 1 to 6` from Settings
   * supports basic filters (see next point)
 - Generated
   * arrangements automatically added based on complex filters
   * More info about complex filters in Help->Setlist Options

#### Basic Filters: Search field & Dropdown (manual and rssetlist setlists only)
 - Type a value in the search field to search the db in real-time. The search field supports the following filters:
   * Anything - show all arrangements that matches song or artist or album
   * Song - show all arrangements that matches song title 
   * Artist - show all arrangements that matches artist 
   * Album - show all arrangements that matches album 
   * Arrangement - show all arrangements that match value

#### Sidebar Button: Create new Setlist..
 - creates a new setlist. click on the newly created setlist and go to Settings to change name/type

#### Button: Update Favorites from RS Profile
 - Imports favorites from Rocksmith

#### Button: Update Mastery from RS Profile
 - This updates the song collection with mastery and other metadata from your rocksmith profile.

#### Button: Settings
 - Change name, type and filters of user created setlists.

#### Table: Header
 - Clicking on the column header sorts the table asc/desc. 

#### Table: Row
 - Clicking on a row opens the Song Details pane, more info in Help->Song Details.


# Export Setlist

 -  You can export setlists as a JSON file or as a Rocksmith Song list (needs [rsrtools](https://pypi.org/project/rsrtools/) package to be installed)

<img width=60% style="border-radius: 6px" src="https://raw.githubusercontent.com/sandiz/rs-manager/master/screenshots/images/exportsetlistinfo.png"/>

 -  path to `importrsm` binary is autodetected at startup, in case it's not found, you can add the path in settings

 ![](https://raw.githubusercontent.com/sandiz/rs-manager/master/screenshots/images/exportsetlistsettings.png)

 -  before exporting make sure Rocksmith2014 is not running!
 -  start export! on success, your song list will be overwritten and a backup of your profile will be created
 ![](https://raw.githubusercontent.com/sandiz/rs-manager/master/screenshots/images/exportsetlistmain.png)

 -  if it fails for some reason, detailed error message is displayed. Please report it [here](https://github.com/sandiz/rs-manager/issues)
 <img width=60% src="https://raw.githubusercontent.com/sandiz/rs-manager/master/screenshots/images/exportsetlistfail.png" />