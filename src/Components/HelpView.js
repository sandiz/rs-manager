import React from 'react'
import PropTypes from 'prop-types';

export default class HelpView extends React.Component {
  constructor(props) {
    super(props)
    this.tabname = "tab-help"
  }

  render = () => {
    if (this.props.currentTab === null) {
      return null;
    }
    else if (this.props.currentTab.id === this.tabname) {
      return (
        <div className="container-fluid">
          <div className="row justify-content-lg-center">
            <div className="col col-lg-10 settings">
              HELP
                    </div>
          </div>
        </div>
      )
    }
    return null;
  }
}
HelpView.propTypes = {
  currentTab: PropTypes.object,
}
HelpView.defaultProps = {
  currentTab: null,
}
