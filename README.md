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

In VS Code, choose **Terminal → New Terminal**. From the project folder, run:

```bash
brew install libsodium
bash scripts/start.sh
```

The first command is only needed once. The second compiles and starts the server.
Open http://localhost:8080/signup.html in your browser.

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

## Signup and login walkthrough

1. Open `/signup.html`, enter a name, email, teacher/scientist account type, and a long password.
2. After creating the account, log in at `/login.html`.
3. `/account.html` shows your saved name, email, and account type.
4. Log out, stop and restart the server, and log in again with the same details.

Accounts are stored in `data/accounts.db`, a SQLite database created automatically.
Keep this file to preserve accounts. It is private and excluded from Git, so each
teammate has their own local accounts. Passwords are stored as salted Argon2id hashes
using libsodium; readable passwords are never written to the database.
Sessions expire after 24 hours and logout revokes the current session.

## How the new code fits together

- `frontend/signup.html` and `frontend/login.html`: the forms people fill out.
- `frontend/auth.js`: sends form data to the C++ server and displays errors.
- `frontend/account.html`: displays the currently signed-in account.
- `frontend/auth.css`: styling for these three pages.
- `backend/src/main.cpp`: validates input, hashes/checks passwords, reads/writes SQLite,
  and manages login sessions in HttpOnly cookies.
- `scripts/start.sh`: compiles and starts the application with its libraries.
- `tests/auth_test.py`: checks the account flow using a separate temporary database.

API routes: `POST /api/signup`, `POST /api/login`, `GET /api/me`, and `POST /api/logout`.
POST requests use URL-encoded form data and an `X-Requested-With: MeetScientist` header.
Responses are plain text except `/api/me` and `/api/health`, which return JSON.
Teacher/scientist roles are self-selected labels, not verified professional status.

## Current scope and deployment limits

This is a local development implementation. It binds only to your computer and
allows localhost on port 8080. Public hosting still needs HTTPS, Secure cookies,
a configured trusted hostname, persistent disk storage and backups, and a reviewed
rate-limit strategy. The current limit is shared across the local demo: 30 signup/login
attempts per minute. Account recovery and email verification are not implemented.

The existing scholar profile form still saves in browser localStorage. It is not
linked to login accounts yet. Shared profiles, search, meeting requests, messaging,
and reviews remain unimplemented. Logging in does not make that old form private.

To run integration tests, stop the development server first, then run:

```bash
python3 tests/auth_test.py
```

Tests start a temporary server on port 8080 and never change your normal database.

## Third-party dependency

cpp-httplib v0.27.0 is bundled in backend/include/.
Its license is included as cpp-httplib-LICENSE.

SQLite is provided by the macOS developer tools; libsodium is installed through Homebrew.

## November team integration

Merged the remote Aidan, Keon, and workspace-setup history. Aidan's updated homepage,
basic/scholar profile editors, photo upload previews, and login styling are retained.
The login page now calls the persistent C++ account API. Password fields were removed
from the browser-only profile editors; use signup.html to create a login account.
Profile editor data remains browser-local and is not yet tied to authenticated users.
