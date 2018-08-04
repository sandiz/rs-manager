import React from 'react'
import PropTypes from 'prop-types';
import StatsTableView from './statsTableView';
import getProfileConfig, { updateProfileConfig, getScoreAttackConfig } from '../configService';
import readProfile from '../steamprofileService';
import { updateMasteryandPlayed, initSongsOwnedDB, getSongID, countSongsOwned, getArrangmentsMastered, getLeadStats, getRhythmStats, getBassStats, getRandomSongOwned, getRandomSongAvailable, getSAStats, updateScoreAttackStats } from '../sqliteService';
import { replaceRocksmithTerms } from './songavailableView';
import SongDetailView from './songdetailView';

const { path } = window;

export default class DashboardView extends React.Component {
  constructor(props) {
    super(props);
    this.tabname = 'tab-dashboard';
    this.state = {
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
      l: 0,
      lh: 0,
      lm: 0,
      ll: 0,
      lup: 0,
      lhw: 0,
      lmw: 0,
      llw: 0,
      luw: 0,
      r: 0,
      rh: 0,
      rm: 0,
      rl: 0,
      rup: 0,
      rhw: 0,
      rmw: 0,
      rlw: 0,
      ruw: 0,
      b: 0,
      bh: 0,
      bm: 0,
      bl: 0,
      bup: 0,
      bhw: 0,
      bmw: 0,
      blw: 0,
      buw: 0,
      saplat: 0,
      saplatw: 0,
      sagold: 0,
      sagoldw: 0,
      sasilver: 0,
      sasilverw: 0,
      sabronze: 0,
      sabronzew: 0,
      safailed: 0,
      safailedw: 0,
      saunplayed: 0,
      saunplayedw: 0,
      samunplayed: 0,
      samunplayedw: 0,
      showsastats: true,
    }
  }
  componentWillMount = () => {
    this.fetchStats();
    this.fetchRandomStats();
    this.fetchWeeklySpotlight();
  }
  getStatsWidth = (input, min, max) => {
    const w = ((input - min) * 100) / (max - min);
    //eslint-disable-next-line
    if (isNaN(w)) { return 0; }
    return w;
  }
  convertMS = (ms) => {
    //eslint-disable-next-line
    let d, h, m, s;
    s = Math.floor(ms / 1000);
    m = Math.floor(s / 60);
    s %= 60;
    h = Math.floor(m / 60);
    m %= 60;
    //eslint-disable-next-line
    d = Math.floor(h / 24);
    h %= 24;
    return {
      d, h, m, s,
    };
  };
  fetchStats = async (disbleDialog) => {
    const prfldb = await getProfileConfig();
    const showsastats = await getScoreAttackConfig();
    this.setState({ showsastats });
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
        const song = await getSongID(mostPlayed)
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
      const leadStats = await getLeadStats();
      const lup = leadStats.l - (leadStats.lh + leadStats.lm + leadStats.ll)
      const rhythmStats = await getRhythmStats();
      const rup = rhythmStats.r - (rhythmStats.rh + rhythmStats.rm + rhythmStats.rl)
      const bassStats = await getBassStats();
      const bup = bassStats.b - (bassStats.bh + bassStats.bm + bassStats.bl)
      const saStats = await getSAStats("sa_badge_hard");
      const samStats = await getSAStats("sa_badge_master")
      /*
      saStats.saplat = 240;
      saStats.sagold = 540;
      saStats.sasilver = 140;
      samStats.saplat = 140;
      samStats.sagold = 240;
      samStats.sasilver = 440;
      */
      this.setState({
        l: leadStats.l,
        lh: leadStats.lh,
        lm: leadStats.lm,
        ll: leadStats.ll,
        lup,
        lhw: this.getStatsWidth(leadStats.lh, 0, leadStats.l),
        lmw: this.getStatsWidth(leadStats.lm, 0, leadStats.l),
        llw: this.getStatsWidth(leadStats.ll, 0, leadStats.l),
        luw: this.getStatsWidth(lup, 0, leadStats.l),
        r: rhythmStats.r,
        rh: rhythmStats.rh,
        rm: rhythmStats.rm,
        rl: rhythmStats.rl,
        rup,
        rhw: this.getStatsWidth(rhythmStats.rh, 0, rhythmStats.r),
        rmw: this.getStatsWidth(rhythmStats.rm, 0, rhythmStats.r),
        rlw: this.getStatsWidth(rhythmStats.rl, 0, rhythmStats.r),
        ruw: this.getStatsWidth(rup, 0, rhythmStats.r),
        b: bassStats.b,
        bh: bassStats.bh,
        bm: bassStats.bm,
        bl: bassStats.bl,
        bup,
        bhw: this.getStatsWidth(bassStats.bh, 0, bassStats.b),
        bmw: this.getStatsWidth(bassStats.bm, 0, bassStats.b),
        blw: this.getStatsWidth(bassStats.bl, 0, bassStats.b),
        buw: this.getStatsWidth(bup, 0, bassStats.b),
        satotal: songscount.count,
        saplat: saStats.saplat,
        saplatw: this.getStatsWidth(saStats.saplat, 0, songscount.count),
        sagold: saStats.sagold,
        sagoldw: this.getStatsWidth(saStats.sagold, 0, songscount.count),
        sasilver: saStats.sasilver,
        sasilverw: this.getStatsWidth(saStats.sasilver, 0, songscount.count),
        sabronze: saStats.sabronze,
        sabronzew: this.getStatsWidth(saStats.sabronze, 0, songscount.count),
        safailed: saStats.safailed,
        safailedw: this.getStatsWidth(saStats.safailed, 0, songscount.count),
        saunplayed: songscount.count - saStats.satotal,
        saunplayedw: this.getStatsWidth(songscount.count - saStats.satotal, 0, songscount.count),

        samplat: samStats.saplat,
        samplatw: this.getStatsWidth(samStats.saplat, 0, songscount.count),
        samgold: samStats.sagold,
        samgoldw: this.getStatsWidth(samStats.sagold, 0, songscount.count),
        samsilver: samStats.sasilver,
        samsilverw: this.getStatsWidth(samStats.sasilver, 0, songscount.count),
        sambronze: samStats.sabronze,
        sambronzew: this.getStatsWidth(samStats.sabronze, 0, songscount.count),
        samfailed: samStats.safailed,
        samfailedw: this.getStatsWidth(samStats.safailed, 0, songscount.count),
        samunplayed: songscount.count - samStats.satotal,
        samunplayedw: this.getStatsWidth(songscount.count - samStats.satotal, 0, songscount.count),
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
        //eslint-disable-next-line
        weekly.title = post.title.split(":")[1];
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
        // eslint-disable-next-line
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
        // eslint-disable-next-line
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
    const scoreattackstyle = "col ta-center dashboard-bottom " + (this.state.showsastats ? "col-md-3" : "hidden");
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
              total={this.state.l}
              highscoretotal={this.state.lh}
              mediumscoretotal={this.state.lm}
              lowscoretotal={this.state.ll}
              unplayedtotal={this.state.lup}
              highscorewidth={this.state.lhw}
              mediumscorewidth={this.state.lmw}
              lowscorewidth={this.state.llw}
              unplayedwidth={this.state.luw}
            />
          </div>
          <div className={arrstyle}>
            <span style={{ fontSize: 17 + 'px' }}>Rhythm </span>
            <StatsTableView
              total={this.state.r}
              highscoretotal={this.state.rh}
              mediumscoretotal={this.state.rm}
              lowscoretotal={this.state.rl}
              unplayedtotal={this.state.rup}
              highscorewidth={this.state.rhw}
              mediumscorewidth={this.state.rmw}
              lowscorewidth={this.state.rlw}
              unplayedwidth={this.state.ruw}
            />
          </div>
          <div className={arrstyle}>
            <span style={{ fontSize: 17 + 'px' }}>Bass </span>
            <StatsTableView
              total={this.state.b}
              highscoretotal={this.state.bh}
              mediumscoretotal={this.state.bm}
              lowscoretotal={this.state.bl}
              unplayedtotal={this.state.bup}
              highscorewidth={this.state.bhw}
              mediumscorewidth={this.state.bmw}
              lowscorewidth={this.state.blw}
              unplayedwidth={this.state.buw}
            />
          </div>
        </div>
        <div className="row justify-content-md-center dashboard-scoreattack" >
          <div className={scoreattackstyle}>
            <span style={{ fontSize: 17 + 'px' }}>Score Attack - Hard</span>
            <StatsTableView
              scoreattack
              total={this.state.satotal}
              plattotal={this.state.saplat}
              platwidth={this.state.saplatw}
              goldtotal={this.state.sagold}
              goldwidth={this.state.sagoldw}
              silvertotal={this.state.sasilver}
              silverwidth={this.state.sasilverw}
              bronzetotal={this.state.sabronze}
              bronzewidth={this.state.sabronzew}
              failedtotal={this.state.safailed}
              failedwidth={this.state.safailedw}
              unplayedtotal={this.state.saunplayed}
              unplayedwidth={this.state.saunplayedw}
            />
          </div>
          <div className={scoreattackstyle}>
            <span style={{ fontSize: 17 + 'px' }}>Score Attack - Master</span>
            <StatsTableView
              scoreattack
              total={this.state.satotal}
              plattotal={this.state.samplat}
              platwidth={this.state.samplatw}
              goldtotal={this.state.samgold}
              goldwidth={this.state.samgoldw}
              silvertotal={this.state.samsilver}
              silverwidth={this.state.samsilverw}
              bronzetotal={this.state.sambronze}
              bronzewidth={this.state.sambronzew}
              failedtotal={this.state.samfailed}
              failedwidth={this.state.samfailedw}
              unplayedtotal={this.state.samunplayed}
              unplayedwidth={this.state.samunplayedw}
            />
          </div>
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
  // eslint-disable-next-line
  currentTab: PropTypes.object,
  // eslint-disable-next-line
  updateHeader: PropTypes.func,
  // eslint-disable-next-line
  resetHeader: PropTypes.func,
  handleChange: PropTypes.func,
}
DashboardView.defaultProps = {
  currentTab: null,
  updateHeader: () => { },
  resetHeader: () => { },
  handleChange: () => { },
}
