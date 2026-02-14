const moment = require('moment-timezone');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

async function githubCommand(sock, chatId, message,args) {
  try {
    const body = message.message?.conversation ||
                 message.message?.extendedTextMessage?.text ||
                 '';

    const args = body.trim().split(/\s+/);

    if (args.length < 2) {
      return await sock.sendMessage(chatId, {
        text: '❌ Utilisation : *github nom-du-repo\n'
      }, { quoted: message });
    }

    // Machine-RB3

    const res = await fetch(
      `https://api.github.com/repos/LeudjeuNjiatcha-YanisAel/Bot-Telegram`
    );

    if (!res.ok) throw new Error('Repo introuvable');

    const json = await res.json();

    let txt = `*乂  FUCKSOCIETY  乂*\n\n`;
    txt += `✩  *Name* : ${json.name}\n`;
    txt += `✩  *Watchers* : ${json.watchers_count}\n`;
    txt += `✩  *Stars* : ${json.stargazers_count}\n`;
    txt += `✩  *Forks* : ${json.forks_count}\n`;
    txt += `✩  *Language* : ${json.language}\n`;
    txt += `✩  *Size* : ${(json.size / 1024).toFixed(2)} MB\n`;
    txt += `✩  *Last Updated* : ${moment(json.updated_at).format('DD/MM/YY - HH:mm:ss')}\n`;
    txt += `✩  *URL* : ${json.html_url}\n`;
    txt += `💥 *Dev Machine@Mr.robot*`;

    const imgPath = path.join(__dirname, '../assets/robot.jpeg');
    const imgBuffer = fs.readFileSync(imgPath);

    await sock.sendMessage(chatId, { image: imgBuffer, caption: txt }, { quoted: message });

  } catch (error) {
    await sock.sendMessage(chatId, {
      text: '❌ Repo introuvable ou erreur API GitHub.'
    }, { quoted: message });
  }
}

module.exports = githubCommand;
