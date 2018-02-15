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
    console.log(measureId, state);
    this.url = `https://ephtracking.cdc.gov/apigateway/api/v1/getData/${measureId}/${state}/0/ALL/0/json`;
    this.measureId = measureId;
    this.state = state;
  }

  async fetchData() {
    try {
      const response = await fetch(this.url);
      this.response = response.text();
      return this.response;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  getResponse() {
    return this.response;
  }
}

export default GetData;
