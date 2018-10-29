import React, { Component } from 'react'
import Sidebar from './Components/Sidebar'
import PSARCView from './Components/psarcView'
import SonglistView from './Components/songlistView'
import DashboardView from './Components/dashboardView'
import getProfileConfig, { getSteamIDConfig } from './configService';
import SongAvailableView from './Components/songavailableView';
import SetlistView from './Components/setlistView';
import SettingsView from './Components/settingsView';
import RSLiveView from './Components/rsliveView';
import { getAllSetlist, initSongsOwnedDB } from './sqliteService';
import './App.css'

const { path } = window;

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentTab: null,
      currentChildTab: null,
      showSidebar: true,
      appTitle: '',
      currentProfile: '',
      currentCookie: '',
      TabsData: [
        {
          id: 'tab-dashboard',
          name: 'Dashboard',
          child: [],
        },
        {
          id: 'tab-songs',
          name: 'Songs',
          child: [
            {
              name: 'Owned',
              id: 'songs-owned',
            },
            {
              name: 'DLC Catalog',
              id: 'songs-available',
            },
          ],
        },
        {
          id: 'tab-setlist',
          name: 'Setlists',
          child: [],
        },
        {
          id: 'tab-psarc',
          name: 'psarc Explorer',
          child: [],
        },
        {
          id: 'tab-rslive',
          name: 'Rocksmith Live',
          tag: 'BETA',
          child: [],
          //platform: 'win32', //works only in windows for now
        },
        {
          id: 'tab-settings',
          name: 'Settings',
          child: [],
        },
      ],
      searchHistory: {},
      selectedTab: null,
    };
    this.songlistRef = null;
    //this.handleChange = this.handleChange.bind(this);
    //this.selectedTab = null;
    this.sidebarRef = React.createRef();
  }

  componentWillMount = async () => {
  }

  componentDidMount = async () => {
    await initSongsOwnedDB("tab-dashboard", this.updateHeader);
    await this.updateProfile();
    this.updateHeader("tab-dashboard", "Rocksmith 2014 Dashboard")
  }

  getSearchHistory = (key) => {
    if (key in this.state.searchHistory) return this.state.searchHistory[key];
    return null;
  }

  saveSearchHistory = async (key, search) => {
    const sh = this.state.searchHistory;
    sh[key] = search;
    this.setState({ searchHistory: sh });
  }

  updateProfile = async () => {
    const prfldb = await getProfileConfig();
    const steamcookie = await getSteamIDConfig();
    this.setState({ currentProfile: prfldb, currentCookie: steamcookie });
    this.refreshTabs();
  }

  handleChange = async (tab, child) => {
    const text = (tab == null) ? "" : tab.name
      + (child == null ? "" : ` >  ${child.name}`);


    let selectedTab = null;
    switch (tab.id) {
      default:
      case "tab-dashboard":
        selectedTab = (
          <DashboardView
            currentTab={tab}
            updateHeader={this.updateHeader}
            resetHeader={this.resetHeader}
            handleChange={this.updateProfile}
          />
        )
        break;
      case "tab-psarc":
        selectedTab = (
          <PSARCView
            currentTab={tab}
            updateHeader={this.updateHeader}
            resetHeader={this.resetHeader}
          />
        )
        break;
      case "tab-settings":
        selectedTab = (
          <SettingsView
            currentTab={tab}
            updateHeader={this.updateHeader}
            resetHeader={this.resetHeader}
            handleChange={this.updateProfile}
            refreshTabs={this.refreshTabs}
          />
        )
        break;
      case "tab-setlist":
        selectedTab = (
          <SetlistView
            currentTab={tab}
            currentChildTab={child}
            updateHeader={this.updateChildHeader}
            resetHeader={this.resetHeader}
            handleChange={this.updateProfile}
            refreshTabs={this.refreshTabs}
            saveSearch={this.saveSearchHistory}
            getSearch={this.getSearchHistory}
          />
        )
        break;
      case "tab-songs":
        switch (child.id) {
          default:
          case "songs-owned":
            selectedTab = (
              <SonglistView
                updateHeader={this.updateChildHeader}
                resetHeader={this.resetHeader}
                handleChange={this.updateProfile}
                saveSearch={this.saveSearchHistory}
                getSearch={this.getSearchHistory}
              />
            )
            break;
          case "songs-available":
            selectedTab = (
              <SongAvailableView
                currentTab={tab}
                currentChildTab={child}
                requiredTab={tab.id}
                requiredChildTab={child.id}
                updateHeader={this.updateChildHeader}
                resetHeader={this.resetHeader}
                handleChange={this.updateProfile}
                saveSearch={this.saveSearchHistory}
                getSearch={this.getSearchHistory}
              />
            )
            break;
        }
        break;
      case "tab-rslive":
        selectedTab = (
          <RSLiveView
            currentTab={tab}
            updateHeader={this.updateHeader}
            resetHeader={this.resetHeader}
          />
        )
        break;
    }
    this.setState({
      currentTab: tab,
      currentChildTab: child,
      appTitle: text,
      selectedTab,
    });
  }

  updateHeader = (tabname, text) => {
    if (this.state.currentTab === null) {
      return;
    }
    if (tabname === this.state.currentTab.id) {
      this.setState({ appTitle: text });
    }
  }

  updateChildHeader = (tabname, childname, text) => {
    if (tabname === null || this.state.currentChildTab === null) {
      return;
    }
    if (tabname === this.state.currentTab.id && childname === this.state.currentChildTab.id) {
      this.setState({ appTitle: text });
    }
  }

  resetHeader = (tabname) => {
    if (this.state.currentTab != null && tabname === this.state.currentTab.id) {
      this.handleChange(this.state.currentTab, this.state.currentChildTab);
    }
  }

  collapseSidebar = () => {
    this.setState({ showSidebar: !this.state.showSidebar });
  }

  refreshTabs = async () => {
    const setlists = await getAllSetlist();
    if (setlists === null) return;
    const t = this.state.TabsData;
    t[2].child = []
    const tempChilds = []
    for (let i = 0; i < setlists.length; i += 1) {
      const setlist = setlists[i];
      const setlistObj = { name: unescape(setlist.name), id: setlist.key }
      if (setlist.key === "setlist_practice") tempChilds.splice(0, 0, setlistObj)
      else if (setlist.key === "setlist_favorites") tempChilds.splice(1, 0, setlistObj)
      else tempChilds.push(setlistObj);
    }
    t[2].child = tempChilds;
    t[2].child.push({ name: 'Create New Setlist...', id: 'add-setlist' });
    this.setState({ TabsData: t });
    this.sidebarRef.current.refresh();
  }

  render = () => {
    const len = this.state.currentProfile.length;
    let profile = len > 0
      ? path.basename(this.state.currentProfile).slice(0, 6) + "..." + this.state.currentProfile.slice(len - 6, len) : "-";
    profile = profile.toLowerCase();
    const cookie = this.state.currentCookie.length > 0 ? this.state.currentCookie : "-";
    return (
      <div className="App">
        <div className="wrapper">
          <Sidebar
            ref={this.sidebarRef}
            handleChange={this.handleChange}
            showSidebar={this.state.showSidebar}
            currentProfile={profile}
            steamConnected={cookie}
            ytConnected={false}
            TabsData={this.state.TabsData}
            RefreshTabs={this.refreshTabs}
          />
          <div id="content">
            <nav className="navbar navbar-expand-lg navbar-light bg-light">
              <div className="container-fluid">
                <button
                  type="button"
                  id="sidebarCollapse"
                  className={
                    this.state.showSidebar ? "navbar-btn" : "navbar-btn active"
                  }
                  onClick={() => this.collapseSidebar()}
                >
                  <span />
                  <span />
                  <span />
                </button>
                <button
                  className="btn btn-dark d-inline-block d-lg-none ml-auto"
                  type="button"
                  data-toggle="collapse"
                  data-target="#navbarSupportedContent"
                  aria-controls="navbarSupportedContent"
                  aria-expanded="false"
                  aria-label="Toggle navigation"
                >
                  <i className="fas fa-align-justify" />
                </button>

                <div
                  className="collapse navbar-collapse"
                  id="navbarSupportedContent"
                  style={{ width: 100 + '%', textAlign: 'center' }}
                >
                  <ul className="nav navbar-nav ml-auto mr-auto topHeader">
                    <li className="nav-item active overflowellipsis">
                      <h2>
                        <a href="#tab-name" className="">
                          {this.state.appTitle}
                        </a>
                      </h2>
                    </li>
                  </ul>
                </div>
              </div>
            </nav>
            <div>
              {this.state.selectedTab}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
