import React from 'react'
import PropTypes from 'prop-types';
import { withI18n } from 'react-i18next';
import AnimatedNumber from 'react-animated-number';
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import moment from 'moment';

import {
  RemoteAll, BaseColumnDefs, generateColumns,
} from './songlistView';
import SongDetailView from './songdetailView';
import {
  getSongBySongKey, getSongsOwned,
  getHistory, getSongByID,
} from '../sqliteService'
import {
  readFile, writeFile, getIsSudoWhitelistedConfig,
  getScoreAttackConfig, getCustomCulumnsConfig,
} from '../configService';
import { psarcToJSON } from '../psarcService';
import { profileWorker } from '../lib/libworker';
import { DispatcherService, DispatchEvents } from '../lib/libdispatcher';

const albumArt = require('./../lib/album-art');

require('highcharts/modules/variwide')(Highcharts)

export function pad2(number) {
  return (number < 10 ? '0' : '') + number
}
export function getMinutesSecs(time) {
  const minutes = Math.floor(time / 60);
  const seconds = pad2(Math.round(time - (minutes * 60)));
  return ({ minutes, seconds });
}
class RSLiveView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      artist: '',
      song: 'No Song Selected',
      album: '',
      albumArt: '',
      timeTotal: 0,
      timeCurrent: 0,
      tracking: 0, //0:inactive, 1:starting, 2:active
      songKey: '',
      persistentID: '',
      gameState: '',
      accuracy: 0,
      currentStreak: 0,
      highestStreak: 0,
      totalNotes: 0,
      notesHit: 0,
      notesMissed: 0,
      perfectHits: 0,
      lateHits: 0,
      perfectPhrases: 0,
      goodPhrases: 0,
      /* table state vars */
      songs: [],
      page: 1,
      totalSize: 0,
      sizePerPage: 100,
      showDetail: false,
      showSong: '',
      showArtist: '',
      /* end table */
      recentlyplayedsongs: [],
      rptotalSize: 0,
      rpsizePerPage: 20,
      rpsrc: 'las', /*las or sa */
      /* chart data */
      chartOptions: {
        credits: {
          enabled: false,
        },
        chart: {
          type: 'variwide',
          height: 140,
          backgroundColor: 'none',
          style: {
            font: 'Roboto Condensed',
            color: "white",
          },
          animation: false,
        },
        xAxis: {
          type: 'category',
          labels: {
            style: {
              font: 'Roboto Condensed',
              color: "white",
            },
          },
          tickInterval: 1,
          lineWidth: 1,
          minorGridLineWidth: 0,
          lineColor: '#EF7408',
          minorTickLength: 0,
          tickLength: 0,
        },
        yAxis: {
          labels: {
            enabled: false,
          },
          title: {
            text: '',
            reserveSpace: false,
          },
          min: 0,
          max: 23,
          tickInterval: 1,
          lineWidth: 1,
          minorGridLineWidth: 0,
          lineColor: 'black',
          minorTickLength: 0,
          tickLength: 0,
          gridLineColor: 'transparent',
        },
        title: {
          text: '',
          floating: true,
        },
        tooltip: {
          enabled: false,
        },
        legend: {
          enabled: false,
        },
        plotOptions: {
          series: {
            animation: false,
          },
          variwide: {
            // stacking: 'normal',
            grouping: false,
            shadow: false,
            borderWidth: 1,
            borderColor: 'black',
            animation: false,
          },
        },
        series: [{
          name: "A",
          data: [[0, 0, 5]],
          //colorByPoint: true,
          //color: '#8900C2',
          borderRadius: 3,
          borderColor: 'black',
          borderWidth: 1,
        }, {
          name: "B",
          data: [],
          pointPlacement: 0,
          color: 'lightgreen', //2-rgb(200,247,73) 3-yellow
        }],
      },
      histChartOptions: {
        credits: {
          enabled: false,
        },
        chart: {
          type: 'column',
          height: 140,
          backgroundColor: 'none',
          style: {
            font: 'Roboto Condensed',
            color: "white",
          },
          animation: false,
        },
        xAxis: {
          type: 'category',
          labels: {
            style: {
              font: 'Roboto Condensed',
              color: "white",
            },
          },
          tickInterval: 1,
          lineWidth: 1,
          minorGridLineWidth: 0,
          lineColor: '#EF7408',
          minorTickLength: 0,
          tickLength: 0,
          min: 0,
          minRange: 10,
        },
        yAxis: {
          labels: {
            style: {
              font: 'Roboto Condensed',
              color: "white",
            },
          },
          title: {
            text: '',
            reserveSpace: false,
          },
          min: 0,
          max: 110,
          tickInterval: 10,
          lineWidth: 1,
          minorGridLineWidth: 0,
          lineColor: 'black',
          minorTickLength: 0,
          tickLength: 0,
          gridLineColor: 'transparent',
        },
        title: {
          text: '',
          floating: true,
        },
        tooltip: {
          enabled: true,
        },
        legend: {
          enabled: false,
        },
        plotOptions: {
          series: {
            animation: false,
          },
          column: {
            // stacking: 'normal',
            grouping: false,
            shadow: false,
            borderWidth: 1,
            borderColor: 'black',
            animation: false,
            pointWidth: 30,
            dataLabels: {
              enabled: true,
              crop: false,
              overflow: 'none',
              borderColor: 'black',
              borderWidth: 0,
              sahdow: false,
              color: 'azure',
              style: {
                fontWeight: 'normal',
                textOutline: "none",
              },
            },
          },
        },
        series: [{
          name: "A",
          data: [[0, 0, 5]],
          //colorByPoint: true,
          //color: '#8900C2',
          borderRadius: 3,
          borderColor: 'black',
          borderWidth: 1,
        }, {
          name: "B",
          data: [],
          pointPlacement: 0,
          color: 'lightgreen', //2-rgb(200,247,73) 3-yellow
        }],
      },
      phrases: [],
      notesBucket: [{
        notesHit: 0,
        notesMissed: 0,
        perfectHits: 0,
        lateHits: 0,
      }],
      trackingMode: 'hitp', //hitp, perp, hist, record
      recording: 0, //stopped, wait, started
      isSudoWhitelisted: false,
      columns: BaseColumnDefs,
      rpcolumns: BaseColumnDefs,
    }
    this.tabname = 'tab-rslive';
    this.rowEvents = {
      onClick: (e, row, rowIndex) => {
        this.setState({
          //showDetail: true,
          //showSong: row.song,
          //showArtist: row.artist,
          //showAlbum: row.album,
        })
      },
    };
    this.rowStyle = (row, rowIndex) => {
      if (row.id === this.state.persistentID) {
        return {
          backgroundColor: 'azure',
          color: 'black',
        }
      }
      return {
        color: 'inherit',
      };
    };

    this.fetchrstimer = null;
    this.lastalbumname = "";
    this.lastsongkey = "";
    this.lastsongdetail = null;
    this.songkeyresults = null;
    this.persistenIDresults = null;
    this.albumarturl = "";
    this.enablefakedata = false;
    this.fakedata = JSON.parse(`{"success":false,"currentState":0,"memoryReadout":{"songTimer":4.362,"songID":"Gree21Gu",
    "persistentID":"CE42CBABEC6ABBF296E89310F120DC0E","TotalNotesHit":0,"CurrentHitStreak":0,
    "HighestHitStreak":0,"TotalNotesMissed":0,"CurrentMissStreak":0,"mode":2,"gameState":"LearnASong_Pause",
    "CurrentPerfectHitStreak":0,"TotalPerfectHits":0,"CurrentLateHitStreak":0,"TotalLateHits":0,
    "PerfectPhrases":0,"GoodPhrases":0,"PassedPhrases":0,"FailedPhrases":0,"TotalNotes":0},
    "songDetails":null,"albumCoverBase64":null,"Version":"0.1.4"}`);
    this.lastSongData = {
      notesHit: 0,
      notesMissed: 0,
      perfectHits: 0,
      lateHits: 0,
      lastTimer: 0,
      lastBucket: 0,
    }
    this.recordTitleRef = React.createRef();
    this.recordTimer = null;
    this.lastUpdateTS = new Date();
    this.loadColumns();
  }

  componentDidMount = async () => {
    DispatcherService.on(DispatchEvents.PROFILE_UPDATED, this.refresh);
    await this.refreshRPTable();
    try {
      if (!this.enablefakedata) await window.fetch("http://127.0.0.1:9938");
      //if fetch works tracking is active , start sniffing
      this.setState({ tracking: 2 });
      this.fetchRSSniffer();
    }
    catch (e) {
      //tracking is not active
    }
    const isSudoWhitelisted = await getIsSudoWhitelistedConfig();
    console.log("is sudo whitelisted", isSudoWhitelisted);
    this.setState({ isSudoWhitelisted });
  }

  componentWillUnmount = async () => {
    //this.stopTracking(false);
    DispatcherService.off(DispatchEvents.PROFILE_UPDATED, this.refresh);
    if (this.fetchrstimer) clearInterval(this.fetchrstimer);
    window.libRecord.stopRecording(); //stop recording if necessary
  }

  loadColumns = async () => {
    const showSAStats = await getScoreAttackConfig();
    const customColumns = await getCustomCulumnsConfig();
    this.state.columns = generateColumns(customColumns,
      { globalNotes: {}, showSAStats },
      this.props.t);
    this.state.rpcolumns = generateColumns(customColumns,
      { globalNotes: {}, showSAStats },
      this.props.t, ['date_las']);
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

  generatePhrases = (phrases) => {
    //this.setState({ chartData: this.getChartData(true) })
    const { chartOptions } = this.state;
    phrases = JSON.parse(phrases);
    phrases.sort((a, b) => {
      return (a.StartTime > b.StartTime) ? 1 : ((b.StartTime > a.StartTime) ? -1 : 0);
    });

    /* phrase data for hitp/perp trackingMode*/
    let max = 0;
    let i = 0
    const notesBucket = [];
    chartOptions.series[0].data.length = 0
    chartOptions.series[1].data.length = 0;
    for (i = 0; i < phrases.length; i += 1) {
      const phrase = phrases[i];
      chartOptions.series[0].data.push({
        x: i,
        y: phrase.MaxDifficulty,
        z: Math.round(phrase.EndTime - phrase.StartTime),
        color: '#8900C2',
      });

      const defValue = 0;//phrase.MaxDifficulty / 2
      chartOptions.series[1].data.push({
        x: i,
        y: defValue,
        z: Math.round(phrase.EndTime - phrase.StartTime),
        color: 'lightgreen',
      });

      /* init note bucket */
      notesBucket.push({
        notesHit: 0,
        notesMissed: 0,
        perfectHits: 0,
        lateHits: 0,
      })

      if (max < phrase.MaxDifficulty) max = phrase.MaxDifficulty;
    }
    /* copy first bar data to last to make it look even (silence) */
    let last = chartOptions.series[0].data[chartOptions.series[0].data.length - 1];
    let first = chartOptions.series[0].data[0];
    last.z = first.z;

    last = chartOptions.series[1].data[chartOptions.series[1].data.length - 1];
    first = chartOptions.series[1].data[0];
    last.z = first.z;

    /* */
    const defaultNoteData = {
      notesHit: 0,
      notesMissed: 0,
      perfectHits: 0,
      lateHits: 0,
    }
    this.lastSongData = defaultNoteData;
    this.setState({
      chartOptions,
      phrases,
      notesBucket,
    });
  }

  getBucketFromTime = (currtime, phrases) => {
    for (let i = 0; i < phrases.length; i += 1) {
      const phrase = phrases[i];
      if (currtime >= phrase.StartTime && currtime < phrase.EndTime) return i;
    }
    return -1;
  }

  getUpdatedNoteBuckets = (bucketIdx, memoryReadout) => {
    const notesBucket = this.state.notesBucket;

    if (bucketIdx < 0 || bucketIdx >= notesBucket.length) return notesBucket;

    const deltaNotesHit = memoryReadout.noteData.TotalNotesHit - this.lastSongData.notesHit;
    const deltaNotesMissed = memoryReadout.noteData.TotalNotesMissed 
    - this.lastSongData.notesMissed;
    const deltaPerfects = memoryReadout.noteData.TotalPerfectHits - this.lastSongData.perfectHits;
    const deltaLates = memoryReadout.noteData.TotalLateHits - this.lastSongData.lateHits;

    //console.log("bucket", bucketIdx, "nh", notesBucket[bucketIdx].notesHit,
    //  "nm", notesBucket[bucketIdx].notesMissed,
    //  "ph", notesBucket[bucketIdx].perfectHits,
    //  "lh", notesBucket[bucketIdx].lateHits);
    notesBucket[bucketIdx].notesHit += deltaNotesHit;
    notesBucket[bucketIdx].notesMissed += deltaNotesMissed;
    notesBucket[bucketIdx].perfectHits += deltaPerfects;
    notesBucket[bucketIdx].lateHits += deltaLates;

    this.lastSongData.notesHit = memoryReadout.noteData.TotalNotesHit;
    this.lastSongData.notesMissed = memoryReadout.noteData.TotalNotesMissed;
    this.lastSongData.perfectHits = memoryReadout.noteData.TotalPerfectHits;
    this.lastSongData.lateHits = memoryReadout.noteData.TotalLateHits;
    this.lastSongData.lastTimer = memoryReadout.songTimer;
    this.lastSongData.lastBucket = bucketIdx;

    return notesBucket;
  }

  getNoteStats = (memoryReadout) => {
    if (!memoryReadout) {
      return { notesBucket: this.state.notesBucket, chartOptions: this.state.chartOptions }
    }
    const {
      phrases, chartOptions,
    } = this.state;
    const currtime = memoryReadout.songTimer;
    const newBucket = this.getBucketFromTime(currtime, phrases);
    const deltatime = currtime - this.lastSongData.lastTimer;
    if (deltatime < 0.0) {
      const oldBucket = this.getBucketFromTime(this.lastSongData.lastTimer, phrases);
      const deltaB = newBucket - oldBucket;
      if (deltaB < -1) {
        console.log("detected rewind, generating phrases again");
        this.lastSongData.lastBucket = newBucket;
        this.lastSongData.lastTimer = currtime;
        this.generatePhrases(JSON.stringify(phrases));
        return { notesBucket: this.state.notesBucket, chartOptions: this.state.chartOptions }
      }
    }


    let newNoteBuckets = this.state.notesBucket;
    if (newBucket > 0 && newBucket < phrases.length) {
      newNoteBuckets = this.getUpdatedNoteBuckets(newBucket, memoryReadout)
      if (newNoteBuckets.length > 0) {
        const newNoteBucketData = newNoteBuckets[newBucket];
        const tnh = newNoteBucketData.notesHit + newNoteBucketData.notesMissed
        //const mp = ((newNoteBucketData.notesMissed / tnh));
        const seriesData = chartOptions.series[0].data;
        let per = 0
        if (this.state.trackingMode === "hitp") {
          const hp = ((newNoteBucketData.notesHit / tnh));
          per = hp * seriesData[newBucket].y;
        }
        else if (this.state.trackingMode === "perp") {
          const p = ((newNoteBucketData.perfectHits / tnh));
          per = p * seriesData[newBucket].y;
        }
        //const mper = mp * seriesData[newBucket].y;
        const noteData = chartOptions.series[1].data;
        noteData[newBucket].y = per;

        //console.log("nh", newNoteBucketData.notesHit,
        //"nm", newNoteBucketData.notesMissed, "tnh", tnh);
        //console.log("bucket", newBucket, "max",
        // seriesData[newBucket].y, "hp", hp, "mp", mp, "hper", hper, "mper", mper);
      }
    }

    const seriesData = chartOptions.series[0].data;
    for (let i = 0; i < seriesData.length; i += 1) {
      if (i === newBucket) {
        seriesData[i].color = "#c652f7";
      } else {
        seriesData[i].color = "#8900C2";
      }
    }
    return { notesBucket: newNoteBuckets, chartOptions };
  }

  parseSongResults = async (songData) => {
    const { songDetails, memoryReadout } = songData;
    const tnh = memoryReadout ? memoryReadout.noteData.TotalNotesHit : 0;
    const tnm = memoryReadout ? memoryReadout.noteData.TotalNotesMissed : 0;
    let accuracy = tnh / (tnh + tnm);
    accuracy *= 100;

    if (Number.isNaN(accuracy)) {
      accuracy = 0;
    }
    if (songDetails) {
      this.lastsongdetail = songDetails;
    }
    const notesHit = memoryReadout ? memoryReadout.noteData.TotalNotesHit : 0;
    const notesMissed = memoryReadout ? memoryReadout.noteData.TotalNotesMissed : 0;
    const highestStreak = memoryReadout ? memoryReadout.noteData.HighestHitStreak : 0;
    if (memoryReadout
      && memoryReadout.songID.length > 0
      && memoryReadout.songID !== this.state.songKey) {
      const skr = await getSongBySongKey(memoryReadout.songID);
      if (skr.length > 0) this.songkeyresults = skr[0];
    }
    // if persistentID is available use that result
    if (memoryReadout
      && memoryReadout.persistentID.length > 0
      && memoryReadout.persistentID !== this.state.persistentID) {
      const skr = await getSongByID(memoryReadout.persistentID);
      //get phrases from psarc
      if (skr !== '') {
        this.persistenIDresults = skr;
        const filename = skr.uniqkey.split(".psarc_")[0]
        const psarcObj = await psarcToJSON(unescape(filename) + ".psarc");
        const arrangements = psarcObj.arrangements;
        const arrangement = arrangements.filter(arr => arr.id === memoryReadout.persistentID)[0];
        this.generatePhrases(arrangement.phraseIterations);
        this.handleTracking();
      }
      else {
        this.persistenIDresults = null;
      }
    }

    const song = songDetails ? songDetails.songName : (this.songkeyresults ? unescape(this.songkeyresults.song) : "");
    const artist = songDetails ? songDetails.artistName : (this.songkeyresults ? unescape(this.songkeyresults.artist) : "");
    const album = songDetails ? songDetails.albumName : (this.songkeyresults ? unescape(this.songkeyresults.album) : "");
    const timeTotal = songDetails
      ? songDetails.songLength : (this.songkeyresults ? this.songkeyresults.songLength : 0);
    if (song !== "" && artist !== "" && this.lastalbumname !== unescape(album)) {
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
    let totalNotes = 0;
    if (this.persistenIDresults) {
      totalNotes = this.persistenIDresults.maxNotes;
    }
    else if (memoryReadout && this.songkeyresults) {
      totalNotes = this.songkeyresults.maxNotes;
    }

    const gameState = memoryReadout ? memoryReadout.gameState : "";
    const perfectHits = memoryReadout ? memoryReadout.noteData.TotalPerfectHits : 0;
    const lateHits = memoryReadout ? memoryReadout.noteData.TotalLateHits : 0;
    const perfectPhrases = memoryReadout ? memoryReadout.noteData.PerfectPhrases : 0;
    const goodPhrases = memoryReadout ? memoryReadout.noteData.GoodPhrases : 0;
    const { notesBucket, chartOptions } = this.getNoteStats(memoryReadout);
    //console.log(chartOptions);
    this.setState({
      accuracy,
      song,
      artist,
      album,
      timeTotal,
      totalNotes,
      timeCurrent: memoryReadout ? memoryReadout.songTimer : 0,
      songKey: memoryReadout ? memoryReadout.songID : "",
      currentStreak: memoryReadout ? memoryReadout.noteData.CurrentHitStreak : 0,
      highestStreak,
      notesHit,
      notesMissed,
      albumArt: this.albumarturl,
      persistentID: memoryReadout ? memoryReadout.persistentID : '',
      gameState,
      perfectHits,
      lateHits,
      perfectPhrases,
      goodPhrases,
      notesBucket,
      chartOptions: {
        series: chartOptions.series,
      },
    }, () => {
      if (memoryReadout && this.lastsongkey !== memoryReadout.songID) {
        this.refreshTable();
        this.lastsongkey = memoryReadout.songID;
      }
    });
  }

  handleTracking = async () => {
    if (this.state.trackingMode === "hist") {
      const op = await getSongByID(this.state.persistentID);
      //console.log(op.mastery)
      const mastery = (op.mastery * 100).toFixed(2);
      const series = this.state.histChartOptions.series;
      series[0].data.length = 0;
      series[0].data.push({
        y: parseFloat(mastery),
        name: "Best",
        color: "lightgreen",
      });
      //read all history from history db
      const history = await getHistory(this.state.persistentID);
      for (let i = 0; i < history.length; i += 1) {
        const hist = history[i]
        const masteryLast = (hist.mastery * 100).toFixed(2);
        const floatMastery = parseFloat(masteryLast)
        series[0].data.push({
          y: floatMastery,
          name: i === history.length - 1 ? "Last" : moment(hist.timestamp * 1000).format("M/D LT"),
          color: floatMastery >= 100 ? "lightgreen" : "#8900C2",
        });
      }
      //add to chart
      this.setState({
        histChartOptions: {
          series,
        },
      })
    }
  }

  refreshRPTable = async () => {
    this.handleRPTableChange("cdm", {
      page: this.state.page,
      sizePerPage: this.state.rpsizePerPage,
      sortField: "date_las",
      sortOrder: "desc",
    })
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
    console.log("start tracking");
    this.setState({ tracking: 1 });
    // spawn process
    let cwd = ""
    if (window.os.platform() === "win32") {
      const killcmd = await this.killPIDs(await this.findPID());
      console.log("kill command: " + killcmd);
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
      cwd = window.dirname + "/tools/"
      if (this.state.isSudoWhitelisted) {
        this.rssniffer = `bash -c "sudo ./rocksniff_mac on"`
      }
      else {
        this.rssniffer = `bash -c "./rocksniff_mac on"`
      }
      window.process.chdir(cwd);
      const options = { name: 'RockSniffer', cwd };
      const exec = this.state.isSudoWhitelisted ? window.exec : window.sudo.exec;
      exec(
        this.rssniffer,
        options,
        (error, stdout, stderr) => {
          if (error) { console.log("start-track-stderr: " + error) }
          if (stdout) { console.log('start-track-stdout: ' + stdout); }
          window.process.chdir(window.dirname);
        },
      );
    }
    this.setState({ tracking: 2 });
    this.props.updateHeader(
      this.tabname,
      `Tracking: Active`,
    );
    this.fetchRSSniffer();
  }

  fetchRSSniffer = async () => {
    this.fetchrstimer = setInterval(async () => {
      try {
        if (this.enablefakedata) {
          await this.parseSongResults(this.fakedata);
          return;
        }
        const songData = await window.fetch("http://127.0.0.1:9938");
        if (!songData) return;
        if (typeof songData === 'undefined') { return; }
        const jsonObj = await songData.json();
        await this.parseSongResults(jsonObj);
        const currDate = new Date();
        const seconds = (currDate.getTime() - this.lastUpdateTS.getTime()) / 1000;
        if (seconds >= 15) {
          this.lastUpdateTS = new Date();
          if (this.state.songKey.length > 0) {
            await this.refreshStats();
            //console.log("Updated Mastery for ", this.state.songKey);
          }
        }
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
      if (this.state.isSudoWhitelisted) {
        return `bash -c "sudo ./rocksniff_mac off"` // investigate why is chdir to tools not working
      }
      else {
        return `bash -c "./rocksniff_mac off"` // investigate why is chdir to tools not working
      }
    }
    return "echo 'no pids'"
  }

  stopTracking = async (reset = true) => {
    if (this.fetchrstimer) clearInterval(this.fetchrstimer);
    console.log("stop tracking");
    const killcmd = await this.killPIDs(await this.findPID());
    console.log("kill command: " + killcmd);
    this.setState({ tracking: 0 });
    if (killcmd.includes("no pids")) {
      return;
    }
    const rskiller = killcmd;
    const cwd = window.dirname + "/tools/"
    window.process.chdir(cwd);
    const options = { name: 'RockSniffer', cwd };
    const exec = window.os.platform() === "win32" || this.state.isSudoWhitelisted ? window.exec : window.sudo.exec;
    exec(
      rskiller,
      options,
      (error, stdout, stderr) => {
        if (error) { console.log("stop-track-stderr: " + error) }
        if (stdout) { console.log('stop-track-stdout: ' + stdout) }
        window.process.chdir(window.dirname);
      },
    );
    //reset all values
    if (reset) {
      const artist = '';
      const song = "No Song Selected";
      const album = "";
      const aart = "";
      const timeTotal = 0;
      const timeCurrent = 0;
      this.setState({
        tracking: 0,
        song,
        artist,
        album,
        albumArt: aart,
        timeCurrent,
        timeTotal,
        songKey: '',
        persistentID: '',
        gameState: '',
        accuracy: 0,
        currentStreak: 0,
        highestStreak: 0,
        totalNotes: 0,
        notesHit: 0,
        notesMissed: 0,
        /* chart data */
        chartOptions: {
          series: [{
            data: [[0, 0, 5]],
          }],
        },
        histChartOptions: {
          series: [{
            data: [[0, 0]],
          }],
        },
        phrases: [],
        notesBucket: [{
          notesHit: 0,
          notesMissed: 0,
          perfectHits: 0,
        }],
      });
      this.lastalbumname = "";
      this.lastsongkey = "";
      this.lastsongdetail = null;
      this.songkeyresults = null;
      this.albumarturl = "";
      this.persistenIDresults = null;
      this.refreshTable();
    }
    this.props.resetHeader(this.tabname);
  }

  refreshStats = async () => {
    profileWorker.startWork(false);
  }

  refresh = async () => {
    this.refreshTable();
    this.refreshRPTable();
    if (this.state.tracking === 2) {
      this.handleTracking();
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

  handleRPTableChange = async (type, {
    page,
    sizePerPage,
    sortField, //newest sort field
    sortOrder, // newest sort order
    filters, // an object which have current filter status per column
    data,
  }) => {
    const zeroIndexPage = page - 1
    const start = zeroIndexPage * sizePerPage;
    const output = await getSongsOwned(
      start,
      sizePerPage,
      sortField == null ? (this.state.rpsrc === "las" ? "date_las" : "date_sa") : sortField,
      sortOrder,
      "",
      "",
    )
    if (output.length > 0) {
      this.setState({ recentlyplayedsongs: output, page, rptotalSize: output[0].acount });
    }
    else {
      this.setState({ recentlyplayedsongs: output, page, rptotalSize: 0 });
    }
  }

  changeRPSrc = async () => {
    let src = ""
    if (this.state.rpsrc === "las") {
      src = "sa"
    }
    else {
      src = "las"
    }
    this.setState({ rpsrc: src }, () => this.refreshRPTable());
  }

  getPathDiv = () => {
    const def = <div className="dashboard-path no_path"> No Path Information </div>;
    //const lead = <div className="dashboard-path path_lead" />
    if (this.persistenIDresults !== null) {
      if (this.persistenIDresults.path_lead === 1) {
        return <div className="dashboard-path path_lead" />
      }
      else if (this.persistenIDresults.path_rhythm === 1) {
        return <div className="dashboard-path path_rhythm" />
      }
      else if (this.persistenIDresults.path_bass === 1) {
        return <div className="dashboard-path path_bass" />
      }
    }
    return def;
  }

  handleRecord = async () => {
    if (this.state.recording === 0) {
      //start recording
      this.setState({ recording: 1 });
      const startTime = getMinutesSecs(this.state.timeCurrent);
      const rsDevice = await window.libRecord.startRecording(
        (err) => {
          this.recordTitleRef.current.innerHTML = "Internal error while recording";
          console.log(err)
          this.failedRecording();
        }, async (filename) => {
          console.log("recording finished..", filename);
          const data = await readFile(filename);
          const wav = new window.WaveFile(data);
          const song = this.state.song.length > 0 ? this.state.song : "-"
          const endTime = getMinutesSecs(this.state.timeCurrent);
          let path = "-";
          if (this.persistenIDresults !== null) {
            if (this.persistenIDresults.path_lead === 1) path = "Lead"
            else if (this.persistenIDresults.path_rhythm === 1) path = "Rhythm"
            else if (this.persistenIDresults.path_bass === 1) path = "Bass"
          }

          let metadata = `RSLive Raw Record, Song: ${song} Arrangement: ${path}`;
          if (startTime) metadata += ` StartTime: ${startTime.minutes}:${startTime.seconds}`
          if (endTime) metadata += ` EndTIme: ${endTime.minutes}:${endTime.seconds}`

          wav.setTag("ICMT", metadata)
          await writeFile(filename, wav.toBuffer());
          const dir = filename.replace(/\\/g, '\\\\');
          //console.log(dir, metadata)

          this.recordTitleRef.current.innerHTML = `Finished Recording.. File: 
          <a style="border-bottom: 1px solid white" onclick='javascript: window.shell.showItemInFolder("${dir}")' href='#'>
          ${window.path.basename(filename)}</a>`;
          //write metadata here
        },
      );
      if (rsDevice.index > 0) {
        this.recordTitleRef.current.innerHTML = "Recording.. File: " + window.path.basename(rsDevice.fileName);
        this.setState({ recording: 2 });
        this.recordTimer = setInterval(async () => {
          if (rsDevice.index !== -1) {
            window.electronFS.stat(rsDevice.fileName, (err, stats) => {
              const size = (stats.size / 1024 / 1024).toFixed(2);
              this.recordTitleRef.current.innerHTML = `Recording.. File:  ${window.path.basename(rsDevice.fileName)}  Size: ${size}mb`;
            })
          }
        }, 1000);
      }
      else {
        switch (rsDevice.index) {
          default:
          case -1:
            this.recordTitleRef.current.innerHTML = "Failed to start recording.. Rocksmith Guitar USB Adapter not found!";
            break;
          case -2:
            this.recordTitleRef.current.innerHTML = "Error opening directory!";
            break;
        }
        this.failedRecording(true);
      }
    }
    else {
      //stop recording
      this.failedRecording();
    }
  }

  failedRecording = (nodevice = false) => {
    if (this.recordTimer != null) {
      clearInterval(this.recordTimer)
    }
    this.setState({ recording: 1 })
    window.libRecord.stopRecording();
    this.setState({ recording: 0 })
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
    const song = this.state.song && this.state.song.length > 0
      ? (this.state.song.length > 35
        ? this.state.song.substring(0, 35) + "..." : this.state.song)
      : "N/A";
    const artist = this.state.artist && this.state.artist.length > 0
      ? (this.state.artist.length > 35
        ? this.state.artist.substring(0, 35) + "..." : this.state.artist)
      : "N/A";
    const album = this.state.album && this.state.album.length > 0
      ? (this.state.album.length > 35
        ? this.state.album.substring(0, 35) + "..." : this.state.album)
      : "N/A";
    const buttonclass = "extraPadding download smallbutton ";//+ (this.state.win32 ? "" : "isDisabled");
    const updateMasteryclass = buttonclass + ((this.state.songKey.length <= 0) ? "isDisabled" : "");
    const isscoreattack = this.state.gameState.toLowerCase().includes("scoreattack");
    const livestatsstyle = isscoreattack ? " col col-md-4 ta-center dashboard-top dashboard-rslive-song-details-sa" : " col col-md-3 ta-center dashboard-top dashboard-rslive-song-details";
    const ispercent = this.state.trackingMode === "hitp" || this.state.trackingMode === "perp";
    const ishistory = this.state.trackingMode === "hist"
    const isrecord = this.state.trackingMode === "record"
    let trackingButton = null;
    const gameState = this.state.gameState === "" ? "Invalid" : this.state.gameState;
    switch (this.state.tracking) {
      default:
      case 2:
        trackingButton = (
          <button
            type="button"
            onClick={this.stopTracking}
            className={buttonclass}>
            Stop Tracking
          </button>
        );
        break;
      case 1:
        trackingButton = (
          <button
            type="button"
            onClick={this.stopTracking}
            className={buttonclass + " isDisabled"}>
            Waiting for tracking...
          </button>
        );
        break;
      case 0:
        trackingButton = (
          <button
            type="button"
            onClick={this.startTracking}
            className={buttonclass}>
            Start Tracking
          </button>
        )
        break;
    }
    let recordText = ""
    switch (this.state.recording) {
      default:
      case 0:
        recordText = "Record RAW Audio"
        break;
      case 1:
        recordText = "Please Wait.."
        break;
      case 2:
        recordText = "Stop Recording"
        break;
    }
    return (
      <div className="container-fluid">
        <div className="ta-center">
          <button
            type="button"
            onClick={() => {
              window.shell.openExternal("steam://run/221680");
            }}
            className="extraPadding download smallbutton">
            steam://run/rocksmith
          </button>
          {trackingButton}
          <button
            type="button"
            onClick={this.refreshStats}
            className={updateMasteryclass}>
            Refresh Stats
          </button>
        </div>
        <br />
        <div key="live-stats" className="row justify-content-md-center" style={{ marginTop: -30 + 'px' }}>
          {this.getPathDiv()}
          <div
            className={livestatsstyle}>
            <div>
              <span>
                GameState: {gameState + " <> Note Stats: " + ((this.state.persistentID === '' || this.state.persistentID.includes("depedency")) ? "Inactive" : "Active")}
              </span>
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
              {
                isscoreattack
                  ? (
                    <div className="flex-container" style={{ marginTop: 10 + 'px' }}>
                      <div className="flex-div">
                        Perfect Hits
                        <hr />
                        <div style={{ marginTop: -10 + 'px' }}>
                          {this.animatedNumber(this.state.perfectHits)}
                        </div>
                      </div>
                      <div className="flex-div">
                        Late Hits
                        <hr />
                        <div style={{ marginTop: -10 + 'px' }}>
                          {this.animatedNumber(this.state.lateHits)}
                        </div>
                      </div>
                      <div className="flex-div">
                        Perfect Phrases
                       <hr />
                        <div style={{ marginTop: -10 + 'px' }}>
                          {this.animatedNumber(this.state.perfectPhrases)}
                        </div>
                      </div>
                      <div className="flex-div">
                        Good Phrases
                        <hr />
                        <div style={{ marginTop: -10 + 'px' }}>
                          {this.animatedNumber(this.state.goodPhrases)}
                        </div>
                      </div>
                    </div>
                  )
                  : null
              }
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
        <div>
          <div style={{
            float: 'left',
            color: 'azure',
            position: 'relative',
            left: '5%',
            top: '22px',
          }}> Tracking Mode<sup>BETA</sup>
            <br />
            <select
              defaultValue={this.state.trackingMode}
              style={{ marginLeft: '-13px', textAlignLast: 'center', width: '110%' }}
              onChange={(e) => {
                this.setState({ trackingMode: e.target.value }, () => this.handleTracking())
              }}
            >
              <option value="hitp">Hit Percent</option>
              <option disabled={!isscoreattack} value="perp">Perfect Percent</option>
              <option value="hist">Progress History</option>
              <option value="record">Record Audio</option>
            </select>
          </div>
          {
            <div id="barChart" style={{ display: ispercent ? "" : "none" }}>
              <HighchartsReact
                highcharts={Highcharts}
                options={this.state.chartOptions}
                id="barChart"
              />
            </div>
          }
          {
            <div id="barChart" style={{ display: ishistory ? "" : "none" }}>
              <HighchartsReact
                highcharts={Highcharts}
                options={this.state.histChartOptions}
                id="barChart"
              />
            </div>
          }
          {
            <div id="barChart" style={{ display: isrecord ? "" : "none", textAlign: 'center' }}>
              <div style={{ position: 'relative', top: '12%' }}>
                <span ref={this.recordTitleRef} style={{ color: 'azure' }}>Not Recording...</span>
                <br />
                <button
                  type="button"
                  onClick={this.handleRecord}
                  className={buttonclass}>
                  {recordText}
                </button>
              </div>
            </div>
          }
        </div>
        <div>
          <RemoteAll
            keyField="id"
            data={this.state.songs}
            page={this.state.page}
            sizePerPage={this.state.sizePerPage}
            totalSize={this.state.totalSize}
            onTableChange={this.handleTableChange}
            columns={this.state.columns}
            rowEvents={this.rowEvents}
            rowStyle={this.rowStyle}
            paginate={false}
          />
        </div>
        <br /> <br />
        <div>
          <h2 className="ta-left" style={{ color: 'wheat' }}>
            Recently Played
          </h2>
          <div>
            <RemoteAll
              keyField="id"
              data={this.state.recentlyplayedsongs}
              page={this.state.page}
              sizePerPage={this.state.rpsizePerPage}
              totalSize={this.state.rptotalSize}
              onTableChange={this.handleRPTableChange}
              columns={this.state.rpcolumns}
              rowEvents={this.rowEvents}
              paginate
            />
          </div>
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
export default withI18n('translation')(RSLiveView)
