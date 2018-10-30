'use strict';
// Load our environment variables
require('dotenv').load();

// Needed to get around self signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
// Needed for API.AI
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const APIAI_TOKEN = process.env.APIAI_TOKEN;
// Node includes
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const apiai = require('apiai');
const app = express();
// For FB Transcript
var fbTrans = [];
// For ABC
var zlib = require('zlib');
// Begin ECE
var eGainLibrarySettings = require('./egain/egainNode').eGainLibrarySettings;
var myLibrarySettings = new eGainLibrarySettings();
myLibrarySettings.CORSHost = "https://eceweb.cc.com/system";
myLibrarySettings.IsDevelopmentModeOn = false;
myLibrarySettings.eGainContextPath = "./";
var inChat = false;
var file = "";
/* Next create a new instance of the eGainLibrary */
/* passing in the settings you have just created. */
var eGainLibrary = require('./egain/egainNode').eGainLibrary;
var myLibrary = new eGainLibrary(myLibrarySettings);
myLibrary.CORSHost = "https://eceweb.cc.com/system";
/* Now create an instance of the Chat Object */
var myChat = new myLibrary.Chat();
/* Next get the event handlers for chat. It is mandatory to provide definition for the mandatory event handlers before initializing chat */
var myEventHandlers = myChat.GetEventHandlers();

// Data Structure for brokering FB connections
function FBUser(fname, lname, psid, avatar) {
    this._first_name = fname;
    this._last_name = lname;
    this._psid = psid;
    this._avatar = "";
    this._chat = null;
}
// Linked List Structure of FBUsers
function Node(data) {
    this.data = data;
    this.next = null;
}
 
function SinglyList() {
    this._length = 0;
    this.head = null;
}
 
SinglyList.prototype.add = function(value) {
    var node = new Node(value),
        currentNode = this.head;
 
    // 1st use-case: an empty list
    if (!currentNode) {
        this.head = node;
        this._length++;
 
        return node;
    }
    // 2nd use-case: a non-empty list
    while (currentNode.next) {
        currentNode = currentNode.next;
    }
    currentNode.next = node;
    this._length++;
    return node;
};
 
SinglyList.prototype.searchNodeAt = function(position) {
    var currentNode = this.head,
        length = this._length,
        count = 1,
        message = {failure: 'Failure: non-existent node in this list.'};
 
    // 1st use-case: an invalid position
    if (length === 0 || position < 1 || position > length) {
        throw new Error(message.failure);
    }
    // 2nd use-case: a valid position
    while (count < position) {
        currentNode = currentNode.next;
        count++;
    }
    return currentNode;
};
 
SinglyList.prototype.remove = function(position) {
    var currentNode = this.head,
        length = this._length,
        count = 0,
        message = {failure: 'Failure: non-existent node in this list.'},
        beforeNodeToDelete = null,
        nodeToDelete = null,
        deletedNode = null;
 
    // 1st use-case: an invalid position
    if (position < 0 || position > length) {
        throw new Error(message.failure);
    }
 
    // 2nd use-case: the first node is removed
    if (position === 1) {
        this.head = currentNode.next;
        deletedNode = currentNode;
        currentNode = null;
        this._length--;
         
        return deletedNode;
    }
 
    // 3rd use-case: any other node is removed
    while (count < position) {
        beforeNodeToDelete = currentNode;
        nodeToDelete = currentNode.next;
        count++;
    }
 
    beforeNodeToDelete.next = nodeToDelete.next;
    deletedNode = nodeToDelete;
    nodeToDelete = null;
    this._length--;
 
    return deletedNode;
};
/**
 * Function to make Callback request using HTTP POST
 * url     = url where request is made
 * data    = data to be sent
 * success = callback function to be executed in case of success
 * error   = callback function to be executed in case of error
 */
