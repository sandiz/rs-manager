import React from 'react'
import Collapsible from 'react-collapsible';
import PropTypes from 'prop-types';
import getProfileConfig, {
  updateSteamLoginSecureCookie, getSteamLoginSecureCookie, updateProfileConfig,
  getScoreAttackConfig, updateScoreAttackConfig, updateUseCDLCConfig,
  getUseCDLCConfig, getScoreAttackDashboardConfig, updateScoreAttackDashboard,
  getSessionIDConfig, updateSessionIDConfig, getMasteryThresholdConfig,
  updateMasteryThreshold, getShowPSStatsConfig, updatePSStats,
  updateSteamIDConfig, getSteamIDConfig, updateSteamAPIKey,
  getSteamAPIKeyConfig, updateConfig, getDefaultSortFieldConfig,
  getDefaultSortOrderConfig, updateDefaultSortField, updateDefaultSortOrder,
} from '../configService';
import {
  resetDB, createRSSongList, addtoRSSongList, isTablePresent, deleteRSSongList,
} from '../sqliteService';
import readProfile from '../steamprofileService';

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
      sortField: 'mastery',
      sortOrder: 'desc',
    };
    this.readConfigs();
    this.refreshSetlist();
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
      console.log("create setlist", setlistnum);
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

  resetSearchHistory = (o, p) => {
    //reset search history
    const key = "tab-songs-songs-owned";
    const search = this.props.getSearch(key);
    if (search !== null) {
      search.sortfield = o;
      search.sortorder = p;
      this.props.saveSearch(key, search);
    }
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

    const o = await getDefaultSortFieldConfig();
    const p = await getDefaultSortOrderConfig();
    this.setState({
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
      sortField: o,
      sortOrder: p,
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
    await updateDefaultSortField(this.state.sortField);
    await updateDefaultSortOrder(this.state.sortOrder);
    this.resetSearchHistory(this.state.sortField, this.state.sortOrder);
    this.props.handleChange();
    this.props.updateHeader(this.tabname, "Settings Saved!");
    document.getElementsByTagName("body")[0].scrollTop = 0;
    document.getElementsByTagName("html")[0].scrollTop = 0;
    this.props.refreshTabs();
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
    }
    catch (e) {
      console.log("error with steam auth", e);
    }
  }

  render = () => {
    if (this.props.currentTab === null) {
      return null;
    }
    else if (this.props.currentTab.id === this.tabname) {
      return (
        <div className="container-fluid">
          <div className="row justify-content-lg-center">
            <div className="col col-lg-10 settings">
              <br /> <br />
              <div style={{ marginTop: -30 + 'px', paddingLeft: 30 + 'px', paddingRight: 30 + 'px' }}>
                <Collapsible
                  trigger={expandButton('General')}
                  triggerWhenOpen={collapseButton('General')}
                  transitionTime={200}
                  easing="ease-in"
                  open
                >
                  <span>
                    Config Path:
                  </span>
                  <span style={{
                    float: 'right',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    width: 90 + '%',
                    textAlign: 'right',
                  }}>
                    {window.configPath}
                  </span>
                  <br /> <br />
                  <span>
                    SQLite Path:
                  </span>
                  <span style={{
                    float: 'right',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    width: 90 + '%',
                    textAlign: 'right',
                  }}>
                    {window.sqlitePath}
                  </span>
                  <br /> <br />
                  <span style={{ float: 'left' }}>
                    <a onClick={this.enterPrfldb}>
                      Rocksmith Profile (_prfldb):
                  </a>
                  </span>
                  <span style={{
                    float: 'right',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    width: 400 + 'px',
                    textAlign: 'right',
                    paddingRight: 1 + 'px',
                  }}>
                    {
                      this.state.prfldb === ''
                        ? <a onClick={this.enterPrfldb}>Click to Change </a>
                        : (
                          <a onClick={this.enterPrfldb}>
                            <i>{window.path.basename(this.state.prfldb).toLowerCase()}</i>
                          </a>
                        )
                    }
                  </span>
                  <br />
                  <div className="">
                    <span style={{ color: '#ccc' }}>
                      Choose the rocksmith profile to read stats from.
                    The profile is only read and never written to.<br />
                      RS profile ends with _prfldb and is typically found
                      in your __SteamFolder__/Steam/userdata/__random_number__/221680/remote/
                  </span>
                  </div>
                  <br />
                  <span style={{ float: 'left' }}>
                    <a onClick={this.enterCookie}>
                      Steam OAuth
                  </a>
                  </span>
                  <span style={{
                    float: 'right',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    width: 500 + 'px',
                    textAlign: 'right',
                    paddingRight: 1 + 'px',
                  }}>
                    {
                      (
                        <Fragment>
                          <i>
                            <a onClick={this.enterCookie}>
                              {(this.state.steamID).toLowerCase()}
                            </a><br />
                          </i>
                          <a onClick={this.steamLogin}>
                            <img src="https://steamcommunity-a.akamaihd.net/public/images/signinthroughsteam/sits_01.png" alt="steam login" />
                          </a>
                        </Fragment>
                      )
                    }
                  </span>
                  <br />
                  <div className="">
                    <span style={{ color: '#ccc' }}>
                      The app queries your
                      <a style={{ color: 'blue' }} onClick={() => window.shell.openExternal("http://store.steampowered.com/dynamicstore/userdata/")}>
                        &nbsp;userdata&nbsp;
                      </a>
                      to fetch your dlc&#39;s and
                      <a style={{ color: 'blue' }} onClick={() => window.shell.openExternal("https://store.steampowered.com/account/AjaxLoadMoreHistory/")}>
                        &nbsp;purchase history&nbsp;
                      </a>
                      to fetch owned/acquired date.
                  </span>
                  </div>
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
                      Show selected score attack panes in Dashboard.
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
                    <span style={{
                      float: 'right',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      width: 400 + 'px',
                      textAlign: 'right',
                    }}>
                      <select
                        onChange={e => this.setState({ sortField: e.target.value })}
                        value={this.state.sortField}>
                        <option value="song">Song</option>
                        <option value="artist">Artist</option>
                        <option value="album">Album</option>
                        <option value="mastery">Mastery</option>
                        <option value="tuning_weight">Tuning</option>
                        <option value="count">Playcount</option>
                        <option value="arrangement">Arrangement</option>
                        <option value="sa_highest_badge">Highest Badge</option>
                      </select>
                      <select
                        onChange={e => this.setState({ sortOrder: e.target.value })}
                        value={this.state.sortOrder}>
                        <option value="asc">Asc</option>
                        <option value="desc">Desc</option>
                      </select>
                    </span>
                    <br />
                    <div className="">
                      <span style={{ color: '#ccc' }}>
                        Set default sorting field and order for Songs->Owned.
                      </span>
                    </div>
                  </Fragment>
                </Collapsible>
                <br />
                <Collapsible
                  trigger={expandButton("Import RS Songlist")}
                  triggerWhenOpen={collapseButton("Import RS Songlist")}
                  transitionTime={200}
                  easing="ease-in"
                >
                  {this.generateSetlistOptions()}
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
                    <a
                      onClick={this.resetdb}
                      className="extraPadding download">
                      Reset
                  </a>
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
                  }}>
                    <a
                      onClick={this.resetSidebarState}
                      className="extraPadding download">
                      Reset
                  </a>
                  </span>
                  <br /> <br />
                </Collapsible>
                <br />
              </div>
            </div>
          </div>
          <div className="centerButton list-unstyled">
            <a
              onClick={this.saveSettings}
              className="extraPadding download">
              Save Settings
            </a>
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
  saveSearch: PropTypes.func,
  getSearch: PropTypes.func,
}
SettingsView.defaultProps = {
  currentTab: null,
  handleChange: () => { },
  updateHeader: () => { },
  //resetHeader: () => { },
  refreshTabs: () => { },
  saveSearch: () => { },
  getSearch: () => { },
}
