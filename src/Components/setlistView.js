import React from 'react'
import Select from 'react-select';
import PropTypes from 'prop-types';
import { withI18n, Trans } from 'react-i18next';
import StatsTableView, { getStatsWidth } from './statsTableView';
import {
    RemoteAll,
    unescapeFormatter, difficultyFormatter, difficultyClass, round100Formatter,
    countFormmatter, badgeFormatter, arrangmentFormatter, tuningFormatter,
} from './songlistView';
import SongDetailView from './songdetailView';
import {
    getSongsFromPlaylistDB,
    removeSongFromSetlist, getSetlistMetaInfo,
    getSongsFromGeneratedPlaylist, removeSongFromSetlistByUniqKey,
    executeRawSql, getLeadStats, getRhythmStats, getBassStats, countSongsOwned,
    getSAStats,
} from '../sqliteService';
import {
    getScoreAttackConfig,
    getDefaultSortOptionConfig, getScoreAttackDashboardConfig,
} from '../configService';
import SetlistOptions, { generateSql } from './setlistOptions';
import ExportSetlistModal from './modalExportSetlist';
import AddSongModal from './modalAddSong';
import { DispatcherService, DispatchEvents } from '../lib/libdispatcher';
import { profileWorker } from '../lib/libworker';

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
export const generateOrderSql = (sortOptions, withOrder = false) => {
    //song asc, mastery desc
    let ordersql = ""
    for (let i = 0; i < sortOptions.length; i += 1) {
        const option = sortOptions[i]
        const [field, order] = option.value.split("-");
        if (i === sortOptions.length - 1) {
            ordersql += `${field} ${order} `
        } else {
            ordersql += `${field} ${order}, `
        }
    }
    if (withOrder) {
        ordersql = "ORDER BY " + ordersql;
    }
    return ordersql;
}
class SetlistView extends React.Component {
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

            scoreAttackDashboard: [false, false, false, false],
            scdTrueLength: 0,
            lead: [0, 0, 0, 0, 0, 0, 0, 0],
            leadwidth: [0, 0, 0, 0, 0, 0, 0, 0],
            rhythm: [0, 0, 0, 0, 0, 0, 0, 0],
            rhythmwidth: [0, 0, 0, 0, 0, 0, 0, 0],
            bass: [0, 0, 0, 0, 0, 0, 0, 0],
            basswidth: [0, 0, 0, 0, 0, 0, 0, 0],

            sahard: [0, 0, 0, 0, 0, 0, 0],
            sahardwidth: [0, 0, 0, 0, 0, 0, 0],
            samaster: [0, 0, 0, 0, 0, 0, 0],
            samasterwidth: [0, 0, 0, 0, 0, 0, 0],
            samedium: [0, 0, 0, 0, 0, 0, 0],
            samediumwidth: [0, 0, 0, 0, 0, 0, 0],
            saeasy: [0, 0, 0, 0, 0, 0, 0],
            saeasywidth: [0, 0, 0, 0, 0, 0, 0],

            modal_no_lead: false,
            modal_no_bass: false,
            modal_no_rhythm: false,
            modal_no_path_stats: false,
            modal_no_sa_easy: false,
            modal_no_sa_medium: false,
            modal_no_sa_hard: false,
            modal_no_sa_master: false,
            modal_no_sa_stats: false,

