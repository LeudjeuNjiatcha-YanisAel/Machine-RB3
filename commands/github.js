const moment = require('moment-timezone');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const GITHUB_OWNER = 'LeudjeuNjiatcha-YanisAel';

async function githubCommand(sock, chatId, message) {
  try {
    // 🔹 Récupérer le texte du message
    const text =
      message.message?.conversation ||
      message.message?.extendedTextMessage?.text;

    if (!text) return;

    const args = text.trim().split(/\s+/);

    // 🔹 Vérification
    if (args.length < 2) {
      await sock.sendMessage(
        chatId,
        { text: '❌ Usage: *github <repo>' },
        { quoted: message }
      );
      return;
    }

    const repo = args[1];

    // 🔹 URL API GitHub dynamique
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${repo}`;
    const res = await fetch(url);

    if (!res.ok) {
      await sock.sendMessage(
        chatId,
        { text: `❌ Repo "${repo}" introuvable.` },
        { quoted: message }
      );
      return;
    }

    const json = await res.json();

    // 🔹 Texte personnalisé selon le repo
    let txt = `*乂  ${json.name.toUpperCase()}  乂*\n\n`;
    txt += `✩  *Owner* : ${json.owner.login}\n`;
    txt += `✩  *Stars* : ${json.stargazers_count}\n`;
    txt += `✩  *Watchers* : ${json.watchers_count}\n`;
    txt += `✩  *Forks* : ${json.forks_count}\n`;
    txt += `✩  *Size* : ${(json.size / 1024).toFixed(2)} MB\n`;
    txt += `✩  *Updated* : ${moment(json.updated_at).format('DD/MM/YY - HH:mm:ss')}\n`;
    txt += `✩  *URL* : ${json.html_url}\n\n`;
    txt += `💥 *Dev Machine@Mr.robot*`;

    // 🔹 Image locale
    const imgPath = path.join(__dirname, '../assets/robot.jpeg');
    const imgBuffer = fs.readFileSync(imgPath);

    await sock.sendMessage(
      chatId,
      { image: imgBuffer, caption: txt },
      { quoted: message }
    );

  } catch (error) {
    console.error('❌ GitHub Error:', error);
    await sock.sendMessage(
      chatId,
      { text: '❌ Erreur lors de la récupération des informations.' },
      { quoted: message }
    );
  }
}

module.exports = githubCommand;
