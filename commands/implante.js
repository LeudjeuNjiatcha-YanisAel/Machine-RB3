const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { callGeminiOfficial, callMetaAI } = require("./ai");
const { asyncLocalStorage } = require('../lib/context');

let USERS_MAP = {};
let REL_MAP = {};
let STATE_MAP = {};

function getPaths() {
    const botNumber = asyncLocalStorage.getStore() || 'global';
    const folder = botNumber === 'global' ? path.join(__dirname, "../data") : path.join(__dirname, `../data/${botNumber}`);
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }
    return {
        USERS_PATH: path.join(folder, "users_db.json"),
        REL_PATH: path.join(folder, "relations.json"),
        STATE_PATH: path.join(folder, "implant_state.json")
    };
}

function loadForBot(botNumber) {
    const { USERS_PATH, REL_PATH, STATE_PATH } = getPaths();
    
    if (fs.existsSync(USERS_PATH)) {
        try { USERS_MAP[botNumber] = JSON.parse(fs.readFileSync(USERS_PATH)); } catch { USERS_MAP[botNumber] = {}; }
    } else {
        USERS_MAP[botNumber] = {};
    }

    if (fs.existsSync(REL_PATH)) {
        try { REL_MAP[botNumber] = JSON.parse(fs.readFileSync(REL_PATH)); } catch { REL_MAP[botNumber] = {}; }
    } else {
        REL_MAP[botNumber] = {};
    }

    if (fs.existsSync(STATE_PATH)) {
        try { STATE_MAP[botNumber] = JSON.parse(fs.readFileSync(STATE_PATH)); } catch { STATE_MAP[botNumber] = { enabled: false }; }
    } else {
        STATE_MAP[botNumber] = { enabled: false };
    }
}

function saveForBot(botNumber) {
    const { USERS_PATH, REL_PATH, STATE_PATH } = getPaths();
    fs.writeFileSync(USERS_PATH, JSON.stringify(USERS_MAP[botNumber] || {}, null, 2));
    fs.writeFileSync(REL_PATH, JSON.stringify(REL_MAP[botNumber] || {}, null, 2));
    fs.writeFileSync(STATE_PATH, JSON.stringify(STATE_MAP[botNumber] || { enabled: false }, null, 2));
}

function getBotData() {
    const botNumber = asyncLocalStorage.getStore() || 'global';
    if (!USERS_MAP[botNumber]) {
        loadForBot(botNumber);
    }
    return {
        botNumber,
        USERS: USERS_MAP[botNumber],
        REL: REL_MAP[botNumber],
        STATE: STATE_MAP[botNumber]
    };
}

function save() {
    const { botNumber } = getBotData();
    saveForBot(botNumber);
}

/* ================= USER ================= */

function getUser(jid, name = "User") {
    const { USERS } = getBotData();
    if (!USERS[jid]) {
        USERS[jid] = {
            name,
            messages: [],
            images: [],
            manualNotes: [],
            profilePic: null,
            stats: {
                messages: 0,
                hesitation: 0
            }
        };
    }
    return USERS[jid];
}

/* ================= MENSONGE (indice) ================= */

function detectLieSignals(user, text) {
    const words = ["peut", "je crois", "euh", "peut-être", "jsp", "mesquin", "hésite", "pas sûr", "probablement", "je pense", "je sais pas", "peut être", "je dirais", "à mon avis"];

    words.forEach(w => {
        if (text.toLowerCase().includes(w))
            user.stats.hesitation++;
    });
}

/* ================= RELATIONS ================= */

function updateRelation(group, a, b, text) {
    const { REL } = getBotData();
    if (!REL[group]) REL[group] = {};

    const key = [a, b].sort().join("-");

    if (!REL[group][key])
        REL[group][key] = { interactions: 0, romanticScore: 0 };

    REL[group][key].interactions++;

    if (/❤️|🥰|😘|bb|mon coeur/i.test(text))
        REL[group][key].romanticScore += 2;
}

/* ================= PHOTO PROFIL ================= */

async function saveProfile(sock, jid, user) {
    try {
        const url = await sock.profilePictureUrl(jid, 'image');
        const res = await axios.get(url, { responseType: "arraybuffer" });

        const botNumber = asyncLocalStorage.getStore() || 'global';
        const folder = `./data/${botNumber}/media/${jid}`;
        fs.mkdirSync(folder, { recursive: true });

        const file = `${folder}/profile.jpg`;
        fs.writeFileSync(file, res.data);

        user.profilePic = file;
    } catch {}
}

