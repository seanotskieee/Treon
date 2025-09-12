window.onload = () => {
  showLogin();
  
  // Add event listeners
  document.getElementById("login-btn").addEventListener("click", handleLogin);
  document.getElementById("register-btn").addEventListener("click", handleRegister);
};

function toggleVisibility(id, el) {
  const input = document.getElementById(id);
  if (input.type === "password") {
    input.type = "text";
    el.classList.remove("fa-eye");
    el.classList.add("fa-eye-slash");
  } else {
    input.type = "password";
    el.classList.remove("fa-eye-slash");
    el.classList.add("fa-eye");
  }
}

function showLogin() {
  document.getElementById("login").classList.add("active");
  document.getElementById("register").classList.remove("active");
}

function showRegister() {
  document.getElementById("register").classList.add("active");
  document.getElementById("login").classList.remove("active");
}

function handleLogin() {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-pass").value;
  
  if (email === "admin@treon.com" && password === "admin123") {
    // Store login state in session storage
    sessionStorage.setItem("isLoggedIn", "true");
    window.location.href = "dashboard.html";
  } else {
    alert("Invalid credentials. Use:\nEmail: admin@treon.com\nPassword: admin123");
  }
}

function handleRegister() {
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-pass").value;
  const confirm = document.getElementById("reg-confirm").value;
  
  if (!email || !password) {
    alert("Please fill all fields");
    return;
  }
  
  if (password !== confirm) {
    alert("Passwords don't match!");
    return;
  }
  
  alert("Account created successfully! Redirecting to login...");
  showLogin();
  
  // Clear registration form
  document.getElementById("reg-email").value = "";
  document.getElementById("reg-pass").value = "";
  document.getElementById("reg-confirm").value = "";
}