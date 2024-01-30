const PDFParser = require("pdf2json");

/**
 * Extract the info from the pdf file
 * @param {string} pdf_src_path: the path of the pdf file to be extracted
 * @returns {object} info: the info extracted from the pdf file
*/

async function extract_info(pdf_src_path) {

    // use promise to wait for the result and return
    const info = await new Promise((resolve, reject) => {
        const pdfParser = new PDFParser();
        console.log('Extracting text from PDF...');
        pdfParser.on("pdfParser_dataError", errData => {
            console.error(errData.parserError);
            reject(errData.parserError);
        });

        pdfParser.on("pdfParser_dataReady", pdfData => {
        
            const textContent = extractTextContent(pdfData);

            const info = processTextContent(textContent);
            resolve(info);
        });    

        pdfParser.loadPDF(pdf_src_path, { encoding: "utf8" });
        
        /**
         * Helper function to extract the text content from the pdf data
         * @param {object} pdfData: conatins pages,align,version,etc.
         * @returns {String} textContent: only keep the text content
         */
        function extractTextContent(pdfData) {
            const textContent = [];

            pdfData.Pages.forEach(page => {
                const texts = page.Texts;

                texts.forEach(text => {
                    // console.log(text);
                    const content = text.R[0].T; // get the text content
                    textContent.push(content);
                });
            });

            return textContent;
        }

        /**
         * Replace the special characters and extract required info
         * @param {String} textContent 
         * @returns {object} info: Json object
         */
        function processTextContent(textContent) {
            const decodedArray = textContent.map(item => decodeURIComponent(item.replace(/\+/g, ' ')));
            // Construct json object
            const info = {
                disasterType: extractValue(decodedArray, "Disaster Type"),
                date: extractValue(decodedArray, "Date"),
                location: extractValue(decodedArray, "Location")
            };

            return info;
        }

        // map the valu according to the key using regex
        function extractValue(decodedArray, key) {
            const regex = new RegExp(`${key}\\s*:\\s*([^,]+)`);
            for (const item of decodedArray) {
                const match = item.match(regex);
                if (match) {
                    return match[1].trim();
                }
            }
            return null;
        }    
        
    });
    return info;
}

// async function main() {
//     const info = await extract_info('./test_pdf/test4.pdf');
//     console.log('Extracting tables from PDF...', info);
// }

// main();


module.exports = {
    extract_info
};