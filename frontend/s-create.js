const STORAGE_KEY = "meetAScientistProfile";

const subjectOptions = [
  "Mathematics",
  "Computer Science",
  "Physics",
  "Chemistry",
  "Biology",
  "Engineering",
  "Data Science",
  "Robotics",
  "Artificial Intelligence",
  "Environmental Science",
  "Astronomy",
  "Statistics"
];

const form = document.querySelector("#profile-form");
const subjectsList = document.querySelector("#subjects-list");
const message = document.querySelector("#form-message");
const savedIndicator = document.querySelector("#saved-indicator");
const bioInput = document.querySelector("#bio");
const bioCount = document.querySelector("#bio-count");

const fields = {
  fullName: document.querySelector("#fullName"),
  school: document.querySelector("#school"),
  academicYear: document.querySelector("#academicYear"),
  major: document.querySelector("#major"),
  location: document.querySelector("#location"),
  bio: bioInput
};

function makeSubjectOptions() {
  subjectsList.innerHTML = "";

  subjectOptions.forEach((subject, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "subject-option";
    wrapper.dataset.subject = subject;

    const label = document.createElement("label");
    label.className = "subject-check";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "subjects";
    checkbox.value = subject;
    checkbox.id = `subject-${index}`;

    const labelText = document.createElement("span");
    labelText.textContent = subject;

    const level = document.createElement("select");
    level.className = "subject-level";
    level.name = `level-${index}`;
    level.setAttribute("aria-label", `${subject} skill level`);

    ["Beginner", "Intermediate", "Advanced", "Expert"].forEach((levelName) => {
      const option = document.createElement("option");
      option.value = levelName;
      option.textContent = levelName;
      if (levelName === "Intermediate") option.selected = true;
      level.appendChild(option);
    });

    checkbox.addEventListener("change", () => {
      wrapper.classList.toggle("selected", checkbox.checked);
      updatePreview();
    });
    level.addEventListener("change", updatePreview);

    label.append(checkbox, labelText);
    wrapper.append(label, level);
    subjectsList.appendChild(wrapper);
  });
}

function selectedSubjects() {
  return [...subjectsList.querySelectorAll(".subject-option")]
    .filter((item) => item.querySelector('input[type="checkbox"]').checked)
    .map((item) => ({
      name: item.dataset.subject,
      level: item.querySelector("select").value
    }));
}

function selectedGoals() {
  return [...form.querySelectorAll('input[name="goals"]:checked')].map((input) => input.value);
}

function selectedConnectionMode() {
  return form.querySelector('input[name="connectionMode"]:checked')?.value || "In person";
}

function getProfileFromForm() {
  return {
    fullName: fields.fullName.value.trim(),
    school: fields.school.value.trim(),
    academicYear: fields.academicYear.value,
    major: fields.major.value.trim(),
    location: fields.location.value.trim(),
    bio: fields.bio.value.trim(),
    subjects: selectedSubjects(),
    goals: selectedGoals(),
    connectionMode: selectedConnectionMode(),
    updatedAt: new Date().toISOString()
  };
}

function addTag(container, title, subtitle = "") {
  const tag = document.createElement("span");
  tag.className = "tag";
  const titleText = document.createElement("span");
  titleText.textContent = title;
  tag.appendChild(titleText);

  if (subtitle) {
    const detail = document.createElement("small");
    detail.textContent = subtitle;
    tag.appendChild(detail);
  }
  container.appendChild(tag);
}

