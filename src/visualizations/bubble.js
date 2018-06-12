import * as d3 from 'd3';
import d3Tip from 'd3-tip';
import legend from 'd3-svg-legend';

import population from './population';
import regionsLookup from './regionsLookup';

import './bubble.css';

const getTemporalParmeter = temporal => {
  if (!temporal) {
    throw new Error('temporal is required');
  }
  let preparedTemporal = temporal;
  // temporal can be either: string (one year YYYY), string (year range YYYY-YYYY), array of strings (years)
  if (typeof preparedTemporal === 'string' && preparedTemporal.length === 9) {
    // YYYY-YYYY
    const [start, stop] = preparedTemporal.split('-');
    if (start > stop) {
      throw new Error('data.temporal not valid');
    }
    preparedTemporal = [];
    /*eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }]*/
    for (let i = start; i <= stop; i++) {
      preparedTemporal.push(i.toString());
    }
  } else if (
    !Array.isArray(preparedTemporal) &&
    typeof preparedTemporal === 'string' &&
    preparedTemporal.length !== 4
  ) {
    throw new Error('data.temporal not valid');
  }
  return preparedTemporal;
};

const bubble = (container, data, title) => {
  // set margins
  const top = title ? 50 : 20;
  const margin = { top, right: 100, bottom: 20, left: 30 };

  // prepare svg and g for drawing
  const svg = d3.select(container);
  const width = +svg.attr('width') - margin.left - margin.right;
  const height = +svg.attr('height') - margin.top - margin.bottom;

  // the group for the actual bubble chart
  const g = svg
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  // create title and axis labels
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
  if (data.x.label) {
    g
      .append('text')
      .attr('x', width)
      .attr('y', height - 5)
      .attr('font-size', '11px')
      .attr('fill', 'grey')
      .attr('text-anchor', 'end')
      .text(data.x.label);
  }
  if (data.y.label) {
    g
      .append('text')
      .attr('x', 0)
      .attr('y', 15)
      .attr('font-size', '11px')
      .attr('fill', 'grey')
      .attr('text-anchor', 'end')
      .attr('transform', 'rotate(-90)')
      .text(data.y.label);
  }

  // prepare urls for json calls
  const temporal = getTemporalParmeter(data.temporal);
  const firstYear = Array.isArray(temporal) ? temporal[0] : temporal;
  const xUrl = `https://ephtracking.cdc.gov/apigateway/api/v1/getCoreHolder/${
    data.x.measureId
  }/1/ALL/ALL/${temporal}/${data.x.isSmoothed || 0}/0`;
  const yUrl = `https://ephtracking.cdc.gov/apigateway/api/v1/getCoreHolder/${
    data.y.measureId
  }/1/ALL/ALL/${temporal}/${data.y.isSmoothed || 0}/0`;

  // get data asynchronously
  const q = d3.queue();
  q.defer(d3.json, xUrl);
  q.defer(d3.json, yUrl);
  q.await((error, xResponse, yResponse) => {
    if (error) {
      console.error(error);
      throw error;
    }

    const xData = xResponse && xResponse[xResponse.tableReturnType];
    const yData = yResponse && yResponse[yResponse.tableReturnType];

    if (!xData || !yData || xData.length === 0 || yData.length === 0) {
      g
        .append('text')
        .attr('font-family', 'monospace')
        .text('no data');
    } else {
      // scales
      const xScale = d3
        .scaleLinear()
        .domain([
          d3.min(xData, d => parseFloat(d.dataValue)),
          d3.max(xData, d => parseFloat(d.dataValue))
        ])
        .range([0, width]);

      const yScale = d3
        .scaleLinear()
        .domain([
          d3.min(yData, d => parseFloat(d.dataValue)),
          d3.max(yData, d => parseFloat(d.dataValue))
        ])
        .range([height, 0]);

      const bubbleScale = d3
        .scaleLinear()
        .domain([d3.min(d3.values(population)), d3.max(d3.values(population))])
        .range([5, 30]);

      // fill regions
      const regions = ['Northeast', 'Midwest', 'South', 'West']
      const fillColor = d3
        .scaleOrdinal()
        .domain(regions)
        .range(['#324D5C', '#46B29D', '#F0CA4D', '#DE5349']);
      const strokeColor = d3
        .scaleOrdinal()
        .domain(regions)
        .range(['#7EC2E8', '#2D7265', '#B09439', '#9E3B34']);

      // axis
      const xAxis = d3.axisBottom().scale(xScale);
      g
        .append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0, ${height})`)
        .call(xAxis);
      const yAxis = d3.axisLeft().scale(yScale);
      g
        .append('g')
        .attr('class', 'axis')
        .attr('transform', 'translate(0, 0)')
        .call(yAxis);

      const tip = d3Tip()
        .attr('class', 'd3-tip')
        .html(d => `${d.geo}`);
      svg.call(tip);

      // generate data pairs
      let data = Object
        .keys(population)
        .map(state => {
          const entry = { population: population[state], geo: state, x: {}, y: {} };
          // substr: five year period
          xData.filter(e => e.geo === state).forEach(e => entry.x[e.year.substr(e.year.length - 4)] = e);
          yData.filter(e => e.geo === state).forEach(e => entry.y[e.year.substr(e.year.length - 4)] = e);
          return entry
        });
      console.log(data);

      // create legend
      svg
        .append('g')
        .attr('class', 'legendOrdinal')
        .attr('transform', `translate(${width + margin.left + 12}, ${margin.top})`);
      const legendOrdinal = legend
        .legendColor()
        .title(firstYear)
        .classPrefix('ephviz-')
        .scale(fillColor)
        // highlight the mousover region
        .on('cellover', d => {
          regions
            .filter(r => r !== d)
            .forEach(region => {
              d3
                .selectAll(`.ephviz-${region}`)
                .style('opacity', 0.10);
            })
        })
        .on('cellout', d => {
        regions
          .forEach(region => {
            d3
              .selectAll(`.ephviz-${region}`)
              .style('opacity', null);
          })
        });
      svg.select('.legendOrdinal').call(legendOrdinal);

      console.log(firstYear);
      // draw circle
      const dot = g
        .selectAll('circle')
        .data(data)
        .enter()
        .append('circle')
        .attr('cx', d => {
          if (d.x[firstYear] && parseFloat(d.x[firstYear].dataValue)
            && d.y[firstYear] && parseFloat(d.y[firstYear].dataValue)) {
            return xScale(parseFloat(d.x[firstYear].dataValue));
          }
          return width / 2;
         })
        .attr('cy', d => {
          if (d.x[firstYear] && parseFloat(d.x[firstYear].dataValue)
          && d.y[firstYear] && parseFloat(d.y[firstYear].dataValue)) {
            return yScale(parseFloat(d.y[firstYear].dataValue));
          }
          return height / 2;
         })
        .attr('class', d => `ephviz-${regionsLookup[d.geo]}`) // for highlighting when hovering over legend
        .attr('r', d => bubbleScale(d.population))
        .style('fill', d => fillColor(regionsLookup[d.geo]))
        .style('stroke', d => strokeColor(regionsLookup[d.geo]))
        .style('stroke-width', '1px')
        .style('display', d => {
          if (d.x[firstYear] && parseFloat(d.x[firstYear].dataValue)
          && d.y[firstYear] && parseFloat(d.y[firstYear].dataValue)) {
            return null;
          }
          return 'none';
        })
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide);
      
      // animate dots
      const updateDots = year => {
        dot
          .transition()
          .duration(750)
          .attr('cx', d => {
            if (d.x[year] && parseFloat(d.x[year].dataValue)
            && d.y[year] && parseFloat(d.y[year].dataValue)) {
              return xScale(parseFloat(d.x[year].dataValue));
            }
            return width / 2;
          })
          .attr('cy', d => {
            if (d.x[year] && parseFloat(d.x[year].dataValue)
            && d.y[year] && parseFloat(d.y[year].dataValue)) {
              return yScale(parseFloat(d.y[year].dataValue));
            }
            return height / 2;
          })
          .style('display', d => {
            if (d.x[year] && parseFloat(d.x[year].dataValue)
            && d.y[year] && parseFloat(d.y[year].dataValue)) {
              return null;
            }
            return 'none';
          });
        
        d3.select('.ephviz-legendTitle').text(year);
      }
      let i = 1;
      const startAnimation = () => {
        svg.selectAll('.replay').remove();
        let intervalId = setInterval(() => {
          updateDots(temporal[i]);
          i++;
          if (i === temporal.length) {
            clearInterval(intervalId);
            i=1;
            // add replay link
            g
              .append('text')
              .attr('class', 'replay')
              .attr('x', width + 29)
              .attr('y', 102)
              .attr('text-anchor', 'middle')
              .style('fill', 'darkblue')
              .attr('font-family', 'Verdana, Geneva, sans-serif')
              .attr('font-size', '12px')
              .text('Replay')
              .on('click', () => {
                updateDots(temporal[0]); // immediately run the first one
                startAnimation();
              });
          }
        }, 1500);
      }

      if (Array.isArray(temporal)) {
        startAnimation();
      }

      
    }
  });
};

export default bubble;
