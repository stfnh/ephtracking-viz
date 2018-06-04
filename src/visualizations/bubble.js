import * as d3 from 'd3';
import population from './population';

const bubble = (container, data, title) => {
  // set margins
  const top = title ? 50 : 20;
  const margin = { top, right: 10, bottom: 10, left: 10 };

  // prepare svg and g for drawing
  const svg = d3.select(container);
  const width = +svg.attr('width') - margin.left - margin.right;
  const height = +svg.attr('height') - margin.top - margin.bottom;
  const g = svg
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);
  g
    .append('rect')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', 'pink');

  // prepare urls for json calls
  const xUrl = `https://ephtracking.cdc.gov/DataExplorer/getCoreHolder/${
    data.x.measureId
  }/1/ALL/ALL/${data.temporal}/${data.x.isSmoothed || 0}/0`;
  const yUrl = `https://ephtracking.cdc.gov/DataExplorer/getCoreHolder/${
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

    const xData = xResponse[xResponse.tableReturnType];
    const yData = yResponse[yResponse.tableReturnType];

    if (!xData || !yData0) {
      g
        .append('text')
        .attr('font-family', 'monospace')
        .text('no data');
    }

    console.log('done', xResponse, yResponse, population);
  });
};

export default bubble;
