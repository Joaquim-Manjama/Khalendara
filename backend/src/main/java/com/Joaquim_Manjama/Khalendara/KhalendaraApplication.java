package com.Joaquim_Manjama.Khalendara;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
@RestController
public class KhalendaraApplication {

	public static void main(String[] args) {
		SpringApplication.run(KhalendaraApplication.class, args);
	}

    @GetMapping
    public String HelloWorld() {
        return "Hello World";
    }
}
