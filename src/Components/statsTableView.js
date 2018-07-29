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
              <span id="lead_total" className="ta-right right-align header-top">
                {this.props.total}
              </span>
            </td>
          </tr>
          <tr>
            <td
              className={this.props.scoreattack ? "iconPreview gp_platinum badgeText dashboardGP" : ""}
              title={this.props.scoreattack ? "Total Platinum Badges" : "Mastery between 95-100%"}>
              {!this.props.scoreattack ? "95-100%" : "Plat"}
            </td>
            <td className="ta-left skinny">
              <span>
                <svg id="lead_tier_1_svg" height="100%" width="100%" className="dashboardsvg">
                  <rect width={(this.props.scoreattack ? this.props.platwidth : this.props.highscorewidth) + "%"} height="100%" style={{ fill: 'lightgreen', strokeWidth: 2, stroke: 'rgb(0,0,0)' }} />
                </svg>
              </span>
              <span className="ta-right right-align">
                {this.props.scoreattack ? this.props.plattotal : this.props.highscoretotal}
              </span>
            </td>
          </tr>
          <tr>
            <td
              className={this.props.scoreattack ? "iconPreview gp_gold badgeText dashboardGP" : ""}
              title={this.props.scoreattack ? "Total Gold Badges" : "Mastery between 90-95%"}
            >
              {!this.props.scoreattack ? "90-95%" : "Gold"}
            </td>
            <td className="ta-left skinny">
              <span>
                <svg id="lead_tier_1_svg" height="100%" width="100%" className="dashboardsvg">
                  <rect width={(this.props.scoreattack ? this.props.goldwidth : this.props.mediumscorewidth) + "%"} height="100%" style={{ fill: '#C8F749', strokeWidth: 2, stroke: 'rgb(0,0,0)' }} />
                </svg>
                <span className="ta-right right-align">
                  {this.props.scoreattack ? this.props.goldtotal : this.props.mediumscoretotal}
                </span>
              </span>
            </td>
          </tr>
          <tr>
            <td
              className={this.props.scoreattack ? "iconPreview gp_silver badgeText dashboardGP" : ""}
              title={this.props.scoreattack ? "Total Silver Badges" : "Mastery between 1-90%"}
            >
              {!this.props.scoreattack ? "1-90%" : "Silv"}
            </td>
            <td className="ta-left skinny">
              <span>
                <svg id="lead_tier_1_svg" height="100%" width="100%" className="dashboardsvg">
                  <rect width={(this.props.scoreattack ? this.props.silverwidth : this.props.lowscorewidth) + "%"} height="100%" style={{ fill: 'yellow', strokeWidth: 2, stroke: 'rgb(0,0,0)' }} />
                </svg>
              </span>
              <span className="ta-right right-align">
                {this.props.scoreattack ? this.props.silvertotal : this.props.lowscoretotal}
              </span>
            </td>
          </tr>
          <tr className={this.props.scoreattack ? "" : "hidden"}>
            <td
              className={this.props.scoreattack ? "iconPreview gp_bronze badgeText  GP" : "hidden"}
              title={this.props.scoreattack ? "Total Bronze Badges" : ""}
            >
              Brnz
            </td>
            <td className="ta-left skinny">
              <span>
                <svg id="lead_tier_1_svg" height="100%" width="100%" className="dashboardsvg">
                  <rect width={(this.props.scoreattack ? this.props.bronzewidth : this.props.lowscorewidth) + "%"} height="100%" style={{ fill: 'yellow', strokeWidth: 2, stroke: 'rgb(0,0,0)' }} />
                </svg>
              </span>
              <span className="ta-right right-align">
                {this.props.scoreattack ? this.props.bronzetotal : this.props.lowscoretotal}
              </span>
            </td>
          </tr>
          <tr className={this.props.scoreattack ? "" : "hidden"}>
            <td
              className={this.props.scoreattack ? "iconPreview gp_failed badgeText dashboardGP" : "hidden"}
              title={this.props.scoreattack ? "Total Failed" : ""}
            >
              Fail
            </td>
            <td className="ta-left skinny">
              <span>
                <svg id="lead_tier_1_svg" height="100%" width="100%" className="dashboardsvg">
                  <rect width={(this.props.scoreattack ? this.props.failedwidth : this.props.lowscorewidth) + "%"} height="100%" style={{ fill: 'yellow', strokeWidth: 2, stroke: 'rgb(0,0,0)' }} />
                </svg>
              </span>
              <span className="ta-right right-align">
                {this.props.scoreattack ? this.props.failedtotal : this.props.lowscoretotal}
              </span>
            </td>
          </tr>
          <tr>
            <td
              title="Unplayed Arrangments">
              Unplayed
            </td>
            <td className="ta-left skinny">
              <span>
                <svg id="lead_tier_1_svg" height="100%" width="100%" className="dashboardsvg">
                  <rect width={(this.props.unplayedwidth) + "%"} height="100%" style={{ fill: 'lightgray', strokeWidth: 2, stroke: 'rgb(0,0,0)' }} />
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
  scoreattack: PropTypes.bool,
  plattotal: PropTypes.number,
  platwidth: PropTypes.number,
  goldtotal: PropTypes.number,
  goldwidth: PropTypes.number,
  silvertotal: PropTypes.number,
  silverwidth: PropTypes.number,
  bronzetotal: PropTypes.number,
  bronzewidth: PropTypes.number,
  failedtotal: PropTypes.number,
  failedwidth: PropTypes.number,
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
  scoreattack: false,
  plattotal: 0,
  platwidth: 0,
  goldtotal: 0,
  goldwidth: 0,
  silvertotal: 0,
  silverwidth: 0,
  bronzetotal: 0,
  bronzewidth: 0,
  failedtotal: 0,
  failedwidth: 0,
}
