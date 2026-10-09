package com.Joaquim_Manjama.Khalendara.DTO;

public record EventDTO(
        String id,
        String title,
        String description,
        String location,
        String date,
        String startTime,
        String endTime,
        String eventCategory
) {
}
