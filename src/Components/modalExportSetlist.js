import React from 'react'
import PropTypes from 'prop-types';
import Select from 'react-select';
import getProfileConfig, { writeFile, getImportRSMConfig, getSteamIDConfig } from '../configService';
import { getSetlistMetaInfo, executeRawSql } from '../sqliteService';
import { executeRSMRequest } from '../rsrtoolservice';
import { getProfileName } from '../steamprofileService';
import { generateSql } from './setlistOptions';

const selectoptions = [
    { value: 'json', label: 'JSON' },
    { value: 'songlist', label: 'Rocksmith Song List' },
];

const rssonglistoptions = [
    { value: 'F', label: 'Favorites' },
    { value: '1', label: 'Song List 1' },
    { value: '2', label: 'Song List 2' },
    { value: '3', label: 'Song List 3' },
    { value: '4', label: 'Song List 4' },
    { value: '5', label: 'Song List 5' },
    { value: '6', label: 'Song List 6' },
]
const defaultState = {
    selectedOption: null,
    selectedSonglist: null,
    showMessage: null,
    messageType: 'alert-success',
    processing: false,
    steamID: '',
    profileName: '',
    launchRS: false,
    showRSWarning: true,
}
class ExportSetlistModal extends React.Component {
    constructor(props) {
        super(props);
        this.state = { ...defaultState }
    }

    successMsg = (msg = null) => { this.setState({ showMessage: (<span>Exported Successfully! {msg}</span>), messageType: 'alert-success' }) }

    failureMsg = (msg) => { this.setState({ showMessage: (<span>Export Failed: {msg}</span>), messageType: 'alert-danger' }) }

    shouldComponentUpdate = async (nextProps, nextState) => {
        if (nextProps === this.props) return false;
        const steamID = await getSteamIDConfig();
        const profileName = await getProfileName(await getProfileConfig());
        this.setState({ steamID, profileName });
        return true;
    }

    handleChange = (selectedOption) => {
        this.setState({ selectedOption });
        if (selectedOption && selectedOption.value === "songlist") {
            this.setState({
                showRSWarning: true,
                showMessage: null,
            });
        }
    }

    handleSonglist = (selectedSonglist) => {
        this.setState({ selectedSonglist })
    }

    startExport = async () => {
        this.setState({
            showRSWarning: false,
            showMessage: null,
            launchRS: false,
            processing: false,
        })
        if (this.state.selectedOption === null) {
            this.failureMsg("invalid export option")
            return;
        }
        if (this.state.selectedOption.value === "json") {
            this.setlistExportToJSON(this.props.exportSetlistKey);
        }
        else {
            if (this.state.selectedSonglist === null) {
                this.failureMsg("invalid songlist selected")
            }
            else {
                if (!await this.checkImportRSM()) return;

                if (this.state.steamID === '') {
                    this.failureMsg("invalid steam profile, please use Settings to login to Steam")
                    return;
                }
                if (this.state.profileName === '') {
                    this.failureMsg("invalid Rocksmith profile, please choose your profile in Settings")
                    return;
                }
                this.setState({ processing: true })
                const songKeys = await this.setlistToSongKeys(this.props.exportSetlistKey);
                const [ret, logs, tmpDir] = await executeRSMRequest(
                    this.state.steamID,
                    this.state.profileName,
                    this.state.selectedSonglist.value,
                    songKeys,
                );
                this.setState({ processing: false })
                if (ret) {
                    this.setState({ launchRS: true })
                    this.successMsg(
                        (
                            <div>
                                A backup of your profile was created&nbsp;
                                <span style={{ textDecoration: 'underline' }}>
                                    <a href="#" onClick={() => window.shell.showItemInFolder(tmpDir)}>
                                        here.
                                    </a>
                                </span>
                            </div>
                        ),
                    );
                }
                else {
                    this.failureMsg(
                        (
                            <React.Fragment>
                                <span>an error occurred</span>
                                <pre style={{
                                    width: 100 + '%',
                                    height: 200 + 'px',
                                    overflow: 'auto',
                                    overflowX: 'hidden',
                                    textAlign: 'left',
                                    wordBreak: 'break-all',
                                    userSelect: 'text',
                                    marginLeft: -15 + 'px',
                                    marginRight: -15 + 'px',
                                }}>
                                    {logs}
                                </pre>
                            </React.Fragment>
                        ),
                    );
                }
            }
        }
    }

