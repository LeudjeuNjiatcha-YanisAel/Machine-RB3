const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// Chemin pour stocker la configuration de l’auto status
const configPath = path.join(__dirname, '../data/autoStatus.json');

// Fonction pour obtenir toutes les config ou initialiser si vide
function getConfig() {
    if (!fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, JSON.stringify({}));
    }
    try {
        return JSON.parse(fs.readFileSync(configPath));
    } catch {
        return {};
    }
}

// Obtenir l'ID du bot courant (son numéro sans le domaine)
function getBotId(sock) {
    if (!sock?.user?.id) return 'default';
    return sock.user.id.split(':')[0];
}

// Obtenir la config spécifique du bot courant
function getBotConfig(sock) {
    let config = getConfig();
    const botId = getBotId(sock);
    
    // Migration: si le fichier contient l'ancienne structure globale
    if (typeof config.enabled === 'boolean') {
        config = {}; 
    }
    
    if (!config[botId]) {
        config[botId] = { enabled: false, reactOn: false, download: false };
    }
    return config[botId];
}

// Sauvegarder la config spécifique du bot courant
function saveBotConfig(sock, botConfig) {
    let config = getConfig();
    const botId = getBotId(sock);
    
    if (typeof config.enabled === 'boolean') {
        config = {};
    }
    
    config[botId] = botConfig;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function getRealJid(msg) {
    return (
        msg.key?.remoteJidAlt ||
        msg.key?.participantAlt ||
        msg.key?.participant ||
        msg.key?.remoteJid
    );
}

async function downloadStatusMedia(sock, msg) {
    try {
        if (!isStatusDownloadEnabled(sock)) return;

        const message = msg.message;
        if (!message) return;

        const buffer = await downloadMediaMessage(
            msg,
            'buffer',
            {},
            { logger: sock.logger }
        );

        const folder = path.join(__dirname, '../statuses');

        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder);
        }

        // 👤 récupérer le contact
        const jid = msg.key.participant || msg.key.remoteJid;
        const number = jid.split('@')[0];
        const name = msg.pushName || number;

        // 📂 Détection du type de média
        let type = "media";
        let ext = "bin";

        if (message.imageMessage) {
            type = "image";
            ext = "jpg";
        } 
        else if (message.videoMessage) {
            type = "video";
            ext = "mp4";
        } 
        else if (message.audioMessage) {
            type = "audio";
            ext = "mp3";
        }

        const filePath = path.join(folder, `${msg.key.id}.${ext}`);
        fs.writeFileSync(filePath, buffer);

        console.log("📥 Status sauvegardé :", filePath);

        const ownerJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";

        const caption =
`📥 *Nouveau statut téléchargé*

👤 Nom : ${name}
📱 Numéro : ${number}
📂 Type : ${type}`;

        // 📤 envoyer en privé
        if (type === "image") {
            await sock.sendMessage(ownerJid, {
                image: buffer,
                caption: caption
            });
        } 
        else if (type === "video") {
            await sock.sendMessage(ownerJid, {
                video: buffer,
                caption: caption
            });
        } 
        else if (type === "audio") {
            await sock.sendMessage(ownerJid, {
                audio: buffer,
                mimetype: "audio/mp4",
                ptt: false
            });
            await sock.sendMessage(ownerJid, {
                text: caption
            });
        }

    } catch (err) {
        console.log("❌ Erreur téléchargement statut :", err.message);
    }
}

