import React from 'react'
import BootstrapTable from 'react-bootstrap-table-next'
import paginationFactory from 'react-bootstrap-table2-paginator';
import filterFactory from 'react-bootstrap-table2-filter';
import ReactTooltip from 'react-tooltip'
import PropTypes from 'prop-types';
import moment from 'moment';
import readProfile from '../steamprofileService';
import {
  initSetlistPlaylistDB, getSongsOwned, countSongsOwned, updateMasteryandPlayed,
  initSongsOwnedDB, addToFavorites, updateScoreAttackStats,
  removeFromSongsOwned, addToIgnoreArrangements,
} from '../sqliteService';
import getProfileConfig, { updateProfileConfig, getScoreAttackConfig } from '../configService';
import SongDetailView from './songdetailView';

const { path } = window;

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
  "B Standard": [-5, -5, -5, -5, -5, -5],
  "B Drop A": [-7, -5, -5, -5, -5, -5],
  "Open A": [0, 0, 2, 2, 2, 0],
  "Open D": [-2, 0, 0, -1, -2, -2],
  "Open G": [-2, -2, 0, 0, 0, -2],
  "Open E": [0, 2, 2, 1, 0, 0],
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
export function unescapeFormatter(cell, row) {
  cell = unescape(cell)
  if (cell.length > 30) {
    cell = cell.slice(0, 30) + "..."
  }
  return <span>{cell}</span>;
}
export function difficultyFormatter(cell, row) {
  return (
    <span
      style={{
        fontSize: 20 + 'px',
        marginTop: 4 + 'px',
      }}
      title={cell.toFixed(2)}>
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
    </span>
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
        <svg height="100%">
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
  const def = "iconPreview difficulty ";
  let diff = "diff_0";
  if (cell <= 20) {
    diff = "diff_0"
  }
  else if (cell > 20 && cell <= 40) {
    diff = "diff_1"
  }
  else if (cell > 40 && cell <= 60) {
    diff = "diff_2"
  }
  else if (cell > 60 && cell <= 80) {
    diff = "diff_3"
  }
  else if (cell > 80) {
    diff = "diff_4"
  }
  return def + diff;
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
      <div>
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
                  return (
                    <tr className="row" key={badgeClass}>
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
          <div id={row.id + "_col"} className="row justify-content-md-center pointer">
            {
              badgeClasses.map(([badgeCount, highScore, badgeType, badgeClass], index) => {
                const divclass = badgeClassDefault + badgeClass;
                return (
                  <div key={badgeClass} className={divclass} alt="" />
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
    "represent", "routeMask", "standardTuning",
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

  const isCDLC = row.is_cdlc === "true";
  if (isCDLC) { arrobj = [arrobj, <span key={row.id + "_custom"}> (C)</span>] }
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
                const properkey = key in techniqueNames ? techniqueNames[key] : ""
                if (val > 0 && ignoreProp.indexOf(key) === -1) {
                  return (
                    <tr className="row" key={key + row.id}>
                      <td style={{ width: 100 + '%', textAlign: 'center' }}>{properkey}</td>
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
                      Custom DLC
                    </td>
                  </tr>
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
        offset = `(${Math.floor(freq)} Hz)`
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
      return <span title={cell}>{tuningkeys[i]}<span className={suffix === "" ? "hidden" : ""}>(Capo: {row.capofret}<sup>{suffix})</sup></span> {offset}</span>
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
        classes="psarcTable"
        hover
        bordered={false}
        rowEvents={rowEvents}
        noDataIndication="No Songs"
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
  paginate: PropTypes.bool,
};
RemoteAll.defaultProps = {
  paginate: true,
  rowEvents: {},
}
export default class SonglistView extends React.Component {
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
      showSAStats: true,
    };
    this.tabname = "tab-songs"
    this.childtabname = "songs-owned"
    this.lastsortfield = "song";
    this.lastsortorder = "asc";
    this.search = "";
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
        text: "Mastery",
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
        dataField: "tuning_weight",
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
        dataField: "is_cdlc",
        text: 'IS CDLC',
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
    this.setState({ totalSize: so.count, showSAStats });

    const key = this.tabname + "-" + this.childtabname;
    const searchData = this.props.getSearch(key);

    if (searchData === null) {
      this.handleTableChange("cdm", {
        page: this.state.page,
        sizePerPage: this.state.sizePerPage,
        filters: {},
      })
    } else {
      this.search.value = searchData.search;
      this.handleTableChange('filter', {
        page: 1,
        sizePerPage: this.state.sizePerPage,
        filters: { search: searchData.search },
        sortField: searchData.sortfield,
        sortOrder: searchData.sortorder,
      })
    }
  }

  componentWillUnmount = () => {
    const searchData = {
      tabname: this.tabname,
      childtabname: this.childtabname,
      search: this.search.value,
      sortfield: this.lastsortfield,
      sortorder: this.lastsortorder,
    }
    const key = searchData.tabname + "-" + searchData.childtabname;
    this.props.saveSearch(key, searchData);
  }

  handleSearchChange = (e) => {
    this.handleTableChange('filter', {
      page: 1,
      sizePerPage: this.state.sizePerPage,
      filters: { search: e.target.value },
      sortField: null,
      sortOrder: null,
    })
  }

  updateMastery = async () => {
    const prfldb = await getProfileConfig();
    if (prfldb === '' || prfldb === null) {
      this.props.updateHeader(
        this.tabname,
        this.childtabname,
        `No Profile found, please update it in Settings!`,
      );
      return;
    }

    if (prfldb.length > 0) {
      this.props.updateHeader(
        this.tabname,
        this.childtabname,
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
        this.childtabname,
        `Song Stats Found: ${total}`,
      );
      await initSongsOwnedDB();
      let keys = Object.keys(stats);
      let updatedRows = 0;
      //find mastery stats
      for (let i = 0; i < keys.length; i += 1) {
        const stat = stats[keys[i]];
        const mastery = stat.MasteryPeak;
        const played = stat.PlayedCount;
        this.props.updateHeader(
          this.tabname,
          this.childtabname,
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

      // refresh view
      const output = await getSongsOwned(
        0,
        this.state.sizePerPage,
        this.lastsortfield,
        this.lastsortorder,
        this.search.value,
        document.getElementById("search_field") ? document.getElementById("search_field").value : "",
      )
      this.setState({ songs: output, page: 1, totalSize: output[0].acount });
    }
  }

  updateFavs = async () => {
    const prfldb = await getProfileConfig();
    if (prfldb === '' || prfldb === null) {
      this.props.updateHeader(
        this.tabname,
        this.childtabname,
        `No Profile found, please update it in Settings!`,
      );
      return;
    }
    if (prfldb.length > 0) {
      this.props.updateHeader(
        this.tabname,
        this.childtabname,
        `Decrypting ${path.basename(prfldb)}`,
      );
      const steamProfile = await readProfile(prfldb);
      const stats = steamProfile.FavoritesListRoot.FavoritesList;
      await updateProfileConfig(prfldb);
      this.props.handleChange();
      this.props.updateHeader(
        this.tabname,
        this.childtabname,
        `Favorites Found: ${stats.length}`,
      );
      await initSetlistPlaylistDB('setlist_favorites');
      let updatedRows = 0;
      for (let i = 0; i < stats.length; i += 1) {
        const stat = stats[i];
        this.props.updateHeader(
          this.tabname,
          this.childtabname,
          `Updating Favorite for SongKey:  ${stat} (${i}/${stats.length})`,
        );
        /* loop await */ // eslint-disable-next-line
        const rows = await addToFavorites(stat);
        if (rows === 0) {
          console.log("Missing ID: " + stat);
        }
        updatedRows += rows;
      }
      this.props.updateHeader(
        this.tabname,
        this.childtabname,
        "Favorites Found: " + updatedRows,
      );
    }
  }

  refreshView = async () => {
    this.handleTableChange("cdm", {
      page: this.state.page,
      sizePerPage: this.state.sizePerPage,
      filters: {},
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
  }) => {
    const zeroIndexPage = page - 1
    const start = zeroIndexPage * sizePerPage;
    const output = await getSongsOwned(
      start,
      sizePerPage,
      sortField === null ? this.lastsortfield : sortField,
      sortOrder === null ? this.lastsortorder : sortOrder,
      this.search.value,
      document.getElementById("search_field") ? document.getElementById("search_field").value : "",
    )
    if (sortField !== null && typeof sortField !== 'undefined') { this.lastsortfield = sortField; }
    if (sortOrder !== null && typeof sortField !== 'undefined') { this.lastsortorder = sortOrder; }
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
    const { songs, sizePerPage, page } = this.state;
    const choosepsarchstyle = "extraPadding download " + (this.state.totalSize <= 0 ? "isDisabled" : "");
    return (
      <div>
        <div style={{ width: 100 + '%', margin: "auto", textAlign: "center" }}>
          <input
            ref={(node) => { this.search = node }}
            style={{ width: 50 + '%', border: "1px solid black", padding: 5 + "px" }}
            name="search"
            onChange={this.handleSearchChange}
            placeholder="Search..."
            type="search"
          />
          &nbsp;&nbsp;
          <select id="search_field" onChange={this.refreshView}>
            <option value="anything">Anything</option>
            <option value="song">Song</option>
            <option value="artist">Artist</option>
            <option value="album">Album</option>
            <option value="cdlc">CDLC</option>
            <option value="odlc">ODLC</option>
            <option value="id">SongID</option>
          </select>
        </div>
        <div className="centerButton list-unstyled">
          <a
            onClick={this.updateMastery}
            className={choosepsarchstyle}>
            Update Mastery from RS Profile
          </a>
        </div>
        <div>
          <RemoteAll
            keyField="id"
            data={songs}
            page={page}
            sizePerPage={sizePerPage}
            totalSize={this.state.totalSize}
            onTableChange={this.handleTableChange}
            columns={this.columns}
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
          />
        </div>
      </div>
    );
  }
}
SonglistView.propTypes = {
  updateHeader: PropTypes.func,
  //resetHeader: PropTypes.func,
  handleChange: PropTypes.func,
  saveSearch: PropTypes.func,
  getSearch: PropTypes.func,
}
SonglistView.defaultProps = {
  updateHeader: () => { },
  resetHeader: () => { },
  handleChange: () => { },
  saveSearch: () => { },
  getSearch: () => { },
}
