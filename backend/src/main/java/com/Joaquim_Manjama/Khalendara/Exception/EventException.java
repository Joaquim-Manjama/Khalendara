package com.Joaquim_Manjama.Khalendara.Exception;
import org.springframework.http.HttpStatus;

public class EventException extends RuntimeException {

    private final HttpStatus status;

    public EventException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {return status;}

    public static EventException IncorectDateOrTimeFormat() {
        return new EventException(HttpStatus.BAD_REQUEST, "Invalid date or time format. Expecting YYYY-MM-DD, HH:MM");
    }

    public static EventException DataTooLarge() {
        return new EventException(HttpStatus.BAD_REQUEST, "Title, description and location must be at most 500 characters.");
    }

    public static EventException MissingTitle() {
        return new EventException(HttpStatus.BAD_REQUEST, "Title is required.");
    }

    public static EventException TimeNotRight() {
        return new EventException(HttpStatus.BAD_REQUEST, "End time must be after start time.");
    }

    public static EventException EventNotFound() {
        return new EventException(HttpStatus.NOT_FOUND, "Event not found.");
    }

    public static EventException EventImportFailed() {
        return new EventException(HttpStatus.INTERNAL_SERVER_ERROR, "Event import failed.");
    }

    public static EventException TooManyEvents() {
        return new EventException(HttpStatus.CONTENT_TOO_LARGE, "Can only import 50 events at once!");
    }
}
