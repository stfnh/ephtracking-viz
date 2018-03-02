import * as d3 from 'd3';
import ColorScheme from 'color-scheme';

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
        dataValue: parseFloat(item.dataValue),
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
      const scheme = new ColorScheme();
      scheme
        .from_hex('4863A0')
        .scheme('tetrade')
        .variation('pastel');
      const colors = scheme.colors(); // array of 16 colors

      // create line chart
      const svg = d3.select(container);
      const margin = { top: 20, right: 20, bottom: 30, left: 50 };
      const width = +svg.attr('width') - margin.left - margin.right;
      const height = +svg.attr('height') - margin.top - margin.bottom;
      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3.scaleBand().range([0, width]);
      const y = d3.scaleLinear().rangeRound([height, 0]);

      x.domain(preparedData.map(d => d.year));
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

      // draw lines
      const line = d3
        .line()
        .x(d => x(d.year))
        .y(d => y(d.dataValue));
      const keys = Object.keys(lines);
      keys.forEach((key, index) => {
        g
          .append('path')
          .datum(lines[key])
          .attr('fill', 'none')
          .attr('stroke', `#${colors[index]}`)
          .attr('stroke-linejoin', 'round')
          .attr('stroke-linecap', 'round')
          .attr('stroke-width', 1.5)
          .attr('d', line);
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
