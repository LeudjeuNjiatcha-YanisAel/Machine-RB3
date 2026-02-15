const axios = require("axios");
require("dotenv").config();

const RUNWAY_API = "https://api.runwayml.com/v1";

const headers = {
    Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
    "Content-Type": "application/json"
};

// ================= CREATE VIDEO =================
async function createRunwayVideo(prompt) {
    try {

        const res = await axios.post(
            `${RUNWAY_API}/image_to_video`,
            {
                promptText: prompt,
                model: "gen3a_turbo"
            },
            { headers }
        );

        return res.data.id; // task id

    } catch (err) {
        console.error("Runway create error:", err.response?.data || err.message);
        throw err;
    }
}

// ================= CHECK STATUS =================
async function checkVideoStatus(taskId) {
    try {
        const res = await axios.get(
            `${RUNWAY_API}/tasks/${taskId}`,
            { headers }
        );

        return res.data;

    } catch (err) {
        console.error("Runway status error:", err.message);
        throw err;
    }
}

// ================= WAIT UNTIL READY =================
async function waitForVideo(taskId) {

    let attempts = 0;

    while (attempts < 30) { // ~60 sec max
        const data = await checkVideoStatus(taskId);

        if (data.status === "SUCCEEDED") {
            return data.output[0];
        }

        if (data.status === "FAILED")
            throw new Error("Video generation failed");

        await new Promise(r => setTimeout(r, 4000));
        attempts++;
    }

    throw new Error("Timeout video generation");
}

module.exports = {
    createRunwayVideo,
    waitForVideo
};
