const { findStudentByPhone } = require('../Database.js');

const MY_PHONE = '682441127';

function normalizePhoneFromText(text) {
    if (!text) return null;

    // Supprimer tout sauf chiffres
    let phone = text.replace(/\D/g, '');

    // Enlever indicatif Cameroun
    if (phone.startsWith('237')) {
        phone = phone.slice(3);
    }

    // Garder 9 chiffres
    if (phone.length > 9) {
        phone = phone.slice(-9);
    }

    return phone.length === 9 ? phone : null;
}

async function infoCommand(sock, chatId, message) {
    try {
        const text =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            '';

        // Exemple: "*info 699123456"
        const parts = text.trim().split(/\s+/);

        if (parts.length < 2) {
            return await sock.sendMessage(chatId, {
                text: '❌ Utilisation : *info 699123456*'
            });
        }

        const phone = normalizePhoneFromText(parts[1]);

        console.log('[INFO-CMD]');
        console.log('Numéro fourni:', parts[1]);
        console.log('Numéro normalisé:', phone);

        if (!phone) {
            return await sock.sendMessage(chatId, {
                text: '❌ Numéro invalide. Exemple : *info 699123456*'
            });
        }

        if (phone === MY_PHONE) {
            return await sock.sendMessage(chatId, {
                text: '🚫 Impossible de récupérer les informations de Machine.'
            });
        }

        const student = findStudentByPhone(phone);

        if (!student || (Array.isArray(student) && student.length === 0)) {
            return await sock.sendMessage(chatId, {
                text: `❌ Aucune information trouvée pour le numéro *${phone}*`
            });
        }

        const s = Array.isArray(student) ? student[0] : student;

        const reply = `
╔═🎓*INFORMATIONS ÉTUDIANT*═╗
👤 *Noms* : *${s.nom || '—'}*
👤 *Prénoms* : *${s.prenom || '—'}*
🆔 *Matricule* : *${s.matricule || '—'}*
📧 *Email* : *${s.email || '—'}*
📞 *Téléphone* : ${s["Numero De Telephone"] || phone}
╚═══════════════════╝
`;

        await sock.sendMessage(chatId, { text: reply });

    } catch (err) {
        console.error('[INFO-CMD ERROR]', err);
        await sock.sendMessage(chatId, {
            text: '❌ Erreur lors de la récupération des informations.'
        });
    }
}

module.exports = {
    infoCommand
};
