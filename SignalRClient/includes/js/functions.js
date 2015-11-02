// Set the hubs URL for the connection
$.connection.hub.url = "http://localhost:8080/signalr";
//$.connection.hub.url = "http://145.24.222.231:8080/signalr";

// Declare a proxy to reference the hub.
var chatHubConnection = $.connection.myHub;
// Global DSA object
var myDsaKey;
// Id of the selected user
var selectedUser = null;
// Multi user array for mp-OTR
var multiUserChat = [];
// The contacts arry contains all buddies
var contact = [];
/* The buddy object
 * 
 * buddy.id = null;
 * buddy.otr = new OTR();
 * buddy.interval = null;
 * buddy.messages = [];
 */

// User login event
$('#loginUser').on('click', function() {
    // Use the entered username
    if ($("#username").val() == "") {
        alert("Enter a name..");
    } else {
        login($('#username').val());
    }    
});
// Login keypress event handler
$('#username').keyup(function (e) {
    if (e.keyCode == 13) {
        $('#loginUser').click();
    }
})

// Send message event
$('#sendMessage').on('click', function () {
    // Only send the message if a user is selected
    if (selectedUser != null) {
        // Get the messege
        var msg = $('#secretMessage').val();
        // Enforce encryption
        selectedUser.otr.REQUIRE_ENCRYPTION = true;
        // Send the message
        selectedUser.otr.sendMsg(msg);
        // Show the message in the chatbox
        addMessageToList(sessionStorage.getItem("connectionID"), msg);
        // Add message to global messsage variable
        selectedUser.messages.push({"sender":sessionStorage.getItem("connectionID"), "receiver": selectedUser.id, "message": msg});
        // Clear the input
        $('#secretMessage').val('');
    }
});
// Send message key event handler
$("#secretMessage").keyup(function (e) {
    if (e.keyCode == 13) {
        $("#sendMessage").click();
    }
});

// Change the current behavior of the checkboxes and start multi user chat
$('.dropdown-menu a').on('click', function (event) {
    var $target = $(event.currentTarget),
        val = $target.attr('data-value'),
        $inp = $target.find('input'),
        idx;

    //Pushes and splices user from and to multiUserChat array
    if (val != undefined) {
        if ((idx = multiUserChat.indexOf(val)) > -1) {
            multiUserChat.splice(idx, 1);
            setTimeout(function () { $inp.prop('checked', false) }, 0);
        } else {
            multiUserChat.push(val);
            setTimeout(function () { $inp.prop('checked', true) }, 0);
        }

        $(event.target).blur();

        console.log(multiUserChat);
        return false;
    } else {
        // When start multi user chat is clicked..
        console.log("Start multi chat!");
    }
});

// Select a user event
$(document).on('click', '.user', function () {
    // Reset the selected user global
    selectedUser = null;

    // Get the ID of the currently selected user
    var userElement = $(this).find('h5');
    selectedUserId = userElement.attr('id');

    var stateIndicator = $(this).find('i.fa');
    // If the channel is not secure
    if (!stateIndicator.hasClass('fa-lock')) {
        // Set the spinner
        stateIndicator.addClass("fa-spinner fa-pulse")
    }

    // Set the selected username on top
    $('.chatTab').text(userElement.text());

    // Enable the send button
    var sendButton = $('#sendMessage');
    if (sendButton.hasClass('btn-default')) {
        // Enable the "send message" button
        sendButton.removeClass('btn-default').addClass('btn-success');
    }

    // Clear message list
    $(".messages").remove();

    // find the buddy that's selected
    selectedUser = findBuddyInContacts(selectedUserId)

    // If there is no connection with the selected user
    if (selectedUser == null) {
        // Init the connection
        selectedUser = initBuddy(selectedUserId);
    }

    // Loop trough all messages and add message to list
    if (selectedUser.messages != null && selectedUser.messages.length > 0) {
        for (var i = 0; i < selectedUser.messages.length; i++) {
            if (selectedUser.messages[i].sender == selectedUserId || selectedUser.messages[i].receiver == selectedUserId) {
                addMessageToList(selectedUser.messages[i].sender, selectedUser.messages[i].message);
            }
        }
    }

    // Cancel the interval timer
    clearInterval(selectedUser.interval);
    // Remove the blinking class
    $(userElement).closest('.onlineUsers .user').removeClass('alert-danger');
});

// Initiate the SMP event
$(document).on('click', '.social', function (e) {
    // Prevent the clickEvent from bubbling
    e.stopPropagation();
    // Show the modal
    $('#askSecret').modal('show');
    // Pass the ID to the modal
    $('#askSecret').find('.smpBuddyId').val($(this).siblings('h5').attr('id'));
});

// Submit a question to the SMP event
$(document).on('click', '#smpQuestionSubmit', function (event) {
    // Get the secret and question
    var secret = $("#smpSecret").val();
    var question = $("#smpQuestion").val();

    // Retrieve the ID of the user
    var id = $(this).siblings('.smpBuddyId').val();

    // Find buddy in contacts by id
    var buddy = findBuddyInContacts(id);
    buddy.otr.smpSecret(secret, question);
});

