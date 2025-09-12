// JavaScript logic for dashboard

function logout() {
  localStorage.removeItem("isLoggedIn");
  window.location.href = "Login.html";
}

console.log("Dashboard loaded");
