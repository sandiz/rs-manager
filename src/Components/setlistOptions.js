import React from 'react'
import PropTypes from 'prop-types';
import { enableScroll, forceNoScroll } from './songdetailView';
import { deleteRSSongList, createRSSongList, executeRawSql } from '../sqliteService';
import { allTunings } from './songlistView';

const Fragment = React.Fragment;
const anyTunings = ["any_standard", "any_non_standard", "any_open", "any_drop"];

export function generateTunings() {
  const tunings = {}
  const tuningkeys = Object.keys(allTunings);
  for (let i = 0; i < tuningkeys.length; i += 1) {
    const t = allTunings[tuningkeys[i]];
    const tuningsJSON = `{"string0":${t[0]},"string1":${t[1]},"string2":${t[2]},"string3":${t[3]},"string4":${t[4]},"string5":${t[5]}}`;
    const escaped = escape(tuningsJSON);
    tunings[tuningkeys[i]] = escaped;
  }
  return tunings;
}

function generateAnyTuningSql(filter) {
  const tunings = generateTunings();

  const allStandardTunings = [
    "E Standard", "Eb Standard", "F Standard",
    "D Standard", "C# Standard", "C Standard",
    "B Standard",
  ]
  const allStandardJSON = allStandardTunings.map(e => tunings[e]);

  const allNonStandardTunings = Object.keys(allTunings).filter(
    tuning => !(allStandardTunings.includes(tuning)),
  );
  const allNonStandardJSON = allNonStandardTunings.map(e => tunings[e])

  const allOpenTunings = [
    "Open A", "Open D", "Open G", "Open E",
  ]
  const allOpenJSON = allOpenTunings.map(e => tunings[e]);

  const allDropTunings = [
    "Drop D", "Eb Drop Db", "D Drop C",
    "C# Drop B", "B Drop A",
  ]
  const allDropJSON = allDropTunings.map(e => tunings[e]);

  let tuningtoUse = []
  switch (filter.value) {
    default:
    case "any_standard":
      tuningtoUse = allStandardJSON;
      break;
    case "any_non_standard":
      tuningtoUse = allNonStandardJSON;
      break;
    case "any_open":
      tuningtoUse = allOpenJSON;
      break;
    case "any_drop":
      tuningtoUse = allDropJSON;
      break;
  }
  let sql = "("
  for (let i = 0; i < tuningtoUse.length; i += 1) {
    const tuning = tuningtoUse[i];
    if (i === tuningtoUse.length - 1) {
      sql += `tuning like '${tuning}'`
    }
    else {
      sql += `tuning like '${tuning}' OR `
    }
  }
  sql += ")"
  //const sql = `${filter.type} like '${filter.value}'`
  //console.log(sql);
  return sql
}

function generateBadgeSql(filter) {
  let mappedValue;
  let badgeRating;

  if (filter.type === "sa_badge_master") badgeRating = 40;
  else if (filter.type === "sa_badge_hard") badgeRating = 30;
  else if (filter.type === "sa_badge_medium") badgeRating = 20;
  else if (filter.type === "sa_badge_easy") badgeRating = 10;

  switch (filter.value) {
    case "failed":
      mappedValue = 1;
      break;
    case "silver":
      mappedValue = 2;
      break;
    case "bronze":
      mappedValue = 3;
      break;
    case "gold":
      mappedValue = 4;
      break;
    case "platinum":
    default:
      mappedValue = 5;
      break;
  }

  const sqlValue = badgeRating + mappedValue;
  return `(${filter.type} ${filter.cmp} ${sqlValue} AND ${filter.type} != 0) `;
}

