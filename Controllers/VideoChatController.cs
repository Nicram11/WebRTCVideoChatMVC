using Microsoft.AspNetCore.Mvc;

namespace VideoChat.Controllers
{
    public class VideoChatController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
