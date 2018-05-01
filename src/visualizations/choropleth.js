import * as d3 from 'd3';
import * as d3Chromatic from 'd3-scale-chromatic';
import * as topojson from 'topojson';

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
  }/${options.stratificationLevelId}/ALL/ALL/${options.temporal}/${options.isSmoothed}/0${options.queryParams}`;
  d3.json(url, (error, response) => {
    if (error) {
      console.error(error);
    } else if (response[response.tableReturnType] && response[response.tableReturnType].length > 0) {
      // container
      const svg = d3.select(container);
      const top = title ? 50 : 20;
      const margin = { top, right: 20, bottom: 20, left: 20 };
      const width =
      +svg.attr('width') - margin.left - margin.right;
      let height = +svg.attr('height') - margin.top - margin.bottom;
      
      // create title
      if (title) {
        svg.append('text')
          .attr('x', svg.attr('width')/2)
          .attr('y', margin.top/2)
          .attr('text-anchor', 'middle')
          .attr('font-family', 'Verdana, Geneva, sans-serif')
          .attr('font-size', '14px')
          .text(title);
      }

      // create source at bottom
      svg.append('a')
        // .attr('transform', `translate(10, ${svg.attr('height') - 10})`)
        .attr('xlink:href', 'https://ephtracking.cdc.gov')
        .attr('target', '_blank')
        .append('text')
        .attr('x', 10)
        .attr('y', svg.attr('height') - 10)
        .attr('font-family', 'Verdana, Geneva, sans-serif')
        .attr('font-size', '11px')
        .attr('fill', '#808080')
        .text('Source: National Environmental Public Health Tracking Network, CDC');

        // === Create Choropleth Map ===
      let mapData = d3.map();
      let path = d3.geoPath();
      const x = d3.scaleLinear()
        .domain([1, 10])
        .rangeRound([600, 860]);

      const min = d3.min(response[response.tableReturnType], d => parseInt(d.dataValue, 10));
      const max = d3.max(response[response.tableReturnType], d => parseInt(d.dataValue, 10));
      const color = d3.scaleThreshold()
      .domain(d3.range(min, max))
      .range(d3Chromatic.schemeGreens[9]);
      // var color = d3.scaleSequential(d3Chromatic.interpolatePiYG);
      
      
      const ephdata = d3.map(response[response.tableReturnType], d => d.geoId);
      d3.queue()
        .defer(d3.json, 'https://d3js.org/us-10m.v1.json')
        .await((error, us) => {
          if (error) throw error;
          // COUNTIES
          if (data.stratificationLevelId === '2') {
            svg.append('g')
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
                return 'grey';
              })
              .attr('d', path)
              .append('title')
              .text(d => {
                const data = ephdata.get(d.id);
                if (data) {
                  return `${data.rollover}`;
                }
                return 'no data';
              });
              
              // draw state border
              svg.append('path')
                .datum(topojson.mesh(us, us.objects.states, (a, b) => a!==b))
                .attr('class', 'states')
                .attr('d', path);
          } else if (data.stratificationLevelId === '1') { // STATES
            svg.append('g')
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
              .append('title')
              .text(d => {
                const data = ephdata.get(d.id);
                if (data) {
                  return `${data.rollover}`;
                }
                return 'no data';
              });
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
