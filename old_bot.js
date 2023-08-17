const Discord = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, entersState, StreamType, AudioPlayerStatus, VoiceConnectionStatus, NoSubscriberBehavior } = require('@discordjs/voice');

const client = new Discord.Client({ 
    intents: [
        Discord.GatewayIntentBits.Guilds, 
        Discord.GatewayIntentBits.GuildMessages, 
        Discord.GatewayIntentBits.MessageContent
    ] 
});

const player = createAudioPlayer({
    behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause,
    },
});

player.on('error', error => {
    console.error(`Error in audio player: ${error.message}`);
});

client.once('ready', () => {
    console.log('Bot is online and ready!');
});

player.on(AudioPlayerStatus.Idle, (oldState, newState) => {
    console.log('Audio player is idle. Destroying connection.');
    newState.connection?.destroy();
});

const setupConnectionListeners = (connection) => {
    connection.on(VoiceConnectionStatus.Disconnected, () => {
        console.error('Connection got disconnected.');
    });

    connection.on(VoiceConnectionStatus.Failed, () => {
        console.error('Connection failed.');
    });
};

let resource; // Declare a variable to store the audio resource

client.on('messageCreate', async message => {
    console.log(`Received message from ${message.author.tag}: "${message.content}"`);

    if (message.author.bot) return;

    if (message.content === '!startmusic') {
        if (!message.guild || !message.member?.voice?.channel) {
            return message.reply('Please join a voice channel first!');
        }

        const voiceChannel = message.member.voice.channel;
        if (voiceChannel.type === 'GUILD_STAGE_VOICE') {
            return message.reply('I cannot play audio in a stage channel.');
        }

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });

        setupConnectionListeners(connection);

        resource = createAudioResource('http://media-ice.musicradio.com/ClassicFMMP3', {
            inputType: StreamType.Arbitrary
        });

        player.play(resource);
        connection.subscribe(player);

        try {
            await entersState(player, AudioPlayerStatus.Playing, 5e3);
            message.reply('Playing now!');
        } catch (error) {
            console.error(`Failed to play the audio: ${error}`);
            message.reply('Failed to play the audio. Please try again later.');
            connection.destroy();
        }
    }

    if (message.content === '!pause') {
        player.pause();
        message.reply('Paused the music.');
    }

    if (message.content === '!unpause') {
        player.unpause();
        message.reply('Resumed the music.');
    }

    if (message.content === '!stop') {
        player.stop();
        message.reply('Stopped the music.');
    }

    if (message.content === '!volumemax') {
        if (resource) {
            resource.volume.setVolume(1);
            message.reply('Set volume to maximum.');
        } else {
            message.reply('No audio resource found.');
        }
    }
});

client.on('error', error => {
    console.error(`Error in client: ${error.message}`);
});

const BOT_TOKEN = 'MTE0MDY0NTU2MTAxNjUyODk2MA.GmGW0l.U6PfhDlrZfSsXBguGUIS4wOz4AH5s2eicYdKIM'; // Replace with your bot token
client.login(BOT_TOKEN);
