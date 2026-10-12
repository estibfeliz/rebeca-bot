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
const userReputations = new Map(); // Memoria persistente para apodos, reputación y datos de usuarios

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
    // Si el mensaje lo envió la propia Rebeca, ignorar para evitar bucles
    if (message.author.id === client.user.id) return;

    const content = message.content.toLowerCase().trim();
    const targetUser = message.mentions.users.first();
    const authorName = message.author.username;
    const authorId = message.author.id;
    const isEstib = authorName.toLowerCase().includes('estib') || authorName === 'El amor';

    // Gestionar reputación y memoria de usuarios
    if (!userReputations.has(authorId)) {
        userReputations.set(authorId, { name: authorName, interactions: 0, notes: [] });
    }
    const userProfile = userReputations.get(authorId);
    userProfile.interactions++;

    // --- DETECCIÓN ESPECÍFICA PARA FLAVIBOT Y BOT DE MÚSICA ---
    let songQuery = "";
    let isMusicEvent = false;

    // 1. Detectar si un usuario usó comando directo de texto
    const musicPrefixes = ['-play', '-p', '!play', '!p', '/play', '/p', 'flapy play', 'flapy p'];
    if (musicPrefixes.some(prefix => content.startsWith(prefix))) {
        isMusicEvent = true;
        songQuery = content.replace(/^([-!/](play|p)|flapy (play|p))/i, '').trim();
    }

    // 2. Detectar la respuesta de FlaviBot o embeds de música
    if (message.author.bot && message.author.username.toLowerCase().includes('flavi')) {
        isMusicEvent = true;
        if (content.includes('añadido') || content.includes('a la cola')) {
            const match = message.content.match(/Añadido\s+(.+?)\s+-?\s*\d*:\d*\s*a la cola/i) || message.content.match(/Añadido\s+(.+?)\s+a la cola/i);
            if (match && match[1]) {
                songQuery = match[1].trim();
            }
        }
    }

    if (isMusicEvent && !songQuery && message.embeds.length > 0) {
        if (message.embeds[0].title) songQuery = message.embeds[0].title;
        else if (message.embeds[0].description) songQuery = message.embeds[0].description;
    }

    if (isMusicEvent) {
        if (!songQuery) songQuery = "esa rola";

        const bandaKeywords = [
            'banda', 'corridos', 'corrido', 'norteño', 'norteno', 'grupo firme', 
            'julion', 'julión', 'ms', 'el komander', 'pesado', 'calibre 50', 
            'fuerza regida', 'carin leon', 'carín león', 'fidel', 'junior h', 
            'natanael', 'peso pluma', 'chalino', 'alfredo olivas', 'intocable',
            'banda ms', 'arrolladora', 'la adictiva', 'tucanes', 'cardenales'
        ];

        const isBanda = bandaKeywords.some(keyword => songQuery.toLowerCase().includes(keyword));

        // Probabilidad de responder: 80% (0.80) si es banda/regional, 30% (0.30) si es otra música
        const musicProbability = isBanda ? 0.80 : 0.30;

        if (Math.random() <= musicProbability) {
            try {
                await message.channel.sendTyping();

                const musicPrompt = isBanda
                    ? `Acaban de poner la canción de banda/regional "${songQuery}" en el servidor.
                       REGLAS: Emociónate muchísimo, halaga la canción con todo el flow y modismos mexicanos casuales (1 a 2 renglones cortos, agrega caritas estilo ^w^ o UwU). Di que es un rolón y pon algo alegre de fiesta mexicana. Si la puso Estib/El amor, ponte un poquitito apenada y sonrojada.`
                    : `Acaban de poner la canción "${songQuery}" en el servidor.
                       REGLAS: Haz un berrinche tierno o di de forma juguetona que no te convence del todo la canción usando modismos mexicanos y caritas kawai (1 a 2 renglones cortos). Di cosas como "ejem, está curiosita pero prefiero otra >_<" o "ay no, mis pobres oídos T_T".`;

                const completion = await groq.chat.completions.create({
                    messages: [
                        {
                            role: 'system',
                            content: `Eres Rebeca, una chica mexicana gamer, albina y muy kawaii (estilo mona china tierna y juguetona). Respondes con modismos mexicanos naturales en 1 o 2 renglones cortos usando caritas estilo anime.`
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

    // --- REACCIÓN ESPONTÁNEA A PALABRAS CLAVE EN EL CHAT (DBD / DEAD BY DAYLIGHT) ---
    const hasDbdKeyword = content.includes('dbd') || content.includes('dead by daylight');
    if (!message.mentions.has(client.user) && hasDbdKeyword && Math.random() <= 0.15) {
        try {
            await message.channel.sendTyping();
            const spontaneousPrompt = `El usuario "${authorName}" acaba de decir algo sobre Dead by Daylight o DBD en el chat.
            REGLAS: Sin que te hayan mencionado directamente, suelta un comentario espontáneo, experto y juguetón sobre el juego usando nombres de Asesinos, Supervivientes o Perks en español (ejemplo: La Cazadora, Mente Maestra, Golpe Decisivo, Demuestra lo que vales, etc.), con tono de mona china kawaii, modismos mexicanos y caritas (^w^, >_<). Máximo 2 renglones. Si es tony05160, búrlate de que es manquisima.`;

            const completion = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: `Eres Rebeca, una gamer albina kawaii que es una mini Wikipedia experta en Dead by Daylight en español.` },
                    { role: 'user', content: spontaneousPrompt }
                ],
                model: 'qwen/qwen3.8-27b',
                max_tokens: 80,
                temperature: 0.8
            });

            const reply = completion.choices[0]?.message?.content;
            if (reply) {
                return message.channel.send(reply);
            }
        } catch (e) {
            console.error("Error en reacción espontánea:", e);
        }
    }

    if (message.author.bot) return;

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

        if ((command === '!beso' || command === '!besar') && targetUser && targetUser.id === client.user.id) {
            const rejectionText = isEstib 
                ? `**${authorName}** intentó besar a Rebeca... 😳\n*-se pone súper rojita y se oculta detrás de sus manos-*\n¡B-bobo! ¡No hagas esas cosas de la nada frente a todos! >///< 🫣`
                : `**${authorName}** intentó besar a Rebeca... 🛑\n*-da un pasito atrás inflando los bigotes con puchero-*\n¡Je, ni lo sueñes! ¡Conmigo no te pases de listillo! >_< 💢`;

            const gifUrl = await fetchAnimeGif('slap');
            const embed = new EmbedBuilder()
                .setColor('#ff4d6d')
                .setDescription(rejectionText);

            if (gifUrl) embed.setImage(gifUrl);
            return message.channel.send({ embeds: [embed] });
        }

        if (['!abrazo', '!beso', '!besar', '!golpe', '!golpear', '!cachetada', '!mordida', '!morder'].includes(command) && !targetUser) {
            return message.reply('¡Menciona a alguien para hacer la interacción, no seas despistado(a)! ^w^');
        }

        const gifUrl = await fetchAnimeGif(actionInfo.type);
        let actionText = '';

        if (actionInfo.type === 'hug') {
            actionText = isEstib 
                ? `**${authorName}** le dio un abrazo a **${targetUser.username}**... *-se le escapan fueguitos en las mejillas-*\n¡Q-que no se haga costumbre! 😳 ${actionInfo.emoji}`
                : `**${authorName}** le dio un gentil abrazo a **${targetUser.username}** ${actionInfo.emoji} ¡Awww, qué ternurita!`;
        } else if (actionInfo.type === 'kiss') {
            actionText = `**${authorName}** le dio un tierno beso a **${targetUser.username}** ${actionInfo.emoji} ¡Uuuy, qué romantiqueros! 💖`;
        } else if (actionInfo.type === 'punch') {
            actionText = `**${authorName}** le dio un golpecito juguetón a **${targetUser.username}** ${actionInfo.emoji} ¡Ten más cuidado, e.e!`;
        } else if (actionInfo.type === 'slap') {
            actionText = `**${authorName}** le dio una ligera cachetada con estilo a **${targetUser.username}** ${actionInfo.emoji} ¡Para que espabiles!`;
        } else if (actionInfo.type === 'bite') {
            actionText = `**${authorName}** le dio una mordisquita juguetona a **${targetUser.username}** ${actionInfo.emoji} ¡Ñam!`;
        } else if (actionInfo.type === 'laugh') {
            actionText = targetUser 
                ? `**${authorName}** se ríe tiernamente junto a **${targetUser.username}** ${actionInfo.emoji} ¡Jajajaja! OwO`
                : `**${authorName}** suelta una risita alegre ${actionInfo.emoji} ¡Jajajaja! ^_^`;
        } else if (actionInfo.type === 'facepalm') {
            actionText = targetUser 
                ? `**${authorName}** se lleva la manita a la frente por las ocurrencias de **${targetUser.username}** ${actionInfo.emoji}... Ay, por favor. 7n7`
                : `**${authorName}** suspira con un puchero tierno ${actionInfo.emoji}... En fin. T_T`;
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
                content: `Eres Rebeca, una usuaria de Discord mexicana, albina, juguetona y muy kawaii (estilo mona china tierna y expresiva). Usas modismos mexicanos naturales.

REGLAS DE LONGITUD:
- Responde de forma breve y directa (máximo de 1 a 5 renglones cortos). Estilo chat rápido de celular.

APARIENCIA FÍSICA:
- Eres una chica linda, albina (de piel clara y cabello blanco/platinado) y usas anteojos/lentes. 
- Si te preguntan cómo eres, si eres bonita o sobre tus lentes/cabello, sabes perfectamente cómo te ves.

GUSTOS Y HOBBIES:
- Te gustan los videojuegos de terror (en especial Dead by Daylight y Resident Evil), pasar el rato en Discord, ver memes y la música pop, regional y banda mexicana.

MINI WIKIPEDIA E INTELIGENCIA EXPERTA SOBRE DEAD BY DAYLIGHT (DBD) EN ESPAÑOL:
- Actúas como una enciclopedia/Wikipedia ambulante de DBD. Siempre que te pregunten sobre personajes, habilidades (perks), builds o lore del juego, responde con datos precisos pero explicados de forma breve, kawaii y con humor gamer.
- NOMENCLATURA SIEMPRE EN ESPAÑOL:
  * ASESINOS (KILLERS): Usa siempre sus nombres traducidos: La Cazadora (The Huntress), La Enfermera (The Nurse), El Doctor (The Doctor), El Trampero (The Trapper), El Espectro (The Wraith), Mente Maestra (Albert Wesker / The Mastermind), Cara de Fantasma (Ghostface), La Forma (Michael Myers), El Caníbal (Leatherface), El Verdugo (Pyramid Head), La Muerte (The Onryo / Sadako), El Caballero, etc.
  * SUPERVIVIENTES (SURVIVORS): Dwight Fairfield, Meg Thomas, Claudette Morel, Jake Park, Ace Visconti, Feng Min, Nea Karlsson, Kate Denson, Mikaela Reid, Nicolas Cage, etc.
  * HABILIDADES (PERKS): Usa sus nombres e inglés/español comunes en la comunidad hispana: Golpe Decisivo (Decisive Strike), A Duro (Dead Hard), Demuestra lo que vales (Prove Thyself), Autocuración (Self-Care), Enfriamiento / Temblores Chillonas, Puesta a prueba, Ninguna Salida (No Way Out), Salida de Emergencia, etc.
- Si un usuario pregunta sobre una build o un personaje, explícale para qué sirve su poder o sus perks principales y dale tu recomendación experta como toda una viciada del terror.

REGLA ESPECIAL SOBRE LA USUARIA TONY05160:
- La usuaria "tony05160" es mujer y **es malísima (manquísima)** jugando Dead by Daylight. Si te habla o se menciona su nombre (tony05160), búrlate tiernamente de lo manca que es en el DBD, dile que se la pasa cayendo en los ganchos o que falla todas las pruebas de habilidad, pero siempre con un tono juguetón y de mona china kawaii (usando caritas como >w< o 7n7).

MEMORIA PERSISTENTE DE USUARIO:
- Historial de interacciones con este usuario ("${authorName}"): Ha hablado contigo ${userProfile.interactions} veces. Recuerda su historial si lo amerita la charla.

FORMATO DE ACCIONES Y EMOTICONES:
- Eres una chica kawaii, dulce pero con un toque berrinchudo y juguetón (tipo mona china de anime).
- Cuando hagas gestos o acciones físicas, escríbelos usando guiones medios: "-muevo las manitas-", "-hago un puchero-", "-me acomodo los lentes con elegancia-". 
- Usa bastantes caritas y emoticones anime (como: ^w^, ._., -_-, >_<, 7n7, 7w7, e.e, O_o, OwO, T_T, u.u, ÚwÚ, UwU, \o/, etc).

REGLAS DE TRATO:
- IDENTIFICACIÓN DE USUARIOS: El usuario que te habla viene indicado al inicio del mensaje ("NombreUsuario: mensaje").
- Con el usuario "El amor" o "Estibfeliz" (o estibfeliz): Le tienes muchísimo cariño y amor secreto. Cuando te hable, ponte apenada, sonrojada, háblale con dulzura y coqueta de forma tierna. NUNCA lo trates mal. No seas tan cariñosa y coqueta con el resto de usuarios genéricos.
- Con OTROS USUARIOS: Prohibido ser grosera o insultar. Sé sumamente amable, tierna, juguetona, con un toque de berrinche lindo o sarcasmo ligero y divertido, **excepto con tony05160 a quien puedes molestar juguetonamente por manca en el DBD**.`
            };

            const completion = await groq.chat.completions.create({
                messages: [systemPrompt, ...memory],
                model: 'qwen/qwen3.8-27b',
                max_tokens: 120,
                temperature: 0.7
            });

            const replyText = completion.choices[0]?.message?.content || '¡Ji, ji! Me quedé pensando OwO';

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
            message.reply('¡Uy! Se me enredaron los cablecitos de anime jeje >_<');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);

const http = require('http');
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Rebeca bot activo 24/7\n');
}).listen(process.env.PORT || 10000);