import React from 'react'
import PropTypes from 'prop-types';
import { initSongsAvailableDB, isDLCInDB, addToSteamDLCCatalog, getDLCDetails, countSongsAvailable, updateOwnedInDB } from '../sqliteService';
import { RemoteAll } from './songlistView';
import { getOwnedPackages } from '../steamprofileService';
import SongDetailView from './songdetailView';
import { getSteamLoginSecureCookie } from '../configService'

export function replaceRocksmithTerms(str) {
  return str.replace("Rocksmith® 2014 Edition – Remastered –", "").replace("Rocksmith® 2014 – ", "").replace("Rocksmith® 2014 Edition – Remastered -", "").replace("Rocksmith® 2014 Edition - Remastered –", "");
}
export default class SongAvailableView extends React.Component {
  constructor(props) {
    super(props);
    this.tabname = this.props.requiredTab
    this.childtabname = this.props.requiredChildTab
    this.state = {
      dlcs: [],
      page: 1,
      totalSize: 0,
      sizePerPage: 100,
      randompackappid: '',
      randompack: '',
      showsongpackpreview: false,
    }
    this.search = "";
    this.rowEvents = {
      onClick: (e, row, rowIndex) => {
        this.setState({
          showsongpackpreview: true,
          randompackappid: unescape(row.appid),
          randompack: replaceRocksmithTerms(unescape(row.name)),
        });
      },
    };
    this.columns = [
      {
        dataField: "appid",
        text: "AppID",
        style: (cell, row, rowIndex, colIndex) => {
          return {
            width: '25%',
            cursor: 'pointer',
          };
        },
        sort: true,
      },
      {
        dataField: "name",
        text: "DLC Name",
        style: (cell, row, rowIndex, colIndex) => {
          return {
            width: '55%',
            cursor: 'pointer',
          };
        },
        formatter: (cell, row) => {
          cell = replaceRocksmithTerms(unescape(cell))
          return <span>{cell}</span>
        },
        sort: true,
      },
      {
        dataField: "release_date",
        text: "Release Date",
        style: (cell, row, rowIndex, colIndex) => {
          return {
            width: '25%',
            cursor: 'pointer',
          };
        },
        sort: true,
        formatter: (cell, row) => {
          const d = new Date(0);
          d.setUTCSeconds(cell / 1000);
          const o = d.toDateString()
          return <span>{o}</span>
        },
      },
      {
        dataField: "owned",
        text: "Owned",
        style: (cell, row, rowIndex, colIndex) => {
          return {
            width: '15%',
            cursor: 'pointer',
          };
        },
        sort: true,
      },
    ]
  }
  componentDidMount = async () => {
    await initSongsAvailableDB();
    const so = await countSongsAvailable();
    this.props.updateHeader(
      this.tabname,
      this.childtabname,
      `DLC's: ${so.count} Excluding SongPacks: ${so.count}`,
    );
    this.setState({ totalSize: so.count });
    this.handleTableChange("cdm", {
      page: this.state.page,
      sizePerPage: this.state.sizePerPage,
      filters: {},
    })
  }
  updateSteamDLCCatalog = async () => {
    const c = await window.fetch("https://store.steampowered.com/api/appdetails/?appids=221680&cc=us&l=english&v=1");
    const d = await c.json();
    const e = d["221680"].data.dlc;
    let newDLC = 0;
    await initSongsAvailableDB();
    let error = false;
    for (let i = 0; i < e.length; i += 1) {
      const dlc = e[i];
      //eslint-disable-next-line
      if (await isDLCInDB(dlc)) {
        console.log("skipping dlc with appid: " + dlc)
        continue;
      }
      else {
        //eslint-disable-next-line
        let f = null;
        try {
          //eslint-disable-next-line
          f = await window.fetch(`https://store.steampowered.com/api/appdetails/?appids=${dlc}&cc=us&l=english&v=1`);
          //eslint-disable-next-line
          const g = await f.json()
          const h = decodeURIComponent(g[dlc].data.name)
          const r = g[dlc].data.release_date.date
          this.props.updateHeader(
            this.tabname,
            this.childtabname,
            `Adding DLC AppID: ${dlc} Name: ${replaceRocksmithTerms(h)}`,
          );
          //eslint-disable-next-line
          await addToSteamDLCCatalog(dlc, escape(h), r);
          newDLC += 1;
        }
        catch (ex) {
          console.log(ex);
          this.props.updateHeader(
            this.tabname,
            this.childtabname,
            'Error: ' + f.status + " - " + f.statusText,
          );
          error = true;
          break;
        }
      }
    }
    console.log(newDLC + " dlcs added");
    if (!error) {
      this.props.updateHeader(
        this.tabname,
        this.childtabname,
        "New DLC Found: " + newDLC + ", Total DLC's " + e.length,
      );
    }
    const output = await getDLCDetails(
      0,
      this.state.sizePerPage,
      "release_date",
      "desc",
      this.search.value,
    )
    this.setState({ dlcs: output, page: 1, totalSize: output[0].acount });
  }
  updateOwnedStatus = async () => {
    const cookie = await getSteamLoginSecureCookie();
    if (cookie.length < 10 || cookie === '' || cookie == null) {
      this.props.updateHeader(
        this.tabname,
        this.childtabname,
        `Invalid Cookie,Please update Steam Login Cookie in Settings!`,
      );
      return;
    }
    const pack = await getOwnedPackages(cookie);
    let totalPackages = pack.rgOwnedApps;
    totalPackages = totalPackages.concat(pack.rgOwnedPackages);
    if (totalPackages.length === 0) {
      this.props.updateHeader(
        this.tabname,
        this.childtabname,
        `No Packages Found, is the Steam Login Cookie valid ?`,
      );
      return;
    }
    for (let i = 0; i < totalPackages.length; i += 1) {
      const pid = totalPackages[i];
      //eslint-disable-next-line
      await updateOwnedInDB(pid);
      this.props.updateHeader(
        this.tabname,
        this.childtabname,
        `Checking for Package/App ID: ${pid}`,
      );
    }
    const output = await getDLCDetails(
      0,
      this.state.sizePerPage,
      "release_date",
      "desc",
      this.search.value,
    )
    this.setState({ dlcs: output, page: 1, totalSize: output[0].acount });
    this.handleTableChange("cdm", {
      page: this.state.page,
      sizePerPage: this.state.sizePerPage,
      filters: {},
      sortField: "owned",
      sortOrder: "desc",
    })
  }
  handleSearchChange = (e) => {
    if (e.target.value === "owned") {
      this.handleTableChange('filter', {
        page: 1,
        sizePerPage: this.state.sizePerPage,
        sortField: null,
        sortOrder: null,
        owned: true,
      })
    }
    else if (e.target.value === "available") {
      this.handleTableChange('filter', {
        page: 1,
        sizePerPage: this.state.sizePerPage,
        sortField: null,
        sortOrder: null,
        owned: false,
      })
    }
    else {
      this.handleTableChange('filter', {
        page: 1,
        sizePerPage: this.state.sizePerPage,
        filters: { search: e.target.value },
        sortField: null,
        sortOrder: null,
        owned: "",
      })
    }
  }
  generateYouTube = () => {

  }
  handleTableChange = async (type, {
    page,
    sizePerPage,
    sortField, //newest sort field
    sortOrder, // newest sort order
    filters, // an object which have current filter status per column
    data,
    owned,
  }) => {
    const zeroIndexPage = page - 1
    const start = zeroIndexPage * sizePerPage;
    const output = await getDLCDetails(
      start,
      sizePerPage,
      sortField === null ? "release_date" : sortField,
      sortOrder === null ? "desc" : sortOrder,
      (owned === true || owned === false ||
        this.search.value === "owned" || this.search.value === "available") ? "" : this.search.value,
      //eslint-disable-next-line
      (this.search.value === "owned") ? 'true' : this.search.value === 'available' ? 'false' : owned,
    )
    if (output.length > 0) {
      this.props.updateHeader(
        this.tabname,
        this.childtabname,
        `DLC's: ${output[0].acount} Excluding SongPacks: ${output[0].nopackcount}`,
      );
      this.setState({ dlcs: output, page, totalSize: output[0].acount });
    }
    else {
      this.props.updateHeader(
        this.tabname,
        this.childtabname,
        `DLC's: 0 Excluding SongPacks: 0`,
      );
      this.setState({ dlcs: output, page, totalSize: 0 });
    }
  }
  render = () => {
    if (this.props.currentTab === null) {
      return null;
    } else if (this.props.currentTab.id === this.tabname &&
      this.props.currentChildTab.id === this.childtabname) {
      const ownedstyle = "extraPadding download " + (this.state.dlcs.length > 0 ? " " : "hidden");
      const { dlcs, sizePerPage, page } = this.state;
      return (
        <div>
          <div style={{ width: 100 + '%', margin: "auto", textAlign: "center" }}>
            <input
              ref={(node) => { this.search = node }}
              style={{ width: 50 + '%', border: "1px solid black", padding: 5 + "px" }}
              name="search"
              onChange={this.handleSearchChange}
              placeholder="Search... (keywords: owned, available)"
              type="search"
            />
          </div>
          <div className="centerButton list-unstyled">
            <a
              onClick={this.updateSteamDLCCatalog}
              className="extraPadding download">
              Update Rocksmith DLC Catalog
            </a>
            <a
              onClick={this.updateOwnedStatus}
              className={ownedstyle}>
              Update Owned Status
            </a>
            <a
              onClick={this.generateYouTube}
              className="extraPadding download isDisabled">
              Generate YouTube playlist
            </a>
          </div>
          <div>
            <RemoteAll
              keyField="appid"
              data={dlcs}
              page={page}
              classes="psarcTable"
              sizePerPage={sizePerPage}
              totalSize={this.state.totalSize}
              onTableChange={this.handleTableChange}
              columns={this.columns}
              rowEvents={this.rowEvents}
            />
          </div>
          <div>
            <SongDetailView
              song={this.state.randompack}
              artist="Rocksmith"
              album="Steam"
              showDetail={this.state.showsongpackpreview}
              close={() => this.setState({ showsongpackpreview: false })}
              isSongview
              isSongpack
              dlcappid={this.state.randompackappid}
              isSetlist={false}
            />
          </div>
        </div>
      );
    }
    return null;
  }
}

SongAvailableView.propTypes = {
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
  // eslint-disable-next-line
  handleChange: PropTypes.func,
}
SongAvailableView.defaultProps = {
  currentTab: null,
  currentChildTab: null,
  requiredTab: '',
  requiredChildTab: '',
  sqliteTable: '',
  updateHeader: () => { },
  resetHeader: () => { },
  handleChange: () => { },
}
