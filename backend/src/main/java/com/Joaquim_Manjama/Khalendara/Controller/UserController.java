package com.Joaquim_Manjama.Khalendara.Controller;

import com.Joaquim_Manjama.Khalendara.DTO.UserDTO;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users")
public class UserController {

    @GetMapping("/me")
    public UserDTO getMe(
            @AuthenticationPrincipal UserDTO user
    ) {
        return user;
    }
}
