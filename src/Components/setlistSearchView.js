import React from 'react'
import PropTypes from 'prop-types';
import { withI18n } from 'react-i18next';
import { textFilter } from 'react-bootstrap-table2-filter';
import {
  RemoteAll,
  round100Formatter,
} from './songlistView'
import {
  getAllSetlistNoFolderPaged, executeRawSql,
  getAllSetlistNoFolder, getFolderSetlists,
} from '../sqliteService';
import { getDefaultSortOptionConfig, getMasteryThresholdConfig } from '../configService';
import { generateSql } from './setlistOptions';
import { DispatcherService, DispatchEvents } from '../lib/libDispatcher'
import ExportSetlistModal from './modalExportSetlist';


export function setlistFormatter(cell, row) {
  let icon = "new";
  if (row.isgen) icon = "generated";
  else if (row.isrssetlist) icon = "rs";
  else if (row.ismanual) icon = "manual";
  else icon = "new";
  return (
    <div>
      <span className={icon} style={{ display: "inline-flex", float: 'left' }}>
        <label style={{ paddingLeft: 34 + 'px', paddingTop: 7 + 'px', cursor: 'pointer' }}>
          {cell}
        </label>
      </span>
      <div className="setlist-info">
        <span style={{
          paddingTop: 7 + 'px',
          fontSize: 14 + 'px',
        }}>
          {row.folder}
        </span>
        <span style={{
          paddingTop: 7 + 'px',
          marginLeft: 10 + 'px',
          color: 'black !important',
        }}>
          <i
            title="Goto Setlist"
            className="fas fa-external-link-square-alt"
            onClick={(e) => {
              DispatcherService.dispatch(DispatchEvents.SETLIST_SELECT, row.key);
            }} />
        </span>
        <span style={{
          paddingTop: 7 + 'px',
          marginLeft: 10 + 'px',
          color: 'black !important',
        }}>
          <i
            title="Export Setlist"
            className="fas fa-file-export"
            onClick={(e) => {
              DispatcherService.dispatch(DispatchEvents.SETLIST_EXPORT, row);
              e.stopPropagation();
            }} />
        </span>
      </div>
    </div>
  );
}

class SetlistSearchView extends React.Component {
  constructor(props) {
    super(props);
    this.tabname = 'tab-setlist';
    this.state = {
      setlists: [],
      page: 1,
      totalSize: 0,
      sizePerPage: 19,
      showExportOptions: false,
      exportSetlistKey: '',
      exportSetlistName: '',
    };
    this.rowEvents = {
      onClick: (e, row, rowIndex) => {
        DispatcherService.dispatch(DispatchEvents.SETLIST_SELECT, row.key);
      },
    };
    this.columns = [
      {
        dataField: "name",
        text: this.props.t("Setlists"),
        style: (cell, row, rowIndex, colIndex) => {
          return {
            width: '60%',
            cursor: 'pointer',
            textAlign: 'right',
          };
        },
        formatter: setlistFormatter,
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
        dataField: "total",
        text: this.props.t("Arrangement"),
        style: (cell, row, rowIndex, colIndex) => {
          return {
            width: '10%',
          };
        },
        sort: true,
      },
      {
        dataField: "mastered",
        text: this.props.t("Mastered"),
        style: (cell, row, rowIndex, colIndex) => {
          return {
            width: '10%',
          };
        },
        sort: true,
      },
      {
        dataField: "percent",
        text: this.props.t("Percent"),
        formatter: round100Formatter,
        style: (cell, row, rowIndex, colIndex) => {
          return {
            width: '20%',
          };
        },
      },
    ];
    this.cwmasync();
  }

  cwmasync = async () => {
    const sortOptions = await getDefaultSortOptionConfig();

    this.onTableChange("cdm", {
      page: this.state.page,
      sizePerPage: this.state.sizePerPage,
      filters: {},
      sortOptions,
    })
    DispatcherService.on(DispatchEvents.SETLIST_EXPORT, this.setlistExport);
  }

  componentWillUnmount = () => {
    DispatcherService.off(DispatchEvents.SETLIST_EXPORT, this.setlistExport);
  }

  setlistExport = (row) => {
    this.setState({
      showExportOptions: true,
      exportSetlistKey: row.key,
      exportSetlistName: row.name,
    })
  }

