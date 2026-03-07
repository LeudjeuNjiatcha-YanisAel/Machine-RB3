const isAdmin = require('../lib/isAdmin');

const BATCH_SIZE = 20; // anti ban (20 mentions par message)

function chunkArray(array, size) {
    const chunked = [];
    for (let i = 0; i < array.length; i += size) {
        chunked.push(array.slice(i, i + size));
    }
    return chunked;
}

async function tagAll(sock, chatId, senderId, message, args) {

    if (!args.length) {
    return sock.sendMessage(chatId, {
        text: "📌 Utilisation :\n*tagall message*\n\nExemple:\n*tagall réunion dans 10 minutes*"
    }, { quoted: message });
    }
    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

    if (!isBotAdmin) {
        return sock.sendMessage(chatId, { text: "⚠️ Le bot doit être admin." });
    }

    if (!isSenderAdmin) {
        return sock.sendMessage(chatId, { text: "❌ Admin seulement." });
    }

    const groupMetadata = await sock.groupMetadata(chatId);

    const members = groupMetadata.participants.filter(p => !p.admin);

    const customMessage = args.join(" ") || "📢 Notification";

    const chunks = chunkArray(members, BATCH_SIZE);

    for (const chunk of chunks) {

        let text = `📢 ${customMessage}\n\n`;

        chunk.forEach(member => {
            text += `@${member.id.split('@')[0]}\n`;
        });

        await sock.sendMessage(chatId, {
            text,
            mentions: chunk.map(m => m.id)
        });

    }

}

async function tagAdmins(sock, chatId, senderId, message, args) {
    if (!args.length) {
    return sock.sendMessage(chatId, {
        text: "📌 Utilisation :\n*tagadmins message*\n\nExemple:\n*tagadmins réunion dans 10 minutes*"
    }, { quoted: message });
    }
    const { isSenderAdmin } = await isAdmin(sock, chatId, senderId);

    if (!isSenderAdmin) {
        return sock.sendMessage(chatId, { text: "❌ Admin seulement." });
    }

    const groupMetadata = await sock.groupMetadata(chatId);

    const admins = groupMetadata.participants.filter(p => p.admin);

    const customMessage = args.join(" ") || "📢 Admins";

    let text = `${customMessage}\n\n`;

    admins.forEach(admin => {
        text += `@${admin.id.split('@')[0]}\n`;
    });

    await sock.sendMessage(chatId, {
        text,
        mentions: admins.map(a => a.id)
    });

}

async function tagNonAdmins(sock, chatId, senderId, message, args) {
    if (!args.length) {
    return sock.sendMessage(chatId, {
        text: "📌 Utilisation :\n*tagnonadmins message*\n\nExemple:\n*tagnonadmins réunion dans 10 minutes*"
    }, { quoted: message });
}
    const { isSenderAdmin } = await isAdmin(sock, chatId, senderId);

    if (!isSenderAdmin) {
        return sock.sendMessage(chatId, { text: "❌ Admin seulement." });
    }

    const groupMetadata = await sock.groupMetadata(chatId);

    const members = groupMetadata.participants.filter(p => !p.admin);

    const customMessage = args.join(" ") || "📢 Membres";

    let text = `${customMessage}\n\n`;

    members.forEach(member => {
        text += `@${member.id.split('@')[0]}\n`;
    });

    await sock.sendMessage(chatId, {
        text,
        mentions: members.map(m => m.id)
    });

}

async function hideTag(sock, chatId, senderId, message, args) {
    if (!args.length) {
    return sock.sendMessage(chatId, {
        text: "📌 Utilisation :\n*hidetag message*\n\nExemple:\n*hidetag réunion dans 10 minutes*"
    }, { quoted: message });
    }
    const { isSenderAdmin } = await isAdmin(sock, chatId, senderId);

    if (!isSenderAdmin) {
        return sock.sendMessage(chatId, { text: "❌ Admin seulement." });
    }

    const groupMetadata = await sock.groupMetadata(chatId);

    const participants = groupMetadata.participants;

    const text = args.join(" ") || "📢 Notification";

    await sock.sendMessage(chatId, {
        text,
        mentions: participants.map(p => p.id)
    });

}

async function tagAllAudio(sock, chatId, senderId, message, args) {
    if (!args.length) {
    return sock.sendMessage(chatId, {
        text: "📌 Utilisation :\n*tagaudio message*\n\nExemple:\n*tagaudio réunion dans 10 minutes*"
    }, { quoted: message });
    }
    const { isSenderAdmin } = await isAdmin(sock, chatId, senderId);

    if (!isSenderAdmin) {
        return sock.sendMessage(chatId, { text: "❌ Admin seulement." });
    }

    const groupMetadata = await sock.groupMetadata(chatId);

    const members = groupMetadata.participants;

    const text = args.join(" ") || "Notification";

    const audioBuffer = Buffer.from(
        "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
        "base64"
    );

    await sock.sendMessage(chatId, {
        audio: audioBuffer,
        mimetype: "audio/mp4",
        ptt: true,
        mentions: members.map(m => m.id)
    });

    await sock.sendMessage(chatId, {
        text,
        mentions: members.map(m => m.id)
    });

}

module.exports = {
    tagAll,
    tagAdmins,
    tagNonAdmins,
    hideTag,
    tagAllAudio
};