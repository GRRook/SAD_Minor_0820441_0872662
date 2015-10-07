// Set the hubs URL for the connection
$.connection.hub.url = "http://localhost:8080/signalr";
// Declare a proxy to reference the hub.
var chatHubConnection = $.connection.myHub;

function login(username) {
    // Start connection
    $.connection.hub.start().done(function () {
        chatHubConnection.server.login(username);
    });

    /* Setup OTR */
    // Check if there is a DSA key available
    var myKey = localStorage.getItem("DSA");
    if (myKey == null) {
        // Generate and save a new DSA key
        myKey = new DSA();
        localStorage.setItem("DSA", myKey);
    }
}

function startConversation() {
    // provide options
    var options = {
        fragment_size: 140,
        send_interval: 200,
        priv: localStorage.getItem("DSA")
    }

    /*For each user you're communicating with, instantiate an OTR object.*/
    // How do we do that?

    var buddy = new OTR(options)

    buddy.on('ui', function (msg, encrypted, meta) {
        console.log("message to display to the user: " + msg)
        // encrypted === true, if the received msg was encrypted
        console.log("(optional) with receiveMsg attached meta data: " + meta)
    })

    buddy.on('io', function (msg, meta) {
        console.log("message to send to buddy: " + msg)
        console.log("(optional) with sendMsg attached meta data: " + meta)
    })

    buddy.on('error', function (err, severity) {
        if (severity === 'error')  // either 'error' or 'warn'
            console.error("error occurred: " + err)
    })
}

function sendMessage(msg) {
    buddy.REQUIRE_ENCRYPTION = true;
    buddy.sendMsg(msg);
}

function receiveMessage(msg) {
    return buddy.receiveMsg(msg);
}

function endConversation() {
    buddy.endOtr(function () {
        // Calls backwhen the 'disconnect' message has been sent.
    });
}