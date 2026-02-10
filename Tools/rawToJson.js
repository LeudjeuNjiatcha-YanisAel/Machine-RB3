const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const inputDocx = path.join(__dirname, './data/etudiants.docx');
const outputTxt = path.join(__dirname, './data/etudiants_raw.txt');

async function extractDocx() {
    const result = await mammoth.extractRawText({ path: inputDocx });

    const text = result.value
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .join('\n');

    fs.writeFileSync(outputTxt, text, 'utf8');

    console.log('✅ Texte extrait depuis DOCX → etudiants_raw.txt');
}

extractDocx().catch(console.error);
