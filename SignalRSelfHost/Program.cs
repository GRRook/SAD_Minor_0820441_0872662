using Microsoft.AspNet.SignalR;
using Microsoft.Owin.Cors;
using Microsoft.Owin.Hosting;
using Owin;
using System;
using Newtonsoft.Json;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;
using MongoDB.Driver;
using MongoDB.Bson;
using MongoDB.Bson.IO;

namespace SignalRSelfHost
{
    class Program
    {
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
            
            public async void Login(string user)
            {
                Console.WriteLine(user);
            }

            public void SendMessage(string message)
            {
                Console.WriteLine("Message: {0}", message);                
            }

            //When user disconnects
            public override Task OnDisconnected(bool stopCalled = true)
            {                
                Console.WriteLine("User disconnects " + Context.ConnectionId);
                return base.OnDisconnected(stopCalled);
            }

            //When user connects
            public override Task OnConnected()
            {
                Console.WriteLine("User connects " + Context.ConnectionId);
                return base.OnConnected();
            }

            //When user reconnects
            public override Task OnReconnected()
            {
                Console.WriteLine("User reconnects " + Context.ConnectionId);
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