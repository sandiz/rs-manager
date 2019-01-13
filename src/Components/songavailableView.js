import React from 'react'
import PropTypes from 'prop-types';
import DatePicker from 'react-datepicker';
import moment from 'moment';
import 'react-datepicker/dist/react-datepicker.css';

import {
  initSongsAvailableDB, isDLCInDB, addToSteamDLCCatalog, getDLCDetails,
  countSongsAvailable, updateOwnedInDB, updateAcquiredDate,
  getAppID, countAppID, updateAcquiredDateByAppID, getUntaggedDLC, addTag,
} from '../sqliteService';
import { RemoteAll } from './songlistView';
import { getOwnedPackages, getOwnedHistory, getTrackTags } from '../steamprofileService';
import SongDetailView from './songdetailView';
import { getSteamLoginSecureCookie, getSessionIDConfig } from '../configService'

const parse = require('csv-parse/lib/es5/sync');


export function decodeEntity(str) {
  const elem = document.createElement('textarea');
  elem.innerHTML = str;
  return elem.value;
}
export function replaceRocksmithTerms(str) {
  return decodeEntity(str.replace("Rocksmith® 2014 Edition – Remastered –", "")
    .replace("Rocksmith® 2014 – ", "")
    .replace("Rocksmith® 2014 Edition – Remastered -", "")
    .replace("Rocksmith® 2014 Edition - Remastered –", "")
    .replace("Rocksmith 2014 -", "")
    .replace("Rocksmith -", "")
    .replace("Rocksmith 2014 Edition - Remastered -", "")
    .replace("Rocksmith® 2014 Edition - Remastered -", "")
    .replace("Rocksmith&amp;reg; 2014 Edition &amp;ndash; Remastered &amp;ndash;", "")
    .replace("Rocksmith 2014", "")
    .replace("Rocksmith® 2014 -", "")
    .replace("Rocksmith\u00ae 2014 Edition  - Remastered \u2013", "")
    .replace("Rocksmith\u0099 - ", "")
    .replace("Rocksmith\u0099 - ", "")
    .replace("Rocksmith\u00ae 2014 Edition \u2013 Remastered \u2013", "")
    .replace("Rocksmith&amp;reg; 2014 Edition &amp;ndash; Remastered &amp;ndash;", "")
    .replace('\\"', "")
    .replace('\\""', "")
    .replace(/[“”‘’]/g, '') //remove fancy quotes
    .replace(/\u2013|\u2014/g, "-") //remove emdash
    .replace(/ +(?= )/g, '') //remove multi spaces
    .replace(/["']/g, '')
    .trim());
}
export default class SongAvailableView extends React.Component {
  constructor(props) {
    super(props);
    this.tabname = "tab-songs"
    this.childtabname = "songs-available"
    this.state = {
      dlcs: [],
      page: 1,
      totalSize: 0,
      sizePerPage: 100,
      randompackappid: '',
      randompack: '',
      showsongpackpreview: false,
      fetchingTags: false,
    }
    this.search = "";
    this.rowEvents = {
      onClick: (e, row, rowIndex) => {
        if (e.target.className.includes("react-datepicker")) {
          return;
        }
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
            width: '15%',
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
            width: '45%',
            cursor: 'pointer',
          };
        },
        formatter: (cell, row) => {
          cell = replaceRocksmithTerms(unescape(cell))
          //const tags = await getAllTags(row.appid);
          //console.log(tags);
          //console.log(row.tags);
          const tags = [];
          if (row.tags) {
            const splittags = row.tags.split(",");
            for (let i = 0; i < splittags.length; i += 1) {
              const tag = splittags[i];
              tags.push(<a
                key={tag}
                className="badge badge-dark"
                style={{
                  color: 'white',
                  marginRight: 5 + 'px',
                }}
              > {tag} </a>)
            }
          }
          return (
            <div>
              <span style={{
                float: 'left',
                marginTop: 4 + 'px',
                marginLeft: 2 + 'px',
              }}> {cell} </span>
              <span style={{
                float: 'right',
              }}> {tags} </span>
            </div>
          );
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
          const d = moment.unix(cell / 1000);
          return (
            <div>
              <DatePicker
                customInput={<DateAcquiredInput />}
                selected={d}
                readOnly
                dateFormat="ddd ll" />
            </div>
          )
        },
      },
      {
        dataField: "acquired_date",
        text: "Acquired Date",
        style: (cell, row, rowIndex, colIndex) => {
          return {
            width: '25%',
            cursor: 'pointer',
          };
        },
        sort: true,
        formatter: (cell, row) => {
          if (typeof cell === 'undefined' || cell === null) {
            return (
              <div>
                <DatePicker
                  //placeholderText="---"
                  customInput={<DateAcquiredInput />}
                  onChange={t => this.updateSingleAcquireDate(cell, row, t)}
                  onChangeRaw={
                    (event) => {
                      //this.handleChangeRaw(event.target.value);
                      event.stopPropagation();
                    }
                  }
                  popperModifiers={{
                    offset: {
                      enabled: true,
                      offset: '5px, 10px',
                    },
                    preventOverflow: {
                      enabled: true,
                      escapeWithReference: false,
                      boundariesElement: 'viewport',
                    },
                  }}
                  dateFormat="ddd ll" />
              </div>);
          }
          const d = moment.unix(cell / 1000);
          //d.setUTCSeconds(cell / 1000);
          //const o = d.toDateString()
          return (
            <div>
              <DatePicker
                customInput={<DateAcquiredInput />}
                selected={d}
                onChange={t => this.updateSingleAcquireDate(cell, row, t)}
                dateFormat="ddd ll" />
            </div>);
        },
      },
      {
        dataField: "owned",
        text: "Owned",
        style: (cell, row, rowIndex, colIndex) => {
          return {
            width: '15%',
            cursor: 'pointer',
            backgroundColor: cell === "true" ? 'wheat' : 'inherit',
            color: cell === "true" ? 'black' : 'inherit',
          };
        },
        sort: true,
      },
    ]
  }

  componentDidMount = async () => {
    await initSongsAvailableDB();
    let so = await countSongsAvailable();
    if (so.count === 0) {
      this.props.updateHeader(
        this.tabname,
        this.childtabname,
        `Initializing Steam DLC List with offline copy, Please Wait...`,
      );
      const lr = new window.linereader(window.dirname + "/../songs_available_steam.csv");
      lr.on('error', (err) => {
        console.log(err);
      });

      lr.on('line', async (line) => {
        // pause emitting of lines...
        lr.pause();

        const items = parse(line)[0];
        const appid = items[0]
        const name = items[1]
        const rdate = Math.trunc(items[2]);
        this.props.updateHeader(
          this.tabname,
          this.childtabname,
          "Updating from offline copy, Song: " + name,
        )
        await addToSteamDLCCatalog(appid, replaceRocksmithTerms(name), rdate, true);
        lr.resume();
      });

      lr.on('end', async () => {
        // All lines are read, file is closed now.
        so = await countSongsAvailable();
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
      });

      return;
    }
    this.props.updateHeader(
      this.tabname,
      this.childtabname,
      `DLC's: ${so.count} Excluding SongPacks: ${so.count}`,
    );
    this.setState({ totalSize: so.count });

    const key = this.tabname + "-" + this.childtabname;
    const searchData = this.props.getSearch(key);

    if (searchData == null) {
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
      })
    }
  }

  componentWillUnmount = () => {
    const search = {
      tabname: this.tabname,
      childtabname: this.childtabname,
      search: this.search.value,
    }
    const key = search.tabname + "-" + search.childtabname;
    this.props.saveSearch(key, search);
  }

  updateSingleAcquireDate = async (cell, row, selectedMoment) => {
    console.log(cell, row, selectedMoment.format("ddd ll"));
    const d = selectedMoment.toDate();
    await updateAcquiredDateByAppID(row.appid, Date.parse(d))
    //update appid with date
    //refresh view
    if (this.search.value === "owned") {
      await this.handleTableChange('filter', {
        page: 1,
        sizePerPage: this.state.sizePerPage,
        sortField: null,
        sortOrder: null,
        owned: true,
      })
    }
    else if (this.search.value === "available") {
      await this.handleTableChange('filter', {
        page: 1,
        sizePerPage: this.state.sizePerPage,
        sortField: null,
        sortOrder: null,
        owned: false,
      })
    }
    else {
      await this.handleTableChange('filter', {
        page: 1,
        sizePerPage: this.state.sizePerPage,
        filters: { search: this.search.value },
        sortField: null,
        sortOrder: null,
        owned: "",
      })
    }
    this.props.updateHeader(
      this.tabname,
      this.childtabname,
      `Updated date for ${row.appid}: ${d} `,
    );
  }

  updateSteamDLCCatalog = async () => {
    this.props.updateHeader(
      this.tabname,
      this.childtabname,
      `Fetching Steam DLC Data...`,
    );
    try {
      const c = await window.fetch("https://store.steampowered.com/api/appdetails/?appids=221680&cc=us&l=english&v=1");
      const d = await c.json();
      let e = d["221680"].data.dlc;

      const c1 = await window.fetch("https://store.steampowered.com/api/appdetails/?appids=205190&cc=us&l=english&v=1");
      const d1 = await c1.json();
      const e1 = d1["205190"].data.dlc;

      e = e.concat(e1);
      let newDLC = 0;
      await initSongsAvailableDB();
      let error = false;
      for (let i = 0; i < e.length; i += 1) {
        const dlc = e[i];
        /* loop await */ // eslint-disable-next-line
        if (await isDLCInDB(dlc)) {
          console.log("skipping dlc with appid: " + dlc)
          continue;
        }
        else {
          let f = null;
          try {
            /* loop await */ // eslint-disable-next-line
            f = await window.fetch(`https://store.steampowered.com/api/appdetails/?appids=${dlc}&cc=us&l=english&v=1`);
            /* loop await */ // eslint-disable-next-line
            const g = await f.json()
            const h = replaceRocksmithTerms(decodeURIComponent(g[dlc].data.name))
            const r = g[dlc].data.release_date.date
            this.props.updateHeader(
              this.tabname,
              this.childtabname,
              `Adding DLC AppID: ${dlc} Name: ${h}`,
            );
            /* loop await */ // eslint-disable-next-line
            await addToSteamDLCCatalog(dlc, h, r);
            newDLC += 1;
          }
          catch (ex) {
            console.log(ex);
            this.props.updateHeader(
              this.tabname,
              this.childtabname,
              'Error: ' + f.status + " - " + f.statusText + " (try again in ~15 minutes)",
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
    catch (e) {
      console.log(e);
      this.props.updateHeader(
        this.tabname,
        this.childtabname,
        `Failed to fetch data from Steam...`,
      );
    }
  }

  updateAcquiredDates = async (tuples) => {
    const songpacks = []
    let songsupdated = 0;
    for (let i = 0; i < tuples.length; i += 1) {
      const data = tuples[i];
      const date = data[0]
      const itemname = decodeURIComponent(replaceRocksmithTerms(data[1]))
      this.props.updateHeader(
        this.tabname,
        this.childtabname,
        `Updating acquired date for ` + itemname,
      )
      //TODO: try artist/song split if not found, potential gotcha: london calling the clash
      /* loop await */ // eslint-disable-next-line
      const res = await updateAcquiredDate(Date.parse(date), itemname);
      songsupdated += res;
      if (res === 0) { console.log("failed to update for", itemname); }
      if (itemname.toLowerCase().includes("song pack")) {
        songpacks.push([date, itemname]);
      }
    }
    console.log(`TotalData: ${tuples.length} Updated: ${songsupdated} SP: ${songpacks.length}`);

    for (let i = 0; i < songpacks.length; i += 1) {
      const data = songpacks[i]
      const date = data[0]
      const itemname = data[1]
      this.props.updateHeader(
        this.tabname,
        this.childtabname,
        `Trying to find songpack items for ` + replaceRocksmithTerms(data[1]),
      )
      /* loop await */ // eslint-disable-next-line
      let appop = await getAppID(itemname);
      if (typeof appop === 'undefined') { console.log("no entry for ", itemname); continue }
      let appid = parseInt(appop.appid, 10)
      const apprd = appop.release_date
      //console.log("app id of itemname", data[1], appid, date);
      let streakbroken = false;
      const max = 10;
      let idx = 0;
      do {
        // royal blood song pack,
        // the songs in this pack onwards have child appids in increasing order
        if (appid >= 590201) {
          appid += 1
        }
        else { appid -= 1; }
        /* loop await */ // eslint-disable-next-line
        const op = await countAppID(appid, apprd)
        if (op.count > 0 && !op.name.includes("Song Pack") && idx <= max) {
          /* loop await */ // eslint-disable-next-line
          const changes = await updateAcquiredDateByAppID(appid, Date.parse(date))
          //console.log("valid appid", appid, op.name, changes);
        }
        else {
          streakbroken = true;
        }
        idx += 1
      } while (streakbroken === false)
      //console.log("-----")
    }

    this.handleTableChange("cdm", {
      page: this.state.page,
      sizePerPage: this.state.sizePerPage,
      filters: {},
      sortField: "release_date",
      sortOrder: "desc",
    })
  }

  sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  updateSongTags = async () => {
    //read
    const dlcs = await getUntaggedDLC();
    this.setState({ fetchingTags: true }, () => this.fetchTags(dlcs));
  }

  resetHeader = (msg) => {
    this.props.updateHeader(
      this.tabname,
      this.childtabname,
      msg,
    );
  }

  fetchTags = async (dlcs) => {
    this.resetHeader("Fetching tags...");
    let timedout = false;
    for (let i = 0; i < dlcs.length; i += 1) {
      if (this.state.fetchingTags === false) { this.resetHeader(""); return; }
      if (timedout) {
        console.log("max dlcs fetched");
        let time = 60;
        //sleep for 1 minute
        do {
          if (this.state.fetchingTags === false) { this.resetHeader(""); return; }
          this.resetHeader(
            `Sleeping for ${time} secs to avoid rate limiting... (${i + 1}/${dlcs.length})`,
          );
          //eslint-disable-next-line
          await this.sleep(1000);
          time -= 1;
        } while (time > 0);
        timedout = false;
      }
      const dlc = dlcs[i];
      const [artist, title] = dlc.name.split(" - ");
      if (artist && title) {
        //eslint-disable-next-line
        const tags = await getTrackTags(artist.trim(), title.trim());
        if (Array.isArray(tags)) {
          console.log(artist, title, tags);
          for (let k = 0; k < tags.length; k += 1
          ) {
            if (tags[k] && tags[k].length > 0) {
              //eslint-disable-next-line
              await addTag(dlc.appid, tags[k]);
            }
          }
          this.resetHeader(
            `Found tags for ${artist} - ${title} (${i + 1}/${dlcs.length})`,
          );
        }
        else if (tags === "timeout") {
          timedout = true;
          continue;
        }
        else {
          console.log("no tags found for ", artist, "-", title);
        }
      }
      else {
        console.log("invalid artist/title", artist, title);
      }
    }
    this.resetHeader("Finished tagging...");
    this.setState({ fetchingTags: false });
  }

  updateOwnedStatus = async () => {
    const cookie = await getSteamLoginSecureCookie();
    const cookieSess = await getSessionIDConfig();
    if (cookie.length < 10 || cookie === '' || cookie == null) {
      this.props.updateHeader(
        this.tabname,
        this.childtabname,
        `Failed to query Steam, please login with Steam in settings!`,
      );
      return;
    }
    this.props.updateHeader(
      this.tabname,
      this.childtabname,
      `Fetching acquired dates`,
    );
    const history = await getOwnedHistory(cookie, cookieSess);
    if (history == null || history.length === 0) {
      this.props.updateHeader(
        this.tabname,
        this.childtabname,
        `Error fetching history (session expired), please login with Steam again!`,
      );
      return;
    }
    await this.updateAcquiredDates(history);
    const pack = await getOwnedPackages(cookie, cookieSess);
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
      /* loop await */ // eslint-disable-next-line
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
      sortField: "release_date",
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
      (owned === true || owned === false
        || this.search.value === "owned" || this.search.value === "available") ? "" : this.search.value,
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
            style={{ width: 15 + '%' }}
            onClick={this.updateSteamDLCCatalog}
            className="extraPadding download">
            Update Rocksmith DLC Catalog
          </a>
          <a
            style={{ width: 15 + '%' }}
            onClick={this.updateOwnedStatus}
            className={ownedstyle}>
            Update Owned/Acquired Date
          </a>
          {
            !this.state.fetchingTags
              ? (
                <a
                  style={{ width: 10 + '%' }}
                  onClick={this.updateSongTags}
                  className="extraPadding download">
                  Update Song Tags
                </a>
              )
              : (
                <a
                  style={{ width: 10 + '%' }}
                  onClick={() => this.setState({ fetchingTags: false })}
                  className="extraPadding download">
                  Cancel fetch...
                </a>
              )
          }
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
            artist=""
            album=""
            showDetail={this.state.showsongpackpreview}
            close={() => this.setState({ showsongpackpreview: false })}
            isSongpack
            dlcappid={this.state.randompackappid}
            isSetlist={false}
          />
        </div>
      </div>
    );
  }
}

SongAvailableView.propTypes = {
  updateHeader: PropTypes.func,
  //resetHeader: PropTypes.func,
  //handleChange: PropTypes.func,
  saveSearch: PropTypes.func,
  getSearch: PropTypes.func,
}
SongAvailableView.defaultProps = {
  updateHeader: () => { },
  //resetHeader: () => { },
  //handleChange: () => { },
  saveSearch: () => { },
  getSearch: () => { },
}

/* custom input */ //eslint-disable-next-line
export class DateAcquiredInput extends React.Component {
  render() {
    const text = (this.props.value === "") ? "--" : this.props.value;
    return (
      <a
        className="react-datepicker-custom-input"
        onClick={this.props.onClick}>
        {text}
      </a>
    )
  }
}
DateAcquiredInput.defaultProps = {
  onClick: () => { },
  value: '',
}

DateAcquiredInput.propTypes = {
  onClick: PropTypes.func,
  value: PropTypes.string,
};
