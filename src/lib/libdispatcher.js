class DispatcherEvent {
    constructor(eventName) {
        this.eventName = eventName;
        this.callbacks = [];
    }

    registerCallback(callback) {
        this.callbacks.push(callback);
    }

    unregisterCallback(callback) {
        const index = this.callbacks.indexOf(callback);
        if (index > -1) {
            this.callbacks.splice(index, 1);
        }
    }

    fire(data) {
        const callbacks = this.callbacks.slice(0);
        callbacks.forEach((callback) => {
            callback(data);
        });
    }
}


class Dispatcher {
    constructor() {
        this.events = {};
    }

    dispatch(eventName, data) {
        const event = this.events[eventName];
        if (event) {
            event.fire(data);
        }
    }

    on(eventName, callback) {
        let event = this.events[eventName];
        if (!event) {
            event = new DispatcherEvent(eventName);
            this.events[eventName] = event;
        }
        event.registerCallback(callback);
    }

    off(eventName, callback) {
        const event = this.events[eventName];
        if (event && event.callbacks.indexOf(callback) > -1) {
            event.unregisterCallback(callback);
            if (event.callbacks.length === 0) {
                delete this.events[eventName];
            }
        }
    }
}
export const DispatchEvents = {
    SETLIST_SELECT: "setlist_select",           /* used for setlist navigation args: setlist_name */
    SETLIST_REFRESH: "setlist_refresh",         /* used for refreshing setlists in the siderbar */
    SETLIST_EXPORT: "setlist_export",           /* used for invoking the setlist exporter */
    SIDEBAR_GOTO: "sidebar_goto",               /* used for automatic sidebar tab change args: tab_name */
    PROFILE_UPDATED: "profile_updated",         /* fired when rocksmith profile info is saved to db */
    SETLIST_IMPORTED: "setlist_imported",       /* fired when a rocksmith setlist has been imported to db */
    DLC_CATALOG_UPDATED: "dlc_catalog_updated", /* fired when dlc catalog is updated */
    ALBUM_COVER_QUERY: "album_cover_query",     /* fired when album cover has been queried */
    PSARCS_IMPORTED: "psarcs_imported",         /* fired when psarc import finishes */
    SONG_LIST_UPDATED: "song_list_updated",     /* fired when songs_owned db is updated with new songs */
}

export const DispatcherService = new Dispatcher();
