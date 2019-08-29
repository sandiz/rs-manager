import React from 'react'
import Collapsible from 'react-collapsible';
import CreatableSelect from "react-select/creatable";
import PropTypes from 'prop-types';
import Select from 'react-select';
import getProfileConfig, {
  updateSteamLoginSecureCookie, getSteamLoginSecureCookie, updateProfileConfig,
  getScoreAttackConfig, updateScoreAttackConfig, updateUseCDLCConfig,
  getUseCDLCConfig, getScoreAttackDashboardConfig, updateScoreAttackDashboard,
  getSessionIDConfig, updateSessionIDConfig, getMasteryThresholdConfig,
  updateMasteryThreshold, getShowPSStatsConfig, updatePSStats,
  updateSteamIDConfig, getSteamIDConfig, updateSteamAPIKey,
  getSteamAPIKeyConfig, updateConfig, updateDefaultSortOption,
  getDefaultSortOptionConfig, getShowSetlistOverlayAlwaysConfig,
  updateShowSetlistOverlayAlways,
  getIsSudoWhitelistedConfig,
  updateIsSudoWhitelisted,
  getCurrentZoomFactorConfig,
  updateCurrentZoomFactor,
  getImportRSMConfig,
  updateImportRSMPath,
  setStateAsync,
  getSteamNameFromSteamID,
} from '../configService';
import {
  resetDB, createRSSongList, addtoRSSongList,
  isTablePresent, deleteRSSongList, getSongByID, resetRSSongList,
} from '../sqliteService';
import readProfile, {
  getAllProfiles, getSteamPathForRocksmith,
  getSteamProfiles, getProfileName,
} from '../steamprofileService';
import { sortOrderCustomStyles, createOption } from './setlistOptions';
import { DispatcherService, DispatchEvents } from '../lib/libDispatcher'

import steam from '../assets/tree-icons/catalog.svg'
import * as rsicon from '../assets/icons/icon-1024x1024-gray.png'

const parse = require('csv-parse/lib/es5/sync');

const { remote } = window.require('electron')
const Fragment = React.Fragment;
const getHeader = (text, size) => {
  let header = null;
  switch (size) {
    case 3:
      //eslint-disable-next-line
      header = (<h3><a>{text}</a></h3>)
      break;
    case 6:
      //eslint-disable-next-line
      header = (<h6><a>{text}</a></h6>)
      break;
    default:
      //eslint-disable-next-line
      header = (<h1><a>{text}</a></h1>)
      break;
  }
  return header;
}
export const expandButton = (text, size = 3) => {
  return (
    <div>
      {getHeader(text, size)}
      <hr />
      <button
        type="button"
        id="settingsExpand"
        className="navbar-btn"
        style={{ float: 'right', marginTop: -62 + 'px' }}
      >
        <span /><span /><span />
      </button>
    </div>
  );
}
export const collapseButton = (text, size = 3) => {
  return (
    <div>
      {getHeader(text, size)}
      <hr />
      <button
        type="button"
        id="settingsCollapse"
        className="navbar-btn"
        style={{ float: 'right', marginTop: -62 + 'px' }}
      >
        <span /><span /><span />
      </button>
    </div>
  );
}
export const defaultSortOption = [{ label: 'mastery-desc', value: 'mastery-desc' }]
export default class SettingsView extends React.Component {
  constructor(props) {
    super(props);
    this.tabname = "tab-settings"
    this.state = {
      prfldb: '',
      steamLoginSecure: '',
      sessionID: '',
      showScoreAttack: true,
      setlistImported: [false, false, false, false, false, false],
      processingSetlist: false,
      useCDLCinStats: true,
      scoreAttackDashboard: [true, true, true, true],
      masteryThreshold: 0.95,
      showPSStats: false,
      steamID: '',
      steamAPIKey: '',
      sortoptions: defaultSortOption,
      showSetlistOverlayAlways: false,
      isSudoWhitelisted: false,
      currentZoomFactor: 1,
      pathToImportRSM: '',
      currentSteamProfile: '',
      steamProfileOptions: [],
      currentRSProfile: '',
      rsProfileOptions: [],
      profileAboutToSave: false,
      profileSaved: false,
      cookieSaved: false,
    };
    this.loadState();
    this.sortfieldref = React.createRef();
    this.sortorderref = React.createRef();
  }

  loadState = async () => {
    this.readConfigs();
    this.loadSteamProfiles();
    this.setProfiles();
    this.refreshSetlist();
  }

  loadSteamProfiles = async () => {
    const options = await getSteamProfiles();
    setStateAsync(this, { steamProfileOptions: options })
  }

