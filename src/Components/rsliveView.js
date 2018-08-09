import React from 'react'
import PropTypes from 'prop-types';

//const albumArt = require('album-art');

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
    }
    this.tabname = 'tab-rslive';
  }
  componentDidMount = async () => {
    /*
    const artist = "The Killers";
    const song = "Mr. Brightside"
    const album = "Hot Fuss";
    const timeTotal = 500;
    const timeCurrent = 120;
    this.setState({
      artist, song, album, timeTotal, timeCurrent,
    });
    const url = await albumArt(artist, { album, size: 'large' })
    this.setState({ albumArt: url });
    */
  }
  componentWillUnmount = async () => {
    this.stopTracking(false);
  }
  getMinutesSecs = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = this.pad2(time - (minutes * 60));
    return ({ minutes, seconds });
  }
  pad2 = (number) => {
    return (number < 10 ? '0' : '') + number
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
        tracking: false, song, artist, album, albumArt: aart, timeCurrent, timeTotal,
      });
    }
    this.props.resetHeader(this.tabname);
  }
  render = () => {
    let { minutes, seconds } = this.getMinutesSecs(this.state.timeCurrent);
    const timeCurrent = `${minutes}:${seconds}`;
    ({ minutes, seconds } = this.getMinutesSecs(this.state.timeTotal));
    const timeTotal = `${minutes}:${seconds}`;
    let progress = Math.round(this.state.timeCurrent / this.state.timeTotal) * 100;
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
