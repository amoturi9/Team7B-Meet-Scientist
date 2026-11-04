#include "httplib.h"
#include <iostream>

int main() {
    httplib::Server server;

    // A test endpoint to verify that the backend works.
    server.Get("/api/health",
        [](const httplib::Request&, httplib::Response& response) {
            response.set_content(
                R"({"status":"ok","message":"C++ backend is running!"})",
                "application/json"
            );
        }
    );

    // Serve the frontend files from the same server.
    if (!server.set_mount_point("/", "./frontend")) {
        std::cerr << "Cannot find frontend folder. "
                  << "Run this program from the repository root.\n";
        return 1;
    }

    std::cout << "Starting Meet a Scientist at http://localhost:8080\n";

    if (!server.listen("127.0.0.1", 8080)) {
        std::cerr << "Server could not start on port 8080.\n";
        return 1;
    }

    return 0;
}
