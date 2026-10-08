package com.Joaquim_Manjama.Khalendara.Security;

import com.Joaquim_Manjama.Khalendara.DTO.UserDTO;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;

import java.util.Base64;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTests {
    private final SecurityConfigurations configuration = new SecurityConfigurations();

    @Test
    void issuedTokenCanBeVerifiedAndContainsUserIdAndOneHourExpiry() {
        var key = configuration.jwtKey(Base64.getEncoder().encodeToString(new byte[32]));
        var service = new JwtService(configuration.jwtEncoder(key));
        var user = new UserDTO("user-123", "Test", "User", "test@example.com");

        Jwt token = configuration.jwtDecoder(key).decode(service.generateToken(user));

        assertEquals("HS256", token.getHeaders().get("alg"));
        assertEquals(user.id(), token.getSubject());
        assertNotNull(token.getIssuedAt());
        assertEquals(token.getIssuedAt().plusSeconds(3600), token.getExpiresAt());
    }

    @Test
    void tokenSignedWithAnotherKeyIsRejected() {
        byte[] otherSecret = new byte[32];
        otherSecret[0] = 1;
        var key = configuration.jwtKey(Base64.getEncoder().encodeToString(new byte[32]));
        var otherKey = configuration.jwtKey(Base64.getEncoder().encodeToString(otherSecret));
        var service = new JwtService(configuration.jwtEncoder(key));
        String token = service.generateToken(new UserDTO("user-123", "Test", "User", "test@example.com"));

        assertThrows(JwtException.class, () -> configuration.jwtDecoder(otherKey).decode(token));
    }
}
