using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SignalRSelfHost
{
    class Users
    {
        //Private fields
        private string userName;
        private string gender;
        private string hubId;

        //Empty constructor
        public Users() { }

        //Constructor with username and gender
        public Users(string userName, string gender, string hubId)
        {
            this.userName = userName;
            this.gender = gender;
            this.hubId = hubId;
        }

        //Property UserName
        public string UserName
        {
            get { return userName; }
            set { userName = value; }
        }

        //Property Gender
        public string Gender
        {
            get { return gender;  }
            set { gender = value;  }
        }

        //Property HubId
        public string HubId
        {
            get { return hubId; }
            set { hubId = value; }
        }
    }
}
