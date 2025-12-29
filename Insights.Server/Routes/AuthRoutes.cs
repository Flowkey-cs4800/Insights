using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.EntityFrameworkCore;
using Insights.Server.Data;
using Insights.Server.Entities;

namespace Insights.Server.Routes;

public static class AuthRoutes
{
    public static void MapAuthRoutes(this WebApplication app)
    {
        var auth = app.MapGroup("/api/auth").WithTags("Auth");

        // Initiate Google login
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
        });

        // Get current user
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

            // Find or create user
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

            return Results.Ok(new
            {
                user.UserId,
                user.Email,
                user.Name
            });
        });

        // Logout
        auth.MapPost("/logout", async (HttpContext context) =>
        {
            await context.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Results.Ok(new { message = "Logged out" });
        });
    }
}