import GetData from './api/GetData';

const createVisualization = async (containerId, options) => {
  console.log(containerId, options);
  const getData = new GetData(options.data.measureId, options.data.state);
  const response = await getData.fetchData();
  console.log(response);
};

export default createVisualization;
