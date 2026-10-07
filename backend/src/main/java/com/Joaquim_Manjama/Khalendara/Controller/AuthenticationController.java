package com.Joaquim_Manjama.Khalendara.Controller;

import com.Joaquim_Manjama.Khalendara.DTO.LoginDTO;
import com.Joaquim_Manjama.Khalendara.DTO.RegisterDTO;
import com.Joaquim_Manjama.Khalendara.DTO.UserDTO;
import com.Joaquim_Manjama.Khalendara.Service.AuthenticationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController()
@RequestMapping("/auth")
public class AuthenticationController {

    @Autowired
    private AuthenticationService authService;

    @PostMapping("/register")
    public ResponseEntity<UserDTO> register(@RequestBody RegisterDTO registerDTO) {
        UserDTO user = authService.register(registerDTO);
        return ResponseEntity.ok(user);
    }

    @PostMapping("/login")
    public ResponseEntity<UserDTO> login(@RequestBody LoginDTO loginDTO) {
        UserDTO user = authService.login(loginDTO);
        return ResponseEntity.ok(user);
    }
}
