import React from 'react'
import PropTypes from 'prop-types';

export default class StatsTableView extends React.Component {
  testFunction = () => {
    console.log("test");
  }
  render = () => {
    return (
      <table style={{ width: 100 + '%', marginTop: 7 + 'px' }} >
        {
          this.props.scoreattack ?
            (
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
                    className="iconPreview gp_fcs badgeText dashboardGP"
                    title="Total Full Combos">
                    FCs
                </td>
                  <td className="ta-left skinny">
                    <span>
                      <svg id="fcs_tier_1_svg" height="100%" width="100%" className="dashboardsvg">
                        <rect width={(this.props.tierWidths[6]) + "%"} height="100%" style={{ fill: 'lightgreen', strokeWidth: 2, stroke: 'rgb(0,0,0)' }} />
                      </svg>
                    </span>
                    <span className="ta-right right-align">
                      {this.props.tierTotals[6]}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td
                    className="iconPreview gp_platinum badgeText dashboardGP"
                    title="Total Platinum Badges">
                    Plat
                  </td>
                  <td className="ta-left skinny">
                    <span>
                      <svg id="lead_tier_1_svg" height="100%" width="100%" className="dashboardsvg">
                        <rect width={(this.props.tierWidths[0]) + "%"} height="100%" style={{ fill: 'lightgreen', strokeWidth: 2, stroke: 'rgb(0,0,0)' }} />
                      </svg>
                    </span>
                    <span className="ta-right right-align">
                      {this.props.tierTotals[0]}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td
                    className="iconPreview gp_gold badgeText dashboardGP"
                    title="Total Gold Badges"
                  >
                    Gold
                  </td>
                  <td className="ta-left skinny">
                    <span>
                      <svg id="lead_tier_1_svg" height="100%" width="100%" className="dashboardsvg">
                        <rect width={(this.props.tierWidths[1]) + "%"} height="100%" style={{ fill: '#C8F749', strokeWidth: 2, stroke: 'rgb(0,0,0)' }} />
                      </svg>
                      <span className="ta-right right-align">
                        {this.props.tierTotals[1]}
                      </span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td
                    className="iconPreview gp_silver badgeText dashboardGP"
                    title="Total Silver Badges"
                  >
                    Silv
                  </td>
                  <td className="ta-left skinny">
                    <span>
                      <svg id="lead_tier_1_svg" height="100%" width="100%" className="dashboardsvg">
                        <rect width={(this.props.tierWidths[2]) + "%"} height="100%" style={{ fill: 'yellow', strokeWidth: 2, stroke: 'rgb(0,0,0)' }} />
                      </svg>
                    </span>
                    <span className="ta-right right-align">
                      {this.props.tierTotals[2]}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td
                    className="iconPreview gp_bronze badgeText  GP"
                    title="Total Bronze Badges">
                    Brnz
                </td>
                  <td className="ta-left skinny">
                    <span>
                      <svg id="lead_tier_1_svg" height="100%" width="100%" className="dashboardsvg">
                        <rect width={(this.props.tierWidths[3]) + "%"} height="100%" style={{ fill: 'yellow', strokeWidth: 2, stroke: 'rgb(0,0,0)' }} />
                      </svg>
                    </span>
                    <span className="ta-right right-align">
                      {this.props.tierTotals[3]}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td
                    className="iconPreview gp_failed badgeText dashboardGP"
                    title="Total Failed">
                    Fail
                </td>
                  <td className="ta-left skinny">
                    <span>
                      <svg id="lead_tier_1_svg" height="100%" width="100%" className="dashboardsvg">
                        <rect width={(this.props.tierWidths[4]) + "%"} height="100%" style={{ fill: 'yellow', strokeWidth: 2, stroke: 'rgb(0,0,0)' }} />
                      </svg>
                    </span>
                    <span className="ta-right right-align">
                      {this.props.tierTotals[4]}
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
                        <rect width={(this.props.tierWidths[5]) + "%"} height="100%" style={{ fill: 'lightgray', strokeWidth: 2, stroke: 'rgb(0,0,0)' }} />
                      </svg>
                    </span>
                    <span className="ta-right right-align">
                      {this.props.tierTotals[5]}
                    </span>
                  </td>
                </tr>
              </tbody>
            )
            :
            (
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
                    className=""
                    title="Master Mode">
                    100%+
                  </td>
                  <td className="ta-left skinny">
                    <span>
                      <svg id="lead_tier_1_svg" height="100%" width="100%" className="dashboardsvg">
                        <rect width={(this.props.masteryWidths[0]) + "%"} height="100%" style={{ fill: '#26956A', strokeWidth: 2, stroke: 'rgb(0,0,0)' }} />
                      </svg>
                    </span>
                    <span className="ta-right right-align">
                      {this.props.masteryTotals[0]}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td
                    className=""
                    title="Mastery between 95-100%">
                    95-99%
                  </td>
                  <td className="ta-left skinny">
                    <span>
                      <svg id="lead_tier_1_svg" height="100%" width="100%" className="dashboardsvg">
                        <rect width={(this.props.masteryWidths[1]) + "%"} height="100%" style={{ fill: 'lightgreen', strokeWidth: 2, stroke: 'rgb(0,0,0)' }} />
                      </svg>
                    </span>
                    <span className="ta-right right-align">
                      {this.props.masteryTotals[1]}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td
                    className=""
                    title="Mastery between 90-95%">
                    90-95%
                  </td>
                  <td className="ta-left skinny">
                    <span>
                      <svg id="lead_tier_1_svg" height="100%" width="100%" className="dashboardsvg">
                        <rect width={(this.props.masteryWidths[2]) + "%"} height="100%" style={{ fill: 'lightgreen', strokeWidth: 2, stroke: 'rgb(0,0,0)' }} />
                      </svg>
                    </span>
                    <span className="ta-right right-align">
                      {this.props.masteryTotals[2]}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td
                    className=""
                    title="Mastery between 80-90%">
                    80-90%
                  </td>
                  <td className="ta-left skinny">
                    <span>
                      <svg id="lead_tier_1_svg" height="100%" width="100%" className="dashboardsvg">
                        <rect width={(this.props.masteryWidths[3]) + "%"} height="100%" style={{ fill: '#C8F749', strokeWidth: 2, stroke: 'rgb(0,0,0)' }} />
                      </svg>
                    </span>
                    <span className="ta-right right-align">
                      {this.props.masteryTotals[3]}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td
                    className=""
                    title="Mastery between 70-80%"
                  >
                    70-80%
                  </td>
                  <td className="ta-left skinny">
                    <span>
                      <svg id="lead_tier_1_svg" height="100%" width="100%" className="dashboardsvg">
                        <rect width={(this.props.masteryWidths[4]) + "%"} height="100%" style={{ fill: '#C8F749', strokeWidth: 2, stroke: 'rgb(0,0,0)' }} />
                      </svg>
                      <span className="ta-right right-align">
                        {this.props.masteryTotals[4]}
                      </span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td
                    className=""
                    title="Mastery between 0-70%"
                  >
                    1-70%
                  </td>
                  <td className="ta-left skinny">
                    <span>
                      <svg id="lead_tier_1_svg" height="100%" width="100%" className="dashboardsvg">
                        <rect width={(this.props.masteryWidths[5]) + "%"} height="100%" style={{ fill: 'yellow', strokeWidth: 2, stroke: 'rgb(0,0,0)' }} />
                      </svg>
                    </span>
                    <span className="ta-right right-align">
                      {this.props.masteryTotals[5]}
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
                        <rect width={(this.props.masteryWidths[6]) + "%"} height="100%" style={{ fill: 'lightgray', strokeWidth: 2, stroke: 'rgb(0,0,0)' }} />
                      </svg>
                    </span>
                    <span className="ta-right right-align">
                      {this.props.masteryTotals[6]}
                    </span>
                  </td>
                </tr>
              </tbody>
            )
        }
      </table>
    );
  }
}
StatsTableView.propTypes = {
  total: PropTypes.number,
  scoreattack: PropTypes.bool,
  tierTotals: PropTypes.array,
  tierWidths: PropTypes.array,
  masteryTotals: PropTypes.array,
  masteryWidths: PropTypes.array,
}
StatsTableView.defaultProps = {
  total: 0,
  scoreattack: false,
  tierTotals: [0, 0, 0, 0, 0, 0, 0],
  tierWidths: [0, 0, 0, 0, 0, 0, 0],
  masteryTotals: [0, 0, 0, 0],
  masteryWidths: [0, 0, 0, 0],
}
