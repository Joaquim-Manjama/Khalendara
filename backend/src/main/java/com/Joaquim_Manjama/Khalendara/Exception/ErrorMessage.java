package com.Joaquim_Manjama.Khalendara.Exception;

import org.springframework.http.HttpStatus;

public record ErrorMessage(
        HttpStatus status,
        String message
) {
}
