import React from 'react'
import PropTypes from 'prop-types';
import { withI18n, Trans } from 'react-i18next';
import CreatableSelect from "react-select/creatable";

import { enableScroll, forceNoScroll } from './songdetailView';
import {
  deleteRSSongList, createRSSongList,
  executeRawSql, getFolderSetlists,
} from '../sqliteService';
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
    "Open A", "Open D", "Open G", "Open E", "DADGAD",
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
  sql += ") "
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

function generateFCSql(filter) {
  if (filter.value === true) {
    return `${filter.type} IS NOT NULL `;
  }
  else {
    return `${filter.type} IS NULL `;
  }
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
      case "local_note":
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
        else sql += `${filter.type} != 0 `;
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
          const cmp = filter.cmp === "is" ? "LIKE" : "NOT LIKE";
          sql += `${filter.type} ${cmp} '${filter.value}' `;
        }
        break;
      case "sa_badge_easy":
      case "sa_badge_medium":
      case "sa_badge_hard":
      case "sa_badge_master":
        sql += generateBadgeSql(filter);
        break;
      case "sa_fc_easy":
      case "sa_fc_medium":
      case "sa_fc_hard":
      case "sa_fc_master":
        sql += generateFCSql(filter);
        break;
      case "path_lead":
      case "path_rhythm":
      case "path_bass":
        if (filter.value) sql += `${filter.type} = 1 `;
        else sql += `${filter.type} = 0 `;
        break;
      default:
        break;
    }
    if (i < filters.length - 1) {
      sql += `${filter.gate} `;
    }
  }
  //console.log(sql);
  return sql;
}


export const createOption = label => ({
  label,
  value: label,
});

