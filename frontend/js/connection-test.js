const button = document.getElementById("test-button");
const result = document.getElementById("result");

button.addEventListener("click", async () => {
  button.disabled = true;
  result.textContent = "Connecting...";

  try {
    const response = await fetch("/api/health", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== "ok" || typeof data.message !== "string") {
      throw new Error("Unexpected response from the backend");
    }

    result.textContent = `Success: ${data.message}`;
  } catch (error) {
    result.textContent = `Connection failed: ${error.message}`;
  } finally {
    button.disabled = false;
  }
});
