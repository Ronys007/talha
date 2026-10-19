const Tesseract = require('tesseract.js');
const fs = require('fs');

async function testOCR(imagePath) {
    console.log(`\n--- Processing ${imagePath} ---`);
    try {
        const worker = await Tesseract.createWorker("eng", 1);
        const { data: { text } } = await worker.recognize(imagePath);
        await worker.terminate();

        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        console.log("LINES:");
        for (let i = 0; i < Math.min(25, lines.length); i++) {
            console.log(`[${i}] ${lines[i]}`);
        }
        
        let foundSupplier = "";
        for (let i = 0; i < Math.min(15, lines.length); i++) {
            const l = lines[i];
            if (l.match(/(tax|invoice|bill|date|gstin|pan|buyer|consignee|shop|mob|contact|state|code|delivery)/i)) continue;
            if (l.length > 3 && !l.match(/^\d+$/)) {
                foundSupplier = l;
                break;
            }
        }
        console.log("\n-> FOUND SUPPLIER:", foundSupplier);

        // Find items
        let inTable = false;
        const items = [];
        for (let line of lines) {
            if (line.match(/(Description|Goods|Quantity|Rate|Amount|HSN\/SAC)/i)) {
                inTable = true;
                continue;
            }
            if (inTable) {
                if (line.match(/(Total|Discount|CGST|SGST|IGST|Round|Amount Chargeable)/i)) {
                    inTable = false;
                    continue;
                }
                const parts = line.split(/\s+/);
                if (parts.length >= 4) {
                    const last = parts[parts.length - 1].replace(/,/g, '');
                    const secondLast = parts[parts.length - 2].replace(/,/g, '');
                    const thirdLast = parts[parts.length - 3].replace(/,/g, '');
                    
                    let rate = parseFloat(secondLast);
                    let qty = parseFloat(thirdLast);
                    
                    if (isNaN(rate) || isNaN(qty)) {
                        // try shift if 'PC' or 'NOS' is at end or middle
                        // Check if the last item is Amount
                        let amt = parseFloat(last);
                        if (!isNaN(amt)) {
                            console.log("Found row candidate:", line);
                        }
                    } else {
                        console.log("Found row:", line);
                    }
                }
            }
        }

    } catch (err) {
        console.error(err);
    }
}

async function run() {
    await testOCR('C:/Users/bisht/.gemini/antigravity/brain/4caf4666-ff9c-40cf-b250-47231a97bed9/.user_uploaded/media_1791111090619.jpg');
    await testOCR('C:/Users/bisht/.gemini/antigravity/brain/4caf4666-ff9c-40cf-b250-47231a97bed9/.user_uploaded/media_1791111090626.jpg');
    await testOCR('C:/Users/bisht/.gemini/antigravity/brain/4caf4666-ff9c-40cf-b250-47231a97bed9/.user_uploaded/media_1791111090855.jpg');
}
run();
