import React, { Component } from 'react'
import Sidebar from './Components/Sidebar'
import PSARCView from './Components/psarcView'
import SonglistView from './Components/songlistView'
import FolderEditView from './Components/folderEditView'
import DashboardView from './Components/dashboardView'
import getProfileConfig, { getSteamIDConfig, getShowSetlistOverlayAlwaysConfig } from './configService';
import SongAvailableView from './Components/songavailableView';
import SetlistView from './Components/setlistView';
import SettingsView from './Components/settingsView';
import RSLiveView from './Components/rsliveView';
import {
  getAllSetlist, initSongsOwnedDB,
  getStarredSetlists, getChildOfSetlistFolder,
} from './sqliteService';
import './css/App.css'
import HelpView from './Components/HelpView';
import { getState } from './stateService';

const { path } = window;

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentTab: null,
      currentChildTab: null,
      showSidebar: true,
      appTitle: 'Running Migrations, please wait...',
      currentProfile: '',
      currentCookie: '',
      TabsV2Data: [
        {
          id: 'tab-dashboard',
          name: 'Dashboard',
          children: [],
        },
        {
          id: 'tab-songs',
          name: 'Songs',
          children: [
            {
              id: 'songs-owned',
              name: 'Owned',
              isLeaf: true,
            },
            {
              id: 'songs-available',
              name: 'DLC Catalog',
              isLeaf: true,
            },
          ],
        },
        {
          id: 'tab-setlist',
          name: 'Setlists',
          children: [],
        },
        {
          id: 'tab-psarc',
          name: 'psarc Explorer',
          children: [],
        },
        {
          id: 'tab-rslive',
          name: 'Rocksmith Live',
          children: [],
        },
        {
          id: 'tab-settings',
          name: 'Settings',
          children: [],
        },
        {
          id: 'tab-help',
          name: 'Help',
          children: [],
        },
      ],
      searchHistory: {},
      selectedTab: null,
      readme: 'getting-started',
      showhelp: false,
      readytorender: false,
      showModalStats: false,
    };
    this.songlistRef = null;
    //this.handleChange = this.handleChange.bind(this);
    //this.selectedTab = null;
    this.sidebarRef = React.createRef();
    this.navbarRef = React.createRef();
  }

  cwmasync = async () => {
    await initSongsOwnedDB("tab-dashboard", this.updateHeader);
    await this.updateProfile();
    await this.refreshTabs();
    // default tabs on startup
    //sthis.handleChange(this.state.TabsData[0]);
    //this.props.handleChange(TabsData[2], TabsData[2].child[0])
    //this.toggleActive(TabsData[2]);
    this.updateHeader("tab-dashboard", "Rocksmith 2014 Dashboard")
    this.setState({ readytorender: true }, () => {
      this.handleChange(this.state.TabsV2Data[0]);
    });
  }

  componentWillMount = async () => {
    this.cwmasync();
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
    //this.refreshTabs();
  }

  handleChange = async (tab, child, dontcheckoverlay = false) => {
    const text = (tab == null) ? "" : tab.name
      + (child == null ? "" : ` >  ${child.name}`);
    if (this.state.readytorender === false) return;

    let showModalStats = this.state.showModalStats;
    if (child && !dontcheckoverlay) {
      const folder = child.id.includes("folder");
      const showconfig = await getShowSetlistOverlayAlwaysConfig();
      if (showconfig && !folder) {
        showModalStats = true;
        this.switchNavbarColor("wheat")
      }
      else {
        showModalStats = false;
        this.switchNavbarColor("black")
      }
    }
    else {
      this.switchNavbarColor("black")
    }
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
            saveSearch={this.saveSearchHistory}
            getSearch={this.getSearchHistory}
          />
        )
        break;
      case "tab-help":
        selectedTab = (
          <HelpView
            currentTab={tab}
            updateHeader={this.updateHeader}
          />
        )
        break;
      case "tab-setlist":
        if (child.isFolder === true) {
          selectedTab = (
            <FolderEditView
              currentTab={tab}
              refreshTabs={this.refreshTabs}
              folder={child}
              updateHeader={this.updateChildHeader}
            />
          )
        }
        else {
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
              showModalStats={showModalStats}
            />
          )
        }
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

    //check default show stat config

    this.setState({
      currentTab: tab,
      currentChildTab: child,
      appTitle: text,
      selectedTab,
      showModalStats,
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

  createSetlistObject = (setlist, state) => {
    const isFolder = setlist.is_folder === "true";

    let setlistObj = {
      name: unescape(setlist.name),
      id: setlist.key,
      isLeaf: !isFolder,
      isManual: setlist.is_manual === "true",
      isGenerated: setlist.is_generated === "true",
      isRSSetlist: setlist.is_rssetlist === "true",
      isStarred: setlist.is_starred === "true",
      isFolder: setlist.is_folder === "true",
    }
    setlistObj = this.addExpandFlag(setlistObj, state);
    return setlistObj;
  }

  addExpandFlag = (item, state) => {
    if (state != null) {
      if (item.id in state) {
        item.expanded = state[item.id]
      }
    }
    return item;
  }

  refreshTabs = async () => {
    const t2 = this.state.TabsV2Data;
    const state = await getState("sidebar");
    for (let k = 0; k < t2.length; k += 1) {
      let item = t2[k];
      item.expanded = false;
      item = this.addExpandFlag(item, state);
    }
    const setlists = await getAllSetlist();
    if (setlists === null) return;
    t2[2].child = []
    const tempChilds = []
    for (let i = 0; i < setlists.length; i += 1) {
      const setlist = setlists[i];
      const isFolder = setlist.is_folder === "true";
      //eslint-disable-next-line
      const setlistObj = this.createSetlistObject(setlist, state)
      if (isFolder) {
        setlistObj.children = [];
        //eslint-disable-next-line
        const childItems = setlistObj.id === "folder_starred" ? await getStarredSetlists() : await getChildOfSetlistFolder(setlistObj.id);

        for (let j = 0; j < childItems.length; j += 1) {
          const setlistchild = childItems[j];
          //eslint-disable-next-line
          setlistObj.children.push(this.createSetlistObject(setlistchild, state));
        }
      }

      tempChilds.push(setlistObj);
    }
    t2[2].children = tempChilds;
    t2[2].children.unshift({ name: 'New Folder', id: 'add-setlist-folder', isLeaf: true });
    t2[2].children.unshift({ name: 'New Setlist', id: 'add-setlist', isLeaf: true });
    this.setState({ TabsV2Data: t2 });
    await this.sidebarRef.current.refresh();
  }

  openHelp = () => {
    const currentTab = this.state.currentTab.id
    const currentChildTab = this.state.currentChildTab ? this.state.currentChildTab.id : null;
    let readme = "dashboard"
    switch (currentTab) {
      default:
      case "tab-dashboard":
        readme = "dashboard"
        break;
      case "tab-songs":
        switch (currentChildTab) {
          default:
          case "songs-owned":
            readme = "songs-owned"
            break;
          case "songs-available":
            readme = "dlc-catalog"
            break;
        }
        break;
      case "tab-setlist":
        readme = "setlists"
        break;
      case "tab-psarc":
        readme = "psarc-explorer"
        break;
      case "tab-rslive":
        readme = "rs-live"
        break;
    }
    this.setState({ showhelp: true, readme })
  }

  openChangelog = () => {
    this.setState({ showhelp: true, readme: 'changelog' });
  }

  closeHelp = () => {
    this.setState({ showhelp: false })
  }

  switchNavbarColor = (color) => {
    this.navbarRef.current.style.color = color;
  }

  render = () => {
    const len = this.state.currentProfile.length;
    let profile = len > 0
      ? path.basename(this.state.currentProfile).slice(0, 6) + "..." + this.state.currentProfile.slice(len - 6, len) : "-";
    profile = profile.toLowerCase();
    const cookie = this.state.currentCookie.length > 0 ? this.state.currentCookie : "-";
    const showhelpstyle = "modal-window-help " + (this.state.showhelp ? "" : "hidden")
    const helpstyle = (this.state.currentTab !== null && (this.state.currentTab.id === "tab-settings" || this.state.currentTab.id === "tab-help")) ? "hidden" : ""
    let showmstat = (this.state.currentTab !== null && this.state.currentTab.id === "tab-setlist") ? "" : "hidden";
    if (this.state.currentChildTab !== null
      && typeof this.state.currentChildTab !== 'undefined'
      && this.state.currentChildTab.id.includes("folder")) {
      showmstat = "hidden";
    }
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
            TabsV2Data={this.state.TabsV2Data}
            RefreshTabs={this.refreshTabs}
            Changelog={this.openChangelog}
          />
          <div id="content">
            <nav ref={this.navbarRef} className="navbar navbar-expand-lg navbar-light bg-light">
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
                <a
                  onClick={() => {
                    const showModalStats = !this.state.showModalStats;
                    this.setState({ showModalStats }, () => {
                      this.handleChange(this.state.currentTab, this.state.currentChildTab, true);
                      if (this.state.showModalStats) {
                        this.switchNavbarColor("wheat")
                      } else {
                        this.switchNavbarColor("black")
                      }
                    });
                  }}
                  className={showmstat}>
                  <img
                    alt="stat"
                    style={{ width: 70 + '%' }}
                    src="data:image/svg+xml;utf8;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pgo8IS0tIEdlbmVyYXRvcjogQWRvYmUgSWxsdXN0cmF0b3IgMTguMS4xLCBTVkcgRXhwb3J0IFBsdWctSW4gLiBTVkcgVmVyc2lvbjogNi4wMCBCdWlsZCAwKSAgLS0+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iQ2FwYV8xIiB4PSIwcHgiIHk9IjBweCIgdmlld0JveD0iMCAwIDM0NS41NzEgMzQ1LjU3MSIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMzQ1LjU3MSAzNDUuNTcxOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSIgd2lkdGg9IjY0cHgiIGhlaWdodD0iNjRweCI+CjxnPgoJPHBhdGggZD0iTTMzMC4zNjUsNTguOTI5YzguODk3LTIuMzE1LDE0Ljg0Ni0xMy42OTQsMTQuODQ2LTI5LjI1QzM0NS4yMSwxMy4wMzgsMzI1LjY2OSwwLDMwMC43MjEsMEg0NC44NSAgIEMxOS45MDIsMCwwLjM2MSwxMy4wMzgsMC4zNjEsMjkuNjc5YzAsMTUuNTUsNS45NTUsMjYuOTM0LDE0Ljg0NiwyOS4yNWMxLjU5OSwzLjU1NiwzLjgxMywxMy4xNzUsMy44MTMsMjcuMDE4djEwMy4wNiAgIGMwLDEzLjgwNy0yLjIwMiwyMy40MTQtMy44MDEsMjYuOTk0Yy04LjY3NiwyLjExMi0xNC44NTgsMTIuMjA4LTE0Ljg1OCwyNS4xMjZjMCwxNC43OTIsMTguNzEyLDI1LjUzMiw0NC40ODksMjUuNTMyaDExMS44NDMgICB2MjYuNjM2Yy02LjAwMyw1LjY3NC05LjQ2OSwxMy41OTgtOS40NjksMjJjMCwxNi42OTUsMTMuNTgxLDMwLjI3NiwzMC4yNzYsMzAuMjc2YzE2LjY4OSwwLDMwLjI3LTEzLjU4MSwzMC4yNy0zMC4yNzYgICBjMC04LjkzMi0zLjcxMS0xNy4xMTktMTAuMTM4LTIyLjc2NHYtMjUuODY2aDEwMy4wOWMyNS43NzcsMCw0NC40ODktMTAuNzQsNDQuNDg5LTI1LjUzMmMwLTEyLjkxOC02LjE4OC0yMy4wMTQtMTQuODU4LTI1LjEyNiAgIGMtMS41OTMtMy41OC0zLjgwMS0xMy4xODctMy44MDEtMjYuOTk0Vjg1Ljk0N0MzMjYuNTUyLDcyLjEwNCwzMjguNzY2LDYyLjQ3OSwzMzAuMzY1LDU4LjkyOXogTTE4NC4wNjMsMzA0LjY5OCAgIGMzLjYzNCwyLjE5LDUuODA2LDYuMTUyLDUuODA2LDEwLjYwM2MwLDYuODI2LTUuNTQ5LDEyLjM3NS0xMi4zNjksMTIuMzc1Yy02LjgyNiwwLTEyLjM3NS01LjU0OS0xMi4zNzUtMTIuMzc1ICAgYzAtNC4xMTcsMi4wNDEtNy45NTQsNS4wMy05Ljk5NWw0LjQzOS0yLjU5NnYtMzYuMDUyaDUuMTM3djM1LjQyNUwxODQuMDYzLDMwNC42OTh6IE0zMjUuNTAyLDIzMy40MTIgICBjMC43MDQsMS4wNjIsMS44MTQsMy42OTMsMS44NDQsNy40NTNjLTAuODA2LDIuMTc4LTEwLjIxNSw3LjktMjYuNjI0LDcuOUg0NC44NWMtMTYuNDA5LDAtMjUuODE5LTUuNzIyLTI2LjU4OC03LjYzMiAgIGMwLTMuOTgsMS4xMS02LjY1MywxLjgwOC03LjcxNWMxNS4xNzQtMS43NDgsMTYuODUtMzEuNDI3LDE2Ljg1LTQ0LjQwNVY4NS45NDdjMC0xMi43OTktMS42MjktNDEuODM0LTE2LjIzLTQ0LjMxNiAgIGMtMC45MzEtMS42MDUtMi40MjktNS43MjItMi40MjktMTEuOTUyYzAtNC42OSwxMC42MDMtMTEuNzc5LDI2LjU4OC0xMS43NzloMjU1Ljg3N2MxNS45ODUsMCwyNi41ODgsNy4wODksMjYuNTg4LDExLjc3OSAgIGMwLDYuMjI5LTEuNDk4LDEwLjM0Ny0yLjQyOSwxMS45NTJjLTE0LjU5NSwyLjQ4Mi0xNi4yMywzMS41MTctMTYuMjMsNDQuMzE2djEwMy4wNiAgIEMzMDguNjUxLDIwMS45OSwzMTAuMzI4LDIzMS42NjQsMzI1LjUwMiwyMzMuNDEyeiIgZmlsbD0iIzAwMDAwMCIvPgoJPHBhdGggZD0iTTIyNC4xNzgsNjMuNDA0aC0xMDQuNDJjLTM3LjgzNiwwLTY4LjYxOSwzMC43ODMtNjguNjE5LDY4LjYxOXYxMS45MzQgICBjMCwzNy44MzYsMzAuNzgzLDY4LjYxOSw2OC42MTksNjguNjE5aDEwNC40MmMzNy44MzYsMCw2OC42MTktMzAuNzgzLDY4LjYxOS02OC42MTl2LTExLjkzNCAgIEMyOTIuNzk3LDk0LjE4NywyNjIuMDE0LDYzLjQwNCwyMjQuMTc4LDYzLjQwNHogTTI3NC44OTcsMTQzLjk1N2MwLDI3Ljk2Ny0yMi43NTIsNTAuNzE4LTUwLjcxOCw1MC43MThoLTEwNC40MiAgIGMtMjcuOTY3LDAtNTAuNzE4LTIyLjc1Mi01MC43MTgtNTAuNzE4di0xMS45MzRjMC0yNy45NjcsMjIuNzUyLTUwLjcxOCw1MC43MTgtNTAuNzE4aDEwNC40MiAgIGMyNy45NjcsMCw1MC43MTgsMjIuNzUyLDUwLjcxOCw1MC43MThWMTQzLjk1N3oiIGZpbGw9IiMwMDAwMDAiLz4KCTxwYXRoIGQ9Ik0yNDEuNjA3LDEwNi44ODVjLTQuMjY2LTIuNDg4LTkuNzUtMS4wMzgtMTIuMjM4LDMuMjM0bC0xMy45MjEsMjMuOTI3ICAgYy0wLjY5OCwxLjE5OS0yLjcyNyw0LjAzNC00LjQ4MSwzLjk1Yy0yLjIyNi0wLjA0Mi02LjIwNi0zLjA3My05LjY4NC05LjYxM2MtNS43Ny0xMC44NTQtMTQuMjE5LTE2LjkzNC0yMy44MDItMTcuMTI1ICAgYy05Ljc4Ni0wLjM0Ni0xOC44MDIsNS45MzctMjUuMTUsMTYuODE1Yy01LjcyMiw5LjgxLTExLjE4MiwxNC44NTctMTMuOTQ1LDE2LjUxNmMtOC40MDctNy4xNzItMjEuODc1LTYuOTEtMzEuMzQ0LDEuMDI2ICAgbC0xMS45MzQsMTBjLTMuNzg5LDMuMTc0LTQuMjg0LDguODE5LTEuMTEsMTIuNjA4YzEuNzY2LDIuMTEyLDQuMzA4LDMuMjA0LDYuODYyLDMuMjA0YzIuMDI5LDAsNC4wNjktMC42ODYsNS43NC0yLjA5NGwxMS45MzQtMTAgICBjMy4wMjUtMi41MzYsNi45NjMtMi41NzIsOC40NjctMC44ODljMy4wNDMsMy40MDEsNy4zMjcsNS4wMzYsMTEuOTgxLDQuNTM1YzEzLjE0NS0xLjMzMSwyNC41MjQtMTguNTQ1LDI4LjgwOC0yNS44ODQgICBjMi45My01LjAzNiw2LjItOC4wNTUsOS4zMzItNy45MzZjMi43MTUsMC4wNTQsNS44NDIsMi45MDYsOC4zNDgsNy42MzJjNi4zNTUsMTEuOTU4LDE1LjUyLDE4LjkyMSwyNS4xNDQsMTkuMTEyICAgYzguMjY0LDAuMTczLDE1LjM4OS00LjQwNCwyMC4yOTMtMTIuODQxbDEzLjkyMS0yMy45MjdDMjQ3LjMyNCwxMTQuODUsMjQ1Ljg4LDEwOS4zNzMsMjQxLjYwNywxMDYuODg1eiIgZmlsbD0iIzAwMDAwMCIvPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+Cjwvc3ZnPgo=" />
                </a>
                <a onClick={this.openHelp} className={helpstyle}>
                  <img
                    alt="help"
                    style={{ width: 70 + '%' }}
                    src="data:image/svg+xml;utf8;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pgo8IS0tIEdlbmVyYXRvcjogQWRvYmUgSWxsdXN0cmF0b3IgMTkuMC4wLCBTVkcgRXhwb3J0IFBsdWctSW4gLiBTVkcgVmVyc2lvbjogNi4wMCBCdWlsZCAwKSAgLS0+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iQ2FwYV8xIiB4PSIwcHgiIHk9IjBweCIgdmlld0JveD0iMCAwIDUyIDUyIiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCA1MiA1MjsiIHhtbDpzcGFjZT0icHJlc2VydmUiIHdpZHRoPSI2NHB4IiBoZWlnaHQ9IjY0cHgiPgo8Zz4KCTxwYXRoIGQ9Ik0yNiwwQzExLjY2MywwLDAsMTEuNjYzLDAsMjZzMTEuNjYzLDI2LDI2LDI2czI2LTExLjY2MywyNi0yNlM0MC4zMzcsMCwyNiwweiBNMjYsNTBDMTIuNzY3LDUwLDIsMzkuMjMzLDIsMjYgICBTMTIuNzY3LDIsMjYsMnMyNCwxMC43NjcsMjQsMjRTMzkuMjMzLDUwLDI2LDUweiIgZmlsbD0iIzAwMDAwMCIvPgoJPHBhdGggZD0iTTI2LDM3Yy0wLjU1MywwLTEsMC40NDctMSwxdjJjMCwwLjU1MywwLjQ0NywxLDEsMXMxLTAuNDQ3LDEtMXYtMkMyNywzNy40NDcsMjYuNTUzLDM3LDI2LDM3eiIgZmlsbD0iIzAwMDAwMCIvPgoJPHBhdGggZD0iTTI2LjExMyw5LjAwMUMyNi4wNzUsOS4wMDEsMjYuMDM3LDksMjUuOTk4LDljLTIuMTE2LDAtNC4xMDYsMC44MTUtNS42MTUsMi4zMDRDMTguODQ3LDEyLjgxOSwxOCwxNC44NDIsMTgsMTcgICBjMCwwLjU1MywwLjQ0NywxLDEsMXMxLTAuNDQ3LDEtMWMwLTEuNjE4LDAuNjM1LTMuMTM2LDEuNzg3LTQuMjcyYzEuMTUzLTEuMTM3LDIuNjg4LTEuNzY1LDQuMjk5LTEuNzI3ICAgYzMuMTYxLDAuMDQ0LDUuODY5LDIuNzUyLDUuOTEzLDUuOTEzYzAuMDI5LDIuMDg0LTAuOTk5LDQuMDAyLTIuNzUxLDUuMTMyQzI2LjU4OCwyMy43NjIsMjUsMjYuNzk0LDI1LDMwLjE1OFYzMyAgIGMwLDAuNTUzLDAuNDQ3LDEsMSwxczEtMC40NDcsMS0xdi0yLjg0MmMwLTIuNjQyLDEuMjc2LTUuMTA1LDMuMzMyLTYuNDMyYzIuMzM1LTEuNTA2LDMuNzA2LTQuMDYzLDMuNjY3LTYuODQgICBDMzMuOTM5LDEyLjU5OSwzMC40MDEsOS4wNjEsMjYuMTEzLDkuMDAxeiIgZmlsbD0iIzAwMDAwMCIvPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+Cjwvc3ZnPgo=" />
                </a>
              </div>
            </nav>
            <div>
              {this.state.selectedTab}
            </div>
            <div ref={(ref) => { this.modal_div = ref }} id="open-modal" style={{ opacity: 1, pointerEvents: "auto" }} className={showhelpstyle}>
              <div id="" className="width-75">
                <HelpView
                  updateHeader={this.updateHeader}
                  popupMode
                  showHelp={this.state.showhelp}
                  defaultReadme={this.state.readme}
                  closeHelp={this.closeHelp}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
