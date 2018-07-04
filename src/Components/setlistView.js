import React from 'react'
import PropTypes from 'prop-types';
import { RemoteAll } from './songlistView';
import SongDetailView from './songdetailView';
import readProfile from '../steamprofileService';
import { addToFavorites, initSetlistPlaylistDB, getSongsFromPlaylistDB, removeSongFromSetlist, updateMasteryandPlayed, initSongsOwnedDB } from '../sqliteService';
import getProfileConfig, { updateProfileConfig } from '../configService';

const path = require('path');

function unescapeFormatter(cell, row) {
  return <span>{unescape(cell)}</span>;
}
function difficultyFormatter(cell, row) {
  return <span />;
}
function round100Formatter(cell, row) {
  if (cell == null) { cell = 0; }
  cell = (cell * 100).toFixed(2);
  if (cell >= 100) { cell = 100; }
  let color = "lightgreen";
  if (cell > 95) { color = "lightgreen" }
  else if (cell < 95 && cell > 90) { color = "#C8F749" }
  else color = "yellow";

  const width = cell + "%";
  return (<span>
    <span className="mastery">{cell}%</span>
    <span>
      <svg height="100%">
        <rect width={width} height="100%" style={{ fill: color, strokeWidth: 2, stroke: 'rgb(0, 0, 0)' }} />
        <text x="40%" y="18" fontSize="15px">{cell} %</text>
      </svg>
    </span>
  </span>);
}
function countFormmatter(cell, row) {
  if (cell == null) {
    return <span>0</span>;
  }
  return <span>{cell}</span>;
}
export default class SetlistView extends React.Component {
  constructor(props) {
    super(props);
    this.tabname = this.props.requiredTab
    this.state = {
      songs: [],
      page: 1,
      totalSize: 0,
      sizePerPage: 100,
      showDetail: false,
      showSong: '',
      showArtist: '',
    };
    this.search = null;
    this.columns = [
      {
        dataField: "id",
        text: "ID",
        style: (cell, row, rowIndex, colIndex) => {
          return {
            width: '25%',
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
            width: '25%',
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
            width: '25%',
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
            width: '25%',
            cursor: 'pointer',
          };
        },
        sort: true,
        formatter: unescapeFormatter,
      },
      {
        dataField: "arrangement",
        text: "Arrangement",
        style: (cell, row, rowIndex, colIndex) => {
          return {
            width: '15%',
            cursor: 'pointer',
          };
        },
        sort: true,
      },
      {
        dataField: "mastery",
        text: "Mastery",
        style: (cell, row, rowIndex, colIndex) => {
          return {
            width: '25%',
            cursor: 'pointer',
          };
        },
        sort: true,
        formatter: round100Formatter,
      },
      {
        dataField: "count",
        text: "Count",
        style: (cell, row, rowIndex, colIndex) => {
          return {
            width: '10%',
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
            width: '10%',
          };
        },
        sort: true,
        formatter: difficultyFormatter,
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
    this.lastChildID = ""
    this.lastsortfield = "mastery"
    this.lastsortorder = "desc"
  }

  shouldComponentUpdate = async (nextprops, nextstate) => {
    if (nextprops.currentChildTab === null) { return false; }
    if (this.lastChildID === nextprops.currentChildTab.id) { return false; }
    if (nextprops.currentChildTab.id.indexOf("setlist_") === -1) { return false; }
    this.lastChildID = nextprops.currentChildTab.id;
    await this.handleTableChange("cdm", {
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
    if (this.props.currentTab === null) {
      return null;
    } else if (this.props.currentTab.id === this.tabname) {
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
    return null;
  }
}
SetlistView.propTypes = {
  currentTab: PropTypes.object,
  // eslint-disable-next-line
  currentChildTab: PropTypes.object,
  requiredTab: PropTypes.string,
  // eslint-disable-next-line
  updateHeader: PropTypes.func,
  // eslint-disable-next-line
  resetHeader: PropTypes.func,
  handleChange: PropTypes.func,
}
SetlistView.defaultProps = {
  currentTab: null,
  currentChildTab: null,
  requiredTab: '',
  updateHeader: () => { },
  resetHeader: () => { },
  handleChange: () => { },
}
