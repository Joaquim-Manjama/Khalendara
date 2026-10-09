package com.Joaquim_Manjama.Khalendara.Repository;


import com.Joaquim_Manjama.Khalendara.Model.Event;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EventRepository extends JpaRepository<Event, String> {
    List<Event> findByUserId(String userId);
    Optional<Event> findByIdAndUserId(String id, String userId);
}
