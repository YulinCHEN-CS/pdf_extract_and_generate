const fs = require('fs');
const PDFParser = require('pdf2json');
const Table = require('./table.js');
const defaultLineWidth = 1;

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
        for (let i = 1, len = pdfData.Pages.length; i < len; i++) {
            console.log(`---------pdf page ${i}--------`);
            const page = pdfData.Pages[i];
            var cellsOfFills = [];
            page.Fills.forEach(fill => cellsOfFills.push(this.processFill(fill, page.Texts, page.HLines.sort((a, b) => a.y - b.y))));
            this.processPage(cellsOfFills, i);
        }
        
        console.log('Tables Information:');
        console.log(this.tables.length);
        
        const tablesData = this.tables.map(table => ({
            name: table.name,
            pageNumber: table.pageNumber,
            keys: table.keys,
            values: table.values
        }));
        fs.writeFileSync('./parsed_pdfs/tables.json', JSON.stringify(tablesData, null, 2), 'utf-8');
        console.log('Tables data has been written to tables.json file.');
    }

    processPage(cellsOfFills, pageNumber) {
        // Process each fill (rectangle) in the page
        // Check if the fill contains a table name
        
        for (const cells of cellsOfFills) {
            // console.log('Cells of fill:', cells);
            // console.log('Cells of fills length:', cells[0]);
            if (cells.length == 0) {
                continue;
            }
            const tableName = cells[0] ? this.getTableNameFromCell(cells[0]) : null;
            // console.log(cells);
            // if (cells.length == 1) {
            //     console.log(cells.length);
            //     console.log(cells[0]);
            //     // console.log(cells[0][0]);
            // }

            if (tableName) {
                    // Create a new table with the identified name
                const table = new Table(tableName, pageNumber);
                this.tables.push(table);

            } else if (cells.length == 1) {
                if (!(cells[0].includes('Key messages') || cells[0].includes('Context-speciﬁc details'))) {
                   continue;
                }
            } else {
                // Check if there are any tables in the list
                if (this.tables.length > 0) {
                    // Find the last table in the list
                    const lastTable = this.tables[this.tables.length - 1];
                    // console.log(cells);
                    // console.log('Last table:', lastTable.pageNumber);
                    // console.log('Current page:', pageNumber);
                    // Check if the last table is in the previous page
                    if (pageNumber - lastTable.pageNumber > 1){
                        continue;
                    }
                    // Merge the content of the current table with the last one
                    lastTable.addCells(cells);
                    lastTable.pageNumber = pageNumber;
                }
            }
        }
        
    }

    processFill(fill, textsInPage, hLinesInPage) {
        // console.log("----------fill-----------");
        const textsInBox = this.filterTextsInBox(textsInPage, fill);
        // for (const text of textsInBox) {
        //     console.log("text in box: ", text);
        //     if (text.R[0].T) {
        //         console.log("filtered text in box: ", text.R[0].T);
        //         console.log("result: ", this.isTextInBox(text, fill));
        //     }
        // }
        const mergedHLines = this.mergeHLinesInBox(fill, hLinesInPage);
        // console.log('Merged horizontal lines:', mergedHLines);
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
        return textsInPage.filter(text => {
            // if (text.R[0].T) {
            //     console.log("filter text in box: ", text.R[0].T);
            //     console.log("result: ", this.isTextInBox(text, fill));
            // }
            return this.isTextInBox(text, fill)
        });
            
    }

    isTextInBox(text, fill) {
        const textX = text.x;
        const textY = text.y;
        return textX >= fill.x && textX <= (fill.x + fill.w) &&
               textY >= fill.y && textY <= (fill.y + fill.h);
    }

    // Merge horizontal lines in the given fill
    mergeHLinesInBox(fill, hLinesInPage) {
        const hLinesInBox = hLinesInPage ? this.filterHLinesInBox(fill, hLinesInPage) : this.createHLinesInBox(fill);
        
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
    
    filterHLinesInBox(fill, hLinesInPage) {
        const filteredHLines = hLinesInPage.filter(hLine => hLine.y >= fill.y && hLine.y <= (fill.y + fill.h));
        this.addTopAndBottomLines(fill, filteredHLines);
        return filteredHLines;
    }
    
    createHLinesInBox(fill) {
        const hLinesInBox = [{ y: fill.y, w: defaultLineWidth}];
        this.addTopAndBottomLines(fill, hLinesInBox);
        return hLinesInBox;
    }
    
    addTopAndBottomLines(fill, hLines) {
        if (hLines.length === 0 || hLines[0].y > fill.y) {
            hLines.unshift({ y: fill.y, w: defaultLineWidth });
        }
    
        const lastLine = hLines[hLines.length - 1];
        if (lastLine && lastLine.y + lastLine.w < fill.y + fill.h) {
            hLines.push({ y: fill.y + fill.h, w: defaultLineWidth });
        }
    }

    // Split texts into cells based on merged horizontal lines
    splitIntoCells(textsInBox, mergedHLines) {
        const cells = [];

        for (let i = 0; i < mergedHLines.length - 1; i++) {
            const hLine1 = mergedHLines[i];
            const hLine2 = mergedHLines[i + 1];

            // Filter texts that are between two horizontal lines
            const regionTexts = textsInBox.filter(text => {
                // if (text.R[0].T) {
                //     console.log(this.decode(text));
                //     console.log(text.y >= hLine1.y && text.y <= hLine2.y);
                // } 
                // For lines in between, check if the text is between hLine1 and hLine2
                return text.y >= hLine1.y && text.y <= hLine2.y;
            });
            if (regionTexts.length > 0){
                cells.push(regionTexts);
            }
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
        const tableNames = ['Assess and plan', 'Mitigate risks', 'Prepare to respond', 'Prepare to respond'];

        for (const tableName of tableNames) {
            if (cellContent.includes(tableName)) {
                return cellContent;
            }
        }

        return null;
    }
}
// Example usage
const pdfExtractor = new PdfTableExtractor('./pdfs/PAPE-2.0-English.pdf');
pdfExtractor.loadPDF();