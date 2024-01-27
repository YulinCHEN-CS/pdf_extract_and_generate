const PDFTableExtractor = require("pdf-table-extractor");

/**
 * Extract the tables from the pdf file
 * @param {String} pdfPath: source pdf file path 
 * @returns {object} tableJson: the tables extracted from the pdf file
 */
async function extract_tables(pdfPath) {
    const tableJson = await new Promise((resolve, reject) => {
        PDFTableExtractor(pdfPath, success, reject);

        function success(result) {
            // console.log('Success:', result);
            const tableData = result.pageTables[0].tables;
        
            const filteredTable = tableData.map(row => row.filter(cell => cell.trim() !== ''));
        
            const mergedTables = [];
            let currentTable = [];
        
            filteredTable.forEach(row => {
                // console.log('Row:', row);
                // console.log('Row Length:', row.length);
                // console.log('Current Table:', currentTable);
                // if (currentTable.length > 0) {
                //     console.log('Current Table[0] Length:', currentTable[0].length);
                // }
                // console.log('Merged Tables:', mergedTables);
                // console.log('---------------------------------')
                if (row.length > 1) {
                    // uses the first row to determine the number of columns
                    const rowLength = row.filter(cell => cell.trim() !== '').length;
            
                    if (currentTable.length === 0 || rowLength === currentTable[0].length) {
                        currentTable.push(row);
                    } else {
                        if (currentTable.length > 0) {
                            mergedTables.push(currentTable);
                        }
                        currentTable = [row];
                    }
                }
            });

            // Push the last table
            if (currentTable.length > 0) {
                mergedTables.push(currentTable);
            }
            // Construct json object
            const tableJson = {
                tables: mergedTables
            };
            resolve(tableJson);
        }
    });
    return tableJson;
}

module.exports = {
    extract_tables
};

