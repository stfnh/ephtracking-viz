import lineChart from './lineChart';

const createVisualization = (container, options) => {
  switch (options.type) {
    case 'line-chart':
      lineChart(container, options.data);
      break;
    default:
      console.log('no such visualization type');
  }
};

export default createVisualization;
