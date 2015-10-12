using Microsoft.AspNet.SignalR;
using Microsoft.Owin.Cors;
using Microsoft.Owin.Hosting;
using Owin;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SignalRSelfHost
{
    class Program
    {
        // Global collection of all online users
        private static Dictionary<string, string> onlineUsers = new Dictionary<string, string>();

        static void Main(string[] args)
        {
            // This will *ONLY* bind to localhost, if you want to bind to all addresses
            // use http://*:8080 to bind to all addresses. 
            // See http://msdn.microsoft.com/en-us/library/system.net.httplistener.aspx 
            // for more information.
            string url = "http://localhost:8080";
            using (WebApp.Start<Startup>(url))
            {                
                Console.WriteLine("Server running on {0}", url);
                Console.ReadLine();
            }
        }

        [assembly:OwinStartup(typeof(MyStartupClass))]
        class Startup
        {
            public void Configuration(IAppBuilder app)
            {
                app.UseCors(CorsOptions.AllowAll);
                app.MapSignalR();
            }
        }

        public class MyHub : Hub
        {
            public void Login(string username)
            {
                Console.WriteLine(username);
                
                // Add the user to the collection
                onlineUsers.Add(Context.ConnectionId, username);
                
                // Return this user to all other users
                Clients.Others.getNewOnlineUser(Context.ConnectionId, username);

                // Return a collection of all online users
                Clients.Caller.getAllOnlineUsers(onlineUsers);
            }

            public void SendMessage(string sender, string recipient, string message)
            {
                Console.WriteLine("Message: {0}", message);
                
                // Send the message to the recipient
                Clients.Client(recipient).getNewMessage(sender, message);              
            }

            //When user disconnects
            public override Task OnDisconnected(bool stopCalled = true)
            {                
                Console.WriteLine("User disconnects {0}", Context.ConnectionId);

                // Remove the user form the collection
                onlineUsers.Remove(Context.ConnectionId);

                // Send the disconnection of the user to all other users
                Clients.Others.getDisconnectedUser(Context.ConnectionId);

                return base.OnDisconnected(stopCalled);
            }

            //When user connects
            public override Task OnConnected()
            {
                Console.WriteLine("User connects {0}", Context.ConnectionId);
                return base.OnConnected();
            }

            //When user reconnects
            public override Task OnReconnected()
            {
                Console.WriteLine("User reconnects {0}", Context.ConnectionId);
                return base.OnReconnected();                
            }
        }
    }
}

//All connected clients.
//Clients.All.addContosoChatMessageToPage(name, message);

//Only the calling client.
//Clients.Caller.addContosoChatMessageToPage(name, message);

//All clients except the calling client.
//Clients.Others.addContosoChatMessageToPage(name, message);

//A specific client identified by connection ID.
//Clients.Client(Context.ConnectionId).addContosoChatMessageToPage(name, message);

//var filter = Builders<BsonDocument>.Filter.Gt("grades.score", 30);
//var result = await onlineUsersCollection.Find(filter).ToListAsync();