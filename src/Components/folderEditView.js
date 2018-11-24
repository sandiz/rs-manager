import React from 'react'
import PropTypes from 'prop-types';
import {
  updateFolderName, deleteRSSongList,
  relinkSetlists, getAllSetlistNoFolder,
  getChildOfSetlistFolder, updateParentOfSetlist,
} from '../sqliteService';
import { getState, saveState } from '../stateService';

export default class FolderEditView extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      folder: props.folder,
      isDeleted: false,
      allsetlists: [],
      checkedsetlist: [],
    }
  }

  shouldComponentUpdate = async (nextprops, nextstate) => {
    if (nextprops !== this.props) {
      this.setState({
        folder: nextprops.folder,
        isDeleted: false,
      }, () => this.refresh())
      return true;
    }
    return false;
  }

  componentWillMount = async () => {
    this.refresh();
  }

  handleChange = (event) => {
    const c = this.state.folder
    c.name = event.target.value
    this.setState({ folder: c });
  }

  refresh = async () => {
    const allsetlists = await getAllSetlistNoFolder();
    const checkedsetlist = []

    for (let k = 0; k < allsetlists.length; k += 1) {
      const setlist = allsetlists[k];
      checkedsetlist[setlist.key] = false;
    }
    const childrens = await getChildOfSetlistFolder(this.state.folder.id)
    for (let i = 0; i < childrens.length; i += 1) {
      const child = childrens[i];
      checkedsetlist[child.key] = true;
    }
    this.setState({
      allsetlists,
      checkedsetlist,
    })
  }

  saveOptions = async () => {
    this.props.updateHeader(this.props.currentTab.id,
      this.state.folder.id,
      "Saving folder: " + this.state.folder.name);
    await updateFolderName(this.state.folder.id, escape(this.state.folder.name))
    const keys = Object.keys(this.state.checkedsetlist)
    if (keys.length > 0) {
      for (let i = 0; i < keys.length; i += 1) {
        const key = keys[i];
        const setlistKey = key;
        const parentKey = this.state.folder.id;
        //eslint-disable-next-line
        await updateParentOfSetlist(setlistKey, parentKey, this.state.checkedsetlist[key]);
      }
    }
    this.props.refreshTabs();
    this.props.updateHeader(this.props.currentTab.id,
      this.state.folder.id,
      "Saved folder: " + this.state.folder.name);
    this.refresh();
  }

  delete = async () => {
    const childrens = await getChildOfSetlistFolder(this.state.folder.id)
    if (childrens.length > 0) {
      const remote = window.remote
      const dialog = remote.dialog
      dialog.showMessageBox(
        remote.getCurrentWindow(),
        {
          type: 'question',
          buttons: ['Move to Parent', 'Delete'],
          title: 'Confirm',
          message: 'This folder contains setlists, do you want to move it to the parent folder or delete them ?',
        }, async (response) => {
          if (response === 0) {
            await relinkSetlists(this.props.folder.id, "relink");
          }
          else {
            await relinkSetlists(this.props.folder.id, "delete");
          }
          await deleteRSSongList(this.props.folder.id, false)
          const state = await getState("sidebar");
          if (this.props.folder.id in state) {
            delete state[this.props.folder.id]
            await saveState("sidebar", state);
          }
          this.props.refreshTabs();
          this.props.updateHeader(this.props.currentTab.id,
            this.state.folder.id,
            "Deleted folder: " + this.state.folder.name);
          this.setState({ isDeleted: true });
        },
      );
    }
    else {
      await deleteRSSongList(this.props.folder.id, false)
      this.props.refreshTabs();
      this.props.updateHeader(this.props.currentTab.id,
        this.state.folder.id,
        "Deleted folder: " + this.state.folder.name);
      this.setState({ isDeleted: true });
    }
  }

  deleteFolder = async () => {
    const remote = window.remote
    const dialog = remote.dialog
    dialog.showMessageBox(
      remote.getCurrentWindow(),
      {
        type: 'question',
        buttons: ['Yes', 'No'],
        title: 'Confirm',
        message: 'Are you sure you want to delete ?',
      }, async (response) => {
        if (response === 0) {
          await this.delete();
        }
      },
    );
  }

  onChange = async (e, item) => {
    const checkedsetlist = this.state.checkedsetlist;
    checkedsetlist[item.key] = e.target.checked;
    this.setState({ checkedsetlist })
  }

  getSetlistInput = () => {
    if (this.state.allsetlists.length > 0) {
      const checkboxes = this.state.allsetlists.map((item) => {
        let setlistclassname = "new";
        if (item.is_generated === "true") setlistclassname = "generated"
        if (item.is_manual === "true") setlistclassname = "manual"
        if (item.is_rssetlist === "true") setlistclassname = "rs"
        const checked = item.key in this.state.checkedsetlist
          ? this.state.checkedsetlist[item.key] : false;
        return (
          <div key={item.key}>
            <input
              onChange={e => this.onChange(e, item)}
              checked={checked}
              key={item.key}
              value={item.key}
              type="checkbox"
              style={{ fontSize: 14 + 'px' }}
              id={item.key}
            />
            <span style={{ paddingLeft: 5 + 'px' }}>
              <span className={setlistclassname} style={{ display: 'inline-flex' }}>
                <label style={{ paddingLeft: 40 + 'px' }} htmlFor={item.key}>
                  {unescape(item.name)}
                </label>
              </span>
              {
                (item.parent_folder !== null && item.parent_folder.length > 0)
                  ? (
                    <span style={{
                      fontSize: 12 + 'px',
                      color: 'darkgray',
                      marginLeft: 10 + 'px',
                    }}>
                      Parent: {unescape(item.parent_folder_name)}
                    </span>
                  )
                  : null
              }
              {
                item.is_starred !== null && item.is_starred === 'true'
                  ? (
                    <span style={{
                      fontSize: 12 + 'px',
                      color: 'darkgray',
                      marginLeft: 10 + 'px',
                    }}>
                      {
                        (item.parent_folder !== null && item.parent_folder.length > 0)
                          ? (
                            <span>
                              |&nbsp;&nbsp;
                            </span>
                          ) : null
                      }
                      Starred
                    </span>
                  )
                  : null
              }
            </span>
            <br />
          </div>
        )
      });
      return checkboxes;
    }
    return null;
  }

  render = () => {
    if (this.state.isDeleted) return null;
    return (
      <div className="container-fluid modal-folder-edit" style={{ opacity: 1, pointerEvents: "auto" }}>
        <div className="row justify-content-lg-center">
          <div id="modal-info" className="width-75">
            <br />
            <div style={{ textAlign: 'center' }}>
              <h4 style={{ fontSize: 150 + "%", fontWeight: 'bold', marginTop: -25 + 'px' }}>
                Folder Options
              </h4>
              <hr />
              <div style={{ fontSize: 20 + 'px' }}>
                <table style={{ width: 100 + '%' }}>
                  <tbody>
                    <tr style={{ backgroundColor: 'inherit', border: 'none', color: 'black' }}>
                      <td style={{ border: 'none', width: 20 + '%', borderRight: '1px solid' }}>Name</td>
                      <td style={{ border: 'none', width: 80 + '%', textAlign: 'left' }}>
                        <input
                          type="text"
                          value={unescape(this.state.folder.name)}
                          onChange={this.handleChange}
                          style={{ paddingLeft: 10 + 'px', marginLeft: 30 + 'px', width: 80 + '%' }} />
                      </td>
                    </tr>
                    <tr style={{ backgroundColor: 'inherit', border: 'none', color: 'black' }}>
                      <td style={{ border: 'none', width: 20 + '%', borderRight: '1px solid' }}>All Setlists</td>
                      <td style={{ border: 'none', width: 80 + '%', textAlign: 'left' }}>
                        <div style={{
                          marginLeft: 30 + 'px',
                          fontSize: 16 + 'px',
                          maxHeight: 350 + 'px',
                          overflow: 'auto',
                        }}>
                          {this.getSetlistInput()}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="ta-center">
              <br />
              <hr />
              <a
                onClick={this.saveOptions}
                className="extraPadding download">
                Save Changes
              </a>
              <a
                onClick={this.deleteFolder}
                className="extraPadding download">
                Delete Folder
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

FolderEditView.propTypes = {
  //eslint-disable-next-line
  refreshTabs: PropTypes.func,
  folder: PropTypes.object,
  currentTab: PropTypes.object,
  updateHeader: PropTypes.func,
}
FolderEditView.defaultProps = {
  refreshTabs: () => { },
  folder: {},
  currentTab: {},
  updateHeader: () => { },
}
