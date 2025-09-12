document.addEventListener('DOMContentLoaded', () => {
  const appNameInput = document.getElementById('app-name');
  const taglineInput = document.getElementById('tagline');
  const descriptionInput = document.getElementById('description');
  const logoInput = document.getElementById('logo-input');
  const logoPreview = document.getElementById('logo-preview');
  const primaryColorInput = document.getElementById('primary-color');
  const secondaryColorInput = document.getElementById('secondary-color');
  const timeoutInput = document.getElementById('timeout');
  const maxProductsInput = document.getElementById('max-products');

  // Load settings
  const savedSettings = JSON.parse(localStorage.getItem('settings'));
  if (savedSettings) {
    appNameInput.value = savedSettings.appName || '';
    taglineInput.value = savedSettings.tagline || '';
    descriptionInput.value = savedSettings.description || '';
    logoPreview.src = savedSettings.logo || 'https://i.imgur.com/3ZQ3Z3H.png';
    primaryColorInput.value = savedSettings.primaryColor || '#f1435e';
    secondaryColorInput.value = savedSettings.secondaryColor || '#ffb424';
    timeoutInput.value = savedSettings.timeout || 30;
    maxProductsInput.value = savedSettings.maxProducts || 12;

    logoPreview.style.backgroundColor = savedSettings.primaryColor;
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

  document.querySelector('.save-btn').addEventListener('click', () => {
    const settings = {
      appName: appNameInput.value,
      tagline: taglineInput.value,
      description: descriptionInput.value,
      logo: logoPreview.src,
      primaryColor: primaryColorInput.value,
      secondaryColor: secondaryColorInput.value,
      timeout: timeoutInput.value,
      maxProducts: maxProductsInput.value
    };

    localStorage.setItem('settings', JSON.stringify(settings));
    alert('Settings saved successfully!');
  });
});
