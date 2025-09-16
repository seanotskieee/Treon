import { signUp, signIn, monitorAuthState } from './auth-service.js';

// Make functions global for HTML onclick attributes
window.toggleVisibility = toggleVisibility;
window.showLogin = showLogin;
window.showRegister = showRegister;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;

document.addEventListener('DOMContentLoaded', () => {
  showLogin();
  
  // Check if user is already logged in
  monitorAuthState((user) => {
    if (user) {
      sessionStorage.setItem("isLoggedIn", "true");
      sessionStorage.setItem("userEmail", user.email);
      window.location.href = "dashboard.html";
    }
  });
  
  // Add event listeners
  const loginBtn = document.getElementById("login-btn");
  const registerBtn = document.getElementById("register-btn");
  
  if (loginBtn) {
    loginBtn.addEventListener("click", handleLogin);
  }
  
  if (registerBtn) {
    registerBtn.addEventListener("click", handleRegister);
  }
});

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
  const loginForm = document.getElementById("login");
  const registerForm = document.getElementById("register");
  
  if (loginForm && registerForm) {
    loginForm.classList.add("active");
    registerForm.classList.remove("active");
  }
}

function showRegister() {
  const loginForm = document.getElementById("login");
  const registerForm = document.getElementById("register");
  
  if (loginForm && registerForm) {
    registerForm.classList.add("active");
    loginForm.classList.remove("active");
  }
}

async function handleLogin() {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-pass").value;
  
  if (!email || !password) {
    alert("Please enter both email and password");
    return;
  }
  
  // Show loading state
  const loginBtn = document.getElementById("login-btn");
  const originalText = loginBtn.textContent;
  loginBtn.textContent = "Signing in...";
  loginBtn.disabled = true;
  
  const result = await signIn(email, password);
  
  // Restore button state
  loginBtn.textContent = originalText;
  loginBtn.disabled = false;
  
  if (result.success) {
    sessionStorage.setItem("isLoggedIn", "true");
    sessionStorage.setItem("userEmail", email);
    window.location.href = "dashboard.html";
  } else {
    alert("Login failed: " + result.error);
  }
}

async function handleRegister() {
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-pass").value;
  const confirm = document.getElementById("reg-confirm").value;
  
  if (!email || !password || !confirm) {
    alert("Please fill all fields");
    return;
  }
  
  if (password !== confirm) {
    alert("Passwords don't match!");
    return;
  }
  
  if (password.length < 6) {
    alert("Password should be at least 6 characters long");
    return;
  }
  
  // Show loading state
  const registerBtn = document.getElementById("register-btn");
  const originalText = registerBtn.textContent;
  registerBtn.textContent = "Creating account...";
  registerBtn.disabled = true;
  
  const result = await signUp(email, password);
  
  // Restore button state
  registerBtn.textContent = originalText;
  registerBtn.disabled = false;
  
  if (result.success) {
    alert("Account created successfully! Redirecting to login...");
    showLogin();
    
    // Clear registration form
    document.getElementById("reg-email").value = "";
    document.getElementById("reg-pass").value = "";
    document.getElementById("reg-confirm").value = "";
  } else {
    alert("Registration failed: " + result.error);
  }
}