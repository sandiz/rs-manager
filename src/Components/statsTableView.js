import React from 'react'
import PropTypes from 'prop-types';

//eslint-disable-next-line
export default class StatsTableView extends React.Component {
  //eslint-disable-next-line
  constructor(props) {
    super(props);
  }
  render = () => {
    return (
      <table style={{ width: 100 + '%', marginTop: 7 + 'px' }} >
        <tbody>
          <tr>
            <td>Total</td>
            <td className="">
              <span id="lead_total" className="ta-right right-align header-top">{this.props.total}</span>
            </td>
          </tr>
          <tr>
            <td>95-100%</td>
            <td className="ta-left skinny">
              <span>
                <svg id="lead_tier_1_svg" height="100%" width="100%">
                  <rect width={this.props.highscorewidth + "%"} height="100%" style={{ fill: 'lightgreen', strokeWidth: 2, stroke: 'rgb(0,0,0)' }} />
                </svg>
              </span>
              <span className="ta-right right-align">
                {this.props.highscoretotal}
              </span>
            </td>
          </tr>
          <tr>
            <td>90-95%</td>
            <td className="ta-left skinny">
              <span>
                <svg id="lead_tier_1_svg" height="100%" width="100%">
                  <rect width={this.props.mediumscorewidth + "%"} height="100%" style={{ fill: '#C8F749', strokeWidth: 2, stroke: 'rgb(0,0,0)' }} />
                </svg>
                <span className="ta-right right-align">
                  {this.props.mediumscoretotal}
                </span>
              </span>
            </td>
          </tr>
          <tr>
            <td>1-90%</td>
            <td className="ta-left skinny">
              <span>
                <svg id="lead_tier_1_svg" height="100%" width="100%">
                  <rect width={this.props.lowscorewidth + "%"} height="100%" style={{ fill: 'yellow', strokeWidth: 2, stroke: 'rgb(0,0,0)' }} />
                </svg>
              </span>
              <span className="ta-right right-align">
                {this.props.lowscoretotal}
              </span>
            </td>
          </tr>
          <tr>
            <td>Unplayed</td>
            <td className="ta-left skinny">
              <span>
                <svg id="lead_tier_1_svg" height="100%" width="100%">
                  <rect width={this.props.unplayedwidth + "%"} height="100%" style={{ fill: 'lightgray', strokeWidth: 2, stroke: 'rgb(0,0,0)' }} />
                </svg>
              </span>
              <span className="ta-right right-align">
                {this.props.unplayedtotal}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    );
  }
}
StatsTableView.propTypes = {
  total: PropTypes.number,
  highscoretotal: PropTypes.number,
  highscorewidth: PropTypes.number,
  mediumscoretotal: PropTypes.number,
  mediumscorewidth: PropTypes.number,
  lowscoretotal: PropTypes.number,
  lowscorewidth: PropTypes.number,
  unplayedtotal: PropTypes.number,
  unplayedwidth: PropTypes.number,
}
StatsTableView.defaultProps = {
  total: 0,
  highscoretotal: 0,
  highscorewidth: 0,
  mediumscoretotal: 0,
  mediumscorewidth: 0,
  lowscoretotal: 0,
  lowscorewidth: 0,
  unplayedtotal: 0,
  unplayedwidth: 0,
}
