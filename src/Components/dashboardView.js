import React from 'react'
import PropTypes from 'prop-types';
import StatsTableView from './statsTableView';
import getProfileConfig, { updateProfileConfig, getScoreAttackConfig, getUseCDLCConfig, getScoreAttackDashboardConfig } from '../configService';
import readProfile from '../steamprofileService';
import { updateMasteryandPlayed, initSongsOwnedDB, getSongByID, countSongsOwned, getArrangmentsMastered, getLeadStats, getRhythmStats, getBassStats, getRandomSongOwned, getRandomSongAvailable, getSAStats, updateScoreAttackStats } from '../sqliteService';
import { replaceRocksmithTerms } from './songavailableView';
import SongDetailView from './songdetailView';

const { path } = window;

export default class DashboardView extends React.Component {
  constructor(props) {
    super(props);
    this.tabname = 'tab-dashboard';
    this.state = {
      scoreAttackDashboard: [false, false, false, false],
      scdTrueLength: 0,
      showweekly: false,
      weeklysongspotlight: { title: '', url: '' },
      randompackappid: '',
      showsongpackpreview: false,
      showsongpreview: false,
      randomartist: '',
      randomarr: '',
      randommastery: 0,
      randomsong: '',
      randomalbum: '',
      randompack: '',
      totalPlayingTime: 0,
      maxConsecutiveDays: 0,
      longestStreak: 0,
      highestSolo: 0,
      songsOwned: 0,
      songPlays: 0,
      mostPlayed: '-',
      arrMaster: 0,
      showsastats: true,

      lead: [0, 0, 0, 0, 0],
      leadwidth: [0, 0, 0, 0, 0],
      rhythm: [0, 0, 0, 0, 0],
      rhythmwidth: [0, 0, 0, 0, 0],
      bass: [0, 0, 0, 0, 0],
      basswidth: [0, 0, 0, 0, 0],

      sahard: [0, 0, 0, 0, 0, 0, 0],
      sahardwidth: [0, 0, 0, 0, 0, 0, 0],
      samaster: [0, 0, 0, 0, 0, 0, 0],
      samasterwidth: [0, 0, 0, 0, 0, 0, 0],
      samedium: [0, 0, 0, 0, 0, 0, 0],
      samediumwidth: [0, 0, 0, 0, 0, 0, 0],
      saeasy: [0, 0, 0, 0, 0, 0, 0],
      saeasywidth: [0, 0, 0, 0, 0, 0, 0],
    }
  }
  componentWillMount = async () => {
    await initSongsOwnedDB();
    this.fetchStats();
    this.fetchRandomStats();
    this.fetchWeeklySpotlight();
  }
  getStatsWidth = (input, min, max) => {
    const w = ((input - min) * 100) / (max - min);
    if (Number.isNaN(w)) { return 0; }
    return w;
  }
  convertMS = (ms) => {
    let s = Math.floor(ms / 1000);
    let m = Math.floor(s / 60);
    s %= 60;
    let h = Math.floor(m / 60);
    m %= 60;
    const d = Math.floor(h / 24);
    h %= 24;
    return {
      d, h, m, s,
    };
  };
  fetchStats = async (disbleDialog) => {
    const prfldb = await getProfileConfig();
    const showsastats = await getScoreAttackConfig();
    const scoreAttackDashboard = await getScoreAttackDashboardConfig();
    const scdTrueLength = scoreAttackDashboard.filter(x => x).length;
    this.setState({ showsastats, scoreAttackDashboard, scdTrueLength });
    if (prfldb === "" || prfldb === null) {
      return;
    }
    if (prfldb.length > 0) {
      const steamProfile = await readProfile(prfldb);
      const stats = steamProfile.Stats;
      await updateProfileConfig(prfldb);
      this.props.handleChange();
      let mostPlayed = "";
      const keys = Object.keys(stats.Songs);
      let playedCount = -1;
      for (let i = 0; i < keys.length; i += 1) {
        const stat = stats.Songs[keys[i]];
        if (stat.PlayedCount > playedCount) {
          playedCount = stat.PlayedCount;
          mostPlayed = keys[i];
        }
      }
      if (mostPlayed !== "") {
        const song = await getSongByID(mostPlayed)
        if (typeof song.song === 'undefined') { mostPlayed = "-"; }
        else { mostPlayed = unescape(song.song) + " by " + unescape(song.artist); }
      }
      let playingText = "";
      const dateObj = this.convertMS(stats.TimePlayed * 1000);
      if (dateObj.d >= 1) {
        playingText = `${dateObj.d} Days ${dateObj.h} Hours ${dateObj.m} Minutes`
      }
      else {
        playingText = `${dateObj.h} Hours ${dateObj.m} Minutes`
      }
      const songscount = await countSongsOwned();
      const arrmaster = await getArrangmentsMastered();
      this.setState({
        totalPlayingTime: playingText,
        maxConsecutiveDays: stats.MaxConsecutiveDays,
        longestStreak: stats.Streak,
        highestSolo: stats.HighestSoloAccuracy,
        songsOwned: songscount.songcount,
        songPlays: stats.SongsPlayedCount,
        arrMaster: arrmaster.count + "/" + songscount.count,
        mostPlayed,
      });
      const useCDLCforStats = await getUseCDLCConfig();
      const leadStats = await getLeadStats(useCDLCforStats);
      const lup = leadStats.l - (leadStats.lh + leadStats.lm + leadStats.ll)
      const rhythmStats = await getRhythmStats(useCDLCforStats);
      const rup = rhythmStats.r - (rhythmStats.rh + rhythmStats.rm + rhythmStats.rl)
      const bassStats = await getBassStats(useCDLCforStats);
      const bup = bassStats.b - (bassStats.bh + bassStats.bm + bassStats.bl)
      const saStats = await getSAStats("sa_badge_hard", "sa_fc_hard");
      const samStats = await getSAStats("sa_badge_master", "sa_fc_master")
      const sameStats = await getSAStats("sa_badge_medium", "sa_fc_medium");
      const saeStats = await getSAStats("sa_badge_easy", "sa_fc_easy");
      /*
      saStats.saplat = 240;
      saStats.sagold = 540;
      saStats.sasilver = 140;
      samStats.saplat = 140;
      samStats.sagold = 240;
      samStats.sasilver = 440;
      */
      this.setState({
        lead: [
          leadStats.l, leadStats.lh, leadStats.lm, leadStats.ll, lup,
        ],
        leadwidth: [
          0,
          this.getStatsWidth(leadStats.lh, 0, leadStats.l),
          this.getStatsWidth(leadStats.lm, 0, leadStats.l),
          this.getStatsWidth(leadStats.ll, 0, leadStats.l),
          this.getStatsWidth(lup, 0, leadStats.l),
        ],

        rhythm: [
          rhythmStats.r, rhythmStats.rh, rhythmStats.rm, rhythmStats.rl, rup,
        ],
        rhythmwidth: [
          0,
          this.getStatsWidth(rhythmStats.rh, 0, rhythmStats.r),
          this.getStatsWidth(rhythmStats.rm, 0, rhythmStats.r),
          this.getStatsWidth(rhythmStats.rl, 0, rhythmStats.r),
          this.getStatsWidth(rup, 0, rhythmStats.r),
        ],

        bass: [
          bassStats.b, bassStats.bh, bassStats.bm, bassStats.bl, bup,
        ],
        basswidth: [
          0,
          this.getStatsWidth(bassStats.bh, 0, bassStats.b),
          this.getStatsWidth(bassStats.bm, 0, bassStats.b),
          this.getStatsWidth(bassStats.bl, 0, bassStats.b),
          this.getStatsWidth(bup, 0, bassStats.b),
        ],
        satotal: songscount.count,

        /* hard */
        sahard: [
          saStats.saplat, saStats.sagold, saStats.sasilver,
          saStats.sabronze, saStats.safailed, songscount.count - saStats.satotal,
          saStats.safcs,
        ],
        sahardwidth: [
          this.getStatsWidth(saStats.saplat, 0, songscount.count),
          this.getStatsWidth(saStats.sagold, 0, songscount.count),
          this.getStatsWidth(saStats.sasilver, 0, songscount.count),
          this.getStatsWidth(saStats.sabronze, 0, songscount.count),
          this.getStatsWidth(saStats.safailed, 0, songscount.count),
          this.getStatsWidth(songscount.count - saStats.satotal, 0, songscount.count),
          this.getStatsWidth(saStats.safcs, 0, songscount.count),
        ],
        /* master */
        samaster: [
          samStats.saplat, samStats.sagold, samStats.sasilver,
          samStats.sabronze, samStats.safailed, songscount.count - samStats.satotal,
          samStats.safcs,
        ],
        samasterwidth: [
          this.getStatsWidth(samStats.saplat, 0, songscount.count),
          this.getStatsWidth(samStats.sagold, 0, songscount.count),
          this.getStatsWidth(samStats.sasilver, 0, songscount.count),
          this.getStatsWidth(samStats.sabronze, 0, songscount.count),
          this.getStatsWidth(samStats.safailed, 0, songscount.count),
          this.getStatsWidth(songscount.count - samStats.satotal, 0, songscount.count),
          this.getStatsWidth(samStats.safcs, 0, songscount.count),
        ],
        /* medium */
        samedium: [
          sameStats.saplat, sameStats.sagold, sameStats.sasilver,
          sameStats.sabronze, sameStats.safailed, songscount.count - sameStats.satotal,
          sameStats.safcs,
        ],
        samediumwidth: [
          this.getStatsWidth(sameStats.saplat, 0, songscount.count),
          this.getStatsWidth(sameStats.sagold, 0, songscount.count),
          this.getStatsWidth(sameStats.sasilver, 0, songscount.count),
          this.getStatsWidth(sameStats.sabronze, 0, songscount.count),
          this.getStatsWidth(sameStats.safailed, 0, songscount.count),
          this.getStatsWidth(songscount.count - sameStats.satotal, 0, songscount.count),
          this.getStatsWidth(sameStats.safcs, 0, songscount.count),
        ],
        /* easy */
        saeasy: [
          saeStats.saplat, saeStats.sagold, saeStats.sasilver,
          saeStats.sabronze, saeStats.safailed, songscount.count - saeStats.satotal,
          saeStats.safcs,
        ],
        saeasywidth: [
          this.getStatsWidth(saeStats.saplat, 0, songscount.count),
          this.getStatsWidth(saeStats.sagold, 0, songscount.count),
          this.getStatsWidth(saeStats.sasilver, 0, songscount.count),
          this.getStatsWidth(saeStats.sabronze, 0, songscount.count),
          this.getStatsWidth(saeStats.safailed, 0, songscount.count),
          this.getStatsWidth(songscount.count - saeStats.satotal, 0, songscount.count),
          this.getStatsWidth(saeStats.safcs, 0, songscount.count),
        ],
      })
      this.props.updateHeader(this.tabname, "Rocksmith 2014 Dashboard");
    }
  }
  fetchRandomStats = async (changesong = true, changepack = true) => {
    if (changesong) {
      const rsong = await getRandomSongOwned();
      if (typeof rsong === 'undefined') { return; }
      let mastery = rsong.mastery * 100;
      if (Math.round(mastery) !== mastery) { mastery = mastery.toFixed(2); }
      this.setState({
        randomalbum: unescape(rsong.album),
        randomsong: unescape(rsong.song),
        randomartist: unescape(rsong.artist),
        randomarr: unescape(rsong.arrangement),
        randommastery: mastery,
      })
    }
    if (changepack) {
      const rpack = await getRandomSongAvailable();
      if (typeof rpack === 'undefined') { return; }
      this.setState({
        randompackappid: unescape(rpack.appid),
        randompack: replaceRocksmithTerms(unescape(rpack.name)),
      });
    }
  }
  fetchWeeklySpotlight = async () => {
    const c = await window.fetch("https://www.reddit.com/r/rocksmith.json");
    const d = await c.json();
    const posts = d.data.children;
    const weekly = { title: '', url: '' };
    for (let i = 0; i < posts.length; i += 1) {
      const post = posts[i].data;
      if (post.stickied && post.title.includes("Weekly Song Spotlight")) {
        const [keyIgnored, value] = post.title.split(":");
        weekly.title = value;
        weekly.url = post.url;
      }
    }
    this.setState({ weeklysongspotlight: weekly });
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
    if (prfldb.length > 0) {
      this.props.updateHeader(
        this.tabname,
        `Decrypting ${path.basename(prfldb)}`,
      );
      const steamProfile = await readProfile(prfldb);
      const stats = steamProfile.Stats.Songs;
      const sastats = steamProfile.SongsSA;
      const total = Object.keys(stats).length + Object.keys(sastats).length;
      await updateProfileConfig(prfldb);
      this.props.handleChange();
      this.props.updateHeader(
        this.tabname,
        `Song Stats Found: ${total}`,
      );
      await initSongsOwnedDB();
      let keys = Object.keys(stats);
      let updatedRows = 0;
      for (let i = 0; i < keys.length; i += 1) {
        const stat = stats[keys[i]];
        const mastery = stat.MasteryPeak;
        const played = stat.PlayedCount;
        this.props.updateHeader(
          this.tabname,
          `Updating Stat for SongID:  ${keys[i]} (${i}/${keys.length})`,
        );
        /* loop await */ // eslint-disable-next-line
        const rows = await updateMasteryandPlayed(keys[i], mastery, played);
        if (rows === 0) {
          console.log("Missing ID: " + keys[i]);
        }
        updatedRows += rows;
      }
      //find score attack stats
      keys = Object.keys(sastats);
      for (let i = 0; i < keys.length; i += 1) {
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
          this.childtabname,
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
        this.childtabname,
        "Stats Found: " + updatedRows,
      );
    }
  }
  refreshStats = async () => {
    await this.updateMastery();
    await this.fetchStats();
  }
  render = () => {
    let sacolwidth = "col-sm-3";
    if (this.state.scdTrueLength > 2) sacolwidth = "col-sm-2-2"
    const scoreattackstyle = "col ta-center dashboard-bottom " + (this.state.showsastats ? sacolwidth : "hidden");
    const arrstyle = "col ta-center dashboard-middle col-md-3";
    return (
      <div className="container-fluid">
        <div className="centerButton list-unstyled">
          <a
            onClick={this.refreshStats}
            className="extraPadding download">
            Refresh Stats from Profile
          </a>
        </div>
        <br />
        <div className="row justify-content-md-center" style={{ marginTop: -30 + 'px' }}>
          <div className="col col-md-3 ta-center dashboard-top dashboard-header">
            <div>
              <a onClick={() => this.fetchRandomStats(false, true)}>Random Purchasable DLC</a>
              <hr />
            </div>
            <div style={{ marginTop: -6 + 'px' }}>
              <span style={{ fontSize: 26 + 'px' }}>
                <a
                  onClick={() => { this.setState({ showsongpackpreview: true }) }}>
                  {this.state.randompack.length > 48 ? this.state.randompack.slice(0, 48) + "..." : this.state.randompack}
                </a>
              </span>
              <br />
            </div>
          </div>
          <div className="col col-md-3 ta-center dashboard-top dashboard-header">
            <div>
              <a
                onClick={() => { window.shell.openExternal(this.state.weeklysongspotlight.url) }}>
                Reddit Weekly Song Spotlight
              </a>
              <hr />
            </div>
            <div style={{ marginTop: -6 + 'px' }}>
              <span style={{ fontSize: 26 + 'px' }}>
                <a
                  onClick={() => {
                    this.setState({ showweekly: true, showsongpackpreview: true })
                  }}>
                  {this.state.weeklysongspotlight.title}
                </a>
              </span>
              <br />
            </div>
          </div>
          <div className="col col-md-3 ta-center dashboard-top dashboard-header">
            <div>
              <a onClick={() => this.fetchRandomStats(true, false)}> Random Learn a Song</a>
              <hr />
            </div>
            <div style={{ marginTop: -10 + 'px' }}>
              <span
                style={{
                  width: 100 + '%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: 30 + 'px',
                  display: 'inline-block',
                }}><a
                  onClick={() => { this.setState({ showsongpreview: true }) }}>
                  {this.state.randomsong}
                </a>
              </span>
              <br />
              <span><a
                onClick={() => { this.setState({ showsongpreview: true }) }}>
                {this.state.randomartist} | {this.state.randomarr} | {this.state.randommastery} %
                </a>
              </span>
            </div>
          </div>
        </div>
        <div className="row justify-content-md-center">
          <div className="col col-lg-5 ta-center dashboard-top">
            <div>
              General
                <hr />
            </div>
            <div className="stat-container">
              <div style={{ width: 30 + '%' }} className="ta-left">
                Total Playing Time
                </div>
              <div style={{ width: 70 + '%' }} className="ta-right">
                {this.state.totalPlayingTime}
              </div>
            </div>
            <div className="stat-container">
              <div style={{ width: 30 + '%' }} className="ta-left">
                Max Consecutive Days
                </div>
              <div style={{ width: 30 + '%' }} className="ta-right">
                {this.state.maxConsecutiveDays}
              </div>
            </div>
            <div className="stat-container">
              <div style={{ width: 30 + '%' }} className="ta-left">
                Longest Note Streak
                </div>
              <div style={{ width: 30 + '%' }} className="ta-right">
                {this.state.longestStreak}
              </div>
            </div>
            <div className="stat-container">
              <div style={{ width: 30 + '%' }} className="ta-left">
                Highest Solo Accuracy
                </div>
              <div style={{ width: 70 + '%' }} className="ta-right">
                {this.state.highestSolo * 100}%
                </div>
            </div>
          </div>
          <div className="col col-lg-5 ta-center dashboard-top">
            <div>
              Songs
                <hr />
            </div>
            <div className="stat-container">
              <div style={{ width: 30 + '%' }} className="ta-left">
                Songs Owned
                </div>
              <div style={{ width: 30 + '%' }} className="ta-right">
                {this.state.songsOwned}
              </div>
            </div>
            <div className="stat-container">
              <div style={{ width: 30 + '%' }} className="ta-left">
                Songs Playthroughs
                </div>
              <div style={{ width: 30 + '%' }} className="ta-right">
                {this.state.songPlays}
              </div>
            </div>
            <div className="stat-container">
              <div style={{ width: 30 + '%' }} className="ta-left">
                Most Played Song
                </div>
              <div style={{ width: 60 + '%' }} className="ta-right">
                {this.state.mostPlayed}
              </div>
            </div>
            <div className="stat-container">
              <div style={{ width: 50 + '%' }} className="ta-left">
                Arrangements Mastered
                </div>
              <div style={{ width: 30 + '%' }} className="ta-right">
                {this.state.arrMaster}
              </div>
            </div>
            <br />
          </div>
        </div>
        <br /> <br />
        <div className="row justify-content-md-center">
          <div className={arrstyle}>
            <span style={{ fontSize: 17 + 'px' }}>Lead </span>
            <StatsTableView
              total={this.state.lead[0]}
              masteryTotals={this.state.lead.slice(1)}
              masteryWidths={this.state.leadwidth.slice(1)}
            />
          </div>
          <div className={arrstyle}>
            <span style={{ fontSize: 17 + 'px' }}>Rhythm </span>
            <StatsTableView
              total={this.state.rhythm[0]}
              masteryTotals={this.state.rhythm.slice(1)}
              masteryWidths={this.state.rhythmwidth.slice(1)}
            />
          </div>
          <div className={arrstyle}>
            <span style={{ fontSize: 17 + 'px' }}>Bass </span>
            <StatsTableView
              total={this.state.bass[0]}
              masteryTotals={this.state.bass.slice(1)}
              masteryWidths={this.state.basswidth.slice(1)}
            />
          </div>
        </div>
        <div className="row justify-content-md-center dashboard-scoreattack">
          {
            this.state.scoreAttackDashboard[0] === true ?
              <div className={scoreattackstyle}>
                <span style={{ fontSize: 17 + 'px' }}>Score Attack - Easy</span>
                <StatsTableView
                  scoreattack
                  total={this.state.satotal}
                  tierTotals={this.state.saeasy}
                  tierWidths={this.state.saeasywidth}
                />
              </div> : null
          }
          {
            this.state.scoreAttackDashboard[1] === true ?
              <div className={scoreattackstyle}>
                <span style={{ fontSize: 17 + 'px' }}>Score Attack - Medium</span>
                <StatsTableView
                  scoreattack
                  total={this.state.satotal}
                  tierTotals={this.state.samedium}
                  tierWidths={this.state.samediumwidth}
                />
              </div> : null
          }
          {
            this.state.scoreAttackDashboard[2] === true ?
              <div className={scoreattackstyle}>
                <span style={{ fontSize: 17 + 'px' }}>Score Attack - Hard</span>
                <StatsTableView
                  scoreattack
                  total={this.state.satotal}
                  tierTotals={this.state.sahard}
                  tierWidths={this.state.sahardwidth}
                />
              </div> : null
          }
          {
            this.state.scoreAttackDashboard[3] === true ?
              <div className={scoreattackstyle}>
                <span style={{ fontSize: 17 + 'px' }}>Score Attack - Master</span>
                <StatsTableView
                  scoreattack
                  total={this.state.satotal}
                  tierTotals={this.state.samaster}
                  tierWidths={this.state.samasterwidth}
                />
              </div> : null
          }
        </div>
        <div>
          <SongDetailView
            song={this.state.randomsong}
            artist={this.state.randomartist}
            album={this.state.randomalbum}
            showDetail={this.state.showsongpreview}
            close={() => this.setState({ showsongpreview: false })}
            isSongview
            isDashboard
            isSetlist={false}
          />
          <SongDetailView
            song={this.state.showweekly ?
              this.state.weeklysongspotlight.title : this.state.randompack}
            artist=""
            album=""
            showDetail={this.state.showsongpackpreview}
            close={() => this.setState({ showsongpackpreview: false, showweekly: false })}
            isSongpack
            isDashboard
            dlcappid={this.state.randompackappid}
            isSetlist={false}
            isWeekly={this.state.showweekly}
          />
        </div>
      </div>);
  }
}
DashboardView.propTypes = {
  //currentTab: PropTypes.object,
  updateHeader: PropTypes.func,
  //resetHeader: PropTypes.func,
  handleChange: PropTypes.func,
}
DashboardView.defaultProps = {
  //currentTab: null,
  updateHeader: () => { },
  //resetHeader: () => {},
  handleChange: () => { },
}
