/* Create a new instance of the eGainLibrarySettings Object */
'use strict';
var eGainLibrarySettings = require('./egainNode').eGainLibrarySettings;
var myLibrarySettings = new eGainLibrarySettings();
myLibrarySettings.CORSHost = "https://eceweb.cc.com/system";
myLibrarySettings.IsDevelopmentModeOn = false;
myLibrarySettings.eGainContextPath = "./";
/* Next create a new instance of the eGainLibrary */
/* passing in the settings you have just created. */
var eGainLibrary = require('./egainNode').eGainLibrary;
var myLibrary = new eGainLibrary(myLibrarySettings);
myLibrary.CORSHost = "https://eceweb.cc.com/system";
//var sendAPI = require('../webhook.js');
var myTranscript = [];
var chatIndex = 0;
var botIndex = 0;
var temp = {};
var file = "";
var fileName = "";
var agentName = "";
var cobrowseConfig = [];
/* Now create an instance of the Chat Object */
var myChat = new myLibrary.Chat();
/* Next get the event handlers for chat. It is mandatory to provide definition for the mandatory event handlers before initializing chat */
var myEventHandlers = myChat.GetEventHandlers();

/* Example browser alert when chat is connected */
myEventHandlers.OnConnectSuccess = function() {
    var welcomeMessage = "You are now connected to a Cumulus Financial Expert.";
    console.log("You are now connected to an Agent " + welcomeMessage);
    //sendAPI('', welcomeMessage);
};

/* Example browser alert when there is a connection failure */
myEventHandlers.OnConnectionFailure = function () {
    console.log('Oops! Something went wrong');
};

/* Example output of agent messages to a DIV named TransScript with jQuery */
myEventHandlers.OnAgentMessageReceived = function (agentMessageReceivedEventArgs) {
    console.log("Agent Message Received: " + agentMessageReceivedEventArgs.Message);
};
/* Example output of system messages to the same DIV */
myEventHandlers.OnSystemMessageReceived = function (systemMessageReceivedEventArgs) {
    console.log("System Message Received: " + systemMessageReceivedEventArgs.Message);
    sendAPI('', systemMessageReceivedEventArgs.Message);
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
    $('#messages ul').append( '<li><span class="systemmsg-chat">' + "Waiting for agent to accept attachment" + '</span><div class="clear"></div></li>');

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
// We need to get a shortcode first from REM
function getShort() {
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
        if(request.readyState == 4) {
            if(request.status == 200) {
                var shortcode = JSON.parse(request.responseText).shortCode;
                start(shortcode);
            }
        }
    }
    request.open('PUT', 'https://remobile.cc.com:8443/assistserver/shortcode/create', true);
    request.send();
}
var start = function(shortcode) {
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
        if(request.readyState == 4) {
            if(request.status == 200) {
                var response = JSON.parse(request.responseText);
                cobrowseConfig.sessionToken = response['session-token'];
                //console.log("ShortCode: " + shortcode);
                cobrowseConfig.correlationId = response['cid'];
                AssistSDK.startSupport({correlationId : cobrowseConfig.correlationId});
            }
        }
    }
    request.open('GET', 'https://remobile.cc.com:8443/assistserver/shortcode/consumer?appkey=' + shortcode, true);
    request.send();
}
// Sending the Transcript for the interaction between customer and Bot
function sendTranscript(tranScript) {
    var baseUrl = "https://websvr.cc.com:8181/ECC-1.0-SNAPSHOT/rest/members/transcript";
    $.ajax({
            type: "POST",
            url: baseUrl ,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            data: JSON.stringify({ "Customer_Work_Email": "michael.littlefoot@cc.com", "chat_transcript" : tranScript}),
            success: function(data) {
                   //console.log("Successfully sent Transcript"); 
            },
            error: function() {
                    //console.log("Error Sending Transcript");
            }
    });
}
module.exports = {
    myLibrary: myLibrary,
    myChat: myChat
}
