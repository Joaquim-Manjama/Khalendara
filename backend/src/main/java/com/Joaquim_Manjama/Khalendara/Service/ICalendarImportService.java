package com.Joaquim_Manjama.Khalendara.Service;

import com.Joaquim_Manjama.Khalendara.DTO.EventDTO;
import com.Joaquim_Manjama.Khalendara.DTO.EventRequestDTO;
import com.Joaquim_Manjama.Khalendara.DTO.ICalendarImportDTO;
import com.Joaquim_Manjama.Khalendara.DTO.UserDTO;
import com.Joaquim_Manjama.Khalendara.Exception.EventException;
import com.Joaquim_Manjama.Khalendara.Utils.ICalendarParser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class ICalendarImportService {

    @Autowired
    EventService eventService;

    public List<EventDTO> importEvents(UserDTO userDTO, ICalendarImportDTO calendarImportDTO) {
        List<EventDTO> events = new ArrayList<>();

        String content = fetchCalendarData(calendarImportDTO.url());
        List<EventRequestDTO> calendar = ICalendarParser.parseCalendar(content, calendarImportDTO.category());

        for (EventRequestDTO event : calendar) {

            LocalDate eventDate = LocalDate.parse(event.date());

            if (!eventDate.isBefore(LocalDate.now())) {
                events.add(eventService.createEvent(userDTO, event));
            }
        }

        return events;
    }


    private static String fetchCalendarData(String url) {
        try (HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build()) {

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(20))
                    .GET()
                    .build();

            HttpResponse<String> response = client.send(
                    request,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
            );

            if (response.statusCode() != 200) {
                throw EventException.EventImportFailed();
            }

            String content = response.body();
            return content;

        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }
}
