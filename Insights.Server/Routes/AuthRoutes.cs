using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.EntityFrameworkCore;
using Insights.Server.Data;
using Insights.Server.Entities;

namespace Insights.Server.Routes;

public static class AuthRoutes
{
    public record UserResponse(Guid UserId, string Email, string Name);
    public record LogoutResponse(string Message);

    public static void MapAuthRoutes(this WebApplication app)
    {
        var auth = app.MapGroup("/api/auth").WithTags("Auth");

        auth.MapGet("/login", (string? returnUrl, IWebHostEnvironment env) =>
        {
            var defaultRedirect = env.IsDevelopment() 
                ? "http://localhost:5173" 
                : "/";
            
            var properties = new AuthenticationProperties
            {
                RedirectUri = returnUrl ?? defaultRedirect
            };
            return Results.Challenge(properties, [GoogleDefaults.AuthenticationScheme]);
        })
        .WithSummary("Start Google OAuth login")
        .WithDescription("Redirects to Google sign-in. After auth, redirects to returnUrl or home.")
        .Produces(302);

        auth.MapGet("/me", async (HttpContext context, InsightsContext db) =>
        {
            if (!context.User.Identity?.IsAuthenticated ?? true)
            {
                return Results.Unauthorized();
            }

            var googleId = context.User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;
            var email = context.User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")?.Value;
            var name = context.User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name")?.Value;

            if (string.IsNullOrEmpty(googleId) || string.IsNullOrEmpty(email))
            {
                return Results.Unauthorized();
            }

            var user = await db.Users.FirstOrDefaultAsync(u => u.GoogleId == googleId);
            if (user == null)
            {
                user = new User
                {
                    UserId = Guid.NewGuid(),
                    GoogleId = googleId,
                    Email = email,
                    Name = name ?? email
                };
                db.Users.Add(user);
                await db.SaveChangesAsync();
            }

            return Results.Ok(new UserResponse(user.UserId, user.Email, user.Name));
        })
        .WithSummary("Get current user")
        .WithDescription("Returns the logged-in user's info. Creates user in DB on first login.")
        .Produces<UserResponse>(200)
        .Produces(401);

        auth.MapPost("/logout", async (HttpContext context) =>
        {
            await context.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Results.Ok(new LogoutResponse("Logged out"));
        })
        .WithSummary("Log out")
        .WithDescription("Clears the auth cookie and ends the session.")
        .Produces<LogoutResponse>(200);
    }
}