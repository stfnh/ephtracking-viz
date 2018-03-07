import * as d3 from 'd3';
import legend from 'd3-svg-legend';

import './lineChart.css';

const lineChart = (container, data) => {
  const url = `https://ephtracking.cdc.gov/apigateway/api/v1/getData/${
    data.measureId
  }/${data.states}/0/ALL/0/json`;
  d3.json(url, (error, response) => {
    if (error) {
      console.error(error);
    } else if (response.tableResult && response.tableResult.length > 0) {
      const preparedData = response.tableResult.map(item => ({
        year: item.year,
        dataValue: item.dataValue ? parseFloat(item.dataValue) : null,
        displayValue: item.displayValue,
        geo: item.geo,
        geoId: item.geoId,
        geoAbbreviation: item.geoAbbreviation,
        rollover: item.rollover[0]
      }));
      // data is in form: year, dataValue, displayValue (all string)
      // const height = .log(d3.select('.bar').node().style.width);
      // --- create d3 line chart ---

      // color scheme
      const colors = [
        '#c06568',
        '#64ac48',
        '#8361cc',
        '#9a963f',
        '#c167b1',
        '#4aac8d',
        '#d14076',
        '#688bcd',
        '#ce4f34',
        '#c98743'
      ];

      // create line chart
      const svg = d3.select(container);
      const margin = { top: 20, right: 250, bottom: 30, left: 80, legend: 20 };
      const width =
        +svg.attr('width') - margin.left - margin.right - margin.legend;
      const height = +svg.attr('height') - margin.top - margin.bottom;
      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3.scaleTime().range([0, width]);
      const y = d3.scaleLinear().rangeRound([height, 0]);

      // prepare years for x axis (sort and unique values)
      const years = preparedData.map(d => d.year);
      const startYear = d3.min(years, d => parseInt(d, 10));
      const endYear = d3.max(years, d => parseInt(d, 10));
      const allYears = Array.from(
        { length: endYear - startYear + 1 },
        (v, k) => new Date(k + startYear, 0, 1)
      );

      x
        .domain([allYears[0], allYears[allYears.length - 1]])
        .tickFormat(d3.timeFormat('%Y'));
      y.domain(d3.extent(preparedData, d => d.dataValue));

      g
        .append('g')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(x).ticks(d3.timeYear.every(1)));

      g.append('g').call(d3.axisLeft(y));

      // group data by state
      const lines = {};
      preparedData.forEach(item => {
        if (lines[item.geo]) {
          lines[item.geo].push(item);
        } else {
          lines[item.geo] = [item];
        }
      });

      // draw lines
      const line = d3
        .line()
        .defined(d => d.dataValue !== null)
        .x(d => x(new Date(d.year, 0, 1)))
        .y(d => y(d.dataValue));
      const keys = Object.keys(lines);
      const labels = [];
      keys.forEach((key, index) => {
        // up to 10
        if (index < 10) {
          g
            .append('path')
            .datum(lines[key])
            .attr('fill', 'none')
            .attr('stroke', colors[index])
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('stroke-width', 1.5)
            .attr('d', line);
          const numberElements = lines[key].length;
          const lastElement = lines[key][numberElements - 1];
          labels.push(
            `${key} ${lastElement.displayValue} (${lastElement.year})`
          );
        }
      });

      // legend
      const ordinal = d3
        .scaleOrdinal()
        .domain(labels)
        .range(colors);

      svg
        .append('g')
        .attr('class', 'legendLineChart')
        .attr(
          'transform',
          `translate(${width + margin.left + margin.legend}, ${margin.top})`
        );
      const legendOrdinal = legend.legendColor().scale(ordinal);
      svg.select('.legendLineChart').call(legendOrdinal);
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

export default lineChart;
