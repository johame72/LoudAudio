const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType } = require('@discordjs/voice');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const streamURL = 'https://kexp.streamguys1.com/kexp160.aac';
const player = createAudioPlayer();

client.once('ready', () => {
    console.log('Bot is online and ready!');
});

client.on('messageCreate', message => {
    if (message.author.bot) return;

    if (message.content === '!play') {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply('Please join a voice channel first!');
        }

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });

        const resource = createAudioResource(streamURL, {
            inputType: StreamType.Arbitrary,
        });
        
        player.play(resource);
        connection.subscribe(player);

        return message.reply('Playing the stream!');
    }
});

const BOT_TOKEN = 'MTE0MDY0NTU2MTAxNjUyODk2MA.GmGW0l.U6PfhDlrZfSsXBguGUIS4wOz4AH5s2eicYdKIM';
client.login(BOT_TOKEN);