export const sortOrderCustomStyles = {
  container: styles => ({
    ...styles, marginLeft: 20 + 'px',
  }),
  control: styles => ({
    ...styles, backgroundColor: 'white', color: 'black', width: 255 + 'px', fontSize: 15 + 'px',
  }),
  option: (styles, {
    data, isDisabled, isFocused, isSelected,
  }) => {
    return {
      ...styles,
      color: 'black',
    };
  },
  multiValue: (styles, { data }) => {
    return {
      ...styles,
    };
  },
  multiValueLabel: (styles, { data }) => ({
    ...styles,
  }),
  multiValueRemove: (styles, { data }) => ({
    ...styles,
  }),
}
const defaultSortOption = []
class SetlistOptions extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      setlistName: '',
      isGenerated: false,
      isManual: false,
      isRSSetlist: false,
      isStarred: false,
      isFolder: false,
      filters: [],
      numResults: 0,
      allFolders: null,
      selectedFolder: 'none',
      sortoptions: defaultSortOption,
    }
    //tuning
    this.gates = ["and", "or", "and (", "or (", ")", ") and", ") or"]
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
        cmp: ["is", "is not"],
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
      {
        type: "sa_fc_easy",
        display: "FC (SA Easy)",
        cmp: ["is"],
      },
      {
        type: "sa_fc_medium",
        display: "FC (SA Medium)",
        cmp: ["is"],
      },
      {
        type: "sa_fc_hard",
        display: "FC (SA Hard)",
        cmp: ["is"],
      },
      {
        type: "sa_fc_master",
        display: "FC (SA Master)",
        cmp: ["is"],
      },
      {
        type: "path_lead",
        display: "Path: Lead",
        cmp: ["is"],
      },
      {
        type: "path_rhythm",
        display: "Path: Rhythm",
        cmp: ["is"],
      },
      {
        type: "path_bass",
        display: "Path: Bass",
        cmp: ["is"],
      },
      {
        type: "local_note",
        display: "Local Notes",
        cmp: ["like", "not like"],
      },
    ];
    this.sortfieldref = React.createRef();
    this.sortorderref = React.createRef();
  }

  shouldComponentUpdate = async (nextprops, nextstate) => {
    if (nextprops !== this.props) {
      const allFolders = await this.getAllFolders();
      const sortoptions = nextprops.info.sort_options
        ? JSON.parse(nextprops.info.sort_options) : [];
      this.setState({
        setlistName: unescape(nextprops.info.name),
        isGenerated: nextprops.info.is_generated === "true",
        isManual: nextprops.info.is_manual === "true",
        isRSSetlist: nextprops.info.is_rssetlist === "true",
        isStarred: nextprops.info.is_starred === "true",
        allFolders,
        selectedFolder: nextprops.info.parent_folder,
        sortoptions,
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
          filters: jsonObj === null ? [] : jsonObj,
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
        else if (filter.cmp !== "is") {
          //if filter is "is not" and value is in anyTunings, reset default to estandard
          defValue = tunings["E Standard"];
          filter.value = defValue;
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
            filter.cmp === "is" && (
              <Fragment>
                <option value="any_standard" key={"tuning_" + filter.id + "any_s"}>Any Standard</option>
                <option value="any_non_standard" key={"tuning_" + filter.id + "any_ns"}>Any Non-Standard</option>
                <option value="any_open" key={"tuning_" + filter.id + "any_o"}>Any Open Tuning</option>
                <option value="any_drop" key={"tuning_" + filter.id + "any_d"}>Any Dropped Tuning</option>
              </Fragment>
            )
          }
        </select>
      )
    }
    else if (
      filter.type === "is_cdlc" || filter.type === "capofret" || filter.type === "centoffset"
      || filter.type === "sa_fc_easy" || filter.type === "sa_fc_medium" || filter.type === "sa_fc_hard" || filter.type === "sa_fc_master"
      || filter.type === "path_lead" || filter.type === "path_rhythm" || filter.type === "path_bass"
    ) {
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
    const folder = this.state.selectedFolder === "none" ? "" : this.state.selectedFolder
    const sortoptions = JSON.stringify(this.state.sortoptions);
    await createRSSongList(
      this.props.info.key, this.state.setlistName,
      this.state.isGenerated, this.state.isManual,
      JSON.stringify(this.state.filters), this.state.isRSSetlist,
      this.state.isStarred, this.state.isFolder,
      folder, sortoptions,
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

  getAllFolders = async () => {
    const folder = await getFolderSetlists();
    if (folder.length > 0) {
      return folder.map((item) => {
        return (
          <option key={item.key} value={item.key}>{unescape(item.name)}
          </option>
        );
      });
    }
    return null;
  }

  addSortOption = async () => {
    let existing = false;
    const { sortoptions } = this.state;

    for (let i = 0; i < sortoptions.length; i += 1) {
      const option = sortoptions[i];
      let [field, order] = option.value.split("-");
      if (field === this.sortfieldref.current.value) {
        existing = true;
        order = this.sortorderref.current.value;
        field = this.sortfieldref.current.value;
        option.label = field + "-" + order;
        option.value = field + "-" + order;
        sortoptions[i] = option;
        this.setState({ sortoptions });
        return;
      }
    }
    if (existing === false) {
      const option = createOption(this.sortfieldref.current.value + "-" + this.sortorderref.current.value);
      sortoptions.push(option);
      this.setState({ sortoptions });
    }
  }

  handleSortOrderChange = async (value, action) => {
    this.setState({ sortoptions: value })
  }

  render = () => {
    const modalinfostyle = "width-75-2"
    const buttonstyle = "extraPadding download"
    if (this.props.showOptions === false) { return null; }
    const starredstyle = this.state.isStarred
      ? "setlist-option-starred" : "setlist-option-starred-gray"
    forceNoScroll()
    return (
      <div ref={(ref) => { this.modal_div = ref }} id="open-modal" className="modal-window" style={{ opacity: 1, pointerEvents: "auto" }}>
        <div id="modal-info" className={modalinfostyle}>
          <a onKeyUp={this.onKeyUp} title="Close" className="modal-close" onClick={this.handleHide}><Trans i18nKey="close">Close</Trans></a>
          <br />
          <div style={{ textAlign: 'center' }}>
            <h4 style={{ fontSize: 150 + "%", fontWeight: 'bold', marginTop: -25 + 'px' }}>
              <Trans i18nKey="setlistOptions">Setlist Options</Trans>
            </h4>
            <hr />
            <div style={{ fontSize: 20 + 'px' }}>
              <table style={{ width: 100 + '%' }}>
                <tbody>
                  <tr style={{ backgroundColor: 'inherit', border: 'none', color: 'black' }}>
                    <td style={{ border: 'none', width: 20 + '%', borderRight: '1px solid' }}><Trans i18nKey="name">Name</Trans></td>
                    <td style={{ border: 'none', width: 80 + '%', textAlign: 'left' }}>
                      <input type="text" defaultValue={this.state.setlistName} onChange={this.handleChange} style={{ marginLeft: 30 + 'px', paddingLeft: 10 + 'px', width: 80 + '%' }} />
                      <div
                        style={{ cursor: 'pointer' }}
                        onClick={() => this.setState({ isStarred: !this.state.isStarred })}
                        className={starredstyle}>
                        &nbsp;
                        </div>
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: 'inherit', border: 'none', color: 'black' }}>
                    <td style={{ border: 'none', width: 20 + '%', borderRight: '1px solid' }}><Trans i18nKey="type">Type</Trans></td>
                    <td style={{
                      border: 'none', width: 80 + '%', textAlign: 'left', fontSize: 16 + 'px',
                    }}>
                      <div style={{ marginLeft: 30 + 'px' }}>
                        <input
                          disabled={this.state.isRSSetlist === true}
                          type="radio"
                          id="setlist_manual"
                          name="setlist_manual"
                          checked={this.state.isManual === true}
                          onChange={this.handleManual}
                        />
                        <span className="manual" style={{ display: 'inline-flex' }}>
                          <label style={{ paddingLeft: 34 + 'px' }} htmlFor="setlist_manual"><Trans i18nKey="setlistManual">Manual - Add Songs manually</Trans></label>
                        </span>
                      </div>
                      <div style={{ marginLeft: 30 + 'px' }}>
                        <input
                          disabled={this.state.isRSSetlist === true}
                          type="radio"
                          id="setlist_generated"
                          name="setlist_generated"
                          checked={this.state.isGenerated === true}
                          onChange={this.handleGenerated}
                        />
                        <span className="generated" style={{ display: 'inline-flex' }}>
                          <label style={{ paddingLeft: 34 + 'px' }} htmlFor="setlist_generated"><Trans i18nKey="setlistGenerated">Generated  - Add Songs via filters</Trans></label>
                        </span>
                      </div>
                      <div style={{ marginLeft: 30 + 'px' }}>
                        <input
                          readOnly
                          type="radio"
                          id="setlist_rs"
                          name="setlist_rs"
                          checked={this.state.isRSSetlist === true}
                        />
                        <span
                          className="rs"
                          style={{
                            display: 'inline-flex',
                            color: 'darkgray',
                          }}>
                          <label style={{ paddingLeft: 34 + 'px' }} htmlFor="setlist_rs"><Trans i18nKey="setlistRs">Rocksmith Setlist - Imported from game</Trans></label>
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <table style={{ width: 100 + '%' }}>
                <tbody>
                  <tr style={{ backgroundColor: 'inherit', border: 'none', color: 'black' }}>
                    <td style={{ border: 'none', width: 20 + '%', borderRight: '1px solid' }}><Trans i18nKey="folder">Folder</Trans></td>
                    <td style={{ border: 'none', width: 30 + '%', textAlign: 'left' }}>
                      <select
                        style={{ marginLeft: 30 + 'px', width: 90 + '%' }}
                        id="folder"
                        defaultValue={this.state.selectedFolder}
                        onChange={(e) => {
                          this.setState({ selectedFolder: e.target.value })
                        }}
                      >
                        <option value="none">None</option>
                        {this.state.allFolders}
                      </select>
                    </td>
                    <td style={{
                      border: 'none', width: 16 + '%', borderRight: '1px solid', fontSize: 18 + 'px',
                    }}><Trans i18nKey="defaultSortOrder">Default<br />Sort Order</Trans></td>
                    <td style={{ border: 'none', width: 80 + '%', textAlign: 'left' }}>
                      <CreatableSelect
                        components={{
                          DropdownIndicator: null,
                        }}
                        styles={sortOrderCustomStyles}
                        isClearable
                        isMulti
                        menuIsOpen={false}
                        onChange={this.handleSortOrderChange}
                        placeholder="Current Order: Global"
                        value={this.state.sortoptions}
                      />
                      <select
                        ref={this.sortfieldref}
                        style={{ marginLeft: 20 + 'px', width: 40 + '%' }}
                        id="sortfield">
                        <option value="song">Song</option>
                        <option value="artist">Artist</option>
                        <option value="album">Album</option>
                        <option value="mastery">Mastery</option>
                        <option value="tuning_weight">Tuning</option>
                        <option value="count">Playcount</option>
                        <option value="difficulty">Difficulty</option>
                        <option value="arrangement">Arrangement</option>
                        <option value="sa_highest_badge">Highest Badge</option>
                      </select>
                      <select
                        ref={this.sortorderref}
                        style={{ marginLeft: 16 + 'px', width: 20 + '%' }}
                        id="sortorder">
                        <option value="asc">Asc</option>
                        <option value="desc">Desc</option>
                      </select>
                      <span
                        onClick={this.addSortOption}
                        style={{
                          fontSize: 17 + 'px',
                          marginLeft: 12 + 'px',
                          borderBottom: '1px dotted',
                          cursor: 'pointer',
                        }}>Add</span>
                    </td>
                  </tr>
                </tbody>
              </table>
              {
                this.state.isGenerated
                  ? (
                    <div>
                      <h4><Trans i18nKey="filters">Filters</Trans></h4>
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
                                    <td><Trans i18nKey="filterType">Filter Type</Trans></td>
                                    <td><Trans i18nKey="comparator">Comparator</Trans></td>
                                    <td><Trans i18nKey="value">Value</Trans></td>
                                    <td><Trans i18nKey="logicChain">Logic Chain</Trans></td>
                                    <td><Trans i18nKey="delete">Delete</Trans></td>
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
              <button
                type="button"
                onClick={this.saveOptions}
                className={buttonstyle}>
                <Trans i18nKey="Save Options">Save Options</Trans>
              </button>
              <button
                type="button"
                onClick={this.deleteSetlist}
                className={buttonstyle}>
                <Trans i18nKey="Delete Setlist">Delete Setlist</Trans>
              </button>
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

export default withI18n('translation')(SetlistOptions);
