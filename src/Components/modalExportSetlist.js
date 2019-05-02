import React from 'react'
import PropTypes from 'prop-types';
import Select from 'react-select';
import { writeFile } from '../configService';
import { getSetlistMetaInfo, executeRawSql } from '../sqliteService';

const selectoptions = [
    { value: 'json', label: 'JSON' },
    { value: 'songlist', label: 'Rocksmith Song List' },
];

class ExportSetlistModal extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedOption: null,
            showMessage: '',
            messageType: 'alert-success',
        }
    }

    successMsg = () => { this.setState({ showMessage: "Exported Successfully!", messageType: 'alert-success' }) }

    failureMsg = (msg) => { this.setState({ showMessage: "Export Failed: " + msg, messageType: 'alert-danger' }) }

    shouldComponentUpdate = async (nextProps, nextState) => {
        if (nextProps === this.props) return false;
        return true;
    }

    handleChange = (selectedOption) => {
        this.setState({ selectedOption });
    }

    startExport = () => {
        if (this.state.selectedOption === null) {
            this.failureMsg("invalid export option.")
            return;
        }
        if (this.state.selectedOption.value === "json") {
            this.setlistExportToJSON(this.props.exportSetlistKey);
        }
        else {
            console.log("rs");
        }
    }

    setlistExportToJSON = async (key) => {
        const setlist = await getSetlistMetaInfo(key);
        const isgen = setlist.is_generated === "true";
        const songKeys = []
        if (isgen) {
            //eslint-disable-next-line
            const sql = await generateSql(JSON.parse(setlist.view_sql));
            try {
                //eslint-disable-next-line
                const op = await executeRawSql(sql, true);
                for (let j = 0; j < op.length; j += 1) {
                    const arr = op[j];
                    if (!songKeys.includes(arr.songkey)) {
                        songKeys.push(arr.songkey);
                    }
                }
            }
            catch (e) {
                this.failureMsg("generated setlist returned exception")
            }
        }
        else {
            //eslint-disable-next-line
            const op2 = await executeRawSql(`
                SELECT *
                FROM songs_owned
                JOIN ${setlist.key}
                ON ${setlist.key}.uniqkey = songs_owned.uniqkey
            `, true);
            for (let i = 0; i < op2.length; i += 1) {
                const arr = op2[i];
                if (!songKeys.includes(arr.songkey)) {
                    songKeys.push(arr.songkey);
                }
            }
        }

        if (songKeys.length > 0) {
            const options = {
                defaultPath: window.remote.app.getPath('documents') + `/${unescape(setlist.name)}_export.json`,
            }
            window.remote.dialog.showSaveDialog(null, options, async (path) => {
                if (path) {
                    await writeFile(path, JSON.stringify(songKeys));
                    this.successMsg();
                }
            })
        }
        else {
            this.failureMsg("No songs found in setlist.")
        }
    }

    render() {
        const { selectedOption } = this.state;
        const alertClass = `alert ${this.state.messageType}`
        return (
            <div style={{ display: this.props.show ? "block" : "none" }}>
                <div id="open-modal" className="modal-window" style={{ opacity: 1, pointerEvents: "auto" }}>
                    <div id="modal-info" style={{ width: 25 + '%' }}>
                        <a title="Close" className="modal-close" onClick={this.props.onClose}>Close</a>
                        <div style={{ textAlign: 'center' }}>
                            <h3>Export setlist as:</h3>
                            <hr />
                            <Select
                                value={selectedOption}
                                onChange={this.handleChange}
                                options={selectoptions}
                            />
                            {
                                this.state.showMessage.length > 0
                                    ? (
                                        <div className={alertClass} style={{ marginTop: 15 + 'px' }}>
                                            {this.state.showMessage}
                                        </div>
                                    )
                                    : null
                            }
                            <a
                                style={{
                                    width: 33 + '%',
                                    marginBottom: -15 + 'px',
                                }}
                                onClick={this.startExport}
                                className="extraPadding download">
                                Start Export
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
ExportSetlistModal.propTypes = {
    onClose: PropTypes.func,
    show: PropTypes.bool,
    exportSetlistKey: PropTypes.string,
};

ExportSetlistModal.defaultProps = {
    onClose: () => { },
    show: false,
    exportSetlistKey: '',
};

export default ExportSetlistModal;
