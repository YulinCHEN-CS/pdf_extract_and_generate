const fs = require('fs');
const PDFParser = require('pdf2json');
const { text } = require('pdfkit');

// Main function to extract text from a PDF
function main() {
    const pdfParser = new PDFParser();

    console.log('Extracting text from PDF...');
    pdfParser.loadPDF('./pdfs/PAPE-2.0-English-test.pdf');

    pdfParser.on("pdfParser_dataError", errData => {
        console.error(errData.parserError);
    });

    pdfParser.on("pdfParser_dataReady", pdfData => {
        // console.log('---------pdf overview--------');
        // console.log(pdfData);
        // console.log('-----------------------------');
        fillsInfo = [];
        // Process each page in the PDF
        for (let i = 0, len = pdfData.Pages.length; i < len; i++) {
            console.log(`---------pdf page ${i}--------`);
            const page = pdfData.Pages[i];
            
            // Process each fill (rectangle) in the page
            page.Fills.forEach(fill => processFill(fill, page.Texts, page.HLines.sort((a, b) => a.y - b.y)));
        }
    });
}

// Process a fill (rectangle) in the page
function processFill(fill, textsInPage, hLinesInPage) {
    // console.log(`Boxset: X: ${fill.x}, Y: ${fill.y}, Width: ${fill.w}, Height: ${fill.h}, color: ${fill.clr}`);

    // Filter texts that are inside the current fill
    const textsInBox = textsInPage.filter(text => isTextInBox(text, fill));

    // console.log('Texts in box:');
    // console.log(textsInBox.map(text => ({
    //     text: decodeURIComponent(text.R[0].T),
    //     textMatrix: text.Tm // Text Matrix
    // })));

    // Merge horizontal lines with the same y value
    const mergedHLines = mergeHLinesInBox(fill, hLinesInPage);

    // console.log('Merged Horizontal Lines in box:');
    // console.log(mergedHLines);

    // Split texts into cells based on horizontal lines
    const cells = splitIntoCells(textsInBox, mergedHLines);

    console.log('Cells:');
    cells.forEach((cell, i) => {
        // console.log(`-----------${i}-------------`);
        cells[i] = processCell(cell);
    });

    console.log(cells.length);
    console.log(cells);
    fillsInfo.push({
        x: fill.x,
        y: fill.y,
        width: fill.w,
        height: fill.h,
        cells: cells,
    });
}

// Check if a text is inside a given fill (rectangle)
function isTextInBox(text, fill) {
    const textX = text.x;
    const textY = text.y;
    return textX >= fill.x && textX <= (fill.x + fill.w) &&
           textY >= fill.y && textY <= (fill.y + fill.h);
}

// Merge horizontal lines in the given fill
function mergeHLinesInBox(fill, hLinesInPage) {

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
function splitIntoCells(textsInBox, mergedHLines) {
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

function decode(text) {
    text.R[0].T = decodeURIComponent(text.R[0].T).replace('\!', 'fi')
    return text;
}

function processCell(cell) {
    const result = [];

    let currentString = '';

    for (const text of cell) { 
        decodedText = decode(text);
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

// Call the main function to start the program
main();
