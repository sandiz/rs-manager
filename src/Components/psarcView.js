import React from 'react'
import BootstrapTable from 'react-bootstrap-table-next'
import paginationFactory from 'react-bootstrap-table2-paginator';
import filterFactory, { textFilter } from 'react-bootstrap-table2-filter';
import path from 'path';
import PropTypes from 'prop-types';
import readPSARC, { psarcToJSON, extractFile } from '../psarcService';
import updateSongsOwned, { initSongsOwnedDB, saveSongsOwnedDB } from '../sqliteService';

const { remote } = window.require('electron')
function sizeFormatter(cell, row) {
  return <span>{Math.round(cell / 1024 / 1024)} MB</span>;
}
function dateFormatter(cell, row) {
  return <span>{new Date(cell).toLocaleDateString()}</span>;
}
function difficultyFormatter(cell, row) {
  return <span />;
}
const columns = [
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
    filter: textFilter({
      style: {
        marginTop: '10px',
        marginLeft: '20px',
        display: '',
      },
    }),
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
    filter: textFilter({
      style: {
        marginTop: '10px',
        marginLeft: '20px',
        display: '',
      },
    }),
  },
  {
    dataField: "psarc",
    text: "File Name",
    style: (cell, row, rowIndex, colIndex) => {
      return {
        width: '15%',
        cursor: 'pointer',
      };
    },
    sort: true,
    filter: textFilter({
      style: {
        marginTop: '10px',
        marginLeft: '20px',
        display: '',
      },
    }),
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
    dataField: "size",
    text: "Size",
    formatter: sizeFormatter,
    style: (cell, row, rowIndex, colIndex) => {
      return {
        width: '10%',
      };
    },
    sort: true,
  },
  {
    dataField: "created",
    text: "Created At",
    formatter: dateFormatter,
    style: (cell, row, rowIndex, colIndex) => {
      return {
        width: '10%',
      };
    },
    sort: true,
  },
];
export default class PSARCView extends React.Component {
  constructor(props) {
    super(props);
    this.tabname = 'tab-psarc';
    this.processedFiles = []
    this.state = {
      files: [],
      processing: false,
      abortprocessing: false,
      showpsarcDetail: false,
      selectedpsarcData: null,
      selectedFileName: "",
    };
    this.rowEvents = {
      onClick: (e, row, rowIndex) => {
        this.handleShow(row);
      },
    };
    this.options = {
      paginationSize: 10,
      sizePerPage: 25,
      pageStartIndex: 1,
      sizePerPageList: [],
    }
  }
  openDirDialog = async () => {
    const dirs = remote.dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    if (dirs === null || typeof dirs === 'undefined' || dirs.length <= 0) {
      return;
    }
    const results = this.walkSync(dirs[0] + "/", null);
    console.log("psarc found: " + results.length);
    if (results.length > 0) {
      this.setState({ processing: true, files: [] });
      this.psarcRead(results);
    }
  }
  openFileDialog = async () => {
    const files = remote.dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        { name: 'PSARC', extensions: ['psarc'] },
      ],
    });
    if (files === null || typeof files === 'undefined' || files.length <= 0) {
      return;
    }
    const results = [];
    const fs = remote.require("fs");
    const statres = fs.statSync(files[0]);
    results.push([files[0], statres]);
    console.log("psarc found: " + results.length);
    if (results.length > 0) {
      this.setState({ processing: true });
      this.psarcRead(results);
    }
  }
  walkSync = (dir, results) => {
    const fs = remote.require("fs");
    const files = fs.readdirSync(dir);

    results = results || [];
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const statres = fs.statSync(dir + file);
      if (statres.isDirectory()) {
        //filelist = this.walkSync(dir + file + "/", filelist);
        results = this.walkSync(dir + file + "/", results);
      } else {
        if (file.includes("/tmp/")) { continue }
        else if (window.os.platform() === 'darwin' && file.endsWith("_m.psarc")) {
          results.push([dir + file, statres]);
        }
        else if (window.os.platform() === 'win32' && file.endsWith("_p.psarc")) {
          results.push([dir + file, statres]);
        }
        else if (file.endsWith("songs.psarc")) {
          results.push([dir + file, statres]);
        }
      }
    }
    return results;
  }
  psarcRead = async (results) => {
    const count = results.length;
    let index = 1;
    this.setState({
      files: [],
    });
    this.processedFiles = [];
    // eslint-disable-next-line
    for (const prObj of results) {
      // eslint-disable-next-line
      const currentResults = await readPSARC(prObj[0], prObj[1], (500 + (index * 100)))
      if (currentResults === null || currentResults === 'undefined' || currentResults.length === 0) {
        this.props.updateHeader(this.tabname, "Failed to read " + path.basename(prObj[0]));
        index += 1
        continue;
      }
      this.processedFiles = this.processedFiles.concat(currentResults);
      this.props.updateHeader(this.tabname, `Processesing PSARC:  ${currentResults[0].psarc} (${index}/${count})`);
      if (index >= count) {
        this.props.updateHeader(this.tabname, `Processed ${count} PSARC's, ${this.processedFiles.length} arrangements found.`);
        this.setState({ files: this.processedFiles, processing: false });
      }
      if (this.state.abortprocessing) {
        this.props.updateHeader(this.tabname, `Processed ${index} PSARC's, ${this.processedFiles.length} arrangements found.`);
        this.setState({ files: this.processedFiles, processing: false, abortprocessing: false });
        break;
      }
      index += 1
    }
  }
  noData = () => {
    if (this.state.processing) {
      return "Processing...";
    }
    return "No Data"
  }
  forceViewUpdate = () => {
    this.setState({ files: this.processedFiles });
  }
  stopProcessing = async () => {
    this.setState({ abortprocessing: true });
  }
  extract = async (file, psarc) => {
    const res = await extractFile(psarc, file)
    console.log(res)
    window.shell.showItemInFolder(res.filename)
  }
  handleShow = async (row) => {
    const psarcdata = await psarcToJSON(row.filename);
    this.setState({
      selectedFileName: row.filename,
      selectedpsarcData: psarcdata,
      showpsarcDetail: true,
    });
  }
  handleHide = () => {
    this.setState({ showpsarcDetail: false });
  }
  updateSongList = async () => {
    await initSongsOwnedDB();
    //let cache = [];
    console.log("arrangments: " + this.state.files.length);
    for (let i = 0; i < this.state.files.length; i += 1) {
      this.props.updateHeader(this.tabname, `Updating Songlist with PSARC:  ${this.state.files[i].psarc} (${i}/${this.state.files.length})`);
      //cache.push(this.state.files[i]);
      //if (cache.length === 5) {
      // eslint-disable-next-line
      await updateSongsOwned(this.state.files[i]);
      //cache = [];
      //}
    }
    //await updateSongsOwned(cache);
    //setTimeout(() => { this.props.resetHeader(this.tabname) }, 5000);
    await saveSongsOwnedDB();
    this.props.updateHeader(this.tabname, "Updated Songlist with " + this.state.files.length + " Arrangements");
  }
  render = () => {
    const stopprocessingstyle = this.state.processing ? "" : "none";
    const hasdatastyle = this.state.processing === false && this.state.files.length > 0 ? "" : "none";
    const choosepsarchstyle = "extraPadding download " + (this.state.processing ? "isDisabled" : "");
    const psarcdetailsstyle = "modal-window " + (this.state.showpsarcDetail ? "" : "hidden");
    if (this.props.currentTab === null) {
      return null;
    } else if (this.props.currentTab.id === this.tabname) {
      return (
        <div>
          <div className="centerButton list-unstyled">
            <a
              onClick={this.openFileDialog}
              className={choosepsarchstyle}>
              Choose .psarc File
            </a>
            <a
              onClick={this.openDirDialog}
              className={choosepsarchstyle}>
              Choose .psarc Directory
            </a>
            <a
              onClick={this.stopProcessing}
              className="extraPadding download"
              style={{ display: `${stopprocessingstyle}` }}>
              Stop Processing
            </a>
            <a
              onClick={this.forceViewUpdate}
              className="extraPadding download"
              style={{ display: `${stopprocessingstyle}` }}>
              Force Generate View
            </a>
            <a
              onClick={this.updateSongList}
              className="extraPadding download"
              style={{ display: `${hasdatastyle}` }}>
              Update Songlist (Owned)
            </a>
          </div>
          <div>
            <BootstrapTable
              keyField="uniquekey"
              data={this.state.files}
              columns={columns}
              classes="psarcTable"
              hover
              bordered={false}
              noDataIndication={this.noData}
              rowEvents={this.rowEvents}
              pagination={paginationFactory(this.options)}
              filter={filterFactory()}
            />
          </div>
          <div id="open-modal" className={psarcdetailsstyle} style={{ opacity: 1, pointerEvents: "auto" }}>
            <div id="modal-info" className="width-75">
              <a title="Close" className="modal-close" onClick={this.handleHide}>Close</a>
              <br />
              {(() => {
                if (this.state.selectedpsarcData != null) {
                  const filecolumns = [
                    {
                      dataField: "file",
                      text: "File",
                      style: (cell, row, rowIndex, colIndex) => {
                        return {
                          width: '80%',
                          cursor: 'pointer',
                        };
                      },
                      sort: true,
                    },
                  ]
                  const arrcolumns = [
                    {
                      dataField: "song",
                      text: "Song",
                      style: (cell, row, rowIndex, colIndex) => {
                        return {
                          width: '15%',
                        };
                      },
                    },
                    {
                      dataField: "artist",
                      text: "Artist",
                      style: (cell, row, rowIndex, colIndex) => {
                        return {
                          width: '15%',
                        };
                      },
                    },
                    {
                      dataField: "album",
                      text: "Album",
                      style: (cell, row, rowIndex, colIndex) => {
                        return {
                          width: '15%',
                        };
                      },
                    },
                    {
                      dataField: "arrangement",
                      text: "Arrangement",
                      style: (cell, row, rowIndex, colIndex) => {
                        return {
                          width: '15%',
                        };
                      },
                    },
                    {
                      dataField: "dlc",
                      text: "DLC",
                      style: (cell, row, rowIndex, colIndex) => {
                        return {
                          width: '15%',
                        };
                      },
                    },
                    {
                      dataField: "sku",
                      text: "SKU",
                      style: (cell, row, rowIndex, colIndex) => {
                        return {
                          width: '15%',
                        };
                      },
                    },
                    {
                      classes: (cell, row, rowIndex, colIndex) => {
                        const def = "iconPreview smallIcon difficulty ";
                        let diff = "";
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
                  ]
                  const tableData = [];
                  const extractRowEvents = {
                    onClick: (e, row, rowIndex) => {
                      this.extract(row.file, this.state.selectedFileName)
                    },
                  };
                  for (let i = 0; i < this.state.selectedpsarcData.files.length; i += 1) {
                    const cell = {
                      file: this.state.selectedpsarcData.files[i],
                    }
                    tableData.push(cell);
                  }
                  return (
                    <div >
                      <h1> PSARC: {this.state.selectedpsarcData.key + ".psarc"} </h1>
                      <h1> Files: {this.state.selectedpsarcData.files.length}</h1>
                      <div className="psarcFiles">
                        <BootstrapTable
                          keyField="file"
                          data={tableData}
                          columns={filecolumns}
                          classes="psarcTable"
                          hover
                          bordered={false}
                          noDataIndication="No Data"
                          rowEvents={extractRowEvents}
                        />
                      </div>
                      <br />
                      <h1> Arrangements: {this.state.selectedpsarcData.arrangements.length}</h1>
                      <div className="psarcFiles">
                        <BootstrapTable
                          keyField="fullName"
                          data={this.state.selectedpsarcData.arrangements}
                          columns={arrcolumns}
                          classes="psarcTable"
                          hover
                          bordered={false}
                          noDataIndication="No Data"
                        />
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

            </div>
          </div>
        </div>
      );
    }
    return null;
  }
}
PSARCView.propTypes = {
  currentTab: PropTypes.object,
  updateHeader: PropTypes.func,
  //resetHeader: PropTypes.func,
}
PSARCView.defaultProps = {
  currentTab: null,
  updateHeader: () => { },
  //resetHeader: () => { },
}
