declare module 'exceljs' {
  namespace ExcelJS {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type Cell = Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type Row = Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type Column = Record<string, any>;
    interface Worksheet {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      columns: any[];
      autoFilter: unknown;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      addRow(data: any): Row;
      getRow(index: number): Row;
    }
    interface Workbook {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      addWorksheet(name: string, options?: any): Worksheet;
      xlsx: { writeBuffer(): Promise<unknown> };
    }
    const Workbook: new () => Workbook;
  }
  export = ExcelJS;
}
