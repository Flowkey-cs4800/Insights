using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.EntityFrameworkCore;
using Insights.Server.Data;
using Insights.Server.Entities;
using System.Security.Claims;

namespace Insights.Server.Routes;

public static class AuthRoutes
{
    public record UserResponse(Guid UserId, string Email, string Name);
    public record LogoutResponse(string Message);

    public static void MapAuthRoutes(this WebApplication app)
    {
        var auth = app.MapGroup("/api/auth").WithTags("Auth");

        // Login endpoint - initiates Google OAuth flow
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


        // Get current user info
        auth.MapGet("/me", async (HttpContext context, InsightsContext db) =>
        {
            if (!context.User.Identity?.IsAuthenticated ?? true)
            {
                return Results.Unauthorized();
            }

            var existingUserId = context.User.FindFirst("UserId")?.Value;
            if (existingUserId is not null)
            {
                var email = context.User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")?.Value;
                var name = context.User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name")?.Value;
                return Results.Ok(new UserResponse(Guid.Parse(existingUserId), email ?? "", name ?? ""));
            }

            var googleId = context.User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;
            var userEmail = context.User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")?.Value;
            var userName = context.User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name")?.Value;

            if (string.IsNullOrEmpty(googleId) || string.IsNullOrEmpty(userEmail))
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
                    Email = userEmail,
                    Name = userName ?? userEmail
                };
                db.Users.Add(user);
                await db.SaveChangesAsync();
            }

            var claims = new List<Claim>(context.User.Claims)
            {
                new("UserId", user.UserId.ToString())
            };
            var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
            var principal = new ClaimsPrincipal(identity);

            await context.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);

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