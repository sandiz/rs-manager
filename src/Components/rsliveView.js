import React from 'react'
import PropTypes from 'prop-types';
import AnimatedNumber from 'react-animated-number';
import {
  RemoteAll,
  unescapeFormatter, difficultyFormatter, difficultyClass, round100Formatter,
  countFormmatter, badgeFormatter, arrangmentFormatter, tuningFormatter,
} from './songlistView';
import SongDetailView from './songdetailView';
import ChartView from './chartView';
import { getSongBySongKey, initSongsOwnedDB, updateMasteryandPlayed } from '../sqliteService'
import readProfile from '../steamprofileService';
import getProfileConfig from '../configService';

const albumArt = require('./../lib/album-art');

export function pad2(number) {
  return (number < 10 ? '0' : '') + number
}
export function getMinutesSecs(time) {
  const minutes = Math.floor(time / 60);
  const seconds = pad2(Math.round(time - (minutes * 60)));
  return ({ minutes, seconds });
}
export default class RSLiveView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      artist: '',
      song: 'No Song Selected',
      album: '',
      albumArt: '',
      timeTotal: 0,
      timeCurrent: 0,
      tracking: false,
      songKey: '',
      accuracy: 0,
      currentStreak: 0,
      highestStreak: 0,
      totalNotes: 0,
      notesHit: 0,
      notesMissed: 0,
      /* table state vars */
      songs: [],
      page: 1,
      totalSize: 0,
      sizePerPage: 100,
      showDetail: false,
      showSong: '',
      showArtist: '',
      showSAStats: true,
      /* end table */
      startTrack: false,
      stopTrack: false,
    }
    this.tabname = 'tab-rslive';
    this.columns = [
      {
        dataField: "id",
        text: "ID",
        style: (cell, row, rowIndex, colIndex) => {
          return {
            width: '20%',
            cursor: 'pointer',
          };
        },
        hidden: true,
      },
      {
        dataField: "song",
        text: "Song",
        style: (cell, row, rowIndex, colIndex) => {
          return {
            width: '20%',
            cursor: 'pointer',
          };
        },
        sort: true,
        formatter: unescapeFormatter,
      },
      {
        dataField: "artist",
        text: "Artist",
        style: (cell, row, rowIndex, colIndex) => {
          return {
            width: '19%',
            cursor: 'pointer',
          };
        },
        sort: true,
        formatter: unescapeFormatter,
      },
      {
        dataField: "album",
        text: "Album",
        style: (cell, row, rowIndex, colIndex) => {
          return {
            width: '20%',
            cursor: 'pointer',
          };
        },
        sort: true,
        formatter: unescapeFormatter,
      },
      {
        dataField: "json",
        text: 'JSON',
        hidden: true,
      },
      {
        dataField: "arrangement",
        text: "Arrangement",
        style: (cell, row, rowIndex, colIndex) => {
          return {
            width: '5%',
            cursor: 'pointer',
          };
        },
        sort: true,
        formatter: arrangmentFormatter,
      },
      {
        dataField: "mastery",
        text: "Current Mastery",
        style: (cell, row, rowIndex, colIndex) => {
          return {
            width: '15%',
            cursor: 'pointer',
          };
        },
        sort: true,
        formatter: round100Formatter,
      },
      {
        dataField: "tuning",
        text: "Tuning",
        style: (cell, row, rowIndex, colIndex) => {
          return {
            width: '5%',
            cursor: 'pointer',
          };
        },
        sort: true,
        formatter: tuningFormatter,
      },
      {
        dataField: "count",
        text: "Count",
        style: (cell, row, rowIndex, colIndex) => {
          return {
            width: '5%',
          };
        },
        sort: true,
        formatter: countFormmatter,
      },
      {
        classes: difficultyClass,
        dataField: "difficulty",
        text: "Difficulty",
        style: (cell, row, rowIndex, colIndex) => {
          return {
            width: '5%',
          };
        },
        sort: true,
        formatter: difficultyFormatter,
      },
      {
        dataField: "sa_playcount",
        text: 'Play Count',
        hidden: true,
      },
      {
        dataField: "sa_hs_easy",
        text: 'High Score (Easy)',
        hidden: true,
      },
      {
        dataField: "sa_hs_medium",
        text: 'High Score (Medium)',
        hidden: true,
      },
      {
        dataField: "sa_hs_hard",
        text: 'High Score (Hard)',
        hidden: true,
      },
      {
        dataField: "sa_hs_master",
        text: 'High Score (Master)',
        hidden: true,
      },
      {
        dataField: "sa_badge_master",
        text: 'Badge (Master)',
        hidden: true,
      },
      {
        dataField: "sa_highest_badge",
        text: 'Badges',
        sort: true,
        style: (cell, row, rowIndex, colIndex) => {
          return {
            width: '20%',
            display: this.state.showSAStats ? "" : "none",
          };
        },
        headerStyle: (cell, row, rowIndex, colIndex) => {
          return {
            width: '20%',
            display: this.state.showSAStats ? "" : "none",
          };
        },
        formatter: badgeFormatter,
      },
      {
        dataField: "arrangementProperties",
        text: 'ArrProp',
        hidden: true,
      },
      {
        dataField: "tuning",
        text: 'Tuning',
        hidden: true,
      },
      {
        dataField: "capofret",
        text: 'Capo',
        hidden: true,
      },
      {
        dataField: "centoffset",
        text: 'Cent',
        hidden: true,
      },
    ];
    this.rowEvents = {
      onClick: (e, row, rowIndex) => {
        this.setState({
          showDetail: true,
          showSong: row.song,
          showArtist: row.artist,
          showAlbum: row.album,
        })
      },
    };
    this.fetchrstimer = null;
    this.lastalbumname = "";
    this.lastsongkey = "";
    this.lastsongdetail = null;
    this.songkeyresults = null;
    this.albumarturl = "";
  }

  componentDidMount = async () => {
    /*const songData = {
      success: true,
      currentState: 4,
      memoryReadout: {
        songTimer: 25.091,
        songID: "JoniBigY",
        totalNotesHit: 0,
        currentHitStreak: 0,
        highestHitStreak: 0,
        totalNotesMissed: 25,
        currentMissStreak: 25,
        mode: 1,
        TotalNotes: 25,
      },
      songDetails: {
        songID: "JoniBigY",
        songName: "Big Yellow Taxi",
        artistName: "Joni Mitchell",
        albumName: "Ladies of the Canyon",
        songLength: 146.703,
        albumYear: 1970,
        numArrangements: 4,
      },
    };*/
  }

  componentWillUnmount = async () => {
    this.stopTracking(false);
  }

  animatedNumber = (number) => {
    return (
      <AnimatedNumber
        component="span"
        value={number}
        style={{
          transition: '1s ease-out',
          transitionProperty:
            'background-color, color, opacity',
        }}
        duration={300}
        stepPrecision={0}
      />
    );
  }

  parseSongResults = async (songData) => {
    const { songDetails, memoryReadout } = songData;
    const tnh = memoryReadout ? memoryReadout.totalNotesHit : 0;
    const tnm = memoryReadout ? memoryReadout.totalNotesMissed : 0;
    let accuracy = tnh / (tnh + tnm);
    accuracy *= 100;

    if (Number.isNaN(accuracy)) {
      accuracy = 0;
    }
    if (songDetails) {
      this.lastsongdetail = songDetails;
    }
    const notesHit = memoryReadout ? memoryReadout.totalNotesHit : 0;
    const notesMissed = memoryReadout ? memoryReadout.totalNotesMissed : 0;
    const highestStreak = memoryReadout ? memoryReadout.highestHitStreak : 0;
    if (memoryReadout
      && memoryReadout.songID.length > 0
      && memoryReadout.songID !== this.state.songKey) {
      const skr = await getSongBySongKey(memoryReadout.songID);
      if (skr.length > 0) this.songkeyresults = skr[0];
    }
    const song = songDetails ? songDetails.songName : (this.songkeyresults ? unescape(this.songkeyresults.song) : "");
    const artist = songDetails ? songDetails.artistName : (this.songkeyresults ? unescape(this.songkeyresults.artist) : "");
    const album = songDetails ? songDetails.albumName : (this.songkeyresults ? unescape(this.songkeyresults.album) : "");
    const timeTotal = songDetails
      ? songDetails.songLength : (this.songkeyresults ? this.songkeyresults.songLength : 0);
    if (song !== "" && artist !== "") {
      try {
        this.albumarturl = await albumArt(
          unescape(artist),
          { album: unescape(album), size: 'large' },
        );
        this.lastalbumname = unescape(album)
      }
      catch (e) {
        console.log(e);
      }
    }

    this.setState({
      accuracy,
      song,
      artist,
      album,
      timeTotal,
      totalNotes: memoryReadout && this.songkeyresults ? this.songkeyresults.maxNotes : 0,
      timeCurrent: memoryReadout ? memoryReadout.songTimer : 0,
      songKey: memoryReadout ? memoryReadout.songID : "",
      currentStreak: memoryReadout ? memoryReadout.currentHitStreak : 0,
      highestStreak,
      notesHit,
      notesMissed,
      albumArt: this.albumarturl,
    }, () => {
      if (memoryReadout && this.lastsongkey !== memoryReadout.songID) {
        this.refreshTable();
        this.lastsongkey = memoryReadout.songID;
      }
    });
  }

  refreshTable = async () => {
    this.handleTableChange("cdm", {
      page: this.state.page,
      sizePerPage: this.state.sizePerPage,
      filters: {},
    })
  }

  checkForMono = () => {
    if (window.electronFS.existsSync("/Library/Frameworks/Mono.framework/Commands/mono")) {
      return true;
    }
    return false;
  }

  startTracking = async () => {
    this.setState({ startTrack: true, stopTrack: false })
    console.log("start tracking");
    const killcmd = await this.killPIDs(await this.findPID());
    console.log("kill command: " + killcmd);
    // spawn process
    let cwd = ""
    if (window.os.platform() === "win32") {
      cwd = window.dirname + "\\tools\\RockSniffer\\";
      this.rssniffer = `${killcmd} && cd ${cwd} && RockSniffer.exe`;
      window.process.chdir(cwd);
      console.log(this.rssniffer);
      const options = { name: 'RockSniffer', cwd };
      window.exec(
        this.rssniffer,
        options,
        (error, stdout, stderr) => {
          if (error) { console.log("start-track-stderr: " + error) }
          if (stdout) { console.log('start-track-stdout: ' + stdout); }
        },
      );
    }
    else {
      if (!this.checkForMono()) {
        this.props.updateHeader(
          this.tabname,
          `Mono not found in /Library/Frameworks`,
        );
        return;
      }
      cwd = window.dirname + "/tools/RockSniffer/"
      this.rssniffer = `bash -c "${killcmd}; cd '${cwd}'; /Library/Frameworks/Mono.framework/Commands/mono RockSniffer.exe"`
      window.process.chdir(cwd);
      console.log(this.rssniffer);
      const options = { name: 'RockSniffer', cwd };
      window.sudo.exec(
        this.rssniffer,
        options,
        (error, stdout, stderr) => {
          if (error) { console.log("start-track-stderr: " + error) }
          if (stdout) { console.log('start-track-stdout: ' + stdout); }
        },
      );
    }
    this.setState({ tracking: true });
    this.props.updateHeader(
      this.tabname,
      `Tracking: Active`,
    );
    this.fetchRSSniffer();
  }

  fetchRSSniffer = async () => {
    this.fetchrstimer = setInterval(async () => {
      try {
        const songData = await window.fetch("http://127.0.0.1:9938");
        if (!songData) return;
        if (typeof songData === 'undefined') { return; }
        const jsonObj = await songData.json();
        await this.parseSongResults(jsonObj);
      }
      catch (e) {
        console.log(e);
      }
    }, 1000);
  }

  findPID = async () => {
    const pids = await window.findProcess("name", "RockSniffer.exe");
    console.log(pids);
    return pids;
  }

  killPIDs = async (pids) => {
    const pidarr = []
    for (let i = 0; i < pids.length; i += 1) {
      pidarr.push(pids[i].pid);
    }
    if (pidarr.length > 0) {
      if (window.os.platform() === "win32") {
        let taskcmd = "taskkill /f ";
        for (let i = 0; i < pidarr.length; i += 1) {
          taskcmd += "/pid " + pidarr[i] + " ";
        }
        return taskcmd;
      }
      return "kill -9 " + pidarr.join(" ");
    }
    return "echo 'no pids'"
  }

  stopTracking = async (reset = true) => {
    this.setState({ startTrack: false, stopTrack: true })
    if (this.fetchrstimer) clearInterval(this.fetchrstimer);
    console.log("stop tracking");
    const killcmd = await this.killPIDs(await this.findPID());
    console.log("kill command: " + killcmd);
    if (killcmd.includes("no pids")) {
      return;
    }
    this.rskiller = killcmd;
    const options = { name: 'Kill RockSniffer' };
    const exec = window.os.platform() === "win32" ? window.exec : window.sudo.exec;
    exec(
      this.rskiller,
      options,
      (error, stdout, stderr) => {
        if (error) { console.log("stop-track-stderr: " + error) }
        if (stdout) { console.log('stoptrackstdout: ' + stdout) }
      },
    );
    window.process.chdir(window.dirname);
    //reset all values
    if (reset) {
      const artist = '';
      const song = "No Song Selected";
      const album = "";
      const aart = "";
      const timeTotal = 0;
      const timeCurrent = 0;
      this.setState({
        tracking: false,
        song,
        artist,
        album,
        albumArt: aart,
        timeCurrent,
        timeTotal,
        songKey: '',
        accuracy: 0,
        currentStreak: 0,
        highestStreak: 0,
        totalNotes: 0,
        notesHit: 0,
        notesMissed: 0,
      });
      this.lastalbumname = "";
      this.lastsongkey = "";
      this.lastsongdetail = null;
      this.songkeyresults = null;
      this.albumarturl = "";
      this.refreshTable();
    }
    this.props.resetHeader(this.tabname);
  }

  updateMastery = async () => {
    const prfldb = await getProfileConfig();
    if (prfldb === '' || prfldb === null) {
      this.props.updateHeader(
        this.tabname,
        `No Profile found, please update it in Settings!`,
      );
      return;
    }
    if (this.state.songKey.length <= 0) { return }

    if (prfldb.length > 0) {
      this.props.updateHeader(
        this.tabname,
        `Decrypting ${window.path.basename(prfldb)}`,
      );
      const steamProfile = await readProfile(prfldb);
      const stats = steamProfile.Stats.Songs;
      const sastats = steamProfile.SongsSA;
      await initSongsOwnedDB();
      const output = await getSongBySongKey(this.state.songKey);
      if (output.length === 0) { return; }
      let keys = Object.keys(stats);
      let updatedRows = 0;
      const ids = []
      output.forEach((element) => {
        ids.push(element.id);
      });
      //find mastery stats
      for (let i = 0; i < keys.length; i += 1) {
        if (!ids.includes(keys[i])) { continue; }
        const stat = stats[keys[i]];
        const mastery = stat.MasteryPeak;
        const played = stat.PlayedCount;
        this.props.updateHeader(
          this.tabname,
          `Updating Stat for SongID:  ${keys[i]} (${i}/${keys.length})`,
        );
        /*loop await */ // eslint-disable-next-line
        const rows = await updateMasteryandPlayed(keys[i], mastery, played);
        if (rows === 0) {
          console.log("Missing ID: " + keys[i]);
        }
        updatedRows += rows;
      }
      //find score attack stats
      keys = Object.keys(sastats);
      for (let i = 0; i < keys.length; i += 1) {
        if (!ids.includes(keys[i])) { continue; }
        const stat = sastats[keys[i]];
        let highestBadge = 0;
        if (stat.Badges.Easy > 0) {
          stat.Badges.Easy += 10;
          highestBadge = stat.Badges.Easy;
        }
        if (stat.Badges.Medium > 0) {
          stat.Badges.Medium += 20;
          highestBadge = stat.Badges.Medium;
        }
        if (stat.Badges.Hard > 0) {
          stat.Badges.Hard += 30;
          highestBadge = stat.Badges.Hard;
        }
        if (stat.Badges.Master > 0) {
          stat.Badges.Master += 40;
          highestBadge = stat.Badges.Master;
        }
        this.props.updateHeader(
          this.tabname,
          `Updating Stat for SongID:  ${keys[i]} (${i}/${keys.length})`,
        );
        /* loop await */ // eslint-disable-next-line
        const rows = await updateScoreAttackStats(stat, highestBadge, keys[i]);
        if (rows === 0) {
          console.log("Missing ID: " + keys[i]);
        }
        updatedRows += rows;
      }

      this.props.updateHeader(
        this.tabname,
        `Stats maching songkey (${this.state.songKey}): ` + updatedRows,
      );
      if (this.state.tracking) {
        setTimeout(() => {
          this.props.updateHeader(
            this.tabname,
            "Tracking: Active",
          );
        }, 5000);
      }

      // refresh view
      this.refreshTable();
    }
  }

  handleTableChange = async (type, {
    page,
    sizePerPage,
    sortField, //newest sort field
    sortOrder, // newest sort order
    filters, // an object which have current filter status per column
    data,
  }) => {
    const zeroIndexPage = page - 1
    const start = zeroIndexPage * sizePerPage;
    const output = await getSongBySongKey(
      this.state.songKey,
      start,
      sizePerPage,
      sortField,
      sortOrder,
      "",
      "",
    )
    if (output.length > 0) {
      this.setState({ songs: output, page, totalSize: output[0].acount });
    }
    else {
      this.setState({ songs: output, page, totalSize: 0 });
    }
  }

  render = () => {
    let { minutes, seconds } = getMinutesSecs(this.state.timeCurrent);
    const timeCurrent = `${minutes}:${seconds}`;
    ({ minutes, seconds } = getMinutesSecs(this.state.timeTotal));
    const timeTotal = `${minutes}:${seconds}`;
    let progress = (this.state.timeCurrent / this.state.timeTotal) * 100;
    if (Number.isNaN(progress)) {
      progress = 0;
    }
    const albumartstyle = this.state.albumArt.length > 0 ? "" : "hidden";
    const song = this.state.song.length > 0
      ? (this.state.song.length > 35
        ? this.state.song.substring(0, 35) + "..." : this.state.song)
      : "N/A";
    const artist = this.state.artist.length > 0
      ? (this.state.artist.length > 35
        ? this.state.artist.substring(0, 35) + "..." : this.state.artist)
      : "N/A";
    const album = this.state.album.length > 0
      ? (this.state.album.length > 35
        ? this.state.album.substring(0, 35) + "..." : this.state.album)
      : "N/A";
    const buttonclass = "extraPadding download smallbutton ";//+ (this.state.win32 ? "" : "isDisabled");
    return (
      <div className="container-fluid">
        <div className="ta-center">
          <a
            onClick={() => {
              window.shell.openExternal("steam://run/221680");
            }}
            className="extraPadding download smallbutton">
            steam://run/rocksmith
          </a>
          {
            this.state.tracking
              ? (
                <a
                  onClick={this.stopTracking}
                  className={buttonclass}>
                  Stop Tracking
                </a>
              )
              : (
                <a
                  onClick={this.startTracking}
                  className={buttonclass}>
                  Start Tracking
                </a>
              )
          }
          <a
            onClick={this.updateMastery}
            className={buttonclass}>
            Update Mastery
          </a>
        </div>
        <br />
        <div className="row justify-content-md-center" style={{ marginTop: -30 + 'px' }}>
          <div className="col col-md-3 ta-center dashboard-top dashboard-rslive-song-details">
            <div>
              Live Stats
              <hr />
            </div>
            <div>
              <div className="flex-container">
                <div className="flex-div">
                  <div>
                    Accuracy
                    <hr style={{ width: 65 + '%' }} />
                    <div style={{ fontSize: 35 + 'px', marginTop: -10 + 'px' }}>
                      <AnimatedNumber
                        component="span"
                        value={this.state.accuracy}
                        style={{
                          transition: '1s ease-out',
                          transitionProperty:
                            'background-color, color, opacity',
                        }}
                        duration={300}
                        stepPrecision={2}
                        formatValue={n => n.toFixed(2)}
                      />%
                    </div>
                  </div>
                </div>
                <div className="flex-div">
                  <div>
                    Current Streak
                    <hr style={{ width: 65 + '%' }} />
                    <div style={{ fontSize: 35 + 'px', marginTop: -10 + 'px' }}>
                      {this.animatedNumber(this.state.currentStreak)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-container" style={{ marginTop: 10 + 'px' }}>
                <div className="flex-div">
                  Total Notes
                  <hr />
                  <div style={{ marginTop: -10 + 'px' }}>
                    {this.state.totalNotes}
                  </div>
                </div>
                <div className="flex-div">
                  Notes Hit
                  <hr />
                  <div style={{ marginTop: -10 + 'px' }}>
                    {this.animatedNumber(this.state.notesHit)}
                  </div>
                </div>
                <div className="flex-div">
                  Notes Missed
                  <hr />
                  <div style={{ marginTop: -10 + 'px' }}>
                    {this.animatedNumber(this.state.notesMissed)}
                  </div>
                </div>
                <div className="flex-div">
                  Highest Streak
                  <hr />
                  <div style={{ marginTop: -10 + 'px' }}>
                    {this.animatedNumber(this.state.highestStreak)}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col col-lg-5 ta-center dashboard-top dashboard-rslive-song-details">
            <div>
              Current Song
              <hr />
            </div>
            <span style={{ float: 'right' }} id="albumart" className={albumartstyle}>
              <img
                src={this.state.albumArt}
                alt="album art"
              />
            </span>
            <div style={{ marginTop: -6 + 'px', textAlign: 'left', marginLeft: 2 + 'px' }}>
              <span style={{ fontSize: 26 + 'px' }}>
                {song}
              </span>
              <br />
              <div style={{ marginTop: 19 + 'px' }}>
                <span style={{ fontSize: 22 + 'px' }}>
                  {artist}
                </span>
                <br />
                <span style={{ fontSize: 22 + 'px' }}>
                  {album}
                </span>
              </div>
              <br />
              <div style={{
                textAlign: 'center',
                marginTop: -30 + 'px',
                marginBottom: 11 + 'px',
                fontSize: 16 + 'px',
              }}>
                {timeCurrent} / {timeTotal}
              </div>
              <span>
                <svg
                  id="song_time"
                  style={{
                    height: 30 + 'px',
                    marginTop: -12 + 'px',
                    width: 100 + '%',
                  }}>
                  <g className="bars">
                    <rect className="bg" fill="#ccc" width="100%" height="25" rx="5" yx="5" />
                    <rect className="data" width={progress + "%"} height="25" rx="5" yx="5" />
                  </g>
                </svg>
              </span>
            </div>
          </div>
        </div>
        <div id="chart" className="hidden">
          <ChartView
            timeTotal={this.state.timeTotal}
            startTrack={this.state.startTrack}
            stopTrack={this.state.stopTrack}
          />
        </div>
        <div>
          <RemoteAll
            keyField="id"
            data={this.state.songs}
            page={this.state.page}
            sizePerPage={this.state.sizePerPage}
            totalSize={this.state.totalSize}
            onTableChange={this.handleTableChange}
            columns={this.columns}
            rowEvents={this.rowEvents}
            paginate={false}
          />
        </div>
        <div>
          <SongDetailView
            song={this.state.showSong}
            artist={this.state.showArtist}
            album={this.state.showAlbum}
            showDetail={this.state.showDetail}
            close={() => this.setState({ showDetail: false })}
            isSetlist
            removeFromSetlist={this.removeFromSetlist}
          />
        </div>
      </div>
    );
  }
}
RSLiveView.propTypes = {
  //currentTab: PropTypes.object,
  updateHeader: PropTypes.func,
  resetHeader: PropTypes.func,
}
RSLiveView.defaultProps = {
  //currentTab: null,
  updateHeader: () => { },
  resetHeader: () => { },
}
