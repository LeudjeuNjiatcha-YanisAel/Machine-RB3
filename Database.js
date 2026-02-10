const etudiants = require('./data/etudiants.json');

// Nettoyage strict : retourne null si ce n'est pas un vrai numéro
function normalizePhone(value) {
    if (!value) return null;

    const digits = value.toString().replace(/\D/g, '');

    // Un numéro camerounais valide = 9 chiffres
    if (digits.length < 9) return null;

    return digits.slice(-9);
}

function findStudentByPhone(phoneFromWhatsapp) {
    const target = normalizePhone(phoneFromWhatsapp);

    return etudiants.find(e => {
        const numeroPrincipal = normalizePhone(e["telephone"]);

        return (
            numeroPrincipal === target 
        );
    });
}

module.exports = {
    findStudentByPhone
};
