import React from 'react'
import PropTypes from 'prop-types';
import { enableScroll, forceNoScroll } from './songdetailView';
import { deleteRSSongList, createRSSongList } from '../sqliteService';

export default class SetlistOptions extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      setlistName: '',
      isGenerated: null,
      isManual: null,
      filters: [],
      numResults: 0,
    }
    this.fields = [
      {
        type: "artist",
        cmp: ["like", "notlike"],
      },
      {
        type: "song",
        cmp: ["like", "notlike"],
      },
      {
        type: "album",
        cmp: ["like", "notlike"],
      },
    ];
  }
  shouldComponentUpdate = async (nextprops, nextstate) => {
    if (nextprops !== this.props) {
      this.setState({
        setlistName: nextprops.info.name,
        isGenerated: nextprops.info.is_generated === "true",
        isManual: nextprops.info.is_manual === "true",
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
        })
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
    });
  }
  handleManual = (e) => {
    this.setState({
      isManual: e.currentTarget.value === "on",
      isGenerated: false,
    });
  }
  saveOptions = async () => {
    console.log("save setlist: " + this.props.info.key);
    await createRSSongList(
      this.props.info.key, this.state.setlistName, this.state.isGenerated,
      this.state.isManual, JSON.stringify(this.state.filters),
    );
    this.props.refreshTabs();
    this.props.fetchMeta();
    this.handleHide();
  }
  deleteSetlist = async () => {
    console.log("delete setlist: " + this.props.info.key);
    this.handleHide();
    await deleteRSSongList(this.props.info.key)
    this.props.refreshTabs();
    //delete setlist db
    //delete meta info from setlist_meta
  }
  addFilter = async () => {
    const defaultFilter = {
      type: "artist", cmp: "like", value: "", gate: "and",
    }
    const filters = this.state.filters;
    filters.push(defaultFilter);
    this.setState({ filters })
  }
  removeFilter = async (index) => {
    const filters = this.state.filters;
    filters.splice(index, 1);
    this.setState({ filters })
  }
  render = () => {
    const modalinfostyle = "width-75-2"
    const buttonstyle = "extraPadding download"
    if (this.props.showOptions === false) { return null; }
    const rwIgnored = this.state.filters.length < 5 ? forceNoScroll() : enableScroll();
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
                this.state.isGenerated ?
                  (
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
                        <span /><span /><span />
                      </button>
                      {
                        this.state.filters.length > 0 ?
                          <div>
                            <table
                              className="filterTable"
                              style={{
                                width: 100 + '%',
                                marginTop: 30 + 'px',
                                marginBottom: 12 + 'px',
                              }}>
                              <tbody>
                                {
                                  this.state.filters.map((filter, index) => {
                                    return (
                                      <tr key={window.shortid.generate()}>
                                        <td style={{ width: 20 + '%' }}>{filter.type}</td>
                                        <td style={{ width: 20 + '%' }}>{filter.cmp}</td>
                                        <td style={{ width: 40 + '%' }}>{filter.value}</td>
                                        <td style={{ width: 15 + '%' }}>{filter.gate}</td>
                                        <td style={{ width: 5 + '%' }}>
                                          <button
                                            type="button"
                                            id="settingsCollapse"
                                            className="navbar-btn"
                                            onClick={() => this.removeFilter(index)}
                                            style={{ float: 'right' }}
                                          >
                                            <span /><span /><span />
                                          </button>
                                        </td>
                                      </tr>
                                    )
                                  })
                                }
                              </tbody>
                            </table>
                            <span>Query returned {this.state.numResults} results </span>
                          </div>
                          : null
                      }
                    </div>
                  )
                  : null
              }
            </div>
            <br />
            <div>
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
}
SetlistOptions.defaultProps = {
  info: {
  },
  close: () => { },
  showOptions: false,
  refreshTabs: () => { },
  fetchMeta: () => { },
}
