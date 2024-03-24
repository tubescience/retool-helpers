# JavaScript SQL Query Builder Library

This library provides a set of classes to dynamically build SQL queries based on a variety of filters, breakdowns, segments, and metrics. It is designed to be flexible and can be used in both server-side environments (like Node.js) and in the browser.

## Features

- **TableFilter:** Allows for the creation of complex SQL `WHERE` clauses based on provided filter definitions.
- **Segment:** Facilitates the segmentation of data based on specific criteria, useful for grouping data before aggregation.
- **Breakdown:** Enables breaking down data by specific columns, supporting detailed analysis.
- **Metric:** Supports the definition of metrics, including aggregations, to be calculated from the data.
- **PivotTable:** Combines all the above elements to generate comprehensive SQL queries for data analysis.

## Installation

This library is designed to be included directly in your JavaScript projects. Simply copy the provided code into your project structure.

## Usage

Below are examples demonstrating how to use the provided classes.

### Creating a TableFilter

```javascript
const filter = new TableFilter({
  columnId: 'age',
  operator: '>',
  value: 25
});
console.log(filter.toSQL());
// Outputs: "age > 25"
```

### Combining Filters with Logical Operators

```javascript
const combinedFilter = new TableFilter({
  operator: 'and',
  filters: [
    { columnId: 'age', operator: '>', value: 25 },
    { columnId: 'country', operator: 'is', value: 'USA' }
  ]
});
console.log(combinedFilter.toSQL());
// Outputs the combined SQL WHERE clause
```

### Using Segments

```javascript
const segment = new Segment({
  label: 'Adults',
  columnAlias: 'age_segment',
  filter: { columnId: 'age', operator: '>', value: 18 }
});
console.log(segment.toSQL());
// Outputs the SQL WHERE clause for the segment
```

### Defining Metrics

```javascript
const metric = new Metric({
  value: 'revenue',
  columnAlias: 'total_revenue',
  aggregation: 'SUM'
});
console.log(metric.toSQL());
// Outputs: "SUM(revenue) AS 'total_revenue'"
```

### Creating a PivotTable Query

```javascript
const pivotTable = new PivotTable({
  tableName: 'sales_data',
  breakdowns: [
    { columnId: 'region', columnAlias: 'sales_region' }
  ],
  segments: [
    {
      label: 'High Value',
      columnAlias: 'value_segment',
      filter: { columnId: 'order_value', operator: '>', value: 1000 }
    }
  ],
  metrics: [
    { value: 'order_value', columnAlias: 'total_order_value', aggregation: 'SUM' }
  ]
});
console.log(pivotTable.toSQL());
// Outputs the complete SQL query
```

## Browser Compatibility

This library uses ES6 features, so it should be compatible with most modern web browsers. For older browsers, you might need to transpile the code using a tool like Babel.

## Contributing

Contributions to this library are welcome. Please submit pull requests or open issues to propose changes or report bugs.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