/* ================= ANALYSE IA ================= */

async function buildFullAnalysis(user) {
    const history = user.messages.slice(-80).join("\n");
    const notes = user.manualNotes.join("\n");

    const prompt = `
Analyse psychologique.

Répond UNIQUEMENT en JSON valide :

{
 "personnalite":"",
 "comportement":"",
 "psychologie":"",
 "points_forts":"",
 "points_faibles":"",
 "aime":"",
 "evite":""
}

Style camerounais direct, max 3 phrases par champ.

Messages:
${history}

Notes:
${notes}
`;

    try {
        const res = await callGeminiOfficial(prompt);
        return JSON.parse(res);
    } catch {
        const res = await callMetaAI(prompt);
        return JSON.parse(res);
    }
}

function getRelationsText(group, target) {
    const { REL } = getBotData();
    if (!REL[group]) return "";

    let lovers = [];
    let besties = [];

    for (const key in REL[group]) {
        const rel = REL[group][key];
        const [a, b] = key.split("-");

        if (a !== target && b !== target) continue;

        const other = a === target ? b : a;

        if (rel.romanticScore >= 6)
            lovers.push(other);
        else if (rel.interactions >= 8)
            besties.push(other);
    }

    let txt = "";

    if (lovers.length)
        txt += "❤️ Relation amoureuse probable avec : @" + lovers.join(", @") + "\n";

    if (besties.length)
        txt += "🤝 Forte complicité avec : @" + besties.join(", @");

    return txt;
}

/* ================= EXPORT PRINCIPAL ================= */

async function implante(sock, msg, text) {
    const { botNumber, USERS, REL, STATE } = getBotData();
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || jid;
    const name = msg.pushName || "User";

    /* -------- ACTIVER -------- */

    if (text.startsWith("*implante")) {
        STATE.enabled = text.includes("on");
        save();

        return sock.sendMessage(jid, {
            text: STATE.enabled ?
                "✅ Implantation de l'agent Activée!" :
                "⛔ Implantation Désactivé"
        });
    }

    /* -------- AJOUT NOTE -------- */

    if (text.startsWith("*note")) {
        const target = msg.message.extendedTextMessage?.contextInfo?.participant;
        if (!target) return;

        const note = text.replace("*note", "").trim();

        const user = getUser(target);
        user.manualNotes.push(note);
        save();

        return sock.sendMessage(jid, {
            text: "✅ Renseignement ajoutée."
        });
    }

    /* -------- DEVOIL -------- */

    if (text.startsWith("*devoil")) {
        const target = msg.message.extendedTextMessage?.contextInfo?.participant;
        if (!target) return;

        const user = USERS[target];
        if (!user)
            return sock.sendMessage(jid, { text: "Pas assez de données." });

        await sock.sendMessage(jid, {
            text: "🕶 A partir des informations recueillies sur vous..."
        });

        const analysis = await buildFullAnalysis(user);

        const sections = [
            ["🧠 Personnalité", analysis.personnalite],
            ["🎭 Comportement", analysis.comportement],
            ["🔎 Psychologie", analysis.psychologie],
            ["💪 Points forts", analysis.points_forts],
            ["⚠️ Points faibles", analysis.points_faibles],
            ["❤️ Ce que vous aimez", analysis.aime],
            ["🚫 Ce que vous évitez", analysis.evite],
        ];

        for (const [title, content] of sections) {
            await new Promise(r => setTimeout(r, 1800));
            await sock.sendMessage(jid, {
                text: `${title}\n${content}`
            });
        }

        /* ===== RELATIONS ===== */

        const relText = getRelationsText(jid, target);

        if (relText) {
            await new Promise(r => setTimeout(r, 2000));
            await sock.sendMessage(jid, {
                text: `💞 Analyse sociale\n${relText}`,
                mentions: relText.match(/@\d+/g)?.map(x => x.slice(1) + "@s.whatsapp.net")
            });
        }

        return sock.sendMessage(jid, {
            text: "⚠️ Analyse basée uniquement sur vos comportements observés."
        });
    }

    /* -------- CAPTURE AUTO -------- */

    if (!STATE.enabled) return;

    const user = getUser(sender, name);

    await saveProfile(sock, sender, user);

    if (text) {
        user.messages.push(text);
        user.stats.messages++;

        detectLieSignals(user, text);

        const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;

        if (jid.endsWith("@g.us") && quoted)
            updateRelation(jid, sender, quoted, text);
    }

    save();
}

module.exports = implante;