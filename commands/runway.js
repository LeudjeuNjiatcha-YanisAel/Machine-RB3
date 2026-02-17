const axios = require("axios");
require("dotenv").config();

const RUNWAY_API = "https://api.dev.runwayml.com/v1";

if (!process.env.RUNWAY_API_KEY) {
    throw new Error("❌ RUNWAY_API_KEY manquante dans .env");
}

const headers = {
    Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
    "Content-Type": "application/json",
    "X-Runway-Version": "2024-11-06"
};

// ================= CREATE VIDEO =================
async function createRunwayVideo(prompt) {
    try {

        if (!prompt || typeof prompt !== "string") {
            throw new Error("Prompt invalide ou vide");
        }

        console.log("🎬 Runway prompt:", prompt);

        const res = await axios.post(
            `${RUNWAY_API}/text_to_video`,
            {
                model: "gen4.5", // ✅ modèle valide
                promptText: prompt.trim(), // ✅ nom correct
                ratio: "1280:720", // ✅ format correct
                duration: 5 // ✅ obligatoire (entre 2 et 10)
            },
            { headers }
        );

        return res.data.id;

    } catch (err) {
    console.error("GENERE ERROR:", err.response?.data || err.message);

    if (err.response?.data?.error?.includes("credits")) {
        await sock.sendMessage(chatId, {
            text: "❌ Impossible de générer la vidéo."
        }, { quoted: message });
    } else {
        await sock.sendMessage(chatId, {
            text: "❌ Tu n'as plus assez de crédits Runway pour générer une vidéo. Recharge ton compte !"
        }, { quoted: message });
    }
}

}


// ================= CHECK STATUS =================
async function checkVideoStatus(taskId) {
    const res = await axios.get(
        `${RUNWAY_API}/tasks/${taskId}`,
        { headers }
    );

    return res.data;
}

// ================= WAIT VIDEO =================
async function waitForVideo(taskId) {

    let attempts = 0;

    while (attempts < 30) {

        const data = await checkVideoStatus(taskId);

        if (data.status === "SUCCEEDED") {
            return data.output?.[0];
        }

        if (data.status === "FAILED") {
            throw new Error("❌ Video generation failed");
        }

        await new Promise(r => setTimeout(r, 4000));
        attempts++;
    }

    throw new Error("❌ Timeout video generation");
}

module.exports = {
    createRunwayVideo,
    waitForVideo
};
