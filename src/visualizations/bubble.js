import * as d3 from 'd3';
import d3Tip from 'd3-tip';
import legend from 'd3-svg-legend';

import population from './population';
import regionsLookup from './regionsLookup';

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
  const xUrl = `https://ephtracking.cdc.gov/apigateway/api/v1/getCoreHolder/${
    data.x.measureId
  }/1/ALL/ALL/${data.temporal}/${data.x.isSmoothed || 0}/0`;
  const yUrl = `https://ephtracking.cdc.gov/apigateway/api/v1/getCoreHolder/${
    data.y.measureId
  }/1/ALL/ALL/${data.temporal}/${data.y.isSmoothed || 0}/0`;

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
          d3.min(xData, d => d.dataValue),
          d3.max(xData, d => d.dataValue)
        ])
        .range([0, width]);

      const yScale = d3
        .scaleLinear()
        .domain([
          d3.min(yData, d => d.dataValue),
          d3.max(yData, d => d.dataValue)
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
        .html(d => `${d.geo}:<br>x: ${d.x.rollover[0]}<br>y: ${d.y.rollover[0]}`);
      svg.call(tip);

      // generate data pairs
      let data = [];
      xData.map(x => {
        const y = yData.find(y => y.geo === x.geo);
        if (y) {
          data.push({
            x,
            y,
            geo: x.geo,
            population: population[x.geo]
          });
        }
      });
      console.log(data);

      // draw circle
      const node = g
        .selectAll('circle')
        .data(data)
        .enter()
        .append('circle')
        .attr('cx', d => xScale(d.x.dataValue))
        .attr('cy', d => yScale(d.y.dataValue))
        .attr('class', d => `ephviz-${regionsLookup[d.geo]}`) // for highlighting when hovering over legend
        .attr('r', d => bubbleScale(d.population))
        .style('fill', d => fillColor(regionsLookup[d.geo]))
        .style('stroke', d => strokeColor(regionsLookup[d.geo]))
        .style('stroke-width', '1px')
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide);

      // create legend
      svg
        .append('g')
        .attr('class', 'legendOrdinal')
        .attr('transform', `translate(${width + margin.left + 10}, ${margin.top})`);
      const legendOrdinal = legend
        .legendColor()
        .title('Legend')
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
    }
  });
};

export default bubble;
