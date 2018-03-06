import * as d3 from 'd3';

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
      const margin = { top: 20, right: 20, bottom: 30, left: 80 };
      const width = +svg.attr('width') - margin.left - margin.right;
      const height = +svg.attr('height') - margin.top - margin.bottom;
      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3.scaleBand().range([0, width]);
      const y = d3.scaleLinear().rangeRound([height, 0]);

      // prepare years for x axis (sort and unique values)
      const years = preparedData.map(d => d.year);
      const startYear = d3.min(years, d => parseInt(d, 10));
      const endYear = d3.max(years, d => parseInt(d, 10));
      const allYears = Array.from(
        { length: endYear - startYear + 1 },
        (v, k) => k + startYear
      );
      x.domain(allYears);
      y.domain(d3.extent(preparedData, d => d.dataValue));

      g
        .append('g')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(x))
        .select('.domain');
      g.append('g').call(d3.axisLeft(y));

      // group data by state
      const lines = {};
      preparedData.forEach(item => {
        if (lines[item.geoId]) {
          lines[item.geoId].push(item);
        } else {
          lines[item.geoId] = [item];
        }
      });

      console.log(lines);

      // draw lines
      const line = d3
        .line()
        .defined(d => d.dataValue !== null)
        .x(d => x(d.year))
        .y(d => y(d.dataValue));
      const keys = Object.keys(lines);
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

export default lineChart;
