const { PivotTable, TableFilter } = require('../src/index');


describe('PivotTable', () => {
  test('should collect required columns', () => {
    const pivotTable = new PivotTable({
      tableName: 'users',
      breakdowns: [{ columnId: 'country', column_alias: 'Country' }],
      segments: [
        {
          label: 'Active Users',
          column_alias: 'active_users',
          filter: new TableFilter({
            operator: 'isTrue',
            columnId: 'isActive',
            value: '1'
          })
        }
      ],
      metrics: [
        { value: 'userId', column_alias: 'Total Users', aggregation: 'COUNT' }
      ]
    });

    const expectedColumns = ['country', 'isActive', 'userId'];
    expect(pivotTable.collectRequiredColumns()).toEqual(expect.arrayContaining(expectedColumns));
  });

  // Add more tests for toSQL method and other functionalities...
});
