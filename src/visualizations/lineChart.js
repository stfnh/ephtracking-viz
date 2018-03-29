import * as d3 from 'd3';
import legend from 'd3-svg-legend';

import './lineChart.css';

const prepareOptions = data => {
  // check for required options
  if (!data.measureId) {
    throw new Error('data.measureId not defined');
  }
  if (!data.geographicItemsFilter) {
    throw new Error('data.geographicItemsFilter not defined');
  }

  // default temporal: all data from 2000
  let temporal = data.temporal || `2000-${(new Date()).getFullYear()}`;
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

  const options = {
    measureId: data.measureId, // required, no default
    stratificationLevelId: data.stratificationLevelId || '1', // default state
    geographicTypeIdFilter: data.geographicTypeIdFilter || '1', // default state
    geographicItemsFilter: data.geographicItemsFilter, // required, no default; fips codes
    temporal,
    isSmoothed: data.isSmoothed || '0', // default not smoothed
    queryParams: data.queryParams ? `?${data.queryParams}` : '' // not required, no default
  };

  return options;
};

const lineChart = (container, data) => {
  // https://ephtracking.cdc.gov/apigateway/api/{version}/getCoreHolder/{measureId}
  //  /{stratificationLevelId}/{geographicTypeIdFilter}/{geographicItemsFilter}/{temporal}
  //  /{isSmoothed}/{getFullCoreHolder}[?apiToken][?Variables...]
  const options = prepareOptions(data);
  const url = `https://ephtracking.cdc.gov/DataExplorer/getCoreHolder/${
    options.measureId
  }/${options.stratificationLevelId}/${options.geographicTypeIdFilter}/${
    options.geographicItemsFilter
  }/${options.temporal}/${options.isSmoothed}/0${options.queryParams}`;
  d3.json(url, (error, response) => {
    if (error) {
      console.error(error);
    } else if (response.tableResult && response.tableResult.length > 0) {
      const preparedData = response.tableResult.map(item => ({
        // ToDo: Refactor and create Data object here
        year: item.year.trim().substr(0, 4), // only get first year
        label: item.year, // for measures over e.g. 5 years (2000 - 2005)
        dataValue: item.dataValue ? parseFloat(item.dataValue) : null,
        displayValue: item.displayValue,
        geo: item.geo,
        geoId: item.geoId,
        geoAbbreviation: item.geoAbbreviation,
        lookupListId: item.groupById,
        rollover: item.rollover[0]
      }));
      const { lookupList } = response;
      const sortedData = preparedData.sort((a, b) => a.year - b.year);
      // data is in form: year, dataValue, displayValue (all string), sorted by year
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
      const margin = { top: 20, right: 180, bottom: 30, left: 80 };
      const marginLegend = 20;
      const width =
        +svg.attr('width') - margin.left - margin.right - marginLegend;
      const height = +svg.attr('height') - margin.top - margin.bottom;
      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3.scaleTime().range([0, width]);
      const y = d3.scaleLinear().rangeRound([height, 0]);

      // prepare years for x axis (sort and unique values)
      const years = sortedData.map(d => d.year);
      const startYear = d3.min(years, d => parseInt(d, 10));
      const endYear = d3.max(years, d => parseInt(d, 10));
      const allYears = Array.from(
        { length: endYear - startYear + 1 },
        (v, k) => new Date(k + startYear, 0, 1)
      );

      x
        .domain([allYears[0], allYears[allYears.length - 1]])
        .tickFormat(d3.timeFormat('%Y'));
      y.domain(d3.extent(sortedData, d => d.dataValue));

      const xAxis = d3.axisBottom(x).ticks(d3.timeYear.every(1));

      g
        .append('g')
        .attr('transform', `translate(0, ${height})`)
        .attr('class', 'ephviz-axis')
        .call(xAxis);

      g
        .append('g')
        .attr('class', 'ephviz-axis')
        .call(d3.axisLeft(y).ticks(5))
        .select('.domain') // remove line from y-axis
        .remove();

      // grid lines
      const gridLines = d3
        .axisLeft(y)
        .tickFormat('')
        .ticks(5)
        .tickSize(-width);
      g
        .append('g')
        .attr('class', 'ephviz-grid-lines')
        .call(gridLines);

      // group data by state and stratification
      const lines = {};
      sortedData.forEach(item => {
        const lineKey = `${item.geoId}-${item.lookupListId}`;
        if (lines[lineKey]) {
          lines[lineKey].push(item);
        } else {
          lines[lineKey] = [item];
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
            .attr('stroke-width', 2)
            .attr('d', line);

          const numberElements = lines[key].length;
          const lastElement = lines[key][numberElements - 1];
          const stratification = lookupList[lastElement.lookupListId] ?
            lookupList[lastElement.lookupListId].map(i => i.itemName).join(', ') :
            '';
          const labelKey = stratification ? `${lastElement.geo}, ${stratification}` : lastElement.geo;
          labels.push(
            `${labelKey}: ${lastElement.displayValue} (${lastElement.label})`
          );

          // draw data dots
          g
            .selectAll(`.circle-${index}`)
            .data(lines[key])
            .enter()
            .append('circle')
            .attr('class', `.circle-${index} .circle`)
            .attr('cx', d => x(new Date(d.year, 0, 1)))
            .attr('cy', d => y(d.dataValue))
            .attr('r', 5)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .attr('fill', colors[index]);
        }
      });

      /* eslint-disable no-inner-declarations */
      function createLegend(l) {
        const ordinal = d3
          .scaleOrdinal()
          .domain(l)
          .range(colors);

        svg
          .append('g')
          .attr('class', 'legend')
          .attr(
            'transform',
            `translate(${width + margin.left + marginLegend}, ${margin.top})`
          );

        const legendOrdinal = legend
          .legendColor()
          .scale(ordinal)
          .classPrefix('ephviz-')
          .labelWrap(150);

        const svgLegend = svg.select('.legend').call(legendOrdinal);
        svgLegend.exit().remove();
      }

      createLegend(labels);

      // overlay and update legend on mouse move
      // line to show on hover
      const hoverLine = g
        .append('line')
        .attr('class', 'ephviz-hover-line')
        .style('display', 'none')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', 0)
        .attr('y2', height);

      /* eslint-disable no-inner-declarations */
      function mousemove() {
        const x0 = x.invert(d3.mouse(this)[0]);
        const bisectDate = d3.bisector(d => new Date(d.year, 0, 1)).left;
        const i = bisectDate(sortedData, x0, 1);
        let d;
        // last element
        if (i === sortedData.length) {
          d = new Date(sortedData[i - 1].year, 0, 1);
        } else {
          const d0 = new Date(sortedData[i - 1].year, 0, 1);
          const d1 = new Date(sortedData[i].year, 0, 1);
          d = x0 - d0 > d1 - x0 ? d1 : d0;
        }
        // move line
        hoverLine.attr('x1', x(d));
        hoverLine.attr('x2', x(d));
        // update legend
        const newLabels = keys.map((key, index) => {
          if (index < 10) {
            const selectedYear = d.getFullYear().toString();
            const entry = lines[key].find(
              element => element.year === selectedYear
            );
            if (!entry) {
              return `${key}: no data (${selectedYear})`;
            }
            const stratification = lookupList[entry.lookupListId] ?
              lookupList[entry.lookupListId].map(i => i.itemName).join(', '):
              null;
            const labelKey = stratification ? `${entry.geo}, ${stratification}` : entry.geo;
            return `${labelKey}: ${entry.displayValue} (${entry.label})`;
          }
        });
        createLegend(newLabels);
      }

      // overlay for mouseover events
      svg
        .append('rect')
        .attr('class', 'ephviz-overlay')
        .attr('transform', `translate(${margin.left},${margin.top})`)
        .attr('width', width)
        .attr('height', height)
        .on('mouseover', () => hoverLine.style('display', null))
        .on('mouseout', () => {
          hoverLine.style('display', 'none');
          createLegend(labels);
        })
        .on('mousemove', mousemove);
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