export function generateSql(filters, count = false) {
  const countsql = count ? "count(*) as acount, count(distinct songkey) as songcount" : "*"
  let sql = `select ${countsql} from songs_owned `;
  for (let i = 0; i < filters.length; i += 1) {
    const filter = filters[i];
    if (i === 0) {
      sql += " where "
    }
    switch (filter.type) {
      case "artist":
      case "album":
      case "song":
      case "arrangement":
        sql += `${filter.type} ${filter.cmp} '%${escape(filter.value)}%' `;
        break;
      case "mastery":
        sql += `coalesce(${filter.type},0) ${filter.cmp} ${filter.value / 100} `;
        break;
      case "difficulty":
      case "count":
      case "tempo":
      case "sa_playcount":
        sql += `coalesce(${filter.type},0) ${filter.cmp} ${filter.value} `;
        break;
      case "centoffset":
        if (filter.value) sql += `${filter.type} == 0 `;
        else sql += `${filter.type} > 0 `;
        break;
      case "capofret":
        if (filter.value) sql += `${filter.type} > 0 `;
        else sql += `${filter.type} = 0 `;
        break;
      case "is_cdlc":
        sql += `${filter.type} ${filter.cmp} '${filter.value}' `;
        break;
      case "tuning":
        if (anyTunings.includes(filter.value)) {
          sql += generateAnyTuningSql(filter);
        }
        else {
          sql += `${filter.type} like '${filter.value}' `;
        }
        break;
      case "sa_badge_easy":
      case "sa_badge_medium":
      case "sa_badge_hard":
      case "sa_badge_master":
          sql += generateBadgeSql(filter);
          break;
      default:
        break;
    }
    if (i < filters.length - 1) {
      sql += `${filter.gate} `;
    }
  }
  console.log(sql);
  return sql;
}

