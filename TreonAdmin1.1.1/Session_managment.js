// Session_managment.js

// Example of basic interaction
document.querySelectorAll(".nav-button").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-button").forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");
  });
});
