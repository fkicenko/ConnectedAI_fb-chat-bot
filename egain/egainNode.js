/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
// Requirements for Strophe Initialization
var strophe = require("node-strophe").Strophe;
var Strophe = strophe.Strophe;
var jquery = require('jquery');
var $ = jquery;
var fs = require('fs');
/**
 * This eGainLibrarySettings defines the settings with which the Library is initialized. 
 *      It can be used run the library in development mode and define CORS host.
 */
 eGainLibrarySettings = function () {
    this.IsDevelopmentModeOn = false;
    this.IsDebugOn = false;
    this.CORSHost = "";
    this.ChatPauseInSec = 30;
    this.eGainContextPath = "";
};


/* This parameter has been set for cobrowse identification 
 * No window... need to hack this.
*/
egChatFrameIdentifier = 2;
//eGainLibrarySettings = eGainLibrarySettings;

/**
 * This is the core of the eGain JavaScript Library. Create
 *      a local instance of this class passing in the appropriate settings you wish to use with the library.
 * @param {librarySettings} The instance of the eGainLibrarySettings object you created and set the properties of. This includes proxy configuration information.
 * @returns {eGainLibrary} An instance of the eGainLibrary
 */
eGainLibrary = function (librarySettings) {
    var _this = this;
     
//    var jquery = require('jQuery');
//    var $ = jquery;
    /**
     * The DataTypes contain the objects used throughout the library.
     * @param {CustomerObject} Object containing details such as the customer Locale information or additional parameters.
     * @param {EventHandlers} All of the callbacks used by the library to notify the caller of events raised.
     */
    this.Datatype = {
        /**
         * Object used to store Locale and other details of the Customer to be passed into chat.
         * @returns {CustomerObject} a new instance of the CustomerObject for setting of properties.
         */
        CustomerObject: function () {
            this.Locale = {
                Language: "en",
                Country: "US"
            };

            this.PrimaryKey = {Name: "", Value: ""};
            this.PrimaryKeyParams = {"PRIMARY_KEY_EMAIL": "Email", "PRIMARY_KEY_PHONE": "Phone"};
            this.SetPrimaryKey = function (primaryKey, primaryKeyValue) {
                this.PrimaryKey.Name = primaryKey;
                this.PrimaryKey.Value = primaryKeyValue;
            };
            this.CustomerParameters = [];
            this.AddCustomerParameter = function (customerParam) {
                this.CustomerParameters.push(customerParam);
            };
        },
        /**
         * The CustomerParameter object is used to populate eGain attributes of the customer to be passed into chat or callback.
         * Once a new customer parameter is defined it should be added to the CustomerObject by calling the AddCustomerParameter method of
         * the CustomerObject.
         * @returns {CustomerParameter} A new instance of the CustomerParameter
         */
        CustomerParameter: function () {
            this.eGainParentObject = "";
            this.eGainChildObject = "";
            this.eGainParamName = "";
            this.eGainAttribute = "";
            this.eGainValue = "";
            this.eGainMinLength = "";
            this.eGainMaxLength = "";
            this.eGainRequired = "";
            this.eGainFieldType = "";
            this.eGainValidationString = "";
        },
        /**
         * The EventHandlers object is used to define each of the event handler Functions required for the egain library.
         * These each get set to the local functions you want to be fired when the events are raised by the library.
         * @returns {EventHandlers} A new instance of the EventHandlers object.
         */
        EventHandlers: function () {
            this.OnConnectionInitialized = {};
            this.OnConnectSuccess = {};
            this.OnConnectionComplete = {};
            this.OnConnectionFailure = {};
            this.OnConnectionPaused = {};
            this.OnConnectionResumed = {};
            this.OnConnectionAttached = {};
            this.OnConnectionAttachedFailure = {};
            this.OnConnectionFailure = {};
            this.OnDuplicateSession = {};
            this.OnAgentsNotAvailable = {};
            this.OnSysemMessageReceived = {};
            this.OnGetQueueCurrentStatus = {};
            this.OnMessagePropertyLoad = {};
            this.OnErrorOccured = {};
        },
        /**
         * RetunObject used in some of the Callback Events.
         * @returns {ResultObject} A new instance of the ResultObject.
         */
        ResultObject: function () {
            this.StatusCode = "";
            this.StatusMessage = "";
            this.IsSuccess = false;
        }

    };
    /**
     * The ConnectionParameters array is used to define array of key,value pairs. 
     * These are additional url parameters which need to be added in url when establishing a connection.
     */
    this.ConnectionParameters = [];
    this.AddConnectionParameter = function (paramName, paramValue) {
        if (paramName && paramValue) {
            var obj = {};
            obj[paramName] = paramValue;
            this.ConnectionParameters.push(obj);
        }
    };

    /*
     * 
     * Private variables used by eGainLibrary
     */
    var _egainLib = this;
    var _isDevelopmentModeOn = (librarySettings) ? librarySettings.IsDevelopmentModeOn : false;
    var _corsHost = "";
    var _eGainContextPath = (librarySettings) ? librarySettings.eGainContextPath : "";//
    _eGainContextPath = (_eGainContextPath) ? _eGainContextPath : "";
    var _entryPointId;
    var _connection = null;
    var _connected = false;
    var connectionFailure = false;
    var languageCode; /* default if no parameter */
    var countryCode; /* default if no parameter */
    var _templateName;
    var _version;
    var BOSH_SERVICE;
    var MESSAGING_URL;
    var CUSTOM_MESSAGING_URL;
    var MASKING_URL;
    var _video = false;
    var _videoURLParam = "";
    var _avmode = null;
    var _avmodeURLParam = "";

    /*
     * EventHandlers Initialization. These are the event handlers which are common to both Chat and Callback
     * */
    var _onConnectionInitialized;
    var _onConnectSuccess;
    var _onConnectionComplete;
    var _onConnectionPaused;
    var _onConnectionResumed;
    var _onConnectionFailure;
    var _onConnectionAttached;
    var _onConnectionAttachedFailure;
    var _onDuplicateSession;
    var _onAgentsNotAvailable;
    var _onServerNotificationReceived;
    var _onSystemMessageReceived;
    var _onGetQueueCurrentStatus;
    var _onMessagePropertyLoad;
    var _onErrorOccured;

    /*
     * 
     * Private Methods of eGainLibrary object 
     */
    var eGainLog = function (message) {
        if (typeof _this.logger === 'function') {
            _this.logger(message);
        }
    }
    ;

    var initializeApplicationState = function (entryPointId, language, country, templateName, version, serverURL) {
        _entryPointId = entryPointId;
        if (serverURL)
            _corsHost = serverURL;
        else if (librarySettings && librarySettings.CORSHost)
            _corsHost = librarySettings.CORSHost;

        languageCode = language ? language : 'en'; /* default if no parameter */
        countryCode = country ? country : 'US'; /* default if no parameter */
        _templateName = templateName ? templateName : "";
        _version = version ? version : "";

        //_connection.eGainOnError = _onErrorOccured;
        eGainLibrary.debug = (librarySettings) ? librarySettings.IsDebugOn : false;
        eGainLibrary.eGainLog = eGainLog;

    };

    var validateEventHandlers = function (callbacks) {
        try {
            /* Start the constructor by checking that the input parameter of callbacks is an object */
            if (typeof (callbacks) !== 'object') {
                throw "The library cannot be initialized without providing an EventHandlers Object as parameter.";
            }

            if (typeof (callbacks.OnConnectionInitialized) !== "function") {
                /* DO NOTHING */
            } else {
                _onConnectionInitialized = callbacks.OnConnectionInitialized;
            }

            if (typeof (callbacks.OnConnectSuccess) !== "function") {
                throw "OnConnectSuccess is not defined or is not a function";
            } else {
                _onConnectSuccess = callbacks.OnConnectSuccess;
            }

            if (typeof (callbacks.OnConnectionFailure) !== "function") {
                throw "OnConnectionFailure is not defined or is not a function";
            } else {
                _onConnectionFailure = callbacks.OnConnectionFailure;
            }

            if (typeof (callbacks.OnConnectionComplete) !== "function") {
                throw "OnConnectionComplete is not defined or is not a function";
            } else {
                _onConnectionComplete = callbacks.OnConnectionComplete;
            }

            if (typeof (callbacks.OnSystemMessageReceived) !== "function") {
                throw "OnSystemMessageReceived is not defined or is not a function";
            } else {
                _onSystemMessageReceived = callbacks.OnSystemMessageReceived;
            }
            /* Next validate the minimum required callbacks are provided. */
            if (typeof (callbacks.OnErrorOccurred) !== "function") {
                throw "OnErrorOccurred is not defined or is not a function";
            } else {
                _onErrorOccured = callbacks.OnErrorOccurred;
            }
            if (typeof (callbacks.OnAgentsNotAvailable) !== "function") {
                throw "OnAgentsNotAvailable is not defined or is not a function";
            } else {
                _onAgentsNotAvailable = callbacks.OnAgentsNotAvailable;
            }
            if (typeof (callbacks.OnGetQueueCurrentStatus) !== "function") {
                // DO NOTHING
            } else {
                _onGetQueueCurrentStatus = callbacks.OnGetQueueCurrentStatus;
            }
            if (typeof (callbacks.OnConnectionPaused) !== "function") {
                // DO NOTHING
            } else {
                _onConnectionPaused = callbacks.OnConnectionPaused;
            }
            if (typeof (callbacks.OnConnectionResumed) !== "function") {
                // DO NOTHING
            } else {
                _onConnectionResumed = callbacks.OnConnectionResumed;
            }
            if (typeof (callbacks.OnServerNotificationReceived) !== "function") {
                // DO NOTHING
            } else {
                _onServerNotificationReceived = callbacks.OnServerNotificationReceived;
            }
            if (typeof (callbacks.OnConnectionAttached) !== "function") {
                // DO NOTHING
            } else {
                _onConnectionAttached = callbacks.OnConnectionAttached;
            }
            if (typeof (callbacks.OnConnectionAttachedFailure) !== "function") {
                // DO NOTHING
            } else {
                _onConnectionAttachedFailure = callbacks.OnConnectionAttachedFailure;
            }
            if (typeof (callbacks.OnMessagePropertyLoad) !== "function") {
                /* This callback is not mandatory  */
            } else {
                _onMessagePropertyLoad = callbacks.OnMessagePropertyLoad;
            }
            if (typeof (callbacks.OnDuplicateSession) !== "function") {
                /* This callback is not mandatory  */
            } else {
                _onDuplicateSession = callbacks.OnDuplicateSession;
            }

        } catch (err) {

            throw err;
        }
    };
    /**
     * This method validates the customer object created. If CustomerParameters are set for the customer Object, PrimaryKeyIsEmailOrPhone
     * has to be set to either 'Email' or 'Phone'. If customer object is not passed, then anonymous session is started.
     * @param {CustomerObject} The instance of the Customer object
     * @returns {undefined}
     */
    var validateCustomer = function (customer) {
        var isValidCustomer = false;
        if (customer.PrimaryKey.Name !== "") {
            if (customer.PrimaryKey.Name === customer.PrimaryKeyParams.PRIMARY_KEY_EMAIL) {

                var skipValidation = false;
                //skipped the validation if email_address is coming as secure attribute and it's primary key
                for (var itemIndex = 0; itemIndex < customer.CustomerParameters.length; itemIndex++) {
                    if (customer.CustomerParameters[itemIndex].eGainAttribute === "email_address" &&
                            (typeof customer.CustomerParameters[itemIndex].secureAttribute !== "undefined" &&
                                    customer.CustomerParameters[itemIndex].secureAttribute === "1")) {
                        skipValidation = true;
                        isValidCustomer = true;
                    }
                }
                var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\ ".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA -Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                if (!skipValidation && re.test(customer.PrimaryKey.Value)) {
                    isValidCustomer = true;
                }

            }
            if (customer.PrimaryKey.Name === customer.PrimaryKeyParams.PRIMARY_KEY_PHONE) {
                var skipValidation = false;
                //skipped the validation if phone_number is coming as secure attribute and it's primary key
                for (var itemIndex = 0; itemIndex < customer.CustomerParameters.length; itemIndex++) {
                    if (customer.CustomerParameters[itemIndex].eGainAttribute === "phone_number" &&
                            (typeof customer.CustomerParameters[itemIndex].secureAttribute !== "undefined" &&
                                    customer.CustomerParameters[itemIndex].secureAttribute === "1")) {
                        skipValidation = true;
                        isValidCustomer = true;
                    }
                }
                if (!skipValidation && customer.PrimaryKey.Value.match(/[^0-9 \-\(\)]/) === null) {
                    isValidCustomer = true;
                }
            }
            if (!isValidCustomer) {
                throw "Customer not correctly initialized. Valid Email or Phone needs to be set as Pimary Key";
            }
        }

    };

    /* Take the input object and convert it into the LoginParameters object */
    var _buildLoginParameters = function (customerObject) {
        var returnValue = [];


        for (var itemIndex = 0; itemIndex < customerObject.CustomerParameters.length; itemIndex++) {
            var currentParam = {
            };
            currentParam.paramName = customerObject.CustomerParameters[itemIndex].eGainParamName;
            currentParam.objectName =
                    customerObject.CustomerParameters[itemIndex].eGainParentObject + "::" +
                    customerObject.CustomerParameters[itemIndex].eGainChildObject;
            currentParam.attributeName = customerObject.CustomerParameters[itemIndex].eGainAttribute;
            currentParam.attributeValue = customerObject.CustomerParameters[itemIndex].eGainValue;
            currentParam.primaryKey = customerObject.CustomerParameters[itemIndex].eGainPrimaryKey;
            currentParam.minLength = customerObject.CustomerParameters[itemIndex].eGainMinLength;
            currentParam.maxLength = customerObject.CustomerParameters[itemIndex].eGainMaxLength;
            currentParam.required = customerObject.CustomerParameters[itemIndex].eGainRequired;
            currentParam.fieldType = customerObject.CustomerParameters[itemIndex].eGainFieldType;
            currentParam.validationString = customerObject.CustomerParameters[itemIndex].eGainValidationString;
            currentParam.secureAttribute = customerObject.CustomerParameters[itemIndex].secureAttribute;
            if (currentParam.secureAttribute === '1')
                currentParam.egainAttributeName = customerObject.CustomerParameters[itemIndex].providerAttributeName;

            if (customerObject.PrimaryKey.Name === customerObject.PrimaryKeyParams.PRIMARY_KEY_EMAIL &&
                    (currentParam.attributeValue === "email_address")) {
                currentParam.objectName = "casemgmt::email_address_contact_point_data";
                currentParam.attributeValue = "email_address";
                currentParam.primaryKey = "1";

            } else if (customerObject.PrimaryKey.Name === customerObject.PrimaryKeyParams.PRIMARY_KEY_PHONE &&
                    (currentParam.attributeValue === "phone_number")) {
                currentParam.objectName = "casemgmt::phone_number_data";
                currentParam.attributeValue = "phone_number";
                currentParam.primaryKey = "1";

            }
            returnValue.push(currentParam);
        }
        return returnValue;
    };

    var decodeMessage = function (htmlMessage) {
        htmlMessage = htmlMessage.replace(/\\u/g, '%u');
        htmlMessage = htmlMessage.replace(/\^/g, '%');
        htmlMessage = unescape(htmlMessage);
        htmlMessage = $.trim(htmlMessage);
        return htmlMessage;
    };

    var replaceHexToASCII = function (str) {
        //assumes each hex is double digit and starts with ^
        if (str === "")
            return "";
        var caretIdx = str.indexOf("^");
        if (caretIdx <= -1)
            return str;

        var leftStr = str.substring(0, caretIdx);
        var hexStr = str.substring(caretIdx + 1, caretIdx + 3);
        var hexToASC = String.fromCharCode(parseInt(hexStr, 16));
        var rightStr = str.substring(caretIdx + 3);
        rightStr = replaceHexToASCII(rightStr);

        return leftStr + hexToASC + rightStr;
    };

    var getArticleAttachmentName = function (message) {
        /* Parse the message */
        var nodes = $.parseHTML(message);
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (node.tagName && node.tagName.toLowerCase() === 'a') {
                return node.innerHTML;
            }
        }
        return "";
    };

    var submitMessage = function (htmlMessage, messageType, command) {
        if ($.trim(htmlMessage.replace(/<br ?\/?>/g, '').replace(/&nbsp;/g, '')).length === 0) {
            return;
        }
        /* TODO remove once the agent console has been fixed to force anchors in
         messages to be opened in a new window*/
        htmlMessage = htmlMessage.replace(/<a\b/g, '<a target="_blank"');
        /* TODO remove once the server has been fixed to cope with line breaks */
        htmlMessage = htmlMessage.replace(/\n/g, ' ');

        if (!messageType) {
            messageType = 'chat';
        }
        if (typeof command != "undefined")
        {
            _connection.send(($msg({
                'type': messageType
            }).c('body').t(htmlMessage).up().c('egainCommand', {xmlns: "http://bindings.egain.com/chat"}).c('subcmd').t(command).tree()));
        } else
        {
            _connection.send($msg({
                'type': messageType
            }).c('body').t(htmlMessage).tree());

        }
        return true;
    }
    ;
    
    function $msg(attrs) { return new Strophe.Builder("message", attrs); }
    
    /*
     * 
     * Public Methods of eGain Library Object 
     */
    /*
     * SetCustomer is used to set customer object in chat/callback session
     * @param {type} customerObject
     * @returns nothing
     */
    this.SetCustomer = function (customerObject) {
        var _customerObject;
        if (customerObject === null) {
            _customerObject = new this.Datatype.CustomerObject();
        } else {
            _customerObject = customerObject;
        }
        /* Ensure the customer object has been populated correctly  */
        validateCustomer(_customerObject);
        /* Add all the additional handling and parameters required for connection */
        var email;
        for (var itemIndex = 0; itemIndex < _customerObject.CustomerParameters.length; itemIndex++) {
            if (_customerObject.CustomerParameters[itemIndex].eGainAttribute === "email_address") {
                email = _customerObject.CustomerParameters[itemIndex].eGainValue;
            }
        }

        var from = (email) ? email : 'anonymous@egain.com';
        _connection.from = (from).replace(/'/g, '&apos;');
        _connection.entryPointId = _entryPointId;
        var languageCode = _customerObject.Locale.Language || 'en'; /* default if no parameter*/
        var countryCode = _customerObject.Locale.Country || 'US'; /* default if no parameter*/
        _connection.lang = languageCode + '-' + countryCode;
        _connection.eGainLoginParameters = _buildLoginParameters(_customerObject);
    };


    /* Optional method to set additional data */
    this.SetSamlResponse = function (samlResponse) {
        _connection.samlResponse = samlResponse;
    };
    this.SetEscalationData = function (escalationData) {
        _connection.escalationData = escalationData;
    };
    this.SetXEgainSession = function (xEgainSessionId) {
        _connection.xEgainEscalationHeader = xEgainSessionId;
    };
    this.SetVisitorHistoryInformation = function (accountID, userId, oneTagSessionId) {
        _connection.vhtIds = {
            aId: accountID,
            sId: oneTagSessionId,
            uId: userId
        };
    };

    /**
     * The GetQueueCurrentStatus method is used get details of about the current queue load and estimated wait time.  
     */
    this.GetQueueCurrentStatus = function () {
        var QUEUE_STATUS_URL = _corsHost + "/egain/chat/entrypoint/sessionStatistics";
        var inputXML = "<sessionStatistics xmlns='http://bindings.egain.com/chat'><sid>";
        inputXML += _connection.sid;
        inputXML += "</sid></sessionStatistics>";

        var getQueueLiveStatusArgs = {};

        $.ajax({
            type: 'POST',
            url: QUEUE_STATUS_URL,
            data: inputXML,
            contentType: 'text/XML',
            dataType: 'xml',
            success: function (xml) {

                var queueDepth = $(xml).find('ns2\\:queueDepth, queueDepth')
                        .text();
                var altEngmtTime = $(xml).find('ns2\\:altEngmtTime, altEngmtTime')
                        .text();

                var waittime = $(xml).find('ns2\\:waitTime, waitTime')
                        .text();
                waittime = Math.ceil(parseFloat(waittime) / 60);
                altEngmtTime = parseInt(altEngmtTime);

                getQueueLiveStatusArgs.QueueDepth = queueDepth;
                getQueueLiveStatusArgs.WaitTime = waittime;
                getQueueLiveStatusArgs.AltEngmtTime = altEngmtTime;

                if (_onGetQueueCurrentStatus)
                    _onGetQueueCurrentStatus(getQueueLiveStatusArgs);

            }
        });


    };
    /*
     * 
     * Masker and Connection objects are private objects inside eGainLibrary
     */
    /*
     * Masker would be used to mask data, based on configured patterns
     * for a department (and channel).
     */
    var Masker = function () {
        this.maskingPatterns = [];
    };
    Masker.prototype.SetMaskingPatternData = function (patterns, htmlTagMatcherRegex, htmlTagMatcherIncr) {
        this.maskingPatterns = patterns;
        this.htmlTagMatcherRegex = htmlTagMatcherRegex;
        this.htmlTagMatcherIncr = htmlTagMatcherIncr;
    };
    Masker.prototype.MaskData = function (htmlData, textData)
    {
        var patterns = this.maskingPatterns;
        var htmlTagMatcherRegex = this.htmlTagMatcherRegex;
        var groupNumIncr = this.htmlTagMatcherIncr;
        var replacementArr = [];

        var maskHtmlData = function maskHtmlData(replacementArr, htmlData, htmlTagMatcherRegex, groupNumIncr)
        {
            var maskedHtml = htmlData;
            if (replacementArr.length > 0)
            {
                for (var i = 0; i < replacementArr.length; i++)
                {
                    var maskedStrArr = [];
                    var start = 0;
                    var idx = 0;

                    var replacementObj = replacementArr[i];
                    var replacementKey = replacementObj.orig;
                    replacementKey = enhanceReplacementKey(replacementKey, htmlTagMatcherRegex, replacementObj.startBoundary,
                            replacementObj.endBoundary);
                    var regEx = new RegExp(replacementKey, "g");
                    var match = regEx.exec(maskedHtml);

                    while (match)
                    {
                        if (match.index + match[0].length === start) {
                            break;
                        }
                        var replacementValue = replacementObj.replaced;
                        replacementValue = enhanceReplacementValue(replacementValue, groupNumIncr, match);
                        maskedStrArr[idx++] = maskedHtml.substring(start, match.index) + replacementValue;
                        start = match.index + match[0].length;
                        match = regEx.exec(maskedHtml);
                    }
                    maskedStrArr[idx++] = maskedHtml.substring(start, maskedHtml.length);
                    maskedHtml = maskedStrArr.join('');
                }
            }
            return maskedHtml;
        };

        var enhanceReplacementKey = function (replacementKey, regex, startBoundary, endBoundary)
        {
            var enhancedKeyArr = [];
            var indx = 0;
            if (startBoundary)
            {
                enhancedKeyArr[indx++] = "\\b";
            }
            for (var i = 0; i < replacementKey.length; i++)
            {
                // Remove \r \n characters from key as they are already taken care of in extra regex added later in this function
                if (replacementKey.charAt(i) === '\r' || replacementKey.charAt(i) === '\n') {
                    continue;
                }
                enhancedKeyArr[indx++] = replacementKey.charAt(i);
                // If it is the NOT the last character of the key then insert the extra regex
                if (i !== (replacementKey.length - 1))
                {
                    enhancedKeyArr[indx++] = regex;
                }
            }
            if (endBoundary)
            {
                enhancedKeyArr[indx++] = "\\b";
            }
            var enhancedKey = enhancedKeyArr.join('').replace(/ /g, '(?: |\u00A0|&nbsp;)').replace(/\u00A0/g, '(?: |\u00A0|&nbsp;)');
            return enhancedKey;
        };

        var enhanceReplacementValue = function (replacementValue, groupNumIncr, match)
        {
            var groupNum = 1;
            var enhancedValueArr = [];
            var indx = 0;
            for (var i = 0; i < replacementValue.length; i++)
            {
                // Remove \r \n characters from enhanced value as they are already taken care of in captured groups added to the enhanced value later in this function
                if (replacementValue.charAt(i) === '\r' || replacementValue.charAt(i) === '\n') {
                    continue;
                }
                if (replacementValue.charAt(i) === ' ') {
                    enhancedValueArr[indx++] = '&nbsp;';
                } else {
                    enhancedValueArr[indx++] = replacementValue.charAt(i);
                }
                // If it is NOT the last character of the value then add the captured group
                if (i !== (replacementValue.length - 1))
                {
                    enhancedValueArr[indx++] = match[groupNum];
                    groupNum = groupNum + groupNumIncr;
                }
            }
            return enhancedValueArr.join('');
        };

        var maskMatchingPatterns = function (str, re, maskingChar, numCharsToUnmaskFromRight,
                numCharsToUnmaskFromLeft, applyLunhAlgo, replacementArr)
        {
            var match = re.exec(str);
            //if match not found, return the original string.
            if (!match)
            {
                return str;
            }
            /*
             As long as the match is found, replace the matched text
             with the masked character, honouring the numCharsToUnmaskFromRight and
             numCharsToUnmaskFromLeft values.
             */
            var maskedStrArr = [];
            var start = 0;
            var idx = 0;
            var maskedStr = '';
            var prependValue = "";
            var appendValue = "";
            var startWordBoundary = false;
            var endWordBoundary = false;
            while (match)
            {
                prependValue = "";
                appendValue = "";
                startWordBoundary = false;
                endWordBoundary = false;
                if (match.index + match[0].length === start) {
                    break;
                }
                maskedStr = maskChars(match[0],
                        maskingChar, numCharsToUnmaskFromLeft, numCharsToUnmaskFromRight, applyLunhAlgo);
                maskedStrArr[idx++] = str.substring(start, match.index) + maskedStr;
                if (replacementArr && (maskedStr !== match[0]))//string has been replaced
                {
                    /* identify the boundary values and set in in the return object, for use.
                     * The boundary value can be a word boundary, or a character surrounding
                     * the word.
                     */
                    if (match.index > 0 && match.index < str.length)
                    {
                        prependValue = str.charAt(match.index - 1);
                        if (!isWordCharacter(prependValue))
                        {
                            prependValue = "";
                            startWordBoundary = true;
                        }
                    } else
                        startWordBoundary = true;
                    if (re.lastIndex < match.input.length && re.lastIndex <= str.length)
                    {
                        appendValue = str.charAt(re.lastIndex);
                        if (!isWordCharacter(appendValue))
                        {
                            appendValue = "";
                            endWordBoundary = true;
                        }
                    } else
                    {
                        endWordBoundary = true;
                    }
                    replacementArr[replacementArr.length] = {orig: (prependValue + match[0] + appendValue), replaced: (prependValue + maskedStr + appendValue), startBoundary: startWordBoundary, endBoundary: endWordBoundary};
                }
                start = match.index + match[0].length;
                match = re.exec(str);
            }
            maskedStrArr[idx++] = str.substring(start, str.length);
            return maskedStrArr.join('');
        };

        var isWordCharacter = function (s)
        {
            return /\w/.test(s);
        };

        var maskChars = function (matchStr, maskingChar, numCharsToUnmaskFromLeft, numCharsToUnmaskFromRight, applyLunhAlgo)
        {
            if (applyLunhAlgo && !isValidCreditCard(matchStr))
            {
                return matchStr;
            }

            var maskedArr = [];
            var strLength = matchStr.length;
            numCharsToUnmaskFromLeft = numCharsToUnmaskFromLeft <= strLength ? numCharsToUnmaskFromLeft : strLength;
            numCharsToUnmaskFromRight = numCharsToUnmaskFromRight <= strLength ? numCharsToUnmaskFromRight : strLength;

            for (var j = strLength - 1; j >= (strLength - numCharsToUnmaskFromRight); j--)
            {
                if (matchStr.charAt(j) === '\n' || matchStr.charAt(j) === '\r')
                {
                    numCharsToUnmaskFromRight++;
                }
            }
            for (var k = 0; k < numCharsToUnmaskFromLeft; k++)
            {
                if (matchStr.charAt(k) === '\n' || matchStr.charAt(k) === '\r') {
                    numCharsToUnmaskFromLeft++;
                }
            }
            var len = strLength - numCharsToUnmaskFromRight;
            var i = numCharsToUnmaskFromLeft;
            for (; i < len; i++)
            {
                if (matchStr.charAt(i) === '\n' || matchStr.charAt(i) === '\r')
                {
                    maskedArr[i] = matchStr.charAt(i);
                } else
                {
                    maskedArr[i] = maskingChar;
                }
            }
            var retStr = matchStr.substring(0, numCharsToUnmaskFromLeft) + maskedArr.join('') + matchStr.substring(i, strLength);
            return retStr;
        };

        /* this function checks whether the value
         is a valid credit card No or not, using Luhns algorighm*/
        var isValidCreditCard = function (value)
        {
            // accept only digits, dashes or spaces
            if (/[^0-9-\s]+/.test(value))
                return false;

            var nCheck = 0, nDigit = 0, bEven = false;
            value = value.replace(/\D/g, "");

            for (var n = value.length - 1; n >= 0; n--) {
                var cDigit = value.charAt(n),
                        nDigit = parseInt(cDigit, 10);
                if (bEven) {
                    if ((nDigit *= 2) > 9) {
                        nDigit -= 9;
                    }
                }

                nCheck += nDigit;
                bEven = !bEven;
            }
            return (nCheck % 10) === 0;
        };

        for (var i = 0; i < patterns.length; i++)
        {
            var patternObj = patterns[i];
            if (typeof textData !== 'undefined' && textData !== htmlData) {
                textData = maskMatchingPatterns(textData, patternObj.compiledRegEx, patternObj.maskingChar,
                        patternObj.charToRetainRight, patternObj.charToRetainLeft, parseInt(patternObj.luhnAlgo) === 1, replacementArr);
            } else
            {
                htmlData = maskMatchingPatterns(htmlData, patternObj.compiledRegEx, patternObj.maskingChar,
                        patternObj.charToRetainRight, patternObj.charToRetainLeft, parseInt(patternObj.luhnAlgo) === 1);
            }
        }
        if (typeof textData !== 'undefined' && textData !== htmlData)
        {
            htmlData = maskHtmlData(replacementArr, htmlData, htmlTagMatcherRegex, groupNumIncr);
        }
        return htmlData;

    };


    this.Masker = new Masker();
    /*
     * 
     * Connection object is a private object which has session related variables and methods accessible by both Chat and Callback
     */
    var Connection = function () {
        var _connectToBosh = function (jid, wait, onConnectCallback) {
            if (_connection.eGainMessagingProperty !== null && _connection.eGainMessagingProperty !== undefined) {
                _connection.connect(jid, '', onConnectCallback, wait);
            } else {
                setTimeout(function () {
                    _connectToBosh(jid, wait, onConnectCallback);
                }, 10);
                return;
            }
        };

        this.InitializeConnectionObject = function (boshServiceURL, messagingPropertyUrl, maskingUrl, customMessagingPropertyUrl) {
            /* Add all the additional handling and parameters required for connection */
            var connectionUrl = boshServiceURL;
            var additionalParamsStr = "";
            if (_egainLib.ConnectionParameters.length > 0) {
                for (var i = 0; i < _egainLib.ConnectionParameters.length; i++) {
                    var paramName = Object.keys(_egainLib.ConnectionParameters[i])[0];
                    var paramValue = _egainLib.ConnectionParameters[i][paramName];
                    additionalParamsStr += '&' + paramName + '=' + encodeURIComponent(paramValue);
                }
            }
            connectionUrl += additionalParamsStr;
            var timezoneoffset = new Date().getTimezoneOffset() * -1;
            connectionUrl = connectionUrl + '&custtimeoffset=' + timezoneoffset;
            if (_video) {
                connectionUrl += "&" + _videoURLParam;
                /*
                 * Following code is commented since it was opening video chat on agent side even before the agent picks up chat activity.
                 * maskingUrl += "?" + _videoURLParam;
                 */
                if (_avmode) {
                    connectionUrl += "&" + _avmodeURLParam;
                    /*
                     * Following code is commented since it was opening video chat on agent side even before the agent picks up chat activity.
                     * maskingUrl += "&" + _avmodeURLParam;
                     */
                }
            }

            _connection = new Strophe.Connection(connectionUrl);
            _connection.eGainOnError = _onErrorOccured;
            if (typeof this._loadMessagingProperties == 'function') {
                this._loadMessagingProperties(messagingPropertyUrl, customMessagingPropertyUrl);
            }
            // Initialize to the ECE endpoint
            /* Fetch masking */
            $.ajax({
                type: 'GET',
                url: maskingUrl,
                dataType: 'json',
                success: function (json, textStatus, jqXHR) {
                    if (jqXHR.getResponseHeader("X-egain-session")) {
                        json.XEgainSession = jqXHR.getResponseHeader("X-egain-session");
                    }

                    var maskingPatterns = json.maskingPatterns.maskingPattern;
                    if (maskingPatterns)
                    {
                        var pattern = {}, patterns = [];
                        for (var j = 0; j < maskingPatterns.length; j++)
                        {
                            var pattern = maskingPatterns[j];
                            pattern.compiledRegEx = new RegExp(pattern.regEx, "gi");
                            patterns[j] = pattern;
                        }
                        _egainLib.Masker.SetMaskingPatternData(patterns, json.htmlTagMatcherRegEx, json.htmlTagMatcherIncr);
                    }
                    if (_onConnectionInitialized !== null && _onConnectionInitialized !== undefined) {
                        _onConnectionInitialized(json);
                    }
                },
                error: function () {
                    if (_onConnectionInitialized !== null && _onConnectionInitialized !== undefined) {
                        _onConnectionInitialized(null);
                    }
                }
            });
        };
        this.Start = function (onConnectCallback) {
            var jid = 'egain@egain.com';
            /*
             * Additional time is required in development mode
             * since the execution flow could be blocked by the developer during development
             * In Development mode, proxy wil be used instead of the context root
             * @type Number
             */
            var wait = null;
            if (_isDevelopmentModeOn === true) {
                wait = 60 * 5;
            }

            _connectToBosh(jid, wait, onConnectCallback);
        };

    };
    /*
     * 
     * Chat object will have methods specific to Chat
     */
    var Chat = function () {
        var connectionObj = new Connection();
        var _onAgentMessageReceived;
        var _onAgentJoined;
        var _onChatTransfer;
        var _onAgentStartTyping;
        var _onAgentStopTyping;
        var _onTranscriptFetched;
        var _onCobrowseInviteReceived;
        var _onCustomerInitiateVideo;
        var _onAgentInitiateVideo;
        var _onStartVideo;
        var _onStopVideo;
        var _onVideoChatTokenReceived;
        var _onAgentAutoRejectVideo;
        var _onCustomerAutoRejectVideo;
        var _onVideoChatCapable;
        var _onVideoChatMaxEscalation;
        var _onAudioChatEnabled;
        var _onAcceptVideoChat;
        var _onDeclineVideoChat;
        var _onGetMediaServerDetails;
        var _onInitiateVideoChat;
        var _onAttachmentAcceptedByCustomer;
        var _onAttachmentRejectedByCustomer;
        var _onAttachmentAcceptedByAgent;
        var _onAttachmentRejectedByAgent;
        var _onAttachmentInviteReceived;
        var _onCustomerAttachmentNotificationSent;
        var _onGetAttachment;
        var _onGetAttachmentImageThumbnail;
        var _onAttachmentUploadedByCustomer;
        /* Private variables declaration */
        var AVacceptRejectMsgSent = false;
        var ChatEventHandlers = function () {
            this.OnAgentMessageReceived = {};
            this.OnAgentJoined = {};
            this.OnChatTransfer = {};
            this.OnAgentStartTyping = {};
            this.OnAgentStopTyping = {};
            this.OnTranscriptFetched = {};
            this.OnCobrowseInviteReceived = {};
            this.OnCustomerInitiateVideo = {};
            this.OnAgentInitiateVideo = {};
            this.OnStartVideo = {};
            this.OnStopVideo = {};
            this.OnVideoChatTokenReceived = {};
            this.OnAgentAutoRejectVideo = {};
            this.OnCustomerAutoRejectVideo = {};
            this.OnVideoChatCapable = {};
            this.OnVideoChatMaxEscalation = {};
            this.OnAudioChatEnabled = {};
            this.OnAcceptVideoChat = {};
            this.OnDeclineVideoChat = {};
            this.OnGetMediaServerDetails = {};
            this.OnInitiateVideoChat = {};
            this.OnCustomerAttachmentNotificationSent = {};
            this.OnGetAttachment = {};
            this.OnAttachmentAcceptedByCustomer = {};
            this.OnAttachmentUploadedByCustomer = {};
            this.OnAttachmentRejectedByCustomer = {};
            this.OnAttachmentAcceptedByAgent = {};
            this.OnAttachmentRejectedByAgent = {};
            this.OnAttachmentInviteReceived = {};
            this.OnGetAttachmentImageThumbnail = {};
        };

        var validateChatEventHandlers = function (eventHandlers) {

            if (typeof (eventHandlers.OnAgentMessageReceived) !== "function") {
                // DO NOTHING
            } else {
                _onAgentMessageReceived = eventHandlers.OnAgentMessageReceived;
            }
            if (typeof (eventHandlers.OnAgentJoined) !== "function") {
                // DO NOTHING
            } else {
                _onAgentJoined = eventHandlers.OnAgentJoined;
            }
            if (typeof (eventHandlers.OnChatTransfer) !== "function") {
                // DO NOTHING
            } else {
                _onChatTransfer = eventHandlers.OnChatTransfer;
            }
            if (typeof (eventHandlers.OnAgentStartTyping) !== "function") {
                // DO NOTHING
            } else {
                _onAgentStartTyping = eventHandlers.OnAgentStartTyping;
            }
            if (typeof (eventHandlers.OnAgentStopTyping) !== "function") {
                // DO NOTHING
            } else {
                _onAgentStopTyping = eventHandlers.OnAgentStopTyping;
            }
            if (typeof (eventHandlers.OnTranscriptFetched) !== "function") {
                // DO NOTHING
            } else {
                _onTranscriptFetched = eventHandlers.OnTranscriptFetched;
            }
            if (typeof (eventHandlers.OnCobrowseInviteReceived) !== "function") {
                // DO NOTHING
            } else {
                _onCobrowseInviteReceived = eventHandlers.OnCobrowseInviteReceived;
            }
            if (typeof (eventHandlers.OnCustomerInitiateVideo) !== "function") {
                /* This callback is not mandatory  */
            } else {
                _onCustomerInitiateVideo = eventHandlers.OnCustomerInitiateVideo;
            }
            if (typeof (eventHandlers.OnAgentInitiateVideo) !== "function") {
                /* This callback is not mandatory  */
            } else {
                _onAgentInitiateVideo = eventHandlers.OnAgentInitiateVideo;
            }
            /* TODO : Update these callback names to make it clearer */
            if (typeof (eventHandlers.OnStartVideo) !== "function") {
                /* This callback is not mandatory  */
            } else {
                _onStartVideo = eventHandlers.OnStartVideo;
            }
            if (typeof (eventHandlers.OnStopVideo) !== "function") {
                /* This callback is not mandatory  */
            } else {
                _onStopVideo = eventHandlers.OnStopVideo;
            }
            /* TODO : Update these callback names to make it clearer */
            if (typeof (eventHandlers.OnVideoChatTokenReceived) !== "function") {
                /* This callback is not mandatory  */
            } else {
                _onVideoChatTokenReceived = eventHandlers.OnVideoChatTokenReceived;
            }
            if (typeof (eventHandlers.OnAgentAutoRejectVideo) !== "function") {
                /* This callback is not mandatory  */
            } else {
                _onAgentAutoRejectVideo = eventHandlers.OnAgentAutoRejectVideo;
            }
            if (typeof (eventHandlers.OnCustomerAutoRejectVideo) !== "function") {
                /* This callback is not mandatory  */
            } else {
                _onCustomerAutoRejectVideo = eventHandlers.OnCustomerAutoRejectVideo;
            }
            if (typeof (eventHandlers.OnAgentAutoRejectVideo) !== "function") {
                /* This callback is not mandatory  */
            } else {
                _onAgentAutoRejectVideo = eventHandlers.OnAgentAutoRejectVideo;
            }
            if (typeof (eventHandlers.OnVideoChatCapable) !== "function") {
                /* This callback is not mandatory  */
            } else {
                _onVideoChatCapable = eventHandlers.OnVideoChatCapable;
            }
            if (typeof (eventHandlers.OnVideoChatMaxEscalation) !== "function") {
                /* This callback is not mandatory  */
            } else {
                _onVideoChatMaxEscalation = eventHandlers.OnVideoChatMaxEscalation;
            }
            if (typeof (eventHandlers.OnAudioChatEnabled) !== "function") {
                /* This callback is not mandatory  */
            } else {
                _onAudioChatEnabled = eventHandlers.OnAudioChatEnabled;
            }
            if (typeof (eventHandlers.OnAcceptVideoChat) !== "function") {
                /* This callback is not mandatory  */
            } else {
                _onAcceptVideoChat = eventHandlers.OnAcceptVideoChat;
            }
            if (typeof (eventHandlers.OnDeclineVideoChat) !== "function") {
                /* This callback is not mandatory  */
            } else {
                _onDeclineVideoChat = eventHandlers.OnDeclineVideoChat;
            }
            if (typeof (eventHandlers.OnGetMediaServerDetails) !== "function") {
                /* This callback is not mandatory  */
            } else {
                _onGetMediaServerDetails = eventHandlers.OnGetMediaServerDetails;
            }
            if (typeof (eventHandlers.OnInitiateVideoChat) !== "function") {
                /* This callback is not mandatory  */
            } else {
                _onInitiateVideoChat = eventHandlers.OnInitiateVideoChat;
            }
            if (typeof (eventHandlers.OnAttachmentAcceptedByCustomer) !== "function") {
                /* This callback is not mandatory  */
            } else {
                _onAttachmentAcceptedByCustomer = eventHandlers.OnAttachmentAcceptedByCustomer;
            }
            /* TODO : Video callbacks. Not fully implemented */
            if (typeof (eventHandlers.OnAttachmentRejectedByCustomer) !== "function") {
                /* This callback is not mandatory  */
            } else {
                _onAttachmentRejectedByCustomer = eventHandlers.OnAttachmentRejectedByCustomer;
            }
            if (typeof (eventHandlers.OnAttachmentAcceptedByAgent) !== "function") {
                /* This callback is not mandatory  */
            } else {
                _onAttachmentAcceptedByAgent = eventHandlers.OnAttachmentAcceptedByAgent;
            }

            if (typeof (eventHandlers.OnAttachmentUploadedByCustomer) !== "function") {
                /* This callback is not mandatory  */
            } else {
                _onAttachmentUploadedByCustomer = eventHandlers.OnAttachmentUploadedByCustomer;
            }
            if (typeof (eventHandlers.OnAttachmentRejectedByAgent) !== "function") {
                /* This callback is not mandatory  */
            } else {
                _onAttachmentRejectedByAgent = eventHandlers.OnAttachmentRejectedByAgent;
            }
            if (typeof (eventHandlers.OnAttachmentInviteReceived) !== "function") {
                /* This callback is not mandatory  */
            } else {
                _onAttachmentInviteReceived = eventHandlers.OnAttachmentInviteReceived;
            }
            if (typeof (eventHandlers.OnCustomerAttachmentNotificationSent) !== "function") {
                /* This callback is not mandatory  */
            } else {
                _onCustomerAttachmentNotificationSent = eventHandlers.OnCustomerAttachmentNotificationSent;
            }
            if (typeof (eventHandlers.OnGetAttachment) !== "function") {
                /* This callback is not mandatory  */
            } else {
                _onGetAttachment = eventHandlers.OnGetAttachment;
            }
            if (typeof (eventHandlers.OnGetAttachmentImageThumbnail) !== "function") {
                /* This callback is not mandatory  */
            } else {
                _onGetAttachmentImageThumbnail = eventHandlers.OnGetAttachmentImageThumbnail;
            }
        };

        var onConnect = function (status, condition) {
            /* Console log seems to be gicing issues. Need to check is logging  cause alerts to stop*/
            /* Handler for connection - connection success or failure, disconnect etc */
            /* TODO: Define return arguments for each event. Should contain information on the type of error */
            switch (status) {
                case Strophe.Status.ERROR:
                    break;
                case Strophe.Status.CONNECTING:
                    break;
                case Strophe.Status.CONNFAIL:
                    var chatConnectionFailureEventArgs = new _egainLib.Datatype.ResultObject();
                    chatConnectionFailureEventArgs.IsSuccess = false;
                    chatConnectionFailureEventArgs.StatusCode = 'CONNECT_FAIL';
                    chatConnectionFailureEventArgs.StatusMessage = 'CONNECTION FAILURE';
                    switch (condition) {
                        case 'system-shutdown':
                            connectionFailure = true;
                            var agentsNotAvailableEventArgs = chatConnectionFailureEventArgs;
                            agentsNotAvailableEventArgs.IsSuccess = false;
                            agentsNotAvailableEventArgs.StatusCode = 'AGENTS_UNAVAILABLE';
                            agentsNotAvailableEventArgs.StatusMessage = 'AGENTS UNAVAILABLE';
                            _onAgentsNotAvailable(agentsNotAvailableEventArgs);
                            break;
                        case 'other-request':
                            connectionFailure = true;
                            var duplicateSessionEventArgs = chatConnectionFailureEventArgs;
                            duplicateSessionEventArgs.IsSuccess = false;
                            duplicateSessionEventArgs.StatusCode = 'DUPLICATE_SESSION';
                            duplicateSessionEventArgs.StatusMessage = 'DUPLICATE_SESSION';
                            _onDuplicateSession(duplicateSessionEventArgs);
                            break;
                        default:
                            if (condition.indexOf('remote-connection-failed') != -1) {
                                connectionFailure = true;
                                var errorCode = condition.split(":");
                                //errorCode[1] have the error code
                                var chatConnectionErrorEventArgs = chatConnectionFailureEventArgs;
                                chatConnectionErrorEventArgs.StatusCode = "REMOTE_CONNECTION_FAILURE";
                                chatConnectionErrorEventArgs.StatusMessage = errorCode[1];
                                _onConnectionFailure(chatConnectionFailureEventArgs);
                            } else if (!_connection.disconnecting && condition !== "unknown") {
                                connectionFailure = true;
                                //chatConnectionFailureEventArgs.StatusCode = "CONNECT_FAIL";
                                chatConnectionFailureEventArgs.StatusMessage = condition;
                                _onConnectionFailure(chatConnectionFailureEventArgs);
                            }
                            break;
                    }

                    break;
                case Strophe.Status.AUTHENTICATING:
                    break;
                case Strophe.Status.AUTHFAIL:
                    break;
                case Strophe.Status.DISCONNECTING:
                    break;
                case Strophe.Status.ATTACHED:
                    _connected = true;
                    _connection.addHandler(notifyUser, null, null, null, null, null);
                    if (_onConnectionAttached !== null && _onConnectionAttached !== undefined) {
                        _onConnectionAttached();
                    }
                    break;
                case Strophe.Status.CONNECTED:
                    _connection.addHandler(notifyUser, null, null, null, null, null);
                    var chatConnectEventArgs = {};
                    chatConnectEventArgs.ChatID = _connection.sid.split('_')[0];
                    chatConnectEventArgs.SessionID = _connection.sid;
                    if (_connection.name) {
                        chatConnectEventArgs.name = _connection.name;
                        delete _connection.name;
                    }
                    if (_connection.subject) {
                        chatConnectEventArgs.subject = _connection.subject;
                        delete _connection.subject;
                    }
                    _onConnectSuccess(chatConnectEventArgs);
                    _connected = true;
                    break;
                case Strophe.Status.DISCONNECTED:
                    _connected = false;
                    if (connectionFailure !== true) {
                        _onConnectionComplete();
                    }
                    break;
                default:
                    break;
            }
        }
        ;

        var notifyUser = function (messageObjectFromServer) {
            _connected = true;
            var messageType = messageObjectFromServer.getAttribute('type');
            var messageAuthor = messageObjectFromServer.getAttribute('from');
            if (messageType && messageAuthor && messageAuthor === 'system') {
                if (_onServerNotificationReceived !== null && _onServerNotificationReceived !== undefined) {
                    _onServerNotificationReceived();
                }
            }
            for (var i = 0; i < messageObjectFromServer.childNodes.length; i++) {
                if (!messageObjectFromServer.childNodes[i].tagName) {
                    continue;
                }
                if (messageObjectFromServer.childNodes[i].tagName.indexOf(':widget') > 0) {
                    continue;
                }
                if (messageObjectFromServer.childNodes[i].tagName.indexOf(':body') < 0) {
                    // continue;
                }

                var htmlMessage = messageObjectFromServer.childNodes[i].textContent;
                if (htmlMessage === 'undefined') {
                    htmlMessage = messageObjectFromServer.childNodes[i].text; /* Internet Explorer */
                }


                if ((typeof messageObjectFromServer.childNodes[i].baseName !== "undefined" && messageObjectFromServer.childNodes[i].baseName !== null && messageObjectFromServer.childNodes[i].baseName === 'egainCommand') || (typeof messageObjectFromServer.childNodes[i].localName !== "undefined" && messageObjectFromServer.childNodes[i].localName !== null && messageObjectFromServer.childNodes[i].localName.trim() === 'egainCommand')) {
                    var egainCmd = null;
                    if (typeof messageObjectFromServer.childNodes[i].text !== "undefined" && messageObjectFromServer.childNodes[i].text !== null)
                        egainCmd = messageObjectFromServer.childNodes[i].text;
                    else if (typeof messageObjectFromServer.childNodes[i].textContent !== "undefined" && messageObjectFromServer.childNodes[i].textContent !== null)
                        egainCmd = messageObjectFromServer.childNodes[i].textContent.trim();

                    if (egainCmd !== null && egainCmd !== '') {
                        htmlMessage = "";

                        /// Video
                        if ("custinitiatevideo" === egainCmd && "function" === typeof _onCustomerInitiateVideo)
                        {
                            _onCustomerInitiateVideo();
                        } else if ("agentinitiatevideo" === egainCmd && "function" === typeof _onAgentInitiateVideo)
                        {
                            _onAgentInitiateVideo();
                        } else if ("startVideo" === egainCmd && "function" === typeof _onStartVideo)
                        {
                            _onStartVideo();
                        } else if ("stopVideo" === egainCmd && "function" === typeof _onStopVideo)
                        {
                            _onStopVideo();
                        } else
                        /// Video
                        if (egainCmd.indexOf("egainCBCmd_") === 0)
                        {
                            if (_onCobrowseInviteReceived !== null && _onCobrowseInviteReceived !== undefined) {
                                var cbCmd = egainCmd.substring(11);
                                cbCmd = replaceHexToASCII(cbCmd);
                                var cmd = eval('(' + cbCmd + ')');
                                var action;
                                var sessionId;
                                var customerName;
                                if (typeof (cmd) !== 'undefined' && cmd.action === "add_anchor") {
                                    action = cmd.action;
                                    sessionId = cmd.sessionId;
                                    customerName = cmd.custName;
                                }

                                var cobrowseInviteReceivedEventArgs = {};
                                cobrowseInviteReceivedEventArgs.Action = action;
                                cobrowseInviteReceivedEventArgs.Session = sessionId;
                                cobrowseInviteReceivedEventArgs.CustomerName = customerName;
                                _onCobrowseInviteReceived(cobrowseInviteReceivedEventArgs);
                            }
                        }

                        if (messageObjectFromServer.childNodes[i].childNodes) {
                            var arr = {};
                            var addtionalParams = messageObjectFromServer.childNodes[i];
                            $(addtionalParams).find('ns2\\:egainAdditionalParam,egainAdditionalParam').each(function () {
                                arr[$(this).find('ns2\\:paramKey,paramKey').text()] = $(this).find('ns2\\:paramValue,paramValue').text();
                            });
                            egainCmd = $(addtionalParams).find('ns2\\:subcmd,subcmd').text();
                            console.log("** Egain Command: " + egainCmd + " ***");
                            if (egainCmd !== null) {
                                if (egainCmd == 'backstoppingtriggered' || egainCmd == "VIDEO_CHAT_TOKEN" || egainCmd == 'custattachmentuploaded' || egainCmd == 'acceptcustattachment' || egainCmd == 'custacceptattachment' || egainCmd == 'custrejectattachment' || egainCmd == 'rejectcustattachment' || egainCmd == "agentinitiateattachment")
                                {
                                    if (egainCmd == 'backstoppingtriggered') {
                                        /* TODO : Backstopping Implementation*/
                                    } else if (egainCmd == 'custattachmentuploaded') {
                                        /* Customer Attachment Uploaded Event */
                                        if (_onAttachmentUploadedByCustomer !== null && _onAttachmentUploadedByCustomer !== undefined) {
                                            var attachmentUploadedByCustomerEventArgs = {};
                                            attachmentUploadedByCustomerEventArgs.status = 200;
                                            attachmentUploadedByCustomerEventArgs.attachmentId = arr.attachmentId;
                                            attachmentUploadedByCustomerEventArgs.attachmentName = arr.attachmentName;
                                            attachmentUploadedByCustomerEventArgs.attachmentInternalName = arr.attachmentInternalName;
                                            _onAttachmentUploadedByCustomer(attachmentUploadedByCustomerEventArgs);
                                        }
                                    } else if (egainCmd === 'custacceptattachment') {
                                        /* Attachment Accepted By Customer Event */
                                        if (_onAttachmentAcceptedByCustomer !== null && _onAttachmentAcceptedByCustomer !== undefined) {
                                            var attachmentAcceptedByAgentEventArgs = {};
                                            attachmentAcceptedByAgentEventArgs.FileId = arr.attachmentId;
                                            attachmentAcceptedByAgentEventArgs.FileName = arr.attachmentName;
                                            attachmentAcceptedByAgentEventArgs.CustomerName = arr.agentName;
                                            _onAttachmentAcceptedByCustomer(attachmentAcceptedByAgentEventArgs);
                                        }
                                    } else if (egainCmd === 'custrejectattachment') {
                                        /* Attachment Rejected By Customer Event */
                                        if (_onAttachmentRejectedByCustomer !== null && _onAttachmentRejectedByCustomer !== undefined) {
                                            var attachmentRejectedByAgentEventArgs = {};
                                            attachmentRejectedByAgentEventArgs.fileId = arr.attachmentId;
                                            attachmentRejectedByAgentEventArgs.FileName = arr.attachmentName;
                                            attachmentRejectedByAgentEventArgs.agentName = arr.agentName;
                                            _onAttachmentRejectedByCustomer(attachmentRejectedByAgentEventArgs);
                                        }
                                    } else if (egainCmd === 'acceptcustattachment') {
                                        /* Attachment Accepted By Agent Event */
                                        if (_onAttachmentAcceptedByAgent !== null && _onAttachmentAcceptedByAgent !== undefined) {
                                            var attachmentAcceptedByAgentEventArgs = {};
                                            attachmentAcceptedByAgentEventArgs.agentName = arr.agentName;
                                            attachmentAcceptedByAgentEventArgs.uniqueFileId = arr.filekey;
                                            attachmentAcceptedByAgentEventArgs.fileName = arr.fileName;

                                            _onAttachmentAcceptedByAgent(attachmentAcceptedByAgentEventArgs);
                                        }
                                    } else if (egainCmd === 'rejectcustattachment') {
                                        /* Attachment Rejected By Agent Event */
                                        if (_onAttachmentRejectedByAgent !== null && _onAttachmentRejectedByAgent !== undefined) {
                                            var attachmentRejectedByAgentEventArgs = {};
                                            attachmentRejectedByAgentEventArgs.uniqueFileId = arr.filekey;
                                            _onAttachmentRejectedByAgent(attachmentRejectedByAgentEventArgs);
                                        }
                                    } else if (egainCmd === 'agentinitiateattachment') {
                                        /* Attachment Invite By Agent Event */
                                        if (_onAttachmentInviteReceived !== null && _onAttachmentInviteReceived !== undefined) {
                                            var attachmentInvitedAgentEventArgs = {};
                                            var Attachment = new Object();
                                            Attachment.Id = arr.attachmentId;
                                            Attachment.Name = arr.attachmentName;
                                            Attachment.AgentName = arr.agentName;
                                            Attachment.Type = arr.attachmentType;
                                            Attachment.AttachmentSize = arr.attachmentSize;
                                            attachmentInvitedAgentEventArgs.Attachment = Attachment;
                                            _onAttachmentInviteReceived(attachmentInvitedAgentEventArgs);
                                        }
                                    } else
                                    {
                                        var onVideoChatTokenReceivedEventArgs = {};
                                        onVideoChatTokenReceivedEventArgs.avmode = arr["VIDEO_CHAT_AVMODE"];
                                        onVideoChatTokenReceivedEventArgs.vendor = arr["VIDEO_CHAT_VENDOR"];
                                        if ("opentok" === arr["VIDEO_CHAT_VENDOR"])
                                        {
                                            onVideoChatTokenReceivedEventArgs.openTokParams = arr;
                                        }
                                        _onVideoChatTokenReceived(onVideoChatTokenReceivedEventArgs);
                                    }
                                } else if ("agentautoreject" === egainCmd && "function" === typeof _onAgentAutoRejectVideo)
                                {
                                    _onAgentAutoRejectVideo();
                                } else if ("custautoreject" === egainCmd && "function" === typeof _onCustomerAutoRejectVideo)
                                {
                                    _onCustomerAutoRejectVideo();
                                }
                            }
                        }
                    }
                }

                if (messageType) {
                    htmlMessage = unescape(htmlMessage);
                    htmlMessage = decodeMessage(htmlMessage);
                }
                if (htmlMessage && htmlMessage.length && htmlMessage.length > 0) {
                    if (messageAuthor) {
                        messageAuthor = decodeMessage(messageAuthor);
                    }
                    if (messageType === 'normal') {
                        if (htmlMessage === 'typing_message') {
                            var agentStartTypingEventArgs = {};
                            agentStartTypingEventArgs.AgentScreenName = messageAuthor;
                            if (_onAgentStartTyping !== null && _onAgentStartTyping !== undefined) {
                                _onAgentStartTyping(agentStartTypingEventArgs);
                            }
                        } else {
                            var agentStopTypingEventArgs = {};
                            agentStopTypingEventArgs.AgentScreenName = messageAuthor;
                            if (_onAgentStopTyping !== null && _onAgentStopTyping !== undefined) {
                                _onAgentStopTyping(agentStopTypingEventArgs);
                            }
                        }
                        return true;
                    }

                    if ('ActivitySubtypeChangedToVideoChat' === htmlMessage || 'AgentInitiateAttachment' === htmlMessage)
                    {
                        continue;
                    }

                    var subCmd = $(messageObjectFromServer).find('ns2\\:subcmd,subcmd').text();
                    if (messageType === 'chat' && messageAuthor !== 'system') {
                        /* TODO: Fix the special characters issues that are currently occurring */
                        var agentMessageReceivedEventArgs = {};
                        agentMessageReceivedEventArgs.Message = htmlMessage;
                        agentMessageReceivedEventArgs.AgentScreenName = messageAuthor;
                        agentMessageReceivedEventArgs.PagePushMessage = ("pagePushLink" === subCmd);
                        _onAgentMessageReceived(agentMessageReceivedEventArgs);
                    } else {

                        var systemMessageReceivedEventArgs = {};
                        systemMessageReceivedEventArgs.Message = htmlMessage;
                        if (subCmd !== null) {
                            var arr = {};
                            $(messageObjectFromServer).find('ns2\\:egainAdditionalParam,egainAdditionalParam').each(function () {
                                arr[$(this).find('ns2\\:paramKey,paramKey').text()] = $(this).find('ns2\\:paramValue,paramValue').text();
                            });
                            if (subCmd === 'agentPickup') {
                                var agentJoinedEventArgs = {};
                                systemMessageReceivedEventArgs.AgentJoinedMessage = true;
                                if ('agentName' in arr) {
                                    var agentName = arr['agentName'];
                                    agentJoinedEventArgs.AgentName = agentName;
                                }
                                if (_onAgentJoined !== null && _onAgentJoined !== undefined) {
                                    _onAgentJoined(agentJoinedEventArgs);
                                }
                            }
                            if (subCmd === 'activityTransfer') {
                                systemMessageReceivedEventArgs.ChatTransferMessage = true;
                                var chatTransferEventArgs = {};
                                if ('eglvtransfertype' in arr) {
                                    var transType = arr['eglvtransfertype'];
                                    if (parseInt(transType) > 0) {
                                        chatTransferEventArgs.TransferType = transType;
                                    }
                                }
                                if ('eglvtransferEntityName' in arr) {
                                    var transferEntityName = arr['eglvtransferEntityName'];
                                    if (transferEntityName) {
                                        chatTransferEventArgs.TransferEntityName = transferEntityName;
                                    }
                                }
                                if ('chatAttachment' in arr) {
                                    var chatAttachmentEnabled = (arr['chatAttachment'] == 1 || arr['chatAttachment'] == 3);
                                    chatTransferEventArgs.ChatAttachmentEnabled = chatAttachmentEnabled;

                                }
                                if (_onChatTransfer !== null && _onChatTransfer !== undefined) {
                                    _onChatTransfer(chatTransferEventArgs);
                                }
                            }
                            if (subCmd === 'attachment') {
                                systemMessageReceivedEventArgs.ArticleAttachmentMessage = true;
                                if ('articleAttachmentId' in arr) {
                                    var attachmentId = arr['articleAttachmentId'];
                                    if (parseInt(attachmentId) > 0) {
                                        systemMessageReceivedEventArgs.Attachment = {};

                                        systemMessageReceivedEventArgs.Attachment["Id"] = attachmentId;
                                        systemMessageReceivedEventArgs.Attachment["Name"] = getArticleAttachmentName(systemMessageReceivedEventArgs.Message);
                                    }
                                }
                            }
                            if ("vchatCapable" in arr && "function" === typeof _onVideoChatCapable)
                            {
                                var onVideoChatCapableArgs = {};
                                var vchatCapable = arr['vchatCapable'];
                                if ("2" === transType || "1" === transType)
                                {
                                    onVideoChatCapableArgs.isVideoChatEnabled = (vchatCapable === "1");
                                    onVideoChatCapableArgs.showVideoButton = true;
                                } else
                                {
                                    onVideoChatCapableArgs.showVideoButton = (vchatCapable === "1");
                                }
                                _onVideoChatCapable(onVideoChatCapableArgs);
                            }
                            if ("vchatMaxEscalation" in arr && "function" === typeof _onVideoChatMaxEscalation)
                            {
                                var onVideoChatMaxEscalationArgs = {};
                                onVideoChatMaxEscalationArgs.videoChatMaxEscalation = parseInt(arr['vchatMaxEscalation']);
                                onVideoChatMaxEscalationArgs.isDirectVideoChatEnabled = (onVideoChatMaxEscalationArgs.videoChatMaxEscalation === 3 || onVideoChatMaxEscalationArgs.videoChatMaxEscalation > 4);
                                _onVideoChatMaxEscalation(onVideoChatMaxEscalationArgs);
                            }
                            if ("enableDirectAudioChat" in arr && "function" === typeof _onAudioChatEnabled)
                            {
                                var onAudioChatEnabledArgs = {};
                                onAudioChatEnabledArgs.isDirectAudioChatEnabled = (arr['enableDirectAudioChat'] === "1");
                                _onAudioChatEnabled(onAudioChatEnabledArgs);
                            }
                            if (subCmd === 'acceptcustattachment')
                            {
                                systemMessageReceivedEventArgs.AttachmentAcceptedMsg = true;
                                systemMessageReceivedEventArgs.uniqueFileId = arr.filekey;
                                systemMessageReceivedEventArgs.FileName = arr.fileName;
                            }
                        }

                        _onSystemMessageReceived(systemMessageReceivedEventArgs);
                    }
                    //return true;
                }
            }
            /* Potentially implement callback for Chat Timeout event */
            return true;

        };

        this._getEventHandlers = function () {
            var _chatEventListeners = new ChatEventHandlers();
            var _connectionEventListeners = new _this.Datatype.EventHandlers();
            for (var i in _connectionEventListeners) {
                if (!_chatEventListeners.hasOwnProperty(i)) {
                    _chatEventListeners[i] = _connectionEventListeners[i];
                }
            }
            return _chatEventListeners;
        }();

        this._initialize = function (entryPointId, language, country, eventHandlers, templateName, version, serverURL, video, avmode) {
            var _chatInitResult = new _this.Datatype.ResultObject();
            var languageCode = language ? language : 'en'; /* default if no parameter */
            var countryCode = country ? country : 'US'; /* default if no parameter */
            var _templateName = templateName ? templateName : "";
            var _version = version ? version : "";
            _entryPointId = entryPointId;
            _video = video;
            _videoURLParam = (true === _video) ? "videoChat=1" : _videoURLParam;
            _avmode = avmode;
            _avmodeURLParam = (null !== _avmode && "number" === typeof _avmode) ? "avmode=" + _avmode : _avmodeURLParam;

            initializeApplicationState(entryPointId, language, country, templateName, version, serverURL);

            BOSH_SERVICE = _corsHost + '/egain/chat/entrypoint?entryPointId=' +
                    entryPointId + '&templateName=' + _templateName + '&languageCode=' + languageCode + '&countryCode=' + countryCode + '&ver=' + _version;
            MESSAGING_URL = _eGainContextPath + 'l10n/messaging_' + languageCode + '_' + countryCode + '.properties';
            MASKING_URL = _corsHost + '/egain/chat/entrypoint/initialize' + '/' + entryPointId;

            validateEventHandlers(eventHandlers);
            validateChatEventHandlers(eventHandlers);
            connectionObj.InitializeConnectionObject.call(this, BOSH_SERVICE, MESSAGING_URL, MASKING_URL);

            return _chatInitResult;
        };
        // Locale messaging properties
        this._loadMessagingProperties = function (messagingPropertyUrl) {
            // Read eGain messaging propterties
            fs.readFile('./l10n/messaging_en_us.properties', 'utf8', function (err,data) {
                if (err) {
                    return console.log(err);
                }
                //console.log(data);
                _connection.eGainMessagingProperty = "\n" + data;
                //_connection.eGainMessagingProperty = _connection.eGainMessagingProperty + "\n" + data;
                //if (_onCallBackMessagePropertyLoad !== null && _onCallBackMessagePropertyLoad !== undefined) {
                //    _onCallBackMessagePropertyLoad(data);
                //}
            });
//            $.ajax({
//                url: messagingPropertyUrl,
//                type: 'GET',
//                dataType: 'text',
//                success: function (data) {
//                    _connection.eGainMessagingProperty = data;
//                    if (_onMessagePropertyLoad !== null && _onMessagePropertyLoad !== undefined) {
//                        _onMessagePropertyLoad(data);
//                    }
//                }
//            });
        };

        this._start = function () {
            connectionObj.Start(onConnect);
        };

        this._end = function () {
            if (_connection !== null && _connected === true) {
                /* TODO: The L10N must be passed by the client code */
                _connection.disconnect("L10N_CLOSE_MESSAGE");
            }
        };

        this._sendMessageToAgent = function (htmlMessage, isMessageOffRecord) {
            if (htmlMessage === '')
                return;

            if (!isMessageOffRecord) {
                isMessageOffRecord = false;
            }

            var origHTMLMsg = htmlMessage;
            var maskedMessage = origHTMLMsg;
            if (!isMessageOffRecord)
            {
                maskedMessage = _egainLib.Masker.MaskData(htmlMessage);
            }

            submitMessage(maskedMessage);

            return maskedMessage;

        };

        this._sendSystemMessage = function (htmlMessage, cmd) {
            if (typeof cmd === 'undefined') {
                submitMessage(htmlMessage, 'headline');
            } else {
                submitMessage(htmlMessage, 'headline', cmd);
            }

        };

        this._sendCustomerStartTyping = function () {
            _connection.send($msg({
                'type': 'normal'
            }).c('body').t('1').tree());

        };

        this._sendCustomerStopTyping = function () {
            _connection.send($msg({
                'type': 'normal'
            }).c('body').t('0').tree());
        };

        this._getTranscript = function () {
            var TRANSCRIPT_URL = _corsHost + "/egain/chat/entrypoint/transcript";
            var inputXML = "<chatSession xmlns='http://bindings.egain.com/chat'><sid>";
            inputXML += _connection.sid;
            inputXML += "</sid></chatSession>";

            var getTranscriptArgs = {};

            $.ajax({
                type: 'POST',
                url: TRANSCRIPT_URL,
                data: inputXML,
                contentType: 'application/xml',
                dataType: 'json',
                success: function (response) {
                    if (response) {
                        if (response.customerName) {
                            getTranscriptArgs.CustomerName = response.customerName;
                        }
                        if (response.subject) {
                            getTranscriptArgs.Subject = response.subject;
                        }
                        if (response.assignedTo) {
                            getTranscriptArgs.Assignee = response.assignedTo;
                        }
                        if (response.startTime) {
                            getTranscriptArgs.StartTime = response.startTime;
                        }
                        if (Array.isArray && Array.isArray(response.message) && response.message.length > 0) {
                            getTranscriptArgs.Messages = [];
                            for (var i = 0; i < response.message.length; i++) {
                                var messageObj = {};
                                var msg = response.message[i];
                                messageObj.Body = msg["body"];
                                var sender = msg["sender"];
                                if (sender) {
                                    messageObj.SenderName = sender.name;
                                    messageObj.SenderType = sender.type;
                                }
                                var invitation = msg["invitation"];
                                if (invitation) {
                                    messageObj.InvitationMedia = invitation.media;
                                    messageObj.InvitationStatus = invitation.status;
                                }
                                messageObj.Timestamp = msg.timeStamp;
                                messageObj.OffRecord = msg.offRecord;
                                if (msg.attachment) {
                                    messageObj.Attachment = {};
                                    messageObj.Attachment.MimeType = msg.attachment.mimeType;
                                    if (msg.attachment.internalName) {
                                        messageObj.Attachment.AttachmentInternalName = msg.attachment.internalName;
                                        messageObj.Attachment.SenderName = typeof response.customerName == 'undefined' ? 'Customer' : response.customerName;
                                        messageObj.Attachment.SenderType = 'Customer';
                                    } else {
                                        messageObj.Attachment.SenderName = response.assignedTo;
                                        messageObj.Attachment.SenderType = 'Agent';
                                    }
                                    messageObj.Attachment.Name = msg.attachment.name;
                                    messageObj.Attachment.AttachmentSize = msg.attachment.size;
                                    messageObj.Attachment.Status = msg.attachment.status;
                                    messageObj.Attachment.Id = msg.attachment.url ? msg.attachment.url.substring(msg.attachment.url.lastIndexOf('/') + 1) : null;
                                }
                                getTranscriptArgs.Messages.push(messageObj);
                            }
                        }
                    }

                    if (_onTranscriptFetched)
                        _onTranscriptFetched(getTranscriptArgs);

                }
            });
        };

        this._pause = function () {
            var connection = _connection;
            if (connection.connected && connection.paused === false) {
                connection.flush();
                var chatPauseDuration = (librarySettings) ? librarySettings.ChatPauseInSec : 30;
                var body = connection._buildBody().attrs({pause: chatPauseDuration});
                var req = new Strophe.Request(body.tree(), connection._onRequestStateChange.bind(connection)
                        .prependArg(connection._dataRecv.bind(connection)), body.tree().getAttribute("rid"));
                connection._requests.push(req);
                connection._processRequest(_connection._requests.length - 1);
                connection.pause();
                connection._throttledRequestHandler();

                var chatPausedEventArgs = {};
                chatPausedEventArgs.requestID = _connection.rid;
                chatPausedEventArgs.sessionID = _connection.sid;
                if (_onConnectionPaused) {
                    _onConnectionPaused(chatPausedEventArgs);
                }
            }
        };

        this._attach = function (sessionID, requestID) {
            var jid = 'egain@egain.com';

            var attachConnectionUrl = _corsHost + "/egain/chat/entrypoint/attachConnection";
            $.ajax({
                type: 'POST',
                url: attachConnectionUrl,
                data: {'sid': sessionID},
                dataType: 'text',
                success: function (string) {
                    _connection.attach(jid, sessionID, requestID, onConnect);
                },
                error: function () {
                    /* Error handling */
                    if (_onConnectionAttachedFailure) {
                        _onConnectionAttachedFailure();
                    }

                }
            });

        };

        this._resume = function () {
            var connection = _connection;

            if (connection.connected && connection.paused) {
                connection.resume();

                if (_onConnectionResumed) {
                    _onConnectionResumed();
                }
            }
        };

        this._acceptVideoChat = function (sessionID, userId, avmode) {
            var convertVideoChatUrl = _corsHost + "/egain/chat/entrypoint/convertvideochat";
            //this check is to prevent second request being sent in case of double click
            if (!AVacceptRejectMsgSent) {
                AVacceptRejectMsgSent = true;
                $.ajax({
                    type: 'POST',
                    url: convertVideoChatUrl,
                    data: {'sid': sessionID, 'userId': userId, 'entryPointId': _entryPointId, 'avmode': avmode},
                    dataType: 'text',
                    success: function (string) {
                        AVacceptRejectMsgSent = false;
                        if ("function" === typeof _onAcceptVideoChat) {
                            _onAcceptVideoChat(string === "true");
                        }
                    }
                });
            }
        };
        this._declineVideoChat = function (sessionID, userId, avmode) {
            var rejectVideoChatUrl = _corsHost + "/egain/chat/entrypoint/rejectvideochat";
            //this check is to prevent second request being sent in case of double click
            if (!AVacceptRejectMsgSent) {
                AVacceptRejectMsgSent = true;
                $.ajax({
                    type: 'POST',
                    url: rejectVideoChatUrl,
                    data: {'sid': sessionID, 'userId': userId, 'avmode': avmode},
                    dataType: 'text',
                    success: function (string) {
                        AVacceptRejectMsgSent = false;
                        if ("function" === typeof _onDeclineVideoChat) {
                            _onDeclineVideoChat(string === "true");
                        }
                    }
                });
            }
        };
        this._getMediaServerDetails = function () {
            $.ajax({
                type: 'GET',
                url: _corsHost + '/egain/chat/entrypoint/mediaServer',
                dataType: 'xml',
                success: function (xml) {
                    var mediaServerObj = {};
                    var mediaServer = $(xml).find('mediaServer');
                    mediaServerObj.mediaServerURL = mediaServer.attr('mediaServerURL');
                    mediaServerObj.mediaServerSecEnabled = mediaServer.attr('mediaServerSecEnabled');
                    mediaServerObj.mediaServerSecToken = mediaServer.attr('mediaServerSecToken');
                    mediaServerObj.mediaServerSecConnectParam = mediaServer.attr('mediaServerSecConnectParam');
                    mediaServerObj.mediaServerSecPlayParam = mediaServer.attr('mediaServerSecPlayParam');
                    mediaServerObj.mediaServerSecPublishParam = mediaServer.attr('mediaServerSecPublishParam');
                    if ("function" === typeof _onGetMediaServerDetails) {
                        _onGetMediaServerDetails(mediaServerObj);
                    }
                }
            });
        };
        this._initiateVideoChat = function (sessionID) {
            var initiateVideoChatUrl = _corsHost + '/egain/chat/entrypoint/initiatevideochat';
            var customerIdent = "Customer";
            $.ajax({
                type: 'POST',
                url: initiateVideoChatUrl,
                data: {'sid': sessionID, 'entryPointId': _entryPointId, 'customerIdent': customerIdent},
                dataType: 'text',
                success: function (response) {
                    if ("function" === typeof _onInitiateVideoChat) {
                        var onInitiateVideoChatResponse = {
                            "statusCode": 0,
                            "statusText": "EG_VIDEO_AGENT_NOT_AVAILABLE"
                        };
                        if ("1" === response) {
                            onInitiateVideoChatResponse.statusCode = 1;
                            onInitiateVideoChatResponse.statusText = "OK";
                        } else if ("-1" === response) {
                            onInitiateVideoChatResponse.statusCode = -1;
                            onInitiateVideoChatResponse.statusText = "EG_VIDEO_INVITE_ALREADY_SENT";
                        }
                        _onInitiateVideoChat(onInitiateVideoChatResponse);
                    }
                }
            });
        };

        this._uploadAttachment = function (file, agentName) {
            var xhr;
            if (file !== -1) {
                var chatAttachmentUrl = _corsHost + '/egain/chat/entrypoint' + "/uploadAttachments?language=" + languageCode + "&country=" + countryCode;
                var uploadAttachmentArgs = {};
                uploadAttachmentArgs.uniqueFileId = file.uniqueFileId;
                var formData = new FormData();
                formData.append('sid', _connection.sid);
                formData.append('agentName', agentName);
                formData.append('fileSize', file.size);
                formData.append('fileId', file.uniqueFileId);
                formData.append(file.newName, file);
                xhr = new XMLHttpRequest();
                xhr.onload = function (evt) {
                    if (evt.target.responseText != parseInt(evt.target.responseText)) {
                        uploadAttachmentArgs.status = "failed";
                        uploadAttachmentArgs.message = evt.target.responseText;
                        _onAttachmentUploadedByCustomer(uploadAttachmentArgs);
                    }
                };
                xhr.open("post", chatAttachmentUrl, true);
                xhr.send(formData);
            }
            return xhr;
        };


        this._getAttachment = function (fileId, uniqueFileId) {
            var xhr;
            if (fileId !== -1) {
                var agentAttachmentArgs = {};
                agentAttachmentArgs.fileId = fileId;
                agentAttachmentArgs.uniqueFileId = uniqueFileId;
                var chatAttachmentUrl = _corsHost + '/egain/chat/entrypoint' + "/getattachment/" + fileId;
                xhr = new XMLHttpRequest();
                xhr.open('post', chatAttachmentUrl, true);
                xhr.responseType = 'arraybuffer';
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
                xhr.onload = function (e) {

                    agentAttachmentArgs.data = this.response;
                    if (_onGetAttachment !== null && typeof _onGetAttachment !== 'undefined') {
                        _onGetAttachment(agentAttachmentArgs);
                    }
                };

                xhr.send("sid=" + _connection.sid);
            }
            return xhr;
        };

        this._getArticleAttachment = function (fileName) {

            fileName = escape(fileName);
            fileName = decodeMessage(fileName);
            var attachmentUrl = _corsHost + "/egain/chat/entrypoint/getattachment/" + encodeURIComponent(fileName);
            if (typeof document.formAttachment == 'undefined' || document.formAttachment === null) {
                var formAttachment = document.createElement("form");
                formAttachment.setAttribute('name', "formAttachment");
                formAttachment.setAttribute('method', "POST");

                var i = document.createElement("input"); //input element, text
                i.setAttribute('type', "hidden");
                i.setAttribute('name', "sid");

                var s = document.createElement("input"); //input element, Submit button
                s.setAttribute('type', "hidden");
                s.setAttribute('name', "setCacheHeaders");

                formAttachment.appendChild(i);
                formAttachment.appendChild(s);
                document.body.appendChild(formAttachment);
            }
            if (fileName) {
                document.formAttachment.action = attachmentUrl;
                document.formAttachment.sid.value = _connection.sid;
                document.formAttachment.target = "attachmenttarget";
                document.formAttachment.setCacheHeaders.value = "false";
                document.formAttachment.submit();

            }
        };


        this._getAttachmentImage = function (attachmentId, uniqueFileId) {
            var data = null;
            var attachmentThumbnailArgs = {};
            $.ajax({
                type: 'POST',
                url: _corsHost + '/egain/chat/entrypoint/getImageThumbnail',
                data: {'sid': _connection.sid, 'fileId': attachmentId},
                dataType: 'text',
                success: function (responseText) {
                    if (responseText)
                    {
                        data = responseText;
                        if (_onGetAttachmentImageThumbnail !== null && typeof _onGetAttachmentImageThumbnail !== 'undefined') {
                            attachmentThumbnailArgs.data = data;
                            attachmentThumbnailArgs.fileId = attachmentId;
                            if (typeof uniqueFileId !== 'undefined' && uniqueFileId !== null)
                                attachmentThumbnailArgs.uniqueFileId = uniqueFileId;
                            _onGetAttachmentImageThumbnail(attachmentThumbnailArgs);
                        }
                    }
                },
                error: function () {
                    return null;
                }
            });
        };
        /*
         this._getAttachmentImage = function (attachmentId) {
         var response = null;
         $.ajax({
         type: 'POST',
         url: BOSH_SERVICE + '/getImageThumbnail',
         data: {'sid': _connection.sid, 'fileId': attachmentId},
         dataType: 'text',
         success: function (responseText) {
         if (responseText)
         {
         response = responseText;
         return response;
         }
         },
         error: function () {
         return null;
         }
         });
         };
         */
        
        // This is a Facebook specific function as FB won't stream the file from the 
        // customer.. they upload it and save it and send an URL to it. ie: we don't
        // actually get the file data.
        // Here we are going to intercept it and read from the URL.. save it and then 
        // send it to ECE
        function getUrlData(fileURL) {
            $.get( fileURL, function( data ) {
                console.log("Received Data from Facebook: " + fileURL);
                return data;
            });
//            var download = function(url, dest, cb) {
//                var file = fs.createWriteStream(dest);
//                var request = http.get(url, function(response) {
//                  response.pipe(file);
//                  file.on('finish', function() {
//                    file.close(cb);
//                  });
//                });
//            }
        } 
        // Function to download data to a file
        function saveFileFromURL(data, filename, type) {
            var Blob = require('blob');
            var file = new BlobConstructor([data], {type: type});
            if (window.navigator.msSaveOrOpenBlob) // IE10+
                window.navigator.msSaveOrOpenBlob(file, filename);
            else { // Others
                var a = document.createElement("a"),
                        url = URL.createObjectURL(file);
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                setTimeout(function() {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);  
                }, 0); 
            }
        }
        function GetFilename(url)
        {
            if(url)
            {
                var m = url.toString().match(/.*\/(.+?)\?/);
                if (m && m.length > 1)
                {
                    return m[1];
                }
            }
            return "";
        } 
//        this.getFileData = function (fileURL)
//        {
//            $.get( fileURL, function( data ) {
//                console.log("Received Data from Facebook!");
//                var fileName = GetFilename(fileURL);
//                //saveFileFromURL(data, fileName, 'pdf');
//                this._sendCustomerAttachmentNotification(fileName, "Michael Littlefoot");
//                //return fileName;
//            });
//        }
        // This is a mod to the original eGain Attachment Notification function
        // The original expects a File object, however FB only sends a URL which
        // we have to send to the Agent
        this._sendCustomerAttachmentNotification = function (files, customerName) {
            var fileData = getUrlData(files);
            var timeStamp = (new Date()).getTime();
            var errorOccured = false;
            
            var file = [files];
            //file = files;
            file.name = GetFilename(files);
            //saveFileFromURL(fileData, file.name, 'pdf');
            var uniqueFileId = timeStamp + "" + 1;
            file.newName = uniqueFileId + "_" + file.name;
            file.uniqueFileId = uniqueFileId;
            file.size = 500;
            $.ajax({
                type: 'POST',
                url: _corsHost + '/egain/chat/entrypoint/sendCustAttachmentNotificaiton',
                data: {'sid': _connection.sid, 'customerIdentity': customerName, 'attachmentName': file.name, 'attachmentInternalName': file.newName, 'attachmentId': uniqueFileId, 'attachmentSize': file.size},
                dataType: 'text',
                file: file,
                success: function (rettext) {
                    var customerAttachmentNotificationSentEventArgs = {};
                    if (rettext === 'attachmentSettingDisabledForCustomer') {
                        customerAttachmentNotificationSentEventArgs.status = 'failed';
                        customerAttachmentNotificationSentEventArgs.message = rettext;
                        if (!errorOccured)
                        {
                            _onCustomerAttachmentNotificationSent(customerAttachmentNotificationSentEventArgs);
                            errorOccured = true;
                        }

                    } else if (_onCustomerAttachmentNotificationSent !== null && typeof _onCustomerAttachmentNotificationSent !== 'undefined') {
                        var File = {};
                        File.filename = file.name;
                        File.size = file.size;
                        File.uniqueFileId = uniqueFileId;
                        customerAttachmentNotificationSentEventArgs.status = 'success';
                        customerAttachmentNotificationSentEventArgs.File = File;
                        _onCustomerAttachmentNotificationSent(customerAttachmentNotificationSentEventArgs);
                    }
                },
                error: function (error) {
                    console.log('Send Attachment Notification Error; ' + eval(error));
                }
            });
            
        };
//        this._sendCustomerAttachmentNotification = function (files, customerName) {
////            var fileData = getUrlData(files);
////            var fileName = GetFilename(files);
//            var timeStamp = (new Date()).getTime();
//            var errorOccured = false;
//            for (var i = 0; i < files.length; i++) {
//                (
//                function (i) {
//                    var file = files[i];
//                    var uniqueFileId = timeStamp + "" + i;
//                    file.newName = uniqueFileId + "_" + file.name;
//                    file.uniqueFileId = uniqueFileId;
//                    $.ajax({
//                        type: 'POST',
//                        url: _corsHost + '/egain/chat/entrypoint/sendCustAttachmentNotificaiton',
//                        data: {'sid': _connection.sid, 'customerIdentity': customerName, 'attachmentName': file.name, 'attachmentInternalName': file.newName, 'attachmentId': uniqueFileId, 'attachmentSize': file.size},
//                        dataType: 'text',
//                        file: file,
//                        success: function (rettext) {
//                            var customerAttachmentNotificationSentEventArgs = {};
//                            if (rettext === 'attachmentSettingDisabledForCustomer') {
//                                customerAttachmentNotificationSentEventArgs.status = 'failed';
//                                customerAttachmentNotificationSentEventArgs.message = rettext;
//                                if (!errorOccured)
//                                {
//                                    _onCustomerAttachmentNotificationSent(customerAttachmentNotificationSentEventArgs);
//                                    errorOccured = true;
//                                }
//
//                            } else if (_onCustomerAttachmentNotificationSent !== null && typeof _onCustomerAttachmentNotificationSent !== 'undefined') {
//                                var File = {};
//                                File.filename = file.name;
//                                File.size = file.size;
//                                File.uniqueFileId = uniqueFileId;
//                                customerAttachmentNotificationSentEventArgs.status = 'success';
//                                customerAttachmentNotificationSentEventArgs.File = File;
//                                _onCustomerAttachmentNotificationSent(customerAttachmentNotificationSentEventArgs);
//                            }
//                        }
//                    });
//                })(i);
//            }
//        };

        this._sendAcceptChatAttachmentNotification = function (fileId, fileName, customerName) {
            var attachmentAcceptUrl = _corsHost + "/egain/chat/entrypoint/acceptattachment/" + encodeURIComponent(fileId);
            //this check is to prevent second request being sent in case of double click
            if (!this.acceptRejectAttachSent) {
                this.acceptRejectAttachSent = true;
                $.ajax({
                    type: 'POST',
                    url: attachmentAcceptUrl,
                    data: {'sid': _connection.sid, 'customerIdentity': customerName, 'entryPointId': _entryPointId, 'fileId': fileId, 'fileName': fileName},
                    dataType: 'text',
                    success: function (string) {

                    },
                    error: function () {

                    }
                });
            }
            this.acceptRejectAttachSent = false;
        };

        this._sendRejectChatAttachmentNotification = function (fileId, fileName, customerName) {
            var rejectAttachmenttUrl = _corsHost + "/egain/chat/entrypoint/rejectattachment/" + encodeURIComponent(fileId);
            ;
            //this check is to prevent second request being sent in case of double click
            if (!this.acceptRejectAttachSent) {
                this.acceptRejectAttachSent = true;
                $.ajax({
                    type: 'POST',
                    url: rejectAttachmenttUrl,
                    data: {'sid': _connection.sid, 'customerIdentity': customerName, 'entryPointId': _entryPointId, 'fileId': fileId, 'fileName': fileName},
                    dataType: 'text',
                    success: function (string) {

                    },
                    error: function () {

                    }
                });
            }
            this.acceptRejectAttachSent = false;
        };
    };
    Chat.prototype = {
        GetEventHandlers: function () {
            return this._getEventHandlers;
        },
        Initialize: function (entryPointId, language, country, eventHandlers, templateName, version, serverURL, video, avmode) {
            this._initialize(entryPointId, language, country, eventHandlers, templateName, version, serverURL, video, avmode);
        },
        LoadMessagingProperties: function (messagingPropertyUrl) {
            this._loadMessagingProperties(messagingPropertyUrl);
        },
        /**
         *  Start is used to start the chat after the settings have been configured and the instance of the 
         *      eGainLibary.Chat object has been created.
         */
        Start: function () {
            this._start();
        },
        /**
         * SendMessageToAgent is used to send the customer messages to the agent.
         * @param {String} htmlMessage is the HTML formatted message sent by customer
         * @param {boolean} isMessageOffRecord indicates whether or not the current message should be sent but not stored in the transcript. 
         *       Also if masking is turned on anym essages sent with a true value for isMessageOffRecord will send the clear text to the agent NOT the masked version of the message.
         * @returns {String - message that was sent to the agent, this will include masking characters if the option is turned on.
         */
        SendMessageToAgent: function (htmlMessage, isMessageOffRecord) {
            return this._sendMessageToAgent(htmlMessage, isMessageOffRecord)

        },
        /**
         * SendSystemMessage is used to send "System Messages" to the agent from the customer. These can be any HTML String value and are 
         *      displayed to the agent as informative messages displayed in grayed text on the agent side. 
         *      If events occur on the client side that would be useful to inform the agent these can be sent as "System Messages". 
         *      This is also a method that should be called with text such as "Sensitive data has been masked" 
         *      when the SendMessageToAgent() method is called with masking enabled. This will store the message in the transcript 
         *      allowing the agent to know why the special characters are displayed.
         * @param {String} htmlMessage is the HTML formatted message 
         */
        SendSystemMessage: function (htmlMessage, cmd) {
            this._sendSystemMessage(htmlMessage, cmd);

        },
        /**
         * The SendCustomerTypingStatus method is used to indicate to the agent that the customer
         *      is in the middle of sending a message.  
         */
        SendCustomerStartTyping: function () {
            this._sendCustomerStartTyping();
        },
        /**
         * The SendCustomerTypingStatus method is used to indicate to the agent that the customer
         *       has stopped typing.  
         */
        SendCustomerStopTyping: function () {
            this._sendCustomerStopTyping();
        },
        /**
         * The GetTranscript method is used fetch transcript from server
         *       for ongoing chats.  
         */
        GetTranscript: function () {
            this._getTranscript();
        },
        /**
         *  EndChat method is called when the customer desires to end the chat session.
         */
        End: function () {
            this._end();
        },
        /**
         * PauseChat method is called when a chat is paused. This API pauses the connection manager. 
         * The pause time should be less than the MAX pause time configured at chat server. 
         * This API will send XMPP pause request to server and then will pause the request manager.
         */
        Pause: function () {
            this._pause();
        },
        /**
         * AttachToChat API is called to attach to an existing chat connection. This API needs to be called on page
         * navigation. 
         * USE CASE : When page is reloaded, when user navigates to different page etc
         * @param {Integer} entryPointID is the chat entry point ID
         * @param {locale} Chat locale having language code and country code
         * @param {sessionID} Chat session ID of existing chat
         * @param {requestID}  Request ID to attach to. Next request will use this ID
         */
        Attach: function (sessionID, requestID) {
            this._attach(sessionID, requestID);
        },
        /**
         * ResumeChat API is called to resume the connection manager. This API needs to be called after PauseChat.
         */
        Resume: function () {
            this._resume();
        },
        AcceptVideoChat: function (sessionID, userId, avmode) {
            this._acceptVideoChat(sessionID, userId, avmode);
        },
        DeclineVideoChat: function (sessionID, userId, avmode) {
            this._declineVideoChat(sessionID, userId, avmode);
        },
        GetMediaServerDetails: function () {
            this._getMediaServerDetails();
        },
        InitiateVideoChat: function (sessionID) {
            this._initiateVideoChat(sessionID);
        },
        UploadAttachment: function (file, agentName) {
            this._uploadAttachment(file, agentName);
        },
        GetAttachment: function (fileId, uniqueFileId) {
            this._getAttachment(fileId, uniqueFileId);
        },
        GetArticleAttachment: function (fileName) {
            this._getArticleAttachment(fileName);
        },
        GetAttachmentImage: function (attachmentId, uniqueFileId) {
            this._getAttachmentImage(attachmentId, uniqueFileId);
        },
        SendCustomerAttachmentNotification: function (files, customerName) {
            this._sendCustomerAttachmentNotification(files, customerName);
        },
        SendAcceptChatAttachmentNotification: function (fileId, fileName, customerName) {
            this._sendAcceptChatAttachmentNotification(fileId, fileName, customerName);
        },
        SendRejectChatAttachmentNotification: function (fileId, fileName, customerName) {
            this._sendRejectChatAttachmentNotification(fileId, fileName, customerName);
        }
    };

    this.Chat = Chat;
    /*
     * 
     * Callback object will have methods specific to Callback
     */
    var Callback = function () {
        Chat.call(this);
        var connectionObj = new Connection();
        var _onCallBackInitialized;
        var _onCallBackMessagePropertyLoad;
        var _onCallBackConnectionFailure;
        var _onDuplicateSession;
        var _onCallBackCompletion;
        var _onSystemMessageReceived;
        var _onCallBackErrorOccurred;
        var _onAgentsNotAvailable;
        var _onGetQueueCurrentStatus;
        var _onServerNotificationReceived;
        var _onCallBackConnectSuccess;
        var _onCallBackSucceeded;

        var validateCallbackEventHandlers = function (eventHandlers) {
            try {
                /* Start the constructor by checking that the input parameter of callbacks is an object */
                if (typeof (eventHandlers) !== 'object') {
                    throw "The library cannot be initialized without providing an eGainCallBackCallbacks Object as parameter.";
                }
                /* Next validate the minimum required callbacks are provided. */
                if (typeof (eventHandlers.OnCallBackInitialized) !== "function") {
                    /* This callback is not mandatory  */
                } else {
                    _onCallBackInitialized = eventHandlers.OnCallBackInitialized;
                }
                /* Next validate the minimum required callbacks are provided. */
                if (typeof (eventHandlers.OnCallBackConnectSuccess) !== "function") {
                    throw "OnCallBackConnectSuccess is not defined or is not a function";
                } else {
                    _onCallBackConnectSuccess = eventHandlers.OnCallBackConnectSuccess;
                }
                if (typeof (eventHandlers.OnCallBackSucceeded) !== "function") {
                    throw "OnCallBackSucceeded is not defined or is not a function";
                } else {
                    _onCallBackSucceeded = eventHandlers.OnCallBackSucceeded;
                }
                /* Next validate the minimum required callbacks are provided. */
                if (typeof (eventHandlers.OnCallBackConnectionFailure) !== "function") {
                    throw "OnCallBackConnectionFailure is not defined or is not a function";
                } else {
                    _onCallBackConnectionFailure = eventHandlers.OnCallBackConnectionFailure;
                }
                /* Next validate the minimum required callbacks are provided. */
                if (typeof (eventHandlers.OnCallBackCompletion) !== "function") {
                    throw "OnCallBackCompletion is not defined or is not a function";
                } else {
                    _onCallBackCompletion = eventHandlers.OnCallBackCompletion;
                }
                /* Next validate the minimum required callbacks are provided. */
                if (typeof (eventHandlers.OnSystemMessageReceived) !== "function") {
                    throw "OnSystemMessageReceived is not defined or is not a function";
                } else {
                    _onSystemMessageReceived = eventHandlers.OnSystemMessageReceived;
                }
                /* Next validate the minimum required callbacks are provided. */
                if (typeof (eventHandlers.OnCallBackErrorOccurred) !== "function") {
                    // DO NOTHING
                } else {
                    _onCallBackErrorOccurred = eventHandlers.OnCallBackErrorOccurred;
                }
                if (typeof (eventHandlers.OnAgentsNotAvailable) !== "function") {
                    throw "OnAgentsNotAvailable is not defined or is not a function";
                } else {
                    _onAgentsNotAvailable = eventHandlers.OnAgentsNotAvailable;
                }
                if (typeof (eventHandlers.OnGetQueueCurrentStatus) !== "function") {
                    // DO NOTHING
                } else {
                    _onGetQueueCurrentStatus = eventHandlers.OnGetQueueCurrentStatus;
                }
                if (typeof (eventHandlers.OnServerNotificationReceived) !== "function") {
                    // DO NOTHING
                } else {
                    _onServerNotificationReceived = eventHandlers.OnServerNotificationReceived;
                }
                if (typeof (eventHandlers.OnCallBackMessagePropertyLoad) !== "function") {
                    /* This callback is not mandatory  */
                } else {
                    _onCallBackMessagePropertyLoad = eventHandlers.OnCallBackMessagePropertyLoad;
                }
                if (typeof (eventHandlers.OnDuplicateSession) !== "function") {
                    /* This callback is not mandatory  */
                } else {
                    _onDuplicateSession = eventHandlers.OnDuplicateSession;
                }

            } catch (err) {

                throw err;
            }
        };

        var onConnect = function (status, condition) {
            /* Console log seems to be gicing issues. Need to check is logging  cause alerts to stop*/
            /* Handler for connection - connection success or failure, disconnect etc */
            /* TODO: Define return arguments for each event. Should contain information on the type of error */
            switch (status) {
                case Strophe.Status.CONNFAIL:
                    var chatConnectionFailureEventArgs = new _egainLib.Datatype.ResultObject();
                    chatConnectionFailureEventArgs.IsSuccess = false;
                    chatConnectionFailureEventArgs.StatusCode = 'CONNECT_FAIL';
                    chatConnectionFailureEventArgs.StatusMessage = 'CONNECTION FAILURE';

                    switch (condition) {
                        case 'system-shutdown':
                            connectionFailure = true;
                            var agentsNotAvailableEventArgs = chatConnectionFailureEventArgs;
                            agentsNotAvailableEventArgs.IsSuccess = false;
                            agentsNotAvailableEventArgs.StatusCode = 'AGENTS_UNAVAILABLE';
                            agentsNotAvailableEventArgs.StatusMessage = 'AGENTS UNAVAILABLE';
                            _onAgentsNotAvailable(agentsNotAvailableEventArgs);
                            break;
                        case 'other-request':
                            connectionFailure = true;
                            var duplicateSessionEventArgs = chatConnectionFailureEventArgs;
                            duplicateSessionEventArgs.IsSuccess = false;
                            duplicateSessionEventArgs.StatusCode = 'DUPLICATE_SESSION';
                            duplicateSessionEventArgs.StatusMessage = 'DUPLICATE SESSION';
                            _onDuplicateSession(duplicateSessionEventArgs);
                            break;
                        case 'L10N_EXIT_TXT':
                            connectionFailure = false;
                            _connected = true;
                            var callbackSuccessEventArgs = chatConnectionFailureEventArgs;
                            callbackSuccessEventArgs.IsSuccess = true;
                            callbackSuccessEventArgs.StatusCode = 'CALLBACK_SUCCESS';
                            callbackSuccessEventArgs.StatusMessage = 'CALLBACK_SUCCESS';
                            _onCallBackSucceeded(callbackSuccessEventArgs);
                            break;
                        default:
                            if (condition.indexOf('remote-connection-failed') != -1) {
                                connectionFailure = true;
                                var errorCode = condition.split(":");
                                //errorCode[1] have the error code
                                var chatConnectionErrorEventArgs = chatConnectionFailureEventArgs;
                                chatConnectionErrorEventArgs.StatusCode = errorCode[1];
                                _onCallBackConnectionFailure(chatConnectionFailureEventArgs)
                            } else if (!_connection.disconnecting && condition !== "unknown") {
                                connectionFailure = true;
                                chatConnectionFailureEventArgs.StatusCode = condition;
                                _onCallBackConnectionFailure(chatConnectionFailureEventArgs);
                            }
                            break;
                    }

                    break;
                case Strophe.Status.CONNECTED:
                    _connection.addHandler(notifyUser, null, null, null, null, null);
                    var chatConnectEventArgs = {};
                    chatConnectEventArgs.CallBackID = _connection.sid.split('_')[0];
                    chatConnectEventArgs.SessionID = _connection.sid;
                    if (_connection.name) {
                        chatConnectEventArgs.name = _connection.name;
                        delete _connection.name;
                    }
                    if (_connection.subject) {
                        chatConnectEventArgs.subject = _connection.subject;
                        delete _connection.subject;
                    }
                    _onCallBackConnectSuccess(chatConnectEventArgs);
                    _connected = true;
                    break;
                case Strophe.Status.DISCONNECTED:
                    _connected = false;
                    if (connectionFailure !== true) {
                        _onCallBackCompletion();
                    }
                    break;
                default:
                    break;
            }
        };

        var notifyUser = function (messageObjectFromServer) {
            _connected = true;
            var messageType = messageObjectFromServer.getAttribute('type');
            var messageAuthor = messageObjectFromServer.getAttribute('from');
            if (messageType && messageAuthor && messageAuthor == 'system') {
                if (_onServerNotificationReceived !== null && _onServerNotificationReceived !== undefined) {
                    _onServerNotificationReceived();
                }
            }

            for (var i = 0; i < messageObjectFromServer.childNodes.length; i++) {
                if (!messageObjectFromServer.childNodes[i].tagName) {
                    continue;
                }
                if (messageObjectFromServer.childNodes[i].tagName.indexOf(':widget') > 0) {
                    continue;
                }
                if (messageObjectFromServer.childNodes[i].tagName.indexOf(':body') < 0) {
                    // continue;
                }

                var htmlMessage = messageObjectFromServer.childNodes[i].textContent;
                if (htmlMessage === 'undefined') {
                    htmlMessage = messageObjectFromServer.childNodes[i].text; /* Internet Explorer */
                }

                var transferParam = messageObjectFromServer.childNodes[i];

                var arr = {};
                $(transferParam).find('ns2\\:egainAdditionalParam,egainAdditionalParam').each(function () {
                    arr[$(this).find('ns2\\:paramKey,paramKey').text()] = $(this).find('ns2\\:paramValue,paramValue').text();
                });
                var transType = "";

                if (messageType) {
                    htmlMessage = unescape(htmlMessage);
                    htmlMessage = decodeMessage(htmlMessage);
                }
                if (htmlMessage && htmlMessage.length && htmlMessage.length > 0) {
                    var systemMessageReceivedEventArgs = {};
                    systemMessageReceivedEventArgs.Message = htmlMessage;
                    _onSystemMessageReceived(systemMessageReceivedEventArgs);
                }
            }
            /* Potentially implement callback for CallBack Timeout event */
            return true;
        };

        this._loadMessagingProperties = function (messagingPropertyUrl, customMessagingPropertyUrl) {
            // Read eGain messaging propterties
            fs.readFile('./l10n/messaging_en_us.properties', 'utf8', function (err,data) {
                if (err) {
                    return console.log(err);
                }
                //console.log(data);
                _connection.eGainMessagingProperty = "\n" + data;
//                _connection.eGainMessagingProperty = _connection.eGainMessagingProperty + "\n" + data;
//                if (_onCallBackMessagePropertyLoad !== null && _onCallBackMessagePropertyLoad !== undefined) {
//                    _onCallBackMessagePropertyLoad(data);
//                }
            });
//            $.ajax({
//                url: messagingPropertyUrl,
//                type: 'GET',
//                dataType: 'text',
//                success: function (data) {
//                    _connection.eGainMessagingProperty = data;
//                    $.ajax({
//                        url: customMessagingPropertyUrl,
//                        type: 'GET',
//                        dataType: 'text',
//                        success: function (data) {
//                            _connection.eGainMessagingProperty = _connection.eGainMessagingProperty + "\n" + data;
//                            if (_onCallBackMessagePropertyLoad !== null && _onCallBackMessagePropertyLoad !== undefined) {
//                                _onCallBackMessagePropertyLoad(data);
//                            }
//                        }
//                    });
//                }
//            });
        };

        this._initialize = function (entryPointId, language, country, eventHandlers, templateName, version, subActivity, serverURL) {
            var _chatInitResult = new _this.Datatype.ResultObject();
            var languageCode = language ? language : 'en'; /* default if no parameter */
            var countryCode = country ? country : 'US'; /* default if no parameter */
            var _templateName = templateName ? templateName : "";
            var _version = version ? version : "";
            _entryPointId = entryPointId;

            initializeApplicationState(entryPointId, language, country, templateName, version, serverURL);

            BOSH_SERVICE = _corsHost + '/egain/chat/entrypoint?subActivity=' + subActivity + '&entryPointId=' +
                    entryPointId + '&templateName=' + _templateName + '&languageCode=' + languageCode + '&countryCode=' + countryCode + '&ver=' + _version;
            MESSAGING_URL = _eGainContextPath + 'l10n/callback_' + languageCode + '_' + countryCode + '.properties';
            CUSTOM_MESSAGING_URL = _eGainContextPath + 'l10n/custom_callback_' + languageCode + '_' + countryCode + '.properties';
            MASKING_URL = _corsHost + '/egain/chat/entrypoint/initialize' + '/' + entryPointId;

            validateCallbackEventHandlers(eventHandlers);
            connectionObj.InitializeConnectionObject.call(this, BOSH_SERVICE, MESSAGING_URL, MASKING_URL, CUSTOM_MESSAGING_URL);

            return _chatInitResult;
        };

        this._start = function () {
            connectionObj.Start(onConnect);
        };
    };
    Callback.prototype = Object.create(Chat.prototype);
    Callback.prototype.constructor = Callback;

    Callback.prototype.Initialize = function (entryPointId, language, country, eventHandlers, templateName, version, subActivity, serverURL) {
        this._initialize(entryPointId, language, country, eventHandlers, templateName, version, subActivity, serverURL);
    };

    this.Callback = Callback;

};