function updatePreview() {
  const profile = getProfileFromForm();

  document.querySelector("#preview-name").textContent = profile.fullName || "Your name";
  document.querySelector("#preview-avatar").textContent = profile.fullName
    ? profile.fullName.charAt(0).toUpperCase()
    : "?";
  document.querySelector("#preview-major").textContent = profile.major || "Your major or field of study";
  document.querySelector("#preview-school").textContent =
    `${profile.school || "Your school"} · ${profile.academicYear || "Academic year"}`;

  const bioPreview = document.querySelector("#preview-bio");
  bioPreview.textContent = profile.bio || "Your introduction will show up here as you type.";
  bioPreview.classList.toggle("muted", !profile.bio);

  const subjectContainer = document.querySelector("#preview-subjects");
  subjectContainer.replaceChildren();
  if (profile.subjects.length) {
    profile.subjects.forEach((subject) => addTag(subjectContainer, subject.name, subject.level));
  } else {
    const empty = document.createElement("span");
    empty.className = "empty-tag";
    empty.textContent = "Choose your subjects";
    subjectContainer.appendChild(empty);
  }

  const goalsContainer = document.querySelector("#preview-goals");
  goalsContainer.replaceChildren();
  if (profile.goals.length) {
    profile.goals.forEach((goal) => addTag(goalsContainer, goal));
  } else {
    const empty = document.createElement("span");
    empty.className = "empty-tag";
    empty.textContent = "Choose your goals";
    goalsContainer.appendChild(empty);
  }

  document.querySelector("#preview-location").textContent = profile.location || "Location not added";
  document.querySelector("#preview-mode").textContent = profile.connectionMode;
  bioCount.textContent = String(profile.bio.length);
  savedIndicator.hidden = true;
  message.textContent = "";
  message.className = "form-message";
}

function showMessage(text, type) {
  message.textContent = text;
  message.className = `form-message ${type}`;
}

function loadProfile() {
  let savedProfile;
  try {
    savedProfile = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch (error) {
    console.warn("Could not read the saved profile.", error);
    return;
  }
  if (!savedProfile || typeof savedProfile !== "object") return;

  fields.fullName.value = savedProfile.fullName || "";
  fields.school.value = savedProfile.school || "";
  fields.academicYear.value = savedProfile.academicYear || "";
  fields.major.value = savedProfile.major || "";
  fields.location.value = savedProfile.location || "";
  fields.bio.value = savedProfile.bio || "";

  const savedSubjects = Array.isArray(savedProfile.subjects) ? savedProfile.subjects : [];
  subjectsList.querySelectorAll(".subject-option").forEach((item) => {
    const savedSubject = savedSubjects.find((subject) => subject.name === item.dataset.subject);
    if (!savedSubject) return;
    item.querySelector('input[type="checkbox"]').checked = true;
    item.classList.add("selected");
    item.querySelector("select").value = savedSubject.level || "Intermediate";
  });

  const savedGoals = Array.isArray(savedProfile.goals) ? savedProfile.goals : [];
  form.querySelectorAll('input[name="goals"]').forEach((input) => {
    input.checked = savedGoals.includes(input.value);
  });

  const mode = savedProfile.connectionMode || "In person";
  const modeInput = form.querySelector(`input[name="connectionMode"][value="${CSS.escape(mode)}"]`);
  if (modeInput) modeInput.checked = true;

  updatePreview();
  savedIndicator.hidden = false;
  savedIndicator.textContent = "✓ Your saved profile was loaded from this browser";
}

form.addEventListener("input", updatePreview);
form.addEventListener("change", updatePreview);

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!form.reportValidity()) {
    showMessage("Please fill in the required fields before saving.", "error");
    return;
  }

  const profile = getProfileFromForm();

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    showMessage("Your profile has been saved in this browser.", "success");
    savedIndicator.hidden = false;
    savedIndicator.textContent = "✓ Profile saved in this browser";
  } catch (error) {
    console.error("Could not save profile.", error);
    showMessage("The profile could not be saved. Check your browser storage settings.", "error");
  }
});

document.querySelector("#reset-button").addEventListener("click", () => {
  const confirmed = window.confirm("Clear the form? This will also remove the saved profile from this browser.");
  if (!confirmed) return;

  form.reset();
  subjectsList.querySelectorAll(".subject-option").forEach((item) => {
    item.classList.remove("selected");
    item.querySelector('input[type="checkbox"]').checked = false;
    item.querySelector("select").value = "Intermediate";
  });

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Could not remove the saved profile.", error);
  }

  updatePreview();
  showMessage("The form has been cleared.", "success");
});

makeSubjectOptions();
loadProfile();
updatePreview();
