import React from 'react'
import Select from 'react-select';
import PropTypes from 'prop-types';
import {
    RemoteAll,
    unescapeFormatter, difficultyFormatter, difficultyClass, round100Formatter,
    countFormmatter, badgeFormatter, arrangmentFormatter, tuningFormatter,
} from './songlistView';
import SongDetailView from './songdetailView';
import readProfile from '../steamprofileService';
import {
    addToFavorites, initSetlistPlaylistDB, getSongsFromPlaylistDB,
    removeSongFromSetlist, updateMasteryandPlayed, initSongsOwnedDB,
    getSetlistMetaInfo, getSongsFromGeneratedPlaylist, removeSongFromSetlistByUniqKey,
} from '../sqliteService';
import getProfileConfig, { updateProfileConfig, getScoreAttackConfig } from '../configService';
import SetlistOptions from './setlistOptions';

const { path } = window;
const options = [
    { value: 'pathLead', label: 'Lead' },
    { value: 'pathRhythm', label: 'Rhythm' },
    { value: 'pathBass', label: 'Bass' },
];
const customStyles = {
    container: styles => ({
        ...styles, display: 'inline-flex', marginTop: 12 + 'px',
    }),
    control: styles => ({
        ...styles, backgroundColor: 'white', color: 'black', width: 255 + 'px',
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
export default class SetlistView extends React.Component {
    constructor(props) {
        super(props);
        this.tabname = "tab-setlist"
        this.state = {
            songs: [],
            page: 1,
            totalSize: 0,
            sizePerPage: 50,
            showDetail: false,
            showSong: '',
            showArtist: '',
            showSAStats: true,
            showOptions: false,
            setlistMeta: {},
            isDeleted: false,
            selectedPathOption: [],
            songData: {},
        };
        this.search = null;
        this.columns = [
            {
                dataField: "id",
                text: "ID",
                style: (cell, row, rowIndex, colIndex) => {
                    return {
                        width: '20%',
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
                        width: '20%',
                        cursor: 'pointer',
                    };
                },
                sort: true,
                formatter: unescapeFormatter,
            },
            {
                dataField: "artist",
                text: "Artist",
                style: (cell, row, rowIndex, colIndex) => {
                    return {
                        width: '19%',
                        cursor: 'pointer',
                    };
                },
                sort: true,
                formatter: unescapeFormatter,
            },
            {
                dataField: "album",
                text: "Album",
                style: (cell, row, rowIndex, colIndex) => {
                    return {
                        width: '20%',
                        cursor: 'pointer',
                    };
                },
                sort: true,
                formatter: unescapeFormatter,
            },
            {
                dataField: "json",
                text: 'JSON',
                hidden: true,
            },
            {
                dataField: "arrangement",
                text: "Arrangement",
                style: (cell, row, rowIndex, colIndex) => {
                    return {
                        width: '5%',
                        cursor: 'pointer',
                    };
                },
                sort: true,
                formatter: arrangmentFormatter,
            },
            {
                dataField: "mastery",
                text: "Mastery",
                style: (cell, row, rowIndex, colIndex) => {
                    return {
                        width: '15%',
                        cursor: 'pointer',
                    };
                },
                sort: true,
                formatter: round100Formatter,
            },
            {
                dataField: "tuning_weight",
                text: "Tuning",
                style: (cell, row, rowIndex, colIndex) => {
                    return {
                        width: '5%',
                        cursor: 'pointer',
                    };
                },
                sort: true,
                formatter: tuningFormatter,
            },
            {
                dataField: "count",
                text: "Count",
                style: (cell, row, rowIndex, colIndex) => {
                    return {
                        width: '5%',
                    };
                },
                sort: true,
                formatter: countFormmatter,
            },
            {
                classes: difficultyClass,
                dataField: "difficulty",
                text: "Difficulty",
                style: (cell, row, rowIndex, colIndex) => {
                    return {
                        width: '5%',
                    };
                },
                sort: true,
                formatter: difficultyFormatter,
            },
            {
                dataField: "sa_playcount",
                text: 'Play Count',
                hidden: true,
            },
            {
                dataField: "sa_hs_easy",
                text: 'High Score (Easy)',
                hidden: true,
            },
            {
                dataField: "sa_hs_medium",
                text: 'High Score (Medium)',
                hidden: true,
            },
            {
                dataField: "sa_hs_hard",
                text: 'High Score (Hard)',
                hidden: true,
            },
            {
                dataField: "sa_hs_master",
                text: 'High Score (Master)',
                hidden: true,
            },
            {
                dataField: "sa_badge_master",
                text: 'Badge (Master)',
                hidden: true,
            },
            {
                dataField: "sa_highest_badge",
                text: 'Badges',
                sort: true,
                style: (cell, row, rowIndex, colIndex) => {
                    return {
                        width: '20%',
                        display: this.state.showSAStats ? "" : "none",
                    };
                },
                headerStyle: (cell, row, rowIndex, colIndex) => {
                    return {
                        width: '20%',
                        display: this.state.showSAStats ? "" : "none",
                    };
                },
                formatter: badgeFormatter,
            },
            {
                dataField: "arrangementProperties",
                text: 'ArrProp',
                hidden: true,
            },
            {
                dataField: "capofret",
                text: 'Capo',
                hidden: true,
            },
            {
                dataField: "centoffset",
                text: 'Cent',
                hidden: true,
            },
        ];
        this.rowEvents = {
            onClick: (e, row, rowIndex) => {
                this.setState({
                    showDetail: true,
                    showSong: row.song,
                    showArtist: row.artist,
                    showAlbum: row.album,
                    songData: row,
                })
            },
        };
        this.lastsortfield = "mastery"
        this.lastsortorder = "desc"
        this.lastChildID = props.currentChildTab.id;
        this.fetchMeta();
    }

    shouldComponentUpdate = async (nextprops, nextstate) => {
        if (nextprops.currentChildTab === null) { return false; }
        if (this.lastChildID === nextprops.currentChildTab.id) { return false; }
        this.saveSearch();
        this.lastChildID = nextprops.currentChildTab.id;
        const showSAStats = await getScoreAttackConfig();
        this.fetchMeta();
        this.setState({
            showSAStats, page: 1, totalSize: 0, isDeleted: false,
        }, () => {

        });
        return true;
    }

    getSearch = () => {
        const isgen = this.state.setlistMeta.is_generated === "true";
        if (!isgen) {
            const key = this.tabname + "-" + this.lastChildID;
            const searchData = this.props.getSearch(key);
            if (searchData != null) {
                this.search.value = searchData.search;
                this.handleTableChange('filter', {
                    page: 1,
                    sizePerPage: this.state.sizePerPage,
                    filters: { search: searchData.search },
                    sortField: searchData.sortfield,
                    sortOrder: searchData.sortorder,
                })
                return;
            }
        }
        this.handleTableChange("cdm", {
            page: this.state.page,
            sizePerPage: this.state.sizePerPage,
            filters: {},
        })
    }

    saveSearch = () => {
        const isgen = this.state.setlistMeta.is_generated === "true";
        if (!isgen && this.search !== null) {
            const search = {
                tabname: this.tabname,
                childtabname: this.lastChildID,
                search: this.search.value,
                sortfield: this.lastsortfield,
                sortorder: this.lastsortorder,
            }
            const key = search.tabname + "-" + search.childtabname;
            this.props.saveSearch(key, search);
            this.search.value = "";
        }
    }

    fetchMeta = async () => {
        const metaInfo = await getSetlistMetaInfo(this.lastChildID);
        const showOptions = metaInfo.is_manual == null && metaInfo.is_generated == null;
        //console.log("fetchMeta: ", metaInfo);
        this.setState({
            showOptions, page: 1, totalSize: 0, songs: [], setlistMeta: metaInfo,
        }, () => {
            this.getSearch();
        });
    }

    handlePathChange = (selectedPathOption) => {
        this.setState({ selectedPathOption }, () => this.refreshView());
    }

    handleSearchChange = (e) => {
        this.handleTableChange('filter', {
            page: 1,
            sizePerPage: this.state.sizePerPage,
            filters: { search: e.target.value },
            sortField: null,
            sortOrder: null,
        })
    }

    updateMastery = async () => {
        const prfldb = await getProfileConfig();
        if (prfldb === '' || prfldb === null) {
            this.props.updateHeader(
                this.tabname,
                this.lastChildID,
                `No Profile found, please update it in Settings!`,
            );
            return;
        }
        if (prfldb.length > 0) {
            this.props.updateHeader(
                this.tabname,
                this.lastChildID,
                `Decrypting ${path.basename(prfldb)}`,
            );
            const steamProfile = await readProfile(prfldb);
            const stats = steamProfile.Stats.Songs;
            await updateProfileConfig(prfldb);
            this.props.handleChange();
            this.props.updateHeader(
                this.tabname,
                this.lastChildID,
                `Song Stats Found: ${Object.keys(stats).length}`,
            );
            await initSongsOwnedDB();
            const keys = Object.keys(stats);
            let updatedRows = 0;
            for (let i = 0; i < keys.length; i += 1) {
                const stat = stats[keys[i]];
                const mastery = stat.MasteryPeak;
                const played = stat.PlayedCount;
                this.props.updateHeader(
                    this.tabname,
                    this.lastChildID,
                    `Updating Stat for SongID:  ${keys[i]} (${i}/${keys.length})`,
                );
                /* loop await */ // eslint-disable-next-line
                const rows = await updateMasteryandPlayed(keys[i], mastery, played);
                if (rows === 0) {
                    console.log("Missing ID: " + keys[i]);
                }
                updatedRows += rows;
            }
            this.props.updateHeader(
                this.tabname,
                this.lastChildID,
                "Stats Found: " + updatedRows + ", Total Stats: " + keys.length,
            );
            let output = []
            const isgen = this.state.setlistMeta.is_generated === "true";
            if (isgen) {
                const joinedoutput = await getSongsFromGeneratedPlaylist(
                    this.state.setlistMeta,
                    0,
                    this.state.sizePerPage,
                    this.lastsortfield,
                    this.lastsortorder,
                )
                output = joinedoutput[0]
                output[0].acount = joinedoutput[1].acount
                output[0].songcount = joinedoutput[1].songcount
            } else {
                output = await getSongsFromPlaylistDB(
                    this.lastChildID,
                    0,
                    this.state.sizePerPage,
                    this.lastsortfield,
                    this.lastsortorder,
                    this.search.value,
                    document.getElementById("search_field")
                        ? document.getElementById("search_field").value : "",
                )
            }
            this.setState({ songs: output, page: 1, totalSize: output[0].acount });
        }
    }

    refreshView = async () => {
        this.handleTableChange("cdm", {
            page: this.state.page,
            sizePerPage: this.state.sizePerPage,
            filters: {},
        })
    }

    handleTableChange = async (type, {
        page,
        sizePerPage,
        sortField, //newest sort field
        sortOrder, // newest sort order
        filters, // an object which have current filter status per column
        data,
    }) => {
        if (this.lastChildID === null) { return; }
        const isgen = this.state.setlistMeta.is_generated === "true";
        const zeroIndexPage = page - 1
        const start = zeroIndexPage * sizePerPage;
        let output = []
        if (isgen) {
            const joinedoutput = await getSongsFromGeneratedPlaylist(
                this.state.setlistMeta,
                start,
                sizePerPage,
                typeof sortField === 'undefined' === null ? this.lastsortfield : sortField,
                typeof sortOrder === 'undefined' === null ? this.lastsortorder : sortOrder,
            )
            if (joinedoutput.length > 0) {
                output = joinedoutput[0]
                if (output.length > 0) {
                    output[0].acount = joinedoutput[1].acount
                    output[0].songcount = joinedoutput[1].songcount
                }
            }
        } else {
            const pathOpts = this.state.selectedPathOption.map(x => x.value)
            output = await getSongsFromPlaylistDB(
                this.lastChildID,
                start,
                sizePerPage,
                sortField === null ? this.lastsortfield : sortField,
                sortOrder === null ? this.lastsortorder : sortOrder,
                this.search ? this.search.value : "",
                document.getElementById("search_field") ? document.getElementById("search_field").value : "",
                pathOpts,
            )
        }
        if (sortField !== null && typeof sortField !== 'undefined') { this.lastsortfield = sortField; }
        if (sortOrder !== null && typeof sortField !== 'undefined') { this.lastsortorder = sortOrder; }
        if (output.length > 0) {
            this.props.updateHeader(
                this.tabname,
                this.lastChildID,
                `Songs: ${output[0].songcount}, Arrangements: ${output[0].acount}`,
            );
            this.setState({ songs: output, page, totalSize: output[0].acount });
        }
        else {
            this.props.updateHeader(
                this.tabname,
                this.lastChildID,
                `Songs: 0, Arrangements: 0`,
            );
            this.setState({ songs: output, page, totalSize: 0 });
        }
    }

    updateFavs = async () => {
        const prfldb = await getProfileConfig();
        if (prfldb === '' || prfldb === null) {
            this.props.updateHeader(
                this.tabname,
                this.lastChildID,
                `No Profile found, please update it in Settings!`,
            );
            return;
        }
        if (prfldb.length > 0) {
            this.props.updateHeader(
                this.tabname,
                this.lastChildID,
                `Decrypting ${path.basename(prfldb)}`,
            );
            const steamProfile = await readProfile(prfldb);
            const stats = steamProfile.FavoritesListRoot.FavoritesList;
            await updateProfileConfig(prfldb);
            this.props.handleChange();
            this.props.updateHeader(
                this.tabname,
                this.lastChildID,
                `Favorites Found: ${stats.length}`,
            );
            await initSetlistPlaylistDB('setlist_favorites');
            let updatedRows = 0;
            for (let i = 0; i < stats.length; i += 1) {
                const stat = stats[i];
                this.props.updateHeader(
                    this.tabname,
                    this.lastChildID,
                    `Updating Favorite for SongKey:  ${stat} (${i}/${stats.length})`,
                );
                /* loop await */ // eslint-disable-next-line
                const rows = await addToFavorites(stat);
                if (rows === 0) {
                    console.log("Missing ID: " + stat);
                }
                updatedRows += rows;
            }
            this.props.updateHeader(
                this.tabname,
                this.lastChildID,
                "Favorites Found: " + updatedRows,
            );
            this.refreshView();
        }
    }

    removeFromSetlistByID = async (songData) => {
        const uniq = songData.uniqkey;
        console.log("removing ", uniq);
        removeSongFromSetlistByUniqKey(this.lastChildID, uniq);
        this.handleTableChange('filter', {
            page: 1,
            sizePerPage: this.state.sizePerPage,
            filters: { search: this.search },
            sortField: null,
            sortOrder: null,
        })
    }

    removeFromSetlist = async () => {
        console.log("removing ", this.state.showSong, this.state.showArtist, this.state.showAlbum);
        await removeSongFromSetlist(
            this.lastChildID,
            this.state.showSong,
            this.state.showArtist,
            this.state.showAlbum,
        );
        this.handleTableChange('filter', {
            page: 1,
            sizePerPage: this.state.sizePerPage,
            filters: { search: this.search },
            sortField: null,
            sortOrder: null,
        })
    }

    render = () => {
        const { songs, sizePerPage, page } = this.state;
        const choosepsarchstyle = "extraPadding download " + (this.state.totalSize <= 0 ? "isDisabled" : "");
        const choosesettingsstyle = (this.lastChildID !== "setlist_favorites" && this.state.isDeleted === false && this.state.setlistMeta.is_rssetlist !== "true")
            ? "extraPadding download" : "hidden"
        const setlistinitclass = this.state.showOptions ? "" : "hidden";
        return (
            <div>
                <div
                    className="centerButton list-unstyled"
                    style={{
                        width: 100 + '%',
                        margin: "auto",
                        textAlign: "center",
                    }}>
                    {
                        this.state.setlistMeta.is_manual === "true" || this.state.setlistMeta.is_rssetlist === "true"
                            ? (
                                <div>
                                    <input
                                        ref={(node) => { this.search = node }}
                                        style={{ width: 50 + '%', border: "1px solid black", padding: 5 + "px" }}
                                        name="search"
                                        onChange={this.handleSearchChange}
                                        placeholder="Search..."
                                        type="search"
                                    />
                                    &nbsp; &nbsp;
                                    <select id="search_field" onChange={this.refreshView}>
                                        <option value="anything">Anything</option>
                                        <option value="song">Song</option>
                                        <option value="artist">Artist</option>
                                        <option value="album">Album</option>
                                        <option value="arrangement">Arrangement</option>
                                    </select>
                                    <br />
                                    <Select
                                        value={this.state.selectedPathOption}
                                        onChange={this.handlePathChange}
                                        options={options}
                                        styles={customStyles}
                                        isMulti
                                        placeholder="Filter by path"
                                        isSearchable={false}
                                        isClearable={false}
                                    />
                                    <br />
                                </div>
                            ) : null
                    }
                    {
                        this.lastChildID === "setlist_favorites"
                            ? (
                                <a
                                    onClick={this.updateFavs}
                                    className="extraPadding download">
                                    Update Favorites from RS Profile
                                </a>
                            )
                            : ""
                    }
                    <a
                        onClick={this.updateMastery}
                        className={choosepsarchstyle}>
                        Update Mastery from RS Profile
                    </a>
                    <a
                        style={{ width: 150 + 'px' }}
                        className={choosesettingsstyle}
                        onClick={() => this.setState({ showOptions: true })}>
                        Settings
                    </a>
                    <br />
                </div>
                <div>
                    <RemoteAll
                        keyField="id"
                        data={songs}
                        page={page}
                        sizePerPage={sizePerPage}
                        totalSize={this.state.totalSize}
                        onTableChange={this.handleTableChange}
                        columns={this.columns}
                        rowEvents={this.rowEvents}
                    />
                </div>
                <div>
                    <SongDetailView
                        song={this.state.showSong}
                        artist={this.state.showArtist}
                        album={this.state.showAlbum}
                        songData={this.state.songData}
                        showDetail={this.state.showDetail}
                        close={() => this.setState({ showDetail: false })}
                        isSetlist
                        removeFromSetlist={this.removeFromSetlist}
                        removeFromSetlistByID={this.removeFromSetlistByID}
                        isGenerated={this.state.setlistMeta.is_generated === "true"}
                        isRSSetlist={this.state.setlistMeta.is_rssetlist === "true"}
                    />
                </div>
                <div className={setlistinitclass}>
                    <SetlistOptions
                        table={this.lastChildID}
                        info={this.state.setlistMeta}
                        close={() => this.setState({ showOptions: false })}
                        showOptions={this.state.showOptions}
                        refreshTabs={this.props.refreshTabs}
                        fetchMeta={this.fetchMeta}
                        clearPage={() => {
                            this.props.updateHeader(
                                this.tabname,
                                this.lastChildID,
                                `Setlist deleted`,
                            );
                            this.setState({
                                isDeleted: true,
                                songs: [],
                                page: 1,
                                totalSize: 0,
                            });
                        }}
                    />
                </div>
            </div>
        );
    }
}
SetlistView.propTypes = {
    //currentTab: PropTypes.object,
    currentChildTab: PropTypes.object,
    updateHeader: PropTypes.func,
    //resetHeader: PropTypes.func,
    handleChange: PropTypes.func,
    refreshTabs: PropTypes.func,
    saveSearch: PropTypes.func,
    getSearch: PropTypes.func,
}
SetlistView.defaultProps = {
    //currentTab: null,
    currentChildTab: null,
    updateHeader: () => { },
    //resetHeader: () => { },
    handleChange: () => { },
    refreshTabs: () => { },
    saveSearch: () => { },
    getSearch: () => { },
}
