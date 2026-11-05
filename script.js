// Profiles are stored in Supabase and linked to the signed-in user's ID.
const config = window.MEET_A_SCIENTIST_CONFIG || {};
const isConfigured = Boolean(config.supabaseUrl && config.supabaseAnonKey && window.supabase);
const db = isConfigured ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey) : null;
let currentUser = null;
let authMode = "signup";
const authPanel = document.querySelector("#auth-panel");
const authForm = document.querySelector("#auth-form");
const authMessage = document.querySelector("#auth-message");
const profileSection = document.querySelector("#profile-section");
const logoutButton = document.querySelector("#logout-button");
const accountStatus = document.querySelector("#account-status");

function authNotice(text, type = "error") {
  authMessage.textContent = text;
  authMessage.className = `form-message ${type}`;
}
function setAuthMode(mode) {
  authMode = mode;
  const signup = mode === "signup";
  document.querySelector("#signup-tab").classList.toggle("active", signup);
  document.querySelector("#login-tab").classList.toggle("active", !signup);
  document.querySelector("#signup-tab").setAttribute("aria-pressed", String(signup));
  document.querySelector("#login-tab").setAttribute("aria-pressed", String(!signup));
  for (const id of ["account-name-field", "account-role-field"]) document.getElementById(id).hidden = !signup;
  document.getElementById("account-name").required = signup;
  document.getElementById("account-role").required = signup;
  document.getElementById("account-password").autocomplete = signup ? "new-password" : "current-password";
  document.getElementById("auth-submit").textContent = signup ? "Create account" : "Log in";
  document.getElementById("auth-title").textContent = signup ? "Create an account" : "Welcome back";
  authNotice("", "success");
}
document.getElementById("signup-tab").addEventListener("click", () => setAuthMode("signup"));
document.getElementById("login-tab").addEventListener("click", () => setAuthMode("login"));
authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!db) return authNotice("Set up Supabase in config.js first. See SETUP.md.");
  if (!authForm.reportValidity()) return;
  const email = document.getElementById("account-email").value.trim();
  const password = document.getElementById("account-password").value;
  const submit = document.getElementById("auth-submit");
  submit.disabled = true;
  try {
    if (authMode === "signup") {
      const name = document.getElementById("account-name").value.trim();
      const role = document.getElementById("account-role").value;
      const { data, error } = await db.auth.signUp({ email, password, options: { data: { full_name: name, role } } });
      if (error) throw error;
      if (!data.session) authNotice("Account created! Check your email to confirm it, then log in.", "success");
      else await applySession(data.session);
    } else {
      const { data, error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await applySession(data.session);
    }
    document.getElementById("account-password").value = "";
  } catch (error) { authNotice(error.message || "Something went wrong. Please try again."); }
  finally { submit.disabled = false; }
});
logoutButton.addEventListener("click", async () => {
  const { error } = await db.auth.signOut();
  if (error) return authNotice(error.message);
  await applySession(null);
});

function resetProfileFields() {
  form.reset();
  subjectsList.querySelectorAll(".subject-option").forEach(item => {
    item.classList.remove("selected");
    item.querySelector('input[type="checkbox"]').checked = false;
    item.querySelector("select").value = "Intermediate";
  });
  updatePreview();
}
async function applySession(session) {
  currentUser = session?.user || null;
  authPanel.hidden = Boolean(currentUser);
  profileSection.hidden = !currentUser;
  accountStatus.hidden = !currentUser;
  logoutButton.hidden = !currentUser;
  resetProfileFields();
  if (currentUser) {
    accountStatus.textContent = `Signed in as ${currentUser.email}`;
    fields.fullName.value = currentUser.user_metadata?.full_name || "";
    await loadProfile();
    updatePreview();
  }
}


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

async function loadProfile() {
  if (!currentUser) return;
  const { data: row, error } = await db.from("profiles").select("profile").eq("id", currentUser.id).maybeSingle();
  if (error) { showMessage(`Could not load profile: ${error.message}`, "error"); return; }
  const savedProfile = row?.profile;
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
  savedIndicator.textContent = "✓ Your account profile was loaded";
}

form.addEventListener("input", updatePreview);
form.addEventListener("change", updatePreview);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) return showMessage("Log in to save your profile.", "error");
  if (!form.reportValidity()) return showMessage("Please fill in the required fields.", "error");
  const profile = getProfileFromForm();
  const { error } = await db.from("profiles").upsert({ id: currentUser.id, profile, updated_at: new Date().toISOString() });
  if (error) return showMessage(`Could not save profile: ${error.message}`, "error");
  showMessage("Your profile was saved to your account!", "success");
  savedIndicator.hidden = false;
  savedIndicator.textContent = "✓ Profile saved to your account";
});

document.querySelector("#reset-button").addEventListener("click", () => {
  if (!window.confirm("Clear the form? Your saved account profile will stay unchanged until you save again.")) return;
  resetProfileFields();
  showMessage("Form cleared. Click Save my profile to update your account.", "success");
});

makeSubjectOptions();
if (!db) authNotice("To enable accounts, add your Supabase project URL and publishable/anon key in config.js. See SETUP.md.");
else {
  db.auth.getSession().then(({ data, error }) => {
    if (error) authNotice(error.message);
    else applySession(data.session);
  });
  db.auth.onAuthStateChange((_event, session) => {
    // Avoid additional Supabase calls synchronously inside this callback.
    if ((session?.user?.id || null) !== (currentUser?.id || null)) setTimeout(() => applySession(session), 0);
  });
}
