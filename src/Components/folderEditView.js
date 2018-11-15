import React from 'react'
import PropTypes from 'prop-types';
import { updateFolderName, deleteRSSongList, relinkSetlists } from '../sqliteService';

export default class FolderEditView extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      folder: props.folder,
      isDeleted: false,
    }
  }

  shouldComponentUpdate = async (nextprops, nextstate) => {
    if (nextprops !== this.props) {
      this.setState({
        folder: nextprops.folder,
        isDeleted: false,
      })
      return true;
    }
    return false;
  }

  handleChange = (event) => {
    const c = this.state.folder
    c.name = event.target.value
    this.setState({ folder: c });
  }

  saveOptions = async () => {
    await updateFolderName(this.state.folder.id, escape(this.state.folder.name))
    this.props.refreshTabs();
    this.props.updateHeader(this.props.currentTab.id,
      this.state.folder.id,
      "Saved folder: " + this.state.folder.name);
  }

  delete = async () => {
    if (this.props.folder.children.length > 0) {
      const remote = window.remote
      const dialog = remote.dialog
      dialog.showMessageBox(
        remote.getCurrentWindow(),
        {
          type: 'question',
          buttons: ['Move to Parent', 'Delete'],
          title: 'Confirm',
          message: 'The folder contains setlists, do you want to move it to the parent folder or delete ?',
        }, async (response) => {
          if (response === 0) {
            await relinkSetlists(this.props.folder.id, "relink");
          }
          else {
            await relinkSetlists(this.props.folder.id, "delete");
          }
          await deleteRSSongList(this.props.folder.id, false)
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
