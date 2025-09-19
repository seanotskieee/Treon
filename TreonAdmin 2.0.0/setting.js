document.addEventListener('DOMContentLoaded', () => {
  const appNameInput = document.getElementById('app-name');
  const taglineInput = document.getElementById('tagline');
  const descriptionInput = document.getElementById('description');
  const logoInput = document.getElementById('logo-input');
  const logoPreview = document.getElementById('logo-preview');
  const primaryColorInput = document.getElementById('primary-color');
  const secondaryColorInput = document.getElementById('secondary-color');

  // Load settings from Firebase
  db.collection("settings").doc("general").get()
    .then((doc) => {
      if (doc.exists) {
        const savedSettings = doc.data();
        appNameInput.value = savedSettings.appName || '';
        taglineInput.value = savedSettings.tagline || '';
        descriptionInput.value = savedSettings.description || '';
        logoPreview.src = savedSettings.logo || 'https://via.placeholder.com/40x40/9c27b0/ffffff?text=T';
        primaryColorInput.value = savedSettings.primaryColor || '#9c27b0';
        secondaryColorInput.value = savedSettings.secondaryColor || '#ff9800';

        logoPreview.style.backgroundColor = savedSettings.primaryColor;
      }
    })
    .catch((error) => {
      console.error("Error getting settings:", error);
    });

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

  document.querySelector('.save-btn').addEventListener('click', () => {
    const settings = {
      appName: appNameInput.value,
      tagline: taglineInput.value,
      description: descriptionInput.value,
      logo: logoPreview.src,
      primaryColor: primaryColorInput.value,
      secondaryColor: secondaryColorInput.value,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Save to Firebase
    db.collection("settings").doc("general").set(settings)
      .then(() => {
        alert('Theme settings saved successfully!');
      })
      .catch((error) => {
        console.error("Error saving settings:", error);
        alert('Error saving settings. Please try again.');
      });
  });
});