            showExportOptions: false,
            showAddOptions: false,
        };
        this.search = null;
        this.columns = [
            {
                dataField: "id",
                text: this.props.t("ID"),
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
                text: this.props.t("Song"),
                style: (cell, row, rowIndex, colIndex) => {
                    return {
                        width: '20%',
                        cursor: 'pointer',
                    };
                },
                sort: true,
                formatter: unescapeFormatter,
                formatExtraData: {
                    globalNotes: this.props.globalNotes,
                },
            },
            {
                dataField: "artist",
                text: this.props.t("Artist"),
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
                text: this.props.t("Album"),
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
                text: this.props.t("Arrangement"),
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
                text: this.props.t("Mastery"),
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
                text: this.props.t("Tuning"),
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
                text: this.props.t("Count"),
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
                text: this.props.t("Difficulty"),
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
        this.lastChildID = props.currentChildTab.id;
        this.fetchMeta();
    }

    shouldComponentUpdate = async (nextprops, nextstate) => {
        if (this.props === nextprops) { return false; }
        if (nextprops.currentChildTab === null) { return false; }
        if (this.lastChildID === nextprops.currentChildTab.id) { return false; }
        this.saveSearch();

        this.lastChildID = nextprops.currentChildTab.id;
        const showSAStats = await getScoreAttackConfig();
        await this.fetchMeta({
            showSAStats,
            page: 1,
            totalSize: 0,
            isDeleted: false,
        });
        return true;
    }

    componentDidMount = () => {
        DispatcherService.on(DispatchEvents.PROFILE_UPDATED, this.refresh);
    }

    componentWillUnmount = () => {
        DispatcherService.off(DispatchEvents.PROFILE_UPDATED, this.refresh);
    }

    getSortOptions = async () => {
        try {
            let sortOptions = JSON.parse(this.state.setlistMeta.sort_options);
            if (sortOptions.length > 0) {
                return sortOptions;
            }
            else {
                sortOptions = await getDefaultSortOptionConfig();
                return sortOptions;
            }
        }
        catch (e) {
            console.log(e)
        }
        return []
    }

    getSearch = async () => {
        const sortOptions = await this.getSortOptions();
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
                    sortOptions,
                })
                return;
            }
        }
        this.handleTableChange("cdm", {
            page: this.state.page,
            sizePerPage: this.state.sizePerPage,
            filters: {},
            sortOptions,
        })
    }

    saveSearch = () => {
        const isgen = this.state.setlistMeta.is_generated === "true";
        if (!isgen && this.search !== null) {
            const search = {
                tabname: this.tabname,
                childtabname: this.lastChildID,
                search: this.search.value,
            }
            const key = search.tabname + "-" + search.childtabname;
            this.props.saveSearch(key, search);
            this.search.value = "";
        }
    }

    fetchMeta = async (resetobj = {}) => {
        const metaInfo = await getSetlistMetaInfo(this.lastChildID);
        const showOptions = metaInfo.is_manual == null && metaInfo.is_generated == null;
        const scoreAttackDashboard = await getScoreAttackDashboardConfig();
        const scdTrueLength = scoreAttackDashboard.filter(x => x).length;
        const stats = await this.generateStats(metaInfo);
        //console.log("fetchMeta: ", metaInfo);
        this.setState({
            showOptions,
            page: 1,
            totalSize: 0,
            songs: [],
            setlistMeta: metaInfo,
            scoreAttackDashboard,
            scdTrueLength,
            ...stats,
            ...resetobj,
        }, () => {
            this.getSearch();
        });
    }

    generateStats = async (meta) => {
        let selectsql = "";
        if (meta.is_generated === "true") {
            const jsonObj = JSON.parse(meta.view_sql)
            if (jsonObj.length === 0) {
                console.log("no stats available");
                return {};
            }
            selectsql = generateSql(jsonObj);
        }
        else {
            selectsql = `select * from songs_owned where uniqkey in (select * from ${this.lastChildID});`
        }
        const viewname = "view_" + this.lastChildID
        const dropsql = `DROP VIEW IF EXISTS ${viewname}`
        await executeRawSql(dropsql);
        const viewsql = `CREATE TEMP VIEW IF NOT EXISTS ${viewname} AS ` + selectsql;
        await executeRawSql(viewsql);
        const leadStats = await getLeadStats(true, viewname)
        const lup = leadStats.l - (leadStats.l1 + leadStats.l2 + leadStats.l3
            + leadStats.l4 + leadStats.l5 + leadStats.l6)
        const rhythmStats = await getRhythmStats(true, viewname);
        const rup = rhythmStats.r - (rhythmStats.r1 + rhythmStats.r2 + rhythmStats.r3
            + rhythmStats.r4 + rhythmStats.r5 + rhythmStats.r6)
        const bassStats = await getBassStats(true, viewname);
        const bup = bassStats.b - (bassStats.b1 + bassStats.b2 + bassStats.b3
            + bassStats.b4 + bassStats.b5 + bassStats.b6)
        const saStats = await getSAStats("sa_badge_hard", "sa_fc_hard", true, viewname);
        const samStats = await getSAStats("sa_badge_master", "sa_fc_master", true, viewname)
        const sameStats = await getSAStats("sa_badge_medium", "sa_fc_medium", true, viewname);
        const saeStats = await getSAStats("sa_badge_easy", "sa_fc_easy", true, viewname);
        const songscount = await countSongsOwned(true, viewname);
        const nopathstats = ((leadStats.l === 0)
            && (rhythmStats.r === 0)
            && (bassStats.b === 0))
        const nosaeasy = ((saeStats.saplat === 0)
            && (saeStats.sagold === 0)
            && (saeStats.sasilver === 0)
            && (saeStats.sabronze === 0)
            && (saeStats.safailed === 0))
        const nosamedium = ((sameStats.saplat === 0)
            && (sameStats.sagold === 0)
            && (sameStats.sasilver === 0)
            && (sameStats.sabronze === 0)
            && (sameStats.safailed === 0))
        const nosahard = ((saStats.saplat === 0)
            && (saStats.sagold === 0)
            && (saStats.sasilver === 0)
            && (saStats.sabronze === 0)
            && (saStats.safailed === 0))
        const nosamaster = ((samStats.saplat === 0)
            && (samStats.sagold === 0)
            && (samStats.sasilver === 0)
            && (samStats.sabronze === 0)
            && (samStats.safailed === 0))
        const nosastats = ((nosaeasy && nosamedium && nosahard && nosamaster))
        return ({
            modal_no_lead: leadStats.l === 0,
            modal_no_rhythm: rhythmStats.r === 0,
            modal_no_bass: bassStats.b === 0,
            modal_no_path_stats: nopathstats,
            modal_no_sa_easy: nosaeasy,
            modal_no_sa_medium: nosamedium,
            modal_no_sa_hard: nosahard,
            modal_no_sa_master: nosamaster,
            modal_no_sa_stats: nosastats,
            lead: [
                leadStats.l,
                leadStats.l1, leadStats.l2, leadStats.l3,
                leadStats.l4, leadStats.l5, leadStats.l6,
                lup,
            ],
            leadwidth: [
                0,
                getStatsWidth(leadStats.l1, 0, leadStats.l),
                getStatsWidth(leadStats.l2, 0, leadStats.l),
                getStatsWidth(leadStats.l3, 0, leadStats.l),
                getStatsWidth(leadStats.l4, 0, leadStats.l),
                getStatsWidth(leadStats.l5, 0, leadStats.l),
                getStatsWidth(leadStats.l6, 0, leadStats.l),
                getStatsWidth(lup, 0, leadStats.l),
            ],
            rhythm: [
                rhythmStats.r,
                rhythmStats.r1, rhythmStats.r2, rhythmStats.r3,
                rhythmStats.r4, rhythmStats.r5, rhythmStats.r6,
                rup,
            ],
            rhythmwidth: [
                0,
                getStatsWidth(rhythmStats.r1, 0, rhythmStats.r),
                getStatsWidth(rhythmStats.r2, 0, rhythmStats.r),
                getStatsWidth(rhythmStats.r3, 0, rhythmStats.r),
                getStatsWidth(rhythmStats.r4, 0, rhythmStats.r),
                getStatsWidth(rhythmStats.r5, 0, rhythmStats.r),
                getStatsWidth(rhythmStats.r6, 0, rhythmStats.r),
                getStatsWidth(rup, 0, rhythmStats.r),
            ],
            bass: [
                bassStats.b,
                bassStats.b1, bassStats.b2, bassStats.b3,
                bassStats.b4, bassStats.b5, bassStats.b6,
                bup,
            ],
            basswidth: [
                0,
                getStatsWidth(bassStats.b1, 0, bassStats.b),
                getStatsWidth(bassStats.b2, 0, bassStats.b),
                getStatsWidth(bassStats.b3, 0, bassStats.b),
                getStatsWidth(bassStats.b4, 0, bassStats.b),
                getStatsWidth(bassStats.b5, 0, bassStats.b),
                getStatsWidth(bassStats.b6, 0, bassStats.b),
                getStatsWidth(bup, 0, bassStats.b),
            ],
            satotal: songscount.count,
            /* hard */
            sahard: [
                saStats.saplat, saStats.sagold, saStats.sasilver,
                saStats.sabronze, saStats.safailed, songscount.count - saStats.satotal,
                saStats.safcs,
            ],
            sahardwidth: [
                getStatsWidth(saStats.saplat, 0, songscount.count),
                getStatsWidth(saStats.sagold, 0, songscount.count),
                getStatsWidth(saStats.sasilver, 0, songscount.count),
                getStatsWidth(saStats.sabronze, 0, songscount.count),
                getStatsWidth(saStats.safailed, 0, songscount.count),
                getStatsWidth(songscount.count - saStats.satotal, 0, songscount.count),
                getStatsWidth(saStats.safcs, 0, songscount.count),
            ],
            /* master */
            samaster: [
                samStats.saplat, samStats.sagold, samStats.sasilver,
                samStats.sabronze, samStats.safailed, songscount.count - samStats.satotal,
                samStats.safcs,
            ],
            samasterwidth: [
                getStatsWidth(samStats.saplat, 0, songscount.count),
                getStatsWidth(samStats.sagold, 0, songscount.count),
                getStatsWidth(samStats.sasilver, 0, songscount.count),
                getStatsWidth(samStats.sabronze, 0, songscount.count),
                getStatsWidth(samStats.safailed, 0, songscount.count),
                getStatsWidth(songscount.count - samStats.satotal, 0, songscount.count),
                getStatsWidth(samStats.safcs, 0, songscount.count),
            ],
            /* medium */
            samedium: [
                sameStats.saplat, sameStats.sagold, sameStats.sasilver,
                sameStats.sabronze, sameStats.safailed, songscount.count - sameStats.satotal,
                sameStats.safcs,
            ],
            samediumwidth: [
                getStatsWidth(sameStats.saplat, 0, songscount.count),
                getStatsWidth(sameStats.sagold, 0, songscount.count),
                getStatsWidth(sameStats.sasilver, 0, songscount.count),
                getStatsWidth(sameStats.sabronze, 0, songscount.count),
                getStatsWidth(sameStats.safailed, 0, songscount.count),
                getStatsWidth(songscount.count - sameStats.satotal, 0, songscount.count),
                getStatsWidth(sameStats.safcs, 0, songscount.count),
            ],
            /* easy */
            saeasy: [
                saeStats.saplat, saeStats.sagold, saeStats.sasilver,
                saeStats.sabronze, saeStats.safailed, songscount.count - saeStats.satotal,
                saeStats.safcs,
            ],
            saeasywidth: [
                getStatsWidth(saeStats.saplat, 0, songscount.count),
                getStatsWidth(saeStats.sagold, 0, songscount.count),
                getStatsWidth(saeStats.sasilver, 0, songscount.count),
                getStatsWidth(saeStats.sabronze, 0, songscount.count),
                getStatsWidth(saeStats.safailed, 0, songscount.count),
                getStatsWidth(songscount.count - saeStats.satotal, 0, songscount.count),
                getStatsWidth(saeStats.safcs, 0, songscount.count),
            ],
        })
    }

    handlePathChange = (selectedPathOption) => {
        this.setState({ selectedPathOption }, () => this.refreshView());
    }

    handleSearchChange = (e) => {
        this.handleTableChange('filter', {
            page: 1,
            sizePerPage: this.state.sizePerPage,
            filters: { search: e.target.value },
        })
    }

    updateMastery = async () => {
        profileWorker.startWork();
    }

    refresh = async () => {
        let output = []
        const isgen = this.state.setlistMeta.is_generated === "true";
        const sortOptions = await this.getSortOptions();
        if (isgen) {
            const joinedoutput = await getSongsFromGeneratedPlaylist(
                this.state.setlistMeta,
                0,
                this.state.sizePerPage,
                "",
                "",
                sortOptions,
            )
            output = joinedoutput[0]
            output[0].acount = joinedoutput[1].acount
            output[0].songcount = joinedoutput[1].songcount
        } else {
            output = await getSongsFromPlaylistDB(
                this.lastChildID,
                0,
                this.state.sizePerPage,
                "",
                "",
                this.search.value,
                document.getElementById("search_field")
                    ? document.getElementById("search_field").value : "",
                [],
                sortOptions,
            )
        }
        this.setState({ songs: output, page: 1, totalSize: output[0].acount });
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
        sortOptions,
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
                typeof sortField === 'undefined' === null ? "mastery" : sortField,
                typeof sortOrder === 'undefined' === null ? "desc" : sortOrder,
                sortOptions,
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
                typeof sortField === 'undefined' === null ? "mastery" : sortField,
                typeof sortOrder === 'undefined' === null ? "desc" : sortOrder,
                this.search ? this.search.value : "",
                document.getElementById("search_field") ? document.getElementById("search_field").value : "",
                pathOpts,
                sortOptions,
            )
        }
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
        await profileWorker.startImport();
        this.refreshView();
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
        const choosepsarchstyle = "extraPadding download ellipsify-text" + (this.state.totalSize <= 0 ? "isDisabled" : "");
        const choosesettingsstyle = (this.state.isDeleted === false)
            ? "extraPadding download ellipsify-text " : "hidden"
        const setlistinitclass = this.state.showOptions ? "" : "hidden";
        let sacolwidth = "col-sm-3";
        if (this.state.scdTrueLength > 2) sacolwidth = "col-sm-2-2"
        const scoreattackstyle = "col ta-center dashboard-bottom " + (this.state.showSAStats ? sacolwidth : "hidden");
        const arrstyle = "col ta-center dashboard-bottom col-md-3";
        const modalstyle = {
            opacity: this.props.showModalStats ? 1 : 0,
            pointerEvents: this.props.showModalStats ? 'auto' : '',
        }
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
                                <div style={{ marginBottom: 10 + 'px' }}>
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
                                        <option value="anything">{this.props.t('Anything')}</option>
                                        <option value="song">{this.props.t('Song')}</option>
                                        <option value="artist">{this.props.t('Artist')}</option>
                                        <option value="album">{this.props.t('Album')}</option>
                                        <option value="arrangement">{this.props.t('Arrangement')}</option>
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
                                <button
                                    style={{ width: 165 + 'px' }}
                                    type="button"
                                    onClick={this.updateFavs}
                                    className="extraPadding download">
                                    <Trans i18nKey="updateFavorites">
                                        Update Favorites
                                    </Trans>
                                </button>
                            )
                            : null
                    }
                    {
                        this.state.setlistMeta.is_generated === "false"
                            && this.state.setlistMeta.is_rssetlist === "false"
                            ? (
                                <button
                                    type="button"
                                    style={{ width: 165 + 'px' }}
                                    className={choosesettingsstyle}
                                    onClick={() => this.setState({ showAddOptions: true })}>
                                    <Trans i18nKey="addRemoveSongs">
                                        Add / Remove Songs
                                    </Trans>
                                </button>
                            )
                            : null
                    }
                    <button
                        type="button"
                        style={{ width: 15 + '%' }}
                        onClick={this.updateMastery}
                        className={choosepsarchstyle}>
                        <Trans i18nKey="updateMastery">
                            Refresh Stats from Profile
                        </Trans>
                    </button>
                    <button
                        type="button"
                        style={{ width: 150 + 'px' }}
                        className={choosepsarchstyle}
                        onClick={() => this.setState({ showExportOptions: true })}>
                        <Trans i18nKey="export">
                            Export
                        </Trans>
                    </button>
                    <button
                        type="button"
                        style={{ width: 150 + 'px' }}
                        className={choosesettingsstyle}
                        onClick={() => this.setState({ showOptions: true })}>
                        <Trans i18nKey="settings">
                            Settings
                        </Trans>
                    </button>
                    <br />
                </div>
                <div className="modal-sa-stat" id="open-modal" style={modalstyle}>
                    <div>
                        <div className="row justify-content-md-center" style={{ marginTop: 10 + 'px' }}>
                            <div style={{ color: 'white', display: this.state.modal_no_path_stats ? "block" : "none" }}>
                                No Path Stats
                            </div>
                        </div>
                        <div className="row justify-content-md-center" style={{ marginTop: 10 + 'px' }}>
                            <div className={arrstyle} style={{ display: this.state.modal_no_lead ? "none" : "block" }}>
                                <div className="da-lead">
                                    <StatsTableView
                                        total={this.state.lead[0]}
                                        masteryTotals={this.state.lead.slice(1)}
                                        masteryWidths={this.state.leadwidth.slice(1)}
                                    />
                                </div>
                            </div>
                            <div className={arrstyle} style={{ display: this.state.modal_no_rhythm ? "none" : "block" }}>
                                <div className="da-rhythm">
                                    <StatsTableView
                                        total={this.state.rhythm[0]}
                                        masteryTotals={this.state.rhythm.slice(1)}
                                        masteryWidths={this.state.rhythmwidth.slice(1)}
                                    />
                                </div>
                            </div>
                            <div className={arrstyle} style={{ display: this.state.modal_no_bass ? "none" : "block" }}>
                                <div className="da-bass">
                                    <StatsTableView
                                        total={this.state.bass[0]}
                                        masteryTotals={this.state.bass.slice(1)}
                                        masteryWidths={this.state.basswidth.slice(1)}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="row justify-content-md-center" style={{ marginTop: 10 + 'px' }}>
                            <div style={{ color: 'white', display: this.state.modal_no_sa_stats ? "block" : "none" }}>
                                No Score Attack Stats
                            </div>
                        </div>
                        <div className="row justify-content-md-center dashboard-scoreattack" style={{ marginTop: -10 + 'px' }}>
                            {
                                this.state.scoreAttackDashboard[0] === true
                                    && this.state.modal_no_sa_easy === false
                                    ? (
                                        <div className={scoreattackstyle}>
                                            <span style={{ fontSize: 17 + 'px' }}>Score Attack - Easy</span>
                                            <StatsTableView
                                                scoreattack
                                                total={this.state.satotal}
                                                tierTotals={this.state.saeasy}
                                                tierWidths={this.state.saeasywidth}
                                            />
                                        </div>
                                    ) : null
                            }
                            {
                                this.state.scoreAttackDashboard[1] === true
                                    && this.state.modal_no_sa_medium === false
                                    ? (
                                        <div className={scoreattackstyle}>
                                            <span style={{ fontSize: 17 + 'px' }}>Score Attack - Medium</span>
                                            <StatsTableView
                                                scoreattack
                                                total={this.state.satotal}
                                                tierTotals={this.state.samedium}
                                                tierWidths={this.state.samediumwidth}
                                            />
                                        </div>
                                    ) : null
                            }
                            {
                                this.state.scoreAttackDashboard[2] === true
                                    && this.state.modal_no_sa_hard === false
                                    ? (
                                        <div className={scoreattackstyle}>
                                            <span style={{ fontSize: 17 + 'px' }}>Score Attack - Hard</span>
                                            <StatsTableView
                                                scoreattack
                                                total={this.state.satotal}
                                                tierTotals={this.state.sahard}
                                                tierWidths={this.state.sahardwidth}
                                            />
                                        </div>
                                    ) : null
                            }
                            {
                                this.state.scoreAttackDashboard[3] === true
                                    && this.state.modal_no_sa_master === false
                                    ? (
                                        <div className={scoreattackstyle}>
                                            <span style={{ fontSize: 17 + 'px' }}>Score Attack - Master</span>
                                            <StatsTableView
                                                scoreattack
                                                total={this.state.satotal}
                                                tierTotals={this.state.samaster}
                                                tierWidths={this.state.samasterwidth}
                                            />
                                        </div>
                                    ) : null
                            }
                        </div>
                        <br />
                    </div>
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

                <AddSongModal
                    show={this.state.showAddOptions}
                    exportSetlistKey={this.state.setlistMeta.key}
                    exportSetlistName={this.state.setlistMeta.name}
                    onClose={() => {
                        this.setState({ showAddOptions: false });
                        this.refreshView();
                    }} />

                <ExportSetlistModal
                    show={this.state.showExportOptions}
                    exportSetlistKey={this.state.setlistMeta.key}
                    exportSetlistName={this.state.setlistMeta.name}
                    onClose={() => this.setState({ showExportOptions: false })} />
            </div>
        );
    }
}
SetlistView.propTypes = {
    //currentTab: PropTypes.object,
    currentChildTab: PropTypes.object,
    updateHeader: PropTypes.func,
    //resetHeader: PropTypes.func,
    //handleChange: PropTypes.func,
    refreshTabs: PropTypes.func,
    saveSearch: PropTypes.func,
    getSearch: PropTypes.func,
    showModalStats: PropTypes.bool,
    globalNotes: PropTypes.object,
}
SetlistView.defaultProps = {
    //currentTab: null,
    currentChildTab: null,
    updateHeader: () => { },
    //resetHeader: () => { },
    //handleChange: () => { },
    refreshTabs: () => { },
    saveSearch: () => { },
    getSearch: () => { },
    showModalStats: false,
    globalNotes: {},
}
export default withI18n('translation')(SetlistView);
