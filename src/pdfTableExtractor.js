const fs = require('fs');
const PDFParser = require('pdf2json');
const Table = require('./table.js');

class PdfTableExtractor {
    constructor(filePath) {
        this.filePath = filePath;
        this.pdfParser = new PDFParser();
        this.tables = [];
    }

    loadPDF() {
        console.log('Extracting text from PDF...');
        this.pdfParser.loadPDF(this.filePath);

        this.pdfParser.on("pdfParser_dataError", errData => {
            console.error(errData.parserError);
        });

        this.pdfParser.on("pdfParser_dataReady", pdfData => {
            this.processPDF(pdfData);
        });
    }

    processPDF(pdfData) {
        for (let i = 0, len = pdfData.Pages.length; i < len; i++) {
            console.log(`---------pdf page ${i}--------`);
            const page = pdfData.Pages[i];
            var cellsOfFills = [];
            page.Fills.forEach(fill => cellsOfFills.push(this.processFill(fill, page.Texts, page.HLines.sort((a, b) => a.y - b.y))));
            this.processPage(cellsOfFills);
        }
        
        console.log('Tables Information:');
        for (const table of this.tables) {
            console.log(table.toString());
        }
    }

    processPage(cellsOfFills) {
        // Process each fill (rectangle) in the page
        // Check if the fill contains a table name
        for (const cells of cellsOfFills) {
            // console.log('Cells of fill:', cells);
            // console.log('Cells of fills length:', cells[0]);
            const tableName = cells[0] ? this.getTableNameFromCell(cells[0]) : null;
            if (cells[0] && cells.length == 1 && !tableName) {
                if (!(cells[0][0] == 'Key messages' || cells[0][0] == 'Context-speciﬁc detailss')) {
                   continue;
                }
            }
            if (tableName) {
                    // Create a new table with the identified name
                const table = new Table(tableName);
                this.tables.push(table);

            } else {
                // Check if there are any tables in the list
                if (this.tables.length > 0) {
                    // Find the last table in the list
                    const lastTable = this.tables[this.tables.length - 1];

                    // Merge the content of the current table with the last one
                    lastTable.addCells(cells);
                }
            }
        }
        
    }

    processFill(fill, textsInPage, hLinesInPage) {
        const textsInBox = this.filterTextsInBox(textsInPage, fill);
        const mergedHLines = this.mergeHLinesInBox(fill, hLinesInPage);
        var cells = this.splitIntoCells(textsInBox, mergedHLines);
        // console.log('Cells before process:', cells);
        cells = this.processCells(cells);
        // console.log('Cells:', cells);
        return cells;
    }

    processCells(cells) {
        const processed_cells = [];
        for (let i = 0; i < cells.length; i++) {
            processed_cells.push(this.processCell(cells[i]));
        }
        return processed_cells;
    }

    processCell(cell) {
        const result = [];

        let currentString = '';

        for (const text of cell) {
            const decodedText = this.decode(text);
            if (decodedText.R[0].T === '•') {
                if (currentString !== '') {
                    result.push(currentString);
                }
                currentString = '•';
            } else {
                currentString += decodedText.R[0].T;
            }
        }

        if (currentString !== '') {
            result.push(currentString);
        }
        return result;
    }

    decode(text) {
        // console.log(text.R[0].T);
        text.R[0].T = decodeURIComponent(text.R[0].T).replace('!', 'fi').replace("\"", 'fl');
        // console.log(text.R[0].T);
        return text;
    }

    filterTextsInBox(textsInPage, fill) {
        return textsInPage.filter(text => this.isTextInBox(text, fill));
    }

    isTextInBox(text, fill) {
        const textX = text.x;
        const textY = text.y;
        return textX >= fill.x && textX <= (fill.x + fill.w) &&
               textY >= fill.y && textY <= (fill.y + fill.h);
    }

    // Merge horizontal lines in the given fill
    mergeHLinesInBox(fill, hLinesInPage) {

        // Get horizontal lines within the fill area
        const hLinesInBox = hLinesInPage.filter(hLine => {
            const hLineY = hLine.y;
            return hLineY >= fill.y && hLineY <= (fill.y + fill.h);
        });

        // If the first horizontal line is below the fill, insert a line at fill's top
        if (hLinesInBox.length > 0 && hLinesInBox[0].y > fill.y) {
            hLinesInBox.unshift({ y: fill.y });
        }

        // If the last horizontal line is above the fill bottom, add a line at fill's bottom
        const lastLine = hLinesInBox[hLinesInBox.length - 1];
        // console.log("last line y: ", lastLine.y);
        // console.log("last line w: ", lastLine.w);
        // console.log("fill y + fill w: ", fill.y + fill.h);
        if (lastLine && lastLine.y + lastLine.w < fill.y + fill.h) {
            // console.log("pushing bottom line");
            hLinesInBox.push({ y: fill.y + fill.h, w: fill.w });
        }

        return hLinesInBox.reduce((acc, currentLine) => {
            const existingLine = acc.find(line => line.y === currentLine.y);

            if (existingLine) {
                existingLine.l += currentLine.l;
            } else {
                acc.push({ ...currentLine });
            }

            return acc;
        }, []);
    }

    // Split texts into cells based on merged horizontal lines
    splitIntoCells(textsInBox, mergedHLines) {
        const cells = [];

        for (let i = 0; i < mergedHLines.length - 1; i++) {
            const hLine1 = mergedHLines[i];
            const hLine2 = mergedHLines[i + 1];

            // Filter texts that are between two horizontal lines
            const regionTexts = textsInBox.filter(text => {
                const textY = text.y;

                // For lines in between, check if the text is between hLine1 and hLine2
                return textY >= hLine1.y && textY <= hLine2.y;
            });

            cells.push(regionTexts);
        }

        return cells;
    }

    getTableNameFromCell(cell) {
        // Your logic to extract the table name from the fill's cell content
        // Replace the following line with your actual implementation
        const cellContent = cell[0];
        if (!cellContent) {
            return null;
        }
        const tableNames = ['Assess and plan', 'Mitigate risks: physical or environmental', 'Prepare to respond: developing skills', 'Prepare to respond: storing provisions'];

        for (const tableName of tableNames) {
            if (cellContent.includes(tableName)) {
                return tableName;
            }
        }

        return null;
    }
}
// Example usage
const pdfExtractor = new PdfTableExtractor('./pdfs/PAPE-2.0-English-test2.pdf');
pdfExtractor.loadPDF();