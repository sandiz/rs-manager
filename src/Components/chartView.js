import React from 'react'
import PropTypes from 'prop-types';
import ReactChartkick, { LineChart } from 'react-chartkick'
import Chart from 'chart.js'
import * as zoom from 'chartjs-plugin-zoom'
import { getMinutesSecs } from './rsliveView'

export default class ChartView extends React.Component {
  constructor(props) {
    super(props);
    ReactChartkick.addAdapter(Chart)
    this.state = {
      chartData: [],
      timeCurrent: 0,
    }
    this.timer = null;
    console.log(zoom);
  }
  componentDidMount = () => {
    const chartData = [
      {
        name: "Accuracy",
        data: {
        },
        dataset: { yAxisID: 'y-axis-1' },
      },
      {
        name: "Notes Missed",
        data: {
        },
        dataset: { yAxisID: 'y-axis-2' },
      },
    ]
    this.setState({ chartData })
    //this.fakeDataTimer(chartData);
  }
  componentWillUnmount = () => {
    if (this.timer) clearInterval(this.timer);
  }
  getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
  }
  fakeDataTimer = (chartData) => {
    this.timer = setInterval(() => {
      const newTime = this.state.timeCurrent + 1;
      if (newTime >= this.props.timeTotal && this.timer) clearInterval(this.timer);
      const { minutes, seconds } = getMinutesSecs(newTime)
      const timeKey = `${minutes}:${seconds}`
      const accrRandom = this.getRandomInt(90, 100);
      const notesRandom = this.getRandomInt(0, 10);
      const obj = {}
      obj[timeKey] = accrRandom;
      chartData[0].data[timeKey] = accrRandom;
      chartData[1].data[timeKey] = notesRandom;
      this.setState({ timeCurrent: newTime, chartData })
    }, 1000);
  }
  render = () => {
    return (
      <LineChart
        library={{
          legend: {
            labels: {
              // This more specific font property overrides the global property
              fontFamily: "Roboto Condensed",
            },
          },
          scales: {
            xAxes: [{
              type: 'time',
              time: {
                displayFormats: {
                  quarter: 'mm:ss',
                },
                unit: 'seconds',
              },
            }],
            yAxes: [{
              type: 'linear',
              display: true,
              position: 'left',
              id: 'y-axis-1',
            }, {
              type: 'linear',
              display: true,
              position: 'right',
              id: 'y-axis-2',
              gridLines: {
                drawOnChartArea: false, // only want the grid lines for one axis to show up
              },
              ticks: {
                suggestedMin: 0,

              },
            }],
          },
          pan: {
            enabled: true,
            mode: 'x',
          },
          zoom: {
            enabled: true,
            mode: 'x',
          },
          responsive: true,
          stacked: false,
          hoverMode: 'index',
        }}
        messages={{ empty: "Waiting for data..." }}
        data={this.state.chartData}
        className="lineChart" />
    );
  }
}
ChartView.propTypes = {
  //eslint-disable-next-line
  timeTotal: PropTypes.number,
}
ChartView.defaultProps = {
  timeTotal: 0,
}
