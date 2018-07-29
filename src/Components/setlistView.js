import React from 'react'
import PropTypes from 'prop-types';
import {
  RemoteAll, allTunings,
  unescapeFormatter, difficultyFormatter, round100Formatter, countFormmatter, badgeFormatter,
} from './songlistView';
import SongDetailView from './songdetailView';
import readProfile from '../steamprofileService';
import { addToFavorites, initSetlistPlaylistDB, getSongsFromPlaylistDB, removeSongFromSetlist, updateMasteryandPlayed, initSongsOwnedDB } from '../sqliteService';
import getProfileConfig, { updateProfileConfig, getScoreAttackConfig } from '../configService';

const { path } = window;

export default class SetlistView extends React.Component {
  constructor(props) {
    super(props);
    this.tabname = "tab-setlist"
    this.state = {
      songs: [],
      page: 1,
      totalSize: 0,
      sizePerPage: 100,
      showDetail: false,
      showSong: '',
      showArtist: '',
      showSAStats: true,
    };
    this.search = null;
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
        formatter: (cell, row) => {
          const str = path.basename(row.json);
          const regex = /.*(\d)\.json$/gm;
          let m;
          let addAlt = false;

          //eslint-disable-next-line
          while ((m = regex.exec(str)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
              regex.lastIndex += 1;
            }

            //eslint-disable-next-line
            m.forEach((match, groupIndex) => {
              addAlt = true;
            });
          }
          if (addAlt) {
            return <span>Alt. {cell}</span>
          }
          return <span>{cell}</span>
        },
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
        dataField: "tuning",
        text: "Tuning",
        style: (cell, row, rowIndex, colIndex) => {
          return {
            width: '5%',
            cursor: 'pointer',
          };
        },
        sort: true,
        formatter: (cell, row) => {
          const tuning = JSON.parse(unescape(row.tuning));
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
              const freq = Math.round((concertpitch * (2.0 ** (row.centoffset / 1200.0))))
              if (freq !== Math.round(concertpitch)) {
                offset = `(${freq} Hz)`
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
              return <span>{tuningkeys[i]} <span className={suffix === "" ? "hidden" : ""}>(Capo: {row.capofret}<sup>{suffix})</sup></span> {offset}</span>
            }
          }
          return <span>Custom</span>
        },
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
        classes: (cell, row, rowIndex, colIndex) => {
          const def = "iconPreview difficulty ";
          let diff = "diff_0";
          if (cell <= 20) {
            diff = "diff_0"
          }
          else if (cell >= 21 && cell <= 40) {
            diff = "diff_1"
          }
          else if (cell >= 41 && cell <= 60) {
            diff = "diff_2"
          }
          else if (cell >= 61 && cell <= 80) {
            diff = "diff_3"
          }
          else if (cell >= 81) {
            diff = "diff_4"
          }
          return def + diff;
        },
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
    this.lastsortfield = "mastery"
    this.lastsortorder = "desc"
    this.lastChildID = props.currentChildTab.id;
    this.handleTableChange("cdm", {
      page: this.state.page,
      sizePerPage: this.state.sizePerPage,
      filters: {},
    })
  }
  shouldComponentUpdate = async (nextprops, nextstate) => {
    if (nextprops.currentChildTab === null) { return false; }
    if (this.lastChildID === nextprops.currentChildTab.id) { return false; }
    this.lastChildID = nextprops.currentChildTab.id;
    const showSAStats = await getScoreAttackConfig();
    this.setState({ showSAStats });
    this.handleTableChange("cdm", {
      page: this.state.page,
      sizePerPage: this.state.sizePerPage,
      filters: {},
    })
    return true;
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
        this.lastChildID,
        `No Profile found, please update it in Settings!`,
      );
      return;
    }
    if (prfldb.length > 0) {
      this.props.updateHeader(
        this.tabname,
        this.lastChildID,
        `Decrypting ${path.basename(prfldb)}`,
      );
      const steamProfile = await readProfile(prfldb);
      const stats = steamProfile.Stats.Songs;
      await updateProfileConfig(prfldb);
      this.props.handleChange();
      this.props.updateHeader(
        this.tabname,
        this.lastChildID,
        `Song Stats Found: ${Object.keys(stats).length}`,
      );
      await initSongsOwnedDB();
      const keys = Object.keys(stats);
      let updatedRows = 0;
      for (let i = 0; i < keys.length; i += 1) {
        const stat = stats[keys[i]];
        const mastery = stat.MasteryPeak;
        const played = stat.PlayedCount;
        this.props.updateHeader(
          this.tabname,
          this.lastChildID,
          `Updating Stat for SongID:  ${keys[i]} (${i}/${keys.length})`,
        );
        // eslint-disable-next-line
        const rows = await updateMasteryandPlayed(keys[i], mastery, played);
        if (rows === 0) {
          console.log("Missing ID: " + keys[i]);
        }
        updatedRows += rows;
      }
      this.props.updateHeader(
        this.tabname,
        this.lastChildID,
        "Stats Found: " + updatedRows + ", Total Stats: " + keys.length,
      );
      const output = await getSongsFromPlaylistDB(
        this.lastChildID,
        0,
        this.state.sizePerPage,
        this.lastsortfield,
        this.lastsortorder,
        this.search.value,
      )
      this.setState({ songs: output, page: 1, totalSize: output[0].acount });
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
    if (this.lastChildID === null) { return; }
    const zeroIndexPage = page - 1
    const start = zeroIndexPage * sizePerPage;
    const output = await getSongsFromPlaylistDB(
      this.lastChildID,
      start,
      sizePerPage,
      sortField === null ? this.lastsortfield : sortField,
      sortOrder === null ? this.lastsortorder : sortOrder,
      this.search ? this.search.value : "",
    )
    if (sortField !== null) { this.lastsortfield = sortField; }
    if (sortOrder !== null) { this.lastsortorder = sortOrder; }
    if (output.length > 0) {
      this.props.updateHeader(
        this.tabname,
        this.lastChildID,
        `Songs: ${output[0].songcount}, Arrangements: ${output[0].acount}`,
      );
      this.setState({ songs: output, page, totalSize: output[0].acount });
    }
    else {
      this.props.updateHeader(
        this.tabname,
        this.lastChildID,
        `Songs: 0, Arrangements: 0`,
      );
      this.setState({ songs: output, page, totalSize: 0 });
    }
  }
  updateFavs = async () => {
    const prfldb = await getProfileConfig();
    if (prfldb === '' || prfldb === null) {
      this.props.updateHeader(
        this.tabname,
        this.lastChildID,
        `No Profile found, please update it in Settings!`,
      );
      return;
    }
    if (prfldb.length > 0) {
      this.props.updateHeader(
        this.tabname,
        this.lastChildID,
        `Decrypting ${path.basename(prfldb)}`,
      );
      const steamProfile = await readProfile(prfldb);
      const stats = steamProfile.FavoritesListRoot.FavoritesList;
      await updateProfileConfig(prfldb);
      this.props.handleChange();
      this.props.updateHeader(
        this.tabname,
        this.lastChildID,
        `Favorites Found: ${stats.length}`,
      );
      await initSetlistPlaylistDB('setlist_favorites');
      let updatedRows = 0;
      for (let i = 0; i < stats.length; i += 1) {
        const stat = stats[i];
        this.props.updateHeader(
          this.tabname,
          this.lastChildID,
          `Updating Favorite for SongKey:  ${stat} (${i}/${stats.length})`,
        );
        // eslint-disable-next-line
        const rows = await addToFavorites(stat);
        if (rows === 0) {
          console.log("Missing ID: " + stat);
        }
        updatedRows += rows;
      }
      this.props.updateHeader(
        this.tabname,
        this.lastChildID,
        "Favorites Found: " + updatedRows,
      );
    }
  }

  removeFromSetlist = async () => {
    console.log("removing ", this.state.showSong, this.state.showArtist, this.state.showAlbum);
    await removeSongFromSetlist(
      this.lastChildID,
      this.state.showSong,
      this.state.showArtist,
      this.state.showAlbum,
    );
    this.handleTableChange('filter', {
      page: 1,
      sizePerPage: this.state.sizePerPage,
      filters: { search: this.search },
      sortField: null,
      sortOrder: null,
    })
  }

  render = () => {
    const { songs, sizePerPage, page } = this.state;
    const choosepsarchstyle = "extraPadding download " + (this.state.totalSize <= 0 ? "isDisabled" : "");
    return (
      <div>
        <div
          className="centerButton list-unstyled"
          style={{
            width: 100 + '%',
            margin: "auto",
            textAlign: "center",
          }}>
          <input
            ref={(node) => { this.search = node }}
            style={{ width: 50 + '%', border: "1px solid black", padding: 5 + "px" }}
            name="search"
            onChange={this.handleSearchChange}
            placeholder="Search..."
            type="search"
          />
          <br /><br />
          {
            this.lastChildID === "setlist_favorites" ?
              <a
                onClick={this.updateFavs}
                className={choosepsarchstyle}>
                Update Favorites from RS Profile
              </a>
              :
              ""
          }
          <a
            onClick={this.updateMastery}
            className={choosepsarchstyle}>
            Update Mastery from RS Profile
          </a>
          <br />
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
            isSetlist
            removeFromSetlist={this.removeFromSetlist}
          />
        </div>
      </div>
    );
  }
}
SetlistView.propTypes = {
  // eslint-disable-next-line
  currentTab: PropTypes.object,
  // eslint-disable-next-line
  currentChildTab: PropTypes.object,
  // eslint-disable-next-line
  updateHeader: PropTypes.func,
  // eslint-disable-next-line
  resetHeader: PropTypes.func,
  handleChange: PropTypes.func,
}
SetlistView.defaultProps = {
  currentTab: null,
  currentChildTab: null,
  updateHeader: () => { },
  resetHeader: () => { },
  handleChange: () => { },
}
