package com.Joaquim_Manjama.Khalendara.Controller;

import com.Joaquim_Manjama.Khalendara.DTO.EventDTO;
import com.Joaquim_Manjama.Khalendara.DTO.EventRequestDTO;
import com.Joaquim_Manjama.Khalendara.DTO.UserDTO;
import com.Joaquim_Manjama.Khalendara.Service.EventService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/events")
public class EventController {

    @Autowired
    private EventService eventService;

    @PostMapping("/create")
    public ResponseEntity<?> createEvent(@AuthenticationPrincipal UserDTO userDTO, @RequestBody EventRequestDTO eventRequestDTO) {
        EventDTO event = eventService.createEvent(userDTO, eventRequestDTO);
        return ResponseEntity.ok(event);
    }

    @GetMapping("/all")
    public ResponseEntity<?> getEvent(@AuthenticationPrincipal UserDTO userDTO) {
        List<EventDTO> events = eventService.getAll(userDTO);
        return ResponseEntity.ok(events);
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<?> deleteEvent(@AuthenticationPrincipal UserDTO userDTO, @PathVariable String id) {
        EventDTO event = eventService.deleteEvent(userDTO, id);
        return ResponseEntity.ok(event);
    }
}
