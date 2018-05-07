import * as d3 from 'd3';
import * as d3Chromatic from 'd3-scale-chromatic';
import d3Tip from 'd3-tip';
import * as topojson from 'topojson';
import legend from 'd3-svg-legend';

import './choropleth.css';

const prepareOptions = data => {
  // check for required options
  if (!data.measureId) {
    throw new Error('data.measureId not defined');
  }
  // only supports one year at the moment (YYYY)
  if (typeof data.temporal !== 'string' || data.temporal.length !== 4) {
    throw new Error('data.temporal not valid');
  }
  const options = {
    measureId: data.measureId, // required, no default
    stratificationLevelId: data.stratificationLevelId || '1', // default state
    temporal: data.temporal,
    isSmoothed: data.isSmoothed || '0', // default not smoothed
    queryParams: data.queryParams ? `?${data.queryParams}` : '' // not required, no default
  };

  return options;
};

const choropleth = (container, data, title) => {
  const options = prepareOptions(data);
  const url = `https://ephtracking.cdc.gov/DataExplorer/getCoreHolder/${
    options.measureId
  }/${options.stratificationLevelId}/ALL/ALL/${options.temporal}/${
    options.isSmoothed
  }/0${options.queryParams}`;
  d3.json(url, (error, response) => {
    if (error) {
      console.error(error);
    } else if (
      response[response.tableReturnType] &&
      response[response.tableReturnType].length > 0
    ) {
      // container
      const svg = d3.select(container);
      const top = title ? 50 : 20;
      const margin = { top, right: 20, bottom: 20, left: 20 };
      const width = +svg.attr('width') - margin.left - margin.right;
      const height = +svg.attr('height') - margin.top - margin.bottom;

      const x = d3
        .scaleLinear()
        .domain([1, 10])
        .rangeRound([600, 860]);

      // color scheme
      const color = d3
        .scaleQuantile()
        .domain(response[response.tableReturnType].map(d => d.dataValue))
        .range(d3Chromatic.schemeGreens[9]);

      // create legend
      svg
        .append('g')
        .attr('class', 'legendMap')
        .attr('transform', 'translate(1000, 20)');

      const legendMap = legend
        .legendColor()
        .title(title || 'Legend')
        .titleWidth(120)
        .shapeWidth(30)
        .classPrefix('ephviz-')
        .cells(10)
        .scale(color);

      svg.select('.legendMap').call(legendMap);

      // create source at bottom
      svg
        .append('a')
        // .attr('transform', `translate(10, ${svg.attr('height') - 10})`)
        .attr('xlink:href', 'https://ephtracking.cdc.gov')
        .attr('target', '_blank')
        .append('text')
        .attr('x', 10)
        .attr('y', svg.attr('height') - 10)
        .attr('font-family', 'Verdana, Geneva, sans-serif')
        .attr('font-size', '11px')
        .attr('fill', '#808080')
        .text(
          'Source: National Environmental Public Health Tracking Network, CDC'
        );

      // === Create Choropleth Map ===
      let path = d3.geoPath();

      let mapData = d3.map();

      const min = d3.min(response[response.tableReturnType], d =>
        parseInt(d.dataValue, 10)
      );
      const max = d3.max(response[response.tableReturnType], d =>
        parseInt(d.dataValue, 10)
      );

      /* Initialize tooltip */
      const tip = d3Tip()
        .attr('class', 'd3-tip')
        .html(d => {
          const data = ephdata.get(d.id);
          if (data) {
            return `${data.rollover} (${data.title})`;
          }
          return 'no data';
        });
      svg.call(tip);

      const ephdata = d3.map(response[response.tableReturnType], d => d.geoId);
      d3
        .queue()
        .defer(d3.json, 'https://unpkg.com/us-atlas@1.0.2/us/10m.json')
        .await((error, us) => {
          if (error) throw error;
          // COUNTIES
          if (data.stratificationLevelId === '2') {
            svg
              .append('g')
              .attr('class', 'counties')
              .selectAll('path')
              .data(topojson.feature(us, us.objects.counties).features)
              .enter()
              .append('path')
              .attr('fill', d => {
                const data = ephdata.get(d.id);
                if (data) {
                  return color(data.dataValue);
                }
                return 'lightgrey';
              })
              .attr('d', path)
              .on('mouseover', tip.show)
              .on('mouseout', tip.hide);

            // draw state border
            svg
              .append('path')
              .datum(topojson.mesh(us, us.objects.states, (a, b) => a !== b))
              .attr('class', 'states')
              .attr('d', path);
          } else if (data.stratificationLevelId === '1') {
            // STATES
            svg
              .append('g')
              .attr('class', 'states')
              .selectAll('path')
              .data(topojson.feature(us, us.objects.states).features)
              .enter()
              .append('path')
              .attr('fill', d => {
                const data = ephdata.get(d.id);
                if (data) {
                  return color(data.dataValue);
                }
                return 'grey';
              })
              .attr('d', path)
              .on('mouseover', tip.show)
              .on('mouseout', tip.hide);
          }
        });
    } else {
      d3
        .select(container)
        .append('text')
        .attr('y', '20')
        .attr('font-family', 'monospace')
        .text('no data');
    }
  });
};

export default choropleth;