var callbackUsingHTTPPost = function(url,data,success,error)
{
    var xml = "<Contact>" +
        "<name>" + "Tyler Anderson" + "</name>" +
        "<title>" + "Callback Request" + "</title>" +
        "<mediaAddress>" + "+19783399244"  + "</mediaAddress>" +
        "<variables>";
        
    var cv1 = "Tyler Anderson";
    var cv2 = "5551212";	
    var cv3 = "San Jose, CA";
    var cv4 = "Goole Home Device";	
    var cv5 = "Cumulus LS4000";
    var cv7 = "Customer Initiated Callback";	
    var cv8 = "02:26";
    var cv9 = "Standard Custoomer Account";	
    xml = xml + "<variable><name>" + "cv_1" + "</name><value>" + cv1 + "</value>" + "<name>" + "cv_2" + "</name><value>" + cv2 + "</value>" + "<name>" + "cv_3" + "</name><value>" + cv3 + "</value>" + "<name>" + "cv_4" + "</name><value>" + cv4 + "</value>" + "<name>" + "cv_5" + "</name><value>" + cv5 + "</value></variable>";
                  
    
//    for ( variable in data.variables )
//    {
//        if ( data.variables[variable] && (data.variables[variable].length > 0) )
//        {
//            xml = xml + "<variable><name>" + variable + "</name><value>" + data.variables[variable] + "</value></variable>";
//        }
//    }
    xml = xml + "</variables></Contact>";
    url = "https://socialminer.cc.com/ccp/callback/feed/100180";
    makeRequest(url, xml, 'POST', success, error);		  
}
/**
 * Function to make ajax calls to SocialMiner
 * url     = url where request is made
 * data    = data to be sent
 * method  = GET/POST/PUT
 * success = callback function to be executed in case of success
 * error   = callback function to be executed in case of error
 */
var makeRequest = function(url,data,method,success,error)
{
    console.log("URL: " + url);
    console.log("Data: " + data);
    doContext();
    request({
            url: url,
            method: 'POST',
            body: data,
            headers: {
                "content-type": "application/xml",  // <--Very important!!!
            },
            }, (error, response) => {
                if (error) {
                    console.log('callSendAPI Error sending message: ', error);
                } else if (response.body.error) {
                    console.log('callSendAPI Error: ', response.body.error);
                }
    });
    //doContext();
}
var doContext = function()
{   
    console.log('In CS write pod');
    request({
            url: 'http://192.168.2.30:8080/ECC/rest/members/pod',
            method: 'GET',
            body: '',
            headers: {
                "content-type": "application/xml",  // <--Very important!!!
            },
            }, (error, response) => {
                if (error) {
                    console.log('callSendAPI Error sending message: ', error);
                } else if (response.body.error) {
                    console.log('callSendAPI Error: ', response.body.error);
                }
    });
}
// Initialize our Linked List of FB Users
var sl = new SinglyList();
var fbSender = null;
// ECE Parameters
var ChatEntryPointId = "1001";
var PhoneNumber = "";
var EmailAddress = "michael.littlefoot@cc.com";
var FirstName = "Michael";
var LastName = "Littlefoot";
var customerObject = null;
var sender_psid = "";

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const server = app.listen(process.env.PORT || 5000, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});
 
const apiaiApp = apiai(APIAI_TOKEN);

