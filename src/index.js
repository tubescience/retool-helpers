(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['exports'], factory);
    } else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
        // CommonJS
        factory(exports);
    } else {
        // Browser globals
        factory((root.retoolTableHelpers = {}));
    }
}(typeof self !== 'undefined' ? self : this, function(exports) {
    class TableFilter {
        /**
         * Constructs a TableFilter instance for converting filter objects into SQL WHERE clauses or human-readable strings.
         *
         * @param {Object} filter - The filter object defining the conditions.
         * @param {boolean} [ignoreInvalid=true] - Indicates whether filters with invalid configurations should be ignored.
         */
        constructor(filterDef = {}) {
          if (filterDef instanceof TableFilter) {
            // If the argument is an instance of TableFilter, copy its properties
            const filter = filterDef;
            this.filterDef = filter.filterDef;
            this.ignoreInvalid = filter.ignoreInvalid;
            this.operatorHandlers = filter.operatorHandlers;
            this.humanReadableHandlers = filter.humanReadableHandlers;
          } else {
            this.filterDef = filterDef;
            this.ignoreInvalid =
              typeof filterDef.ignoreInvalid !== "undefined"
                ? filterDef.ignoreInvalid
                : true; // Default value changed to true for consistency
            this.operatorHandlers = {
              is: (filter) => this.handleSimpleComparison(filter, "="),
              isNot: (filter) => this.handleSimpleComparison(filter, "<>"),
              includes: (filter) => this.handlePatternMatching(filter, "LIKE"),
              doesNotInclude: (filter) =>
                this.handlePatternMatching(filter, "NOT LIKE"),
              isTrue: (filter) => this.handleBoolean(filter, true),
              isFalse: (filter) => this.handleBoolean(filter, false),
              isEmpty: (filter) =>
                `${filter.columnId} IS NULL OR ${filter.columnId} = ''`,
              isNotEmpty: (filter) =>
                `${filter.columnId} IS NOT NULL AND ${filter.columnId} != ''`,
              isIn: (filter) => this.handleListComparison(filter, "IN"),
              isNotIn: (filter) => this.handleListComparison(filter, "NOT IN"),
              "<": (filter) => this.handleSimpleComparison(filter, "<"),
              ">": (filter) => this.handleSimpleComparison(filter, ">"),
              "<=": (filter) => this.handleSimpleComparison(filter, "<="),
              ">=": (filter) => this.handleSimpleComparison(filter, ">="),
              "=": (filter) => this.handleSimpleComparison(filter, "="),
              "<>": (filter) => this.handleSimpleComparison(filter, "<>"),
              and: (filter) => this.handleLogical(filter, "AND"),
              or: (filter) => this.handleLogical(filter, "OR"),
            };
            this.humanReadableHandlers = {
              is: (filter) => `${filter.columnId} is exactly '${filter.value}'`,
              isNot: (filter) => `${filter.columnId} is not '${filter.value}'`,
              includes: (filter) => `${filter.columnId} includes '${filter.value}'`,
              doesNotInclude: (filter) =>
                `${filter.columnId} does not include '${filter.value}'`,
              isTrue: (filter) => `${filter.columnId} is true`,
              isFalse: (filter) => `${filter.columnId} is false`,
              isEmpty: (filter) => `${filter.columnId} is empty`,
              isNotEmpty: (filter) => `${filter.columnId} is not empty`,
              isIn: (filter) => this.handleListComparison(filter, "is in"),
              isNotIn: (filter) => this.handleListComparison(filter, "is not in"),
              "<": (filter) => `${filter.columnId} is less than ${filter.value}`,
              ">": (filter) => `${filter.columnId} is greater than ${filter.value}`,
              "<=": (filter) =>
                `${filter.columnId} is less than or equal to ${filter.value}`,
              ">=": (filter) =>
                `${filter.columnId} is greater than or equal to ${filter.value}`,
              "=": (filter) => `${filter.columnId} equals ${filter.value}`,
              "<>": (filter) => `${filter.columnId} does not equal ${filter.value}`,
              and: (filter) => this.handleHumanLogical(filter, "and"),
              or: (filter) => this.handleHumanLogical(filter, "or"),
              AND: (filter) => this.handleHumanLogical(filter, "and"),
              OR: (filter) => this.handleHumanLogical(filter, "or"),
            };
          }
        }
      
        escapeStringValue(value) {
          if (Array.isArray(value)) {
            return value.map((v) =>
              typeof v === "string" ? `'${v.replace(/'/g, "''")}'` : v
            );
          }
          return `'${value.replace(/'/g, "''")}'`;
        }
      
        handleSimpleComparison(filter, operator) {
          if (!filter.columnId || filter.value === undefined) {
            if (this.ignoreInvalid) return "";
            throw new Error("Invalid filter configuration for simple comparison");
          }
          const value =
            typeof filter.value === "number"
              ? filter.value
              : this.escapeStringValue(filter.value);
          return `${filter.columnId} ${operator} ${value}`;
        }
      
        handlePatternMatching(filter, operator) {
          if (!filter.columnId || filter.value === undefined) {
            if (this.ignoreInvalid) return "";
            throw new Error("Invalid filter configuration for pattern matching");
          }
          const value = this.escapeStringValue(filter.value);
          return `${filter.columnId} ${operator} '%' || ${value} || '%'`;
        }
      
        handleBoolean(filter, value) {
          if (!filter.columnId) {
            if (this.ignoreInvalid) return "";
            throw new Error("Invalid filter configuration for boolean comparison");
          }
          return `${filter.columnId} = ${value}`;
        }
      
        handleListComparison(filter, operator) {
          if (
            !filter.columnId ||
            !Array.isArray(filter.value) ||
            filter.value.length === 0
          ) {
            if (this.ignoreInvalid) return "";
            throw new Error(
              `Invalid filter configuration for list comparison with operator "${operator}"`
            );
          }
          const values = filter.value
            .map((v) => (typeof v === "number" ? v : this.escapeStringValue(v)))
            .join(", ");
          return `${filter.columnId} ${operator} (${values})`;
        }
      
        handleLogical(filter, operator) {
          if (!filter.filters || filter.filters.length === 0) {
            if (this.ignoreInvalid) return "";
            throw new Error("Invalid filter configuration for logical operation");
          }
          try {
            const processedFilters = filter.filters
              .map((subFilter) => {
                // Process each sub-filter
                const subSql = new TableFilter(subFilter).toSQL();
                // Determine if the sub-filter's SQL needs to be wrapped in parentheses
                return subFilter.filters && subFilter.filters.length > 1
                  ? `(${subSql})`
                  : subSql;
              })
              .filter((sql) => sql !== "");
      
            if (processedFilters.length === 0) {
              return "";
            }
      
            return processedFilters.join(` ${operator} `);
          } catch (error) {
            if (this.ignoreInvalid) return "";
            throw error;
          }
        }
      
        invertOperator(operator) {
          const operatorInversions = {
            "<": ">=",
            "<=": ">",
            ">": "<=",
            ">=": "<",
            "=": "<>",
            "<>": "=",
            includes: "doesNotInclude",
            doesNotInclude: "includes",
            isTrue: "isFalse",
            isFalse: "isTrue",
            isEmpty: "isNotEmpty",
            isNotEmpty: "isEmpty",
            is: "isNot",
            isNot: "is",
            inIn: "isNotIn",
            isNotIn: "isIn",
            AND: "OR",
            OR: "AND",
          };
          return operatorInversions[operator] || operator;
        }
      
        invertFilter(filter) {
          if (filter.operator && filter.filters) {
            // Logical operators (AND/OR)
            filter.operator = this.invertOperator(filter.operator);
            filter.filters = filter.filters.map((f) =>
              this.invertFilter(JSON.parse(JSON.stringify(f)))
            ); // Deep copy for recursion
          } else if (filter.columnId && filter.operator) {
            // Individual filter conditions
            filter.operator = this.invertOperator(filter.operator);
          } else {
            throw new Error("Invalid filter configuration");
          }
          return filter;
        }
      
        invert() {
          this.filterDef = this.invertFilter(
            JSON.parse(JSON.stringify(this.filterDef))
          ); // Deep copy to avoid modifying the original object
          return this; // Return the instance for chaining
        }
        /**
         * Combines the current filter with one or more additional filters using the "AND" logical operator.
         * This creates a new TableFilter instance representing a logical conjunction of the current filter
         * and the provided filters. Each filter condition must be met for the combined filter to pass.
         *
         * @param {...(TableFilter|Object)} filters - One or more filters to be combined with the current filter.
         *        Each argument can be either a TableFilter instance or a raw filter object.
         * @returns {TableFilter} A new TableFilter instance representing the combined "AND" condition.
         */
        and(...filters) {
          const allFilters = [this, ...filters].map((f) =>
            f instanceof TableFilter ? f.filterDef : new TableFilter(f).filterDef
          );
          return new TableFilter({
            operator: "and",
            filters: allFilters,
          });
        }
      
        /**
         * Combines the current filter with one or more additional filters using the "OR" logical operator.
         * This creates a new TableFilter instance representing a logical disjunction of the current filter
         * and the provided filters. The combined filter passes if any of the individual filter conditions are met.
         *
         * @param {...(TableFilter|Object)} filters - One or more filters to be combined with the current filter.
         *        Each argument can be either a TableFilter instance or a raw filter object.
         * @returns {TableFilter} A new TableFilter instance representing the combined "OR" condition.
         */
        or(...filters) {
          const allFilters = [this, ...filters].map((f) =>
            f instanceof TableFilter ? f.filterDef : new TableFilter(f).filterDef
          );
          return new TableFilter({
            operator: "or",
            filters: allFilters,
          });
        }
      
        /**
         * Converts a filter object into an SQL WHERE clause string.
         *
         * This method processes the filter object provided at construction, translating it into a corresponding
         * SQL WHERE clause. The method respects the `ignoreInvalid` setting, determining whether to ignore or
         * throw errors for unsupported or invalid filters.
         *
         * @returns {string} The SQL WHERE clause representing the filter object.
         */
        toSQL() {
          try {
            const operator = this.filterDef.operator;
            const handler = this.operatorHandlers[operator];
            if (!handler) {
              if (this.ignoreInvalid) return "";
              throw new Error(`Unsupported operator: ${this.filterDef.operator}`);
            }
            return handler(this.filterDef);
          } catch (error) {
            if (this.ignoreInvalid) return "";
            throw error;
          }
        }
      
        /**
         * Handles logical operations ("AND", "OR") for generating human-readable strings.
         *
         * This method processes logical filters (those containing sub-filters) and combines their human-readable
         * representations using natural language conjunctions ("and", "or"). It ensures the output is grammatically
         * correct, particularly when dealing with multiple conditions.
         *
         * @param {Object} filter - The logical filter object containing sub-filters.
         * @param {string} operator - The logical operator ("AND", "OR") to use for combining conditions.
         * @returns {string} A human-readable string representing the logical filter.
         */
        handleHumanLogical(filter, operator) {
          const processedFilters = filter.filters
            .map((subFilter) => new TableFilter(subFilter).toHumanReadable())
            .filter((text) => text !== "");
      
          if (processedFilters.length === 0) {
            return "";
          }
      
          // For human-readable output, joining with commas and "and" or "or" for the last item
          const last = processedFilters.pop();
          return processedFilters.length > 0
            ? processedFilters.join(", ") + ` ${operator} ` + last
            : last;
        }
      
        /**
         * Converts a filter object into a human-readable string.
         *
         * This method processes the filter object provided at construction, translating it into a human-readable
         * description of the filter conditions. Like `toSQL`, it respects the `ignoreInvalid` setting.
         *
         * The output aims to be easily understandable, using natural language to describe the filter conditions.
         *
         * @returns {string} A human-readable string representing the filter object.
         */
        toHumanReadable() {
          try {
            const operator = this.filterDef.operator;
            const handler = this.humanReadableHandlers[operator];
            if (!handler) {
              if (this.ignoreInvalid) return "";
              throw new Error(
                `Unsupported operator for human-readable output: ${this.filterDef.operator}`
              );
            }
            return handler(this.filterDef);
          } catch (error) {
            if (this.ignoreInvalid) return "";
            throw error;
          }
        }
      
        /**
         * Collects all column IDs used in the filter definition.
         * @returns {Set} A set of unique column IDs.
         */
        collectFilterColumns() {
          const columns = new Set();
      
          const collect = (filter) => {
            if (filter.columnId) {
              columns.add(filter.columnId);
            }
            if (filter.filters) {
              filter.filters.forEach((f) => collect(f));
            }
          };
      
          collect(this.filterDef);
      
          return columns;
        }
      }

    class Segment {
        constructor({ label, columnAlias, filter } = {}) {
          if (label instanceof Segment) {
            // If the first argument is an instance of Segment, copy its properties
            const segment = label;
            this.label = segment.label;
            this.columnAlias = segment.columnAlias;
            this.filter = segment.filter;
          } else {
            this.label = label;
            this.columnAlias = columnAlias;
            this.filter = filter instanceof TableFilter ? filter : new TableFilter(filter);
          }
        }
      
        toSQL() {
          return this.filter.toSQL();
        }
      }

      class Breakdown {
        constructor({ columnId, columnAlias } = {}) {
          if (columnId instanceof Breakdown) {
            // If the first argument is an instance of Breakdown, copy its properties
            const breakdown = columnId;
            this.columnId = breakdown.columnId;
            this.columnAlias = breakdown.columnAlias;
          } else {
            this.columnId = columnId;
            this.columnAlias = columnAlias;
          }
        }
      
        toSQL() {
          return `${this.columnId} AS "${this.columnAlias}"`;
        }
      }

    class Metric {
        constructor({ value, columnAlias, aggregation } = {}) {
          if (value instanceof Metric) {
            // If the first argument is an instance of Metric, copy its properties
            const metric = value;
            this.value = metric.value;
            this.columnAlias = metric.columnAlias;
            this.aggregation = metric.aggregation;
          } else {
            this.value = value;
            this.columnAlias = columnAlias;
            this.aggregation = aggregation;
          }
        }
      
        toSQL() {
          return this.aggregation ? `${this.aggregation}(${this.value}) AS "${this.columnAlias}"` : `${this.value} AS "${this.columnAlias}"`;
        }
      }
      
    class PivotTable {
        constructor(config) {
        const {
            tableName = "",
            breakdowns = [],
            segments = [],
            metrics = [],
            filter = {},
            sourceQuery = "",
            availableColumns = null,
        } = config;
    
        this.tableName = tableName;
        this.breakdowns = breakdowns;
        this.segments = segments.map((segment) => ({
            ...segment,
            filter:
            segment.filter instanceof TableFilter
                ? segment.filter
                : new TableFilter(segment.filter),
        }));
        this.metrics = metrics;
        this.filter =new TableFilter(filter);
        this.sourceQuery = sourceQuery;
        }
    
        /**
         * Collects all unique column IDs required for the SQL query.
         * This includes columns used in breakdowns, segments, and metrics.
         * @returns {Set} A set of unique column IDs.
         */
        collectRequiredColumns() {
        const columns = new Set();
    
        // Add columns from breakdowns
        this.breakdowns.forEach((bd) => columns.add(bd.columnId));
    
        // Add columns from metrics
        this.metrics.forEach((metric) => columns.add(metric.value));
    
        // Add columns from segment filters
        this.segments.forEach((segment) => {
            const filterColumns = segment.filter.collectFilterColumns();
            filterColumns.forEach((col) => columns.add(col));
        });
    
        // Optionally, add columns from the main filter if applicable
        const mainFilterColumns = this.filter.collectFilterColumns();
        mainFilterColumns.forEach((col) => columns.add(col));
    
        return Array.from(columns).filter(obj=>!['', ' ', null, undefined].includes(obj));
        }
    
        toSQL() {
        let ctes = [];
    
        // Collect required columns
        // TODO: use list of table columns to filter only whats needed
        // already in the first CTE
        const requiredColumns = this.collectRequiredColumns();
        const selectedColumns = requiredColumns.join(", ");
    
        // Construct the preamble CTE if the configuration is provided
        if (this.sourceQuery) {
            const preambleCte = `${this.tableName} AS (
            ${this.sourceQuery}
            )`;
            ctes.push(preambleCte);
        }
    
        // Check if there are segments defined
        if (this.segments.length === 0) {
            console.warn(
            "No segments defined. A basic query will be generated without segmentation."
            );
            this.segments.push({
            filter: new TableFilter({
                operator: "isTrue",
                columnId: "1",
                value: "1",
            }),
            label: "All",
            column_alias: "All Segments",
            });
        }
    
        const segmentFiltersSQL = this.segments
            .map((segment) => `(${segment.filter.toSQL()})`)
            .join("\n    OR ");
        const combinedFilterSQL = `(${this.filter.toSQL()})\n    AND (${segmentFiltersSQL})`;
    
        // Add the main data CTE with only the required columns selected
        const mainDataCte = `filtered_data AS (
            SELECT *
            FROM ${this.tableName}
            WHERE ${combinedFilterSQL}
        )`;
        ctes.push(mainDataCte);
    
        // Combine all CTEs and the main query
        const cteQuery = `WITH ${ctes.join(",\n")}`;
    
        const segmentQueries = this.segments.map((segment) => {
            const breakdownColumns = this.breakdowns
            .map((bd) => `${bd.columnId} AS "${bd.column_alias}"`)
            .join(",\n        ");
            const metricColumns = this.metrics
            .map(
                (metric) =>
                metric.aggregation? `${metric.aggregation}(${metric.value}) AS "${metric.column_alias}"`: `${metric.value} AS "${metric.column_alias}"`
            )
            .join(",\n        ");
            const groupByColumns = this.breakdowns
            .map((bd) => bd.columnId)
            .join(", ");
    
            return `SELECT\n        ${breakdownColumns},\n        '${
            segment.label
            }' AS "${
            segment.column_alias
            }",\n        ${metricColumns}\n    FROM\n        filtered_data\n    WHERE\n        ${segment.filter.toSQL()}\n    GROUP BY\n        ${groupByColumns}`;
        });
    
        return `${cteQuery}\n${segmentQueries.join("\nUNION\n")}`;
        }
    }

    // Attach classes to the exports object to expose them
    exports.TableFilter = TableFilter;
    exports.PivotTable = PivotTable;
}));
