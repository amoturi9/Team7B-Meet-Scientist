const STORAGE_KEY = "meetAScientistProfile";

const loginForm = document.querySelector("#login-form");
const loginMessage = document.querySelector("#login-message");

loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const email = document.querySelector("#email").value.trim();
    const password = document.querySelector("#password").value;

    const savedProfile = JSON.parse(
        localStorage.getItem(STORAGE_KEY)
    );

    if (!savedProfile) {
        loginMessage.textContent = "No account found.";
        return;
    }

    if (
        savedProfile.email.toLowerCase() === email.toLowerCase() &&
        savedProfile.password === password
    ) {
        window.location.href = "temp-success.html";
    } else {
        loginMessage.textContent = "Incorrect email or password.";
    }
});