using Microsoft.AspNetCore.SignalR;

namespace VideoChat.Hubs
{
    public class VideoChatHub : Hub
    {
        public async Task Offer(string peerId, string offerJson, string username)
        {
            await Clients.Client(peerId).SendAsync("Offer", offerJson, username);
        }

        public async Task Answer(string username, string answerJson, string peerId)
        {
            await Clients.Client(peerId).SendAsync("Answer", answerJson);
        }

        public async Task Candidate(string peerId, string candidateJson, string username)
        {
            await Clients.Client(peerId).SendAsync("Candidate", candidateJson, username);
        }
    }
}
