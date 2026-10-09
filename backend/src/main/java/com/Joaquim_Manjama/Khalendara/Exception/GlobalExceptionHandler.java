package com.Joaquim_Manjama.Khalendara.Exception;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(EventException.class)
    public ResponseEntity<ErrorMessage> handleEventException(EventException exception) {
        return ResponseEntity.status(exception.getStatus())
                .body(new ErrorMessage(exception.getStatus(), exception.getMessage()));
    }

    @ExceptionHandler(AuthException.class)
    public ResponseEntity<ErrorMessage> handleAuthException(
            AuthException exception) {

        ErrorMessage error = new ErrorMessage(
                exception.getStatus(),
                exception.getMessage()
        );

        return ResponseEntity
                .status(exception.getStatus())
                .body(error);
    }
}
