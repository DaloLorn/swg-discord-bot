const Discord = require('discord.js');
const SWG = require('./swgclient');
const config = require('./config');
SWG.params = config.Params;
SWG.login(config.SWG);

function toUpper(str) {
return str.substr(0, 1).toUpperCase() + str.substr(1);
}

var client, server, notif, chat, notifRole, currentChannel, lastPM;
lastPM = '';
currentChannel = 0;
function discordBot() {
    client = new Discord.Client();

    client.on('message', message => {
        if (message.content.startsWith('!server')) {
            message.reply(SWG.isConnected ? "The server is UP!" : "The server is DOWN :(");
		return;
        }
        if (message.content.startsWith('!fixchat')) {
            message.reply("rebooting chat bot");
            process.exit(0);
        }
        if (message.content.startsWith('!pausechat')) {
            message.reply(SWG.paused ? "unpausing" : "pausing");
            SWG.paused = !SWG.paused;
		return;
        }
	if (message.content.startsWith('/t')) {
		var destination = message.content.split(' ')[1].toLowerCase();
		message.reply("Message to \"" + destination + "\" sent!");
		SWG.sendTell(destination, message.content.substr(1 + message.content.split(' ')[0].length + destination.length));
		return;
	}
	if (message.content.startsWith('/r')) {
		message.reply("Reply sent to \"" + lastPM + "\"!");
		SWG.sendTell(lastPM, message.content.substr(1 + message.content.split(' ')[0].length));
		return;
	}
	if(message.content.startsWith('!who')) {
		SWG.sendWho(currentChannel);
		return;
	}
	if(message.content.startsWith('!goto')) {
		var target = message.content.split(' ')[1];
		if(SWG.params.ChatRooms.includes(target)) {
			currentChannel = SWG.params.ChatRooms.indexOf(target);
			server.fetchMember(client.user).then((member) => {
				member.setNickname(config.Discord.BotNickname + " (" + SWG.params.ChatRooms[currentChannel] + ")");
			});
		}
		return;
	}
        if (message.channel.name != config.Discord.ChatChannel) return;
        if (message.author.username.toLowerCase() == config.Discord.BotName.toLowerCase()) return;
        SWG.sendChat(message.cleanContent, server.members.get(message.author.id).displayName, currentChannel);
    });

    client.on('disconnect', event => {
        try {notif.send("RoC-Bot disconnected");}catch(ex){}
        client = server = notif = chat = notifRole = null;
        console.log("Discord disconnect: " + JSON.stringify(event,null,2));
        setTimeout(discordBot, 1000);
    });

    client.login(config.Discord.BotToken)
        .then(t => {
            client.user.setPresence({ status: "online", game: {name: "Progor-Chat"}});
            server = client.guilds.find("name", config.Discord.ServerName);
		server.fetchMember(client.user).then((member) => {
			member.setNickname(config.Discord.BotNickname + " (" + SWG.params.ChatRooms[currentChannel] + ")");
		});
            notif = server.channels.find("name", config.Discord.NotificationChannel);
            chat = server.channels.find("name", config.Discord.ChatChannel);
            notifRole = server.roles.find("name", config.Discord.NotificationMentionRole);
        })
        .catch(reason => {
            console.log(reason);
            setTimeout(discordBot, 1000);
        });
}
discordBot();

SWG.serverDown = function() {
    if (notif) notif.send(notifRole + " server DOWN");
}

SWG.serverUp = function() {
    if (notif) notif.send(notifRole + " server UP!");
}

SWG.reconnected = function() {
    if (chat) chat.send("chat bot reconnected");
}

SWG.recvChat = function(message, player, roomID) {
	SWG.pingAttempts = 0;
    console.log("received chat from channel " + SWG.params.ChatRooms[roomID] + ", player " + toUpper(player) + ": " + message);
    if (chat) chat.send("**[" + SWG.params.ChatRooms[roomID] + "] " + toUpper(player) + ":**  " + message);
    else console.log("discord disconnected");
}

SWG.recvTell = function(from, message) {
	SWG.pingAttempts = 0;
    console.log("received tell from: " + from + ": " + message);
	if (from != SWG.params.Character) {
	chat.send("**Received tell from " + toUpper(from) + ":**  " + message);
	lastPM = from;
	}
}

SWG.recvWho = function(data, roomID) {
	console.log("Received population of channel " + SWG.params.ChatRooms[roomID]);
	console.log(data.Players);
	var output = "**Channel " + SWG.params.ChatRooms[roomID] + " contains the following players:**```";
	for(var player in data.Players) {
		output += toUpper(data.Players[player]) + ", ";
	}
	output += "```";
	chat.send(output);
}

setInterval(() => {
	SWG.sendTell(SWG.params.Character, "ping");
	SWG.pingAttempts++;
}, 30000);