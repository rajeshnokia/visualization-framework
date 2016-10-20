import React from "react";

import tabify from "../../utils/tabify";
import * as d3 from "d3";
import { theme } from "../../theme";
import "./BarGraph.css";

// TODO split out this time interval log into a utility module.

// Time unit abbreviations from
// https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#time-units
// mapping onto D3 time intervals defined ad
// https://github.com/d3/d3-time#intervals
const timeAbbreviations = {
    "y": "utcYear",
    "M": "utcMonth",
    "w": "utcWeek",
    "d": "utcDay",
    "h": "utcHour",
    "m": "utcMinute",
    "s": "utcSecond",
    "ms": "utcMillisecond"
};

function computeBarWidth(interval, timeScale) {
    const step = +interval.substr(0, interval.length - 1);

    // TODO handle case of "ms"
    const abbreviation = interval.substr(interval.length - 1);
    const d3Interval = timeAbbreviations[abbreviation];

    // TODO validation and error handling
    const start = new Date(2000, 0, 0, 0, 0);
    const end = d3[d3Interval].offset(start, step);

    return timeScale(end) - timeScale(start);

}


export default class BarGraph extends React.Component {
    constructor(){
        super();

        // These properties can be overridden from the configuration.
        this.defaults = {
          margin: { top: 15, bottom: 20, left: 30, right: 20 },
          padding: 0.1,
          yTickGrid: true,
          yTickSizeInner: 6,
          yTickSizeOuter: 0,
          xTickGrid: false,
          xTickSizeInner: 6,
          xTickSizeOuter: 0,
          orientation: "vertical",
          dateHistogram: false,
          interval: "30s",
          color: theme.palette.blueColor,
        };
    }

    // Gets the object containing all configured properties.
    // Uses properties from the configuration,
    // falling back to defaults for unspecified properties.
    getConfiguredProperties() {
        return Object.assign({}, this.defaults, this.props.configuration.data);
    }

    render() {

        const { response, width, height } = this.props;

        if (!response || response.error)
            return;

        const data = tabify(response.results);

        const {
          xColumn,
          yColumn,
          margin: { top, bottom, left, right },
          padding,
          yTickGrid,
          yTickSizeInner,
          yTickSizeOuter,
          xTickGrid,
          xTickSizeInner,
          xTickSizeOuter,
          orientation,
          dateHistogram,
          interval,
          color,
        } = this.getConfiguredProperties();

        const vertical = orientation === "vertical";

        let xScale, yScale;

        if(dateHistogram){

            // Handle the case of a vertical date histogram.
            xScale = d3.scaleTime()
              .domain(d3.extent(data, function (d){ return d[xColumn]; }));
            yScale = d3.scaleLinear()
              .domain([0, d3.max(data, function (d){ return d[yColumn] })]);

        } else if(vertical){

            // Handle the case of a vertical bar chart.
            xScale = d3.scaleBand()
              .domain(data.map(function (d){ return d[xColumn]; }))
              .padding(padding);
            yScale = d3.scaleLinear()
              .domain([0, d3.max(data, function (d){ return d[yColumn] })]);

        } else {

            // Handle the case of a horizontal bar chart.
            xScale = d3.scaleLinear()
              .domain([0, d3.max(data, function (d){ return d[xColumn] })]);
            yScale = d3.scaleBand()
              .domain(data.map(function (d){ return d[yColumn]; }))
              .padding(padding);
        }

        const innerWidth = width - left - right;
        const innerHeight = height - top - bottom;

        xScale.range([0, innerWidth]);
        yScale.range([innerHeight, 0]);

        const xAxis = d3.axisBottom(xScale)
          .tickSizeInner(xTickGrid ? -innerHeight : xTickSizeInner)
          .tickSizeOuter(xTickSizeOuter);

        const yAxis = d3.axisLeft(yScale)
          .tickSizeInner(yTickGrid ? -innerWidth : yTickSizeInner)
          .tickSizeOuter(yTickSizeOuter);

        let barWidth;

        if(dateHistogram){
            barWidth = computeBarWidth(interval, xScale);
        } else if(vertical){
            barWidth = xScale.bandwidth();
        }

        return (
            <div className="bar-graph">
                <svg width={width} height={height}>
                    <g transform={ `translate(${left},${top})` } >
                        <g
                            key="xAxis"
                            ref={ (el) => d3.select(el).call(xAxis) }
                            transform={ `translate(0,${innerHeight})` }
                        />
                        <g
                            key="yAxis"
                            ref={ (el) => d3.select(el).call(yAxis) }
                        />
                        {data.map((d, i) => (
                            vertical ? (
                                <rect
                                    key={ i }
                                    x={ xScale(d[xColumn]) }
                                    y={ yScale(d[yColumn]) }
                                    width={ barWidth }
                                    height={ innerHeight - yScale(d[yColumn]) }
                                    fill={ color }
                                />
                            ) : (
                                <rect
                                    key={ i }
                                    x={ 0 }
                                    y={ yScale(d[yColumn]) }
                                    width={ xScale(d[xColumn]) }
                                    height={ yScale.bandwidth() }
                                    fill={ color }
                                />
                            )
                        ))}
                    </g>
                </svg>
            </div>
        );
    }
}
BarGraph.propTypes = {
  configuration: React.PropTypes.object,
  response: React.PropTypes.object
};