const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../data/etudiants.txt');
const outputFile = path.join(__dirname, '../data/etudiants.json');

const content = fs.readFileSync(inputFile, 'utf8');
const lines = content.split('\n');

const students = [];

for (const line of lines) {
    const clean = line.replace(/\s+/g, ' ').trim();

    // Détection numéro téléphone
    const phones = clean.match(/(\+237)?6\d{8}/g);
    if (!phones) continue;

    // Email
    const emailMatch = clean.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/);

    // Matricule
    const matriculeMatch = clean.match(/\b\d{2}[A-Z]\d{4}\b|\b\d{2}[A-Z]\d{3}\b/);

    // Prénoms / noms (approximation robuste)
    const parts = clean.split(' ');
    const prenom = parts.slice(1, 3).join(' ');
    const nom = parts.slice(3, 5).join(' ');

    students.push({
        prenom,
        nom,
        matricule: matriculeMatch ? matriculeMatch[0] : "N/A",
        email: emailMatch ? emailMatch[0] : "N/A",
        telephones: phones.map(p => p.replace('+237', ''))
    });
}

fs.writeFileSync(outputFile, JSON.stringify(students, null, 2));
console.log('✅ Conversion terminée : etudiants.json créé');
