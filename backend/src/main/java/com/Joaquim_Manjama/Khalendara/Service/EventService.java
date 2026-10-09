package com.Joaquim_Manjama.Khalendara.Service;

import com.Joaquim_Manjama.Khalendara.DTO.EventDTO;
import com.Joaquim_Manjama.Khalendara.DTO.EventRequestDTO;
import com.Joaquim_Manjama.Khalendara.DTO.UserDTO;
import com.Joaquim_Manjama.Khalendara.Enums.EventCategory;
import com.Joaquim_Manjama.Khalendara.Exception.AuthException;
import com.Joaquim_Manjama.Khalendara.Exception.EventException;
import com.Joaquim_Manjama.Khalendara.Model.Event;
import com.Joaquim_Manjama.Khalendara.Model.User;
import com.Joaquim_Manjama.Khalendara.Repository.EventRepository;
import com.Joaquim_Manjama.Khalendara.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PathVariable;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

@Service
public class EventService {

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private UserRepository userRepository;

    @Transactional
    public EventDTO deleteEvent(UserDTO userDTO, String id) {
        User user = getUser(userDTO);
        Optional<Event> optionalEvent = eventRepository.findByIdAndUserId(id, user.getId());

        if (optionalEvent.isPresent()) {
            Event event = optionalEvent.get();

            user.getEvents().remove(event);
            eventRepository.delete(event);

            return convertToDTO(event);
        }

        throw EventException.EventNotFound();
    }

    public List<EventDTO> getAll(UserDTO userDTO) {
        User user = getUser(userDTO);
        return eventRepository.findByUserId(user.getId()).stream().map(this::convertToDTO).toList();
    }

    @Transactional
    public EventDTO createEvent(UserDTO userDTO, EventRequestDTO eventRequestDTO) {

        User user = getUser(userDTO);

        try {
            String[] date = eventRequestDTO.date().split("-");
            int year = Integer.parseInt(eventRequestDTO.date().split("-")[0]);
            int month = Integer.parseInt(eventRequestDTO.date().split("-")[1]);
            int day = Integer.parseInt(eventRequestDTO.date().split("-")[2]);

            String[] startTime = eventRequestDTO.startTime().split(":");
            int startHour = Integer.parseInt(startTime[0]);
            int startMinute = Integer.parseInt(startTime[1]);

            String[] endTime = eventRequestDTO.endTime().split(":");
            int endHour = Integer.parseInt(endTime[0]);
            int endMinute = Integer.parseInt(endTime[1]);

            if (eventRequestDTO.title() == null || eventRequestDTO.title().isBlank())
                throw EventException.MissingTitle();

            if (eventRequestDTO.title().length() > 100
                    || eventRequestDTO.description() == null || eventRequestDTO.description().length() > 100
                    || eventRequestDTO.location() == null || eventRequestDTO.location().length() > 100)
                throw EventException.DataTooLarge();

            if (!LocalTime.of(endHour, endMinute).isAfter(LocalTime.of(startHour, startMinute)))
                throw EventException.TimeNotRight();

            Event event = new Event();
            event.setTitle(eventRequestDTO.title());
            event.setDescription(eventRequestDTO.description());
            event.setLocation(eventRequestDTO.location());
            event.setDate(LocalDate.of(year, month, day));
            event.setStartTime(LocalTime.of(startHour, startMinute));
            event.setEndTime(LocalTime.of(endHour, endMinute));
            event.setEventCategory(EventCategory.valueOf(eventRequestDTO.eventCategory()));

            event.setUser(user);
            user.getEvents().add(event);

            return convertToDTO(eventRepository.save(event));

        } catch (EventException e) {
            throw e;
        } catch (IllegalArgumentException | java.time.DateTimeException | IndexOutOfBoundsException | NullPointerException e) {
            throw EventException.IncorectDateOrTimeFormat();
        }
    }

    private User getUser(UserDTO userDTO) {
        Optional<User> optionalUser = userRepository.findById(userDTO.id());

        if (!optionalUser.isPresent()) throw AuthException.UserNotFound();

        return optionalUser.get();
    }

    private EventDTO convertToDTO(Event event) {
        return new EventDTO(
                event.getId(),
                event.getTitle(),
                event.getDescription(),
                event.getLocation(),
                event.getDate().toString(),
                event.getStartTime().toString(),
                event.getEndTime().toString(),
                event.getEventCategory().toString()
        );
    }

}
