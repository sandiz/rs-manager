import React from 'react'
import PropTypes from 'prop-types';
import { withI18n, Trans } from 'react-i18next';
import Collapsible from 'react-collapsible';
import DatePicker from 'react-datepicker';
import moment from 'moment';
import Swal from 'sweetalert2'
import AsyncSelect from 'react-select/async';
import {
  saveSongToSetlist, getSongByID,
  updateCDLCStat, updateSAFCStat, saveSongByIDToSetlist,
  updateNotes, getNotes, getAllTags, executeRawSql,
  addTag, removeFromSongsOwned, addToIgnoreArrangements,
} from '../sqliteService';
import { getScoreAttackConfig } from '../configService';
import { expandButton, collapseButton } from "./settingsView";
import { DateAcquiredInput, tagOptions } from './songavailableView';

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
const customStyles = {
  container: styles => ({
    ...styles, display: 'flex', marginBottom: 5 + 'px',
  }),
  control: styles => ({
    ...styles, backgroundColor: 'white', color: 'black', width: 50 + '%', left: 25 + '%',
  }),
  option: (styles, {
    data, isDisabled, isFocused, isSelected,
  }) => {
    return {
      ...styles,
      color: 'black',
    };
  },
  multiValue: (styles, { data }) => {
    return {
      ...styles,
    };
  },
  multiValueLabel: (styles, { data }) => ({
    ...styles,
  }),
  multiValueRemove: (styles, { data }) => ({
    ...styles,
  }),
  menu: styles => ({
    ...styles, width: 50 + '%', left: 25 + '%',
  }),
}
class SongDetailView extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      showPlaythrough: true,
      showMusicVideo: false,
      pturl: '',
      mvurl: '',
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
      tags: [],
      songID: '',
    }
    this.maxResults = 10;
    this.modal_div = null;
    this.ptplayer = null
    this.mvplayer = null
    this.arrlistref = React.createRef();
  }

  shouldComponentUpdate = async (nextprops, nextstate) => {
    if (nextprops.showDetail && nextprops !== this.props) {
      //search youtube
      this.shown = true;
      const {
        song, artist, songID, songData,
      } = nextprops;
      if (songID === '') {
        if ("id" in songData) {
          this.setState({ songID: songData.id });
        }
      }
      else {
        this.setState({ songID });
      }
      const ptsearchterm = unescape(song) + " " + unescape(artist) + " rocksmith";
      const mvsearchterm = unescape(song) + " " + unescape(artist) + " music video";
      console.log("searching for ", ptsearchterm, mvsearchterm);
      this.getYoutubeResult(ptsearchterm, "div_playthrough");
      this.getYoutubeResult(mvsearchterm, "div_musicvideo");
      document.addEventListener("keydown", this.onKeyUp, false);
      await this.generateSetlistOptions();
    }
    return nextprops.showDetail;
  }

  componentDidUpdate = () => {
    if (this.modal_div) { this.modal_div.scrollTop = 0 }
  }

  onKeyUp = (event) => {
    if (event.keyCode === 27) {
      this.handleHide();
    }
  }

  getYoutubeResult = async (searchterm, divID) => {
    if (!window.keys.yt) {
      console.error("YOUTUBE_API_KEY not set!")
      return;
    }
    const url = 'https://www.googleapis.com/youtube/v3/search';
    const params = {
      part: 'snippet',
      key: window.keys.yt,
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
          this.chooseVideo(divID, 0);
        });
        break;
      case "div_musicvideo":
        this.setState({
          mvresults: entries.items,
        }, () => {
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
    document.removeEventListener("keydown", this.onKeyUp, false);
    this.choosePlay();
    this.props.close();
    enableScroll();
  }

  addToSetlist = async (addSongID = false) => {
    if (addSongID) {
      //console.log("Saving id to setlist", this.state.songID, this.state.currentSetlist);
      await saveSongByIDToSetlist(this.state.currentSetlist, this.state.songID);
    }
    else {
      //console.log("saving all arrangements to setlist", this.state.currentSetlist);
      const { song, artist } = this.props;

      await saveSongToSetlist(this.state.currentSetlist, unescape(song), unescape(artist));
    }
  }

  saveSetlist = (e) => {
    this.setState({ currentSetlist: e.target.value });
  }

  generateSetlistOptions = async () => {
    const showsastats = await getScoreAttackConfig();
    const songDetails = await getSongByID(this.state.songID);
    const isTrueSet = (songDetails.is_cdlc === 'true');
    const tags = await getAllTags(this.props.dlcappid)
    const ft = tags.map((x) => {
      const obj = {
        value: x.tag,
        label: x.tag,
      }
      return obj;
    });
    this.setState({
      showsastats,
      is_cdlc: isTrueSet,
      sa_fc_easy: songDetails.sa_fc_easy == null ? null : moment(songDetails.sa_fc_easy),
      sa_fc_medium: songDetails.sa_fc_medium == null ? null : moment(songDetails.sa_fc_medium),
      sa_fc_hard: songDetails.sa_fc_hard == null ? null : moment(songDetails.sa_fc_hard),
      sa_fc_master: songDetails.sa_fc_master == null ? null : moment(songDetails.sa_fc_master),
      tags: ft,
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
    await updateCDLCStat(this.state.songID, status);
    const songDetails = await getSongByID(this.state.songID);
    const isTrueSet = (songDetails.is_cdlc === 'true');
    this.setState({
      is_cdlc: isTrueSet,
    });
    this.props.refreshView();
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
    await updateSAFCStat(key, Date.parse(date.toDate()), this.state.songID);
    const songDetails = await getSongByID(this.state.songID);
    this.setState({
      sa_fc_easy: songDetails.sa_fc_easy == null ? null : moment(songDetails.sa_fc_easy),
      sa_fc_medium: songDetails.sa_fc_medium == null ? null : moment(songDetails.sa_fc_medium),
      sa_fc_hard: songDetails.sa_fc_hard == null ? null : moment(songDetails.sa_fc_hard),
      sa_fc_master: songDetails.sa_fc_master == null ? null : moment(songDetails.sa_fc_master),
    })
    this.props.refreshView();
  }

  showLocalNote = async () => {
    const notes = await getNotes(this.state.songID)
    const { value: text } = await Swal.fire({
      inputValue: notes.local_note ? unescape(notes.local_note) : "",
      input: 'textarea',
      inputPlaceholder: 'Type your note here...',
      showCancelButton: true,
      animation: false,
      confirmButtonClass: 'local-note-btn-class',
    })
    if (typeof text !== 'undefined' && this.state.songID.length > 0) {
      await updateNotes(this.state.songID, text);
      Swal.fire({
        text: 'Note Saved!',
        //animation: false,
        confirmButtonClass: 'local-note-btn-class',
      })
      await this.props.refreshView();
    }
  }

  handleTagsChange = async (newValue) => {
    //const tags = newValue.map(i => i.value);
    await executeRawSql(`delete from dlc_tags where appid='${this.props.dlcappid}'`)
    if (newValue) {
      for (let i = 0; i < newValue.length; i += 1) {
        //eslint-disable-next-line
        await addTag(this.props.dlcappid, newValue[i].value);
      }
      this.setState({ tags: newValue });
    }
    else {
      this.setState({ tags: [] })
    }
  }

  removeFromDB = async () => {
    await removeFromSongsOwned(this.state.songID);
    this.props.refreshView();
  }

  ignoreArrangement = async () => {
    await addToIgnoreArrangements(this.state.songID)
    this.props.refreshView();
  }

  render = () => {
    const cdlcyesstyle = this.state.is_cdlc ? "song-detail-option" : "song-detail-option-disabled";
    const cdlcnostyle = this.state.is_cdlc ? "song-detail-option-disabled" : "song-detail-option";
    const songliststyle = "extraPadding download " + (this.props.isSongview && !this.props.isDashboard ? "" : "hidden");
    const songliststylegeneric = ((this.props.isSetlist || this.props.isSongview) && !this.props.isDashboard) ? "" : "hidden";
    const ptstyle = "extraPadding download " + (!this.state.showPlaythrough ? "" : "isDisabled");
    const mvstyle = "extraPadding download " + (!this.state.showMusicVideo ? "" : "isDisabled");
    const ptdivstyle = this.state.showPlaythrough ? "dblock" : "hidden";
    const mvdivstyle = this.state.showMusicVideo ? "dblock" : "hidden";

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
          <a title="Close" className="modal-close" onClick={this.handleHide}><Trans i18nKey="close">Close</Trans></a>
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
            <button
              type="button"
              style={{ width: 17 + '%' }}
              onClick={this.choosePlay}
              className={ptstyle}>
              <Trans i18nKey="playthroughVideo">
                Playthrough Video
              </Trans>
            </button>
            {
              this.props.isWeekly ? ""
                : this.props.isSongpack
                  ? (
                    <button
                      style={{ width: 17 + '%' }}
                      type="button"
                      onClick={() => {
                        console.log(this.props.dlcappid);
                        window.shell.openExternal("steam://openurl/https://store.steampowered.com/app/" + this.props.dlcappid);
                      }}
                      className={mvstyle}>
                      <Trans i18nKey="buyFromSteam">
                        Buy From Steam
                      </Trans>
                    </button>
                  )
                  : (
                    <span>
                      <button
                        type="button"
                        style={{ width: 17 + '%' }}
                        onClick={this.chooseMV}
                        className={mvstyle}>
                        <Trans i18nKey="musicVideo">
                          Music Video
                        </Trans>
                      </button>
                    </span>
                  )
            }
          </div>
          <div className={songliststylegeneric}>
            <br />
            <Collapsible
              trigger={expandButton(this.props.t('More Options'), 6)}
              triggerWhenOpen={collapseButton(this.props.t('More Options'), 6)}
              transitionTime={200}
              easing="ease-in"
              close
            >
              <div className="options-flex">
                <div style={{ flexBasis: 100 + '%' }} className="options-flex-div">
                  <div style={{ float: 'left' }}>SongID</div>
                  <div style={{ float: 'right' }}>
                    <span
                      className="song-detail-option"
                      style={{ userSelect: 'text' }}>
                      {this.state.songID}
                    </span>
                  </div>
                </div>
              </div>
              <div className="options-flex" style={{ marginTop: 6 + 'px' }}>
                <div style={{ flexBasis: 100 + '%' }} className="options-flex-div">
                  <div style={{ float: 'left' }}><Trans i18nKey="customdlc">Custom DLC</Trans></div>
                  <div style={{ float: 'right' }}>
                    <span
                      className={cdlcyesstyle}>
                      <a
                        type="button"
                        href="#"
                        onClick={() => this.updateCDLCStatus(true)}>
                        <Trans i18nKey="yes">Yes</Trans>
                      </a>
                    </span>
                    <span>&nbsp;&nbsp;</span>
                    <span
                      className={cdlcnostyle}>
                      <a
                        type="button"
                        href="#"
                        onClick={() => this.updateCDLCStatus(false)}>
                        <Trans i18nKey="no">No</Trans>
                      </a>
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 6 + 'px' }}>
                {
                  this.state.showsastats
                    ? <div style={{ float: 'left' }}><Trans i18nKey="scoreAttack">Score Attack</Trans> FCs</div>
                    : ""
                }
                <div className="options-flex-right" style={{ textAlign: 'right' }}>
                  {
                    this.state.showsastats
                      ? (
                        <div className="options-flex-div">
                          <span><Trans i18nKey="master">Master</Trans></span>
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
                          <span><Trans i18nKey="hard">Hard</Trans></span>
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
                          <span><Trans i18nKey="medium">Medium</Trans></span>
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
                          <span><Trans i18nKey="easy">Easy</Trans></span>
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
              <div className="options-flex-center" style={{ height: 70 + 'px' }}>
                <div style={{ marginRight: 30 + 'px' }} className="options-flex-div">
                  <button
                    type="button"
                    style={{ width: 100 + '%' }}
                    className={songliststyle}
                    onClick={() => {
                      this.showLocalNote();
                    }}>
                    <span><Trans i18nKey="addNote">Add Note</Trans></span>
                  </button>
                </div>
                <div style={{ marginRight: 30 + 'px' }} className="options-flex-div">
                  <button
                    type="button"
                    style={{ width: 100 + '%' }}
                    className={songliststyle}
                    onClick={async () => {
                      await this.removeFromDB();
                      this.handleHide();
                    }}>
                    <span><Trans i18nKey="deleteSongFromDB">Delete Song from DB</Trans></span>
                  </button>
                </div>
                <div style={{}} className="options-flex-div">
                  <button
                    type="button"
                    style={{ width: 100 + '%' }}
                    className={songliststyle}
                    onClick={async () => {
                      await this.removeFromDB();
                      await this.ignoreArrangement();
                      this.handleHide();
                    }}>
                    <span><Trans i18nKey="deleteNeverImport">Delete and Never Import</Trans></span>
                  </button>
                </div>
              </div>
            </Collapsible>
          </div>
          {
            this.props.isSongpack
              ? (
                <AsyncSelect
                  value={this.state.tags}
                  styles={customStyles}
                  isMulti
                  placeholder="Genres..."
                  isSearchable={false}
                  isClearable={false}
                  cacheOptions
                  defaultOptions
                  loadOptions={tagOptions}
                  onChange={this.handleTagsChange}
                />
              ) : null
          }
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
  //eslint-disable-next-line
  songData: PropTypes.object,
  close: PropTypes.func,
  isSongview: PropTypes.bool,
  isSetlist: PropTypes.bool,
  isSongpack: PropTypes.bool,
  isDashboard: PropTypes.bool,
  isWeekly: PropTypes.bool,
  dlcappid: PropTypes.string,
  //eslint-disable-next-line
  songID: PropTypes.string,
  refreshView: PropTypes.func,
}
SongDetailView.defaultProps = {
  showDetail: false,
  song: '',
  artist: '',
  album: '',
  songData: {},
  isSetlist: true,
  isDashboard: false,
  isSongview: false,
  isSongpack: false,
  isWeekly: false,
  dlcappid: '',
  close: () => { },
  songID: '',
  refreshView: () => { },
}

export default withI18n('translation')(SongDetailView)
