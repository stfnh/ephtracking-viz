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
  let temporal = data.temporal || `2000-${new Date().getFullYear()}`;
  // temporal can be either: string (one year YYYY), string (year range YYYY-YYYY), array of strings (years)
  if (typeof temporal === 'string' && temporal.length === 9) {
    // YYYY-YYYY
    const [start, stop] = temporal.split('-');
    if (start > stop) {
      throw new Error('data.temporal not valid');
    }
    temporal = [];
    /*eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }]*/
    for (let i = start; i <= stop; i++) {
      temporal.push(i.toString());
    }
  } else if (
    !Array.isArray(temporal) &&
    typeof temporal === 'string' &&
    temporal.length !== 4
  ) {
    throw new Error('data.temporal not valid');
  }
  // check queryParams: only support max one stratification / query parameter 
  if (data.queryParams && (data.queryParams.match(',') || data.queryParams.match('&'))) {
    throw new Error('only one stratificaiton and query paramter is allowed');
  }
  const options = {
    measureId: data.measureId, // required, no default
    stratificationLevelId: data.stratificationLevelId || '1', // default state
    temporal,
    isSmoothed: data.isSmoothed || '0', // default not smoothed
    queryParams: data.queryParams ? `?${data.queryParams}` : '' // not required, no default
  };
  return options;
};