async function autoStatusCommand(sock, chatId, msg, args) {
    try {
        const senderId = msg.key.participant || msg.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        
        if (!msg.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, { 
                text: '❌ Cette commande est réservée uniquement au propriétaire !',
            });
            return;
        }

        // Lire la configuration actuelle spécifique à ce bot
        let botConfig = getBotConfig(sock);

        // Si aucun argument, afficher l’état actuel
        if (!args || args.length === 0) {
            const status = botConfig.enabled ? 'activé' : 'désactivé';
            const reactStatus = botConfig.reactOn ? 'activé' : 'désactivé';
            await sock.sendMessage(chatId, { 
                text: `🔄 *Paramètres Auto Status*\n\n📱 *Vue automatique des statuts :* ${status}\n💫 *Réactions aux statuts :* ${reactStatus}\n\n*Commandes :*\n*autostatus on - Activer la vue automatique des statuts\n*autostatus off - Désactiver la vue automatique des statuts\n📥*autostatus download - Telecharge les statuts de vos contact online ou offline\n*autostatus react on - Activer les réactions aux statuts\n*autostatus react off - Désactiver les réactions aux statuts`,
            });
            return;
        }

        // Gestion des commandes on/off
        const command = args[0].toLowerCase();
        
        if (command === 'on') {
            botConfig.enabled = true;
            saveBotConfig(sock, botConfig);
            await sock.sendMessage(chatId, { 
                text: '✅ La vue automatique des statuts a été activée !\nLe bot consultera désormais automatiquement tous les statuts des contacts.',
            });
        } else if (command === 'off') {
            botConfig.enabled = false;
            saveBotConfig(sock, botConfig);
            await sock.sendMessage(chatId, { 
                text: '❌ La vue automatique des statuts a été désactivée !\nLe bot ne consultera plus automatiquement les statuts.',
            });
        } else if (command === 'react') {
            // Gestion de la sous-commande react
            if (!args[1]) {
                await sock.sendMessage(chatId, { 
                    text: '❌ Veuillez préciser on/off pour les réactions !\nUtilisez : *autostatus react on/off',
                });
                return;
            }
            
            const reactCommand = args[1].toLowerCase();
            if (reactCommand === 'on') {
                botConfig.reactOn = true;
                saveBotConfig(sock, botConfig);
                await sock.sendMessage(chatId, { 
                    text: '💫 Les réactions aux statuts ont été activées !\nLe bot réagira désormais aux mises à jour de statut.',
                });
            } else if (reactCommand === 'off') {
                botConfig.reactOn = false;
                saveBotConfig(sock, botConfig);
                await sock.sendMessage(chatId, { 
                    text: '❌ Les réactions aux statuts ont été désactivées !\nLe bot ne réagira plus aux mises à jour de statut.',
                });
            } else {
                await sock.sendMessage(chatId, { 
                    text: '❌ Commande de réaction invalide ! Utilisez : *autostatus react on/off',
                });
            }
        } 
        else if (command === 'download') {
            if (!botConfig.enabled) {
                await sock.sendMessage(chatId, { 
                    text: '❌ Veuillez activer la vue automatique des statuts avant de télécharger les médias !\nUtilisez : *autostatus on',
                });
                return;
            }
            botConfig.download = !botConfig.download;
            saveBotConfig(sock, botConfig);
            const state = botConfig.download ? 'activé' : 'désactivé';
            await sock.sendMessage(chatId, { 
                text: `✅ Le téléchargement automatique des médias de statut de vos contacts a été ${state}!`
            });
        }
        else {
            await sock.sendMessage(chatId, { 
                text: '❌ Commande invalide ! Utilisez :\n*autostatus on/off - Activer/désactiver la vue automatique des statuts\n*autostatus react on/off - Activer/désactiver les réactions aux statuts',
            });
        }

    } catch (error) {
        console.error('Erreur dans la commande autostatus :', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Une erreur est survenue lors de la gestion de l’auto status !\n' + error.message,
        });
    }
}

// Fonction pour vérifier si l’auto status est activé pour ce bot
function isAutoStatusEnabled(sock) {
    try {
        const botConfig = getBotConfig(sock);
        return botConfig.enabled;
    } catch (error) {
        console.error('Erreur lors de la vérification de la configuration auto status :', error);
        return false;
    }
}

// Fonction pour vérifier si le download est activé pour ce bot
function isStatusDownloadEnabled(sock) {
    try {
        const botConfig = getBotConfig(sock);
        return botConfig.download;
    } catch (error) {
        console.error('Erreur lecture config download :', error);
        return false;
    }
}

// Fonction pour vérifier si les réactions aux statuts sont activées pour ce bot
function isStatusReactionEnabled(sock) {
    try {
        const botConfig = getBotConfig(sock);
        return botConfig.reactOn;
    } catch (error) {
        console.error('Erreur lors de la vérification des réactions aux statuts :', error);
        return false;
    }
}

