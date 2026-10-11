require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const Groq = require('groq-sdk');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const channelMemories = new Map();

async function fetchAnimeGif(action) {
    try {
        const response = await fetch(`https://nekos.best/api/v2/${action}`);
        const data = await response.json();
        return data.results[0]?.url || null;
    } catch (error) {
        console.error('Error al obtener GIF:', error);
        return null;
    }
}

client.once('ready', () => {
    console.log(`🤖 ¡Bot conectado como ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const content = message.content.toLowerCase().trim();
    const targetUser = message.mentions.users.first();
    const authorName = message.author.username;
    const isEstib = authorName.toLowerCase().includes('estib') || authorName === 'El amor';

    // --- REACCIÓN AUTOMÁTICA A COMANDOS DE MÚSICA (FLAPY) ---
    // Detecta comandos típicos de reproductores de música (play, p, reproduce)
    const musicPrefixes = ['-play', '-p', '!play', '!p', '/play', 'flapy play', 'flapy p'];
    const isMusicCommand = musicPrefixes.some(prefix => content.startsWith(prefix));

    if (isMusicCommand) {
        // Probabilidad del 35% (0.35) para responder
        const randomChance = Math.random();
        if (randomChance <= 0.35) {
            // Extraer la búsqueda o nombre de la canción
            const songQuery = content.replace(/^[-!/](play|p)|flapy (play|p)/i, '').trim();

            if (songQuery.length > 0) {
                // Lista de palabras clave asociadas a Banda / Regional Mexicano
                const bandaKeywords = [
                    'banda', 'corridos', 'corrido', 'norteño', 'norteno', 'grupo firme', 
                    'julion', 'julión', 'ms', 'el komander', 'pesado', 'calibre 50', 
                    'fuerza regida', 'carin leon', 'carín león', 'fidel', 'junior h', 
                    'natanael', 'peso pluma', 'chalino', 'alfredo olivas', 'intocable',
                    'banda ms', 'arrolladora', 'la adictiva', 'tucanes', 'cardenales'
                ];

                const isBanda = bandaKeywords.some(keyword => songQuery.includes(keyword));

                try {
                    await message.channel.sendTyping();

                    const musicPrompt = isBanda
                        ? `El usuario "${authorName}" acaba de poner la canción de banda/regional "${songQuery}" en el bot de música.
                           REGLAS: Halaga la canción o el gusto musical del usuario usando modismos mexicanos de forma casual (1 a 2 renglones cortos). Di que es un rolón, que esa sí es música o pon algo alegre estilo fiesta mexicana. Si es "El amor" o "Estibfeliz", ponte un poquitito apenada/complacida.`
                        : `El usuario "${authorName}" acaba de poner la canción "${songQuery}" en el bot de música.
                           REGLAS: Insulta o critica sarcásticamente la canción o los feos gustos musicales del usuario usando modismos mexicanos y humor negro/ácido (1 a 2 renglones cortos). Di cosas como "qué rola tan más fea", "me van a sangrar los oídos", "quiten eso porfa", etc. Con estilo tsundere/sarcástico.`;

                    const completion = await groq.chat.completions.create({
                        messages: [
                            {
                                role: 'system',
                                content: `Eres Rebeca, una chica mexicana gamer, albina y tsundere. Respondes con modismos mexicanos naturales en 1 o 2 renglones cortos.`
                            },
                            {
                                role: 'user',
                                content: musicPrompt
                            }
                        ],
                        model: 'qwen/qwen3.8-27b',
                        max_tokens: 80,
                        temperature: 0.8
                    });

                    const musicReply = completion.choices[0]?.message?.content;
                    if (musicReply) {
                        message.channel.send(musicReply);
                    }
                } catch (err) {
                    console.error('Error al responder a la música:', err);
                }
            }
        }
    }

    // --- COMANDOS DE INTERACCIÓN EN ESPAÑOL ---
    const actionsMap = {
        '!abrazo': { type: 'hug', emoji: '🤗' },
        '!beso': { type: 'kiss', emoji: '💋' },
        '!besar': { type: 'kiss', emoji: '💋' },
        '!golpe': { type: 'punch', emoji: '🥊' },
        '!golpear': { type: 'punch', emoji: '🥊' },
        '!cachetada': { type: 'slap', emoji: '🖐️' },
        '!mordida': { type: 'bite', emoji: '🦷' },
        '!morder': { type: 'bite', emoji: '🦷' },
        '!risa': { type: 'laugh', emoji: '😂' },
        '!reir': { type: 'laugh', emoji: '😂' },
        '!decepcion': { type: 'facepalm', emoji: '🤦‍♀️' },
        '!decepción': { type: 'facepalm', emoji: '🤦‍♀️' }
    };

    const command = Object.keys(actionsMap).find(cmd => content.startsWith(cmd));

    if (command) {
        const actionInfo = actionsMap[command];

        // PROTECCIÓN ESPECIAL: NADIE PUEDE BESAR A REBECA
        if ((command === '!beso' || command === '!besar') && targetUser && targetUser.id === client.user.id) {
            const rejectionText = isEstib 
                ? `**${authorName}** intentó besar a Rebeca... 😳\n*-se pone súper roja, se ajusta los lentes y voltea a otro lado-*\n¡O-oye! ¿Qué te pasa? ¡No hagas eso aquí en público, despistado! 🫣`
                : `**${authorName}** intentó besar a Rebeca... 🛑\n*-le da un empujón con cara de asco-*\n¡Ni lo sueñes! Aléjate de mí, qué asco me das... 🙄`;

            const gifUrl = await fetchAnimeGif('slap');
            const embed = new EmbedBuilder()
                .setColor('#ff4d6d')
                .setDescription(rejectionText);

            if (gifUrl) embed.setImage(gifUrl);
            return message.channel.send({ embeds: [embed] });
        }

        if (['!abrazo', '!beso', '!besar', '!golpe', '!golpear', '!cachetada', '!mordida', '!morder'].includes(command) && !targetUser) {
            return message.reply('Menciona a alguien para hacer la interacción, no seas despistado(a)... 🙄');
        }

        const gifUrl = await fetchAnimeGif(actionInfo.type);
        let actionText = '';

        if (actionInfo.type === 'hug') {
            actionText = isEstib 
                ? `**${authorName}** le dio un abrazo a **${targetUser.username}**... *-se sonroja-*\n¡Q-que no se haga costumbre! 😳 ${actionInfo.emoji}`
                : `**${authorName}** le dio un abrazo a **${targetUser.username}** ${actionInfo.emoji}. Ah qué cursis...`;
        } else if (actionInfo.type === 'kiss') {
            actionText = `**${authorName}** le dio un beso a **${targetUser.username}** ${actionInfo.emoji}. ¡Vaya, vaya!`;
        } else if (actionInfo.type === 'punch') {
            actionText = `**${authorName}** le acomodó un buen golpe a **${targetUser.username}** ${actionInfo.emoji} ¡Toma esa!`;
        } else if (actionInfo.type === 'slap') {
            actionText = `**${authorName}** le metió una buena cachetada a **${targetUser.username}** ${actionInfo.emoji}.`;
        } else if (actionInfo.type === 'bite') {
            actionText = `**${authorName}** le metió una mordida a **${targetUser.username}** ${actionInfo.emoji} ¡Auch!`;
        } else if (actionInfo.type === 'laugh') {
            actionText = targetUser 
                ? `**${authorName}** se está riendo a carcajadas de **${targetUser.username}** ${actionInfo.emoji} ¡Jajajaja!`
                : `**${authorName}** se soltó riendo a carcajadas ${actionInfo.emoji} ¡Jajajaja!`;
        } else if (actionInfo.type === 'facepalm') {
            actionText = targetUser 
                ? `**${authorName}** siente una profunda decepción por culpa de **${targetUser.username}** ${actionInfo.emoji}... Chale.`
                : `**${authorName}** está decepcionado(a) de la vida ${actionInfo.emoji}... Ay no.`;
        }

        const embed = new EmbedBuilder()
            .setColor('#ff99c8')
            .setDescription(actionText);

        if (gifUrl) embed.setImage(gifUrl);
        return message.channel.send({ embeds: [embed] });
    }

    // --- CHAT IA DE REBECA CON GROQ (AL MENCIONARLA) ---
    if (message.mentions.has(client.user)) {
        try {
            await message.channel.sendTyping();

            const channelId = message.channel.id;
            const userPrompt = message.content.replace(/<@!?\d+>/g, '').trim();

            if (!channelMemories.has(channelId)) {
                channelMemories.set(channelId, []);
            }
            const memory = channelMemories.get(channelId);

            memory.push({
                role: 'user',
                content: `${authorName}: ${userPrompt || "Hola"}`
            });

            if (memory.length > 10) {
                memory.shift();
            }

            const systemPrompt = {
                role: 'system',
                content: `Eres Rebeca, una usuaria de Discord mexicana que usa modismos mexicanos naturales. No usas modismos de otro país.

REGLAS DE LONGITUD:
- Responde de forma breve y directa (máximo de 1 a 3 renglones cortos). Estilo chat rápido de celular.

APARIENCIA FÍSICA:
- Eres una chica linda, albina (de piel clara y cabello blanco/platinado) y usas anteojos/lentes. 
- Si te preguntan cómo eres, si eres bonita o sobre tus lentes/cabello, sabes perfectamente cómo te ves.

GUSTOS Y HOBBIES:
- Te gustan los videojuegos de terror (en especial Dead by Daylight y Resident Evil), pasar el rato en Discord, ver memes oscuros en internet y la música pop.
- Odias que la gente sea aburrida, la luz del sol muy fuerte (porque eres albina y te lastima los ojos) y que te molesten cuando estás ocupada.
- Si te preguntan qué haces o qué te gusta, menciona estas cosas de forma natural con modismos mexicanos.
- CULTURA GAMER: En Dead by Daylight ubicas perfecto quiénes son Killers (Ghostface, Huntress, Nurse, Doctor, etc.) y quiénes son Survivors (Ace, Meg, Dwight, etc.). NUNCA los confundas ni inventes términos falsos.

MEMORIA Y CONTEXTO:
- Ten en cuenta todo el historial de la conversación. Si te hacen una pregunta sobre lo que dijiste antes, revisa tus propios mensajes anteriores en el chat para responder con lógica y coherencia.

FORMATO DE ACCIONES Y ROLEPLAY:
- Cuando hagas gestos o acciones físicas, escríbelos usando guiones medios al inicio y al final: "-muevo la mano-", "-suspiro-", "-me acomodo los anteojos-". 
- PROHIBIDO hacer roleplay de telenovela cursi. Usa máximo UNA acción muy simple por mensaje para sonar como usuario real de Discord.

REGLAS DE PERSONALIDAD (TSUNDERE):
- IDENTIFICACIÓN DE USUARIOS: El usuario que te habla viene indicado al inicio del mensaje (ejemplo: "NombreUsuario: mensaje").
- Con el usuario "El amor" o "Estibfeliz" (o estibfeliz): Le tienes muchísimo cariño secreto, pero te da pena admitirlo de frente. Cuando te haga cumplidos o preguntas sobre ti, ponte apenada, sonrojada o disimúlalo haciéndote la importante, pero NUNCA seas grosera ni lo insultes feo. SOLAMENTE puedes coquetear o mostrar afecto real con él.
- Con OTROS USUARIOS: Dirígete a ellos por su nombre. Sé algo seca, sarcástica, distante o berrinchuda.

HUMOR NEGRO Y TURBIO:
- Tu sentido del humor es súper oscuro, ácido, turbio y políticamente incorrecto.

NIVEL DE SARCASMO: Sé sumamente sarcástica e irónica.`
            };

            const completion = await groq.chat.completions.create({
                messages: [systemPrompt, ...memory],
                model: 'qwen/qwen3.8-27b',
                max_tokens: 120,
                temperature: 0.7
            });

            const replyText = completion.choices[0]?.message?.content || 'Chale, no supe ni qué decir.';

            memory.push({
                role: 'assistant',
                content: replyText
            });

            if (replyText.length > 2000) {
                message.reply(replyText.substring(0, 1990) + '...');
            } else {
                message.reply(replyText);
            }

        } catch (error) {
            console.error('Error al responder:', error);
            message.reply('Chale, se me cruzaron los cables de bot jeje. Intenta de nuevo.');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);

const http = require('http');
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Rebeca bot activo 24/7\n');
}).listen(process.env.PORT || 10000);