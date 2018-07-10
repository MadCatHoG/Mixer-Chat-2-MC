# Mixer chat to Minecraft

A simple bot integration to send relevant chat from your Mixer stream to your Minecraft server. The messages will only be visible to the streamer so it could be used in a multiplayer server.

To set it up you are going to need to configure the following things on Mixer, your Minecraft Server and Bot.

# Access Key for your Bot.
To call Mixer APIs, you'll first need to create an OAuth application. 
https://mixer.com/lab/oauth
Obtain your access key.

# Minecraft RCON Configuration.
Change your server.properties file
Change -> enable-rcon=true
add -> rcon.password=yourPassword
add -> rcon.port=from 5000 to 65000
Restart your minecraft server. When loading your should have a message like:
[20:44:30] [RCON Listener #1/INFO]: RCON running on 0.0.0.0:32600

# Setting up NodeJS and config file.
Install Node JS
Download the bot files
Using console on the same folder run:
npm install

After everything is ready change your settings in settings.json
{
	"serverIp":"your minecraft server ip or hostname",
	"rconPort":30002, <- must be numeric
	"rconPassword":"your rcon pass", <- must be string
	"streamerIGN":"_MadCat", <- Your Minecraft IGN
	"botName":"MadCatBot", <- Your Mixer bot name
	"initMessage":"Mixer chat ready!", <- Message when this bot connects to Mixer
	"accessKey":"your access key from https://mixer.com/lab/oauth"
}

# Run it
node minecraft_mixer_chat.js