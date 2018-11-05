import React from 'react'
import PropTypes from 'prop-types';

const marked = require('marked');


const readFile = filePath => new Promise((resolve, reject) => {
  window.electronFS.readFile(filePath, (err, data) => {
    if (err) reject(err);
    else resolve(data);
  });
});
export default class HelpView extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      fileData: '',
      defaultReadme: 'dashboard',
    }
    this.tabname = "tab-help"
    const renderer = new marked.Renderer();
    marked.setOptions({
      renderer,
      pedantic: false,
      gfm: true,
      tables: true,
      breaks: false,
      sanitize: false,
      smartLists: true,
      smartypants: false,
      xhtml: false,
    });
    renderer.image = (href, title, text) => {
      return `
        <img src=${href} title=${title} style="width:100%" /> ${text}
      `
    }
  }

  componentWillMount = async () => {
    this.changeTo(this.props.defaultReadme)
  }

  shouldComponentUpdate = async (nextprops, nextstate) => {
    if (nextprops === this.props) return false;
    this.changeTo(nextprops.defaultReadme)
    return true
  }

  changeTo = async (id) => {
    let string = ""
    let data = null;
    switch (id) {
      case "dashboard":
        data = await readFile(window.dirname + "/../help/dashboard.md");
        break;
      case "songs-owned":
        data = await readFile(window.dirname + "/../help/songs.owned.md");
        break;
      case "dlc-catalog":
        data = await readFile(window.dirname + "/../help/dlc.catalog.md");
        break;
      case "setlists":
        data = await readFile(window.dirname + "/../help/setlists.md");
        break;
      case "setlist-option":
        data = await readFile(window.dirname + "/../help/setlist.options.md");
        break;
      case "rs-live":
        data = await readFile(window.dirname + "/../help/rs.live.md");
        break;
      case "psarc-explorer":
        data = await readFile(window.dirname + "/../help/psarc.md");
        break;
      case "song-details":
        data = await readFile(window.dirname + "/../help/song.details.md");
        break;
      case "settings":
        data = await readFile(window.dirname + "/../help/settings.md");
        break;
      case "getting-started":
        data = await readFile(window.dirname + "/../help/getting-started.md");
        break;

      default:
        break;
    }
    string = new TextDecoder("utf-8").decode(data);
    this.setState({ fileData: string, defaultReadme: id });
  }

  render = () => {
    if (!this.props.showHelp) return null
    const bgColor = this.props.popupMode ? "azure" : ""
    return (
      <div className="container-fluid">
        <div className="row justify-content-lg-center">
          <div className="col col-lg-10 settings ta-center" style={{ backgroundColor: bgColor, height: 1000 + 'px', overflow: 'auto' }}>
            {
              (
                <div>
                  <br />
                  <a
                    style={{
                      color: 'blue',
                      fontWeight: this.state.defaultReadme === "getting-started" ? "bolder" : "normal",
                      borderBottom: this.state.defaultReadme === "getting-started" ? "1px solid" : "none",
                    }}
                    href="#"
                    onClick={() => this.changeTo('getting-started')}>Getting Started</a>&nbsp;
                  | <a
                    style={{
                      color: 'blue',
                      fontWeight: this.state.defaultReadme === "dashboard" ? "bolder" : "normal",
                      borderBottom: this.state.defaultReadme === "dashboard" ? "1px solid" : "none",
                    }}
                    href="#"
                    onClick={() => this.changeTo('dashboard')}>Dashboard</a>&nbsp;
                    | <a
                    style={{
                      color: 'blue',
                      fontWeight: this.state.defaultReadme === "songs-owned" ? "bolder" : "normal",
                      borderBottom: this.state.defaultReadme === "songs-owned" ? "1px solid" : "none",
                    }}
                    href="#"
                    onClick={() => this.changeTo('songs-owned')}>Songs Owned</a>&nbsp;
                    | <a
                    style={{
                      color: 'blue',
                      fontWeight: this.state.defaultReadme === "song-details" ? "bolder" : "normal",
                      borderBottom: this.state.defaultReadme === "song-details" ? "1px solid" : "none",
                    }}
                    href="#"
                    onClick={() => this.changeTo('song-details')}>Song Details</a>&nbsp;
                    | <a
                    style={{
                      color: 'blue',
                      fontWeight: this.state.defaultReadme === "dlc-catalog" ? "bolder" : "normal",
                      borderBottom: this.state.defaultReadme === "dlc-catalog" ? "1px solid" : "none",
                    }}
                    href="#"
                    onClick={() => this.changeTo('dlc-catalog')}>DLC Catalog</a>&nbsp;
                    | <a
                    style={{
                      color: 'blue',
                      fontWeight: this.state.defaultReadme === "setlists" ? "bolder" : "normal",
                      borderBottom: this.state.defaultReadme === "setlists" ? "1px solid" : "none",
                    }}
                    href="#"
                    onClick={() => this.changeTo('setlists')}>Setlists</a>&nbsp;
                    | <a
                    style={{
                      color: 'blue',
                      fontWeight: this.state.defaultReadme === "setlist-option" ? "bolder" : "normal",
                      borderBottom: this.state.defaultReadme === "setlist-option" ? "1px solid" : "none",
                    }}
                    href="#"
                    onClick={() => this.changeTo('setlist-option')}>Setlist Options</a>&nbsp;
                    | <a
                    style={{
                      color: 'blue',
                      fontWeight: this.state.defaultReadme === "psarc-explorer" ? "bolder" : "normal",
                      borderBottom: this.state.defaultReadme === "psarc-explorer" ? "1px solid" : "none",
                    }}
                    href="#"
                    onClick={() => this.changeTo('psarc-explorer')}>psarc Explorer</a>&nbsp;
                    | <a
                    style={{
                      color: 'blue',
                      fontWeight: this.state.defaultReadme === "rs-live" ? "bolder" : "normal",
                      borderBottom: this.state.defaultReadme === "rs-live" ? "1px solid" : "none",
                    }}
                    href="#"
                    onClick={() => this.changeTo('rs-live')}>Rocksmith Live</a>&nbsp;
                    | {
                    this.props.popupMode
                      ? (
                        <a style={{ color: 'blue' }} href="#" onClick={this.props.closeHelp}>Close Help</a>
                      ) : null
                  }
                </div>
              )
            }

            <br /><br />
            <div
              id="markdown"
              className=" settings"
              style={{
                width: 100 + '%',
                textAlign: 'left',
                backgroundColor: bgColor,
                overflow: 'auto',
              }}
              //eslint-disable-next-line
              dangerouslySetInnerHTML={{
                __html:
                  marked(this.state.fileData),
              }} />
          </div>
        </div>
      </div>
    )
  }
}
HelpView.propTypes = {
  //currentTab: PropTypes.object,
  defaultReadme: PropTypes.string,
  popupMode: PropTypes.bool,
  showHelp: PropTypes.bool,
  closeHelp: PropTypes.func,
}
HelpView.defaultProps = {
  //currentTab: null,
  defaultReadme: "getting-started",
  popupMode: false,
  showHelp: true,
  closeHelp: () => { },
}
