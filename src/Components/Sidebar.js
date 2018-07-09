import React from 'react'
import PropTypes from 'prop-types';
import { initSetlistDB, getAllSetlist } from '../sqliteService';

const TabsData = [
  {
    id: 'tab-dashboard',
    name: 'Dashboard',
    child: [],
  },
  {
    id: 'tab-songs',
    name: 'Songs',
    child: [
      {
        name: 'Owned',
        id: 'songs-owned',
      },
      {
        name: 'RS DLC Catalog',
        id: 'songs-purchased',
      },
    ],
  },
  {
    id: 'tab-setlist',
    name: 'Setlist',
    child: [],
  },
  {
    id: 'tab-psarc',
    name: '.psarc Explorer',
    child: [],
  },
  {
    id: 'tab-settings',
    name: 'Settings',
    child: [],
  },
]
export default class Sidebar extends React.Component {
  constructor(props) {
    super(props)
    this.activeClass = 'active activeList'
    this.collapseClass = 'collapse list-unstyled'
    this.expandedClass = 'list-unstyled'
    this.state = {
      currentTab: 'tab-dashboard',
      expandedTabs: [],
      currentChildTab: '',
    }
  }
  componentWillMount = async () => {
    await initSetlistDB();
    const setlists = await getAllSetlist();
    for (let i = 0; i < setlists.length; i += 1) {
      const setlist = setlists[i];
      const setlistObj = { name: setlist.name, id: setlist.key }
      TabsData[2].child.push(setlistObj);
    }
    // default tabs on startup
    this.props.handleChange(TabsData[0]);
    this.toggleActive(TabsData[0]);
    //this.props.handleChange(TabsData[2], TabsData[2].child[0])
    //this.toggleActive(TabsData[2]);
  }
  setChildActive(val, cid) {
    this.setState({ currentTab: val.id, currentChildTab: cid.id })
    this.props.handleChange(val, cid)
  }
  toggleActive(val) {
    const index = this.state.expandedTabs.indexOf(val.id)
    const tabs = this.state.expandedTabs
    if (index !== -1) {
      tabs.splice(index, 1)
    }
    else {
      tabs.push(val.id)
    }
    this.setState({ currentTab: val.id, expandedTabs: tabs })
    if (val.child.length === 0) {
      this.props.handleChange(val, null)
    }
  }
  render() {
    let tabsList = {};
    tabsList = TabsData.map((tab, index) => {
      let ulclassList = '';
      if (this.state.currentTab === tab.id) {
        ulclassList += this.activeClass;
        if (tab.child.length === 0) {
          ulclassList += ' activeChildTab';
        }
      }
      else {
        ulclassList += 'inactiveList';
        if (tab.child.length === 0) {
          ulclassList += ' inactiveChildTab';
        }
      }

      return (
        <li key={`key-${tab.id}`} className={ulclassList}>
          <a
            onClick={() => this.toggleActive(tab)}
            className={tab.child.length > 0 ? 'dropdown-toggle' : ''}
            data-toggle={tab.child.length > 0 ? 'collapse' : ''}>{tab.name}</a>
          <ul
            className={this.state.expandedTabs.indexOf(tab.id) !== -1
              ? this.expandedClass : this.collapseClass}>
            {
              tab.child.map((childtab, index2) => {
                return (
                  <li key={`child-key-${childtab.id}`}>
                    <a className={this.state.currentTab === tab.id && this.state.currentChildTab === childtab.id ? 'activeChildTab' : 'inactiveChildTab'} onClick={() => this.setChildActive(tab, childtab)}>{childtab.name}</a>
                  </li>
                );
              })
            }
          </ul>
        </li>
      );
    });
    return (
      <nav id="sidebar" className={this.props.showSidebar ? '' : 'active'}>
        <div className="sidebar-header">
          <h3>Rocksmith 2014</h3>
        </div>

        <ul className="list-unstyled components" style={{ padding: 0 + 'px' }}>
          <div style={{ borderBottom: '1px solid #47748b' }}>
            <p style={{ margin: 0 + 'em' }}>
              Profile: {this.props.currentProfile}<br />
              Steam: {this.props.steamConnected} <br />
              YouTube: {this.props.ytConnected ? 'Connected' : 'Disconnected'}
            </p>
          </div>
          {tabsList}
        </ul>

      </nav>
    );
  }
}
Sidebar.propTypes = {
  handleChange: PropTypes.func.isRequired,
  showSidebar: PropTypes.bool.isRequired,
  currentProfile: PropTypes.string,
  steamConnected: PropTypes.string,
  ytConnected: PropTypes.bool,
}
Sidebar.defaultProps = {
  currentProfile: 'sandi',
  steamConnected: false,
  ytConnected: false,
}
