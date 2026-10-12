package com.Joaquim_Manjama.Khalendara.Service;

import com.Joaquim_Manjama.Khalendara.DTO.*;
import com.Joaquim_Manjama.Khalendara.Exception.AuthException;
import com.Joaquim_Manjama.Khalendara.Model.User;
import com.Joaquim_Manjama.Khalendara.Repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthenticationServiceTests {
    private final UserRepository users = mock(UserRepository.class);
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);
    private final AuthenticationService service = new AuthenticationService();
    private final RegisterDTO registration = new RegisterDTO("Test", "User", "test@example.com", "secret-password");

    @BeforeEach
    void setup() {
        ReflectionTestUtils.setField(service, "userRepository", users);
        ReflectionTestUtils.setField(service, "passwordEncoder", encoder);
    }

    @Test
    void registrationStoresHashedPasswordAndReturnsProfile() {
        when(users.findByEmail(registration.email())).thenReturn(Optional.empty());
        when(users.save(any(User.class))).thenAnswer(call -> {
            User user = call.getArgument(0);
            user.setId("user-1");
            assertNotEquals(registration.password(), user.getPassword());
            assertTrue(encoder.matches(registration.password(), user.getPassword()));
            return user;
        });
        assertEquals(new UserDTO("user-1", "Test", "User", registration.email()), service.register(registration));
        verify(users).save(any(User.class));
    }

    @Test
    void duplicateRegistrationDoesNotSaveAnotherUser() {
        when(users.findByEmail(registration.email())).thenReturn(Optional.of(new User()));
        assertThrows(AuthException.class, () -> service.register(registration));
        verify(users, never()).save(any());
    }

    @Test
    void loginAcceptsCorrectPasswordAndRejectsWrongPasswordOrUnknownEmail() {
        User user = new User();
        user.setId("user-1"); user.setEmail(registration.email());
        user.setFirstName("Test"); user.setLastName("User");
        user.setPassword(encoder.encode(registration.password()));
        when(users.findByEmail(registration.email())).thenReturn(Optional.of(user));
        assertEquals("user-1", service.login(new LoginDTO(registration.email(), registration.password())).id());
        assertThrows(AuthException.class, () -> service.login(new LoginDTO(registration.email(), "wrong")));
        when(users.findByEmail("missing@example.com")).thenReturn(Optional.empty());
        assertThrows(AuthException.class, () -> service.login(new LoginDTO("missing@example.com", "wrong")));
    }
}