// Submit an answer to the SMP event
$(document).on('click', '#smpAnswerSubmit', function (event) {
    // Retrieve the ID of the user
    var id = $(this).siblings('.smpBuddyId').val();
    var buddy = findBuddyInContacts(id);
    buddy.otr.smpSecret($("#smpSecretA").val());
});

// Receive new online user event
chatHubConnection.client.getNewOnlineUser = function (id, username) {
    // Add the user to the online users list
    addUserToOnlineUserList(id, username);
};

// Receive all online users event
chatHubConnection.client.getAllOnlineUsers = function (users) {
    // Save the connectionID in the sessionStorage
    sessionStorage.setItem("connectionID", $.connection.hub.id);

    // Add all online users to the online users list
    $.each(users, function (id, username) {
        addUserToOnlineUserList(id, username)
    });
};

// Receive new message event
chatHubConnection.client.getNewMessage = function (senderId, message) {
    var sendingBuddy = null;
    // Find the sending user in the contact array
    for (var i = 0; i < contact.length; i++) {
        if (contact[i].id == senderId) {
            sendingBuddy = contact[i];
        }
    }
    
    // Add the sender to the contact if he's not a contact already
    if (sendingBuddy == null)
    {
        sendingBuddy = initBuddy(senderId);
    }
    
    console.log(message);
    //console.log("Their fingerprint: " + sendingBuddy.otr.their_priv_pk.fingerprint())

    // Start the receiving of the message
    sendingBuddy.otr.receiveMsg(message, senderId);
};

// Receive disconnected user event
chatHubConnection.client.getDisconnectedUser = function (id) {
    // Remove the disconnected user from the online users list
    $('#' + id).closest('li').remove();
    // Remove the disconnected user form the contact array
    contact.splice(contact.indexOf(contact.id == id));
};

// Login
function login(username) {
    // Start connection
    $.connection.hub.start().done(function () {
        chatHubConnection.server.login(username);
    });

    // Add the username to the session
    sessionStorage.setItem("username", username);

    // Hide login
    $("#login").hide();
    // Show home
    $("#home").fadeIn();

    /* Setup OTR */
    // Check if there is a DSA key available
    var myPrivateKey = getPrivateDsa();
    if (myPrivateKey == null) {
        // Generate and save a new DSA key
        myDsaKey = new DSA();
        setPrivateDsa(myDsaKey);
    }
    else
    {
        myDsaKey = DSA.parsePrivate(myPrivateKey);
    }
}

// Set the DSA
function setPrivateDsa(dsa) {
    var username = sessionStorage.getItem("username");
    // Save the Private DSA key in the localStorage
    localStorage.setItem("DSA-" + username, dsa.packPrivate());
}

// Get the DSA
function getPrivateDsa() {
    var username = sessionStorage.getItem("username");
    // Retrieve the Private DSA key from localStorage
    return localStorage.getItem("DSA-" + username);
}

// Set the TOFU based on the fingerprint (Trust On First Use)
function setTofu(buddyId, username) {
    var buddy = findBuddyInContacts(buddyId);
    var fingerprint = buddy.otr.their_priv_pk.fingerprint();
    localStorage.setItem(username + "_publicDSA", fingerprint);
}

// Check if the TOFU is set(Trust On First Use)
function issetTofu(username) {
    var tofu = localStorage.getItem(username + "_publicDSA");
    if (tofu != null) {
        return true;
    }
    return false;
}

// Check the TOFU with the fingerprint (Trust On First Use)
function checkTofu(buddyId, username) {
    var isValid = false;
    var buddy = findBuddyInContacts(buddyId);
    var tofu = localStorage.getItem(username + "_publicDSA");
    console.log(tofu);
    var fingerprint = buddy.otr.their_priv_pk.fingerprint();
    console.log(fingerprint);
    if (tofu == fingerprint) {
        isValid = true;
    }
    return isValid;
}

// Find the buddy in the contact array by id
function findBuddyInContacts(buddyId) {
    var buddy = null;
    if (contact.length > 0) {
        // Set the selected user
        for (var i = 0; i < contact.length; i++) {
            if (contact[i].id == buddyId) {
                buddy = contact[i];
            }
        }
    }
    return buddy;
}

