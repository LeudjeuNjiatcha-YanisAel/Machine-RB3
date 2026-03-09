const fs = require('fs');
const path = require('path');
const { callGeminiOfficial } = require('./ai');

const SUMMARY_FILE = path.join(__dirname, '../data/summary.json');

let config = {};
let buffers = {};

if (fs.existsSync(SUMMARY_FILE)) {
    config = JSON.parse(fs.readFileSync(SUMMARY_FILE));
}

function saveConfig(){
    fs.writeFileSync(SUMMARY_FILE, JSON.stringify(config,null,2));
}

async function trackMessage(chatId, sender, text){

    if(!text) return;

    if(!buffers[chatId]){
        buffers[chatId] = [];
    }

    buffers[chatId].push({
        sender,
        text: text.slice(0,300),
        time: Date.now()
    });

    if(buffers[chatId].length > 600){
        buffers[chatId].shift();
    }
}

async function handleSummary(sock, message, chatId, senderId, userMessage){

    const args = userMessage.split(/\s+/);

    if(args[1] === "on"){

        config[chatId] = true;
        saveConfig();

        await sock.sendMessage(chatId,{text:"✅ Resume activé pour ce groupe"});
        return;
    }

    if(args[1] === "off"){

        config[chatId] = false;
        saveConfig();

        await sock.sendMessage(chatId,{text:"❌ Resume désactivé pour ce groupe"});
        return;
    }

    if(!config[chatId]){
        await sock.sendMessage(chatId,{
            text:"⚠️ Active d'abord avec *summary on"
        });
        return;
    }

    let messages = buffers[chatId] || [];

    if(args[1] === "today"){

        const today = new Date().setHours(0,0,0,0);

        messages = messages.filter(m => m.time >= today);

    }else{

        const count = parseInt(args[1]) || 20;

        messages = messages.slice(-count);
    }

    if(messages.length === 0){

        await sock.sendMessage(chatId,{
            text:"❌ Aucun message trouvé"
        });

        return;
    }

    const users = {};

    for(const msg of messages){

        if(!users[msg.sender]){
            users[msg.sender] = [];
        }

        users[msg.sender].push(msg.text);
    }

    let prompt = `Résumé des discussions WhatsApp.\n\n`;

    for(const user in users){

        const username = user.split('@')[0];

        prompt += `Utilisateur @${username} :\n`;
        prompt += users[user].join("\n");
        prompt += "\n\n";
    }

    prompt += `
Fais un résumé clair et court pour chaque utilisateur.
Format :

@user :
résumé de ses messages
`;

    const result = await callGeminiOfficial(prompt);

    await sock.sendMessage(chatId,{
        text:` *Résumé des discussions*\n\n${result}`,
        mentions: Object.keys(users)
    });
}

module.exports = {
    trackMessage,
    handleSummary
};