// Hack and remove 'window.' object
//eGainLibrary = eGainLibrary;


/**
 * this is an overridden implementation Strophe.log() to show important messages
 * in the transcript.
 */
/*Strophe.log = function(level, msg) {
	if (level == Strophe.LogLevel.ERROR || level == Strophe.LogLevel.FATAL	|| _debug )
	{
		if(typeof App != 'undefined')
			App.messenger.showNotification(msg, 'stropheLog');
		else
			transcribe(msg, 'stropheLog');
	}
};*/

Strophe.log = function (level, msg)
{
    console.log("LOG: " + level + " MESSAGE: " + msg);
    try {
        if (level === Strophe.LogLevel.ERROR || level === Strophe.LogLevel.FATAL || eGainLibrary.debug)
        {
            if (this.eGainOnError)
            {
                this.eGainOnError({message: msg});
            }
            if (eGainLibrary.eGainLog) {
                eGainLibrary.eGainLog(msg);
            } else
            {
                console.log(msg);
            }
        }
    } catch (e) {
        //EGS-38040: DO NOTHING
    }
};

/**
 * this effectively disables the secondary timeout as the connection refreshes
 * are not handled by the server
 */
Strophe.SECONDARY_TIMEOUT = 99;


/**
 * A modified copy of Strophe.Connection.prototype.connect so that we can supply
 * a "from" attribute and custom tags.
 */
