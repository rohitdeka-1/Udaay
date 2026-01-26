package org.example.ai_backend.security;

import java.io.IOException;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    @Value("${internal.jwt.secret}")
    public String SECRET;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String requestPath = request.getRequestURI();
        System.out.println("\n" + "=".repeat(60));
        System.out.println("🔐 JWT AUTH FILTER - Request: " + request.getMethod() + " " + requestPath);
        System.out.println("=".repeat(60));

        String header = request.getHeader("Authorization");

        if (header == null || !header.startsWith("Bearer ")) {
            System.out.println("❌ NO AUTHORIZATION HEADER FOUND");
            System.out.println("   - Header value: " + header);
            System.out.println("   - Expected: Bearer <TOKEN>");
            System.out.println("=".repeat(60) + "\n");
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            return;
        }

        String token = header.substring(7);
        System.out.println("✅ FOUND AUTHORIZATION HEADER");
        System.out.println("   - Token (first 50 chars): " + token.substring(0, Math.min(50, token.length())) + "...");

        try {
            System.out.println("\n🔍 Verifying JWT token...");
            System.out.println("   - Secret length: " + SECRET.length() + " chars");

            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(Keys.hmacShaKeyFor(SECRET.getBytes()))
                    .build()
                    .parseClaimsJws(token)
                    .getBody();

            System.out.println("✅ JWT VERIFIED SUCCESSFULLY");
            System.out.println("   - Issuer: " + claims.getIssuer());
            System.out.println("   - Role: " + claims.get("role"));
            System.out.println("   - Expiration: " + claims.getExpiration());

            if (!"civicfix-backend".equals(claims.getIssuer())
                    || !"INTERNAL_SERVICE".equals(claims.get("role"))) {

                System.out.println("\n❌ JWT VALIDATION FAILED");
                System.out.println("   - Invalid Issuer: " + claims.getIssuer());
                System.out.println("   - Invalid Role: " + claims.get("role"));
                System.out.println("   - Expected Issuer: civicfix-backend");
                System.out.println("   - Expected Role: INTERNAL_SERVICE");
                System.out.println("=".repeat(60) + "\n");
                response.setStatus(HttpStatus.FORBIDDEN.value());
                return;
            }

            System.out.println("\n✅ JWT CLAIMS VALIDATION PASSED");
            System.out.println("   - Issuer matches: civicfix-backend");
            System.out.println("   - Role matches: INTERNAL_SERVICE");

            UsernamePasswordAuthenticationToken auth
                    = new UsernamePasswordAuthenticationToken(
                            "CIVICFIX_SERVICE", null, List.of());

            SecurityContextHolder.getContext().setAuthentication(auth);

            System.out.println("\n✅ AUTHENTICATION SET IN SECURITY CONTEXT");
            System.out.println("=".repeat(60) + "\n");

            filterChain.doFilter(request, response);

        } catch (Exception e) {
            System.out.println("\n❌ JWT PARSING EXCEPTION: " + e.getMessage());
            System.out.println("   - Exception Type: " + e.getClass().getSimpleName());
            System.out.println("   - Stack: " + e.toString());
            System.out.println("=".repeat(60) + "\n");
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
        }
    }

}
