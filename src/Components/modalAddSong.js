
import React from 'react'
import PropTypes from 'prop-types';
import AsyncSelect from 'react-select/lib/Async';
import { executeRawSql, saveSongByIDToSetlist, saveSongToSetlist } from '../sqliteService';

const customStyles = {
    option: (provided, state) => {
        const obj = {
            ...provided,
            alignItems: 'left',
            justifyContent: 'left',
            textAlign: 'left',
        }
        return obj;
    },
}
const defaultState = {
    selectedSongs: [],
    showArrangements: false,
}
class AddSongModal extends React.Component {
    constructor(props) {
        super(props);
        this.state = { ...defaultState }
    }

    onHide = (e) => {
        this.setState({ ...defaultState });
        this.props.onClose();
    }

    handleTagsChange = async (newValue) => {
        this.setState({ selectedSongs: newValue });
    }

    addToSetlist = async () => {
        for (let i = 0; i < this.state.selectedSongs.length; i += 1) {
            const item = this.state.selectedSongs[i];
            if (item.isArrangement) {
                // eslint-disable-next-line
                await saveSongByIDToSetlist(this.props.exportSetlistKey, item.id);
            }
            else {
                // eslint-disable-next-line
                await saveSongToSetlist(this.props.exportSetlistKey, item.song, item.artist);
            }
        }
        this.onHide();
    }

    songOptions = async (inputValue) => {
        return new Promise(async (resolve, reject) => {
            let ft = [];
            const svar = this.state.showArrangements ? "" : "group by song";
            if (inputValue) {
                const sql = `select id, song, artist, album, 
                        uniqkey, arrangement from songs_owned 
                        where song like '%${escape(inputValue)}%'  
                        OR artist like '%${escape(inputValue)}%' 
                        ${svar}
                        `;
                const res = await executeRawSql(sql, true);
                if (res.length > 0) {
                    ft = res.map((x) => {
                        const album = unescape(x.album);

                        let arr = "";
                        if (this.state.showArrangements) {
                            if (x.arrangement.toLowerCase().includes("lead")) arr = "(L)";
                            else if (x.arrangement.toLowerCase().includes("rhythm")) arr = "(R)";
                            else if (x.arrangement.toLowerCase().includes("bass")) arr = "(B)";
                        }

                        const length = 55;
                        let label = `${arr} ${unescape(x.song)} - ${unescape(x.artist)} - ${album}`;
                        label = label.length > length ? label.substr(0, length) + "..." : label;
                        const obj = {
                            value: x.uniqkey,
                            label,
                            song: unescape(x.song),
                            artist: unescape(x.artist),
                            id: x.id,
                            isArrangement: this.state.showArrangements,
                        }
                        return obj;
                    })
                }
            }
            resolve(ft);
        });
    }

    render() {
        return (
            <div style={{ display: this.props.show ? "block" : "none" }}>
                <div id="open-modal" className="modal-window" style={{ opacity: 1, pointerEvents: "auto" }}>
                    <div id="modal-info" style={{ width: 25 + '%' }}>
                        <a title="Close" className="modal-close" onClick={this.onHide}>Close</a>
                        <div style={{ textAlign: 'center' }}>
                            <h3>Add Songs to Setlist</h3>
                            <hr />
                            <div>
                                <div style={{
                                    marginBottom: 8 + 'px',
                                    marginLeft: 2 + 'px',
                                    marginTop: -8 + 'px',
                                }}>
                                    <span>Setlist: </span>
                                    <span className="font-weight-bold"> {unescape(this.props.exportSetlistName)}</span>
                                </div>
                                <AsyncSelect
                                    value={this.state.selectedSongs}
                                    isMulti
                                    styles={customStyles}
                                    placeholder="search by title or artist..."
                                    loadOptions={this.songOptions}
                                    onChange={this.handleTagsChange}
                                    autoFocus
                                />
                                <div style={{
                                    textAlign: 'center',
                                    marginTop: 4 + 'px',
                                    marginBottom: -5 + 'px',
                                }}>
                                    <input
                                        checked={this.state.showArrangements}
                                        id="arr"
                                        type="checkbox"
                                        onChange={(e) => {
                                            this.setState((prevState, props) => {
                                                return {
                                                    showArrangements: !prevState.showArrangements,
                                                };
                                            })
                                        }}
                                    />
                                    <label
                                        style={{
                                            marginLeft: 5 + 'px',
                                        }}
                                        htmlFor="arr">Show Arrangements</label>
                                </div>
                                <button
                                    type="button"
                                    style={{
                                        width: 33 + '%',
                                        marginTop: 25 + 'px',
                                    }}
                                    onClick={this.addToSetlist}
                                    className="extraPadding download">
                                    Add Songs
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

AddSongModal.propTypes = {
    show: PropTypes.bool,
    exportSetlistKey: PropTypes.string,
    exportSetlistName: PropTypes.string,
    onClose: PropTypes.func,
}
AddSongModal.defaultProps = {
    show: false,
    exportSetlistKey: '',
    exportSetlistName: '',
    onClose: () => { },
}

export default AddSongModal;
