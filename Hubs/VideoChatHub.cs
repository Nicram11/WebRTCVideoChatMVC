using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace VideoChat.Hubs
{
    public class VideoChatHub : Hub
    {
        public async Task Send(string message)
        {
            Console.WriteLine(message);
            await Clients.Others.SendAsync("Receive", message);
        }
    }
}
