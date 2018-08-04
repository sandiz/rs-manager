import React from 'react'
import Collapsible from 'react-collapsible';
import PropTypes from 'prop-types';
import getProfileConfig, { updateSteamLoginSecureCookie, getSteamLoginSecureCookie, updateProfileConfig, getScoreAttackConfig, updateScoreAttackConfig } from '../configService';
import { resetDB, createRSSongList, addtoRSSongList, isTablePresent, deleteRSSongList } from '../sqliteService';
import readProfile from '../steamprofileService';

const { path } = window;
const { remote } = window.require('electron')
export default class SettingsView extends React.Component {
  constructor(props) {
    super(props);
    this.tabname = "tab-settings"
    this.state = {
      prfldb: '',
      steamLoginSecure: '',
      showScoreAttack: true,
      setlistImported: [false, false, false, false, false, false],
      processingSetlist: false,
    };
    this.readConfigs();
    this.refreshSetlist();
    this.expandButton = (
      <button
        type="button"
        id="settingsExpand"
        className="navbar-btn"
        style={{ float: 'right', marginTop: -62 + 'px' }}
      >
        <span /><span /><span />
      </button>
    );
    this.collapseButton = (
      <button
        type="button"
        id="settingsCollapse"
        className="navbar-btn"
        style={{ float: 'right', marginTop: -62 + 'px' }}
      >
        <span /><span /><span />
      </button>
    );
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
              //eslint-disable-next-line
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
      await createRSSongList(tablename, displayname);
      const steamProfile = await readProfile(this.state.prfldb);
      const songRoot = steamProfile.SongListsRoot.SongLists;
      const currentSetlist = songRoot[setlistnum] === 'undefined' ? [] : songRoot[setlistnum];

      //insert values to setlist (set header with item)
      for (let i = 0; i < currentSetlist.length; i += 1) {
        const songkey = currentSetlist[i];
        this.props.updateHeader(this.tabname, `Importing Song List ${setlistnum + 1}: ${i}/${currentSetlist.length}`);
        //eslint-disable-next-line
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
  refreshSetlist = async () => {
    const setliststatus = []
    for (let i = 0; i <= 5; i += 1) {
      const tablename = "rs_song_list_" + (i + 1);
      //eslint-disable-next-line
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
    this.setState({
      prfldb: d,
      steamLoginSecure: e,
      showScoreAttack: f,
    });
  }
  saveSettings = async () => {
    if (this.state.steamLoginSecure !== "" && this.state.steamLoginSecure != null) {
      await updateSteamLoginSecureCookie(this.state.steamLoginSecure);
    }
    if (this.state.prfldb !== "" && this.state.prfldb != null) {
      await updateProfileConfig(this.state.prfldb);
    }
    await updateScoreAttackConfig(this.state.showScoreAttack);
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
    //eslint-disable-next-line
    //const d = prompt("Please enter value of steamLoginSecure cookie");
    //eslint-disable-next-line
    const d = await window.prompt({
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

      this.props.handleChange();
    }
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
                <h3>General</h3>
                <hr />
                <Collapsible
                  trigger={this.expandButton}
                  triggerWhenOpen={this.collapseButton}
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
                      Steam Login Cookie (steamLoginSecure):
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
                      this.state.steamLoginSecure === '' ?
                        <a onClick={this.enterCookie}>Click to Change </a>
                        :
                        <i>
                          <a onClick={this.enterCookie}>
                            {(this.state.steamLoginSecure).toLowerCase()}
                          </a>
                        </i>
                    }
                  </span>
                  <br />
                  <div className="">
                    <span style={{ color: '#ccc' }}>
                      Steam Login Cookie is used to update owned status in
                      Songs &gt; RS DLC Catalog.
                      The login cookie is valid as long the browser session is valid.
                      The app queries your&nbsp;
                    <a style={{ color: 'blue' }} onClick={() => window.shell.openExternal("http://store.steampowered.com/dynamicstore/userdata/")}>
                        userdata</a>
                      &nbsp;
                      to fetch your dlc&#39;s. You can check your data
                    by logging on to steam and clicking the link.
                  </span>
                  </div>
                </Collapsible>
              </div>
              <br />
              <div style={{ marginTop: -6 + 'px', paddingLeft: 30 + 'px', paddingRight: 30 + 'px' }}>
                <br />
                <h3>Score Attack</h3>
                <hr />
                <Collapsible
                  trigger={this.expandButton}
                  triggerWhenOpen={this.collapseButton}
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
                </Collapsible>
                <br />
                <h3>Setlist</h3>
                <hr />
                <Collapsible
                  trigger={this.expandButton}
                  triggerWhenOpen={this.collapseButton}
                  transitionTime={200}
                  easing="ease-in"
                >
                  {this.generateSetlistOptions()}
                </Collapsible>
                <br />
                <h3>Song Collection</h3>
                <hr />
                <Collapsible
                  trigger={this.expandButton}
                  triggerWhenOpen={this.collapseButton}
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
  // eslint-disable-next-line
  updateHeader: PropTypes.func,
  // eslint-disable-next-line
  resetHeader: PropTypes.func,
  refreshTabs: PropTypes.func,
}
SettingsView.defaultProps = {
  currentTab: null,
  handleChange: () => { },
  updateHeader: () => { },
  resetHeader: () => { },
  refreshTabs: () => { },
}
