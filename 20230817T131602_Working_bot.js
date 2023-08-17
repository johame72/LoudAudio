process.env.FFMPEG_PATH = "C:\\Users\\johnn\\AppData\\Local\\Discord\\LoudAudio\\ffmpeg-master-latest-win64-gpl\\bin\\ffmpeg.exe";

const Discord = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, entersState, StreamType, AudioPlayerStatus, VoiceConnectionStatus, NoSubscriberBehavior } = require('@discordjs/voice');

const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.GuildVoiceStates,
    Discord.GatewayIntentBits.MessageContent,
    Discord.GatewayIntentBits.GuildMembers // <-- Add this if it's missing
  ]
  
});

const stations = {
  1: 'https://kexp.streamguys1.com/kexp160.aac',
  2: 'http://media-ice.musicradio.com/ClassicFMMP3',
  3: 'http://kdhx-ice.streamguys1.com/live',
  4: 'http://kdhx-ice.streamguys1.com/live-AAC'
};

let currentStation = stations[1];
let currentConnection = null;
let retryCount = 0;
const MAX_RETRIES = 3;
const streamTypesToTry = [StreamType.OggOpus, StreamType.Arbitrary];

const player = createAudioPlayer({
  behaviors: {
    noSubscriber: NoSubscriberBehavior.Pause,
  },
});

const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
let idleTimeout;

const clearIdleTimeout = () => {
  if (idleTimeout) {
    clearTimeout(idleTimeout);
    idleTimeout = null;
  }
};

player.on('error', error => {
  console.error(`Error in audio player: ${error.stack}`);
});

client.once('ready', () => {
  console.log('Bot is online and ready!');
});

player.on(AudioPlayerStatus.Idle, (oldState, newState) => {
  console.log('Audio player is idle. Setting idle timeout.');
  clearIdleTimeout();
  idleTimeout = setTimeout(() => {
    console.log('Idle timeout reached. Destroying connection.');
    newState.connection?.destroy();
    currentConnection = null; // Reset the connection
  }, IDLE_TIMEOUT_MS);
});

const setupConnectionListeners = (connection) => {
  if (currentConnection) {
    currentConnection.removeAllListeners(VoiceConnectionStatus.Disconnected);
    currentConnection.removeAllListeners(VoiceConnectionStatus.Failed);
  }

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    console.warn('Connection got disconnected, attempting to reconnect...');
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5e3),
        entersState(connection, VoiceConnectionStatus.Connecting, 5e3),
      ]);
      console.log('Successfully reconnected.');
    } catch (error) {
      console.error('Failed to reconnect within 5 seconds:', error);
      connection.destroy();
      currentConnection = null;
    }
  });

  connection.on(VoiceConnectionStatus.Failed, (error) => {
    console.error('Connection failed:', error);
  });

  currentConnection = connection;
};

client.on('messageCreate', async message => {
  clearIdleTimeout();
  console.log(`Received message from ${message.author.tag}: "${message.content}"`);
  if (message.author.bot) return;

  if (message.content === '!startmusic' || message.content === '!start') {
    if (!message.guild || !message.member?.voice?.channel) {
      return message.reply('Please join a voice channel first!');
    }
    const voiceChannel = message.member.voice.channel;
    if (voiceChannel.type === 'GUILD_STAGE_VOICE') {
      return message.reply('I cannot play audio in a stage channel.'); 
    }
    const connection = currentConnection || joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator, 
    });
    setupConnectionListeners(connection);
    const resource = createAudioResource(currentStation, {
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
      currentConnection = null;
    }
  } else if (message.content.startsWith('!changestation')) {
    const stationNum = message.content.split(' ')[1];
    if (stations[stationNum]) {
      currentStation = stations[stationNum];
      message.reply(`Changed station to ${stationNum}`);
      if (player.state.status !== AudioPlayerStatus.Idle) {
        player.stop();
        const resource = createAudioResource(currentStation, {
          inputType: StreamType.Arbitrary
        });
        player.play(resource);
        if (message.guild && message.guild.me && message.guild.me.voice.connection) {
          message.guild.me.voice.connection.subscribe(player);
        }
      }
    } else {
      message.reply('Invalid station number!');
    }
  } else if (message.content === '!pause' || message.content === '!paws') {
    player.pause();
    message.reply('Paused the music.');
  } else if (message.content === '!unpause' || message.content === '!unpaws') {
    player.unpause();
    message.reply('Resumed the music.');
  } else if (message.content === '!stop' || message.content === '!stawp') {
    player.stop();
    message.reply('Stopped the music.');
  } else if (message.content === '!volumemax' || message.content === '!vawlumemax') {
    if (resource) {
      resource.volume.setVolume(1);
      message.reply('Set volume to maximum.');
    } else {
      message.reply('No audio resource found.');
    }
  }
});

client.on('error', error => {
  console.error(`Error in client: ${error.stack}`);
});

const BOT_TOKEN = 'MTE0MDY0NTU2MTAxNjUyODk2MA.GmGW0l.U6PfhDlrZfSsXBguGUIS4wOz4AH5s2eicYdKIM';
client.login(BOT_TOKEN);