  generateSetlistOptions = () => {
    const setlistOptions = []
    for (let i = 0; i <= 5; i += 1) {
      setlistOptions.push((
        <div key={"setlist_import_" + i}>
          <span style={{ float: 'left' }}>
            Song List {i + 1}:
          </span>
          <span style={{
            float: 'right',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            width: 400 + 'px',
            textAlign: 'right',
          }}>
            {
              this.state.processingSetlist ? "Processing..."
                : (
                  this.state.setlistImported[i]
                    ? (
                      <span>
                        <a style={{ color: 'red' }} onClick={() => this.importDeleteSetlist(i, "delete")}>Delete Setlist</a>
                        &nbsp;| &nbsp;
                        <a onClick={() => this.importDeleteSetlist(i, "import")}>Reimport Setlist</a>
                      </span>
                    )
                    : <a onClick={() => this.importDeleteSetlist(i, "import")}>Click to Import</a>
                )
            }
          </span>
          <br />
        </div>
      ));
    }
    return setlistOptions;
  }

  importDeleteSetlist = async (setlistnum, method) => {
    if (this.state.prfldb === '' || this.state.prfldb === null) {
      this.props.updateHeader(
        this.tabname,
        `No Profile found, please update General Settings`,
      );
      return;
    }
    if (method === "delete") {
      //delete setlist
      console.log("delete setlist", setlistnum);
      const tablename = "rs_song_list_" + (setlistnum + 1);
      //set header to starting
      this.props.updateHeader(this.tabname, `Deleting Song List ${setlistnum + 1}`);
      //set state to processing
      this.setState({
        processingSetlist: true,
      });
      //remove setlist from setlist_meta
      //drop table setlist
      await deleteRSSongList(tablename);
      //set header with success + stats
      this.props.updateHeader(this.tabname, `Deleted Song List ${setlistnum + 1}!`);
      //reset processing state
      this.setState({
        processingSetlist: false,
      });
    }
    else if (method === "import") {
      //import setlist
      const tablename = "rs_song_list_" + (setlistnum + 1);
      const displayname = "RS Song List " + (setlistnum + 1);
      //set header to starting
      this.props.updateHeader(this.tabname, `Importing Song List ${setlistnum + 1}`);
      //set state to processing
      this.setState({
        processingSetlist: true,
      });

      //create table for setlist
      //insert setlist to setlist_meta
      await createRSSongList(tablename, displayname, false, false, false, true);
      const steamProfile = await readProfile(this.state.prfldb);
      const songRoot = steamProfile.SongListsRoot.SongLists;
      const currentSetlist = songRoot[setlistnum] === 'undefined' ? [] : songRoot[setlistnum];

      await resetRSSongList(tablename);
      //insert values to setlist (set header with item)
      for (let i = 0; i < currentSetlist.length; i += 1) {
        const songkey = currentSetlist[i];
        this.props.updateHeader(this.tabname, `Importing Song List ${setlistnum + 1}: ${i}/${currentSetlist.length}`);
        /* loop await */ // eslint-disable-next-line
        await addtoRSSongList(tablename, songkey);
      }
      //set header with success + stats
      this.props.updateHeader(this.tabname, `Finished importing Song List ${setlistnum + 1}!`);
      //reset processing state
      this.setState({
        processingSetlist: false,
      });
    }
    //set imported state to true
    this.refreshSetlist();
    this.props.refreshTabs();
  }

