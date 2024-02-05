const fs = require('fs');
const PDFParser = require('pdf2json');
const Table = require('./table.js');
const defaultLineWidth = 1;

module.exports = class PdfTableExtractor {

    /**
     * Constructor for PdfTableExtractor class.
     * @param {string} filePath - Path to the PDF file.
     * @param {string} targetJson - Path to the target JSON file.
     * @param {Array} tablenames - Array of table names.
     * @param {Array} disasterTypes - Array of disaster types.
     */
    constructor(filePath, targetJson, tablenames, disasterTypes) {
        this.filePath = filePath;
        this.pdfParser = new PDFParser();
        this.disasterTables = {};
        this.tables = [];
        this.tableNames = tablenames;
        this.disasterTypes = disasterTypes;
        this.targetJson = targetJson;
    }

    /**
     * Load PDF file and set up event listeners for parsing.
     */
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

    /**
     * Process the parsed PDF data.
     * @param {Object} pdfData - Parsed PDF data.
     */
    processPDF(pdfData) {
        var tableType = 'No disater type';
        for (let i = 0, len = pdfData.Pages.length; i < len; i++) {
            console.log(`---------pdf page ${i}--------`);
            const page = pdfData.Pages[i];
            console.log("page info");
            
            const strokeTextsArray = page.Texts.filter(text => text.R[0].S == 2);
            const strokeTexts = strokeTextsArray.map(text => {
                const decodedText = this.decode(text).R[0].T
                return decodedText.trim() == '' ? '' : decodedText;
            }).join('');
            console.log('Stroke texts:', strokeTexts);
            for (const type of this.disasterTypes) {
                if (strokeTexts.includes(type)) {
                    console.log('Disaster type:', type);
                    if (tableType !== type) {
                        const disasterObject = this.createDisasterObject(this.tables);
                        if (Object.keys(disasterObject).length > 0) {
                            this.disasterTables[tableType] = disasterObject;
                        }
                        this.tables = [];
                        tableType = type;
                    }
                }
            }
            var cellsOfFills = [];
            page.Fills.forEach(fill => cellsOfFills.push(this.processFill(fill, page.Texts, page.HLines.sort((a, b) => a.y - b.y))));
            this.processPage(cellsOfFills, i);

        }
        const disasterObject = this.createDisasterObject(this.tables);
        if (Object.keys(disasterObject).length > 0) {
            this.disasterTables[tableType] = disasterObject;
        }
        this.tables = [];
    
        fs.writeFileSync(this.targetJson, JSON.stringify(this.disasterTables, null, 2), 'utf-8');
        console.log('Tables data has been written to tables.json file.');
    }

    /**
     * Create a disaster object from the collected tables.
     * @param {Array} tables - Array of tables.
     * @returns {Object} - Disaster object.
     */
    createDisasterObject(tables) {
        const filteredTables = tables.filter(table => table.keys.length > 0);
        return filteredTables.reduce((acc, obj) => {
            const { name, ...rest } = obj;
            acc[name] = rest;
            return acc;
        }, {});
    }

    /**
     * Process each page and extract tables.
     * @param {Array} cellsOfFills - Array of cells extracted from fills.
     * @param {number} pageNumber - Page number.
     */
    processPage(cellsOfFills, pageNumber) {
        // Process each fill (rectangle) in the page
        // Check if the fill contains a table name
        
        for (const cells of cellsOfFills) {
            
            if (cells.length == 0) {
                continue;
            }
            const tableName = cells[0] ? this.getTableNameFromCell(cells[0]) : null;
            console.log("cells:", cells);

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

    /**
     * Process the fill (rectangle) and extract relevant information.
     * @param {Object} fill - Fill object.
     * @param {Array} textsInPage - Array of text objects on the page.
     * @param {Array} hLinesInPage - Array of horizontal lines on the page.
     * @returns {Array} - Processed cells.
     */
    processFill(fill, textsInPage, hLinesInPage) {
        const textsInBox = this.filterTextsInBox(textsInPage, fill);
        const mergedHLines = this.mergeHLinesInBox(fill, hLinesInPage);
        // console.log('Merged horizontal lines:', mergedHLines);
        var cells = this.splitIntoCells(textsInBox, mergedHLines);
        // console.log('Cells before process:', cells);
        cells = this.processCells(cells);
        // console.log('Cells:', cells);
        return cells;
    }

    /**
     * Process individual cells and handle special characters.
     * @param {Array} cells - Array of cells.
     * @returns {Array} - Processed cells.
     */
    processCells(cells) {
        const processed_cells = [];
        for (let i = 0; i < cells.length; i++) {
            processed_cells.push(this.processCell(cells[i]));
        }
        return processed_cells;
    }

    /**
     * Process individual cell content and handle special characters.
     * @param {Array} cell - Array representing a cell.
     * @returns {Array} - Processed cell content.
     */
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

    /**
     * Decode special characters in text.
     * @param {Object} text - Text object.
     * @returns {Object} - Decoded text object.
     */
    decode(text) {
        // console.log(text.R[0].T);
        text.R[0].T = decodeURIComponent(text.R[0].T).replace('!', 'fi').replace("\"", 'fl');
        // console.log(text.R[0].T);
        return text;
    }

    /**
     * Filter texts within a specific rectangle.
     * @param {Array} textsInPage - Array of text objects on the page.
     * @param {Object} fill - Fill object.
     * @returns {Array} - Filtered texts.
     */
    filterTextsInBox(textsInPage, fill) {
        return textsInPage.filter(text => {
            // if (text.R[0].T) {
            //     console.log("filter text in box: ", text.R[0].T);
            //     console.log("result: ", this.isTextInBox(text, fill));
            // }
            return this.isTextInBox(text, fill)
        });
            
    }

    /**
     * Check if a text is within a specific rectangle.
     * @param {Object} text - Text object.
     * @param {Object} fill - Fill object.
     * @returns {boolean} - True if text is in the box, false otherwise.
     */
    isTextInBox(text, fill) {
        const textX = text.x;
        const textY = text.y;
        return textX >= fill.x && textX <= (fill.x + fill.w) &&
               textY >= fill.y && textY <= (fill.y + fill.h);
    }

    /**
     * Merge horizontal lines within a specific rectangle.
     * @param {Object} fill - Fill object.
     * @param {Array} hLinesInPage - Array of horizontal lines on the page.
     * @returns {Array} - Merged horizontal lines.
     */
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
    
    /**
     * Filter horizontal lines within a specific rectangle.
     * @param {Object} fill - Fill object.
     * @param {Array} hLinesInPage - Array of horizontal lines on the page.
     * @returns {Array} - Filtered horizontal lines.
     */
    filterHLinesInBox(fill, hLinesInPage) {
        const filteredHLines = hLinesInPage.filter(hLine => hLine.y >= fill.y && hLine.y <= (fill.y + fill.h));
        this.addTopAndBottomLines(fill, filteredHLines);
        return filteredHLines;
    }
    
    /**
     * Create horizontal lines within a specific rectangle.
     * @param {Object} fill - Fill object.
     * @returns {Array} - Created horizontal lines.
     */
    createHLinesInBox(fill) {
        const hLinesInBox = [{ y: fill.y, w: defaultLineWidth}];
        this.addTopAndBottomLines(fill, hLinesInBox);
        return hLinesInBox;
    }
    
    /**
     * Add top and bottom lines to an array of horizontal lines.
     * @param {Object} fill - Fill object.
     * @param {Array} hLines - Array of horizontal lines.
     */
    addTopAndBottomLines(fill, hLines) {
        if (hLines.length === 0 || hLines[0].y > fill.y) {
            hLines.unshift({ y: fill.y, w: defaultLineWidth });
        }
    
        const lastLine = hLines[hLines.length - 1];
        if (lastLine && lastLine.y + lastLine.w < fill.y + fill.h) {
            hLines.push({ y: fill.y + fill.h, w: defaultLineWidth });
        }
    }

    /**
     * Split texts into cells based on merged horizontal lines.
     * @param {Array} textsInBox - Array of texts within a rectangle.
     * @param {Array} mergedHLines - Array of merged horizontal lines.
     * @returns {Array} - Array of cells.
     */
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

    /**
     * Get table name from the first cell in a set of cells.
     * @param {Array} cell - Array representing a cell.
     * @returns {string|null} - Table name if found, otherwise null.
     */
    getTableNameFromCell(cell) {
        const cellContent = cell[0];
        if (!cellContent) {
            return null;
        }

        for (const tableName of this.tableNames) {
            if (cellContent.includes(tableName)) {
                return cellContent;
            }
        }

        return null;
    }
}