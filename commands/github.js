const moment = require('moment-timezone');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');


async function githubCommand(sock, chatId, message) {
  try {
    const repos = args[2];
    const res = await fetch('https://api.github.com/repos/LeudjeuNjiatcha-YanisAel/${repos}');
    if (!res.ok) throw new Error('Error fetching repository data');
    const json = await res.json();

    let txt = `*乂  FUCKSOCIETY  乂*\n\n`;
    txt += `✩  *Name* : ${json.name}\n`;
    txt += `✩  *Watchers* : ${json.watchers_count}\n`;
    txt += `✩  *Size* : ${(json.size / 1024).toFixed(2)} MB\n`;
    txt += `✩  *Last Updated* : ${moment(json.updated_at).format('DD/MM/YY - HH:mm:ss')}\n`;
    txt += `✩  *URL* : ${json.html_url}\n`;
    txt += `✩  *Forks* : ${json.forks_count}\n`;
    txt += `💥 *Dev Machine@Mr.robot*`;

    // Use the local asset image
    const imgPath = path.join(__dirname, '../assets/robot.jpeg');
    const imgBuffer = fs.readFileSync(imgPath);

    await sock.sendMessage(chatId, { image: imgBuffer, caption: txt }, { quoted: message });
  } catch (error) {
    await sock.sendMessage(chatId, { text: '❌ Erreur Lors De La Recuperation Des Informations.' }, { quoted: message });
  }
}

module.exports = githubCommand; 