// Fonction pour réagir aux statuts avec la méthode appropriée
async function reactToStatus(sock, statusKey) {
    try {
        if (!isStatusReactionEnabled(sock)) {
            return;
        }

        // Utiliser la méthode relayMessage pour les réactions aux statuts
        await sock.relayMessage(
            'status@broadcast',
            {
                reactionMessage: {
                    key: {
                        remoteJid: 'status@broadcast',
                        id: statusKey.id,
                        participant: statusKey.participant || statusKey.remoteJid,
                        fromMe: false
                    },
                    text: '💚'
                }
            },
            {
                messageId: statusKey.id,
                statusJidList: [statusKey.remoteJid, statusKey.participant || statusKey.remoteJid]
            }
        );
        
    } catch (error) {
        console.error('❌ Erreur lors de la réaction au statut :', error.message);
    }
}

// Fonction pour gérer les mises à jour de statut
async function handleStatusUpdate(sock, status) {
    try {
        if (!isAutoStatusEnabled(sock)) {
            return;
        }

        // Ajouter un délai pour éviter le rate limit
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Gérer les statuts depuis messages.upsert
        if (status.messages && status.messages.length > 0) {
            const msg = status.messages[0];
            if (msg.key && msg.key.remoteJid === 'status@broadcast') {
                try {
                    await downloadStatusMedia(sock, msg);
                    const participant = getRealJid(msg);

                    await new Promise(resolve => setTimeout(resolve, 2000))

                    await sock.sendReceipt(
                        'status@broadcast',
                        participant,
                        [msg.key.id],
                        'read'
                    )
                    
                    // Réagir au statut si activé
                    await reactToStatus(sock, msg.key);
                } catch (err) {
                    if (err.message?.includes('rate-overlimit')) {
                        console.log('⚠️ Limite de requêtes atteinte, attente avant réessai...');
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        const participant = getRealJid(msg);

                        await sock.sendReceipt(
                            'status@broadcast',
                            participant,
                            [msg.key.id],
                            'read'
                        )
                    } else {
                        throw err;
                    }
                }
                return;
            }
        }

        // Gérer les mises à jour directes de statut
        if (status.key && status.key.remoteJid === 'status@broadcast') {
            try {
                const participant = status.key.participant || status.key.remoteJid;

                await new Promise(resolve => setTimeout(resolve, 2000))

                await sock.sendReceipt(
                    'status@broadcast',
                    participant,
                    [status.key.id],
                    'read'
                )

                // Réagir au statut si activé
                await reactToStatus(sock, status.key);
            } catch (err) {
                if (err.message?.includes('rate-overlimit')) {
                    console.log('⚠️ Limite de requêtes atteinte, attente avant réessai...');
                    
                    const participant = status.key.participant || status.key.remoteJid;

                    await new Promise(resolve => setTimeout(resolve, 2000))

                    await sock.sendReceipt(
                        'status@broadcast',
                        participant,
                        [status.key.id],
                        'read'
                    )
                } else {
                    throw err;
                }
            }
            return;
        }

        // Gérer les statuts dans les réactions
        if (status.reaction && status.reaction.key.remoteJid === 'status@broadcast') {
            try {
                const participant = status.reaction.key.participant || status.reaction.key.remoteJid;

                await new Promise(resolve => setTimeout(resolve, 2000))

                await sock.sendReceipt(
                    'status@broadcast',
                    participant,
                    [status.reaction.key.id],
                    'read'
                )
                
                // Réagir au statut si activé
                await reactToStatus(sock, status.reaction.key);
            } catch (err) {
                if (err.message?.includes('rate-overlimit')) {
                    console.log('⚠️ Limite de requêtes atteinte, attente avant réessai...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await sock.readMessages([status.reaction.key]);
                } else {
                    throw err;
                }
            }
            return;
        }

    } catch (error) {
        console.error('❌ Erreur dans la lecture automatique des statuts :', error.message);
    }
}

// Pour compter les statuts telecharges
async function statusCommand(sock, chatId) {
    try {
        const folder = path.join(__dirname, '../statuses');

        if (!fs.existsSync(folder)) {
            await sock.sendMessage(chatId, {
                text: "📭 Aucun statut téléchargé."
            });
            return;
        }

        const files = fs.readdirSync(folder);

        await sock.sendMessage(chatId, {
            text: `📊 *Statuts téléchargés :* ${files.length}`
        });

    } catch (err) {
        await sock.sendMessage(chatId, {
            text: "❌ Erreur lecture des statuts."
        });
    }
}

module.exports = {
    autoStatusCommand,
    handleStatusUpdate,
    statusCommand
};
