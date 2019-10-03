import React from 'react'
import { withI18n, Trans } from 'react-i18next';
import BootstrapTable from 'react-bootstrap-table-next'
import paginationFactory from 'react-bootstrap-table2-paginator';
import filterFactory, { textFilter } from 'react-bootstrap-table2-filter';
import { psarcToJSON, extractFile } from '../psarcService';
import { psarcWorker, profileWorker } from '../lib/libworker';
import { DispatcherService, DispatchEvents } from '../lib/libdispatcher';

function sizeFormatter(cell, row) {
  return (
    <span>
      {Math.round(cell / 1024 / 1024)}
      MB
  </span>
  );
}
function dateFormatter(cell, row) {
  return <span>{new Date(cell).toLocaleDateString()}</span>;
}
function difficultyFormatter(cell, row) {
  return <span />;
}
class PSARCView extends React.Component {
  constructor(props) {
    super(props);
    this.tabname = 'tab-psarc';
    this.processedFiles = []
    this.state = {
      files: [],
      processing: false,
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
    this.markAsCDLC = null;
    this.columns = [
      {
        dataField: "song",
        text: this.props.t("Song"),
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
        text: this.props.t("Artist"),
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
        text: this.props.t("File Name"),
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
        text: this.props.t("Arrangement"),
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
        text: this.props.t("Size"),
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
        text: this.props.t("Created At"),
        formatter: dateFormatter,
        style: (cell, row, rowIndex, colIndex) => {
          return {
            width: '10%',
          };
        },
        sort: true,
      },
      {
        dataField: "id",
        text: this.props.t("ID"),
        style: (cell, row, rowIndex, colIndex) => {
          return {
            width: '25%',
            cursor: 'pointer',
          };
        },
        hidden: false,
      },
    ];
  }

  componentDidMount = () => {
    DispatcherService.on(DispatchEvents.PSARCS_IMPORTED, this.onPsarcImportComplete);
  }

  componentWillUnmount = () => {
    DispatcherService.off(DispatchEvents.PSARCS_IMPORTED, this.onPsarcImportComplete);
  }

  onPsarcImportComplete = (results) => {
    this.setState({ files: results, processing: false });
  }

  openDirDialog = async () => {
    this.setState({ processing: true });
    psarcWorker.importDirectory();
  }

  openFileDialog = async () => {
    this.setState({ processing: true });
    psarcWorker.importFiles();
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
    profileWorker.songListUpdate(this.state.files, this.markAsCDLC.checked);
  }

  render = () => {
    const hasdatastyle = this.state.processing === false && this.state.files.length > 0 ? "" : "none";
    const choosepsarchstyle = "extraPadding download " + (this.state.processing ? "isDisabled" : "");
    const psarcdetailsstyle = "modal-window " + (this.state.showpsarcDetail ? "" : "hidden");
    return (
      <div>
        <div className="centerButton list-unstyled">
          <button
            type="button"
            onClick={this.openFileDialog}
            className={choosepsarchstyle}>
            <Trans i18nKey="choosePsarcFile">
              Choose .psarc File(s)
            </Trans>
          </button>
          <button
            type="button"
            onClick={this.openDirDialog}
            className={choosepsarchstyle}>
            <Trans i18nKey="choosePsarcDirectory">
              Choose .psarc Directory
            </Trans>
          </button>
          <button
            type="button"
            onClick={this.updateSongList}
            className="extraPadding download"
            style={{ display: `${hasdatastyle}` }}>
            <Trans i18nKey="updateSongsOwned">
              Update Songs &gt; Owned
            </Trans>
          </button>
          <span style={{ display: `${hasdatastyle}` }}>
            <label htmlFor="cdlc">
              <Trans i18nKey="markAllAsCDLC">
                Mark All as CDLC
            </Trans>
            </label>
            <input
              ref={(node) => { this.markAsCDLC = node }}
              style={{ margin: 7 + 'px' }}
              type="checkbox"
              id="cdlc"
              name="cdlc"
              value="cdlc"
            />
          </span>
        </div>
        <div>
          <BootstrapTable
            keyField="id"
            data={this.state.files}
            columns={this.columns}
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
                      const def = "iconPreview smallIcon2 difficulty ";
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
                  <div>
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
                        keyField="id"
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
}
PSARCView.propTypes = {
  //currentTab: PropTypes.object,
  //updateHeader: PropTypes.func,
  //resetHeader: PropTypes.func,
}
PSARCView.defaultProps = {
  //currentTab: null,
  //updateHeader: () => { },
  //resetHeader: () => { },
}

export default withI18n('translation')(PSARCView);