export default class SetlistOptions extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      setlistName: '',
      isGenerated: null,
      isManual: null,
      isRSSetlist: null,
      filters: [],
      numResults: 0,
    }
    //tuning
    this.gates = ["and", "or"]
    this.fields = [
      {
        type: "artist",
        display: "Artist",
        cmp: ["like", "not like"],
      },
      {
        type: "song",
        display: "Song",
        cmp: ["like", "not like"],
      },
      {
        type: "album",
        display: "Album",
        cmp: ["like", "not like"],
      },
      {
        type: "arrangement",
        display: "Arrangement",
        cmp: ["like", "not like"],
      },
      {
        type: "mastery",
        display: "Mastery",
        cmp: [">=", "<=", "==", "<", ">"],
      },
      {
        type: "difficulty",
        display: "Difficulty",
        cmp: [">=", "<=", "==", "<", ">"],
      },
      {
        type: "count",
        display: "LAS Playcount",
        cmp: [">=", "<=", "==", "<", ">"],
      },
      {
        type: "sa_playcount",
        display: "SA Playcount",
        cmp: [">=", "<=", "==", "<", ">"],
      },
      {
        type: "tempo",
        display: "Tempo",
        cmp: [">=", "<=", "==", "<", ">"],
      },
      {
        type: "is_cdlc",
        display: "CDLC",
        cmp: ["is"],
      },
      {
        type: "tuning",
        display: "Tuning",
        cmp: ["is"],
      },
      {
        type: "centoffset",
        display: "A440",
        cmp: ["is"],
      },
      {
        type: "capofret",
        display: "Capo",
        cmp: ["is"],
      },
      {
        type: "sa_badge_easy",
        display: "SA Easy",
        cmp: [">=", "<=", "==", "<", ">"],
      },
      {
        type: "sa_badge_medium",
        display: "SA Medium",
        cmp: [">=", "<=", "==", "<", ">"],
      },
      {
        type: "sa_badge_hard",
        display: "SA Hard",
        cmp: [">=", "<=", "==", "<", ">"],
      },
      {
        type: "sa_badge_master",
        display: "SA Master",
        cmp: [">=", "<=", "==", "<", ">"],
      },
    ];
  }

  shouldComponentUpdate = async (nextprops, nextstate) => {
    if (nextprops !== this.props) {
      this.setState({
        setlistName: unescape(nextprops.info.name),
        isGenerated: nextprops.info.is_generated === "true",
        isManual: nextprops.info.is_manual === "true",
        isRSSetlist: nextprops.info.is_rssetlist === "true",
      })
      if (nextprops.info.is_manual === "true") {
        this.setState({
          numResults: 0,
          filters: [],
        });
      }
      else {
        const viewsql = nextprops.info.view_sql;
        let jsonObj = [];
        try {
          if (viewsql.length > 0) jsonObj = JSON.parse(viewsql);
        }
        catch (e) {
          jsonObj = []
        }
        this.setState({
          numResults: 0,
          filters: jsonObj,
        }, () => this.runQuery())
        // run viewsql and find results
      }
    }
    return nextprops.showOptions;
  }

  handleChange = (event) => {
    this.setState({ setlistName: event.target.value });
  }

  handleHide = () => {
    this.props.close();
    enableScroll();
  }

  handleGenerated = (e) => {
    this.setState({
      isGenerated: e.currentTarget.value === "on",
      isManual: false,
      filters: [],
    });
  }

  handleManual = (e) => {
    this.setState({
      isManual: e.currentTarget.value === "on",
      isGenerated: false,
      filters: [],
    });
  }

  generateFilterTypeOptions = (filter, index) => {
    return (
      <select defaultValue={filter.type} onChange={event => this.handleSelectChange(event, "type", index)}>
        {
          this.fields.map((field, idx) => {
            return (
              <option value={field.type} key={"type_" + filter.id + field.type}>{field.display}</option>
            );
          })
        }
      </select>
    );
  }

  generateFilterComparatorOptions = (filter, index) => {
    let selectedField = null;
    for (let i = 0; i < this.fields.length; i += 1) {
      if (this.fields[i].type === filter.type) {
        selectedField = this.fields[i];
      }
    }
    return selectedField ? (
      <select defaultValue={filter.cmp} onChange={event => this.handleSelectChange(event, "comparator", index)}>
        {
          selectedField.cmp.map((field, idx) => {
            return (
              <option value={field} key={"cmp_" + filter.id + field}>{field}</option>
            );
          })
        }
      </select>
    ) : null;
  }

  generateFilterChainOptions = (filter, index) => {
    return (
      <select defaultValue={filter.gate} onChange={event => this.handleSelectChange(event, "chain", index)}>
        {
          this.gates.map((field, idx) => {
            return (
              <option value={field} key={"chain_" + filter.id + field}>{field}</option>
            );
          })
        }
      </select>
    );
  }

  generateFilterValueOptions = (filter, index) => {
    if (filter.type === "tuning") {
      const tunings = generateTunings();
      const filtervalU = unescape(filter.value)
      let defValue = filter.value;
      try {
        if (!anyTunings.includes(defValue)) {
          JSON.parse(filtervalU);
        }
      }
      catch (e) {
        defValue = tunings["E Standard"];
        filter.value = defValue;
      }
      return (
        <select defaultValue={defValue} onChange={event => this.handleValueChange(event, index)}>
          {
            Object.keys(tunings).map((tuningkey, idx) => {
              const tuningescaped = tunings[tuningkey];
              return (
                <option value={tuningescaped} key={"tuning_" + filter.id + tuningkey}>{tuningkey}</option>
              );
            })
          }
          {
            <Fragment>
              <option value="any_standard" key={"tuning_" + filter.id + "any_s"}>Any Standard</option>
              <option value="any_non_standard" key={"tuning_" + filter.id + "any_ns"}>Any Non-Standard</option>
              <option value="any_open" key={"tuning_" + filter.id + "any_o"}>Any Open Tuning</option>
              <option value="any_drop" key={"tuning_" + filter.id + "any_d"}>Any Dropped Tuning</option>
            </Fragment>
          }
        </select>
      )
    }
    else if (filter.type === "is_cdlc" || filter.type === "capofret" || filter.type === "centoffset") {
      const defValue = filter.value;
      return (
        <input type="checkbox" defaultChecked={defValue} onChange={event => this.handleCheckboxChange(event, index)} />
      )
    }
    else if (filter.type === "sa_badge_easy" || filter.type === "sa_badge_medium" || filter.type === "sa_badge_hard" || filter.type === "sa_badge_master") {
      const defValue = filter.value;
      return (
        <select defaultValue={defValue} onChange={event => this.handleValueChange(event, index)}>
          <option value="platinum" key={filter.type + filter.id + "platinum"}>Platinum</option>
          <option value="gold" key={filter.type + filter.id + "gold"}>Gold</option>
          <option value="silver" key={filter.type + filter.id + "silver"}>Silver</option>
          <option value="bronze" key={filter.type + filter.id + "bronze"}>Bronze</option>
          <option value="failed" key={filter.type + filter.id + "failed"}>Failed</option>
        </select>
      )
    }
    return (
      <input
        key={"input_" + filter.id}
        type="text"
        defaultValue={filter.value}
        onChange={event => this.handleValueChange(event, index)}
        style={{ paddingLeft: 10 + 'px', width: 80 + '%' }} />
    )
  }

  handleSelectChange = (event, type, index) => {
    const { filters } = this.state;
    switch (type) {
      case "chain":
        filters[index].gate = event.target.value;
        break;
      case "comparator":
        filters[index].cmp = event.target.value;
        break;
      case "type": {
        filters[index].type = event.target.value;
        let selected = null;
        for (let i = 0; i < this.fields.length; i += 1) {
          const field = this.fields[i];
          if (field.type === event.target.value) selected = field;
        }
        if (selected) filters[index].cmp = selected.cmp[0];
        switch (filters[index].type) {
          case "tuning": {
            const tunings = generateTunings();
            filters[index].value = tunings["E Standard"];
          }
            break;
          default:
            filters[index].value = "";
            break;
        }
        break;
      }
      default:
        break;
    }
    this.setState({ filters });
  }

  handleValueChange = (event, index) => {
    const { filters } = this.state;
    filters[index].value = event.target.value;
    this.setState({ filters });
  }

  handleCheckboxChange = (event, index) => {
    const { filters } = this.state;
    filters[index].value = event.target.checked;
    this.setState({ filters });
  }

  saveOptions = async () => {
    console.log("save setlist: " + this.props.info.key);
    await createRSSongList(
      this.props.info.key, this.state.setlistName, this.state.isGenerated,
      this.state.isManual, JSON.stringify(this.state.filters), this.state.isRSSetlist,
    );
    this.props.refreshTabs();
    this.props.fetchMeta();
    this.handleHide();
  }

  deleteSetlist = async () => {
    console.log("delete setlist: " + this.props.info.key);
    await deleteRSSongList(this.props.info.key)
    this.props.refreshTabs();
    this.props.clearPage();
    this.handleHide();
    //delete setlist db
    //delete meta info from setlist_meta
  }

  addFilter = async () => {
    const ts = Math.round((new Date()).getTime());
    const defaultFilter = {
      type: "artist",
      cmp: "like",
      value: "",
      gate: "and",
      id: ts.toString(),
    }
    const { filters } = this.state;
    filters.push(defaultFilter);
    this.setState({ filters })
  }

  removeFilter = async (index) => {
    const { filters } = this.state;
    filters.splice(index, 1);
    this.setState({ filters })
  }

  runQuery = async () => {
    if (this.state.filters != null && this.state.filters.length > 0) {
      const sql = await generateSql(this.state.filters, true);
      try {
        const op = await executeRawSql(sql);
        this.setState({ numResults: op.acount });
      }
      catch (e) {
        console.log(e);
        this.setState({ numResults: -1 });
      }
    }
  }

  render = () => {
    const modalinfostyle = "width-75-2"
    const buttonstyle = "extraPadding download"
    if (this.props.showOptions === false) { return null; }
    forceNoScroll()
    return (
      <div ref={(ref) => { this.modal_div = ref }} id="open-modal" className="modal-window" style={{ opacity: 1, pointerEvents: "auto" }}>
        <div id="modal-info" className={modalinfostyle}>
          <a onKeyUp={this.onKeyUp} title="Close" className="modal-close" onClick={this.handleHide}>Close</a>
          <br />
          <div style={{ textAlign: 'center' }}>
            <h4 style={{ fontSize: 150 + "%", fontWeight: 'bold', marginTop: -25 + 'px' }}>
              Setlist Options
            </h4>
            <hr />
            <div style={{ fontSize: 20 + 'px' }}>
              <table style={{ width: 100 + '%' }}>
                <tbody>
                  <tr style={{ backgroundColor: 'inherit', border: 'none', color: 'black' }}>
                    <td style={{ border: 'none', width: 20 + '%', borderRight: '1px solid' }}>Name</td>
                    <td style={{ border: 'none', width: 80 + '%', textAlign: 'left' }}>
                      <input type="text" defaultValue={this.state.setlistName} onChange={this.handleChange} style={{ paddingLeft: 10 + 'px', width: 80 + '%' }} />
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: 'inherit', border: 'none', color: 'black' }}>
                    <td style={{ border: 'none', width: 20 + '%', borderRight: '1px solid' }}>Type</td>
                    <td style={{
                      border: 'none', width: 80 + '%', textAlign: 'left', fontSize: 16 + 'px',
                    }}>
                      <div>
                        <input
                          type="radio"
                          id="setlist_manual"
                          name="setlist_manual"
                          checked={this.state.isManual === true}
                          onChange={this.handleManual}
                        />
                        <label style={{ paddingLeft: 10 + 'px' }} htmlFor="setlist_manual">Manual (Add Songs manually)</label>
                      </div>
                      <div>
                        <input
                          type="radio"
                          id="setlist_generated"
                          name="setlist_generated"
                          checked={this.state.isGenerated === true}
                          onChange={this.handleGenerated}
                        />
                        <label style={{ paddingLeft: 10 + 'px' }} htmlFor="setlist_generated">Generated (Add Songs via filters)</label>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              {
                this.state.isGenerated
                  ? (
                    <div>
                      <h4>Filters</h4>
                      <hr />
                      <button
                        type="button"
                        id="settingsExpand"
                        className="navbar-btn"
                        onClick={this.addFilter}
                        style={{ float: 'right', marginTop: -62 + 'px' }}
                      >
                        <span />
                        <span />
                        <span />
                      </button>
                      {
                        this.state.filters != null && this.state.filters.length > 0
                          ? (
                            <div>
                              <table
                                className="filterTable"
                                style={{
                                  width: 100 + '%',
                                  marginTop: 30 + 'px',
                                  marginBottom: 12 + 'px',
                                }}>
                                <thead>
                                  <tr>
                                    <td>Filter Type</td>
                                    <td>Comparator</td>
                                    <td>Value</td>
                                    <td>Logic Chain</td>
                                    <td>Delete</td>
                                  </tr>
                                </thead>
                                <tbody>
                                  {
                                    this.state.filters.map((filter, index) => {
                                      return (
                                        <tr key={"row_" + filter.id}>
                                          <td style={{ width: 20 + '%' }}>
                                            {this.generateFilterTypeOptions(filter, index)}
                                          </td>
                                          <td style={{ width: 20 + '%' }}>
                                            {this.generateFilterComparatorOptions(filter, index)}
                                          </td>
                                          <td style={{ width: 40 + '%' }}>
                                            {this.generateFilterValueOptions(filter, index)}
                                          </td>
                                          {
                                            (index < this.state.filters.length - 1)
                                              ? (
                                                <td style={{ width: 15 + '%' }}>
                                                  {this.generateFilterChainOptions(filter, index)}
                                                </td>
                                              ) : <td />
                                          }
                                          <td style={{ width: 5 + '%' }}>
                                            <button
                                              type="button"
                                              id="settingsCollapse"
                                              className="navbar-btn"
                                              onClick={() => this.removeFilter(index)}
                                            >
                                              <span />
                                              <span />
                                              <span />
                                            </button>
                                          </td>
                                        </tr>
                                      )
                                    })
                                  }
                                </tbody>
                              </table>
                              <span>
                                <a
                                  href="#"
                                  onClick={this.runQuery}
                                  style={{ borderBottom: "1px solid gray" }}>
                                  Test Query
                              </a>: {this.state.numResults} arrangements.
                             </span>
                            </div>
                          )
                          : null
                      }
                    </div>
                  )
                  : null
              }
            </div>
            <div>
              <br />
              <hr />
              <a
                onClick={this.saveOptions}
                className={buttonstyle}>
                Save Options
            </a>
              <a
                onClick={this.deleteSetlist}
                className={buttonstyle}>
                Delete Setlist
            </a>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
SetlistOptions.propTypes = {
  //eslint-disable-next-line
  info: PropTypes.object,
  close: PropTypes.func,
  showOptions: PropTypes.bool,
  refreshTabs: PropTypes.func,
  fetchMeta: PropTypes.func,
  clearPage: PropTypes.func,
}
SetlistOptions.defaultProps = {
  info: {
  },
  close: () => { },
  showOptions: false,
  refreshTabs: () => { },
  fetchMeta: () => { },
  clearPage: () => { },
}
