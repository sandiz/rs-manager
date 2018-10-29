import React from 'react'
import PropTypes from 'prop-types';
import Collapsible from 'react-collapsible';
import DatePicker from 'react-datepicker';
import moment from 'moment';
import {
  getAllSetlist, saveSongToSetlist, getSongByID, updateCDLCStat, updateSAFCStat,
} from '../sqliteService';
import { getScoreAttackConfig } from '../configService';
import { expandButton, collapseButton } from "./settingsView";
import { DateAcquiredInput } from './songavailableView';

export function forceNoScroll() {
  document.getElementsByTagName("body")[0].scrollTop = 0;
  document.getElementsByTagName("html")[0].scrollTop = 0;

  document.getElementsByTagName("body")[0].style.height = "100%";
  document.getElementsByTagName("body")[0].style.overflow = "hidden";
  document.getElementsByTagName("html")[0].style.height = "100%";
  document.getElementsByTagName("html")[0].style.overflow = "hidden";
}
export function enableScroll() {
  document.getElementsByTagName("body")[0].style.height = "100%";
  document.getElementsByTagName("body")[0].style.overflow = "inherit";
  document.getElementsByTagName("html")[0].style.height = "100%";
  document.getElementsByTagName("html")[0].style.overflow = "inherit";
}
export default class SongDetailView extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      showPlaythrough: true,
      showMusicVideo: false,
      pturl: '',
      mvurl: '',
      setlists: [],
      currentSetlist: '',
      ptindex: 0,
      mvindex: 0,
      ptresults: null,
      mvresults: null,
      showsastats: false,
      is_cdlc: false,
      sa_fc_easy: null,
      sa_fc_medium: null,
      sa_fc_hard: null,
      sa_fc_master: null,
    }
    this.maxResults = 10;
    this.modal_div = null;
    this.ptplayer = null
    this.mvplayer = null
  }

  shouldComponentUpdate = async (nextprops, nextstate) => {
    if (nextprops.showDetail && nextprops !== this.props) {
      //search youtube
      this.shown = true;
      const { song, artist } = nextprops;
      const ptsearchterm = unescape(song) + " " + unescape(artist) + " rocksmith";
      const mvsearchterm = unescape(song) + " " + unescape(artist) + " music video";
      console.log("searching for ", ptsearchterm, mvsearchterm);
      this.getYoutubeResult(ptsearchterm, "div_playthrough");
      this.getYoutubeResult(mvsearchterm, "div_musicvideo");
      await this.generateSetlistOptions();
    }
    return nextprops.showDetail;
  }

  componentDidUpdate = () => {
    if (this.modal_div) { this.modal_div.scrollTop = 0 }
  }

  onKeyUp = (e) => {
    console.log(e.KeyCode);
  }

  getYoutubeResult = async (searchterm, divID) => {
    const url = 'https://www.googleapis.com/youtube/v3/search';
    const params = {
      part: 'snippet',
      key: 'AIzaSyAQPZZZVEH-lUTRuN4l2XF-zUB25eR45zo',
      q: searchterm,
      maxResults: this.maxResults,
    };
    const output = await window.request(url, '', '', params);
    const entries = JSON.parse(output);
    switch (divID) {
      case "div_playthrough":
        this.setState({
          ptresults: entries.items,
        }, () => {
          console.log(this.state.ptresults)
          this.chooseVideo(divID, 0);
        });
        break;
      case "div_musicvideo":
        this.setState({
          mvresults: entries.items,
        }, () => {
          console.log(this.state.mvresults)
          this.chooseVideo(divID, 0);
        });
        break;
      default:
        break;
    }
  }

  chooseVideo = async (divID, index) => {
    let vid = '';
    const results = divID === "div_playthrough" ? this.state.ptresults : this.state.mvresults;
    if (results.length > 0) {
      const result = results[index];
      vid = result.id.videoId;
    }
    const yturl = `http://localhost:${window.YT_PORT}/yt/` + vid
    console.log("yt localhost proxyurl:", yturl);
    switch (divID) {
      case "div_playthrough":
        this.setState({
          pturl: yturl,
          ptindex: index,
        });
        if (this.ptplayer) { this.ptplayer.src = yturl; this.mvplayer.src = ""; }
        break;
      case "div_musicvideo":
        this.setState({
          mvurl: yturl,
          mvindex: index,
        });
        break;
      default:
        break;
    }
  }

  choosePlay = () => {
    if (this.ptplayer) { this.ptplayer.src = this.state.pturl; this.mvplayer.src = ""; }
    this.setState({ showPlaythrough: true, showMusicVideo: false });
  }

  chooseMV = () => {
    if (this.mvplayer) { this.mvplayer.src = this.state.mvurl; this.ptplayer.src = ""; }
    this.setState({ showPlaythrough: false, showMusicVideo: true });
  }

  handleHide = () => {
    this.choosePlay();
    this.props.close();
    enableScroll();
  }

  addToSetlist = async (e) => {
    const { song, artist } = this.props;
    await saveSongToSetlist(this.state.currentSetlist, unescape(song), unescape(artist));
  }

  saveSetlist = (e) => {
    this.setState({ currentSetlist: e.target.value });
  }

  generateSetlistOptions = async () => {
    const items = []
    const output = await getAllSetlist(true);
    for (let i = 0; i < output.length; i += 1) {
      items.push(<option key={output[i].key} value={output[i].key}>{output[i].name}</option>);
      //here I will be creating my options dynamically based on
      //what props are currently passed to the parent component
    }
    const showsastats = await getScoreAttackConfig();
    this.setState({ setlists: items, currentSetlist: output[0].key, showsastats });
    const songDetails = await getSongByID(this.props.songID);
    const isTrueSet = (songDetails.is_cdlc === 'true');
    this.setState({
      is_cdlc: isTrueSet,
      sa_fc_easy: songDetails.sa_fc_easy == null ? null : moment(songDetails.sa_fc_easy),
      sa_fc_medium: songDetails.sa_fc_medium == null ? null : moment(songDetails.sa_fc_medium),
      sa_fc_hard: songDetails.sa_fc_hard == null ? null : moment(songDetails.sa_fc_hard),
      sa_fc_master: songDetails.sa_fc_master == null ? null : moment(songDetails.sa_fc_master),
    })
  }

  showPrevVideo = (divID) => {
    const index = divID === "div_playthrough" ? this.state.ptindex : this.state.mvindex;
    if (index <= 0) {
      return;
    }
    this.chooseVideo(divID, index - 1);
  }

  showNextVideo = (divID) => {
    const results = divID === "div_playthrough" ? this.state.ptresults : this.state.mvresults;
    const index = divID === "div_playthrough" ? this.state.ptindex : this.state.mvindex;
    if (index >= results.length - 1) {
      return;
    }
    this.chooseVideo(divID, index + 1);
  }

  updateCDLCStatus = async (status) => {
    //console.log(status);
    //this.setState({ is_cdlc: status });
    await updateCDLCStat(this.props.songID, status);
    const songDetails = await getSongByID(this.props.songID);
    const isTrueSet = (songDetails.is_cdlc === 'true');
    this.setState({
      is_cdlc: isTrueSet,
    });
  }

  updateSAStat = async (saType, date) => {
    //console.log(saType, date.unix());
    //save to db with unix ts
    let key = "";
    switch (saType) {
      case "easy":
        key = "sa_fc_easy";
        break;
      case "medium":
        key = "sa_fc_medium";
        break;
      case "hard":
        key = "sa_fc_hard";
        break;
      case "master":
        key = "sa_fc_master";
        break;
      default:
        break;
    }
    await updateSAFCStat(key, Date.parse(date.toDate()), this.props.songID);
    const songDetails = await getSongByID(this.props.songID);
    this.setState({
      sa_fc_easy: songDetails.sa_fc_easy == null ? null : moment(songDetails.sa_fc_easy),
      sa_fc_medium: songDetails.sa_fc_medium == null ? null : moment(songDetails.sa_fc_medium),
      sa_fc_hard: songDetails.sa_fc_hard == null ? null : moment(songDetails.sa_fc_hard),
      sa_fc_master: songDetails.sa_fc_master == null ? null : moment(songDetails.sa_fc_master),
    })
  }

  render = () => {
    const cdlcyesstyle = this.state.is_cdlc ? "song-detail-option" : "song-detail-option-disabled";
    const cdlcnostyle = this.state.is_cdlc ? "song-detail-option-disabled" : "song-detail-option";
    const setlistyle = "extraPadding download " + (this.props.isSetlist && !this.props.isGenerated && !this.props.isRSSetlist ? "" : "hidden");
    const songlistanddashstyle = "extraPadding download " + (this.props.isSongview ? "" : "hidden");
    const songliststyle = "extraPadding download " + (this.props.isSongview && !this.props.isDashboard ? "" : "hidden");
    const songliststylegeneric = (this.props.isSongview && !this.props.isDashboard ? "" : "hidden");
    const ptstyle = "extraPadding download " + (!this.state.showPlaythrough ? "" : "isDisabled");
    const mvstyle = "extraPadding download " + (!this.state.showMusicVideo ? "" : "isDisabled");
    const ptdivstyle = this.state.showPlaythrough ? "dblock" : "hidden";
    const mvdivstyle = this.state.showMusicVideo ? "dblock" : "hidden";
    const selectsetliststyle = this.props.isGenerated || this.props.isRSSetlist ? "hidden" : "";
    let showleftarrow = '';
    let showrightarrow = '';
    let yttitle = "";
    if (this.state.showPlaythrough && this.state.ptresults !== null) {
      yttitle = this.state.ptindex < this.state.ptresults.length
        ? this.state.ptresults[this.state.ptindex].snippet.title + " - " + this.state.ptresults[this.state.ptindex].snippet.channelTitle : ""
      yttitle = "(" + (this.state.ptindex + 1) + "/" + this.state.ptresults.length + ") " + yttitle
      showleftarrow = this.state.ptindex <= 0 ? "hidden" : "dblock";
      showrightarrow = this.state.ptindex >= this.state.ptresults.length - 1 ? "hidden" : "dblock";
    }
    else if (this.state.showMusicVideo && this.state.mvresults !== null) {
      yttitle = this.state.mvindex < this.state.mvresults.length
        ? this.state.mvresults[this.state.mvindex].snippet.title + " - " + this.state.mvresults[this.state.mvindex].snippet.channelTitle : ""
      yttitle = "(" + (this.state.mvindex + 1) + "/" + this.state.mvresults.length + ") " + yttitle
    }
    let modalinfostyle = "width-52";
    if (this.props.isSetlist) {
      modalinfostyle = "width-75-2"
    }
    else if (this.props.isSongview) {
      modalinfostyle = "width-52";
    }
    if (this.props.showDetail === false) { return null; }
    forceNoScroll();
    return (
      <div ref={(ref) => { this.modal_div = ref }} id="open-modal" className="modal-window" style={{ opacity: 1, pointerEvents: "auto" }}>
        <div id="modal-info" className={modalinfostyle}>
          <a onKeyUp={this.onKeyUp} title="Close" className="modal-close" onClick={this.handleHide}>Close</a>
          <br />
          <div style={{ textAlign: 'center' }}>
            <h4 style={{ fontSize: 150 + "%", fontWeight: 'bold' }}>{unescape(this.props.song)}
              {
                this.props.isSongpack ? ""
                  : (
                    <span>
                      <span style={{ fontSize: 70 + '%', fontWeight: 'normal' }}> by </span>
                      {unescape(this.props.artist)}
                      <span style={{ fontSize: 70 + '%', fontWeight: 'normal' }}> from </span>
                      {unescape(this.props.album)}
                    </span>
                  )
              }
            </h4>
          </div>
          <div>
            <div id="div_playthrough" className={ptdivstyle} style={{ width: 100 + '%', margin: '0 auto' }}>
              <iframe
                ref={(node) => { this.ptplayer = node }}
                title="pt"
                id="ytplayer"
                width="100%"
                height="500px"
                src=""
                frameBorder="0"
                style={{ margin: 'auto', display: 'block' }}
                allowFullScreen />
              <a href="#" onClick={() => this.showPrevVideo("div_playthrough")}>
                <img
                  style={{ width: 4 + '%', float: 'left' }}
                  className={showleftarrow}
                  title="Previous Result"
                  alt="prev-video"
                  src="data:image/svg+xml;utf8;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAxMjkgMTI5IiBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCAxMjkgMTI5IiB3aWR0aD0iNjRweCIgaGVpZ2h0PSI2NHB4Ij4KICA8Zz4KICAgIDxwYXRoIGQ9Im04OC42LDEyMS4zYzAuOCwwLjggMS44LDEuMiAyLjksMS4yczIuMS0wLjQgMi45LTEuMmMxLjYtMS42IDEuNi00LjIgMC01LjhsLTUxLTUxIDUxLTUxYzEuNi0xLjYgMS42LTQuMiAwLTUuOHMtNC4yLTEuNi01LjgsMGwtNTQsNTMuOWMtMS42LDEuNi0xLjYsNC4yIDAsNS44bDU0LDUzLjl6IiBmaWxsPSIjMDAwMDAwIi8+CiAgPC9nPgo8L3N2Zz4K" />
              </a>
              <a href="#" onClick={() => this.showNextVideo("div_playthrough")}>
                <img
                  style={{ width: 4 + '%', float: 'right' }}
                  className={showrightarrow}
                  title="Next Result"
                  src="data:image/svg+xml;utf8;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAxMjkgMTI5IiBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCAxMjkgMTI5IiB3aWR0aD0iNTEycHgiIGhlaWdodD0iNTEycHgiPgogIDxnPgogICAgPHBhdGggZD0ibTQwLjQsMTIxLjNjLTAuOCwwLjgtMS44LDEuMi0yLjksMS4ycy0yLjEtMC40LTIuOS0xLjJjLTEuNi0xLjYtMS42LTQuMiAwLTUuOGw1MS01MS01MS01MWMtMS42LTEuNi0xLjYtNC4yIDAtNS44IDEuNi0xLjYgNC4yLTEuNiA1LjgsMGw1My45LDUzLjljMS42LDEuNiAxLjYsNC4yIDAsNS44bC01My45LDUzLjl6IiBmaWxsPSIjMDAwMDAwIi8+CiAgPC9nPgo8L3N2Zz4K"
                  alt="next-video" />
              </a>
              <div className="ta-center">
                {yttitle}
              </div>
            </div>
            <div title="mv" id="div_musicvideo" className={mvdivstyle} style={{ width: 100 + '%', margin: '0 auto' }}>
              <iframe
                ref={(node) => { this.mvplayer = node }}
                title="mv"
                id="ytplayer"
                width="100%"
                height="500px"
                src=""
                frameBorder="0"
                style={{ margin: 'auto', display: 'block' }}
                allowFullScreen />
            </div>
          </div>
          <div className="centerButton list-unstyled">
            <a
              onClick={this.choosePlay}
              className={ptstyle}>
              Playthrough Video
            </a>
            {
              this.props.isWeekly ? ""
                : this.props.isSongpack
                  ? (
                    <a
                      onClick={() => {
                        console.log(this.props.dlcappid);
                        window.shell.openExternal("steam://openurl/https://store.steampowered.com/app/" + this.props.dlcappid);
                      }}
                      className={mvstyle}>
                      Buy From Steam
                  </a>
                  )
                  : (
                    <span>
                      <a
                        onClick={this.chooseMV}
                        className={mvstyle}>
                        Music Video
                    </a>
                      <a
                        onClick={async () => {
                          await this.props.removeFromSetlist();
                          this.handleHide();
                        }}
                        className={setlistyle}>
                        Remove from Setlist
                    </a>
                      <a
                        onClick={async () => { this.addToSetlist(); this.handleHide(); }}
                        className={songlistanddashstyle}>
                        Add to Setlist
                    </a>
                      <select className={selectsetliststyle} onChange={this.saveSetlist} style={{ width: 12 + '%', margin: 12 + 'px' }}>
                        {this.state.setlists}
                      </select>
                    </span>
                  )
            }
          </div>
          <div className={songliststylegeneric}>
            <br />
            <Collapsible
              trigger={expandButton('More Options', 6)}
              triggerWhenOpen={collapseButton('More Options', 6)}
              transitionTime={200}
              easing="ease-in"
              close
            >
              <div className="options-flex">
                <div style={{ flexBasis: 100 + '%' }} className="options-flex-div">
                  <div style={{ float: 'left' }}>Custom DLC</div>
                  <div style={{ float: 'right' }}>
                    <span
                      className={cdlcyesstyle}>
                      <a
                        href="#"
                        onClick={() => this.updateCDLCStatus(true)}>
                        Yes
                    </a>
                    </span>
                    <span>&nbsp;&nbsp;</span>
                    <span
                      className={cdlcnostyle}>
                      <a
                        href="#"
                        onClick={() => this.updateCDLCStatus(false)}>
                        No
                    </a>
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 6 + 'px' }}>
                {
                  this.state.showsastats
                    ? <div style={{ float: 'left' }}>Score Attack FCs</div>
                    : ""
                }
                <div className="options-flex-right" style={{ textAlign: 'right' }}>
                  {
                    this.state.showsastats
                      ? (
                        <div className="options-flex-div">
                          <span>Master</span>
                          <span>&nbsp;&nbsp;&nbsp;</span>
                          <div
                            className="song-detail-option"
                            style={{ float: 'right', marginRight: (this.state.sa_fc_master ? 0 : 20) + 'px' }}>
                            <DatePicker
                              //placeholderText="---"
                              selected={this.state.sa_fc_master}
                              customInput={<DateAcquiredInput />}
                              onChange={t => this.updateSAStat('master', t)}
                              popperModifiers={{
                                offset: {
                                  enabled: true,
                                  offset: '-50px, 0px',
                                },
                                preventOverflow: {
                                  enabled: true,
                                  escapeWithReference: false,
                                  boundariesElement: 'viewport',
                                },
                              }}
                              dateFormat="ll" />
                          </div>
                        </div>
                      )
                      : ""
                  }
                  {
                    this.state.showsastats
                      ? (
                        <div className="options-flex-div">
                          <span>Hard</span>
                          <span>&nbsp;&nbsp;&nbsp;</span>
                          <div
                            className="song-detail-option"
                            style={{ float: 'right', marginRight: (this.state.sa_fc_hard ? 0 : 20) + 'px' }}>
                            <DatePicker
                              //placeholderText="---"
                              selected={this.state.sa_fc_hard}
                              customInput={<DateAcquiredInput />}
                              onChange={t => this.updateSAStat('hard', t)}
                              popperModifiers={{
                                offset: {
                                  enabled: true,
                                  offset: '-50px, 0px',
                                },
                                preventOverflow: {
                                  enabled: true,
                                  escapeWithReference: false,
                                  boundariesElement: 'viewport',
                                },
                              }}
                              dateFormat="ll" />
                          </div>
                        </div>
                      )
                      : ""
                  }
                  {
                    this.state.showsastats
                      ? (
                        <div className="options-flex-div">
                          <span>Medium</span>
                          <span>&nbsp;&nbsp;&nbsp;</span>
                          <div
                            className="song-detail-option"
                            style={{ float: 'right', marginRight: (this.state.sa_fc_medium ? 0 : 20) + 'px' }}>
                            <DatePicker
                              //placeholderText="---"
                              selected={this.state.sa_fc_medium}
                              customInput={<DateAcquiredInput />}
                              onChange={t => this.updateSAStat('medium', t)}
                              popperModifiers={{
                                offset: {
                                  enabled: true,
                                  offset: '-50px, 0px',
                                },
                                preventOverflow: {
                                  enabled: true,
                                  escapeWithReference: false,
                                  boundariesElement: 'viewport',
                                },
                              }}
                              dateFormat="ll" />
                          </div>
                        </div>
                      )
                      : ""
                  }
                  {
                    this.state.showsastats
                      ? (
                        <div className="options-flex-div">
                          <span>Easy</span>
                          <span>&nbsp;&nbsp;&nbsp;</span>
                          <div
                            className="song-detail-option"
                            style={{ float: 'right', marginRight: (this.state.sa_fc_easy ? 0 : 20) + 'px' }}>
                            <DatePicker
                              //placeholderText="---"
                              selected={this.state.sa_fc_easy}
                              customInput={<DateAcquiredInput />}
                              onChange={t => this.updateSAStat('easy', t)}
                              popperModifiers={{
                                offset: {
                                  enabled: true,
                                  offset: '-50px, 0px',
                                },
                                preventOverflow: {
                                  enabled: true,
                                  escapeWithReference: false,
                                  boundariesElement: 'viewport',
                                },
                              }}
                              dateFormat="ll" />
                          </div>
                        </div>
                      )
                      : ""
                  }
                </div>
              </div>
              <br />
              <div className="options-flex-center">
                <div style={{ marginRight: 30 + 'px' }} className="options-flex-div">
                  <a
                    style={{ width: 100 + '%' }}
                    className={songliststyle}
                    onClick={async () => {
                      await this.props.removeFromDB();
                      this.handleHide();
                    }}>
                    <span>Delete Song from DB</span>
                  </a>
                </div>
                <div style={{}} className="options-flex-div">
                  <a
                    style={{ width: 100 + '%' }}
                    className={songliststyle}
                    onClick={async () => {
                      await this.props.removeFromDB();
                      await this.props.ignoreArrangement();
                      this.handleHide();
                    }}>
                    <span>Delete and Never Import</span>
                  </a>
                </div>
              </div>
            </Collapsible>
          </div>
        </div>
      </div>
    );
  }
}

SongDetailView.propTypes = {
  showDetail: PropTypes.bool,
  song: PropTypes.string,
  artist: PropTypes.string,
  album: PropTypes.string,
  close: PropTypes.func,
  isSongview: PropTypes.bool,
  isSetlist: PropTypes.bool,
  isSongpack: PropTypes.bool,
  isDashboard: PropTypes.bool,
  isWeekly: PropTypes.bool,
  dlcappid: PropTypes.string,
  removeFromSetlist: PropTypes.func,
  removeFromDB: PropTypes.func,
  ignoreArrangement: PropTypes.func,
  songID: PropTypes.string,
  isGenerated: PropTypes.bool,
  isRSSetlist: PropTypes.bool,
}
SongDetailView.defaultProps = {
  showDetail: false,
  song: '',
  artist: '',
  album: '',
  isSetlist: true,
  isDashboard: false,
  isSongview: false,
  isSongpack: false,
  isWeekly: false,
  dlcappid: '',
  close: () => { },
  removeFromSetlist: () => { },
  removeFromDB: () => { },
  ignoreArrangement: () => { },
  songID: '',
  isGenerated: false,
  isRSSetlist: false,
}
