const { callGPT5Nano } = require('./ai');

async function handleCodeFix(sock, message, chatId) {

    const quoted =
    message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted) {

        await sock.sendMessage(chatId,{
            text:"❌ Reply au code à corriger."
        });

        return;
    }

    const code =
    quoted?.conversation ||
    quoted?.extendedTextMessage?.text ||
    "";

    const cleanCode = code.replace(/```/g,'');

    const prompt = `
Corrige ce code.

Explique brièvement l'erreur et donne la version corrigée.

Code :

${cleanCode}
`;

    const result = await callGPT5Nano(prompt);

    await sock.sendMessage(chatId,{
        text:`🛠 CodeFix\n\n${result}`
    });

}

module.exports = {
    handleCodeFix
};