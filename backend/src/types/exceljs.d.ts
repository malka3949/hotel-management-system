// ExcelJS 4.4.0 ships no compiled .d.ts — declares types in index.d.ts that is absent.
// Suppress TS7016 with a wildcard declaration.
declare module 'exceljs';
