require('dotenv').config();

const Discord = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  entersState,
  StreamType,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  NoSubscriberBehavior
} = require('@discordjs/voice');

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

player.on('error', error => {
  console.error(`Error in audio player: ${error.stack}`);
});

client.once('ready', () => {
  console.log('Bot is online and ready!');
});

player.on(AudioPlayerStatus.Idle, (oldState, newState) => {
  console.log('Audio player is idle.');

  const timePlayed = newState.playbackDuration;

  if (timePlayed < 5000 && streamTypesToTry.length > 0) { 
    console.log('Stream ended quickly. Trying a different StreamType.');
    playStream(currentStation, newState.connection);
    return;
  }

  console.log('Destroying connection due to idleness.');
  newState.connection?.destroy();
  currentConnection = null;
});

const setupConnectionListeners = (connection) => {
  connection.on(VoiceConnectionStatus.Disconnected, (oldState, newState) => {
    console.error('Connection got disconnected.', { oldState, newState });
  });

  connection.on(VoiceConnectionStatus.Failed, (error) => {
    console.error('Connection failed.', error);
  });
};

const playStream = (station, connection) => {
  const streamType = streamTypesToTry.shift();

  if (!streamType) {
    console.error('Tried all stream types and none worked.');
    return;
  }

  console.log(`Attempting to play stream with type: ${streamType}`);

  const resource = createAudioResource(station, {
    inputType: streamType,
    inlineVolume: true,
    highWaterMark: 256
  });

  player.play(resource);
  connection.subscribe(player);
};

client.on('messageCreate', async message => {
  console.log(`Received message from ${message.author.tag}: "${message.content}"`);

  if (message.author.bot) return;

  if (message.content === '!startmusic' || message.content === '!start') {
    if (!message.guild) {
      return message.reply('This command can only be used in a server.');
    }

    const member = await message.guild.members.fetch(message.author.id);
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel) {
      return message.reply('Please join a voice channel first!');
    }

    if (voiceChannel.type === 'GUILD_STAGE_VOICE') {
      return message.reply('I cannot play audio in a stage channel.');
    }

    let connection = voiceChannel.guild.me.voice?.connection;
    if (!connection) {
      connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });

      setupConnectionListeners(connection);
    }

    // Reset the stream types to try for each play command
    streamTypesToTry = [StreamType.OggOpus, StreamType.Arbitrary];

    playStream(currentStation, currentConnection);

  } 
  else if (message.content.startsWith('!changestation')) {
    const stationNum = message.content.split(' ')[1];

    if (stations[stationNum]) {
        currentStation = stations[stationNum];
        message.reply(`Changed station to ${stationNum}`);

        if (player.state.status !== AudioPlayerStatus.Idle) {
            player.stop();
            streamTypesToTry = [StreamType.OggOpus, StreamType.Arbitrary]; // Reset the stream types to try
            playStream(currentStation, connection);
        }
    } else {
        message.reply('Invalid station number!');
    }
}
else if (message.content === '!pause' || message.content === '!paws') {
    player.pause();
    message.reply('Paused the music.');
}
else if (message.content === '!unpause' || message.content === '!unpaws') {
    player.unpause();
    message.reply('Resumed the music.');
}
else if (message.content === '!stop' || message.content === '!stawp') {
    player.stop();
    message.reply('Stopped the music.');
}
else if (message.content === '!volumemax' || message.content === '!vawlumemax') {
    if (resource) {
        resource.volume.setVolume(1);
        message.reply('Set volume to maximum.');
    } else {
        message.reply('No audio resource found.');
    }
}

  else if (message.content === '!info') {
    message.reply('LoudAudio Bot is running and ready to play music! Use !start to play or !stop to stop.');
  }
});

client.on('disconnect', () => {
  console.log('Bot disconnected from Discord.');
});

client.on('reconnecting', () => {
  console.log('Bot is reconnecting to Discord...');
});

client.on('error', error => {
  console.error(`Error in client: ${error.message}`);
});

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
client.login(BOT_TOKEN);

console.log('Bot script executed. Waiting for events...');