Strophe.Connection.prototype.connect = function(jid, pass, callback, wait, hold) {
    /*
     * Save the reference of the generic error function
     * so that the code outside this scope can also access this function
     */
	this.jid = jid;
	this.pass = pass;
	this.connect_callback = callback;
	this.disconnecting = false;
	this.connected = false;
	this.authenticated = false;
	this.errors = 0;

	this.wait = wait || this.wait;
	this.hold = hold || this.hold;

	// parse jid for domain and resource
	this.domain = Strophe.getDomainFromJid(this.jid);

	// build the body tag
	var attributes = {
			to : this.entryPointId, // egain specific attribute
			from : this.from, // egain specific attribute
			//authId : 0, // eGain complaining about authId in the <body>
			"xml:lang" : this.lang,
			wait : this.wait,
			hold : this.hold,
			content : "text/xml; charset=utf-8",
			ver : "1.6",
			"xmlns:xmpp" : Strophe.NS.BOSH,
			"xmpp:version" : "1.0"			
		};
        // Build the <body> Structure       
	var body = this._buildBody().attrs(attributes);
        
        // Pass all the eGain paramters to 'body' to add the child to the structure
	var $egainParams = body.c('egainParams', {
		'xmlns' : 'http://bindings.egain.com/chat'
	}); 

	if (this.eGainLoginParameters && this.eGainLoginParameters.length > 0) {

		for ( var i = 0; i < this.eGainLoginParameters.length; i++) {
			eGainLibrary.addParamXml($egainParams, this.eGainLoginParameters[i]);
		}
	}
	
	//sending visitor historytracking data
	if(typeof this.vhtIds != "undefined" && this.vhtIds)
	{		
		body.c('visitorIdentifier')
			.c('aId').t(this.vhtIds.aId).up()
			.c('sId').t(this.vhtIds.sId).up()
			.c('uId').t(this.vhtIds.uId).up()
			.up()
	}	
	
	//Sending backStopping parameters if backstopping is configured
	if(typeof App != "undefined" && App 
		&& typeof App.eGainCustomParams != "undefined" && App.eGainCustomParams 
		&& typeof App.eGainCustomParams.backStoppingTime  != "undefined" && App.eGainCustomParams.backStoppingTime 
		&& typeof App.eGainCustomParams.backStoppingAction  != "undefined" && App.eGainCustomParams.backStoppingAction)
	{
		body.c('backStoppingParams')
			.c('time').t(new String(App.eGainCustomParams.backStoppingTime)).up()
			.c('action').t(App.eGainCustomParams.backStoppingAction).up()
			.up()
	}
	
	//Sending caseId if it exists
	if(typeof App != "undefined" && App 
		&& typeof App.eGainCustomParams != "undefined" && App.eGainCustomParams 
		&& typeof App.eGainCustomParams.eglvcaseid  != "undefined" && App.eGainCustomParams.eglvcaseid )
	{
		body.c('caseId')
			.t(new String(App.eGainCustomParams.eglvcaseid ))
			.up();
	}
	//console.log("\nBODY START: " + body);
	// sending messaging_xx_XX.properties file content
	body.c('messagingData', '<![CDATA['+this.eGainMessagingProperty+']]>').up();
        
	if (typeof this.samlResponse != 'undefined' && this.samlResponse != 'null') {
		body.c('authenticationData')
			.c('SAMLResponse').t(this.samlResponse).up()
			.up();
		delete this.samlResponse;
	}

	if (typeof this.escalationData != 'undefined' && this.escalationData != 'null') {
		body.c('escalationData')
			.c('vaDomain').t(this.escalationData.vaDomain).up()
			.c('vaTenantId').t(this.escalationData.vaTenantId).up()
			.c('vaSessionId').t(this.escalationData.vaSessionId).up()
			.c('vaBotName').t(this.escalationData.vaBotName).up()
			.up();
		delete this.escalationData;
	}
	//console.log("\nBODY END: " + body);
	this._changeConnectStatus(Strophe.Status.CONNECTING, null);
        
	this._requests.push(new Strophe.Request(body.tree(),
             this._onRequestStateChange.bind(this).prependArg(this._connect_cb.bind(this)), body.tree().getAttribute("rid")));   
        //Strophe.document.cookie = "egain-last-request-id="+body.tree().getAttribute("rid");
	this._throttledRequestHandler();
}
// Prepend is the same as a bind within Strophe
Function.prototype.prependArg = function (arg)
{
    var func = this;

    return function () { 
	var newargs = [arg];
	for (var i = 0; i < arguments.length; i++)
	    newargs.push(arguments[i]);
	return func.apply(this, newargs); 
    };
};


