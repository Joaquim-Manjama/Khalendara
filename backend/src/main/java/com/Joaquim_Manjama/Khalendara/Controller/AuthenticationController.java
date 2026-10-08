package com.Joaquim_Manjama.Khalendara.Controller;

import com.Joaquim_Manjama.Khalendara.DTO.LoginDTO;
import com.Joaquim_Manjama.Khalendara.DTO.RegisterDTO;
import com.Joaquim_Manjama.Khalendara.DTO.UserDTO;
import com.Joaquim_Manjama.Khalendara.Security.JwtService;
import com.Joaquim_Manjama.Khalendara.Service.AuthenticationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

@RestController()
@RequestMapping("/auth")
public class AuthenticationController {

    @Autowired
    private AuthenticationService authService;

    @Autowired
    private JwtService jwtService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterDTO registerDTO) {
        UserDTO user = authService.register(registerDTO);
        return ResponseEntity.ok().body("Register successful");
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginDTO loginDTO) {
        UserDTO user = authService.login(loginDTO);

        String token = jwtService.generateToken(user);

        ResponseCookie cookie = ResponseCookie
                .from("access_token", token)
                .httpOnly(true)
                .secure(true)
                .sameSite("Lax")
                .path("/")
                .maxAge(Duration.ofHours(1))
                .build();

        return ResponseEntity.ok().header(
                HttpHeaders.SET_COOKIE,
                cookie.toString()
        ).body("Login successful");
    }
}
