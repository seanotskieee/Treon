import { db } from './firebase-init.js';
import { 
  doc, 
  setDoc, 
  getDoc 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { monitorAuthState } from './auth-service.js';

document.addEventListener('DOMContentLoaded', () => {
  // Authentication check
  monitorAuthState((user) => {
    if (!user) {
      window.location.href = "Login.html";
      return;
    }
    
    // Load settings for the current user
    loadSettings(user.uid);
  });
  
  // Navigation functionality
  document.getElementById("dashboard-btn").addEventListener("click", () => {
    window.location.href = "dashboard.html";
  });
  
  document.getElementById("sessions-btn").addEventListener("click", () => {
    window.location.href = "Session_managment.html";
  });
  
  document.getElementById("products-btn").addEventListener("click", () => {
    window.location.href = "product_management.html";
  });
  
  // Active button highlight
  document.querySelectorAll(".nav-button").forEach(button => {
    button.addEventListener("click", function() {
      document.querySelectorAll(".nav-button").forEach(btn => {
        btn.classList.remove("active");
      });
      this.classList.add("active");
    });
  });

  const appNameInput = document.getElementById('app-name');
  const taglineInput = document.getElementById('tagline');
  const descriptionInput = document.getElementById('description');
  const logoInput = document.getElementById('logo-input');
  const logoPreview = document.getElementById('logo-preview');
  const primaryColorInput = document.getElementById('primary-color');
  const secondaryColorInput = document.getElementById('secondary-color');

  // Load settings from Firestore
  async function loadSettings(userId) {
    try {
      const docRef = doc(db, "settings", userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const savedSettings = docSnap.data();
        appNameInput.value = savedSettings.appName || '';
        taglineInput.value = savedSettings.tagline || '';
        descriptionInput.value = savedSettings.description || '';
        logoPreview.src = savedSettings.logo || 'https://via.placeholder.com/40x40/9c27b0/ffffff?text=T';
        primaryColorInput.value = savedSettings.primaryColor || '#9c27b0';
        secondaryColorInput.value = savedSettings.secondaryColor || '#ff9800';

        logoPreview.style.backgroundColor = savedSettings.primaryColor;
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  }

  logoInput.addEventListener('change', () => {
    const file = logoInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        logoPreview.src = reader.result;

        // Suggest new theme colors
        const newPrimary = '#007BFF';
        const newSecondary = '#FFC107';
        primaryColorInput.value = newPrimary;
        secondaryColorInput.value = newSecondary;
        logoPreview.style.backgroundColor = newPrimary;
      };
      reader.readAsDataURL(file);
    }
  });

  document.querySelector('.save-btn').addEventListener('click', async () => {
    try {
      const user = await new Promise((resolve) => {
        monitorAuthState((user) => {
          if (user) resolve(user);
        });
      });
      
      const settings = {
        appName: appNameInput.value,
        tagline: taglineInput.value,
        description: descriptionInput.value,
        logo: logoPreview.src,
        primaryColor: primaryColorInput.value,
        secondaryColor: secondaryColorInput.value,
        userId: user.uid,
        updatedAt: new Date()
      };

      // Save to Firestore
      await setDoc(doc(db, "settings", user.uid), settings);
      alert('Theme settings saved successfully!');
    } catch (error) {
      console.error("Error saving settings:", error);
      alert('Error saving settings: ' + error.message);
    }
  });
});