/**
 * add eGain specific tags to $egainParameters for the supplied
 * parameterDefinition
 */
eGainLibrary.addParamXml = function ($egainParameters, parameterDefinition) {
	
	var attribName = parameterDefinition.attributeName;
	if(!attribName)
		return;
	var attributeValue = null;
	if(typeof App != 'undefined')
		attributeValue =  App.session.get(attribName);//
	else
		attributeValue = parameterDefinition.attributeValue;

	attributeValue = eGainLibrary.escapeXML(attributeValue);
	if (attributeValue.constructor != Array) {
		attributeValue = attributeValue.replace(/[\r\n]/g, '<br />');
	} else {
		for(var i=0; i < attributeValue.length; i++) {	
			attributeValue[i] = attributeValue[i].replace(/[\r\n]/g, '<br />');
		}
	}
	$egainParameters.c('param', {
		'name' : parameterDefinition.paramName
	}) //
			.c('mapping') //
	if (parameterDefinition.egainAttributeName != 'undefined' && parameterDefinition.egainAttributeName) {
		$egainParameters.c('egainAttributeName').t(parameterDefinition.egainAttributeName).up() //
	}
		$egainParameters.c('attributeName').t(parameterDefinition.attributeName).up() //
			.c('objectName').t(parameterDefinition.objectName).up() //
			.c('attributeValue').t(attributeValue).up() //
			.c('validationString').up(parameterDefinition.validationString) //
			.c('primaryKey').t(parameterDefinition.primaryKey).up() //
	if (parameterDefinition.secureAttribute != 'undefined' && parameterDefinition.secureAttribute) {		
			$egainParameters.c('secureAttribute').t(parameterDefinition.secureAttribute).up() //			
	}
			$egainParameters.c('minLength').t(parameterDefinition.minLength).up() //			
			.c('maxLength').t(parameterDefinition.maxLength).up() //			
			.c('required').t(parameterDefinition.required).up() //			
			.c('fieldType').t(parameterDefinition.fieldType).up() //			

			.up() // mapping
			.up(); // /param
}

