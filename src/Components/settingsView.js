import React from 'react'
import Collapsible from 'react-collapsible';
import PropTypes from 'prop-types';
import getProfileConfig, { updateSteamLoginSecureCookie, getSteamLoginSecureCookie, updateProfileConfig, getScoreAttackConfig, updateScoreAttackConfig, updateUseCDLCConfig, getUseCDLCConfig, getScoreAttackDashboardConfig, updateScoreAttackDashboard, getSessionIDConfig, updateSessionIDConfig, getMasteryThresholdConfig, updateMasteryThreshold } from '../configService';
import { resetDB, createRSSongList, addtoRSSongList, isTablePresent, deleteRSSongList } from '../sqliteService';
import readProfile from '../steamprofileService';

const { path } = window;
const { remote } = window.require('electron')

const getHeader = (text, size) => {
  let header = null;
  switch (size) {
    case 3:
      header = (<h3><a>{text}</a></h3>)
      break;
    case 6:
      header = (<h6><a>{text}</a></h6>)
      break;
    default:
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
              this.state.processingSetlist ? "Processing..." :
                (
                  this.state.setlistImported[i] ?
                    <span> <a style={{ color: 'red' }} onClick={() => this.importDeleteSetlist(i, "delete")}>Delete Setlist</a> &nbsp;| &nbsp;
                    <a onClick={() => this.importDeleteSetlist(i, "import")}>Reimport Setlist</a> </span>
                    :
                    <a onClick={() => this.importDeleteSetlist(i, "import")}>Click to Import</a>
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
      await createRSSongList(tablename, displayname, null, null, null, true);
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
  handleMasteryThreshold = (event) => {
    this.setState({
      masteryThreshold: event.target.value / 100,
    });
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
  readConfigs = async () => {
    const d = await getProfileConfig();
    const e = await getSteamLoginSecureCookie();
    const f = await getScoreAttackConfig();
    const g = await getUseCDLCConfig();
    const h = await getScoreAttackDashboardConfig();
    const i = await getSessionIDConfig();
    const j = await getMasteryThresholdConfig();
    this.setState({
      prfldb: d,
      steamLoginSecure: e,
      showScoreAttack: f,
      useCDLCinStats: g,
      scoreAttackDashboard: h,
      sessionID: i,
      masteryThreshold: j,
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
    await updateScoreAttackDashboard(this.state.scoreAttackDashboard);
    await updateMasteryThreshold(this.state.masteryThreshold);
    this.props.handleChange();
    this.props.updateHeader(this.tabname, "Settings Saved!");
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
    })
    console.log(d);
    if (d !== "" && d != null) {
      this.setState({ sessionID: d });
    }
    this.props.handleChange();
  }
  render = () => {
    if (this.props.currentTab === null) {
      return null;
    } else if (this.props.currentTab.id === this.tabname) {
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
                      this.state.prfldb === '' ?
                        <a onClick={this.enterPrfldb}>Click to Change </a>
                        :
                        <a onClick={this.enterPrfldb}>
                          <i>{path.basename(this.state.prfldb).toLowerCase()}</i>
                        </a>
                    }
                  </span>
                  <br />
                  <div className="">
                    <span style={{ color: '#ccc' }}>
                      Choose the rocksmith profile to read the stats from.
                    The profile is only read and never written to.<br />
                      RS profile ends with _prfldb and is typically found
                      in your __SteamFolder__/Steam/userdata/__random_number__/221680/remote/
                  </span>
                  </div>
                  <br />
                  <span style={{ float: 'left' }}>
                    <a onClick={this.enterCookie}>
                      Steam Login Cookie (steamLoginSecure) / SessionID (sessionId):
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
                      this.state.steamLoginSecure === '' ?
                        <a onClick={this.enterCookie}>Click to Change </a>
                        :
                        <i>
                          <a onClick={this.enterCookie}>
                            {(this.state.steamLoginSecure).toLowerCase()}
                          </a><br />
                          <a onClick={this.enterCookie}>
                            {(this.state.sessionID).toLowerCase()}
                          </a>
                        </i>
                    }
                  </span>
                  <br />
                  <div className="">
                    <span style={{ color: '#ccc' }}>
                      Steam Login Cookie and SessionID is used to update owned/acquired date in
                      Songs &gt; DLC Catalog.
                      The login cookie is valid as long the browser session is valid.
                      The app queries your
                      <a style={{ color: 'blue' }} onClick={() => window.shell.openExternal("http://store.steampowered.com/dynamicstore/userdata/")}>
                        &nbsp;userdata&nbsp;
                      </a>
                      to fetch your dlc&#39;s and
                      <a style={{ color: 'blue' }} onClick={() => window.shell.openExternal("https://store.steampowered.com/account/AjaxLoadMoreHistory/")}>
                        &nbsp;purchase history&nbsp;
                      </a>
                      to fetch owned/acquired date.
                     You can check your data by logging on to steam in a browser
                     and clicking those links.
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
                    <a onClick={this.enterCookie}>
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
                    <a onClick={this.enterCookie}>
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
                    <a onClick={this.enterCookie}>
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
                    <a onClick={this.enterCookie}>
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
                </Collapsible>
                <br />
                <Collapsible
                  trigger={expandButton("Import Setlists")}
                  triggerWhenOpen={collapseButton("Import Setlists")}
                  transitionTime={200}
                  easing="ease-in"
                >
                  {this.generateSetlistOptions()}
                </Collapsible>
                <br />
                <Collapsible
                  trigger={expandButton("Song Collection")}
                  triggerWhenOpen={collapseButton("Song Collection")}
                  transitionTime={200}
                  easing="ease-in"
                >
                  <span style={{ float: 'left', color: 'red', marginTop: 18 + 'px' }}>
                    <a onClick={this.enterCookie}>
                      Reset Songs Owned Collection
                  </a>
                  </span>
                  <span style={{
                    float: 'right',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    width: 400 + 'px',
                    textAlign: 'right',
                  }}>
                    <a
                      onClick={this.resetdb}
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
        </div >
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
  //resetHeader: () => { },
  refreshTabs: () => { },
}
