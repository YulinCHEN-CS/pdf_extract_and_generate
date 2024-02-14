const PdfTableExtractor = require('./pdfTableExtractor');

const disasterTypes = ['DROUGHT', 'EXTREME HEAT / HEAT WAVE', 'EXTREME COLD & WINTER STORMS / COLD WAVE', 'MAJOR EPIDEMIC AND PANDEMIC DISEASES', 'EARTHQUAKES', 'LANDSLIDE AND DEBRIS FLOWS', 'TSUNAMI AND STORM SURGE', 'VOLCANIC ERUPTIONS', 'TROPICAL CYCLONES', 'FLOODS', 'HAILSTORMS', 'CHEMICAL, BIOLOGICAL, RADIOLOGICAL AND NUCLEAR HAZARDS', 'WILDFIRES', 'CHILD PROTECTION']
const tableNames = ['Assess and plan', 'Mitigate risks', 'Prepare to respond'];

const sourcePdf = './pdfs/PAPE-2.0-English.pdf';
const targetJson = './parsed_pdfs/PAPE-2.0-English.json';

const pdfExtractor = new PdfTableExtractor(sourcePdf, targetJson, tableNames, disasterTypes);
pdfExtractor.loadPDF();