/**
	Escape the string to be used in xml
**/
eGainLibrary.escapeXML = function (str) {
	if (!str)
		return '';
	if (str.constructor != Array) {
		str = str.replace(/&/g, '&amp;') //
		.replace(/>/g, '&gt;') //
		.replace(/</g, '&lt;') //
		.replace(/'/g, '&#39;') //
		.replace(/"/g, '&quot;') //
		.replace(/[\r\n]/g, '<br />');
	}
	else {
		for(var i=0; i < str.length; i++) {		
			str[i] = str[i].replace(/&/g, '&amp;') //
			.replace(/>/g, '&gt;') //
			.replace(/</g, '&lt;') //
			.replace(/'/g, '&#39;') //
			.replace(/"/g, '&quot;') //
			.replace(/[\r\n]/g, '<br />');
		}
	}
	return str;
};

//also creating a duplicate function in case it is not overwridden in chat.js where it (xmlEscape) is used
var xmlEscape = eGainLibrary.escapeXML;

/**
 * A modified copy of Strophe.Connection.prototype._connect_cb which does not do
 * standard authentication.
 */
Strophe.Connection.prototype._connect_cb = function(req) {
	Strophe.info("_connect_cb was called");

	this.connected = true;
	var bodyWrap = req.getResponse();
	if (!bodyWrap) {
		return;
	}

	this.xmlInput(bodyWrap);
	this.rawInput(Strophe.serialize(bodyWrap));

	var typ = bodyWrap.getAttribute("type");
	var cond, conflict, errorCode;
	if (typ !== null && typ == "terminate") {
		// an error occurred
		cond = bodyWrap.getAttribute("condition");
		conflict = bodyWrap.getElementsByTagName("conflict");
		for (var mindex = 0; mindex < bodyWrap.childNodes.length; mindex++) {
			var errorMsg = bodyWrap.childNodes[mindex];
			if(errorMsg.tagName && errorMsg.tagName.indexOf('error') != -1) {
				for ( var i = 0; i < errorMsg.childNodes.length; i++) {
				if (errorMsg.childNodes[i].tagName) {
					if(errorMsg.childNodes[i].tagName.indexOf('code') != -1) {
						errorCode = Strophe.getText(errorMsg.childNodes[i]);
						}
					}
				}
			}
		}
		if (cond !== null) {
			if (cond == "remote-stream-error" && conflict.length > 0) {
				cond = "conflict";
				} else if (cond == "remote-connection-failed" && typeof errorCode != 'undefined') {
				cond = cond +":"+ errorCode;
			}
			this._changeConnectStatus(Strophe.Status.CONNFAIL, cond);
		} else {
			this._changeConnectStatus(Strophe.Status.CONNFAIL, "unknown");
		}
		return;
	} else {
		//Parsing egain response parameters and populating the subject and full_name parameters
		//Response format is as follows:
		//<ns2:egainResponseParams>
        //	<ns2:responseParam name="L10N_NAME_PROMPT">
        //    <ns2:responseParamMapping>
        //        <ns2:attributeName>full_name</ns2:attributeName>
        //        <ns2:attributeValue>customerName</ns2:attributeValue>
        //    </ns2:responseParamMapping>
        //  </ns2:responseParam>
        //  <ns2:responseParam name="L10N_YOUR_QUESTION_PROMPT">
        //    <ns2:responseParamMapping>
        //        <ns2:attributeName>subject</ns2:attributeName>
        //        <ns2:attributeValue>question</ns2:attributeValue>
        //    </ns2:responseParamMapping>
        //  </ns2:responseParam>
		//</ns2:egainResponseParams>
	
        var formValues = {};
        for (var mindex = 0; mindex < bodyWrap.childNodes.length; mindex++) {
                var egainResponseParams = bodyWrap.childNodes[mindex];
                if(egainResponseParams.tagName && egainResponseParams.tagName.indexOf('egainResponseParams') != -1) {
                        for (var responseParamCounter = 0; responseParamCounter < egainResponseParams.childNodes.length; responseParamCounter++) {
                            var responseParam = egainResponseParams.childNodes[responseParamCounter];
                        if(responseParam.tagName && responseParam.tagName.indexOf('responseParam') != -1) {
                            for (var reseponseParamMappingCounter = 0; reseponseParamMappingCounter < responseParam.childNodes.length; reseponseParamMappingCounter++) {
                                var responseParamMapping = responseParam.childNodes[reseponseParamMappingCounter];
                                if(responseParamMapping.tagName && responseParamMapping.tagName.indexOf('responseParamMapping') != -1) {
                                    if (window.navigator.userAgent.indexOf("MSIE") != -1 && ((window.navigator.userAgent.indexOf("Trident/4.0") != -1) || (window.navigator.userAgent.indexOf("Trident/5.0") != -1))) {
                                            //For IE 8 and IE 9 only
                                            if(Strophe.getText(responseParamMapping.childNodes[0]) == 'full_name') {
                                                    this.name = Strophe.getText(responseParamMapping.childNodes[1]);
                                            } else if(Strophe.getText(responseParamMapping.childNodes[0]) == 'subject') {
                                                    this.subject = Strophe.getText(responseParamMapping.childNodes[1]);
                                            }else if(Strophe.getText(responseParamMapping.childNodes[0]) == 'first_name' || 
                                                                    Strophe.getText(responseParamMapping.childNodes[0]) == 'last_name') {
                                                    this.name = this.name ? this.name + ' ' + Strophe.getText(responseParamMapping.childNodes[1]) : Strophe.getText(responseParamMapping.childNodes[1]);
                                            }
                                    } else {
                                            //For IE 10 & above and for other browsers 
                                            for (var i = 0; i < responseParamMapping.childNodes.length; i++) {
                                                    if(responseParamMapping.childNodes[i].tagName && responseParamMapping.childNodes[i].tagName.indexOf('attributeName') != -1) {
                                                            if (Strophe.getText(responseParamMapping.childNodes[i]) == 'full_name') {
                                                                    this.name = Strophe.getText(responseParamMapping.childNodes[i+2]);
                                                                    i=i+2;
                                                            } else if(Strophe.getText(responseParamMapping.childNodes[i]) == 'subject') {
                                                                    this.subject = Strophe.getText(responseParamMapping.childNodes[i+2]);
                                                                    i=i+2;
                                                            }else if(Strophe.getText(responseParamMapping.childNodes[i]) == 'first_name'
                                                                                    || Strophe.getText(responseParamMapping.childNodes[i]) == 'last_name') {
                                                                    this.name = this.name ? this.name + ' ' + Strophe.getText(responseParamMapping.childNodes[i+2]) : Strophe.getText(responseParamMapping.childNodes[i+2]);
                                                                    i=i+2;
                                                            }
                                                    }
                                            }								
                                    }
                                }
                            }
                        }
                    }
                }
            }
	}

	// check to make sure we don't overwrite these if _connect_cb is
	// called multiple times in the case of missing stream:features
	if (!this.sid) {
		this.sid = bodyWrap.getAttribute("sid");
	}
	if (!this.stream_id) {
		this.stream_id = bodyWrap.getAttribute("authid");
	}
	var wind = bodyWrap.getAttribute('requests');
	if (wind) {
		this.window = parseInt(wind, 10);
	}
	var hold = bodyWrap.getAttribute('hold');
	if (hold) {
		this.hold = parseInt(hold, 10);
	}
	var wait = bodyWrap.getAttribute('wait');
	if (wait) {
		this.wait = parseInt(wait, 10);
	}

	// we don't do standard authentication mechanisms
	this.authenticated = true;
	this._changeConnectStatus(Strophe.Status.CONNECTED, null);
}
/**
 * A modified copy of Strophe.Connection.prototype._buildbody so that we set request id in cookie and storage
 */
Strophe.Connection.prototype._buildBody = function(){
    var bodyWrap = strophe.$build('body', {
            rid: this.rid++,
            xmlns: Strophe.NS.HTTPBIND
        });
        
        /* Save request id to parent localstorage */
        var payLoad = {
            Method : "SET",
            Key : "EgainLastRequestId",
            Value : this.rid,
            Caller : "EGLV_DOCK_CALLER_SET"
        };
        if(this.connected){
            window.parent.postMessage(JSON.stringify(payLoad), '*');
            document.cookie = "egain-last-request-id="+this.rid;
        }

        if (this.sid !== null) {
            bodyWrap.attrs({sid: this.sid});
        }
        
        return bodyWrap;
};
/**
 * A modified copy of Strophe.Connection.prototype._processRequest so that we
 * can supply headers to the req.xhr.
 */
Strophe.Connection.prototype._processRequest = function(i, sync) {
	var req = this._requests[i];
	var reqStatus = -1;

	try {
            if (req.xhr.readyState == 4) {
                reqStatus = req.xhr.status;
            }
	} catch (e) {
            Strophe.error("caught an error in _requests[" + i + "], reqStatus: "
				+ reqStatus);
	}

	if (typeof (reqStatus) == "undefined") {
            reqStatus = -1;
	}

	var time_elapsed = req.age();
	var primaryTimeout = (!isNaN(time_elapsed) && time_elapsed > Math
			.floor(Strophe.TIMEOUT * this.wait));
	var secondaryTimeout = (req.dead !== null && req.timeDead() > Math
			.floor(Strophe.SECONDARY_TIMEOUT * this.wait));
	var requestCompletedWithServerError = (req.xhr.readyState == 4 && (reqStatus < 1 || reqStatus >= 500));
	if (primaryTimeout || secondaryTimeout || requestCompletedWithServerError) {
            if (secondaryTimeout) {
                Strophe.error("Request " + this._requests[i].id
                                    + " timed out (secondary), restarting");
            }
            req.abort = true;
            req.xhr.abort();
            // setting to null fails on IE6, so set to empty function
            req.xhr.onreadystatechange = function() {
            };
            this._requests[i] = new Strophe.Request(req.xmlData, req.origFunc,
                            req.rid, req.sends);
            document.cookie = "egain-last-request-id="+req.rid;
            req = this._requests[i];
	}

	if (req.xhr.readyState === 0) {
            Strophe.debug("request id " + req.id + "." + req.sends + " posting");

            req.date = new Date();
            try {
                    var sync = ("boolean" === typeof req.syncRequest)
                        ? req.syncRequest
                        : ("boolean" === typeof this.syncRequest) ? this.syncRequest : false;
                    req.xhr.open("POST", this.service, !sync);
            } catch (e2) {
                    Strophe.error("XHR open failed: " + e2.message);
                    if (!this.connected) {
                            this._changeConnectStatus(Strophe.Status.CONNFAIL,
                                            "bad-service");
                    }
                    this.disconnect();
                    return;
            }
            this.xEgainEscalationHeader = " ";
            req.xhr.setRequestHeader("Content-Type", "application/xml");
            req.xhr.setRequestHeader("X-egain-session", this.xEgainEscalationHeader);
            // eGain addition

            // Fires the XHR request -- may be invoked immediately
            // or on a gradually expanding retry window for reconnects
            var sendFunc = function() {
                req.xhr.send(req.data);
            };

            // Implement progressive backoff for reconnects --
            // First retry (send == 1) should also be instantaneous
            if (req.sends > 1) {
                // Using a cube of the retry number creats a nicely
                // expanding retry window
                var backoff = Math.pow(req.sends, 3) * 1000;
                setTimeout(sendFunc, backoff);
            } else {
                sendFunc();
            }

            req.sends++;

		this.xmlOutput(req.xmlData);
		this.rawOutput(req.data);
	} else {
		Strophe.debug("_processRequest: " + (i === 0 ? "first" : "second")
				+ " request has readyState of " + req.xhr.readyState);
	}
}

/**
 * A modified copy of Strophe.Connection.prototype._hitError which logs a
 * message to the transcript
 */
Strophe.Connection.prototype._hitError = function(reqStatus) {
	if(typeof App == 'undefined'){
            if(typeof clearPollQueueStatusTimer == 'function')
                clearPollQueueStatusTimer();
        }
	else
            App.connection.clearPollQueueStatusTimer();
	this.errors++;
	Strophe.warn("request errored, status: " + reqStatus
			+ ", number of errors: " + this.errors);
	if (this.errors > 4) {
            if("function" === typeof this.eGainOnError){
                this.eGainOnError({"status": "error", "message": "Should be abandoned. " + reqStatus});
            }
            this._onDisconnectTimeout();
	} else {
            if("function" === typeof this.eGainOnError){
                this.eGainOnError({"status": "log", "message": "Retrying. " + reqStatus});
            }	
	}
}

/**
 * A modified copy of Strophe.Connection.prototype._onRequestStateChange which logs a
 * message to the transcript on error and v11 template.
 */
Strophe.Connection.prototype._onRequestStateChange = function (func, req)
    {
        try {
        Strophe.debug("request id " + req.id +
                      "." + req.sends + " state changed to " +
                      req.xhr.readyState);
        } catch (e) {
            //EGS-38040: DO NOTHING
        }

        if (req.abort) {
            req.abort = false;
            return;
        }

        // request complete
        var reqStatus;
        if (req.xhr.readyState == 4) {
            reqStatus = 0;
            try {
                reqStatus = req.xhr.status;
            } catch (e) {
                // ignore errors from undefined status attribute.  works
                // around a browser bug
            }

            if (typeof(reqStatus) == "undefined") {
                reqStatus = 0;
            }

            if (this.disconnecting) {
                if (reqStatus >= 400) {
                    this._hitError(reqStatus);
                    return;
                }
            }

            var reqIs0 = (this._requests[0] == req);
            var reqIs1 = (this._requests[1] == req);

            if ((reqStatus > 0 && reqStatus < 500) || req.sends > 5) {
                // remove from internal queue
                this._removeRequest(req);
                try {
                    Strophe.debug("request id " +
                            req.id +
                            " should now be removed");
                } catch (e) {
                    //EGS-38040: DO NOTHING
                }
            }

            // request succeeded
            if (reqStatus == 200) {
                // if request 1 finished, or request 0 finished and request
                // 1 is over Strophe.SECONDARY_TIMEOUT seconds old, we need to
                // restart the other - both will be in the first spot, as the
                // completed request has been removed from the queue already
                if (reqIs1 ||
                    (reqIs0 && this._requests.length > 0 &&
                     this._requests[0].age() > Math.floor(Strophe.SECONDARY_TIMEOUT * this.wait))) {
                    this._restartRequest(0);
                }
                // call handler
                try {
                Strophe.debug("request id " +
                              req.id + "." +
                              req.sends + " got 200");
                } catch (e) {
                    //EGS-38040: DO NOTHING
                }
                func(req);
                this.errors = 0;
            } else {
                        if("function" === typeof this.eGainOnError){
                            this.eGainOnError({"status": "error", "message": "Should be abandoned. " + reqStatus});
                        }
                        else
                                Strophe.error("request id " +
                              req.id + "." +
                              req.sends + " error " + reqStatus +
                              " happened");
                if (reqStatus === 0 ||
                    (reqStatus >= 400 && reqStatus < 600) ||
                    reqStatus >= 12000) {
                    this._hitError(reqStatus);
                    if (reqStatus >= 400 && reqStatus < 500) {
                        this._changeConnectStatus(Strophe.Status.DISCONNECTING,
                                                  null);
                        this._doDisconnect();
                    }
                }
            }

            if (!((reqStatus > 0 && reqStatus < 10000) ||
                  req.sends > 5)) {
                this._throttledRequestHandler();
            }
        }
}
/**
 * A modified copy of Strophe.Connection.prototype._sendTerminate which takes an
 * xml element to add as a child node to the terminate message rather than the
 * presence tag.
 */
/*
 * not currently needed Strophe.Connection.prototype._sendTerminate =
 * function(elem) { Strophe.info("_sendTerminate was called"); var body =
 * this._buildBody().attrs( { type : "terminate" });
 *
 * if (elem) body.cnode(elem);
 *
 * this.disconnecting = true;
 *
 * var req = new Strophe.Request(body.tree(), this._onRequestStateChange.bind(
 * this).prependArg(this._dataRecv.bind(this)), body.tree()
 * .getAttribute("rid"));
 *
 * this._requests.push(req); this._throttledRequestHandler(); }
 */

eGainLibrary.xmlOutput = function (elem) {
    console.log("eGainLibrary.xmlOutput: " + elem);
}

eGainLibrary.xmlInput = function (elem) {
        console.log("eGainLibrary.xmlInput: " + elem);
	// example message: two messages sent in a single wrapper
	// (white space added as _ so that automatic code formating doesn't remove
	// it!)
	// <body xmlns:ns4='urn:ietf:params:xml:ns:xmpp-stanzas'
	// ____xmlns:ns3='jabber:client'
	// ____xmlns:ns5='http://jabber.org/protocol/httpbind'
	// ____xmlns:ns2='com/egain/live/framework/bosh/gen'>
	// ____<ns3:message>
	// ________<ns3:body>
	// ____________An agent response
	// ________</ns3:body>
	// ____</ns3:message>
	// ____<ns3:message>
	// ________<ns3:body>
	// ____________Further agent response with markup%3A
	// ____________%3Cspan class%3D%5E22sourceRowText%5E22
	// ____________role%3D%5E22presentation%5E22%3Enormal %3Cstrong%3Ebold
	// ____________%3C/strong%3E%3C/span%3E
	// ____________%3Cspan style%3D%5E22color%3A %23ff0000%5E22%3E%3Cspan
	// ____________class%3D%5E22sourceRowText%5E22
	// ____________role%3D%5E22presentation%5E22%3Ered
	// ____________%3C/span%3E%3C/span%3E
	// ____________%3Cem%3E%3Cspan class%3D%5E22sourceRowText%5E22
	// ____________role%3D%5E22presentation%5E22%3Eitalic%3C/span%3E%3C/em%3E
	// ________</ns3:body>
	// ____</ns3:message>
	// </body>

	// the second <ns3:body> unescaped
	// Further agent response with markup:
	// <span class="sourceRowText" role="presentation">normal
	// <strong>bold</strong></span>
	// <span style="color: #ff0000">
	// <span class="sourceRowText" role="presentation">red </span>
	// </span>
	// <em><span class="sourceRowText" role="presentation">italic</span></em>

	// note that this is called before rawInput()
	if (false) {
		try {
			for ( var mindex = 0; mindex < elem.childNodes.length; mindex++) {
				var msg = elem.childNodes[mindex];
				for ( var i = 0; i < msg.childNodes.length; i++) {
					if (!msg.childNodes[i].tagName
							|| msg.childNodes[i].tagName.indexOf('body') < 0) {
						continue;
					}
					var messageHtml = msg.childNodes[i].textContent;
					if (!messageHtml) {
						messageHtml = msg.childNodes[i].text; // InternetExplorer
					}
					messageHtml = unescape(messageHtml);
					messageHtml = messageHtml.replace(/\^/g, '%');
					messageHtml = unescape(messageHtml);
					messageHtml = $.trim(messageHtml);
					if (messageHtml.length > 0) {
						transcribe(transcriptEntry(agentIdent, messageHtml),
								'xmlInput');
					}
				}
			}
		} catch (e) {
			alert(e.message);
		}
	}
}

eGainLibrary.rawOutput = function (data) {
	/* transcribe(new Date().format(L10N_TIME_FORMAT) + ' SENT: ' + data,
			'rawOutput');
                        */
        console.log("eGainLibrary.rawOutput: " + data);
}

eGainLibrary.rawInput = function (data){
	/* transcribe(new Date().format(L10N_TIME_FORMAT) + ' RECV: ' + data,
			'rawInput');
                        */
        console.log("eGainLibrary.rawInput: " + data);               
}

module.exports = {
  eGainLibrarySettings : eGainLibrarySettings,
  eGainLibrary : eGainLibrary
}