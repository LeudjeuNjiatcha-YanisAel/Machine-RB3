const fs = require('fs');
const path = require('path');

const inputTxt = path.join(__dirname, './data/etudiants_raw.txt');
const outputJson = path.join(__dirname, './data/etudiants.json');

if (!fs.existsSync(inputTxt)) {
    console.error('❌ etudiants_raw.txt introuvable');
    process.exit(1);
}

const lines = fs.readFileSync(inputTxt, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('Timestamp') && !l.startsWith('Email Address'));

const students = [];

// Chaque étudiant = 7 lignes
for (let i = 0; i + 6 < lines.length; i += 7) {
    const student = {
        timestamp: lines[i],
        email_saisi: lines[i + 1],
        prenoms: lines[i + 2],
        noms: lines[i + 3],
        matricule: lines[i + 4],
        email: lines[i + 5],
        telephone: lines[i + 6]
    };

    students.push(student);
}

fs.writeFileSync(outputJson, JSON.stringify(students, null, 2), 'utf8');

console.log(`✅ Conversion réussie : ${students.length} étudiants`);
