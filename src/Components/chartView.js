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
    }
    this.timer = null;
    this.lastsongid = "";
    console.log(zoom);
  }

  shouldComponentUpdate = (nextstate, nextprops) => {
    if (nextprops.startTrack) {
      this.startCollecting()
    }
    if (nextprops.stopTrack) {
      if (this.timer) clearInterval(this.timer);
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
    }
    return true;
  }

  componentWillUnmount = () => {
    if (this.timer) clearInterval(this.timer);
  }

  getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
  }

  startCollecting = async () => {
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
    await this.DataTimer(chartData);
  }

  DataTimer = async (chartData) => {
    this.timer = setInterval(async () => {
      const songData = await window.fetch("http://127.0.0.1:9938");
      if (!songData) return;
      if (typeof songData === 'undefined') { return; }
      const jsonObj = await songData.json();
      console.log(jsonObj)

      if (jsonObj.memoryReadout && jsonObj.memoryReadout.songTimer > 0) {
        const { memoryReadout } = jsonObj;
        if (typeof memoryReadout === 'undefined') { return; }
        if (this.lastsongid !== memoryReadout.songID) {
          this.lastsongid = memoryReadout.songID;
          chartData[0].data = {}
          chartData[1].data = {}
        }
        const newTime = Math.round(memoryReadout.songTimer);
        if (newTime >= this.props.timeTotal && this.timer) clearInterval(this.timer);
        const { minutes, seconds } = getMinutesSecs(newTime)
        const timeKey = `${minutes}:${seconds}`
        const tnh = memoryReadout ? memoryReadout.totalNotesHit : 0;
        const tnm = memoryReadout ? memoryReadout.totalNotesMissed : 0;
        let accuracy = tnh / (tnh + tnm);
        accuracy *= 100;

        if (Number.isNaN(accuracy)) {
          accuracy = 0;
        }
        const notesRandom = jsonObj.memoryReadout.totalNotesMissed;
        chartData[0].data[timeKey] = accuracy;
        chartData[1].data[timeKey] = notesRandom;
        this.setState({ chartData })
        console.log(chartData);
      }
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
  timeTotal: PropTypes.number,
  //startTrack: PropTypes.bool,
  //stopTrack: PropTypes.bool,
}
ChartView.defaultProps = {
  timeTotal: 0,
  //startTrack: false,
  //stopTrack: false,
}
