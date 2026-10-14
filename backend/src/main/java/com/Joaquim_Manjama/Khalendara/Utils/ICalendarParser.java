package com.Joaquim_Manjama.Khalendara.Utils;

import com.Joaquim_Manjama.Khalendara.DTO.EventRequestDTO;
import com.Joaquim_Manjama.Khalendara.Exception.EventException;
import net.fortuna.ical4j.data.CalendarBuilder;
import net.fortuna.ical4j.model.Calendar;
import net.fortuna.ical4j.model.Property;
import net.fortuna.ical4j.model.component.VEvent;
import net.fortuna.ical4j.model.property.DateProperty;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.Temporal;
import java.util.ArrayList;
import java.util.Comparator;

import java.io.StringReader;
import java.util.List;

public class ICalendarParser {

    public static List<EventRequestDTO> parseCalendar(String content, String category) {

        List<EventRequestDTO> list = new ArrayList<>();

        try {
            Calendar calendar = new CalendarBuilder()
                    .build(new StringReader(content));

            for (VEvent event: calendar.<VEvent>getComponents("VEVENT")) {
                list.add(extractEvent(event, category));
            }
        } catch (Exception e) {
            throw EventException.EventImportFailed();
        }

        return list;

    }

    private static EventRequestDTO extractEvent(VEvent event, String category) {
        // Your feed has one category per CATEGORIES property.
        String title = event.<Property>getProperties("CATEGORIES")
                .stream()
                .map(Property::getValue)
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .max(Comparator.comparingInt(String::length))
                .orElseGet(() -> propertyValue(event, "SUMMARY")).replace("\n", "");

        String description = propertyValue(event, "DESCRIPTION").replace("\n", "");
        String location = propertyValue(event, "LOCATION").replace("\n", "");

        LocalDateTime start = eventDateTime(event, "DTSTART");
        LocalDateTime end = eventDateTime(event, "DTEND");

        DateTimeFormatter timeFormat = DateTimeFormatter.ofPattern("HH:mm");

        return new EventRequestDTO(
                title,
                description,
                location,
                start.toLocalDate().toString(),
                start.toLocalTime().format(timeFormat),
                end.toLocalTime().format(timeFormat),
                false,
                category
        );
    }

    private static String propertyValue(VEvent event, String name) {
        return event.<Property>getProperty(name)
                .map(Property::getValue)
                .orElse("");
    }

    private static LocalDateTime eventDateTime(VEvent event, String name) {
        DateProperty<?> property = event.<DateProperty<?>>getProperty(name)
                .orElseThrow(() ->
                        new IllegalArgumentException("Event is missing " + name));

        Temporal value = property.getDate();

        // Convert timestamps representing an instant into London time.
        if (value.isSupported(java.time.temporal.ChronoField.INSTANT_SECONDS)) {
            return Instant.from(value)
                    .atZone(ZoneId.of("Europe/London"))
                    .toLocalDateTime();
        }

        if (value instanceof LocalDateTime localDateTime) {
            return localDateTime;
        }

        throw EventException.EventImportFailed();
    }
}
