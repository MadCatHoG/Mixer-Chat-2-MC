/*

Mixer chat to Minecraft integration
by MadCat (mixer.com/MadCat, youtube.com/MadCatHoG, twitter.com/MadCatHoG)

*/

const Mixer = require('beam-client-node');
const ws = require('ws');
const Rcon = require('./node-rcon').newHandle;
const fs = require('fs');

let userInfo;
settingsFileName="settings.json"
filteredWordsFileName="terms-to-block-v2.json"

//User config, change it on your settings.json file in this folder.
var settingsFile = fs.readFileSync(settingsFileName);
var settings = JSON.parse(settingsFile);
var serverIp    = settings['serverIp'];
var rconPort    = settings['rconPort'];
var rconPassword= settings['rconPassword'];
var streamerIGN = settings['streamerIGN'];
var botName     = settings['botName'];
var initMessage = settings['initMessage'];
var accessKey   = settings['accessKey'];
// Word filter config
var filteredWordsFile = fs.readFileSync(filteredWordsFileName);
var punishTime = '30s'; //This was intended for auto time out

var filter = JSON.parse(filteredWordsFile);
var messageApproved = true;

const rcon = new Rcon();
const client = new Mixer.Client(new Mixer.DefaultRequestRunner());

// With OAuth we don't need to log in. The OAuth Provider will attach
// the required information to all of our requests after this call.
client.use(new Mixer.OAuthProvider(client, {
    tokens: {
        access: accessKey,
        expires: Date.now() + (365 * 24 * 60 * 60 * 1000)
    },
}));

// Gets the user that the Access Token we provided above belongs to.
client.request('GET', 'users/current')
.then(response => {
    userInfo = response.body;
    return new Mixer.ChatService(client).join(response.body.channel.id);
})
.then(response => {
    const body = response.body;
    return createChatSocket(userInfo.id, userInfo.channel.id, body.endpoints, body.authkey);
})
.catch(error => {
    console.error('Something went wrong.');
    console.error(error);
});

/**
 * Creates a Mixer chat socket and sets up listeners to various chat events.
 * @param {number} userId The user to authenticate as
 * @param {number} channelId The channel id to join
 * @param {string[]} endpoints An array of endpoints to connect to
 * @param {string} authkey An authentication key to connect with
 * @returns {Promise.<>}
 */
function createChatSocket (userId, channelId, endpoints, authkey) {
    // Chat connection
    const socket = new Mixer.Socket(ws, endpoints).boot();

    //Mixer Chat sent to Minecraft through Rcon and tellraw
    socket.on('ChatMessage', data => {
        messageApproved=true;
        console.log(data.message);
        var flatMessage = "";
        //This method extracts only the text from the message object
        data.message.message.forEach(function(msgObject) {
            flatMessage = flatMessage + msgObject.text;
        })
        console.log("Flat msg:"+flatMessage);
        //Every message is checked against a list of bad words, 
        //the messages won't go through unless they are approved
        filter['filter'].forEach(function(word) {
            if (flatMessage.indexOf(word) !== -1){
                console.log(`${data.user_name} said a word not approved in the filter: ${word}`);
                messageApproved=false;
            };
        });

        /*
        The following rules were applied to not send messages to the player:
        - Messages starting with !
        - Messages from your bot
        - Messages from users below level 15 (except marasbaras)
        */

        if (flatMessage.toLowerCase().startsWith('!')) {
            console.log("Message ignored. Reason: it is a command");
        }else if (data.user_name==botName) {
            console.log("Message ignored. Reason: Bot account");
        }else if (data.user_level<15&&data.user_name!="marasbaras") {
            console.log("Message ignored. Reason: Low level account");
        }else if (messageApproved){
            rcon.connect(serverIp, rconPort, rconPassword, onConnected);
            function onConnected(err, response){
                if(err){console.error(err);return;}
                console.log("rcon connected", response);
                //Escaping quotes
                flatMessage = flatMessage.replace(/"/g, `'`);
                trUser = ' ["",{"text":"'+data.user_name+'['+data.user_level+']:","bold":false,"color":"green"}';
                trMessage = ',{"text":" '+flatMessage+'","bold":false}]';
                //Different format when using /me
                if (data.message.meta.me) {
                    trUser = ' ["",{"text":"'+data.user_name+'","bold":true,"italic":true}';
                    trMessage = ',{"text":" '+flatMessage+'","italic":true}]';
                };
                //Different format when someone follows
                if (data.user_name=="HypeBot") {
                    trUser = ' ["",{"text":"\n'+data.user_name+':","bold":true,"color":"red"}';
                    trMessage = ',{"text":" '+flatMessage+'\n","bold":true}]';
                };
                //Different message if someone whispers at the streamer
                if (data.message.meta.whisper) {
                    trUser = ' ["",{"text":"A user","bold":true,"italic":true}';
                    trMessage = ',{"text":" has whispered to you","bold":true,"italic":true}]';
                };
                tellraw = 'tellraw '+streamerIGN + trUser + trMessage;
                rcon.sendCommand(tellraw, function(err, response){
                console.log("result:", err, response);  
                });
                rcon.end();
            }
        }
    });

    //Command to associate your Mixer Id and Minecraft IGN
    socket.on('ChatMessage', data => {
        if (data.message.message[0].data.toLowerCase().startsWith('!ign')) {
                console.log(`${data.user_name} has used command: IGN`);
        };
    });

    // Handle errors
    socket.on('error', error => {
        console.error('Socket error');
        console.error(error);
    });

    return socket.auth(channelId, userId, authkey)
    .then(() => {
        console.log('Login successful');
        return socket.call('msg', [initMessage]);
    });
}
