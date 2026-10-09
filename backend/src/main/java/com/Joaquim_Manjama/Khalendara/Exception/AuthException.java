package com.Joaquim_Manjama.Khalendara.Exception;
import org.springframework.http.HttpStatus;

public class AuthException extends RuntimeException {

    private final HttpStatus status;

    public AuthException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {return this.status;}

    public static AuthException UserNotFound() {
        return new AuthException(
                        HttpStatus.NOT_FOUND,
                        "This email is not registered!"
                );
    }

    public static AuthException UserAlreadyExists() {
        return new AuthException(
                        HttpStatus.CONFLICT,
                        "An account with this email already exists!"
                );
    }

    public static AuthException IncorrectPassword() {
        return new AuthException(
                        HttpStatus.UNAUTHORIZED,
                        "Incorrect password!"
                );
    }

    public static AuthException firstNameTooLong() {
        return new AuthException(
                HttpStatus.BAD_REQUEST,
                        "First name is too long!"
        );
    }

    public static AuthException lastNameTooLong() {
        return new AuthException(
                HttpStatus.BAD_REQUEST,
                "Last name is too long!"
        );
    }
}
