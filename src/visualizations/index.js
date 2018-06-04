import lineChart from './lineChart';
import choropleth from './choropleth';
import bubble from './bubble';

const createVisualization = (container, options) => {
  switch (options.type) {
    case 'line-chart':
      lineChart(container, options.data, options.title);
      break;
    case 'choropleth':
      choropleth(container, options.data, options.title, options.showLegend, options.breakGroups, options.colorScheme);
      break;
    case 'bubble':
      bubble(container, options.data, options.title);
      break;
    default:
      console.error('no such visualization type');
  }
};

export default createVisualization;
