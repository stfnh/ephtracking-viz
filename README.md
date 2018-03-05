# ephtracking-viz
Environmental Public Health Visualizations

[![Build Status](https://travis-ci.org/stfnh/ephtracking-viz.svg?branch=master)](https://travis-ci.org/stfnh/ephtracking-viz)
[![codecov](https://codecov.io/gh/stfnh/ephtracking-viz/branch/master/graph/badge.svg)](https://codecov.io/gh/stfnh/ephtracking-viz)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![license](https://img.shields.io/github/license/mashape/apistatus.svg)](https://github.com/stfnh/ephtracking-viz/blob/master/LICENSE)

The ephtracking-viz library helps you to embed visualizations with data from the EPH Portal:

```
The National Environmental Public Health Tracking Network (Tracking Network) brings together health data and environment data from national, state, and city sources and provides supporting information to make the data easier to understand. The Tracking Network has data and information on environments and hazards, health effects, and population health.

The Tracking Network Data Application Program Interface (API) is an alternate way for developers to query data from the Environmental Public Health Tracking Network. The Tracking API provides a standard Uniform Resource Locator (URL) interface with a JavaScript Object Notation (JSON) formatted response.
```

[National Environmental Public Health Tracking Network](https://ephtracking.cdc.gov)

[Tracking Network Data Application Program Interface (API)](https://ephtracking.cdc.gov/apihelp)

## Getting started

### Install 

Install using npm or yarn:

```
yarn add ephtracking-viz
```

or

```
npm install --save ephtracking-viz
```

You can also use the latest relase from the global CDN [unpkg.com/ephtracking-viz](https://unpkg.com/ephtracking-viz/dist/index.umd.min.js):

```
<!-- D3 dependency -->
<script src="https://d3js.org/d3.v4.min.js"></script>
<!-- ephtracking-viz library -->
<script src="https://unpkg.com/ephtracking-viz/dist/index.umd.min.js"></script>
```
### Usage

Define a svg and specify the size for the visualization:

```
<svg id="viz" width="600" height="400"></svg>
```

Call the visualization library:

```
  var options = {
  type: 'line-chart',
  data: {
    measureId: '58',
    states: ['13', '12']
    }
  };
  ephtrackingViz.createVisualization('svg#viz', options);
```

This assistant helps you to generate the options: [EPH Tracking Viz Assistant](https://stfnh.github.io/ephtracking-viz-assistant/)

## License

MIT