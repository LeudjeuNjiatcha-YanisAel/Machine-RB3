const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
// Chemin pour stocker la configuration de l’auto status
const configPath = path.join(__dirname, '../data/autoStatus.json');

// Initialiser le fichier de configuration s’il n’existe pas
if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({ 
        enabled: false, 
        reactOn: false,
        download: false 
    }));
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

        if (!isStatusDownloadEnabled()) return;

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

        const filePath = path.join(folder, `${msg.key.id}.jpg`);

        fs.writeFileSync(filePath, buffer);

        console.log('📥 Status téléchargé :', filePath);

    } catch (err) {
        console.log('❌ Erreur téléchargement statut :', err.message);
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

        // Lire la configuration actuelle
        let config = JSON.parse(fs.readFileSync(configPath));

        // Si aucun argument, afficher l’état actuel
        if (!args || args.length === 0) {
            const status = config.enabled ? 'activé' : 'désactivé';
            const reactStatus = config.reactOn ? 'activé' : 'désactivé';
            await sock.sendMessage(chatId, { 
                text: `🔄 *Paramètres Auto Status*\n\n📱 *Vue automatique des statuts :* ${status}\n💫 *Réactions aux statuts :* ${reactStatus}\n\n*Commandes :*\n*autostatus on - Activer la vue automatique des statuts\n*autostatus off - Désactiver la vue automatique des statuts\n📥*autostatus download - Telecharge les statuts de vos contact online ou offline\n*autostatus react on - Activer les réactions aux statuts\n*autostatus react off - Désactiver les réactions aux statuts`,
            });
            return;
        }

        // Gestion des commandes on/off
        const command = args[0].toLowerCase();
        
        if (command === 'on') {
            config.enabled = true;
            fs.writeFileSync(configPath, JSON.stringify(config));
            await sock.sendMessage(chatId, { 
                text: '✅ La vue automatique des statuts a été activée !\nLe bot consultera désormais automatiquement tous les statuts des contacts.',
            });
        } else if (command === 'off') {
            config.enabled = false;
            fs.writeFileSync(configPath, JSON.stringify(config));
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
                config.reactOn = true;
                fs.writeFileSync(configPath, JSON.stringify(config));
                await sock.sendMessage(chatId, { 
                    text: '💫 Les réactions aux statuts ont été activées !\nLe bot réagira désormais aux mises à jour de statut.',
                });
            } else if (reactCommand === 'off') {
                config.reactOn = false;
                fs.writeFileSync(configPath, JSON.stringify(config));
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
            if (!config.enabled) {
                await sock.sendMessage(chatId, { 
                    text: '❌ Veuillez activer la vue automatique des statuts avant de télécharger les médias !\nUtilisez : *autostatus on',
                });
                return;
            }
            config.download = !config.download;
            fs.writeFileSync(configPath, JSON.stringify(config));
            const state = config.download ? 'activé' : 'désactivé';
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

// Fonction pour vérifier si l’auto status est activé
function isAutoStatusEnabled() {
    try {
        const config = JSON.parse(fs.readFileSync(configPath));
        return config.enabled;
    } catch (error) {
        console.error('Erreur lors de la vérification de la configuration auto status :', error);
        return false;
    }
}

function isStatusDownloadEnabled() {
    try {
        const config = JSON.parse(fs.readFileSync(configPath));
        return config.download;
    } catch (error) {
        console.error('Erreur lecture config download :', error);
        return false;
    }
}

// Fonction pour vérifier si les réactions aux statuts sont activées
function isStatusReactionEnabled() {
    try {
        const config = JSON.parse(fs.readFileSync(configPath));
        return config.reactOn;
    } catch (error) {
        console.error('Erreur lors de la vérification des réactions aux statuts :', error);
        return false;
    }
}

// Fonction pour réagir aux statuts avec la méthode appropriée
async function reactToStatus(sock, statusKey) {
    try {
        if (!isStatusReactionEnabled()) {
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
        
        // Journal de succès supprimé – uniquement les erreurs sont conservées
    } catch (error) {
        console.error('❌ Erreur lors de la réaction au statut :', error.message);
    }
}

// Fonction pour gérer les mises à jour de statut
async function handleStatusUpdate(sock, status) {
    try {
        if (!isAutoStatusEnabled()) {
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
                   const participant = getRealJid(msg)

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
                            const participant = getRealJid(msg)

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

                const participant = getRealJid(msg)

                await new Promise(resolve => setTimeout(resolve, 2000))

                await sock.sendReceipt(
                'status@broadcast',
                participant,
                [msg.key.id],
                'read'
                )

                // Réagir au statut si activé
                await reactToStatus(sock, status.key);
            } catch (err) {
                if (err.message?.includes('rate-overlimit')) {
                    console.log('⚠️ Limite de requêtes atteinte, attente avant réessai...');
                    
                    const participant = getRealJid(msg)

                    await new Promise(resolve => setTimeout(resolve, 2000))

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

        // Gérer les statuts dans les réactions
        if (status.reaction && status.reaction.key.remoteJid === 'status@broadcast') {
            try {
                    const participant = getRealJid(msg)

                    await new Promise(resolve => setTimeout(resolve, 2000))

                    await sock.sendReceipt(
                    'status@broadcast',
                    participant,
                    [msg.key.id],
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
