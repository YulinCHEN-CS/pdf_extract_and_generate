const tabula = require('tabula-js');

const pdfFilePath = './pdfs/PAPE-2.0-English.pdf';

const extractTableFromPDF = async () => {
  try {
    const t = tabula(pdfFilePath);
    t.extractCsv((err, data) => {
      if (err) {
        console.error('Error extracting tables:', err);
      } else {
        console.log('Extracted data:', data);
      }
    });
  } catch (error) {
    console.error('Error in main function:', error);
  }
};
// 执行提取表格的函数
extractTableFromPDF();
