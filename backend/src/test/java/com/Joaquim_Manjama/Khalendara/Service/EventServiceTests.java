package com.Joaquim_Manjama.Khalendara.Service;

import com.Joaquim_Manjama.Khalendara.DTO.*;
import com.Joaquim_Manjama.Khalendara.Enums.EventCategory;
import com.Joaquim_Manjama.Khalendara.Exception.EventException;
import com.Joaquim_Manjama.Khalendara.Model.*;
import com.Joaquim_Manjama.Khalendara.Repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.ArrayList;
import java.util.Optional;
import java.time.LocalTime;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class EventServiceTests {
    @Test
    void creationLinksUserAndPreservesMinuteTimes() {
        var users = mock(UserRepository.class);
        var events = mock(EventRepository.class);
        var service = new EventService();
        ReflectionTestUtils.setField(service, "userRepository", users);
        ReflectionTestUtils.setField(service, "eventRepository", events);
        var user = new User();
        user.setEvents(new ArrayList<>());
        when(users.findById("user-1")).thenReturn(Optional.of(user));
        when(events.save(any(Event.class))).thenAnswer(call -> call.getArgument(0));
        var principal = new UserDTO("user-1", "Test", "User", "test@example.com");
        var request = new EventRequestDTO("Lunch", "Friends", "Cafe", "2026-10-09", "12:33", "13:30", "SOCIAL");
        var saved = service.createEvent(principal, request);
        assertSame(user, saved.getUser());
        assertTrue(user.getEvents().contains(saved));
        assertEquals(LocalTime.of(12, 33), saved.getStartTime());
        assertEquals(EventCategory.SOCIAL, saved.getEventCategory());
        var invalid = new EventRequestDTO("Lunch", "", "", "2026-10-09", "13:30", "12:33", "SOCIAL");
        assertThrows(EventException.class, () -> service.createEvent(principal, invalid));
        verify(events, times(1)).save(any(Event.class));
    }
}
