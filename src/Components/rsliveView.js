import React from 'react'
import PropTypes from 'prop-types';
import {
  RemoteAll,
  unescapeFormatter, difficultyFormatter, difficultyClass, round100Formatter,
  countFormmatter, badgeFormatter, arrangmentFormatter, tuningFormatter,
} from './songlistView';
import SongDetailView from './songdetailView';
import ChartView from './chartView';
import { getSongBySongKey } from '../sqliteService'

const albumArt = require('album-art');

export function pad2(number) {
  return (number < 10 ? '0' : '') + number
}
export function getMinutesSecs(time) {
  const minutes = Math.floor(time / 60);
  const seconds = pad2(time - (minutes * 60));
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
        text: "Last Updated Mastery",
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
  }
  componentDidMount = async () => {
    const artist = "The Killers";
    const song = "Mr. Brightside"
    const album = "Hot Fuss";
    const timeTotal = 120;
    const timeCurrent = 0;
    const songKey = "MrBrightside";
    this.setState({
      artist, song, album, timeTotal, timeCurrent, songKey,
    });
    const url = await albumArt(artist, { album, size: 'large' })
    this.setState({ albumArt: url })
    this.refreshTable();
  }
  componentWillUnmount = async () => {
    this.stopTracking(false);
  }
  refreshTable = async () => {
    this.handleTableChange("cdm", {
      page: this.state.page,
      sizePerPage: this.state.sizePerPage,
      filters: {},
    })
  }
  startTracking = async () => {
    console.log("start tracking");
    const killcmd = await this.killPIDs(await this.findPID());
    console.log("kill command: " + killcmd);
    // spawn process
    const cwd = window.dirname + "/tools/RockSniffer/"
    window.process.chdir(cwd);
    this.rssniffer = `bash -c "${killcmd}; cd ${cwd}; mono RockSniffer.exe"`
    const options = { name: 'RockSniffer', cwd };
    window.sudo.exec(
      this.rssniffer,
      options,
      (error, stdout, stderr) => {
        if (error) { console.log("start-track-stderr: " + error) }
        if (stdout) { console.log('start-track-stdout: ' + stdout); }
      },
    );
    this.setState({ tracking: true });
    this.props.updateHeader(
      this.tabname,
      `Tracking: Active`,
    );
  }
  findPID = async () => {
    const pids = await window.findProcess("name", "RockSniffer.exe");
    return pids;
  }
  killPIDs = async (pids) => {
    const pidarr = []
    for (let i = 0; i < pids.length; i += 1) {
      pidarr.push(pids[i].pid);
    }
    if (pidarr.length > 0) {
      return "kill -9 " + pidarr.join(" ");
    }
    return "echo 'no pids'"
  }
  stopTracking = async (reset = true) => {
    console.log("stop tracking");
    const killcmd = await this.killPIDs(await this.findPID());
    console.log("kill command: " + killcmd);
    if (killcmd.includes("no pids")) {
      return;
    }
    this.rskiller = killcmd;
    const options = { name: 'Kill RockSniffer' };
    window.sudo.exec(
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
        tracking: false, song, artist, album, albumArt: aart, timeCurrent, timeTotal, songKey: '',
      });
      this.refreshTable();
    }
    this.props.resetHeader(this.tabname);
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
    //eslint-disable-next-line
    if (isNaN(progress)) {
      progress = 0;
    }
    const albumartstyle = this.state.albumArt.length > 0 ? "" : "hidden";
    return (
      <div className="container-fluid">
        <div className="ta-center">
          {
            this.state.tracking ?
              <a
                onClick={this.stopTracking}
                className="extraPadding download">
                Stop Tracking
              </a>
              :
              <a
                onClick={this.startTracking}
                className="extraPadding download">
                Start Tracking
              </a>
          }
        </div>
        <br />
        <div className="row justify-content-md-center" style={{ marginTop: -30 + 'px' }}>
          <div className="col col-lg-auto ta-center dashboard-top dashboard-rslive-song-details">
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
                {this.state.song.length > 0 ? this.state.song : "N/A"}
              </span>
              <br />
              <div style={{ marginTop: 19 + 'px' }}>
                <span style={{ fontSize: 22 + 'px' }}>
                  {this.state.artist.length > 0 ? this.state.artist : "N/A"}
                </span>
                <br />
                <span style={{ fontSize: 22 + 'px' }}>
                  {this.state.album.length > 0 ? this.state.album : "N/A"}
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
        <div id="chart">
          <ChartView timeTotal={this.state.timeTotal} />
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
  //eslint-disable-next-line
  currentTab: PropTypes.object,
  updateHeader: PropTypes.func,
  resetHeader: PropTypes.func,
}
RSLiveView.defaultProps = {
  currentTab: null,
  updateHeader: () => { },
  resetHeader: () => { },
}
