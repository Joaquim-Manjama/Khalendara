package com.Joaquim_Manjama.Khalendara.Service;

import com.Joaquim_Manjama.Khalendara.DTO.*;
import com.Joaquim_Manjama.Khalendara.Enums.EventCategory;
import com.Joaquim_Manjama.Khalendara.Exception.EventException;
import com.Joaquim_Manjama.Khalendara.Model.*;
import com.Joaquim_Manjama.Khalendara.Repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.*;
import java.time.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class EventServiceTests {
    private final UserRepository users = mock(UserRepository.class);
    private final EventRepository events = mock(EventRepository.class);
    private final EventService service = new EventService();
    private final UserDTO principal = new UserDTO("user-1", "Test", "User", "test@example.com");
    private final User user = new User();

    @BeforeEach
    void setup() {
        user.setId(principal.id()); user.setEvents(new ArrayList<>());
        when(users.findById(principal.id())).thenReturn(Optional.of(user));
        ReflectionTestUtils.setField(service, "userRepository", users);
        ReflectionTestUtils.setField(service, "eventRepository", events);
    }

    private Event sampleEvent() {
        Event event = new Event();
        event.setId("event-1"); event.setUser(user); event.setTitle("Lunch");
        event.setDescription("With friends"); event.setLocation("Cafe");
        event.setDate(LocalDate.of(2026, 10, 12));
        event.setStartTime(LocalTime.of(12, 33)); event.setEndTime(LocalTime.of(13, 30));
        event.setEventCategory(EventCategory.SOCIAL);
        return event;
    }

    @Test
    void creationPersistsOwnershipAndReturnsEventDTOWithMinuteTimes() {
        when(events.save(any(Event.class))).thenAnswer(call -> {
            Event event = call.getArgument(0);
            assertSame(user, event.getUser());
            assertTrue(user.getEvents().contains(event));
            event.setId("event-1"); return event;
        });
        EventDTO result = service.createEvent(principal, new EventRequestDTO("Lunch", "With friends", "Cafe", "2026-10-12", "12:33", "13:30", "SOCIAL"));
        assertEquals(new EventDTO("event-1", "Lunch", "With friends", "Cafe", "2026-10-12", "12:33", "13:30", "SOCIAL"), result);
        verify(events).save(any(Event.class));
    }

    @Test
    void invalidEventsAreRejectedWithoutSaving() {
        List<EventRequestDTO> invalid = List.of(
            new EventRequestDTO(" ", "", "", "2026-10-12", "09:00", "10:00", "WORK"),
            new EventRequestDTO("x".repeat(101), "", "", "2026-10-12", "09:00", "10:00", "WORK"),
            new EventRequestDTO("Work", "", "", "2026-02-30", "09:00", "10:00", "WORK"),
            new EventRequestDTO("Work", "", "", "2026-10-12", "25:00", "26:00", "WORK"),
            new EventRequestDTO("Work", "", "", "2026-10-12", "10:00", "09:00", "WORK"),
            new EventRequestDTO("Work", "", "", "2026-10-12", "09:00", "09:00", "WORK"),
            new EventRequestDTO("Work", "", "", "2026-10-12", "09:00", "10:00", "UNKNOWN")
        );
        for (EventRequestDTO request : invalid) {
            assertThrows(EventException.class, () -> service.createEvent(principal, request), request.toString());
        }
        verify(events, never()).save(any());
        assertTrue(user.getEvents().isEmpty());
    }

    @Test
    void listingQueriesOnlySignedInUserAndReturnsDTOs() {
        when(events.findByUserId(principal.id())).thenReturn(List.of(sampleEvent()));
        List<EventDTO> result = service.getAll(principal);
        assertEquals(1, result.size());
        assertEquals("event-1", result.getFirst().id());
        assertEquals("2026-10-12", result.getFirst().date());
        assertEquals("12:33", result.getFirst().startTime());
        verify(events).findByUserId(principal.id());
        when(events.findByUserId(principal.id())).thenReturn(List.of());
        assertTrue(service.getAll(principal).isEmpty());
    }

    @Test
    void deletionUsesEventIdThenUserIdAndRejectsMissingOrUnownedEvents() {
        Event event = sampleEvent(); user.getEvents().add(event);
        when(events.findByIdAndUserId(event.getId(), principal.id())).thenReturn(Optional.of(event));
        assertEquals(event.getId(), service.deleteEvent(principal, event.getId()).id());
        assertTrue(user.getEvents().isEmpty());
        verify(events).delete(event);
        when(events.findByIdAndUserId("other-event", principal.id())).thenReturn(Optional.empty());
        assertThrows(EventException.class, () -> service.deleteEvent(principal, "other-event"));
        verify(events, times(1)).delete(any(Event.class));
    }
}
