// main.js

const infoExtractor = require("./info_extractor.js");
const tableExtractor = require("./table_extractor.js");
const json2pdf = require("./json2pdf.js");
const fs = require('fs');
const pdfPath = './pdfs/PAPE-2.0-English.pdf';
const jsonTextOutputPath = './jsons_generated/parsed.json';


main();

async function main() {
    const info_json = await infoExtractor.extract_info(pdfPath);
    const table_json = await tableExtractor.extract_tables(pdfPath);
    const result = {
        info: info_json,
        tables: table_json
    };
    console.log('Extracted from PDF:', result);
    json2pdf.jsonToPdf(result, './pdfs_generated/parsed.pdf');
    // writeToJsonFile(result, jsonTextOutputPath);
};

// Write the result to a JSON file
function writeToJsonFile(result, path) {
    fs.writeFile(path, JSON.stringify(result, null, 2), err => {
        if (err) {
            console.error('Error writing JSON file:', err);
        } else {
            console.log('Text content has been successfully written to '+ jsonTextOutputPath);
        }
    });
}