    checkImportRSM = async () => {
        const path = await getImportRSMConfig();
        if (path === '' || !window.electronFS.existsSync(path)) {
            this.failureMsg(
                (
                    <span>invalid importrsm path, please install rsrtools from &nbsp;
                    <a
                            href="#"
                            onClick={() => window.shell.openExternal('https://pypi.org/project/rsrtools/')}
                            style={{ textDecoration: 'underline' }}>
                            https://pypi.org/project/rsrtools/
                     </a>&nbsp;
                        or update settings with correct path.</span>
                ),
            );
            return false;
        }
        return true;
    }

    setlistToSongKeys = async (key) => {
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
        return songKeys;
    }

    setlistExportToJSON = async (key) => {
        const songKeys = await this.setlistToSongKeys(key);
        const setlist = await getSetlistMetaInfo(key);

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
            this.failureMsg("No songs found in setlist")
        }
    }

    onHide = (e) => {
        this.setState({ ...defaultState });
        this.props.onClose();
    }

    render() {
        const { selectedOption, selectedSonglist } = this.state;
        const alertClass = `alert ${this.state.messageType}`
        return (
            <div style={{ display: this.props.show ? "block" : "none" }}>
                <div id="open-modal" className="modal-window" style={{ opacity: 1, pointerEvents: "auto" }}>
                    <div id="modal-info" style={{ width: 25 + '%' }}>
                        <a title="Close" className="modal-close" onClick={this.onHide}>Close</a>
                        <div style={{ textAlign: 'center' }}>
                            <h3>Export setlist as:</h3>
                            <hr />
                            <div>
                                <div style={{
                                    marginBottom: 8 + 'px',
                                    marginLeft: 2 + 'px',
                                    marginTop: -8 + 'px',
                                }}>
                                    <span>Setlist: </span>
                                    <span className="font-weight-bold"> {this.props.exportSetlistName}</span>
                                    <br />
                                    <span>Rocksmith Profile: </span>
                                    <span className="font-weight-bold"> {this.state.profileName}</span>
                                </div>
                                <div style={{
                                    marginBottom: 10 + 'px',
                                }}>
                                    <Select
                                        value={selectedOption}
                                        onChange={this.handleChange}
                                        options={selectoptions}
                                    />
                                </div>
                                {
                                    this.state.selectedOption && this.state.selectedOption.value === "songlist"
                                        ? (
                                            <div style={{
                                                marginTop: 10 + 'px',
                                                marginBottom: 10 + 'px',
                                            }}>
                                                <Select
                                                    value={selectedSonglist}
                                                    onChange={this.handleSonglist}
                                                    options={rssonglistoptions}
                                                />
                                                {
                                                    this.state.showRSWarning
                                                        ? (
                                                            <div className="alert alert-info" style={{ marginTop: 15 + 'px' }}>
                                                                <span>
                                                                    Please make sure
                                                                    Rocksmith 2014 is not
                                                                    running when you export.
                                                                </span>
                                                            </div>
                                                        ) : null
                                                }
                                            </div>
                                        )
                                        : null
                                }
                                {
                                    this.state.showMessage
                                        ? (
                                            <div className={alertClass} style={{ marginTop: 15 + 'px' }}>
                                                {this.state.showMessage}
                                            </div>
                                        )
                                        : null
                                }
                            </div>
                            {
                                this.state.processing
                                    ? (
                                        <div className="alert alert-info" style={{ marginTop: 15 + 'px' }}>
                                            <span>
                                                Processing, please wait...
                                            </span>
                                        </div>
                                    )
                                    : (
                                        <a
                                            style={{
                                                width: 33 + '%',
                                                marginBottom: -15 + 'px',
                                            }}
                                            onClick={this.startExport}
                                            className="extraPadding download">
                                            Start Export
                                        </a>
                                    )
                            }
                            {
                                this.state.launchRS
                                    ? (
                                        <a
                                            style={{
                                                width: 40 + '%',
                                                marginBottom: -15 + 'px',
                                            }}
                                            onClick={() => window.shell.openExternal("steam://run/221680")}
                                            className="extraPadding download">
                                            steam://run/rocksmith
                                        </a>
                                    )
                                    : null
                            }

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
    exportSetlistName: PropTypes.string,
};

ExportSetlistModal.defaultProps = {
    onClose: () => { },
    show: false,
    exportSetlistKey: '',
    exportSetlistName: '',
};

export default ExportSetlistModal;
