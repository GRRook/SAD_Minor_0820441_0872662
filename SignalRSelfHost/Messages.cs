using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SignalRSelfHost
{
    class Messages
    {
        //Private fields
        private int fromHubId;
        private int toHubId;
        private string message;

        //Empty constructor
        //public Messages() { }

        //Constructor with fromId, toId an message
        public Messages(int fromHubId, int toHubId, string message)
        {
            this.fromHubId = fromHubId;
            this.toHubId = toHubId;
            this.message = message;
        }

        //Property FromId
        public int FromHubId
        {
            get { return fromHubId; }
            set { toHubId = value; }
        }

        //Property ToId
        public int ToHubId
        {
            get { return fromHubId; }
            set { toHubId = value; }
        }

        //Property Message
        public string Message
        {
            get { return message; }
            set { message = value; }
        }
    }
}
