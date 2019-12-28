import React from 'react'
import PropTypes from 'prop-types';
import moment from 'moment';
import Swal from 'sweetalert2'

const marked = require('marked');


export default class HelpView extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      fileData: '',
      defaultReadme: 'dashboard',
      changelog: [],
      currentIndex: 0,
      totalIndex: 0,
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
        <img src=${href} title=${title} style="width:100%" /> 
      `
    }
    this.changeTo(this.props.defaultReadme)
  }

  imagerenderer = async (size) => {
    const renderer = new marked.Renderer();
    marked.setOptions({
      renderer,
    });
    renderer.image = (href, title, text) => {
      return `
        <img src=${href} title=${title} style="width:${size}%" /> 
      `
    }
  }

  shouldComponentUpdate = async (nextprops, nextstate) => {
    if (nextprops === this.props) return false;
    this.changeTo(nextprops.defaultReadme)
    return true
  }

  changeTo = async (id) => {
    this.imagerenderer(100);
    let data = null;
    const base = "https://raw.githubusercontent.com/sandiz/rs-manager/master/"
    switch (id) {
      case "dashboard":
        data = await window.request(base + "/help/dashboard.md");
        break;
      case "songs-owned":
        data = await window.request(base + "/help/songs.owned.md");
        break;
      case "dlc-catalog":
        data = await window.request(base + "/help/dlc.catalog.md");
        break;
      case "setlists":
        data = await window.request(base + "/help/setlists.md");
        break;
      case "setlist-option":
        data = await window.request(base + "/help/setlist.options.md");
        break;
      case "rs-live":
        data = await window.request(base + "/help/rs.live.md");
        break;
      case "psarc-explorer":
        data = await window.request(base + "/help/psarc.md");
        break;
      case "song-details":
        data = await window.request(base + "/help/song.details.md");
        break;
      case "settings":
        data = await window.request(base + "/help/settings.md");
        break;
      case "getting-started":
        data = await window.request(base + "/help/getting-started.md");
        break;
      case "tracking-options":
        data = await window.request(base + "/help/tracking.options.md");
        break;
      case "changelog":
        {
          this.imagerenderer(75);
          const cdata = await window.fetch("https://api.github.com/repos/sandiz/rs-manager/releases?per_page=100");
          let cjson = await cdata.json();
          if (cjson.length > 0) {
            cjson = cjson.filter((cl) => cl.prerelease === false)
            this.setState({
              fileData: "",
              defaultReadme: id,
              changelog: cjson,
              currentIndex: 0,
              totalIndex: cjson.length,
            })
          }
          else {
            //if rate limited open page in browser
            const { value: text } = await Swal.fire({
              type: 'info',
              text: 'Github is throttling requests from this ip address. Click Ok to open in browser',
              showCancelButton: true,
              confirmButtonClass: 'local-note-btn-class',
            })
            if (text) window.shell.openExternal("https://github.com/sandiz/rs-manager/releases")
          }
        }
        break;
      default:
        break;
    }
    if (data != null) {
      this.setState({ fileData: data, defaultReadme: id });
    }
  }

  render = () => {
    if (!this.props.showHelp) return null
    const bgColor = this.props.popupMode ? "azure" : ""
    const markdowndiv = this.state.defaultReadme === "changelog" ? "hidden" : "settings";
    const changelogdiv = this.state.defaultReadme === "changelog" ? "changelog" : "hidden";
    const showprev = this.state.totalIndex > 0 && this.state.currentIndex > 0 ? "" : "isDisabled";
    const shownext = this.state.totalIndex > 0 && this.state.currentIndex < this.state.totalIndex - 1 ? "" : "isDisabled";
    const relesever = this.state.currentIndex < this.state.changelog.length ? this.state.changelog[this.state.currentIndex].tag_name : ""
    const htmlurl = this.state.currentIndex < this.state.changelog.length ? this.state.changelog[this.state.currentIndex].html_url : ""
    const releasename = this.state.currentIndex < this.state.changelog.length ? this.state.changelog[this.state.currentIndex].name : ""
    const publishedate = this.state.currentIndex < this.state.changelog.length ? this.state.changelog[this.state.currentIndex].published_at : ""
    const assets = this.state.currentIndex < this.state.changelog.length
      ? this.state.changelog[this.state.currentIndex].assets : [];

    const body = this.state.currentIndex < this.state.changelog.length ? this.state.changelog[this.state.currentIndex].body : ""
    return (
      <div className="">
        <div className=" justify-content-lg-center">
          <div className="col  settings ta-center" style={{ backgroundColor: bgColor }}>
            <div>
              <br />
              <a
                style={{
                  color: 'blue',
                  fontWeight: this.state.defaultReadme === "changelog" ? "bolder" : "normal",
                  borderBottom: this.state.defaultReadme === "changelog" ? "1px solid" : "none",
                }}
                href="#"
                onClick={() => this.changeTo('changelog')}>Changelog</a>&nbsp;
                  | <a
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
                    |  <a
                style={{
                  color: 'blue',
                  fontWeight: this.state.defaultReadme === "tracking-options" ? "bolder" : "normal",
                  borderBottom: this.state.defaultReadme === "tracking-options" ? "1px solid" : "none",
                }}
                href="#"
                onClick={() => this.changeTo('tracking-options')}>Tracking Modes</a>&nbsp;
                    | {
                this.props.popupMode
                  ? (
                    <a style={{ color: 'blue' }} href="#" onClick={this.props.closeHelp}>Close Help</a>
                  ) : null
              }
            </div>
            <br /><br />
            <div
              className={changelogdiv}
            >
              <h2>Changelog</h2>
              <div style={{
                fontSize: 20 + 'px',
              }}>
                <div>
                  <a href="#" onClick={() => window.shell.openExternal(htmlurl)}>
                    {relesever} ({releasename}) {this.state.currentIndex === 0 ? "(LATEST)" : ""}
                  </a>
                </div>
                <br />
                <div
                  id="markdown"
                  style={{
                    width: 100 + '%',
                    textAlign: 'left',
                    backgroundColor: bgColor,
                    overflow: 'auto',
                    height: 400 + 'px',
                    boxShadow: "0 1px 0 rgba(255,255,255,.6), 0 5px 1px 3px rgba(0,0,0,0.56), 0 0 0 1px rgba(0, 0, 0, 0.3)",
                    borderRadius: 5 + 'px',
                    border: '1px solid black',
                    padding: 25 + 'px',
                  }}
                  //eslint-disable-next-line
                  dangerouslySetInnerHTML={{
                    __html:
                      marked(body),
                  }} />
                <div>
                  <br />
                  Released on
                {moment(publishedate).format(' MMMM Do YYYY, h:mm:ss a')}
                </div>
                <div>
                  Download &nbsp;&nbsp;&nbsp;
                  {
                    assets.map(item => {
                      const url = item.browser_download_url;
                      const name = item.name;
                      if (name.includes("dmg") || name.includes("exe") || name.includes("zip")) {
                        return (
                          <span key={url}>
                            <a
                              href="#"
                              style={{
                                color: 'blue',
                                fontWeight: "normal",
                                borderBottom: "1px solid",
                              }}
                              onClick={() => window.shell.openExternal(url)}
                            >{name}</a>
                            &nbsp; | &nbsp;
                          </span>
                        );
                      }
                      else {
                        return null;
                      }
                    })
                  }
                </div>
                <div>
                  <a
                    href="#"
                    style={{
                      color: 'blue',
                      fontWeight: "normal",
                      borderBottom: "1px solid",
                    }}
                    onClick={() => {
                      if (this.state.currentIndex < this.state.totalIndex - 1) {
                        const val = this.state.currentIndex;
                        this.setState({ currentIndex: val + 1 });
                      }
                    }}
                    className={shownext}
                  >Prev</a>
                  &nbsp;
                  <a
                    href="#"
                    style={{
                      color: 'blue',
                      fontWeight: "normal",
                      borderBottom: "1px solid",
                      float: 'right',
                    }}
                    className={showprev}
                    onClick={() => {
                      if (this.state.currentIndex > 0) {
                        const val = this.state.currentIndex;
                        this.setState({ currentIndex: val - 1 })
                      }
                    }}
                  >Next</a>
                </div>
              </div>
            </div>
            <div
              id="markdown"
              className={markdowndiv}
              style={{
                width: 100 + '%',
                textAlign: 'left',
                backgroundColor: bgColor,
                overflow: 'auto',
                height: 764 + 'px',
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