  compareValues = (key, order = 'asc') => {
    //eslint-disable-next-line
    return function (a, b) {
      //eslint-disable-next-line
      if (!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) {
        // property doesn't exist on either object
        return 0;
      }

      const varA = (typeof a[key] === 'string')
        ? a[key].toUpperCase() : a[key];
      const varB = (typeof b[key] === 'string')
        ? b[key].toUpperCase() : b[key];

      let comparison = 0;
      if (varA > varB) {
        comparison = 1;
      } else if (varA < varB) {
        comparison = -1;
      }
      return (
        (order === 'desc') ? (comparison * -1) : comparison
      );
    };
  }

  onTableChange = async (type, {
    page,
    sizePerPage,
    sortField, //newest sort field
    sortOrder, // newest sort order
    filters, // an object which have current filter status per column
    data,
    sortOptions,
  }) => {
    const zeroIndexPage = page - 1
    const start = zeroIndexPage * sizePerPage;
    const searchval = filters && filters.name ? filters.name.filterVal : '';
    const allsetlists = await getAllSetlistNoFolderPaged(start, sizePerPage, escape(searchval));
    const countsetlists = await getAllSetlistNoFolder();
    const setlists = []
    const masteryT = await getMasteryThresholdConfig();
    for (let i = 0; i < allsetlists.length; i += 1) {
      const setlist = allsetlists[i];
      const isgen = setlist.is_generated === "true";
      const ismanual = setlist.is_manual === "true";
      const isrssetlist = setlist.is_rssetlist === "true";
      let mastered = 0;
      let total = 0;
      if (isgen) {
        mastered = 0;
        //eslint-disable-next-line
        const sql = await generateSql(JSON.parse(setlist.view_sql));
        try {
          //eslint-disable-next-line
          const op = await executeRawSql(sql, true);
          total = op.length;
          for (let j = 0; j < op.length; j += 1) {
            const arr = op[j];
            if (arr.mastery >= masteryT) {
              mastered += 1;
            }
          }
        }
        catch (e) {
          mastered = 0;
          total = 0;
          console.log(e)
        }
      }
      else {
        //eslint-disable-next-line
        const op = await executeRawSql(`select count(*) as count from ${setlist.key}`);
        total = op.count;
        //eslint-disable-next-line
        const op2 = await executeRawSql(`
        SELECT count(*) as count
        FROM songs_owned
        JOIN ${setlist.key}
        ON ${setlist.key}.uniqkey = songs_owned.uniqkey
        where mastery >= '${masteryT}'`);
        mastered = op2.count;
      }
      setlists.push({
        key: setlist.key,
        name: unescape(setlist.name),
        folder: setlist.parent_folder_name ? unescape(setlist.parent_folder_name) : '-',
        mastered,
        total,
        isgen,
        ismanual,
        isrssetlist,
        percent: total <= 0 ? 0 : mastered / total,
      })
    }
    if (sortField && sortOrder) {
      setlists.sort(this.compareValues(sortField, sortOrder))
    }
    this.setState({ setlists, page, totalSize: countsetlists.length })

    const folders = await getFolderSetlists();
    this.props.updateHeader(
      this.tabname,
      `Folders: ${folders.length - 1}, Setlists: ${countsetlists.length}`,
    );
  }

  render = () => {
    const { setlists, sizePerPage, page } = this.state;
    return (
      <div>
        <div>
          <RemoteAll
            keyField="key"
            data={setlists}
            page={page}
            sizePerPage={sizePerPage}
            totalSize={this.state.totalSize}
            onTableChange={this.onTableChange}
            columns={this.columns}
            rowEvents={this.rowEvents}
            noDataIndication="No Setlists"
            classes="setlistSearchTable"
          />
        </div>
        <ExportSetlistModal
          show={this.state.showExportOptions}
          exportSetlistKey={this.state.exportSetlistKey}
          exportSetlistName={this.state.exportSetlistName}
          onClose={() => this.setState({ showExportOptions: false })} />
      </div>
    );
  }
}
SetlistSearchView.propTypes = {
  //currentTab: PropTypes.object,
  //resetHeader: PropTypes.func,
  updateHeader: PropTypes.func,
}
SetlistSearchView.defaultProps = {
  //currentTab: null,
  //resetHeader: () => { },
  //resetHeader: () => { },
  updateHeader: () => { },
}
export default withI18n('translation')(SetlistSearchView);
