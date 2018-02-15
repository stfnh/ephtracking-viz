/**
 * @class GetData
 * fetches data for given measureId and state for all years, not smoothed, counties not included
 */
class GetData {
  /**
   * @param {number|string} measureId
   * @param {string} state
   * @memberof GetData
   */
  constructor(measureId, state) {
    this.url = `https://ephtracking.cdc.gov/apigateway/api/v1/getData/${measureId}/${state}/0/ALL/0/json`;
    this.measureId = measureId;
    this.state = state;
  }

  async fetchData() {
    try {
      const response = await fetch(this.url);
      this.response = await response.json();
      return this.response;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  getResponse() {
    return this.response;
  }

  getPreparedData() {
    let preparedData;
    if (this.response.tableResult && this.response.tableResult.length > 0) {
      preparedData = this.response.tableResult.map(item => ({
        year: item.year,
        dataValue: parseInt(item.dataValue, 10),
        displayValue: item.displayValue
      }));
    } else {
      preparedData = null;
    }
    return preparedData;
  }
}

export default GetData;
