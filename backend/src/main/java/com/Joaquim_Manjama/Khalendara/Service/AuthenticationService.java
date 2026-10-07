package com.Joaquim_Manjama.Khalendara.Service;

import com.Joaquim_Manjama.Khalendara.DTO.LoginDTO;
import com.Joaquim_Manjama.Khalendara.DTO.RegisterDTO;
import com.Joaquim_Manjama.Khalendara.DTO.UserDTO;
import com.Joaquim_Manjama.Khalendara.Exception.AuthException;
import com.Joaquim_Manjama.Khalendara.Model.User;
import com.Joaquim_Manjama.Khalendara.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AuthenticationService {

    @Autowired
    UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public UserDTO register(RegisterDTO registerDTO) {

        Optional<User> possibleUser = userRepository.findByEmail(registerDTO.email());

        if  (possibleUser.isPresent()) throw AuthException.UserAlreadyExists();

        User user = new User();
        user.setFirstName(registerDTO.firstName());
        user.setLastName(registerDTO.lastName());
        user.setEmail(registerDTO.email());
        user.setPassword(passwordEncoder.encode(registerDTO.password()));
        userRepository.save(user);
        return convertToDTO(registerDTO);
    }

    public UserDTO login(LoginDTO loginDTO) {
        userRepository.findByEmail(loginDTO.email());

        if  (userRepository.findByEmail(loginDTO.email()).isPresent()) {
            User user = userRepository.findByEmail(loginDTO.email()).get();

            if (passwordEncoder.matches(loginDTO.password(), user.getPassword())) {
                return convertToDTO(user);
            }

            throw AuthException.IncorrectPassword();
        }

        throw AuthException.UserNotFound();
    }

    public UserDTO convertToDTO(User user) {
        return new UserDTO(
                user.getFirstName(),
                user.getLastName(),
                user.getEmail()
        );
    }

    public UserDTO convertToDTO(RegisterDTO registerDTO) {
        return new UserDTO(
                registerDTO.firstName(),
                registerDTO.lastName(),
                registerDTO.email()
        );
    }
}
