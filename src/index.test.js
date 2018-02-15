import lib from './';

describe('lib', () => {
  it('should have a createVisualization function', () => {
    expect(lib.createVisualization).toBeInstanceOf(Function);
  });
});
