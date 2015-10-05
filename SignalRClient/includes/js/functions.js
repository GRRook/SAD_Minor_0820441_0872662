//Set the hubs URL for the connection
$.connection.hub.url = "http://localhost:8080/signalr";
// Declare a proxy to reference the hub.
var chatHubConnection = $.connection.myHub;

//Start connection
$.connection.hub.start().done(function () {
    chatHubConnection.server.login("hi");
});