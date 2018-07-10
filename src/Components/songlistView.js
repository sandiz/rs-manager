import React from 'react'
import BootstrapTable from 'react-bootstrap-table-next'
import paginationFactory from 'react-bootstrap-table2-paginator';
import filterFactory from 'react-bootstrap-table2-filter';
import PropTypes from 'prop-types';
import readProfile from '../steamprofileService';
import { initSetlistPlaylistDB, getSongsOwned, countSongsOwned, updateMasteryandPlayed, initSongsOwnedDB, addToFavorites } from '../sqliteService';
import getProfileConfig, { updateProfileConfig } from '../configService';
import SongDetailView from './songdetailView';

const { path } = window;

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
//eslint-disable-next-line
export const RemoteAll = ({ keyField, columns, data, page, sizePerPage, onTableChange, totalSize, rowEvents }) => (
  <div>
    <BootstrapTable
      remote={{ pagination: true }}
      keyField={keyField}
      data={data}
      columns={columns}
      filter={filterFactory()}
      pagination={paginationFactory({
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
};
export default class SonglistView extends React.Component {
  constructor(props) {
    super(props);
    this.tabname = this.props.requiredTab
    this.childtabname = this.props.requiredChildTab
    this.state = {
      songs: [],
      page: 1,
      totalSize: 0,
      sizePerPage: 25,
      showDetail: false,
      showSong: '',
      showArtist: '',
    };
    this.lastsortfield = "song";
    this.lastsortorder = "asc";
    this.search = "";
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
  }
  componentDidMount = async () => {
    await initSongsOwnedDB();
    const so = await countSongsOwned();
    this.props.updateHeader(
      this.tabname,
      this.childtabname,
      `Songs: ${so.songcount}, Arrangements: ${so.count}`,
    );
    this.setState({ totalSize: so.count });
    this.handleTableChange("cdm", {
      page: this.state.page,
      sizePerPage: this.state.sizePerPage,
      filters: {},
    })
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
      await updateProfileConfig(prfldb);
      this.props.handleChange();
      this.props.updateHeader(
        this.tabname,
        this.childtabname,
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
          this.childtabname,
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
        this.childtabname,
        "Stats Found: " + updatedRows + ", Total Stats: " + keys.length,
      );
      const output = await getSongsOwned(
        0,
        this.state.sizePerPage,
        this.lastsortfield,
        this.lastsortorder,
        this.search.value,
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
        // eslint-disable-next-line
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
    )
    if (sortField !== null) { this.lastsortfield = sortField; }
    if (sortOrder !== null) { this.lastsortorder = sortOrder; }
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
    if (this.props.currentTab === null) {
      return null;
    } else if (this.props.currentTab.id === this.tabname &&
      this.props.currentChildTab.id === this.childtabname) {
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
          </div>
          <div className="centerButton list-unstyled">
            <a
              onClick={this.updateFavs}
              className={choosepsarchstyle}>
              Update Favorites from RS Profile
            </a>
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
              isSongview
              isSetlist={false}
            />
          </div>
        </div>
      );
    }
    return null;
  }
}
SonglistView.propTypes = {
  currentTab: PropTypes.object,
  currentChildTab: PropTypes.object,
  requiredTab: PropTypes.string,
  requiredChildTab: PropTypes.string,
  // eslint-disable-next-line
  sqliteTable: PropTypes.string,
  // eslint-disable-next-line
  updateHeader: PropTypes.func,
  // eslint-disable-next-line
  resetHeader: PropTypes.func,
  handleChange: PropTypes.func,
}
SonglistView.defaultProps = {
  currentTab: null,
  currentChildTab: null,
  requiredTab: '',
  requiredChildTab: '',
  sqliteTable: '',
  updateHeader: () => { },
  resetHeader: () => { },
  handleChange: () => { },
}