  importDLCPack = async () => {
    this.props.updateHeader(this.tabname, "Downloading dlc pack data from github...");

    this.setState({
      processingSetlist: true,
    })

    const filePath = window.os.tmpdir() + "/dlcs.csv"
    const datasrc = "https://gist.githubusercontent.com/JustinAiken/0cba27a4161a2ed3ad54fb6a58da2e70/raw";
    await window.pDownload(datasrc, filePath);
    const stat = window.electronFS.statSync(filePath);
    if (stat.size < 1024) { /* basic integrity check */
      console.log("dlc.csv size < 1024");
      this.props.updateHeader(this.tabname, "dlc.csv failed integrity check..")
      this.setState({
        processingSetlist: false,
      })
      return;
    }
    const lr = new window.linereader(filePath);

    await createRSSongList("folder_dlcpack_import", "DLC Pack Setlists",
      false, false, false, false, false, true);

    let lastSongKey = "";
    lr.on('error', (err) => {
      console.log(err);
      this.setState({
        processingSetlist: false,
      })
    });

    lr.on('line', async (line) => {
      // pause emitting of lines...
      lr.pause();

      const l2 = line.replace(/'/gi, "_");
      const items = parse(l2)[0];
      const release = items[0]
      const name = items[1]
      const pid = items[4];
      const dbOutput = await getSongByID(pid);
      if (dbOutput !== '' && lastSongKey !== dbOutput.songkey) {
        const tableName = `setlist_${release}_${name}`.replace(/-/gi, "_").replace(/ /g, "_").replace(/\W/g, '');
        await createRSSongList(tableName, `${release} - ${name}`,
          false, true, false, false, false, false, "folder_dlcpack_import");
        await addtoRSSongList(tableName, dbOutput.songkey);
        lastSongKey = dbOutput.songkey;
      }

      this.props.updateHeader(
        this.tabname,
        `Processing pack: ${name} (${release})`,
      )
      lr.resume();
    });

    lr.on('end', async () => {
      // All lines are read, file is closed now.
      this.setState({
        processingSetlist: false,
      })
      this.props.updateHeader(this.tabname, "Finished creating dlc setlists");
      DispatcherService.dispatch(DispatchEvents.SETLIST_REFRESH);
    });
  }

  handleScoreAttack = (event) => {
    const t = event.target;
    const value = t.type === 'checkbox' ? t.checked : t.value;
    this.setState({
      showScoreAttack: value,
    });
  }

  handleScoreAttackDashboard = async (event, type) => {
    const t = event.target;
    const value = t.type === 'checkbox' ? t.checked : t.value;
    const cur = this.state.scoreAttackDashboard;
    switch (type) {
      case 'easy':
        cur[0] = value;
        break;
      case 'medium':
        cur[1] = value;
        break;
      case 'hard':
        cur[2] = value;
        break;
      case 'master':
        cur[3] = value;
        break;
      default:
        break;
    }
    this.setState({
      scoreAttackDashboard: cur,
    });
  }

  handleCDLCStats = (event) => {
    const t = event.target;
    const value = t.type === 'checkbox' ? t.checked : t.value;
    this.setState({
      useCDLCinStats: value,
    });
  }

  handleCheckBasedSetting = (event, key) => {
    const t = event.target;
    const value = t.type === 'checkbox' ? t.checked : t.value;
    const state = {}
    state[key] = value
    this.setState(state)
  }

  handleShowPSStats = (event) => {
    const t = event.target;
    const value = t.type === 'checkbox' ? t.checked : t.value;
    this.setState({
      showPSStats: value,
    });
  }

  handleMasteryThreshold = (event) => {
    this.setState({
      masteryThreshold: event.target.value / 100,
    });
  }

  handleTextBasedSetting = (event, key) => {
    const state = {}
    state[key] = event.target.value
    this.setState(state)
  }

  refreshSetlist = async () => {
    const setliststatus = []
    for (let i = 0; i <= 5; i += 1) {
      const tablename = "rs_song_list_" + (i + 1);
      /* loop await */ // eslint-disable-next-line
      setliststatus[i] = await isTablePresent(tablename);
    }
    this.setState({
      setlistImported: setliststatus,
    });
  }

  setProfiles = async () => {
    const prfldb = await getProfileConfig();
    const currentRSProfile = await getProfileName(prfldb);
    const currentSteamProfile = await getSteamNameFromSteamID();
    setStateAsync(this, {
      currentRSProfile,
      currentSteamProfile,
    })
  }

  readConfigs = async () => {
    const d = await getProfileConfig();
    const e = await getSteamLoginSecureCookie();
    const f = await getScoreAttackConfig();
    const g = await getUseCDLCConfig();
    const h = await getScoreAttackDashboardConfig();
    const i = await getSessionIDConfig();
    const j = await getMasteryThresholdConfig();
    const k = await getShowPSStatsConfig();
    const l = await getSteamIDConfig();
    const m = await getSteamAPIKeyConfig();
    const n = await getDefaultSortOptionConfig();
    const o = await getShowSetlistOverlayAlwaysConfig();
    const p = await getIsSudoWhitelistedConfig();
    const q = await getCurrentZoomFactorConfig();
    const r = await getImportRSMConfig();
    setStateAsync(this, {
      prfldb: d,
      steamLoginSecure: e,
      showScoreAttack: f,
      useCDLCinStats: g,
      scoreAttackDashboard: h,
      sessionID: i,
      masteryThreshold: j,
      showPSStats: k,
      steamID: l,
      steamAPIKey: m,
      sortoptions: n,
      showSetlistOverlayAlways: o,
      isSudoWhitelisted: p,
      currentZoomFactor: q,
      pathToImportRSM: r,
    });
  }

  saveSettings = async () => {
    if (this.state.steamLoginSecure !== "" && this.state.steamLoginSecure != null) {
      await updateSteamLoginSecureCookie(this.state.steamLoginSecure);
      await updateSessionIDConfig(this.state.sessionID);
    }
    if (this.state.prfldb !== "" && this.state.prfldb != null) {
      await updateProfileConfig(this.state.prfldb);
    }
    await updateScoreAttackConfig(this.state.showScoreAttack);
    await updateUseCDLCConfig(this.state.useCDLCinStats);
    await updatePSStats(this.state.showPSStats);
    await updateScoreAttackDashboard(this.state.scoreAttackDashboard);
    await updateMasteryThreshold(this.state.masteryThreshold);
    await updateSteamAPIKey(this.state.steamAPIKey);
    await updateImportRSMPath(this.state.pathToImportRSM);
    if (this.state.sortoptions.length === 0) {
      this.setState({ sortoptions: defaultSortOption }, async () => {
        await updateDefaultSortOption(this.state.sortoptions)
      })
    }
    else {
      await updateDefaultSortOption(this.state.sortoptions)
    }
    await updateSteamIDConfig(this.state.steamID);
    await updateShowSetlistOverlayAlways(this.state.showSetlistOverlayAlways);
    await updateIsSudoWhitelisted(this.state.isSudoWhitelisted);
    const flt = parseFloat(this.state.currentZoomFactor);
    if (flt > 0 && flt <= 1) {
      this.setState({ currentZoomFactor: flt });
      await updateCurrentZoomFactor(flt);
      console.log("setting zoom factor to", flt);
      window.webFrame.setZoomFactor(flt);
    }
    this.props.handleChange();
    this.props.updateHeader(this.tabname, "Settings Saved!");
    document.getElementsByTagName("body")[0].scrollTop = 0;
    document.getElementsByTagName("html")[0].scrollTop = 0;
    this.props.refreshTabs();
    this.setState({ profileSaved: false, profileAboutToSave: false, cookieSaved: false })
  }

  enterPrfldb = async () => {
    const prfldbs = remote.dialog.showOpenDialog({
      properties: ["openFile"],
    });
    if (prfldbs == null) { return; }
    if (prfldbs.length > 0) {
      this.setState({ prfldb: prfldbs[0] });
      this.props.handleChange();
    }
  }

  resetdb = async () => {
    await resetDB('songs_owned');
    this.props.updateHeader(this.tabname, "Songs Owned collection is now reset!");
  }

  resetSidebarState = async () => {
    await updateConfig("state", {});
    await this.props.refreshTabs();
    this.props.updateHeader(this.tabname, "Sidebar state is now reset!");
  }

  enterCookie = async () => {
    const prompt = window.prompt;
    let d = await prompt({
      title: 'Please enter value of steamLoginSecure cookie',
      label: 'steamLoginSecure:',
      value: '',
      inputAttrs: {
        type: 'text',
      },
      type: 'input',
      height: 250,
    })
    console.log(d);
    if (d !== "" && d != null) {
      this.setState({ steamLoginSecure: d });
    }
    d = await prompt({
      title: 'Please enter value of sessionID cookie',
      label: 'sessionID:',
      value: '',
      inputAttrs: {
        type: 'text',
      },
      type: 'input',
      height: 250,
    })
    console.log(d);
    if (d !== "" && d != null) {
      this.setState({ sessionID: d });
    }
    this.props.handleChange();
  }

  steamLogin = async () => {
    try {
      const token = await window.steamAuth();
      console.log(token)
      // save sls, sid, steamID
      await updateSteamLoginSecureCookie(token.cookie)
      await updateSessionIDConfig(token.cookieSess)
      await updateSteamIDConfig(token.steam_id);
      await this.readConfigs();
      await this.setProfiles();
      this.setState({ cookieSaved: true, profileSaved: false, profileAboutToSave: false });
    }
    catch (e) {
      console.log("error with steam auth", e);
    }
  }

  addSortOption = async () => {
    let existing = false;
    const { sortoptions } = this.state;

    for (let i = 0; i < sortoptions.length; i += 1) {
      const option = sortoptions[i];
      let [field, order] = option.value.split("-");
      if (field === this.sortfieldref.current.value) {
        existing = true;
        order = this.sortorderref.current.value;
        field = this.sortfieldref.current.value;
        option.label = field + "-" + order;
        option.value = field + "-" + order;
        sortoptions[i] = option;
        this.setState({ sortoptions });
        return;
      }
    }
    if (existing === false) {
      const option = createOption(this.sortfieldref.current.value + "-" + this.sortorderref.current.value);
      sortoptions.push(option);
      this.setState({ sortoptions });
    }
  }

  handleSortOrderChange = async (value, action) => {
    this.setState({ sortoptions: value })
  }

  resetProfileState = (rsOnly = false) => {
    this.setState({
      currentRSProfile: '',
      currentSteamProfile: '',
      profileSaved: false,
      cookieSaved: false,
    })
  }

  handleSteamProfileChange = async (so) => {
    const split = so.value.split(":");
    const name = split[1] + " [" + split[2] + "]";
    this.setState({ currentSteamProfile: name });
    const uid = window.BigInt(split[0])
    //eslint-disable-next-line
    const uid32 = uid & window.BigInt(0xFFFFFFFF);
    const prfldbdir = getSteamPathForRocksmith(uid32);

    if (window.electronFS.existsSync(prfldbdir)) {
      const profiles = await getAllProfiles(prfldbdir);
      const options = []
      for (let i = 0; i < profiles.length; i += 1) {
        const profile = profiles[i];
        options.push({
          value: `${prfldbdir}/${profile.UniqueID}_PRFLDB`,
          label: profile.PlayerName,
        })
      }
      this.setState({ rsProfileOptions: options, steamID: split[0] });
    }
  }

  handleRSProfileChange = async (so) => {
    const prfldb = so.value;
    this.setState({ currentRSProfile: so.label, profileAboutToSave: true, prfldb });
    // console.log(prfldb);
  }

  saveProfileSettings = async () => {
    await this.saveSettings();
    this.setState({ profileSaved: true, profileAboutToSave: false, cookieSaved: false });
  }

  resetProfileSettings = async () => {
    await this.loadState();
    this.setState({ profileSaved: false, profileAboutToSave: false, cookieSaved: false });
  }

  render = () => {
    if (this.props.currentTab === null) {
      return null;
    }
    else if (this.props.currentTab.id === this.tabname) {
      const showSuccess = this.state.profileSaved || this.state.cookieSaved;
      return (
        <div className="container-fluid">
          <div className="row justify-content-lg-center">
            <div className="col col-lg-10 settings">
              <br /> <br />
              <div style={{ marginTop: -30 + 'px', paddingLeft: 30 + 'px', paddingRight: 30 + 'px' }}>
                <Collapsible
                  trigger={expandButton('Profile Selection')}
                  triggerWhenOpen={collapseButton('Profile Selection')}
                  transitionTime={200}
                  easing="ease-in"
                  open
                  overflowWhenOpen="visible"
                >
                  <div className="d-flex flex-row justify-content-center" style={{ margin: '0 auto', width: 80 + '%' }}>
                    <div style={{ width: 30 + '%', margin: 20 + 'px' }}>
                      <div className="ta-center">
                        <img src={steam} alt="steam icon" style={{ width: 80 + 'px', height: 80 + 'px' }} />
                      </div>
                      <div style={{ marginTop: 12 + 'px' }}>
                        {
                          this.state.currentSteamProfile.length === 0
                            ? (
                              <Select
                                placeholder="Choose Steam Profile"
                                options={this.state.steamProfileOptions}
                                onChange={this.handleSteamProfileChange}
                              />
                            )
                            : (
                              <div className="ta-center profile-text overflowellipsis">
                                <span className="pointer" style={{ borderBottom: "1px dotted" }} onClick={this.resetProfileState}>
                                  {this.state.currentSteamProfile}
                                </span>
                              </div>
                            )
                        }
                      </div>
                    </div>
                    <div className="profile-arrow">
                      <i className="fas fa-chevron-right" />
                    </div>
                    <div style={{ width: 30 + '%', margin: 12 + 'px' }}>
                      <div className="ta-center">
                        <img src={rsicon} alt="rs icon" style={{ width: 90 + 'px', height: 90 + 'px' }} />
                      </div>
                      <div style={{ marginTop: 10 + 'px' }}>
                        {
                          this.state.currentRSProfile.length === 0
                            ? (
                              <Select
                                placeholder="Choose Rocksmith Profile"
                                isDisabled={this.state.currentSteamProfile.length === 0}
                                options={this.state.rsProfileOptions}
                                onChange={this.handleRSProfileChange}
                              />
                            )
                            : (
                              <div className="ta-center profile-text overflowellipsis">
                                <span className="pointer" style={{ borderBottom: "1px dotted" }} onClick={() => this.resetProfileState(true)}>
                                  {this.state.currentRSProfile}
                                </span>
                              </div>
                            )
                        }
                      </div>
                    </div>
                    <div className="profile-arrow">
                      <i className="fas fa-chevron-right" />
                    </div>
                    <div style={{
                      width: 30 + '%',
                      margin: 20 + 'px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      flexDirection: 'column',
                    }}>
                      <div
                        className="ta-center"
                        style={{
                          margin: 'auto',
                        }}>
                        <a onClick={this.steamLogin}>
                          <img src="https://steamcommunity-a.akamaihd.net/public/images/signinthroughsteam/sits_01.png" alt="steam login" />
                        </a>
                      </div>
                      <div style={{ textAlign: 'center', fontSize: 21 + 'px' }}>
                        <div className="ta-center profile-text overflowellipsis text-secondary pointer">
                          (optional)
                          <span style={{ borderBottom: "1px dotted" }} onClick={this.steamLogin}>
                            <br />
                            Tracks steam dlc purchases
                            </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="ta-center">
                    {
                      this.state.profileAboutToSave
                        ? (
                          <div className="ta-center profile-save-div">
                            <button
                              type="button"
                              onClick={this.saveProfileSettings}
                              className="extraPadding download">
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={this.resetProfileSettings}
                              className="extraPadding download">
                              Cancel
                            </button>
                          </div>
                        )
                        : null
                    }
                    {
                      showSuccess && this.state.currentRSProfile.length > 0
                        ? (
                          <div className="ta-center profile-save-div text-success">
                            <span style={{ fontSize: 20 + 'px' }}>
                              <i className="fas fa-check" />&nbsp;
                              {
                                this.state.profileSaved
                                  ? (
                                    <span>
                                      Profile setup complete!
                                      You can now import your dlc&apos;s in&nbsp;
                                      <span
                                        onClick={() => DispatcherService.dispatch(DispatchEvents.SIDEBAR_GOTO, "tab-psarc")}
                                        style={{ borderBottom: "1px dotted", cursor: 'pointer' }}>PSARC explorer
                                      </span>
                                      &nbsp;and view/refresh your stats in&nbsp;
                                      <span
                                        onClick={() => DispatcherService.dispatch(DispatchEvents.SIDEBAR_GOTO, "tab-dashboard")}
                                        style={{ borderBottom: "1px dotted", cursor: 'pointer' }}>Dashboard.
                                      </span>
                                    </span>
                                  ) : null
                              }
                              {
                                this.state.cookieSaved
                                  ? (
                                    <span>
                                      Steam login complete!
                                      You can now track your steam dlc purchases in&nbsp;
                                      <span
                                        onClick={() => DispatcherService.dispatch(DispatchEvents.SIDEBAR_GOTO, "songs-available")}
                                        style={{ borderBottom: "1px dotted", cursor: 'pointer' }}>DLC Catalog
                                      </span>

                                    </span>
                                  ) : null
                              }
                            </span>
                          </div>
                        )
                        : null
                    }
                  </div>
                </Collapsible>
                <br />
                <Collapsible
                  trigger={expandButton("Rocksmith Songlists")}
                  triggerWhenOpen={collapseButton("Rocksmith Songlists")}
                  transitionTime={200}
                  easing="ease-in"
                >
                  {this.generateSetlistOptions()}
                  <Fragment>
                    <br />
                    <span style={{ float: 'left' }}>
                      <a>
                        Import DLC Packs as Setlists
                      </a>
                    </span>
                    <span style={{
                      float: 'right',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      width: 400 + 'px',
                      textAlign: 'right',
                      marginTop: 30 + 'px',
                    }}>
                      {
                        this.state.processingSetlist
                          ? <span> Processing... </span>
                          : <a onClick={() => this.importDLCPack()}>Click to Import</a>
                      }
                    </span>
                    <br />
                    <div className="">
                      <span style={{ color: '#ccc' }}>
                        This creates setlists based on the songs you own, keyed
                        under the dlc pack it was released in.
                         The newly created setlists are under
                         &quot;DLC Pack Setlists&quot; folder.
                         DLC Pack&nbsp;
                        <a
                          style={{ color: 'blue' }}
                          onClick={
                            () => window.shell.openExternal("https://gist.githubusercontent.com/JustinAiken/0cba27a4161a2ed3ad54fb6a58da2e70")
                          }
                        >data</a>
                        &nbsp;courtesy&nbsp;
                        <a
                          style={{ color: 'blue' }}
                          onClick={
                            () => window.shell.openExternal("https://github.com/JustinAiken")
                          }
                        >@JustinAiken
                          </a>
                      </span>
                    </div>
                  </Fragment>
                  <Fragment>
                    <br />
                    <span style={{ float: 'left' }}>
                      <a>
                        Path to <strong>importrsm</strong>
                      </a>
                    </span>
                    <span style={{
                      float: 'right',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      width: 400 + 'px',
                      textAlign: 'right',
                      marginTop: 12 + 'px',
                    }}>
                      {
                        <input
                          type="text"
                          style={{ width: 400 + 'px', textAlign: 'right', paddingRight: 5 + 'px' }}
                          value={this.state.pathToImportRSM}
                          onChange={e => this.setState({ pathToImportRSM: e.target.value })}
                        />
                      }
                    </span>
                    <br />
                    <div className="">
                      <span style={{ color: '#ccc' }}>
                        part of the <strong>
                          <a
                            style={{ color: 'blue' }}
                            onClick={
                              () => window.shell.openExternal("https://pypi.org/project/rsrtools/")
                            }
                          >rsrtools
                          </a></strong> package, by&nbsp;
                            <a
                          style={{ color: 'blue' }}
                          onClick={
                            () => window.shell.openExternal("https://github.com/BuongiornoTexas")
                          }>
                          @BuongiornoTexas</a>, <strong>importrsm</strong> allows
loading setlists into Rocksmith 2014.
<br />(path can contain spaces, it&apos;s automatically escaped when invoking)
                      </span>
                    </div>
                  </Fragment>
                </Collapsible>
              </div>
              <div style={{ marginTop: -6 + 'px', paddingLeft: 30 + 'px', paddingRight: 30 + 'px' }}>
                <br />
                <Collapsible
                  trigger={expandButton("Advanced ")}
                  triggerWhenOpen={collapseButton("Advanced")}
                  transitionTime={200}
                  easing="ease-in"
                >
                  <span style={{ float: 'left' }}>
                    <a>
                      Show Score Attack Stats:
                    </a>
                  </span>
                  <span style={{
                    float: 'right',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    width: 400 + 'px',
                    textAlign: 'right',
                  }}>
                    <input
                      type="checkbox"
                      checked={this.state.showScoreAttack}
                      onChange={this.handleScoreAttack} />
                  </span>
                  <br />
                  <div className="">
                    <span style={{ color: '#ccc' }}>
                      Show/Hides score attack stats from Dashboard and Songs view.
                  </span>
                  </div>
                  <br />
                  <span style={{ float: 'left' }}>
                    <a>
                      Score Attack Panes
                    </a>
                  </span>
                  <span style={{
                    float: 'right',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    width: 400 + 'px',
                    textAlign: 'right',
                  }}>
                    <span>Easy &nbsp;&nbsp;</span>
                    <input
                      type="checkbox"
                      checked={this.state.scoreAttackDashboard[0] === true}
                      onChange={event => this.handleScoreAttackDashboard(event, 'easy')} />
                    <span>&nbsp;&nbsp;Medium &nbsp;&nbsp;</span>
                    <input
                      type="checkbox"
                      checked={this.state.scoreAttackDashboard[1] === true}
                      onChange={event => this.handleScoreAttackDashboard(event, 'medium')} />
                    <span>&nbsp;&nbsp;Hard &nbsp;&nbsp;</span>
                    <input
                      type="checkbox"
                      checked={this.state.scoreAttackDashboard[2] === true}
                      onChange={event => this.handleScoreAttackDashboard(event, 'hard')} />
                    <span>&nbsp;&nbsp;Master &nbsp;&nbsp;</span>
                    <input
                      type="checkbox"
                      checked={this.state.scoreAttackDashboard[3] === true}
                      onChange={event => this.handleScoreAttackDashboard(event, 'master')} />
                  </span>
                  <br />
                  <div className="">
                    <span style={{ color: '#ccc' }}>
                      Shows selected score attack panes in Dashboard.
                  </span>
                  </div>
                  <br />
                  <span style={{ float: 'left' }}>
                    <a>
                      Include CDLC in Stats
                    </a>
                  </span>
                  <span style={{
                    float: 'right',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    width: 400 + 'px',
                    textAlign: 'right',
                  }}>
                    <input
                      type="checkbox"
                      checked={this.state.useCDLCinStats}
                      onChange={this.handleCDLCStats} />
                  </span>
                  <br />
                  <div className="">
                    <span style={{ color: '#ccc' }}>
                      Includes cdlc when calculating stats in Dashboard view
                    </span>
                  </div>
                  <br />
                  <span style={{ float: 'left' }}>
                    <a>
                      Show RSLive Process Usage
                    </a>
                  </span>
                  <span style={{
                    float: 'right',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    width: 400 + 'px',
                    textAlign: 'right',
                  }}>
                    <input
                      type="checkbox"
                      checked={this.state.showPSStats}
                      onChange={this.handleShowPSStats} />
                  </span>
                  <br />
                  <div className="">
                    <span style={{ color: '#ccc' }}>
                      Shows cpu and memory usage for rslive processes (rocksmith + rocksniffer)
                    </span>
                  </div>
                  <Fragment>
                    <br />
                    <span style={{ float: 'left' }}>
                      <a>
                        Mastery Threshold
                      </a>
                    </span>
                    <span style={{
                      float: 'right',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      width: 400 + 'px',
                      textAlign: 'right',
                    }}>
                      <input
                        style={{ textAlign: 'right' }}
                        type="number"
                        value={this.state.masteryThreshold * 100}
                        min={0}
                        max={100}
                        onChange={this.handleMasteryThreshold} />
                    </span>
                    <br />
                    <div className="">
                      <span style={{ color: '#ccc' }}>
                        Songs needs to have mastery &gt;=
                        this threshold to be considered &quot;mastered&quot;.
                      </span>
                    </div>
                  </Fragment>
                  <Fragment>
                    <br />
                    <span style={{ float: 'left' }}>
                      <a>
                        Steam API Key
                      </a>
                    </span>
                    <span style={{
                      float: 'right',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      width: 400 + 'px',
                      textAlign: 'right',
                    }}>
                      <input
                        style={{ textAlign: 'right', width: 75 + '%' }}
                        value={this.state.steamAPIKey}
                        onChange={event => this.handleTextBasedSetting(event, "steamAPIKey")} />
                    </span>
                    <br />
                    <div className="">
                      <span style={{ color: '#ccc' }}>
                        Some stats require Steam API key, you can get yours  <a style={{ color: 'blue' }} onClick={() => window.shell.openExternal("https://steamcommunity.com/dev/apikey")}> here</a>. (Currently used by: Playtime)
                      </span>
                    </div>
                  </Fragment>
                  <Fragment>
                    <br />
                    <span style={{ float: 'left' }}>
                      <a>
                        Default Sort Field/Order
                      </a>
                    </span>
                    <div style={{
                      float: 'right',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      <CreatableSelect
                        components={{
                          DropdownIndicator: null,
                        }}
                        styles={sortOrderCustomStyles}
                        isClearable
                        isMulti
                        menuIsOpen={false}
                        onChange={this.handleSortOrderChange}
                        placeholder="Global Sort Order"
                        value={this.state.sortoptions}
                      />
                      <select
                        ref={this.sortfieldref}
                        style={{ marginLeft: 20 + 'px', width: 40 + '%' }}
                        id="sortfield">
                        <option value="song">Song</option>
                        <option value="artist">Artist</option>
                        <option value="album">Album</option>
                        <option value="mastery">Mastery</option>
                        <option value="tuning_weight">Tuning</option>
                        <option value="count">Playcount</option>
                        <option value="difficulty">Difficulty</option>
                        <option value="arrangement">Arrangement</option>
                        <option value="sa_highest_badge">Highest Badge</option>
                      </select>
                      <select
                        ref={this.sortorderref}
                        style={{ marginLeft: 16 + 'px', width: 20 + '%' }}
                        id="sortorder">
                        <option value="asc">Asc</option>
                        <option value="desc">Desc</option>
                      </select>
                      <span
                        onClick={this.addSortOption}
                        style={{
                          fontSize: 17 + 'px',
                          marginLeft: 12 + 'px',
                          borderBottom: '1px dotted',
                          cursor: 'pointer',
                        }}>Add</span>
                    </div>
                    <br />
                    <div className="">
                      <span style={{ color: '#ccc' }}>
                        Set default sorting field and order for Songs-&gt;Owned and Setlists.
                      </span>
                    </div>
                  </Fragment>
                  <Fragment>
                    <br />
                    <span style={{ float: 'left' }}>
                      <a>
                        Show Stats Overlay
                      </a>
                    </span>
                    <span style={{
                      float: 'right',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      width: 400 + 'px',
                      textAlign: 'right',
                      marginTop: 30 + 'px',
                    }}>
                      <input
                        type="checkbox"
                        checked={this.state.showSetlistOverlayAlways}
                        onChange={event => this.handleCheckBasedSetting(event, "showSetlistOverlayAlways")} />
                    </span>
                    <br />
                    <div className="">
                      <span style={{ color: '#ccc' }}>
                        Shows Stats Overlay by default when you switch setlists.
                      </span>
                    </div>
                  </Fragment>
                  {
                    window.os.platform() === "darwin" ? (
                      <Fragment>
                        <br />
                        <span style={{ float: 'left' }}>
                          <a>
                            Passwordless Rocksmith Live
                      </a>
                        </span>
                        <span style={{
                          float: 'right',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          width: 400 + 'px',
                          textAlign: 'right',
                          marginTop: 30 + 'px',
                        }}>
                          <input
                            type="checkbox"
                            checked={this.state.isSudoWhitelisted}
                            onChange={event => this.handleCheckBasedSetting(event, "isSudoWhitelisted")} />
                        </span>
                        <br />
                        <div className="">
                          <span style={{ color: '#ccc' }}>
                            if true, you&#39;ll have to create a file
                          in /etc/sudoers.d/ with the values<br />
                            {
                              //eslint-disable-next-line
                              <span style={{ userSelect: 'text' }}>%staff ALL=(ALL) NOPASSWD:&lt;path to Rocksmith Manager.app&gt;/Contents/Resources/app/src/tools/rocksniff_mac</span>
                            }
                          </span>
                        </div>
                      </Fragment>
                    ) : null
                  }
                  <Fragment>
                    <br />
                    <span style={{ float: 'left' }}>
                      <a>
                        Zoom Level
                      </a>
                    </span>
                    <span style={{
                      float: 'right',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      width: 400 + 'px',
                      textAlign: 'right',
                      marginTop: 30 + 'px',
                    }}>
                      <input
                        style={{ textAlign: 'center', width: 15 + '%' }}
                        value={this.state.currentZoomFactor}
                        onChange={event => this.handleTextBasedSetting(event, "currentZoomFactor")} />
                    </span>
                    <br />
                    <div className="">
                      <span style={{ color: '#ccc' }}>
                        Set the current zoom level Range: 0.0 - 1.0 (default: 1.0)
                      </span>
                    </div>
                  </Fragment>
                </Collapsible>
                <br />
                <Collapsible
                  trigger={expandButton("Reset Collection")}
                  triggerWhenOpen={collapseButton("Reset Collection")}
                  transitionTime={200}
                  easing="ease-in"
                >
                  <span style={{ float: 'left', color: 'red', marginTop: 18 + 'px' }}>
                    <a>
                      Reset Songs Owned Collection
                    </a>
                  </span>
                  <span style={{
                    float: 'right',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    width: 50 + '%',
                    textAlign: 'right',
                  }}>
                    <button
                      type="button"
                      onClick={this.resetdb}
                      className="extraPadding download">
                      Reset
                    </button>
                  </span>
                  <br /> <br />
                  <span style={{ float: 'left', color: 'red', marginTop: 18 + 'px' }}>
                    <a>
                      Reset Sidebar State
                    </a>
                  </span>
                  <span style={{
                    float: 'right',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    width: 50 + '%',
                    textAlign: 'right',
                    height: 62 + 'px',
                  }}>
                    <button
                      type="button"
                      onClick={this.resetSidebarState}
                      className="extraPadding download">
                      Reset
                    </button>
                  </span>
                  <br /> <br />
                </Collapsible>
                <br />
              </div>
            </div>
          </div>
          <div className="centerButton list-unstyled">
            <button
              type="button"
              onClick={this.saveSettings}
              className="extraPadding download">
              Save Settings
            </button>
          </div>
        </div>
      )
    }
    return null;
  }
}

SettingsView.propTypes = {
  currentTab: PropTypes.object,
  handleChange: PropTypes.func,
  updateHeader: PropTypes.func,
  //resetHeader: PropTypes.func,
  refreshTabs: PropTypes.func,
}
SettingsView.defaultProps = {
  currentTab: null,
  handleChange: () => { },
  updateHeader: () => { },
  //resetHeader: () => {},
  refreshTabs: () => { },
}
