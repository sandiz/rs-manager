import React from 'react'
import PropTypes from 'prop-types';
import path from 'path'
import getProfileConfig, { updateSteamLoginSecureCookie, getSteamLoginSecureCookie, updateProfileConfig } from '../configService';

const { remote } = window.require('electron')
export default class SettingsView extends React.Component {
  constructor(props) {
    super(props);
    this.tabname = "tab-settings"
    this.state = {
      prfldb: '',
      steamLoginSecure: '',
    };
    this.readConfigs();
  }
  readConfigs = async () => {
    const d = await getProfileConfig();
    const e = await getSteamLoginSecureCookie();
    this.setState({ prfldb: d, steamLoginSecure: e });
  }
  saveSettings = async () => {
    if (this.state.steamLoginSecure !== "" && this.state.steamLoginSecure != null) {
      await updateSteamLoginSecureCookie(this.state.steamLoginSecure);
    }
    if (this.state.prfldb !== "" && this.state.prfldb != null) {
      await updateProfileConfig(this.state.prfldb);
    }
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
            <div className="col col-lg-7 settings">
              <div style={{ marginTop: -6 + 'px', paddingLeft: 30 + 'px', paddingRight: 30 + 'px' }}>
                <br /><br />
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
                <div className="ta-center">
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
                <div className="ta-center">
                  <span style={{ color: '#ccc' }}>
                    Steam Login Cookie is used to update owned status in Songs Available view.
                    The login cookie is valid as long the browser session is valid. The app queries
                    &nbsp;
                    <a style={{ color: 'blue' }} onClick={() => window.shell.openExternal("http://store.steampowered.com/dynamicstore/userdata/")}>
                      your userdata</a>
                    &nbsp;
                    to fetch your dlc&#39;s. You can check your data
                  by logging on to steam and clicking the link.
                  </span>
                </div>
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
}
SettingsView.defaultProps = {
  currentTab: null,
  handleChange: () => { },
  updateHeader: () => { },
  resetHeader: () => { },
}
