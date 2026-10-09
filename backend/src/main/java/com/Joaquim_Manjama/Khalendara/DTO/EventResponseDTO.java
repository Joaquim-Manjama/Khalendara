package com.Joaquim_Manjama.Khalendara.DTO;

import com.Joaquim_Manjama.Khalendara.Model.Event;
import java.time.LocalDate;
import java.time.LocalTime;
import com.Joaquim_Manjama.Khalendara.Enums.EventCategory;

public record EventResponseDTO(String id, String title, String description, String location,
                               LocalDate date, LocalTime startTime, LocalTime endTime, EventCategory eventCategory) {
    public static EventResponseDTO from(Event event) {
        return new EventResponseDTO(event.getId(), event.getTitle(), event.getDescription(), event.getLocation(),
                event.getDate(), event.getStartTime(), event.getEndTime(), event.getEventCategory());
    }
}
