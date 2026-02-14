const moment = require('moment-timezone');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

async function githubCommand(sock, chatId, message) {
  try {
    // Récupérer le texte du message
    const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
    if (!text) return;

    const args = text.trim().split(' ');

    // Vérifier qu'il y a owner et repo
    if (args.length < 3) {
      await sock.sendMessage(chatId, { text: '❌ Usage: *github <owner> <repo>' }, { quoted: message });
      return;
    }

    const owner = args[1];
    const repo = args[2];

    // ✅ API GitHub dynamique
    const url = `https://api.github.com/repos/${owner}/${repo}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Erreur lors de la récupération du repo');
    const json = await res.json();

    let txt = `*乂  ${repo}  乂*\n\n`;
    txt += `✩  *Owner* : ${json.owner.login}\n`;
    txt += `✩  *Name* : ${json.name}\n`;
    txt += `✩  *Watchers* : ${json.watchers_count}\n`;
    txt += `✩  *Size* : ${(json.size / 1024).toFixed(2)} MB\n`;
    txt += `✩  *Last Updated* : ${moment(json.updated_at).format('DD/MM/YY - HH:mm:ss')}\n`;
    txt += `✩  *URL* : ${json.html_url}\n`;
    txt += `✩  *Forks* : ${json.forks_count}\n`;
    txt += `✩  *Stars* : ${json.stargazers_count}\n\n`;
    txt += `💥 *Dev Machine*`;

    // Image locale
    const imgPath = path.join(__dirname, '../assets/robot.jpeg');
    const imgBuffer = fs.readFileSync(imgPath);

    await sock.sendMessage(chatId, { image: imgBuffer, caption: txt }, { quoted: message });
  } catch (error) {
    console.error('❌ GitHub Command Error:', error);
    await sock.sendMessage(chatId, { text: '❌ Erreur lors de la récupération des informations.' }, { quoted: message });
  }
}

module.exports = githubCommand;
