import React from 'react'
import PropTypes from 'prop-types';
import { withI18n, Trans } from 'react-i18next';
import Select from 'react-select';
import getProfileConfig, { getSteamNameFromSteamID } from '../configService';
import { getSteamProfiles, getProfileName } from '../steamprofileService';

import steam from '../assets/tree-icons/catalog.svg'
import * as rsicon from '../assets/icons/icon-1024x1024-gray.png'

class FTUEView extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      currentSteamProfile: '',
      steamProfileOptions: [],
      currentRSProfile: '',
      rsProfileOptions: [],
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
  }

  render = () => {
    const buttonclass = "extraPadding download "
      + ((this.state.currentRSProfile.length === 0 || this.state.currentSteamProfile.length === 0) ? "isDisabled" : "")
    if (!this.props.showFTUE) return null
    return (
      <React.Fragment>
        <a title="Close" className="modal-close" onClick={this.props.closeFTUE}><Trans i18nKey="close">Close</Trans></a>
        <div className=" justify-content-lg-center">
          <br />
          <div className="ftue-body">
            <h3><Trans i18nKey="exportSetlistAs">Welcome!</Trans></h3>
            <hr />
            <div>
              This app uses Rocksmith and Steam data to consolidate stats/mastery/dlc/songlists
              under one roof. To get started, please select your accounts below:
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
                          <span className="pointer" style={{ borderBottom: "1px dotted" }} onClick={this.resetProfileState}>
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
                          <span className="pointer" style={{ borderBottom: "1px dotted" }} onClick={() => this.resetProfileState(true)}>
                            {this.state.currentRSProfile}
                          </span>
                        </div>
                      )
                  }
                </div>
              </div>
            </div>
            <br />
            <div>
              <button
                style={{ width: 50 + '%' }}
                type="button"
                onClick={this.saveProfileSettings}
                className={buttonclass}>
                <Trans i18nKey="save">
                  Save & Import
                </Trans>
              </button>
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
