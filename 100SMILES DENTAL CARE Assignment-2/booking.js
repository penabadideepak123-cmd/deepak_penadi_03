// booking.js
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("booking-form");
  const errorBox = document.getElementById("form-errors");
  const successBox = document.getElementById("form-success");

  if (!form) return;

  form.addEventListener("submit", function (event) {
    // Clear previous messages
    errorBox.innerHTML = "";
    errorBox.classList.remove("has-errors");
    if (successBox) {
      successBox.textContent = "";
      successBox.classList.remove("show-success");
    }

    const errors = [];
    let firstErrorField = null; // to scroll/focus to first problem

    const nameField = form.name;
    const emailField = form.email;
    const phoneField = form.phone;
    const serviceField = form.service;
    const dateField = form.date;
    const timeFieldChecked = form.querySelector("input[name='time']:checked");

    const name = nameField.value.trim();
    const email = emailField.value.trim();
    const phone = phoneField.value.trim();
    const service = serviceField.value;
    const dateValue = dateField.value;

    // Name
    if (!name) {
      errors.push("Please enter your full name.");
      if (!firstErrorField) firstErrorField = nameField;
    }

    // Email (simple pattern)
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      errors.push("Please enter your email address.");
      if (!firstErrorField) firstErrorField = emailField;
    } else if (!emailPattern.test(email)) {
      errors.push("Please enter a valid email address.");
      if (!firstErrorField) firstErrorField = emailField;
    }

    // Phone: at least 8 digits
    const digitsOnly = phone.replace(/\D/g, "");
    if (!phone) {
      errors.push("Please enter your phone number.");
      if (!firstErrorField) firstErrorField = phoneField;
    } else if (digitsOnly.length < 8) {
      errors.push("Phone number should contain at least 8 digits.");
      if (!firstErrorField) firstErrorField = phoneField;
    }

    // Service
    if (!service) {
      errors.push("Please select a requested service.");
      if (!firstErrorField) firstErrorField = serviceField;
    }

    // Date: not in the past
    if (!dateValue) {
      errors.push("Please choose a preferred date.");
      if (!firstErrorField) firstErrorField = dateField;
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const chosenDate = new Date(dateValue);
      if (chosenDate < today) {
        errors.push("Preferred date cannot be in the past.");
        if (!firstErrorField) firstErrorField = dateField;
      }
    }

    // Time of day
    if (!timeFieldChecked) {
      errors.push("Please choose a preferred time of day.");
      if (!firstErrorField) {
        // focus the first radio in the group
        const firstTimeRadio = form.querySelector("input[name='time']");
        if (firstTimeRadio) firstErrorField = firstTimeRadio;
      }
    }

    // If there are errors, stop submit and show list
    if (errors.length > 0) {
      event.preventDefault();

      const list = document.createElement("ul");
      errors.forEach(function (message) {
        const li = document.createElement("li");
        li.textContent = message;
        list.appendChild(li);
      });

      errorBox.appendChild(list);
      errorBox.classList.add("has-errors");

      // 👉 Scroll page to the error box and focus first error field
      errorBox.scrollIntoView({ behavior: "smooth", block: "start" });
      if (firstErrorField && typeof firstErrorField.focus === "function") {
        firstErrorField.focus();
      }

      return;
    }

    // No errors: prevent real submit (demo site) and show success popup
    event.preventDefault();

    if (successBox) {
      successBox.textContent =
        "Your booking request has been submitted (demo only).";
      successBox.classList.add("show-success");
      successBox.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // Show custom popup instead of alert
    const modal = document.getElementById("successModal");
    modal.style.display = "flex";

    // Close modal
    document.getElementById("closeModal").onclick = () => {
    modal.style.display = "none";
    };

    // Optional: click outside to close
    modal.onclick = (e) => {
    if (e.target === modal) modal.style.display = "none";
    };

    form.reset();

  });
});