/* For Facebook Validation */
app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] && req.query['hub.verify_token'] === 'biamjack123') {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.status(403).end();
  }
});
// Index route
app.get('/', function (req, res) {
    res.send('Hello world, I am a chat bot');
});
// Accepts POST requests at /webhook endpoint
app.post('/callback', (req, res) => { 
    // Parse the request body from the POST
    let body = req.body;
    console.log('Callback initiated: ', body.toString());
     callbackUsingHTTPPost();
    // Check the webhook event is from a Page subscription
    if (body.object === 'page') 
    {
        //uncompressed = gzip.GzipFile(fileobj=fileobj, mode='rb') 
    }
});
// Accepts POST requests at /webhook endpoint
app.post('/message', (req, res) => { 
    // Parse the request body from the POST
    let body = req.body;
    // Check the webhook event is from a Page subscription
    if (body.object === 'page') 
    {
        //uncompressed = gzip.GzipFile(fileobj=fileobj, mode='rb') 
    }
});
// Accepts POST requests at /mobile endpoint for Android app
app.post('/mobile', (req, res) => { 
    // Parse the request body from the POST
    let body = req.body;
    console.log('Received Message from Android: ', JSON.parse(body).toString());
   
});
// Accepts POST requests at /webhook endpoint for Facebook
app.post('/webhook', (req, res) => {  

    // Parse the request body from the POST
    let body = req.body;
    console.log("Incoming: " + JSON.stringify(body));
    // Check the webhook event is from a Page subscription
    if (body.object === 'page') 
    {
        body.entry.forEach(function(entry) 
        {
            // Gets the body of the webhook event
            let webhook_event = entry.messaging[0];
            // Get the sender PSID
            sender_psid = webhook_event.sender.id;
            // Populate the Sender info
            let fbSender = getSenderInfo(sender_psid);
            var id = checkFBId(sender_psid);
            // Check if the event is a message or postback and
            // pass the event to the appropriate handler function
            if (webhook_event.message) {
                if(!inChat)
                {
                    sendMessage(webhook_event);
                    fbTrans.push("Customer: " + webhook_event.message.text + "\n");
                    //handleMessage(sender_psid, webhook_event.message);
                }
                else if(inChat && typeof(myChat !== 'undefined'))
                {
                    // Check for the sending of an attachment
                    if(webhook_event.message.attachments)
                    {
                        //handleMessage(sender_psid, webhook_event.message);
                        //myChat.getFileData(webhook_event.message.attachments[0].payload.url);
                        myChat._sendCustomerAttachmentNotification(webhook_event.message.attachments[0].payload.url, "Michael Littlefoot");
                    }
                    else
                    {
                        if(webhook_event.message.text === "goodbye")
                        {   
                            myChat.End();
                            inChat = false;
                        }
                        else
                            myChat.SendMessageToAgent(webhook_event.message.text);
                    }
                }
            } else if (webhook_event.postback) {

                handlePostback(sender_psid, webhook_event.postback);
            }
        });
        // Return a '200 OK' response to all events
        res.status(200).send('EVENT_RECEIVED');
    }
    else if (body.object === 'mobile') 
    {
        body.entry.forEach(function(entry) 
        {
            // Gets the body of the webhook event
            let webhook_event = entry.messaging[0];
            // Get the sender PSID
            sender_psid = webhook_event.sender.id;
            // Populate the Sender info
            //let fbSender = getSenderInfo(sender_psid);
            //var id = checkFBId(sender_psid);
            // Check if the event is a message or postback and
            // pass the event to the appropriate handler function
            if (webhook_event.message) {
                if(!inChat)
                {
                    console.log("Message: " + JSON.stringify(webhook_event.message.text));
                    if(!inChat)
                    {
                        sendTranscript();
                        escalateIt();
                        inChat = true;
                    }
                    fbTrans.push(webhook_event.message.text + '\n');
                    myChat.SendMessageToAgent(webhook_event.message.text);
                    //sendMessage(webhook_event);
                }
                else if(inChat && typeof(myChat !== 'undefined'))
                {
                    // Check for the sending of an attachment
                    if(webhook_event.message.attachments)
                    {
                        //handleMessage(sender_psid, webhook_event.message);
                        //myChat.getFileData(webhook_event.message.attachments[0].payload.url);
                        myChat._sendCustomerAttachmentNotification(webhook_event.message.attachments[0].payload.url, "Michael Littlefoot");
                    }
                    else
                    {
                        if(webhook_event.message.text === "goodbye")
                        {   
                            myChat.End();
                            inChat = false;
                        }
                        else
                            myChat.SendMessageToAgent(webhook_event.message.text);
                    }
                }
            } else if (webhook_event.postback) {

                handlePostback(sender_psid, webhook_event.postback);
            }
        });
        // Return a '200 OK' response to all events
        res.status(200).send('EVENT_RECEIVED');
    } else {
        // Check if coming from Android App
        console.log("Incoming: " + JSON.stringify(req.body));
        // Return a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }

});


function checkFBId(sender_psid) {
    if(sl.head !== null)
    {
        // Start searching at the first node
        var fbdata = sl.searchNodeAt(1);
        if(fbdata.data)
        {
            console.log("FB User: " + fbdata.data._first_name + " Last Name: " + fbdata.data._last_name + " PSID: " + fbdata.data._psid);
            if(fbdata.data._psid === sender_psid)
            {
                return sender_psid;
            }
        }
    }
    else
    {
        //var fbuser = new FBUser(fbSender['first_name'], fbSender['last_name'], sender_psid);
        var fbuser = new FBUser('Michael', 'Littlefoot', sender_psid);
        //console.log("Sender info: " + fbuser._first_name);
        sl.add(fbuser);
    }
    return sender_psid;
}
// http://192.168.2.30:8080/ECC/rest/members/transcript
// https://websvr.cc.com:8181/ECC-1.0-SNAPSHOT/rest/members/transcript
// Send transcript via REST to Context Service
function sendTranscript() {
    console.log('################## SENDING TRANSCRIPT! ###################' + fbTrans);
    request({
            url: 'http://192.168.2.30:8080/ECC/rest/members/transcript',
            method: 'POST',
            json: {
                Customer_Work_Email: "michael.littlefoot@cc.com", chat_transcript: fbTrans
            }
            }, (error, response) => {
                if (error) {
                    console.log('callSendAPI Error sending message: ', error);
                } 
    });
}
function callSendAPI(sender_psid, response) {
    if(sender_psid === '')
    {
        var fbdata = sl.searchNodeAt(1);
        sender_psid = fbdata.data._psid;
    }
    console.log("Message: " + JSON.stringify(response));
    fbTrans.push(response);
    request({
            url: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {access_token: PAGE_ACCESS_TOKEN},
            method: 'POST',
            json: {
                recipient: {id: sender_psid},
                message: JSON.stringify(response)
            }
            }, (error, response) => {
                if (error) {
                    console.log('callSendAPI Error sending message: ', error);
                } else if (response.body.error) {
                    console.log('callSendAPI Error: ', response.body.error);
                }
    });
}
// Dispatch function for ECE system messages
function dispatchMsg(sender_psid, response) {
    if(sender_psid === '')
    {
        var fbdata = sl.searchNodeAt(1);
        sender_psid = fbdata.data._psid;
    }
    request({
            url: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {access_token: PAGE_ACCESS_TOKEN},
            method: 'POST',
            json: {
                recipient: {id: sender_psid},
                message: {text: response}
            }
            }, (error, response) => {
                if (error) {
                    console.log('callSendAPI Error sending message: ', error);
                } else if (response.body.error) {
                    console.log('callSendAPI Error: ', response.body.error);
                }
    });
}
function handleMessage(sender_psid, received_message) {
    let response;

    // Checks if the message contains text
    if (received_message.text) {    
        // Create the payload for a basic text message, which
        // will be added to the body of our request to the Send API
        response = {
          "text": `You sent the message: "${received_message.text}". Now send me an attachment!`
        }
    } else if (received_message.attachments) {
        response = { 
            "attachment":
            {
                "type":"template",
                "payload":{
                    "template_type":"generic",
                    "elements":[
                        {
                            "title":"Welcome to Peter'\''s Hats",
                            "image_url":"https://capricorn.ucplanning.com",
                            "subtitle":"We'\''ve got the right hat for everyone.",
                            "default_action": {
                                "type": "web_url",
                                "url": "https://capricorn.ucplanning.com",
                                "messenger_extensions": true,
                                "webview_height_ratio": "tall",
                                "fallback_url": "https://capricorn.ucplanning.com"
                            },
                            "buttons":[
                                {
                                  "type":"web_url",
                                  "url":"https://capricorn.ucplanning.com",
                                  "title":"View Website"
                                },{
                                  "type":"postback",
                                  "title":"Start Chatting",
                                  "payload":"DEVELOPER_DEFINED_PAYLOAD"
                                }              
                            ]      
                        }
                    ]
                }
            }
        }
    }
    callSendAPI(sender_psid, response);
}
//function handleMessage(sender_psid, received_message) {
//      let response;
//
//      // Checks if the message contains text
//      if (received_message.text) {    
//        // Create the payload for a basic text message, which
//        // will be added to the body of our request to the Send API
//        response = {
//          "text": `You sent the message: "${received_message.text}". Now send me an attachment!`
//        }
//      } else if (received_message.attachments) {
//        // Get the URL of the message attachment
//        let attachment_url = received_message.attachments[0].payload.url;
//        response = {
//          "attachment": {
//            "type": "template",
//            "payload": {
//              "template_type": "generic",
//              "elements": [{
//                "title": "Is this the right picture?",
//                "subtitle": "Tap a button to answer.",
//                "image_url": attachment_url,
//                "buttons": [
//                  {
//                    "type": "postback",
//                    "title": "Yes!",
//                    "payload": "yes",
//                  },
//                  {
//                    "type": "postback",
//                    "title": "No!",
//                    "payload": "no",
//                  }
//                ],
//              }]
//            }
//          }
//        }
//    }
//    // Send the response message
//    callSendAPI(sender_psid, response); 
//}

function handlePostback(sender_psid, received_postback) {
    console.log('ok')
    let response;
    // Get the payload for the postback
    let payload = received_postback.payload;

    // Set the response based on the postback payload
    if (payload === 'yes') {
        response = { "text": "Thanks!" }
    } else if (payload === 'no') {
        response = { "text": "Oops, try sending another image." }
    }
    // Send the message to acknowledge the postback
    callSendAPI(sender_psid, response);
}
// Get the sender info from FB
function getSenderInfo(sender_psid) {
  
    // Send the HTTP request to the Messenger Platform
    request({
        "uri": "https://graph.facebook.com/v2.6/"+sender_psid+"?fields=first_name,last_name,profile_pic",
        "qs": { "access_token": PAGE_ACCESS_TOKEN },
        "method": "GET"
    }, (err, res) => {
        if (!err) {
            console.log('getSenderInfo message Received!' + res.body);
            return res.body;
        } else {
            console.error("getSenderInfo Unable to send message:" + err);
        }
    }); 
}
/* GET query from API.ai */

function sendMessage(event) {
    let sender = event.sender.id;
    let text = event.message.text;

    let apiai = apiaiApp.textRequest(text, {
        sessionId: '346d2f0c-60b9-470c-a7ed-6ca53c5cd7d4'
    });

    apiai.on('response', (response) => {
        console.log("API.AI: " + response.result.fulfillment.speech);
        let aiText = response.result.fulfillment.speech;
        fbTrans.push("Attendant: " + aiText + "\n");
        if(aiText === 'escalate') {
            sendTranscript();
            aiText = '';
            escalateIt();
            inChat = true;
            return;
        }
    
        request({
            url: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {access_token: PAGE_ACCESS_TOKEN},
            method: 'POST',
            json: {
                recipient: {id: sender},
                message: {text: aiText}
            }
            }, (error, response) => {
                if (error) {
                    console.log('SendMessage Error sending message: ', error);
                } else if (response.body.error) {
                    console.log('SendMessage Error: ', response.body.error);
                }
        });
    });

    apiai.on('error', (error) => {
        console.log(error);
    });

    apiai.end();
}

/* Webhook for API.ai to get response from the 3rd party API */
app.post('/ai', (req, res) => {
  console.log('*** Webhook for api.ai query ***');
  console.log(req.body.result);

  if (req.body.result.action === 'weather') {
    console.log('*** weather ***');
    let city = req.body.result.parameters['geo-city'];
    let restUrl = 'http://api.openweathermap.org/data/2.5/weather?APPID='+WEATHER_API_KEY+'&q='+city;

    request.get(restUrl, (err, response, body) => {
      if (!err && response.statusCode == 200) {
        let json = JSON.parse(body);
        console.log(json);
        let tempF = ~~(json.main.temp * 9/5 - 459.67);
        let tempC = ~~(json.main.temp - 273.15);
        let msg = 'The current condition in ' + json.name + ' is ' + json.weather[0].description + ' and the temperature is ' + tempF + ' ℉ (' +tempC+ ' ℃).'
        return res.json({
          speech: msg,
          displayText: msg,
          source: 'weather'
        });
      } else {
        let errorMessage = 'I failed to look up the city name.';
        return res.status(400).json({
          status: {
            code: 400,
            errorType: errorMessage
          }
        });
      }
    })
  }

});
/* Example browser alert when chat is connected */
myEventHandlers.OnConnectSuccess = function() {
    var welcomeMessage = "You are now connected to a Cumulus Financial Expert.";
    console.log("You are now connected to an Agent " + welcomeMessage);
    var fbdata = sl.searchNodeAt(1);
    if(fbdata.data)
    {
        dispatchMsg(fbdata.data._psid, welcomeMessage);
    }
    
};
/* Example browser alert when there is a connection failure */
myEventHandlers.OnConnectionFailure = function () {
    console.log('Oops! Something went wrong');
};
/* Example output of agent messages to a DIV named TransScript with jQuery */
myEventHandlers.OnAgentMessageReceived = function (agentMessageReceivedEventArgs) {
    console.log("Agent Message Received: " + agentMessageReceivedEventArgs.Message);
    var fbdata = sl.searchNodeAt(1);
    if(fbdata.data)
    {
        dispatchMsg(fbdata.data._psid, agentMessageReceivedEventArgs.Message);
    }
};
/* Example output of system messages to the same DIV */
myEventHandlers.OnSystemMessageReceived = function (systemMessageReceivedEventArgs) {
    console.log("System Message Received: " + systemMessageReceivedEventArgs.Message);
    var fbdata = sl.searchNodeAt(1);
    if(fbdata.data)
    {
        dispatchMsg(fbdata.data._psid, systemMessageReceivedEventArgs.Message);
    }
};
/* Example browser console.log when an error occurs */
myEventHandlers.OnErrorOccurred = function (chatErrorOccurredEventArgs) {
    console.log('Oops! Error Occurred' + chatErrorOccurredEventArgs.toString());
};
/* Example browser console.log when agents are not available */
myEventHandlers.OnAgentsNotAvailable = function (agentsNotAvailableEventArgs) {
    console.log('Sorry no agents available');
};
/* Example browser console.log when the chat is completed */
myEventHandlers.OnConnectionComplete = function () {
    //$.mobile.changePage("#WithParametersPostChatScreen")
    console.log("Connection Complete!");
};
/* Example of adding message in transcript when customer attachment invite is sent to server */
myEventHandlers.OnCustomerAttachmentNotificationSent = function(customerAttachmentNotificationSentEventArgs){
    var fbdata = sl.searchNodeAt(1);
    if(fbdata.data)
    {
        dispatchMsg(fbdata.data._psid, "Waiting for agent to accept attachment");
    }
};
/* Example of uploading attachment to chat server when agent accepts attachment invite */
myEventHandlers.OnAttachmentAcceptedByAgent = function(attachmentAcceptedByAgentEventArgs){
    file.uniqueFileId = attachmentAcceptedByAgentEventArgs.uniqueFileId;
    myChat.UploadAttachment(file,attachmentAcceptedByAgentEventArgs.agentName);
};
/* Example of sending notification to chat server when customer accepts attachment invite */
myEventHandlers.OnAttachmentInviteReceived = function(attachmentInviteReceivedEventArgs){
    var acceptBtn = document.createElement('input');
    acceptBtn.type = "button";
    acceptBtn.value="Accept";
    acceptBtn.addEventListener('click', function(){
            sendAcceptChatAttachmentNotification(attachmentInviteReceivedEventArgs.Attachment);
    });
    $('#messages ul').append( '<li><span class="systemmsg-chat">' + attachmentInviteReceivedEventArgs.Attachment.AgentName + " has sent attachment "+attachmentInviteReceivedEventArgs.Attachment.Name + '</span><div class="clear"></div></li>');
    $('#messages ul').append(acceptBtn);
};
/* Example of downloading file when attachment is fetched from server */
myEventHandlers.OnGetAttachment = function(AgentAttachmentArgs){
    if (typeof fileName !== 'undefine' && fileName !== null) {
        if ((/\.(gif|jpg|jpeg|tiff|png)$/i).test(fileName)) {
                myChat.GetAttachmentImage(AgentAttachmentArgs.fileId,AgentAttachmentArgs.uniqueFileId);
        }
        else{
                var data = AgentAttachmentArgs.data;
                var blob = new Blob([data]);  
                url = window.URL || window.webkitURL;
                var fileUrl = url.createObjectURL(blob);
                window.open(fileUrl);
        }
    }

};
/* Example of downloading file when attachment thumbnail is fetched from server */
myEventHandlers.OnGetAttachmentImageThumbnail = function(thumbnailArgs){
    var thumbnailElement = document.createElement('img');
    thumbnailElement.src = thumbnailArgs.data;
    $('#messages ul').append("<br />");
    $('#messages ul').append(thumbnailElement);
};
function sendAcceptChatAttachmentNotification(attachment){
    fileName = attachment.Name;
    myChat.SendAcceptChatAttachmentNotification(attachment.Id,attachment.Name);
    myChat.GetAttachment(attachment.Id);
};
function escalateIt()
{
    /* Create the customer object */
    inChat = true;
    customerObject =  new myLibrary.Datatype.CustomerObject();
    customerObject.SetPrimaryKey(customerObject.PrimaryKeyParams.PRIMARY_KEY_EMAIL,EmailAddress);


    var customerFirstName = new myLibrary.Datatype.CustomerParameter();
    customerFirstName.eGainParentObject = "casemgmt";
    customerFirstName.eGainChildObject = "individual_customer_data";
    customerFirstName.eGainAttribute = "first_name";
    customerFirstName.eGainValue = FirstName;
    customerFirstName.eGainParamName = "first_name";
    customerFirstName.eGainMinLength = "1";
    customerFirstName.eGainMaxLength = "50";
    customerFirstName.eGainRequired = "1";
    customerFirstName.eGainFieldType = "1";
    customerFirstName.eGainPrimaryKey = "0";
    customerFirstName.eGainValidationString = "";
    customerObject.AddCustomerParameter(customerFirstName);

    var customerLastName = new myLibrary.Datatype.CustomerParameter();
    customerLastName.eGainParentObject = "casemgmt";
    customerLastName.eGainChildObject = "individual_customer_data";
    customerLastName.eGainAttribute = "last_name";
    customerLastName.eGainValue = LastName;      
    customerLastName.eGainParamName = "last_name";
    customerLastName.eGainMinLength = "1";
    customerLastName.eGainMaxLength = "50";
    customerLastName.eGainRequired = "1";
    customerLastName.eGainFieldType = "1";
    customerLastName.eGainPrimaryKey = "0";
    customerLastName.eGainValidationString = "";
    customerObject.AddCustomerParameter(customerLastName);

    var customerEmail = new myLibrary.Datatype.CustomerParameter();
    customerEmail.eGainParentObject = "casemgmt";
    customerEmail.eGainChildObject = "email_address_contact_point_data";
    customerEmail.eGainAttribute = "email_address";
    customerEmail.eGainValue = EmailAddress;      
    customerEmail.eGainParamName = "email_address";
    customerEmail.eGainMinLength = "1";
    customerEmail.eGainMaxLength = "50";
    customerEmail.eGainRequired = "1";
    customerEmail.eGainFieldType = "1";
    customerEmail.eGainPrimaryKey = "1";
    customerEmail.eGainValidationString = "";
    customerObject.AddCustomerParameter(customerEmail);

    /* Now call the Chat initiliaztion method with your entry point and callbacks */
    /* Now create an instance of the Chat Object */
    //myChat = myLibrary.myChat;
    /* Next get the event handlers for chat. It is mandatory to provide definition for the mandatory event handlers before initializing chat */
    //myEventHandlers = myChat.GetEventHandlers();
    myChat.Initialize(ChatEntryPointId,'en', 'US', myEventHandlers, 'aqua', 'v11');
    /*Now set the customer */
    myLibrary.SetCustomer(customerObject);
    myChat.Start();
}