// Init a new buddy object
function initBuddy(buddyId) {
    // provide options
    var options = { fragment_size: 140, send_interval: 200, priv: myDsaKey };
    // Init the connection
    var newOtr = new OTR(options);
    // Receive message event
    newOtr.on('ui', function (msg, encrypted, meta) {
        console.log("message to display to the user: " + msg);
        //console.log("(optional) with receiveMsg attached meta data: " + meta)
        // encrypted === true, if the received msg was encrypted

        // If the message is not empty
        if (msg != "") {
            senderId = meta;

            // find the buddy that send the message
            var buddy = findBuddyInContacts(senderId);

            // Add the message to the messages array
            buddy.messages.push({ "sender": senderId, "receiver": sessionStorage.getItem("connectionID"), "message": msg })

            // If the sender is the selected user
            if (selectedUser == null || selectedUser.id != senderId) {
                // Set the blinking interval
                if (buddy.interval == null) {
                    buddy.interval = setInterval(function () {
                        $('#' + senderId).closest('.onlineUsers .user').toggleClass('alert-danger');
                    }, 750);
                }
            }
            else {
                // Add the message to the chatbox
                addMessageToList(senderId, msg);
            }
        }
    });
    // Send message event
    newOtr.on('io', function (msg, meta) {
        console.log("message to send to buddy: " + msg);
        //console.log("My fingerprint: " + this.priv.fingerprint());
        chatHubConnection.server.sendMessage(sessionStorage.getItem("connectionID"), buddyId, msg);
    });
    // Error event
    newOtr.on('error', function (err, severity) {
        if (severity === 'error')  // either 'error' or 'warn'
            console.error("error occurred: " + err);
    });
    // Status event
    newOtr.on('status', function (state) {
        switch (state) {
            case OTR.CONST.STATUS_AKE_SUCCESS:
                // sucessfully ake'd with buddy                
                if (newOtr.msgstate === OTR.CONST.MSGSTATE_ENCRYPTED) {
                    // show that the negotiation succeded and that the channel is secure
                    // Find the users online indicator
                    var userElement = $('#' + buddyId).siblings('i');
                    // Indicate that the line is secure
                    userElement.removeClass("fa-spinner fa-pulse").addClass("fa-lock");;
                    // Change color to success
                    userElement.closest("li").removeClass('alert-info').addClass('alert-success');
                    // Show the SMP button
                    userElement.siblings("button").show();

                    // Get the username
                    var userName = $('#' + buddyId).text();
                    // Find out if there is TOFU
                    if (issetTofu(userName)) {
                        // Check if the TOFU is valid
                        if (!checkTofu(buddyId, userName)) { alert('Warning! The channel could be hacked!'); }
                    }
                    else
                    {
                        // Set TOFU
                        setTofu(buddyId, userName);
                    }
                }
                break
            case OTR.CONST.STATUS_END_OTR:
                // if buddy.msgstate === OTR.CONST.MSGSTATE_FINISHED
                // inform the user that his correspondent has closed his end
                // of the private connection and the user should do the same
                console.log("End OTR");
                break
        }
    });
    // SMP event
    newOtr.on('smp', function (type, data, act) {
        switch (type) {
            case 'question':
                console.log("question data: " + data);
                console.log("question act: " + act);

                $("#smpQuestionA").text(data);
                $('#answerSecret').modal('show');
                $('#answerSecret').find('.smpBuddyId').val(buddyId);
                break
            case 'trust':
                console.log("trust data: " + data);
                console.log("trust act: " + act);
                var id = null;
                if (act == "asked") {
                    id = $('#askSecret').find('.smpBuddyId').val();
                    if (data == true) {
                        $("#" + id).siblings('.social').toggleClass("btn-success");
                    } else {
                        $("#" + id).siblings(".social").toggleClass("btn-danger");
                    }
                }
                else if (act == "answered") {
                    id = $('#answerSecret').find('.smpBuddyId').val();
                    if (data == true) {
                        $("#" + id).siblings(".social").toggleClass("btn-success");
                    } else {
                        $("#" + id).siblings(".social").toggleClass("btn-danger");
                    }
                }
                
                // smp completed
                // check data (true|false) and update ui accordingly
                // act ("asked"|"answered") provides info one who initiated the smp
                break
            case 'abort':
                // smp was aborted. notify the user or update ui
                console.log("abort data: " + data);
                console.log("abort act: " + act);
            default:
                throw new Error('Unknown type.');
                console.log("Error data: " + data);
                console.log("Error act: " + act);
        }
    });
    // Init the OTR connection
    newOtr.sendQueryMsg();

    // Create a new buddy object
    var buddy = {
        id:buddyId,
        otr:newOtr,
        interval:null,
        messages:[]
    };

    // Add the buddy to the list of contacts
    contact.push(buddy);

    return buddy;
}

// Add user to online users list
function addUserToOnlineUserList(id, username) {
    if (id != sessionStorage.getItem("connectionID")) {
        $('.onlineUsers .panel-body > .media-list').append(
            "<li class=\"media user alert alert-info\"> \
                <div class=\"media-body\"> \
                    <div class=\"media\"> \
                        <div class=\"media-body\"> \
                            <h5 id=\"" + id + "\"> " + username + " </h5> \
                            <small class=\"text-muted\">Man</small> \
                            <i class=\"fa fa-x2\"></i> \
                            <button type=\"button\" id=\"" + id + "\" class=\"btn btn-primary btn-xs social pull-right\" style=\"display:none\"> \
                                <span class=\"glyphicon glyphicon-star\" aria-hidden=\"true\"></span> SMP \
                            </button> \
                        </div> \
                    </div> \
                </div> \
            </li>"
        );
    }
}

// Add the new message to the chatbox
function addMessageToList(sender, message) {
    $('.chatbody > .media-list').append(
        "<li class=\"media messages\"> \
            <div class=\"media-body\"> \
                <div class=\"media\"> \
                    <div class=\"media-body\"> \
                        " + message + " \
                        <hr /> \
                    </div> \
                </div> \
            </div> \
        </li>"
    );
}