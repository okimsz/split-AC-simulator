window.addEventListener("error", function (event) {
  if (document.getElementById("startupError")) return;
  var panel = document.createElement("div");
  panel.id = "startupError";
  panel.className = "error";
  panel.setAttribute("role", "alert");
  panel.textContent =
    "The simulator could not start or continue: " +
    (event.message || "Unknown browser error") +
    ". Open the complete split-ac-simulator.html file in a WebGL-enabled browser. If this continues, share this message.";
  document.getElementById("viewport").appendChild(panel);
});
