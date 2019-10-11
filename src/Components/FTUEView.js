import React from 'react'
import PropTypes from 'prop-types';
import { withI18n, Trans } from 'react-i18next';
import Select from 'react-select';
import getProfileConfig, { getSteamNameFromSteamID, updateProfileConfig, updateSteamIDConfig } from '../configService';
import {
  getSteamProfiles, getProfileName,
  getAllProfiles, getSteamPathForRocksmith, getRocksmithInstallFolder,
} from '../steamprofileService';

import steam from '../assets/tree-icons/catalog.svg'
import * as rsicon from '../assets/icons/icon-1024x1024-gray.png'
import { metaWorker } from '../lib/libworker';
import { DispatchEvents, DispatcherService } from '../lib/libdispatcher';

const { remote } = window.require('electron');

class FTUEView extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      currentSteamProfile: '',
      steamProfileOptions: [],
      currentRSProfile: '',
      rsProfileOptions: [],
      steamID: '',
      prfldb: '',
      dlcPath: '',
      pleaseWait: false,
      pleaseWaitMsg: null,
    }
  }

  componentWillMount = async () => {
    const currentSteamProfile = await getSteamNameFromSteamID();
    const steamProfileOptions = await getSteamProfiles();
    const prfldb = await getProfileConfig();
    const currentRSProfile = await getProfileName(prfldb);
    this.setState({
      currentSteamProfile,
      steamProfileOptions,
      currentRSProfile,
    })
    if (currentRSProfile !== '' && prfldb !== '') {
      const name = await getProfileName(prfldb);
      this.handleRSProfileChange({ value: prfldb, label: name });
    }
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

  selectDLCFolder = async () => {
    let dirs = await remote.dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    if (dirs === null || typeof dirs === 'undefined' || dirs.filePaths.length <= 0 || dirs.canceled) {
      return;
    }
    dirs = dirs.filePaths;
    if (dirs.length > 0) {
      const dir = dirs[0];
      this.setState({ dlcPath: dir, showPicker: false });
    }
  }

  handleRSProfileChange = async (so) => {
    let rsInstallDir = await getRocksmithInstallFolder();
    if (!window.electronFS.existsSync(rsInstallDir)) rsInstallDir = null;
    let dlcPath = '';
    if (rsInstallDir) {
      dlcPath = window.path.join(rsInstallDir);
    }
    else {
      dlcPath = (
        <span>
          Failed to find rocksmith install location, &nbsp;
           <a className="song-detail-option" onClick={this.selectDLCFolder}>
            click here to select one.
          </a>
        </span>
      );
    }

    const prfldb = so.value;
    this.setState({
      dlcPath, currentRSProfile: so.label, prfldb,
    })
  }

  saveProfileSettings = async () => {
    if (this.state.prfldb !== "" && this.state.prfldb != null) {
      await updateProfileConfig(this.state.prfldb);
    }
    if (this.state.steamID !== "" && this.state.steamID != null) {
      await updateSteamIDConfig(this.state.steamID);
    }
    let pleaseWaitMsg = (
      <Trans i18nKey="processingPleaseWait">
        Processing, please wait...
      </Trans>
    );
    this.setState({ pleaseWait: true, pleaseWaitMsg });

    if (typeof this.state.dlcPath === 'string') {
      DispatcherService.on(DispatchEvents.PROFILE_UPDATED, this.profileUpdated);
      metaWorker.importDLCandStats(this.state.dlcPath);
    }
    else {
      pleaseWaitMsg = (
        <Trans i18nKey="ftueFailedProcessing">
          Failed to import data, please try it manually via PSARC Explorer
      </Trans>
      );
      this.setState({ pleaseWaitMsg });
    }
  }

  profileUpdated = async () => {
    DispatcherService.off(DispatchEvents.PROFILE_UPDATED, this.profileUpdated);
    const pleaseWaitMsg = (
      <Trans i18nKey="ftueProcessingComplete">
        Profile and DLC data imported succesfully, you can now view your stats in Dashboard
        and your collection in Songs &gt; Owned
      </Trans>
    );
    this.setState({ pleaseWaitMsg });
  }

  render = () => {
    const dlcpathclass = this.state.dlcPath === '' ? "hidden" : "";
    const buttonclass = "extraPadding download "
      + ((this.state.currentRSProfile.length === 0
        || this.state.currentSteamProfile.length === 0
        || (this.state.dlcPath.length > 0 && this.state.showPicker === true)
      ) ? "isDisabled" : "")
    if (!this.props.showFTUE) return null
    return (
      <React.Fragment>
        <a title="Close" className="modal-close" onClick={this.props.closeFTUE}><Trans i18nKey="close">Close</Trans></a>
        <div className=" justify-content-lg-center">
          <br />
          <div className="ftue-body">
            <h3><Trans i18nKey="welcome">Welcome!</Trans></h3>
            <hr />
            <div>
              <Trans i18nKey="ftueMessage">
                This app uses Rocksmith and Steam data to consolidate stats/mastery/dlc/songlists
                  under one roof. To get started, please select your accounts below
              </Trans>:
            </div>
            <div className="d-flex flex-row justify-content-center" style={{ margin: '0 auto', width: 80 + '%' }}>
              <div style={{ width: 100 + '%', margin: 20 + 'px' }}>
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
                          <span className="pointer" style={{ borderBottom: "1px dotted" }}>
                            {this.state.currentSteamProfile}
                          </span>
                        </div>
                      )
                  }
                </div>
              </div>
            </div>
            <div className="d-flex flex-row justify-content-center" style={{ margin: '0 auto', width: 80 + '%' }}>
              <div style={{ width: 100 + '%', margin: 12 + 'px' }}>
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
                          <span className="pointer" style={{ borderBottom: "1px dotted" }}>
                            {this.state.currentRSProfile}
                          </span>
                        </div>
                      )
                  }
                </div>
              </div>
            </div>
            <br />
            <div className={dlcpathclass}>
              Rocksmith Path: {this.state.dlcPath}
            </div>
            <br />
            <div>
              {
                this.state.pleaseWait
                  ? (
                    <div className="alert alert-info" style={{ marginTop: 15 + 'px' }}>
                      <span>
                        {this.state.pleaseWaitMsg}
                      </span>
                    </div>
                  )
                  : (
                    <button
                      style={{ width: 50 + '%' }}
                      type="button"
                      onClick={this.saveProfileSettings}
                      className={buttonclass}>
                      <Trans i18nKey="saveAndImport">
                        Save & Import
                      </Trans>
                    </button>
                  )
              }
            </div>
          </div>
        </div>
      </React.Fragment>
    )
  }
}
FTUEView.propTypes = {
  showFTUE: PropTypes.bool,
  closeFTUE: PropTypes.func,
}
FTUEView.defaultProps = {
  showFTUE: true,
  closeFTUE: () => { },
}

export default withI18n('translation')(FTUEView);
