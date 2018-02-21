import createVisualization from './';
import lineChart from './lineChart';

jest.mock('./lineChart');

describe('index of visualizations', () => {
  it('calls the correct visualization function', () => {
    const options = {};
    options.type = 'line-chart';
    createVisualization('#test', options);
    expect(lineChart).toHaveBeenCalledTimes(1);
  });

  it('reports error if options type not valid', () => {
    const options = {};
    options.type = 'not-valid';
    console.error = jest.fn();
    createVisualization('#test', options);
    expect(console.error).toHaveBeenCalledTimes(1);
  });
});
