import lineChart from './lineChart';
import choropleth from './choropleth';

const createVisualization = (container, options) => {
  switch (options.type) {
    case 'line-chart':
      lineChart(container, options.data, options.title);
      break;
    case 'choropleth':
      choropleth(container, options.data, options.title);
      break;
    default:
      console.error('no such visualization type');
  }
};

export default createVisualization;
