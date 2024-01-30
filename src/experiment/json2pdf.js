const fs = require('fs');
const PDFDocument = require('pdfkit-table');

/**
 * Write the json data to pdf
 * @param {object} jsonData: the json data to be converted
*/
function jsonToPdf(jsonData, outputFile) {
    const outputDir = './pdfs_generated/';

    // Create the output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    const doc = new PDFDocument();
    const stream = fs.createWriteStream(outputFile);

    doc.pipe(stream);
    doc.fontSize(12);

    doc.text('\nInfo', { align: 'left', underline: true});

    // Construct the info table
    doc.moveDown();
    const infotable = {
        headers: ['Disaster Type', 'Date', 'Location'],
        rows: [
            [jsonData.info.disasterType, jsonData.info.date, jsonData.info.location]
        ]
    }
    doc.table(infotable);

    doc.moveDown();
    doc.fontSize(12); // reset the font size, seems table changes the fontsize

    doc.text('Tables', { align: 'left', underline: true});

    // Process "tables" and add them to the PDF
    jsonData.tables.tables.forEach((tableData, index) => {
        doc.moveDown();
        const table = {
            headers: tableData[0], // Assuming the first row contains headers
            rows: tableData.slice(1), // Assuming the rest are data rows
        };
        doc.table(table);
    });

    // Finalize the PDF and close the stream
    doc.end();
    stream.on('finish', () => {
        console.log(`PDF created: ${outputFile}`);
    });
}

module.exports = {
    jsonToPdf
};
