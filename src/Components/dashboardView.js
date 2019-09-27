import React from 'react'
import { withI18n, Trans } from 'react-i18next';
import PropTypes from 'prop-types';

import StatsTableView, { getStatsWidth } from './statsTableView';
import getProfileConfig, {
  updateProfileConfig, getScoreAttackConfig, getUseCDLCConfig,
  getScoreAttackDashboardConfig, getDateFormatConfig,
  updateDateFormat, getSteamIDConfig, updateDateSrc,
  getDateSrcConfig, getSteamAPIKeyConfig, readFile, writeFile,
} from '../configService';
import readProfile from '../steamprofileService';
import {
  getSongByID, countSongsOwned, getArrangmentsMastered, getLeadStats,
  getRhythmStats, getBassStats, getRandomSongOwned,
  getRandomSongAvailable, getSAStats,
  getLastNSongs, getPathBreakdown,
} from '../sqliteService';
import { replaceRocksmithTerms } from './songavailableView';
import SongDetailView from './songdetailView';
import { getBadgeName } from './songlistView';
import { DispatcherService, DispatchEvents } from '../lib/libdispatcher';
import { profileWorker } from '../lib/libworker';

const Steam = require('steam-webapi');
const albumArt = require('./../lib/album-art');

class DashboardView extends React.Component {
  constructor(props) {
    super(props);
    this.tabname = 'tab-dashboard';
    this.timeFormats = ["dhm", "hm", "ms", "s"]
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
      playingTimeFormat: 'dhm',
      playingTimeSrc: 'rs', //rs or steam
      stats: null,
      maxConsecutiveDays: 0,
      longestStreak: 0,
      highestSolo: 0,
      songsOwned: 0,
      songPlays: 0,
      mostPlayed: '-',
      arrMaster: 0,
      showsastats: true,

      lead: [0, 0, 0, 0, 0, 0, 0, 0],
      leadwidth: [0, 0, 0, 0, 0, 0, 0, 0],
      rhythm: [0, 0, 0, 0, 0, 0, 0, 0],
      rhythmwidth: [0, 0, 0, 0, 0, 0, 0, 0],
      bass: [0, 0, 0, 0, 0, 0, 0, 0],
      basswidth: [0, 0, 0, 0, 0, 0, 0, 0],

      sahard: [0, 0, 0, 0, 0, 0, 0],
      sahardwidth: [0, 0, 0, 0, 0, 0, 0],
      samaster: [0, 0, 0, 0, 0, 0, 0],
      samasterwidth: [0, 0, 0, 0, 0, 0, 0],
      samedium: [0, 0, 0, 0, 0, 0, 0],
      samediumwidth: [0, 0, 0, 0, 0, 0, 0],
      saeasy: [0, 0, 0, 0, 0, 0, 0],
      saeasywidth: [0, 0, 0, 0, 0, 0, 0],
      genInfoState: "default", // default,showoptions, generating

      coverlas: 'https://raw.githubusercontent.com/sandiz/rs-manager/master/screenshots/nothumb.jpg',
      coverreddit: 'https://raw.githubusercontent.com/sandiz/rs-manager/master/screenshots/nothumb.jpg',
      coversteam: 'https://raw.githubusercontent.com/sandiz/rs-manager/master/screenshots/nothumb.jpg',
    }
  }

  cdmasync = async () => {
    await this.fetchStats();
    await this.fetchRandomStats();
    await this.fetchWeeklySpotlight();
    this.props.handleChange();
  }

  componentDidMount = async () => {
    this.cdmasync();
    DispatcherService.on(DispatchEvents.PROFILE_UPDATED, this.fetchStats);
  }

  componentWillUnmount = () => {
    DispatcherService.off(DispatchEvents.PROFILE_UPDATED, this.fetchStats);
  }

  changeTimeFormat = async () => {
    let index = this.timeFormats.indexOf(this.state.playingTimeFormat);
    if (index === -1) index = 0
    if (index >= this.timeFormats.length) index = 0
    index += 1;
    await updateDateFormat(this.timeFormats[index])
    this.setState({
      playingTimeFormat: this.timeFormats[index],
    }, () => this.setPlayingTime(this.state.stats));
  }

  steamPromise = async (key, steamID) => {
    return new Promise((resolve, reject) => {
      Steam.key = key
      Steam.ready(() => {
        const steam = new Steam();
        steam.getOwnedGames({
          appids_filter: [221680],
          steamid: steamID,
          include_played_free_games: false,
          include_appinfo: 1,
        }, (err, data) => {
          if (err) reject(err);
          else resolve(data);
          //console.log(minutesPlayed);
        });
      });
    })
  };

  getTimePlayedSteam = async () => {
    // if key valid call api get time, then send to get playying text time
    // if not return please check api key
    try {
      // eslint-disable-next-line
      const steamKey = await getSteamAPIKeyConfig();
      if (steamKey.length > 0) {
        const steamID = await getSteamIDConfig();
        if (steamID.length > 0) {
          const data = await this.steamPromise(steamKey, steamID)
          const minutesPlayed = data.games[0].playtime_forever;
          return this.getPlayingTimeText(minutesPlayed * 60);
        }
        else {
          return "Please sign in with Steam in settings"
        }
      }
      else {
        return "STEAM_API_KEY missing in Settings"
      }
    }
    catch (e) {
      return "Error Fetching data from Steam"
    }
  }

  changePlayingTimeSrc = async () => {
    let src = "rs"
    switch (this.state.playingTimeSrc) {
      case "rs":
      default:
        src = "steam"
        break;
      case "steam":
        src = "rs"
        break;
    }
    await updateDateSrc(src)
    this.setState({ playingTimeSrc: src }, () => this.setPlayingTime(this.state.stats))
  }

  setPlayingTime = async (stats) => {
    let playingText = "";
    if (this.state.playingTimeSrc === "steam") {
      playingText = await this.getTimePlayedSteam();
    }
    else {
      playingText = this.getPlayingTimeText(stats.TimePlayed);
    }
    this.setState({
      totalPlayingTime: playingText,
    })
  }

  getPlayingTimeText = (secs) => {
    let playingText = ""
    const daysText = this.props.t('days');
    const hoursText = this.props.t('hours');
    const minutesText = this.props.t('minutes');
    const secondsText = this.props.t('seconds');
    switch (this.state.playingTimeFormat) {
      default:
      case "dhm":
        {
          const dateObj = this.convertMS(secs * 1000);
          playingText = `${dateObj.d} ${daysText} ${dateObj.h} ${hoursText} ${dateObj.m} ${minutesText}`
        }
        break;
      case "hm":
        {
          let m = Math.floor(secs / 60);
          const h = Math.floor(m / 60);
          m %= 60;
          playingText = `${h} ${hoursText} ${m} ${minutesText}`
        }
        break;
      case "ms":
        {
          let s = Math.floor(secs);
          const m = Math.floor(s / 60);
          s %= 60;
          playingText = `${m} ${minutesText} ${s} ${secondsText}`
        }
        break;
      case "s":
        playingText = `${secs} ${secondsText}`;
        break;
    }
    return playingText;
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
  }

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
      if (!steamProfile) return;
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
      const useCDLCforStats = await getUseCDLCConfig();
      const songscount = await countSongsOwned(useCDLCforStats);
      const arrmaster = await getArrangmentsMastered(useCDLCforStats);
      const playingTimeFormat = await getDateFormatConfig();
      const playingTimeSrc = await getDateSrcConfig();
      this.setState({
        playingTimeFormat,
        playingTimeSrc,
        stats,
        maxConsecutiveDays: stats.MaxConsecutiveDays,
        longestStreak: stats.Streak,
        highestSolo: stats.HighestSoloAccuracy,
        songsOwned: songscount.songcount,
        songPlays: stats.SongsPlayedCount,
        arrMaster: arrmaster.count + "/" + songscount.count,
        mostPlayed,
      }, () => this.setPlayingTime(stats));
      const leadStats = await getLeadStats(useCDLCforStats);
      const lup = leadStats.l - (leadStats.l1 + leadStats.l2 + leadStats.l3
        + leadStats.l4 + leadStats.l5 + leadStats.l6)
      const rhythmStats = await getRhythmStats(useCDLCforStats);
      const rup = rhythmStats.r - (rhythmStats.r1 + rhythmStats.r2 + rhythmStats.r3
        + rhythmStats.r4 + rhythmStats.r5 + rhythmStats.r6)
      const bassStats = await getBassStats(useCDLCforStats);
      const bup = bassStats.b - (bassStats.b1 + bassStats.b2 + bassStats.b3
        + bassStats.b4 + bassStats.b5 + bassStats.b6)
      const saStats = await getSAStats("sa_badge_hard", "sa_fc_hard", useCDLCforStats);
      const samStats = await getSAStats("sa_badge_master", "sa_fc_master", useCDLCforStats)
      const sameStats = await getSAStats("sa_badge_medium", "sa_fc_medium", useCDLCforStats);
      const saeStats = await getSAStats("sa_badge_easy", "sa_fc_easy", useCDLCforStats);
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
          leadStats.l,
          leadStats.l1, leadStats.l2, leadStats.l3,
          leadStats.l4, leadStats.l5, leadStats.l6,
          lup,
        ],
        leadwidth: [
          0,
          getStatsWidth(leadStats.l1, 0, leadStats.l),
          getStatsWidth(leadStats.l2, 0, leadStats.l),
          getStatsWidth(leadStats.l3, 0, leadStats.l),
          getStatsWidth(leadStats.l4, 0, leadStats.l),
          getStatsWidth(leadStats.l5, 0, leadStats.l),
          getStatsWidth(leadStats.l6, 0, leadStats.l),
          getStatsWidth(lup, 0, leadStats.l),
        ],

        rhythm: [
          rhythmStats.r,
          rhythmStats.r1, rhythmStats.r2, rhythmStats.r3,
          rhythmStats.r4, rhythmStats.r5, rhythmStats.r6,
          rup,
        ],
        rhythmwidth: [
          0,
          getStatsWidth(rhythmStats.r1, 0, rhythmStats.r),
          getStatsWidth(rhythmStats.r2, 0, rhythmStats.r),
          getStatsWidth(rhythmStats.r3, 0, rhythmStats.r),
          getStatsWidth(rhythmStats.r4, 0, rhythmStats.r),
          getStatsWidth(rhythmStats.r5, 0, rhythmStats.r),
          getStatsWidth(rhythmStats.r6, 0, rhythmStats.r),
          getStatsWidth(rup, 0, rhythmStats.r),
        ],

        bass: [
          bassStats.b,
          bassStats.b1, bassStats.b2, bassStats.b3,
          bassStats.b4, bassStats.b5, bassStats.b6,
          bup,
        ],
        basswidth: [
          0,
          getStatsWidth(bassStats.b1, 0, bassStats.b),
          getStatsWidth(bassStats.b2, 0, bassStats.b),
          getStatsWidth(bassStats.b3, 0, bassStats.b),
          getStatsWidth(bassStats.b4, 0, bassStats.b),
          getStatsWidth(bassStats.b5, 0, bassStats.b),
          getStatsWidth(bassStats.b6, 0, bassStats.b),
          getStatsWidth(bup, 0, bassStats.b),
        ],
        satotal: songscount.count,

        /* hard */
        sahard: [
          saStats.saplat, saStats.sagold, saStats.sasilver,
          saStats.sabronze, saStats.safailed, songscount.count - saStats.satotal,
          saStats.safcs,
        ],
        sahardwidth: [
          getStatsWidth(saStats.saplat, 0, songscount.count),
          getStatsWidth(saStats.sagold, 0, songscount.count),
          getStatsWidth(saStats.sasilver, 0, songscount.count),
          getStatsWidth(saStats.sabronze, 0, songscount.count),
          getStatsWidth(saStats.safailed, 0, songscount.count),
          getStatsWidth(songscount.count - saStats.satotal, 0, songscount.count),
          getStatsWidth(saStats.safcs, 0, songscount.count),
        ],
        /* master */
        samaster: [
          samStats.saplat, samStats.sagold, samStats.sasilver,
          samStats.sabronze, samStats.safailed, songscount.count - samStats.satotal,
          samStats.safcs,
        ],
        samasterwidth: [
          getStatsWidth(samStats.saplat, 0, songscount.count),
          getStatsWidth(samStats.sagold, 0, songscount.count),
          getStatsWidth(samStats.sasilver, 0, songscount.count),
          getStatsWidth(samStats.sabronze, 0, songscount.count),
          getStatsWidth(samStats.safailed, 0, songscount.count),
          getStatsWidth(songscount.count - samStats.satotal, 0, songscount.count),
          getStatsWidth(samStats.safcs, 0, songscount.count),
        ],
        /* medium */
        samedium: [
          sameStats.saplat, sameStats.sagold, sameStats.sasilver,
          sameStats.sabronze, sameStats.safailed, songscount.count - sameStats.satotal,
          sameStats.safcs,
        ],
        samediumwidth: [
          getStatsWidth(sameStats.saplat, 0, songscount.count),
          getStatsWidth(sameStats.sagold, 0, songscount.count),
          getStatsWidth(sameStats.sasilver, 0, songscount.count),
          getStatsWidth(sameStats.sabronze, 0, songscount.count),
          getStatsWidth(sameStats.safailed, 0, songscount.count),
          getStatsWidth(songscount.count - sameStats.satotal, 0, songscount.count),
          getStatsWidth(sameStats.safcs, 0, songscount.count),
        ],
        /* easy */
        saeasy: [
          saeStats.saplat, saeStats.sagold, saeStats.sasilver,
          saeStats.sabronze, saeStats.safailed, songscount.count - saeStats.satotal,
          saeStats.safcs,
        ],
        saeasywidth: [
          getStatsWidth(saeStats.saplat, 0, songscount.count),
          getStatsWidth(saeStats.sagold, 0, songscount.count),
          getStatsWidth(saeStats.sasilver, 0, songscount.count),
          getStatsWidth(saeStats.sabronze, 0, songscount.count),
          getStatsWidth(saeStats.safailed, 0, songscount.count),
          getStatsWidth(songscount.count - saeStats.satotal, 0, songscount.count),
          getStatsWidth(saeStats.safcs, 0, songscount.count),
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
      setTimeout(async () => {
        const url = await this.fetchCover(this.state.randomartist, this.state.randomalbum);
        this.setState({ coverlas: url });
      }, 1000);
    }
    if (changepack) {
      const rpack = await getRandomSongAvailable();
      if (typeof rpack === 'undefined') { return; }
      this.setState({
        randompackappid: unescape(rpack.appid),
        randompack: replaceRocksmithTerms(unescape(rpack.name)),
      });
      setTimeout(async () => {
        const [artist, title] = this.state.randompack.split(" - ");
        const url = await this.fetchCover(artist ? artist.trim() : "", title ? title.trim() : "", false);
        this.setState({ coversteam: url });
      }, 1000)
    }
  }

  fetchWeeklySpotlight = async () => {
    try {
      const c = await window.fetch("https://www.reddit.com/r/rocksmith.json");
      const d = await c.json();
      const posts = d.data.children;
      const weekly = { title: '', url: '' };
      for (let i = 0; i < posts.length; i += 1) {
        const post = posts[i].data;
        if (post.title.includes("Weekly Song Spotlight")) {
          const [keyIgnored, value] = post.title.split(":");
          weekly.title = value;
          weekly.url = post.url;
        }
      }
      const title = weekly.title.split("by");
      const artist = title[1] ? unescape(title[1]).trim() : ""
      const track = title[0] ? unescape(title[0]).trim() : ""
      const url = await this.fetchCover(artist, track, false); //use trackname
      this.setState({ weeklysongspotlight: weekly, coverreddit: url });
    }
    catch (e) {
      console.log(e)
    }
  }

  refreshStats = async () => {
    profileWorker.startWork();
  }

  showInfoOptions = async () => {
    this.setState({ genInfoState: "showoptions" });
  }

  fetchCover = async (artist, albumortrack, usealbum = true) => {
    const a1 = artist.split("feat.")[0].trim();
    let url = "https://raw.githubusercontent.com/sandiz/rs-manager/master/screenshots/nothumb.jpg";
    const options = {
      size: 'large',
    }
    if (usealbum) options.album = albumortrack
    else options.track = albumortrack
    url = await albumArt(
      a1,
      options,
    );
    //console.log("first search result: " + url);
    if (url.toString().toLowerCase().includes("error:")) {
      //eslint-disable-next-line
      url = await albumArt(
        a1,
        { size: 'large' },
      );
      //console.log("second search result: " + url);
    }
    if (!url.toString().includes("http") || url.toString().toLowerCase().includes('rate limit exceeded')) {
      console.warn(url);
      url = "https://raw.githubusercontent.com/sandiz/rs-manager/master/screenshots/nothumb.jpg";
    }
    //console.log("---")
    return url;
  }

  generateStats = async () => {
    this.setState({ genInfoState: "generating" });
    this.props.updateHeader(
      this.tabname,
      `Generating, please wait..`,
    );
    let timePlayed = "";
    timePlayed = this.state.stats.TimePlayed / (60 * 60);
    const steamKey = await getSteamAPIKeyConfig();
    if (steamKey.length > 0) {
      const steamID = await getSteamIDConfig();
      if (steamID.length > 0) {
        const data = await this.steamPromise(steamKey, steamID)
        timePlayed = data.games[0].playtime_forever / 60;
      }
    }
    //readFile template
    let template = await readFile(window.dirname + "/template.html");
    template = template.toString('utf-8');

    // replace
    template = template.replace("{TIME}", Math.ceil(timePlayed));
    template = template.replace("{SONG}", this.state.songPlays);

    const infoID = document.getElementById("info_path").value
    const top3Songs = await getLastNSongs("count", 3, infoID);
    const recent3Songs = await getLastNSongs("mastery", 3, infoID);
    const sa3Songs = await getLastNSongs("sa", 3, infoID);
    const md3Songs = await getLastNSongs("md", 3, infoID);
    const all = {
      TOP3: top3Songs,
      RP: recent3Songs,
      SA: sa3Songs,
      MD: md3Songs,
    }
    let j = 0;
    let l = 0;
    const keys = Object.keys(all);
    for (let k = 0; k < keys.length; k += 1) {
      const items = all[keys[k]];
      for (let i = 0; i < items.length; i += 1) {
        const lsong = unescape(items[i].song).toLowerCase();
        const song = lsong.length > 20 ? lsong.substring(0, 20).trim() + "..." : lsong;

        const lartist = unescape(items[i].artist).toLowerCase();
        const artist = lartist.length > 20 ? lartist.substring(0, 16).trim() + "..." : lartist;

        const album = unescape(items[i].album);
        const root = keys[k];
        j = i % 3;

        //eslint-disable-next-line
        const url = await this.fetchCover(lartist, album);
        if (root === "SA") {
          let badge = "gp_failed";
          let name = "easy";
          const highest = items[i].sa_highest_badge;
          if (highest > 40) {
            name = "master"
            badge = getBadgeName(highest - 40, true);
          }
          else if (highest > 30) {
            name = "hard"
            badge = getBadgeName(highest - 30, true);
          }
          else if (highest > 20) {
            name = "medium"
            badge = getBadgeName(highest - 20, true);
          }
          else if (highest > 10) {
            name = "easy"
            badge = getBadgeName(highest - 10, true);
          }
          else {
            name = ""
            badge = getBadgeName(highest, true);
          }

          template = template.replace(`{BG${j + 1}}`, badge);
          template = template.replace(`{BGNAME${j + 1}}`, name);
        }
        template = template.replace(`{${root}_SONG_${j + 1}_NAME}`, song);
        template = template.replace(`{${root}_ARTIST_${j + 1}_NAME}`, artist);
        template = template.replace(`{${root}_PIC_${j + 1}}`, url);
        template = template.replace(`{PT${l + 1}}`, Math.round(items[i].mastery * 100) + "%");
        template = template.replace(`{WD${l + 1}}`, Math.round(items[i].mastery * 100) + "%");
        l += 1;
      }
    }

    const [lsm, lsp, lts] = await getPathBreakdown("lead");
    const lsmper = (lsm.count / lts.count * 100);
    const lspper = (lsp.count / lts.count * 100);
    template = template.replace("{lsm}", lsmper + "%")
    template = template.replace("{lsp}", lspper + "%")
    template = template.replace("{lts}", 100 + "%")

    template = template.replace("{lsmnum}", lsm.count)
    template = template.replace("{lspnum}", lsp.count)
    template = template.replace("{ltsnum}", lts.count)

    const [rsm, rsp, rts] = await getPathBreakdown("rhythm");
    const rsmper = (rsm.count / rts.count * 100);
    const rspper = (rsp.count / rts.count * 100);
    const rtsper = (rts.count / lts.count * 100);
    template = template.replace("{rsm}", rsmper + "%")
    template = template.replace("{rsp}", rspper + "%")
    template = template.replace("{rts}", rtsper + "%")
    template = template.replace("{rsmnum}", rsm.count)
    template = template.replace("{rspnum}", rsp.count)
    template = template.replace("{rtsnum}", rts.count)

    const [bsm, bsp, bts] = await getPathBreakdown("bass");
    const bsmper = (bsm.count / bts.count * 100);
    const bspper = (bsp.count / bts.count * 100);
    const btsper = (bts.count / lts.count * 100);
    template = template.replace("{bsm}", bsmper + "%")
    template = template.replace("{bsp}", bspper + "%")
    template = template.replace("{bts}", btsper + "%")
    template = template.replace("{bsmnum}", bsm.count)
    template = template.replace("{bspnum}", bsp.count)
    template = template.replace("{btsnum}", bts.count)

    //write
    const newFile = window.os.tmpdir() + "/rs_info.html"
    await writeFile(newFile, template);

    //show
    const templateHtml = "file:///" + newFile
    const authWindow = await window.openInfographic(templateHtml);
    authWindow.once('ready-to-show', () => {
      authWindow.show()
      /*authWindow.capturePage(async (img) => {
        const filename = window.os.tmpdir() + "/infographic.png";
        await writeFile(filename, img.toPNG());
        console.log(img.getSize(), img.isEmpty());
        console.log("saved to " + filename);
      })*/
    })

    this.props.updateHeader(
      this.tabname,
      `Rocksmith 2014 Dashboard`,
    );
    this.setState({ genInfoState: "default" })
  }

  render = () => {
    let sacolwidth = "col-sm-3";
    if (this.state.scdTrueLength > 2) sacolwidth = "col-sm-2-2"
    const scoreattackstyle = "col ta-center dashboard-bottom " + (this.state.showsastats ? sacolwidth : "hidden");
    const arrstyle = "col ta-center dashboard-bottom col-md-3";
    //      genInfoState: "default", // default,showoptions, generating
    let infostyle = ""
    let infodetailstyle = ""
    switch (this.state.genInfoState) {
      case "default":
        infostyle = "extraPadding download"
        infodetailstyle = "hidden"
        break;
      case "showoptions":
        infostyle = "hidden"
        infodetailstyle = "inline"
        break;
      case "generating":
        infostyle = "extraPadding download isDisabled"
        infodetailstyle = "hidden"
        break;
      default:
        break;
    }
    return (
      <div className="container-fluid" style={{ marginTop: -20 + 'px' }}>
        <div className="centerButton list-unstyled">
          <div className={infodetailstyle}>
            <select id="info_path">
              <option value="overall">Overall</option>
              <option value="lead">Lead</option>
              <option value="rhythm">Rhythm</option>
              <option value="bass">Bass</option>
            </select>
            <button
              type="button"
              onClick={() => { this.setState({ genInfoState: "default" }) }}
              style={{
                width: 5 + '%',
              }}
              className="extraPadding download">
              Back
            </button>
            <button
              type="button"
              onClick={this.generateStats}
              style={{
                width: 5 + '%',
              }}
              className="extraPadding download">
              Go
            </button>
          </div>
          <button
            type="button"
            onClick={this.showInfoOptions}
            style={{
              width: 15 + '%',
            }}
            ref={this.infoRef}
            className={infostyle}>
            <Trans i18nKey="generateInfographic ellipsify-text">
              Generate Infographic
            </Trans>
          </button>
          <button
            type="button"
            onClick={this.refreshStats}
            style={{
              width: 15 + '%',
            }}
            className="extraPadding download ellipsify-text">
            <Trans i18nKey="refreshStats">
              Refresh Stats from Profile
            </Trans>
          </button>
        </div>
        <br />
        <div className="row justify-content-md-center" style={{ marginTop: -38 + 'px' }}>
          <div className="col col-md-3 ta-center dashboard-top dashboard-header">
            <div className="ellipsify-text">
              <a onClick={() => this.fetchRandomStats(false, true)}>
                <Trans i18nKey="randomPurchasableDLC">
                  Random Purchasable DLC
                </Trans>
              </a>
              <hr />
            </div>
            <div style={{ marginTop: -6 + 'px', display: 'flex' }}>
              <div>
                <img
                  alt="albumcover"
                  src={this.state.coversteam}
                  className="albumcover"
                />
              </div>
              <div
                style={{
                  fontSize: 25 + 'px',
                  textAlign: 'left',
                  overflow: 'hidden',
                  height: 80 + 'px',
                }}
                title={this.state.randompack}>
                <a
                  onClick={() => { this.setState({ showsongpackpreview: true }) }}>
                  {this.state.randompack.length > 35 ? this.state.randompack.slice(0, 35) + "..." : this.state.randompack}
                </a>
              </div>
              <br />
            </div>
          </div>
          <div className="col col-md-3 ta-center dashboard-top dashboard-header">
            <div className="ellipsify-text">
              <a
                onClick={() => { window.shell.openExternal(this.state.weeklysongspotlight.url) }}>
                <Trans i18nKey="redditWeekly">
                  Reddit Weekly Song Spotlight
                </Trans>
              </a>
              <hr />
            </div>
            <div style={{ marginTop: -6 + 'px', display: 'flex' }}>
              <div>
                <img
                  alt="albumcover"
                  src={this.state.coverreddit}
                  className="albumcover"
                />
              </div>
              <div
                style={{
                  fontSize: 25 + 'px',
                  textAlign: 'left',
                  overflow: 'hidden',
                  height: 80 + 'px',
                }}
                stitle={this.state.weeklysongspotlight.title}>
                <a
                  onClick={() => {
                    this.setState({ showweekly: true, showsongpackpreview: true })
                  }}>
                  {this.state.weeklysongspotlight.title.length > 40 ? this.state.weeklysongspotlight.title.slice(0, 40) + "..." : this.state.weeklysongspotlight.title}
                </a>
              </div>
              <br />
            </div>
          </div>
          <div className="col col-md-3 ta-center dashboard-top dashboard-header">
            <div className="ellipsify-text">
              <a onClick={() => this.fetchRandomStats(true, false)}>
                <Trans i18nKey="randomLAS">
                  Random Learn a Song
                </Trans>
              </a>
              <hr />
            </div>
            <div style={{ marginTop: -6 + 'px' }}>
              <div>
                <img
                  alt="albumcover"
                  src={this.state.coverlas}
                  className="albumcover"
                />
              </div>
              <div
                style={{
                  width: 73 + '%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: 26 + 'px',
                  display: 'inline-block',
                  textAlign: 'left',
                }}
                title={this.state.randomsong}
              ><a
                onClick={() => { this.setState({ showsongpreview: true }) }}>
                  {this.state.randomsong}
                </a>
              </div>
              <br />
              <div
                style={{
                  width: 73 + '%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'inline-block',
                  textAlign: 'left',
                }}
                title={`${this.state.randomartist} | ${this.state.randomarr} | ${this.state.randommastery}% `}
              >
                <a
                  onClick={() => { this.setState({ showsongpreview: true }) }}>
                  {this.state.randomartist} | {this.state.randomarr} | {this.state.randommastery} %
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="row justify-content-md-center" style={{ marginTop: 10 + 'px' }}>
          <div className="col col-lg-5 ta-center dashboard-top">
            <div>
              <Trans i18nKey="general">
                General
              </Trans>
              <hr />
            </div>
            <div className="stat-container">
              <div style={{ width: 50 + '%' }} className="ta-left">
                <a onClick={this.changePlayingTimeSrc}>
                  <Trans i18nKey="totalPlayingTime">
                    Total Playing Time
                  </Trans>
                  <span style={{ fontSize: 12 + 'px' }}>(via {this.state.playingTimeSrc === "rs" ? "Rocksmith" : "Steam"})</span>
                </a>
              </div>
              <div style={{ width: 50 + '%' }} className="ta-right">
                <a onClick={this.changeTimeFormat}>{this.state.totalPlayingTime}</a>
              </div>
            </div>
            <div className="stat-container">
              <div style={{ width: 90 + '%' }} className="ta-left">
                <Trans i18nKey="maxConsecutiveDays">
                  Max Consecutive Days
                </Trans>
              </div>
              <div style={{ width: 10 + '%' }} className="ta-right">
                {this.state.maxConsecutiveDays}
              </div>
            </div>
            <div className="stat-container">
              <div style={{ width: 90 + '%' }} className="ta-left">
                <Trans i18nKey="longestNoteStreak">
                  Longest Note Streak
                </Trans>
              </div>
              <div style={{ width: 10 + '%' }} className="ta-right">
                {this.state.longestStreak}
              </div>
            </div>
            <div className="stat-container">
              <div style={{ width: 90 + '%' }} className="ta-left">
                <Trans i18nKey="highestSoloAccuracy">
                  Highest Solo Accuracy
                </Trans>
              </div>
              <div style={{ width: 10 + '%' }} className="ta-right">
                {this.state.highestSolo * 100}%
                </div>
            </div>
          </div>
          <div className="col col-lg-5 ta-center dashboard-top">
            <div>
              <Trans i18nKey="Songs">
                Songs
              </Trans>
              <hr />
            </div>
            <div className="stat-container">
              <div style={{ width: 90 + '%' }} className="ta-left">
                <Trans i18nKey="songsOwned">
                  Songs Owned
                </Trans>
              </div>
              <div style={{ width: 10 + '%' }} className="ta-right">
                {this.state.songsOwned}
              </div>
            </div>
            <div className="stat-container">
              <div style={{ width: 90 + '%' }} className="ta-left">
                <Trans i18nKey="songsPlaythroughs">
                  Songs Playthroughs
                </Trans>
              </div>
              <div style={{ width: 10 + '%' }} className="ta-right">
                {this.state.songPlays}
              </div>
            </div>
            <div className="stat-container">
              <div style={{ width: 30 + '%' }} className="ta-left">
                <Trans i18nKey="mostPlayedSong">
                  Most Played Song
                </Trans>
              </div>
              <div style={{ width: 65 + '%' }} className="ta-right">
                {this.state.mostPlayed}
              </div>
            </div>
            <div className="stat-container">
              <div style={{ width: 80 + '%' }} className="ta-left">
                <Trans i18nKey="arrangementsMastered">
                  Arrangements Mastered
                </Trans>
              </div>
              <div style={{ width: 20 + '%' }} className="ta-right">
                {this.state.arrMaster}
              </div>
            </div>
            <br />
          </div>
        </div>
        <br /> <br />
        <div className="row justify-content-md-center" style={{ marginTop: -10 + 'px' }}>
          <div className={arrstyle}>
            <div className="da-lead">
              <StatsTableView
                total={this.state.lead[0]}
                masteryTotals={this.state.lead.slice(1)}
                masteryWidths={this.state.leadwidth.slice(1)}
              />
            </div>
          </div>
          <div className={arrstyle}>
            <div className="da-rhythm">
              <StatsTableView
                total={this.state.rhythm[0]}
                masteryTotals={this.state.rhythm.slice(1)}
                masteryWidths={this.state.rhythmwidth.slice(1)}
              />
            </div>
          </div>
          <div className={arrstyle}>
            <div className="da-bass">
              <StatsTableView
                total={this.state.bass[0]}
                masteryTotals={this.state.bass.slice(1)}
                masteryWidths={this.state.basswidth.slice(1)}
              />
            </div>
          </div>
        </div>
        <div className="row justify-content-md-center dashboard-scoreattack" style={{ marginTop: -10 + 'px' }}>
          {
            this.state.scoreAttackDashboard[0] === true
              ? (
                <div className={scoreattackstyle}>
                  <span style={{ fontSize: 17 + 'px' }}><Trans i18nKey="scoreAttack">Score Attack</Trans> - <Trans i18nKey="easy">Easy</Trans></span>
                  <StatsTableView
                    scoreattack
                    total={this.state.satotal}
                    tierTotals={this.state.saeasy}
                    tierWidths={this.state.saeasywidth}
                  />
                </div>
              ) : null
          }
          {
            this.state.scoreAttackDashboard[1] === true
              ? (
                <div className={scoreattackstyle}>
                  <span style={{ fontSize: 17 + 'px' }}><Trans i18nKey="scoreAttack">Score Attack</Trans> - <Trans i18nKey="medium">Medium</Trans></span>
                  <StatsTableView
                    scoreattack
                    total={this.state.satotal}
                    tierTotals={this.state.samedium}
                    tierWidths={this.state.samediumwidth}
                  />
                </div>
              ) : null
          }
          {
            this.state.scoreAttackDashboard[2] === true
              ? (
                <div className={scoreattackstyle}>
                  <span style={{ fontSize: 17 + 'px' }}><Trans i18nKey="scoreAttack">Score Attack</Trans> - <Trans i18nKey="hard">Hard</Trans></span>
                  <StatsTableView
                    scoreattack
                    total={this.state.satotal}
                    tierTotals={this.state.sahard}
                    tierWidths={this.state.sahardwidth}
                  />
                </div>
              ) : null
          }
          {
            this.state.scoreAttackDashboard[3] === true
              ? (
                <div className={scoreattackstyle}>
                  <span style={{ fontSize: 17 + 'px' }}><Trans i18nKey="scoreAttack">Score Attack</Trans> - <Trans i18nKey="master">Master</Trans></span>
                  <StatsTableView
                    scoreattack
                    total={this.state.satotal}
                    tierTotals={this.state.samaster}
                    tierWidths={this.state.samasterwidth}
                  />
                </div>
              ) : null
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
            song={this.state.showweekly
              ? this.state.weeklysongspotlight.title : this.state.randompack}
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
      </div>
    );
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
export default withI18n('translation')(DashboardView)
