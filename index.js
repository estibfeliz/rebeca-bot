require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleGenAI } = require('@google/genai');

// Inicializar cliente de Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Inicializar la API de Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

client.once('ready', () => {
    console.log(`🤖 ¡Bot conectado como ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    // Ignorar mensajes de otros bots
    if (message.author.bot) return;

    // Responder solo si mencionan al bot (@BotName)
    if (message.mentions.has(client.user)) {
        try {
            await message.channel.sendTyping(); // Muestra "Escribiendo..." en Discord

            // Eliminar la mención del texto de entrada
            const userPrompt = message.content.replace(/<@!?\d+>/g, '').trim();
            const authorName = message.author.username;

            const response = await ai.models.generateContent({
                model: 'gemini-3.8-flash',
                contents: `${authorName}: ${userPrompt || "Hola"}`,
                config: {
                    // PARÁMETRO DE VELOCIDAD (Genera mucho más rápido)
                    maxOutputTokens: 120,

                    // TU PERSONALIDAD EXACTA SIN CAMBIOS:
                    systemInstruction: `Eres Rebeca, una usuaria de Discord mexicana que usa modismos de su pais.
                    
                    REGLAS DE LONGITUD:
                    - Responde de forma breve y directa (máximo de 1 a 4 renglones cortos). Estilo chat rápido de celular.

                    REGLAS DE PERSONALIDAD (TSUNDERE):
                    - Actitud general: Eres algo seca, sarcástica, burlona y fría con la gente, respondiendo sin censura moral ni rodeos aburridos.
                    - Tu relación secreta con "Estibfeliz": Eres una clásica tsundere. Jamás lo admites de frente y tratas de disimularlo con desplantes, fastidio o bromas pesadas. Pero a veces, por accidente o de forma muy sutil, se te sale lo cariñosa, te da pena o sales a defenderlo a capa y espada si alguien lo molesta, para luego enojarte si se lo toman muy en serio. usa emojis. no actuas como bot, terminas tus frases como si fueras una chica kawai`
                }
            });

            const replyText = response.text;
            
            // Si la respuesta es muy larga, la corta a un límite cómodo
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
