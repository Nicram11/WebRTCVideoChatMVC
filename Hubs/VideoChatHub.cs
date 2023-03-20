using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace VideoChat.Hubs
{
    public class VideoChatHub : Hub
    {
        public async Task Send(string message, string roomId)
        {
            Console.WriteLine(message);
            await Clients.OthersInGroup(roomId).SendAsync("Receive", message);
        }
        public Task JoinRoom(string roomId)
        {
            return Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        }
        public Task LeaveRoom(string roomId)
        {
            return Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
        }


    }
}
