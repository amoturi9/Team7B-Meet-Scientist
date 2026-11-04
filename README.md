# Meet a Scientist — Team 7B

A capstone project connecting users with STEM professionals.

## Development stack

- Frontend: HTML and JavaScript
- Backend: C++17 with cpp-httplib v0.27.0
- Communication: HTTP requests and JSON responses

## Folder structure

- frontend/: HTML pages and browser JavaScript
- frontend/css/: reserved for stylesheets
- backend/src/: C++ server source
- backend/include/: bundled cpp-httplib header and license
- build/: local compiled output, excluded from Git

## Local setup on macOS

Install Git and Apple's command-line developer tools.
If developer tools are missing, run:

```bash
xcode-select --install
```

From the repository root, compile:

```bash
mkdir -p build
clang++ -std=c++17 -pthread -Ibackend/include backend/src/main.cpp -o build/server
```

Start the server from the repository root:

```bash
./build/server
```

Keep the terminal running. Press Control+C to stop the server.

## Local pages

- Home: http://localhost:8080/
- Scholar profile form: http://localhost:8080/s-create.html
- Backend health endpoint: http://localhost:8080/api/health
- Connection test: http://localhost:8080/connection-test.html

Click "Test backend connection" on the connection-test page.
Expected result: "Success: C++ backend is running!"

## How the connection works

1. The C++ server serves the HTML and JavaScript files.
2. The test button triggers a JavaScript fetch request to /api/health.
3. The C++ endpoint returns JSON.
4. JavaScript displays the response on the page.

HTML and JavaScript changes require a browser refresh.
C++ changes require stopping, recompiling, and restarting the server.

## Current scope

The local frontend/backend connection has been verified on macOS.
The homepage and scholar profile form are available. The form supports a live
preview and saves a profile in browser localStorage, not in the C++ backend
or a shared database. Accounts, database storage, search, meeting requests,
messaging, and reviews are not implemented yet.

## Third-party dependency

cpp-httplib v0.27.0 is bundled in backend/include/.
Its license is included as cpp-httplib-LICENSE.
