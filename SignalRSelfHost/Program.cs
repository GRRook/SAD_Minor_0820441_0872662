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
    {//asdasd

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
                //Log user object and hubId
                Console.WriteLine("Login user: {0}", user);

                //Create connection
                var mongoClient = new MongoClient("mongodb://localhost");
                var db = mongoClient.GetDatabase("chat");
                var onlineUsersCollection = db.GetCollection<BsonDocument>("onlineUsers");

                //Get all onlineusers from the database
                var jsonWriterSettings = new JsonWriterSettings { OutputMode = JsonOutputMode.Strict };
                var allOnlineUsers = await onlineUsersCollection.Find("{}").ToListAsync();
                Clients.Caller.getOnlineUsers(allOnlineUsers.ToJson(jsonWriterSettings));
                Console.WriteLine("All Online users: " + allOnlineUsers.ToJson(jsonWriterSettings));

                //Parse user object string to BsonDocument
                MongoDB.Bson.BsonDocument document = MongoDB.Bson.Serialization.BsonSerializer.Deserialize<BsonDocument>(user);
                //Insert yourself into database
                await onlineUsersCollection.InsertOneAsync(document);

                //Get yourself
                var queryYourSelf = "{hubId : '" + Context.ConnectionId + "'}";
                var yourSelf = await onlineUsersCollection.Find(queryYourSelf).ToListAsync();
                Clients.Caller.getYourSelf(yourSelf.ToJson(jsonWriterSettings));


                //Send yourself as new user to all others out there..
                Clients.Others.newUser(user);

            }

            public void SendMessage(string message)
            {
                Console.WriteLine("Message: {0}", message);

                //Create connection
                var mongoClient = new MongoClient("mongodb://localhost");
                var db = mongoClient.GetDatabase("chat");
                var messageCollection = db.GetCollection<BsonDocument>("message");

                //Parse message object string to BsonDocument
                MongoDB.Bson.BsonDocument document = MongoDB.Bson.Serialization.BsonSerializer.Deserialize<BsonDocument>(message);

                //Insert message into database
                messageCollection.InsertOneAsync(document);

                //connection id receiver
                string connectionIdTo = null;
                
                //parse message so it can be looped 
                dynamic dynJson = Newtonsoft.Json.JsonConvert.DeserializeObject("[" + message + "]");
                
                //Loop trough message object and get the message receiver id
                foreach (var item in dynJson)
                {
                    connectionIdTo = item.toHubId;
                    connectionIdTo.Trim();                       
                }

                //Send message object to intended user
                Clients.Client(connectionIdTo).getMessage(message);
                
                //Console write line message pushed to id..
                Console.WriteLine("Push message to client " + connectionIdTo);
            }

            //When user disconnects
            public override Task OnDisconnected(bool stopCalled = true)
            {
                //Delete user from onlineUsers in database
                var mongoClient = new MongoClient("mongodb://localhost");
                var db = mongoClient.GetDatabase("chat");
                var onlineUsersCollection = db.GetCollection<BsonDocument>("onlineUsers");
                onlineUsersCollection.DeleteOneAsync("{hubId : '" + Context.ConnectionId + "'}");

                //Delete user from $scope.onlineUsers at clientside
                Clients.Others.deleteUser(Context.ConnectionId);

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