const choropleth = (container, data, title, showLegend = true, breakGroups = 8, colorScheme = 'schemeYlGn') => {
  const options = prepareOptions(data);
  const url = `https://ephtracking.cdc.gov/DataExplorer/getCoreHolder/${
    options.measureId
  }/${options.stratificationLevelId}/ALL/ALL/${options.temporal}/${
    options.isSmoothed
  }/0${options.queryParams}`;
  // container
  const svg = d3.select(container);
  const isMultiYear = Array.isArray(options.temporal);

  svg
    .append('text')
    .attr('class', 'loading')
    .attr('x', 25)
    .attr('y', 25)
    .text('fetching data...');

  d3.json(url, (error, response) => {
    svg.selectAll('.loading').remove();
    if (error) {
      console.error(error);
    } else if (
      response[response.tableReturnType] &&
      response[response.tableReturnType].length > 0
    ) {
      const top = title ? 50 : 20;
      const margin = { top, right: 20, bottom: 20, left: 20 };
      const width = +svg.attr('width') - margin.left - margin.right;
      const height = +svg.attr('height') - margin.top - margin.bottom;
      let active = d3.select(null);
      let startYear = Array.isArray(options.temporal)
        ? options.temporal[0]
        : options.temporal;
      // let currentYear = year;
      let currentYear = Number.parseInt(startYear, 10);
      const mapGroup = svg.append('g');
      const responseData = response[response.tableReturnType];
      const geographicTypeId = responseData[0].geographicTypeId;

      // create title
      if (title) {
        svg
          .append('text')
          .attr('x', svg.attr('width') / 2)
          .attr('y', margin.top / 2)
          .attr('text-anchor', 'middle')
          .attr('font-family', 'Verdana, Geneva, sans-serif')
          .attr('font-size', '14px')
          .text(title);
      }
      // year
      svg
        .append('text')
        .attr('class', 'year')
        .attr('x', svg.attr('width') / 2)
        .attr('y', margin.top / 2 + 17)
        .attr('text-anchor', 'middle')
        .attr('font-family', 'Verdana, Geneva, sans-serif')
        .attr('font-size', '14px')
        .text(currentYear);

      // color scheme
      const color = d3
        .scaleQuantile()
        .domain(responseData.map(d => d.dataValue))
        .range(d3Chromatic[colorScheme][breakGroups > 2 ? breakGroups : 8]);

      // create legend
      if (showLegend) {
        svg
          .append('g')
          .attr('class', 'legendMap')
          .attr('transform', 'translate(1000, 20)');
  
        const legendMap = legend
          .legendColor()
          .shapeWidth(30)
          .classPrefix('ephviz-')
          .cells(10)
          .scale(color);
        svg.select('.legendMap').call(legendMap);
      }

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

      // zoom on click
      function clicked(d) {
        if (active.node() === this) return reset();
        active.classed('active', false);
        active = d3.select(this).classed('active', true);

        var bounds = path.bounds(d),
          dx = bounds[1][0] - bounds[0][0],
          dy = bounds[1][1] - bounds[0][1],
          x = (bounds[0][0] + bounds[1][0]) / 2,
          y = (bounds[0][1] + bounds[1][1]) / 2,
          scale = 0.9 / Math.max(dx / width, dy / height),
          translate = [width / 2 - scale * x, height / 2 - scale * y];

        mapGroup
          .transition()
          .duration(750)
          .style('stroke-width', 1.5 / scale + 'px')
          .attr(
            'transform',
            'translate(' + translate + ')scale(' + scale + ')'
          );
      }

      function reset() {
        active.classed('active', false);
        active = d3.select(null);

        mapGroup
          .transition()
          .duration(750)
          .style('stroke-width', '1.5px')
          .attr('transform', '');
      }

      const min = d3.min(responseData, d =>
        parseInt(d.dataValue, 10)
      );
      const max = d3.max(responseData, d =>
        parseInt(d.dataValue, 10)
      );

      // map by geoId
      const ephdata = d3
        .nest()
        .key(d => d.geoId)
        .entries(responseData);

      /* Initialize tooltip */
      let tip = d3Tip()
        .attr('class', 'd3-tip')
        .html(d => {
          const data = ephdata.find(entry => entry.key === d.id);
          if (data) {
            const yearsDatum = data.values.find(
              item => item.year.substr(item.year.length - 4) === currentYear.toString()
            );
            if (yearsDatum) {
              return `${yearsDatum.rollover} (${yearsDatum.title})`;
            }
          }
          return 'no data';
        });
      svg.call(tip);

      const drawMap = us => {
        if (geographicTypeId === 2) {
          mapGroup
            .append('g')
            .attr('class', 'counties')
            .selectAll('path')
            .data(topojson.feature(us, us.objects.counties).features)
            .enter()
            .append('path')
            .attr('fill', d => {
              const data = ephdata.find(entry => entry.key === d.id);
              if (data) {
                const yearsDatum = data.values.find(
                  // in case of a time period, eg '2000-2004'
                  item =>
                    item.year.substr(item.year.length - 4) === startYear.toString()
                );
                if (yearsDatum) {
                  return color(yearsDatum.dataValue);
                }
              }
              return 'lightgrey';
            })
            .attr('d', path)
            .on('click', clicked)
            .on('mouseover', tip.show)
            .on('mouseout', tip.hide);

          // draw state border
          mapGroup
            .append('path')
            .datum(topojson.mesh(us, us.objects.states, (a, b) => a !== b))
            .attr('class', 'states')
            .attr('d', path);
        } else if (geographicTypeId === 1) {
          // STATES
          mapGroup
            .append('g')
            .attr('class', 'states')
            .selectAll('path')
            .data(topojson.feature(us, us.objects.states).features)
            .enter()
            .append('path')
            .attr('class', 'state')
            .attr('fill', d => {
              const data = ephdata.find(entry => entry.key === d.id);
              if (data) {
                const yearsDatum = data.values.find(
                  item =>
                    item.year.substr(item.year.length - 4) === startYear.toString()
                );
                if (yearsDatum) {
                  return color(yearsDatum.dataValue);
                }
              }
              return 'lightgrey';
            })
            .attr('d', path)
            .on('click', clicked)
            .on('mouseover', tip.show)
            .on('mouseout', tip.hide);
        }
      };

      const animateMap = us => {
        let i = 1; // first year is already rendered
        let max = Array.isArray(options.temporal) ? options.temporal.length : 1;
        const interval = setInterval(() => {
          currentYear = Number.parseInt(options.temporal[i], 10);
          svg.selectAll('.year').text(currentYear);
          svg.selectAll('.replay').remove();

          // we need to redraw almost everything, otherwise the tooltip won't update when hovered

          if (geographicTypeId === 2) {
            mapGroup.selectAll('.states').remove();
            mapGroup.selectAll('.counties').remove();
            mapGroup
              .append('g')
              .attr('class', 'counties')
              .selectAll('path')
              .data(topojson.feature(us, us.objects.counties).features)
              .enter()
              .append('path')
              .attr('fill', d => {
                const data = ephdata.find(entry => entry.key === d.id);
                if (data) {
                  const yearsDatum = data.values.find(
                    item =>
                      item.year.substr(item.year.length - 4) ===
                      currentYear.toString()
                  );
                  if (yearsDatum) {
                    return color(yearsDatum.dataValue);
                  }
                }
                return 'lightgrey';
              })
              .attr('d', path)
              .on('click', clicked)
              .on('mouseover', tip.show)
              .on('mouseout', tip.hide);

            // draw state border
            mapGroup
            .append('path')
            .datum(topojson.mesh(us, us.objects.states, (a, b) => a !== b))
            .attr('class', 'states')
            .attr('d', path);
          } else if (geographicTypeId === 1) {
            // STATES
            mapGroup.select('.states').remove();
            mapGroup
              .append('g')
              .attr('class', 'states')
              .selectAll('path')
              .data(topojson.feature(us, us.objects.states).features)
              .enter()
              .append('path')
              .attr('class', 'state')
              .on('click', clicked)
              .attr('fill', d => {
                const data = ephdata.find(entry => entry.key === d.id);
                if (data) {
                  const yearsDatum = data.values.find(
                    item =>
                      item.year.substr(item.year.length - 4) ===
                      currentYear.toString()
                  );
                  if (yearsDatum) {
                    return color(yearsDatum.dataValue);
                  }
                }
                return 'lightgrey';
              })
              .attr('d', path)
              .on('mouseover', tip.show)
              .on('mouseout', tip.hide);
          }

          i++;
          // done
          if (i === max) {
            clearInterval(interval);
            // replay
            svg
              .append('text')
              .attr('class', 'replay')
              .attr('x', 30)
              .attr('y', margin.top / 2)
              .attr('text-anchor', 'middle')
              .style('fill', 'darkblue')
              .attr('font-family', 'Verdana, Geneva, sans-serif')
              .attr('font-size', '12px')
              .text('Replay')
              .on('click', () => animateMap(us));
          }
        }, 1500);
      };

      d3
        .queue()
        .defer(d3.json, 'https://unpkg.com/us-atlas@1.0.2/us/10m.json')
        .await((error, us) => {
          if (error) throw error;
          drawMap(us);
          if (isMultiYear) {
            animateMap(us);
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
