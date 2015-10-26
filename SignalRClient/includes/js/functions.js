// Set the hubs URL for the connection
$.connection.hub.url = "http://localhost:8080/signalr";
// Declare a proxy to reference the hub.
var chatHubConnection = $.connection.myHub;
// Id of the selected user
var selectedUser = null;
// Global buddyId
var budId;

// The contacts arry contains all buddies
var contact = [];
/* The buddy object
 * 
 * buddy.id = null;
 * buddy.otr = new OTR();
 * buddy.interval = null;
 * buddy.messages = [];
 */

// Multi user array for mp-OTR
var multiUserChat = [];

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

// Select a user event
$(document).on('click', '.user', function () {
    // Reset the selecte user global
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

    // Hide login
    $("#login").hide();
    // Show home
    $("#home").fadeIn();

    /* Setup OTR */
    // Check if there is a DSA key available
    var myKey = localStorage.getItem("DSA");
    if (myKey == null) {
        // Generate and save a new DSA key
        myKey = new DSA();
        localStorage.setItem("DSA", myKey);
    }

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
    budId = buddyId;
    // provide options
    var options = { fragment_size: 140, send_interval: 200, priv: localStorage.getItem("DSA") };
    // Init the connection
    var newOtr = new OTR();

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
                // check if buddy.msgstate === OTR.CONST.MSGSTATE_ENCRYPTED
                if (newOtr.msgstate === OTR.CONST.MSGSTATE_ENCRYPTED) {
                    // show that the negotiation succeded and that the channel is secure
                    // Find the users online indicator
                    var userElement = $('#' + buddyId).siblings('i');
                    // Indicate that the line is secure
                    userElement.removeClass("fa-spinner fa-pulse").addClass("fa-lock");;
                    // Change color to success
                    userElement.closest("li").removeClass('alert-info').addClass('alert-success');                    
                }

                // Show SMP button (HET SHOWEN WERKT WEL MAAR NIET MET MEERDERE USERS OP DEZE MANIER)
                $(".social").show();
                break
            case OTR.CONST.STATUS_END_OTR:
                // if buddy.msgstate === OTR.CONST.MSGSTATE_FINISHED
                // inform the user that his correspondent has closed his end
                // of the private connection and the user should do the same
                console.log("End OTR");
                break
        }
    });
    // Init the OTR connection
    newOtr.sendQueryMsg();
    // SMP event
    newOtr.on('smp', function (type, data, act) {
        switch (type) {
            case 'question':
                console.log("question data: " + data);
                console.log("question act: " + act);

                $("#smpQuestionA").text(data);
                $('#answerSecret').modal('toggle');
                // call(data) some function with question?
                // return the user supplied data to
                // userA.smpSecret(secret)
                break
            case 'trust':
                console.log("trust data: " + data);
                console.log("trust act: " + act);
                if (act == "asked") {
                    if (data == true) {
                        $(".social").toggleClass("btn-success");
                    } else {
                        $(".social").toggleClass("btn-danger");
                    }
                }
                else if (act == "answered"){
                    if (data == true) {
                        $(".social").toggleClass("btn-success");
                    } else {
                        //Wrong answer dude
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
                        </div> \
                        <div class=\"dropdown pull-right\"> \
                            <button type=\"button\" id=\"" + id + "\" onClick=\"socialistMP('"+ id + "')\" class=\"btn btn-primary btn-xs social\" style=\"display:none\" data-toggle=\"modal\" data-target=\"#myModal\"> \
                                <span class=\"glyphicon glyphicon-star\" aria-hidden=\"true\"></span> SMP \
                            </button> \
                        <\div> \
                    </div> \
                </div> \
            </li>"
        );
    }
}

// Set the global budId for the socialist millionaire protocol
function socialistMP(id) {
    console.log("socialistMP " + id);
    // Set the global budId
    budId = id;
}

// Submit a question on SMP
$(document).on('click', '#smpQuestionSubmit', function (event) {
    // Get the secret and question
    var secret = $("#smpSecret").val();
    var question = $("#smpQuestion").val();
    
    // Find buddy in contacts by id
    var buddy = findBuddyInContacts(budId);
    buddy.otr.smpSecret(secret, question);
    
});

// Submit an answer on SMP
$(document).on('click', '#smpAnswerSubmit', function (event) {
    var buddy = findBuddyInContacts(budId);
    buddy.otr.smpSecret($("#smpSecretA").val());

});


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

// Change the current behavior of the checkboxes and start multi user chat
$('.dropdown-menu a').on('click', function (event) {
    var $target = $(event.currentTarget),
        val = $target.attr('data-value'),
        $inp = $target.find('input'),
        idx;

    // Val is 0 start multi user chat is clicked
    if (val == 0) {
        console.log("Start multi chat!");
    }
    else if (val != undefined) {
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
    }
});


//function startConversation() {
//    // provide options
//    var options = {
//        fragment_size: 140
//        , send_interval: 200
//        , priv: localStorage.getItem("DSA")
//    }

//    var buddy = new OTR(options)

//    buddy.on('ui', function (msg, encrypted, meta) {
//        console.log("message to display to the user: " + msg)
//        // encrypted === true, if the received msg was encrypted
//        console.log("(optional) with receiveMsg attached meta data: " + meta)
//    })

//    buddy.on('io', function (msg, meta) {
//        console.log("message to send to buddy: " + msg)
//        console.log("(optional) with sendMsg attached meta data: " + meta)
//    })

//    buddy.on('error', function (err, severity) {
//        if (severity === 'error')  // either 'error' or 'warn'
//            console.error("error occurred: " + err)
//    })
//}

//function endConversation() {
//    buddy.endOtr(function () {
//        // Calls backwhen the 'disconnect' message has been sent.
//    });
//}