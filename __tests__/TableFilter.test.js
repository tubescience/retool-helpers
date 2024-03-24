const { PivotTable, TableFilter } = require('../src/index');


describe('TableFilter', () => {
  test('should handle simple "is" comparison', () => {
    const filter = new TableFilter({
      operator: 'is',
      columnId: 'age',
      value: 30
    });
    expect(filter.toSQL()).toBe("age = 30");
  });

  test('should handle "isNotEmpty" condition', () => {
    const filter = new TableFilter({
      operator: 'isNotEmpty',
      columnId: 'name'
    });
    expect(filter.toSQL()).toBe("name IS NOT NULL AND name != ''");
  });

  // Add more tests for other operators and scenarios...
});
