import React from 'react'
import { withI18n, Trans } from 'react-i18next';
import BootstrapTable from 'react-bootstrap-table-next'
import paginationFactory from 'react-bootstrap-table2-paginator';
import filterFactory from 'react-bootstrap-table2-filter';
import ReactTooltip from 'react-tooltip'
import PropTypes from 'prop-types';
import moment from 'moment';
import {
  getSongsOwned, countSongsOwned,
  initSongsOwnedDB,
  removeFromSongsOwned, addToIgnoreArrangements,
} from '../sqliteService';
import {
  getScoreAttackConfig, getDefaultSortOptionConfig, getCustomCulumnsConfig,
} from '../configService';
import SongDetailView from './songdetailView';
import { defaultSortOption } from './settingsView';

import diff0 from '../assets/diff-icons/diff_0.svg';
import diff1 from '../assets/diff-icons/diff_1.svg';
import diff2 from '../assets/diff-icons/diff_2.svg';
import diff3 from '../assets/diff-icons/diff_3.svg';
import diff4 from '../assets/diff-icons/diff_4.svg';
import { profileWorker } from '../lib/libworker';
import { DispatcherService, DispatchEvents } from '../lib/libdispatcher';

const Fragment = React.Fragment;

export const allTunings = {
  "E Standard": [0, 0, 0, 0, 0, 0],
  "Eb Standard": [-1, -1, -1, -1, -1, -1],
  "Drop D": [-2, 0, 0, 0, 0, 0],
  "F Standard": [1, 1, 1, 1, 1, 1],
  "Eb Drop Db": [-3, -1, -1, -1, -1, -1],
  "D Standard": [-2, -2, -2, -2, -2, -2],
  "D Drop C": [-4, -2, -2, -2, -2, -2],
  "C# Standard": [-3, -3, -3, -3, -3, -3],
  "C# Drop B": [-5, -3, -3, -3, -3, -3],
  "C Standard": [-4, -4, -4, -4, -4, -4],
  "C Drop Bb": [-6, -4, -4, -4, -4, -4],
  "B Standard": [-5, -5, -5, -5, -5, -5],
  "B Drop A": [-7, -5, -5, -5, -5, -5],
  "Open A": [0, 0, 2, 2, 2, 0],
  "Open D": [-2, 0, 0, -1, -2, -2],
  "Open G": [-2, -2, 0, 0, 0, -2],
  "Open E": [0, 2, 2, 1, 0, 0],
  DADGAD: [-2, 0, 0, 0, -2, -2],
}
export const techniqueNames = {
  barreChords: "Barre Chords",
  bassPick: "Picked Bass",
  bends: "Bends",
  doubleStops: "Double Stops",
  dropDPower: "DropD Power Chords",
  fifthsAndOctaves: "Fifths & Octaves",
  fingerPicking: "Finger Picking",
  fretHandMutes: "Fret-Hand Mutes",
  harmonics: "Harmonics",
  hopo: "Hammer On/Pull Offs",
  nonStandardChords: "Non Standard Chords",
  openChords: "Open/Cowboy Chords",
  palmMutes: "Palm Mutes",
  pinchHarmonics: "Pinch Harmonics",
  powerChords: "Power Chords",
  slapPop: "Slap/Pop",
  slides: "Slides",
  sustain: "Sustain",
  syncopation: "Syncopation",
  tapping: "Tapping",
  tremolo: "Tremolo",
  twoFingerPicking: "Two Finger Picking",
  unpitchedSlides: "Unpitched Slides",
  vibrato: "Vibrato",
}
export function secondsToTime(secs) {
  secs = Math.round(secs);
  const hours = Math.floor(secs / (60 * 60));

  const dfm = secs % (60 * 60);
  const minutes = Math.floor(dfm / 60);

  const dfs = dfm % 60;
  const seconds = Math.ceil(dfs);

  const obj = {
    h: hours,
    m: minutes,
    s: seconds,
  };
  return obj;
}
export function getBadgeName(num, retClass = false) {
  switch (num) {
    case 6: return retClass ? "gp_fcs" : "FC";
    case 5: return retClass ? "gp_platinum" : "Platinum";
    case 4: return retClass ? "gp_gold" : "Gold";
    case 3: return retClass ? "gp_silver" : "Silver";
    case 2: return retClass ? "gp_bronze" : "Bronze";
    case 1: return retClass ? "gp_failed" : "Failed";
    default: return '';
  }
}
export function unescapeFormatter(cell, row, rowIndex, extraData) {
  cell = unescape(cell)
  if (cell.length > 30) {
    cell = cell.slice(0, 30) + "..."
  }
  let gnote = ""
  let lnote = "";
  if (typeof extraData !== 'undefined') {
    lnote = row.local_note ? row.local_note : "";
    if (row.id in extraData.globalNotes) {
      gnote = extraData.globalNotes[row.id];
      /*strip html*/
      const div = document.createElement("div");
      div.innerHTML = gnote;
      gnote = div.innerHTML;
    }
  }
  if (gnote === "" && lnote === "") {
    return <span key={row.id}>{cell}</span>;
  }
  else {
    return (
      <Fragment>
        <div
          style={{
            position: 'relative',
            top: 11 + 'px',
          }}
          key={row.id}>
          {cell}
        </div>
        <ReactTooltip
          id={row.id + "_gn"}
          aria-haspopup="true"
          place="right"
          type="dark"
          effect="solid"
          className="tooltipClass"
          afterShow={() => {
            const elem = document.getElementById(row.id + "_gn");
            const top = parseInt(elem.style.top, 10) + window.scrollY;
            elem.style.top = top + "px";
          }}
        >
          {
            //eslint-disable-next-line
            <div style={{ marginTop: 5 + 'px', textAlign: 'left' }} dangerouslySetInnerHTML={{
              __html: gnote,
            }} />
          }
        </ReactTooltip>
        <ReactTooltip
          id={row.id + "_ln"}
          aria-haspopup="true"
          place="right"
          type="dark"
          effect="solid"
          className="tooltipClass"
          afterShow={() => {
            const elem = document.getElementById(row.id + "_ln");
            const top = parseInt(elem.style.top, 10) + window.scrollY;
            elem.style.top = top + "px";
          }}
        >
          {
            //eslint-disable-next-line
            <div style={{ marginTop: 5 + 'px', textAlign: 'left' }} dangerouslySetInnerHTML={{
              __html: unescape(lnote),
            }} />
          }
        </ReactTooltip>
        <div
          style={{
            position: 'relative',
            top: -6 + 'px',
            left: gnote.length > 0 ? "-17px" : "0px",
            height: 100 + '%',
            width: 10 + '%',
            float: 'right',
            display: lnote.length > 0 ? "inherit" : "none",
          }}
          className="local-note"
          data-tip
          data-for={row.id + "_ln"}
          data-class="tooltipClass"
        />
        <div
          style={{
            position: 'relative',
            top: -6 + 'px',
            //left: 92 + '%',
            left: lnote.length > 0 ? "30px" : "0px",
            height: 100 + '%',
            width: 10 + '%',
            float: 'right',
            display: gnote.length > 0 ? "inherit" : "none",
          }}
          className="global-note"
          data-tip
          data-for={row.id + "_gn"}
          data-class="tooltipClass"
        />
      </Fragment>
    );
  }
}
export function difficultyFormatter(cell, row) {
  let diff = diff0;
  if (cell <= 20) {
    diff = diff0;
  }
  else if (cell > 20 && cell <= 40) {
    diff = diff1;
  }
  else if (cell > 40 && cell <= 60) {
    diff = diff2;
  }
  else if (cell > 60 && cell <= 80) {
    diff = diff3;
  }
  else if (cell > 80) {
    diff = diff4;
  }
  return (
    <div
      style={{
      }}
      title={cell.toFixed(2)}>
      <img className="diff-style" src={diff} alt="" />
    </div>
  )
}
export function round100Formatter(cell, row) {
  if (cell == null) { cell = 0; }
  cell = (cell * 100).toFixed(2);
  let color = "lightgreen";
  if (cell > 95) { color = "lightgreen" }
  else if (cell < 95 && cell > 90) { color = "#C8F749" }
  else color = "yellow";

  const width = (cell > 100 ? 100 : cell) + "%";
  return (
    <span>
      <span className="mastery">{cell}%</span>
      <span>
        <svg height="65%" width="95%">
          <rect width={width} height="100%" style={{ fill: color, strokeWidth: 2, stroke: 'rgb(0, 0, 0)' }} />
          <text x="40%" y="18" fontSize="15px">{cell} %</text>
        </svg>
      </span>
    </span>
  );
}
export function countFormmatter(cell, row) {
  if (cell == null) {
    return <span>0</span>;
  }
  return <span>{cell + row.sa_playcount}</span>;
}
export function difficultyClass(cell, row, rowIndex, colIndex) {
  return 'no-padding';
}
export function badgeFormatter(cell, row) {
  const badgeClassDefault = "col col-md-3 col-md-34 ta-center iconPreview ";
  const badgeClasses = [];
  if (row.sa_badge_easy > 10) {
    if (row.sa_fc_easy) {
      badgeClasses.push([row.sa_badge_easy, row.sa_hs_easy, "Easy", getBadgeName(6, true), getBadgeName(6, false)]);
    } else {
      badgeClasses.push([row.sa_badge_easy, row.sa_hs_easy, "Easy", getBadgeName(row.sa_badge_easy - 10, true), getBadgeName(row.sa_badge_easy - 10, false)]);
    }
  }
  if (row.sa_badge_medium > 20) {
    if (row.sa_fc_medium) {
      badgeClasses.push([row.sa_badge_medium, row.sa_hs_medium, "Medium", getBadgeName(6, true), getBadgeName(6, false)]);
    } else {
      badgeClasses.push([row.sa_badge_medium, row.sa_hs_medium, "Medium", getBadgeName(row.sa_badge_medium - 20, true), getBadgeName(row.sa_badge_medium - 20, false)]);
    }
  }
  if (row.sa_badge_hard > 30) {
    if (row.sa_fc_hard) {
      badgeClasses.push([row.sa_badge_hard, row.sa_hs_hard, "Hard", getBadgeName(6, true), getBadgeName(6, false)]);
    } else {
      badgeClasses.push([row.sa_badge_hard, row.sa_hs_hard, "Hard", getBadgeName(row.sa_badge_hard - 30, true), getBadgeName(row.sa_badge_hard - 30, false)]);
    }
  }
  if (row.sa_badge_master > 40) {
    if (row.sa_fc_master) {
      badgeClasses.push([row.sa_badge_master, row.sa_hs_master, "Master", getBadgeName(6, true), getBadgeName(6, false)]);
    } else {
      badgeClasses.push([row.sa_badge_master, row.sa_hs_master, "Master", getBadgeName(row.sa_badge_master - 40, true), getBadgeName(row.sa_badge_master - 40, false)]);
    }
  }
  if (badgeClasses.length > 0) {
    return (
      <div className="badge-icon-div">
        <ReactTooltip
          id={row.id + "_badge"}
          aria-haspopup="true"
          place="left"
          type="dark"
          effect="solid"
          className="tooltipClass"
          afterShow={() => {
            const elem = document.getElementById(row.id + "_badge");
            const top = parseInt(elem.style.top, 10) + window.scrollY;
            elem.style.top = top + "px";
          }}>
          <p>Score Attack Badges</p>
          <table style={{ width: 100 + '%', height: 100 + '%' }} className="tooltipTable">
            <tbody>
              {
                badgeClasses.map(([badgeCount, highScore,
                  badgeType, badgeClass, badgeName], index) => {
                  const divclass = "iconPreview gp_icon_small " + badgeClass;
                  const key = window.shortid.generate();
                  return (
                    <tr className="row" key={key}>
                      <td style={{ width: 26 + '%', textAlign: 'right' }} className="tooltip-td-pad"><b>{badgeType}: </b></td>
                      <td style={{ width: 14 + '%' }} className="tooltip-td-low-pad"><div key={badgeClass} className={divclass} alt="" /></td>
                      <td style={{ width: 30 + '%', textAlign: 'left' }} className="tooltip-td-pad">{badgeName}</td>
                      <td style={{ width: 30 + '%', textAlign: 'left' }} className="tooltip-td-pad"> {highScore.toLocaleString('en')} </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </ReactTooltip>
        <div data-tip data-for={row.id + "_badge"} data-class="tooltip-badge tooltipClass">
          <div id={row.id + "_col"} className="row2 justify-content-evenly pointer">
            {
              badgeClasses.map(([badgeCount, highScore, badgeType, badgeClass], index) => {
                let divclass = badgeClassDefault + badgeClass;
                if (badgeClasses.length > 3) divclass += " gp_small";
                else if (badgeClasses.length > 2) divclass += " gp_med";
                const key = window.shortid.generate();
                return (
                  <div key={key} className={divclass} alt="" />
                );
              })
            }
          </div>
        </div>
      </div>
    )
  }
  return <span> None </span>;
}
export function arrangmentFormatter(cell, row) {
  let arrprop = null;
  try {
    arrprop = JSON.parse(unescape(row.arrangementProperties));
  }
  catch (error) {
    return <span />
  }
  if (arrprop === null) {
    return <span />
  }
  const {
    represent, bonusArr, pathLead, pathBass, pathRhythm,
  } = arrprop
  const ignoreProp = [
    "bonusArr", "pathBass", "pathLead", "pathRhythm",
    "represent", "standardTuning",
    "routeMask",
  ];
  let arrobj = null;
  const arrinfo = [represent, bonusArr, pathLead, pathRhythm, pathBass]
  if (arrinfo.equals([1, 0, 1, 0, 0])) { arrobj = <span key={row.id + "_ai"}>Lead</span> }
  else if (arrinfo.equals([0, 1, 1, 0, 0])) { arrobj = <span key={row.id + "_ai"}>Bonus Lead</span> }
  else if (arrinfo.equals([0, 0, 1, 0, 0])) { arrobj = <span key={row.id + "_ai"}>Alternate Lead</span> }

  else if (arrinfo.equals([1, 0, 0, 1, 0])) { arrobj = <span key={row.id + "_ai"}>Rhythm</span> }
  else if (arrinfo.equals([0, 1, 0, 1, 0])) { arrobj = <span key={row.id + "_ai"}>Bonus Rhythm</span> }
  else if (arrinfo.equals([0, 0, 0, 1, 0])) { arrobj = <span key={row.id + "_ai"}>Alternate Rhythm</span> }

  else if (arrinfo.equals([1, 0, 0, 0, 1])) { arrobj = <span key={row.id + "_ai"}>Bass</span> }
  else if (arrinfo.equals([0, 1, 0, 0, 1])) { arrobj = <span key={row.id + "_ai"}>Bonus Bass</span> }
  else if (arrinfo.equals([0, 0, 0, 0, 1])) { arrobj = <span key={row.id + "_ai"}>Alternate Bass</span> }

  let arrMismatch = false;
  switch (cell) {
    case "Lead":
      if (arrprop.pathLead === 0) arrMismatch = true;
      break;
    case "Rhythm":
      if (arrprop.pathRhythm === 0) arrMismatch = true;
      break;
    case "Bass":
      if (arrprop.pathBass === 0) arrMismatch = true;
      break;
    default:
      arrMismatch = false;
      break;
  }


  const isCDLC = row.is_cdlc === "true";
  if (isCDLC) { arrobj = [arrobj, <span title="This is a custom dlc arrangement" key={row.id + "_custom"}> (C)</span>] }
  if (arrMismatch) { arrobj = [arrobj, <span title="Conflicting fields found in psarc" key={row.id + "_mismatch"}>*</span>] }
  return (
    <div>
      <ReactTooltip
        id={row.id + "_arr"}
        aria-haspopup="true"
        place="left"
        type="dark"
        effect="solid"
        className="tooltipClass"
        afterShow={(t) => {
          const elem = document.getElementById(row.id + "_arr")
          setTimeout(() => {
            const top = parseInt(elem.style.top, 10) + window.scrollY;
            elem.style.top = top + "px";
          }, 1);
        }}>
        <p>Techniques Used</p> <br />
        <table style={{ width: 100 + '%', height: 100 + '%' }} className="tooltipTable">
          <tbody>
            {
              Object.keys(arrprop).map((key, index) => {
                const val = arrprop[key];
                const properkey = key in techniqueNames ? techniqueNames[key] : key
                if (val > 0 && ignoreProp.indexOf(key) === -1) {
                  return (
                    <tr className="row" key={key + row.id}>
                      <td className="tooltip-technique-td" style={{ width: 100 + '%', textAlign: 'center' }}>{properkey}</td>
                    </tr>
                  );
                }
                return null;
              })
            }
            {
              isCDLC
                ? (
                  <tr className="row" key={"cdlc" + row.id}>
                    <td style={{ width: 100 + '%', textAlign: 'center' }}>
                      (C)ustom DLC
                    </td>
                  </tr>
                ) : null
            }
            {
              arrMismatch
                ? (
                  <React.Fragment>
                    <tr className="row conflicting-row" key={"cdlc" + row.id}>
                      <td style={{
                        width: 100 + '%',
                        textAlign: 'center',
                        color: 'red',
                      }}>
                        Conflicting Arrangement Info*
                      </td>
                    </tr>
                    <tr>
                      <td style={{ width: 100 + '%', textAlign: 'center' }}>
                        ArrangementName: {cell} <br /><br />
                        BitMask: <br /><br />
                        pathLead: {arrprop.pathLead} <br /><br />
                        pathRhythm: {arrprop.pathRhythm} <br /><br />
                        pathBass: {arrprop.pathBass} <br /><br />
                      </td>
                    </tr>
                  </React.Fragment>
                ) : null
            }
          </tbody>
        </table>
      </ReactTooltip>
      <div data-tip data-for={row.id + "_arr"} data-class="tooltip-arr tooltipClass">
        {arrobj}
      </div>
    </div>
  )
}
export function tuningFormatter(cell, row) {
  let tuning = null;
  try {
    tuning = JSON.parse(unescape(row.tuning));
  }
  catch (error) {
    return <span />
  }
  if (tuning == null) {
    return <span />
  }
  const concertpitch = 440.0;
  const {
    string0, string1, string2, string3, string4, string5,
  } = tuning;
  const combinedt = [string0, string1, string2, string3, string4, string5];
  const tuningkeys = Object.keys(allTunings);
  for (let i = 0; i < tuningkeys.length; i += 1) {
    const tuningtocheck = allTunings[tuningkeys[i]];
    if (combinedt.equals(tuningtocheck)) {
      let offset = ""
      const freq = (concertpitch * (2.0 ** (row.centoffset / 1200.0)))
      if (freq !== (concertpitch)) {
        offset = ` (${Math.floor(freq)} Hz)`
      }
      let suffix = "";
      if (row.capofret !== 0 && row.capofret !== "" && row.capofret !== "0") {
        switch (row.capofret) {
          case 1:
            suffix = "st";
            break;
          case 2:
            suffix = "nd";
            break;
          case 3:
            suffix = "rd";
            break;
          default:
            suffix = "th";
            break;
        }
      }
      return (
        <Fragment>
          <ReactTooltip
            id={row.id + "_tuning"}
            aria-haspopup="true"
            place="right"
            type="dark"
            effect="solid"
            className="tooltipClass">
            Cent Offset: {row.centoffset}
          </ReactTooltip>

          <div data-tip data-for={row.id + "_tuning"} data-class="tooltip-offset tooltipClass">
            <span>
              {tuningkeys[i]}
              <span className={suffix === "" ? "hidden" : ""}>
                (Capo: {row.capofret}<sup>{suffix})</sup>
              </span>
              {offset}
            </span>
          </div>
        </Fragment>
      )
    }
  }
  return <span>Custom {JSON.stringify(combinedt)}</span>
}
export function dateFormatter(cell, row) {
  if (cell == null || cell === 0) {
    return <span>-</span>
  }
  const m = moment.unix(cell)
  return <span>{m.fromNow()}</span>
}
export function songLengthFormatter(cell, row) {
  if (cell == null || cell === 0) {
    return <span>-</span>
  }
  const time = secondsToTime(cell)
  return <span title={cell}>{time.m}m {time.s}s</span>
}
export function lastPlayedFormatter(cell, row) {
  const dateLas = row.date_las;
  const dateSA = row.date_sa;
  if ((dateLas == null && dateSA == null) || (dateLas === 0 && dateSA === 0)) {
    return <span>-</span>
  }
  if (dateSA > dateLas) {
    const m = moment.unix(dateSA);
    return <span>{m.fromNow()} (SA) </span>
  }
  else {
    const m = moment.unix(dateLas);
    return <span>{m.fromNow()}</span>
  }
}
export function idClass(cell, row, rowIndex, colIndex) {
  return {
    width: '20%',
    cursor: 'pointer',
  };
}
export function arrClass(cell, row, rowIndex, colIndex) {
  return {
    width: '8%',
    cursor: 'pointer',
  };
}
export function tuningClass(cell, row, rowIndex, colIndex) {
  return {
    width: '8%',
    cursor: 'pointer',
  };
}
export function masteryClass(cell, row, rowIndex, colIndex) {
  return {
    width: '30%',
    cursor: 'pointer',
  };
}
export function showHighestBadge(cell, row, rowIndex, colIndex) {
  return {
    width: '10%',
  };
}
export function hideHighestBadge(cell, row, rowIndex, colIndex) {
  return {
    width: '20%',
    display: "none",
  };
}

export const RemoteAll = ({
  keyField,
  columns,
  data,
  page,
  sizePerPage,
  onTableChange,
  totalSize,
  rowEvents,
  paginate = true,
  rowStyle,
  noDataIndication = "No Songs",
  classes = "psarcTable",
  headerClasses = "",
}) => (
    <div>
      <BootstrapTable
        remote={{ pagination: true }}
        keyField={keyField}
        data={data}
        columns={columns}
        filter={filterFactory()}
        pagination={!paginate ? null : paginationFactory({
          page,
          sizePerPage,
          totalSize,
          paginationSize: 10,
          sizePerPageList: [],
        })}
        onTableChange={onTableChange}
        classes={classes}
        hover
        bordered={false}
        rowEvents={rowEvents}
        noDataIndication={noDataIndication}
        rowStyle={rowStyle}
        headerClasses={headerClasses}
      />
    </div>
  );

RemoteAll.propTypes = {
  data: PropTypes.array.isRequired,
  page: PropTypes.number.isRequired,
  totalSize: PropTypes.number.isRequired,
  sizePerPage: PropTypes.number.isRequired,
  onTableChange: PropTypes.func.isRequired,
  keyField: PropTypes.string.isRequired,
  columns: PropTypes.array.isRequired,
  rowEvents: PropTypes.object,
  rowStyle: PropTypes.func,
  paginate: PropTypes.bool,
  noDataIndication: PropTypes.string,
  classes: PropTypes.string,
};
RemoteAll.defaultProps = {
  paginate: true,
  rowEvents: {},
  rowStyle: () => { },
  noDataIndication: "No Songs",
  classes: "psarcTable",
}
/* eslint-disable */
export const BaseColumnDefs = [
  { dataField: "id", text: "ID", hidden: false, sort: false, style: idClass },
  { dataField: "song", text: "Song", hidden: true, sort: true, style: idClass, formatter: unescapeFormatter },
  { dataField: "artist", text: "Artist", hidden: true, sort: true, style: idClass, formatter: unescapeFormatter, },
  { dataField: "album", text: "Album", hidden: true, sort: true, style: idClass, formatter: unescapeFormatter, },
  { dataField: "json", text: "json", hidden: true, sort: false },
  { dataField: "arrangement", text: "Arrangement", hidden: true, sort: true, style: arrClass, formatter: arrangmentFormatter },
  { dataField: "mastery", text: "Mastery", hidden: true, sort: true, style: masteryClass, formatter: round100Formatter, },
  { dataField: "tuning_weight", text: "Tuning", hidden: true, sort: true, style: tuningClass, formatter: tuningFormatter, },
  { dataField: "count", text: "Count", hidden: true, sort: true, formatter: countFormmatter, },
  { dataField: "difficulty", text: "Difficulty", hidden: true, sort: true, classes: difficultyClass, formatter: difficultyFormatter },
  { dataField: "sa_playcount", text: "Play Count", hidden: true, sort: true },
  { dataField: "sa_hs_easy", text: "sa_hs_easy", hidden: true, sort: true },
  { dataField: "sa_hs_medium", text: "sa_hs_medium", hidden: true, sort: true },
  { dataField: "sa_hs_hard", text: "sa_hs_hard", hidden: true, sort: true },
  { dataField: "sa_hs_master", text: "sa_hs_master", hidden: true, sort: true },
  { dataField: "is_cdlc", text: "is_cdlc", hidden: true, sort: true },
  { dataField: "sa_highest_badge", text: "Badges", hidden: true, sort: true, style: showHighestBadge, headerStyle: showHighestBadge, formatter: badgeFormatter },
  { dataField: "arrangementProperties", text: "arrProp", hidden: true, sort: true },
  { dataField: "capofret", text: "capofret", hidden: true, sort: true },
  { dataField: "centoffset", text: "centoffset", hidden: true, sort: true },
  { dataField: "songLength", text: "Duration", hidden: true, sort: true, formatter: songLengthFormatter },
  { dataField: "maxNotes", text: "Notes", hidden: true, sort: true },
  { dataField: "tempo", text: "BPM", hidden: true, sort: true },
  { dataField: "date_las", text: "Last Played", hidden: true, sort: true, formatter: lastPlayedFormatter },
  { dataField: "date_sa", text: "LastPlayed", hidden: true, sort: true },
];
/* eslint-enable */

export const generateColumns = (customColumns, customData = {}, t, forceShow = []) => {
  const columns = [];
  const inCustomColumns = (dataField) => {
    for (let i = 0; i < customColumns.length; i += 1) {
      if (customColumns[i].value === dataField) return i;
    }
    return -1;
  }

  const getDefIndex = (dataField, c) => {
    for (let i = 0; i < c.length; i += 1) {
      if (c[i].dataField === dataField) return i;
    }
    return -1;
  }

  for (let i = 0; i < BaseColumnDefs.length; i += 1) {
    const matrix = BaseColumnDefs[i];
    const dataField = matrix.dataField;
    const item = {};
    item.dataField = dataField;
    item.text = t(matrix.text);
    item.style = "style" in matrix ? matrix.style : null;
    item.sort = "sort" in matrix ? matrix.sort : false;
    // check base defsfirst
    item.hidden = "hidden" in matrix ? matrix.hidden : false;
    // then check custom columns setting 
    item.hidden = (inCustomColumns(dataField) === -1);
    // then check if it needs to be forceShown eg: rsLive
    item.hidden = forceShow.includes(dataField) ? false : item.hidden;
    item.formatter = "formatter" in matrix ? matrix.formatter : null;
    switch (dataField) {
      case "song":
      case "artist":
      case "album":
        item.formatExtraData = { globalNotes: customData.globalNotes };
        break;
      case "sa_highest_badge":
        item.style = customData.showSAStats ? showHighestBadge : hideHighestBadge;
        item.headerStyle = customData.showSAStats ? showHighestBadge : hideHighestBadge;
        break;
      default:
        break;
    }
    columns.push(item);
  }

  const tmp = [...columns];
  let sorted = [];
  for (let i = 0; i < customColumns.length; i += 1) {
    const value = customColumns[i].value;
    const idx = getDefIndex(value, tmp);
    if (idx !== -1) {
      const item = tmp.splice(idx, 1);
      sorted.push(item[0]);
    }
  }
  sorted = sorted.concat(tmp);
  return sorted;
}
class SonglistView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      songs: [],
      page: 1,
      totalSize: 0,
      sizePerPage: 25,
      showDetail: false,
      showSong: '',
      showArtist: '',
      sortOptions: defaultSortOption,
      columns: BaseColumnDefs,
    };
    this.tabname = "tab-songs"
    this.childtabname = "songs-owned"
    this.search = "";
    this.rowEvents = {
      onClick: (e, row, rowIndex) => {
        this.setState({
          showDetail: true,
          showSong: row.song,
          showArtist: row.artist,
          showAlbum: row.album,
          showSongID: row.id,
        })
      },
    };
  }

  componentDidMount = async () => {
    await initSongsOwnedDB();
    const so = await countSongsOwned();
    this.props.updateHeader(
      this.tabname,
      this.childtabname,
      `Songs: ${so.songcount}, Arrangements: ${so.count}`,
    );
    const showSAStats = await getScoreAttackConfig();
    const sortOptions = await getDefaultSortOptionConfig();
    const customColumns = await getCustomCulumnsConfig();
    const columns = generateColumns(customColumns,
      { globalNotes: this.props.globalNotes, showSAStats },
      this.props.t);
    this.setState({
      totalSize: so.count, sortOptions, columns,
    });
    const key = this.tabname + "-" + this.childtabname;
    const searchData = this.props.getSearch(key);
    if (searchData === null) {
      this.handleTableChange("cdm", {
        page: this.state.page,
        sizePerPage: this.state.sizePerPage,
        filters: {},
        sortOptions,
      })
    } else {
      this.search.value = searchData.search;
      this.handleTableChange('filter', {
        page: 1,
        sizePerPage: this.state.sizePerPage,
        filters: { search: searchData.search },
        sortOptions,
      })
    }
    DispatcherService.on(DispatchEvents.PROFILE_UPDATED, this.refresh);
  }

  componentWillUnmount = () => {
    DispatcherService.off(DispatchEvents.PROFILE_UPDATED, this.refresh);
    const searchData = {
      tabname: this.tabname,
      childtabname: this.childtabname,
      search: this.search.value,
    }
    const key = searchData.tabname + "-" + searchData.childtabname;
    this.props.saveSearch(key, searchData);
  }

  handleSearchChange = (e) => {
    this.handleTableChange('filter', {
      page: 1,
      sizePerPage: this.state.sizePerPage,
      filters: { search: e.target.value },
    })
  }

  updateMastery = async () => {
    profileWorker.startWork();
  }

  refresh = async () => {
    // refresh view
    const output = await getSongsOwned(
      0,
      this.state.sizePerPage,
      "",
      "",
      this.search.value,
      document.getElementById("search_field") ? document.getElementById("search_field").value : "",
      this.state.sortOptions,
    )
    this.setState({ songs: output, page: 1, totalSize: output[0].acount });
  }

  refreshView = async () => {
    this.setState({ songs: [] });
    const sortOptions = await getDefaultSortOptionConfig();
    this.handleTableChange("cdm", {
      page: this.state.page,
      sizePerPage: this.state.sizePerPage,
      filters: {},
      sortOptions,
    })
  }

  removeFromDB = async () => {
    await removeFromSongsOwned(this.state.showSongID);
    await this.refreshView();
  }

  ignoreArrangement = async () => {
    await addToIgnoreArrangements(this.state.showSongID)
    await this.refreshView();
  }

  handleTableChange = async (type, {
    page,
    sizePerPage,
    sortField, //newest sort field
    sortOrder, // newest sort order
    filters, // an object which have current filter status per column
    data,
    sortOptions,
  }) => {
    const zeroIndexPage = page - 1
    const start = zeroIndexPage * sizePerPage;
    const output = await getSongsOwned(
      start,
      sizePerPage,
      typeof sortField === 'undefined' ? "mastery" : sortField,
      typeof sortOrder === 'undefined' ? "desc" : sortOrder,
      this.search.value,
      document.getElementById("search_field") ? document.getElementById("search_field").value : "",
      sortOptions,
    )
    if (output.length > 0) {
      this.props.updateHeader(
        this.tabname,
        this.childtabname,
        `Songs: ${output[0].songcount}, Arrangements: ${output[0].acount}`,
      );
      this.setState({ songs: output, page, totalSize: output[0].acount });
    }
    else {
      this.props.updateHeader(
        this.tabname,
        this.childtabname,
        `Songs: 0, Arrangements: 0`,
      );
      this.setState({ songs: output, page, totalSize: 0 });
    }
  }

  render = () => {
    const {
      songs, sizePerPage, page, columns, totalSize,
    } = this.state;
    const choosepsarchstyle = "extraPadding download " + (this.state.totalSize <= 0 ? "isDisabled" : "");
    return (
      <div>
        <div style={{ width: 100 + '%', margin: "auto", textAlign: "center" }}>
          <input
            ref={(node) => { this.search = node }}
            style={{ width: 50 + '%', border: "1px solid black", padding: 5 + "px" }}
            name="search"
            onChange={this.handleSearchChange}
            placeholder={this.props.t("Search") + "..."}
            type="search"
          />
          &nbsp;&nbsp;
          <select id="search_field" onChange={this.refreshView}>
            <option value="anything">{this.props.t('Anything')}</option>
            <option value="song">{this.props.t('Song')}</option>
            <option value="artist">{this.props.t('Artist')}</option>
            <option value="album">{this.props.t('Album')}</option>
            <option value="cdlc">CDLC</option>
            <option value="odlc">ODLC</option>
            <option value="id">SongID</option>
          </select>
        </div>
        <div className="centerButton list-unstyled">
          <button
            type="button"
            onClick={this.updateMastery}
            style={{
              width: 15 + '%',
            }}
            className={choosepsarchstyle}>
            <Trans i18nKey="updateMasteryFromProfile">
              Refresh Stats from Profile
            </Trans>
          </button>
        </div>
        <div>
          <RemoteAll
            keyField="id"
            data={songs}
            page={page}
            sizePerPage={sizePerPage}
            totalSize={totalSize}
            onTableChange={this.handleTableChange}
            columns={columns}
            rowEvents={this.rowEvents}
          />
        </div>
        <div>
          <SongDetailView
            song={this.state.showSong}
            artist={this.state.showArtist}
            album={this.state.showAlbum}
            showDetail={this.state.showDetail}
            close={() => this.setState({ showDetail: false })}
            removeFromDB={this.removeFromDB}
            ignoreArrangement={this.ignoreArrangement}
            isSongview
            isSetlist={false}
            songID={this.state.showSongID}
            refreshView={this.refreshView}
          />
        </div>
      </div>
    );
  }
}
SonglistView.propTypes = {
  updateHeader: PropTypes.func,
  //resetHeader: PropTypes.func,
  //handleChange: PropTypes.func,
  saveSearch: PropTypes.func,
  getSearch: PropTypes.func,
  globalNotes: PropTypes.object,
}
SonglistView.defaultProps = {
  updateHeader: () => { },
  //resetHeader: () => { },
  //handleChange: () => { },
  saveSearch: () => { },
  getSearch: () => { },
  globalNotes: {},
}
export default withI18n('translation')(SonglistView)
