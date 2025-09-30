document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('video');
  const captureBtn = document.getElementById('captureButton');

  setupSimpleScroll('.brand-scroll');
  setupSimpleScroll('.color-scroll');
  setupModalEvents();

  // Initially hide rating section
  const ratingBox = document.getElementById('ratingBox');
  const rateLabel = document.getElementById('rate-label');
  if (ratingBox) ratingBox.style.display = 'none';
  if (rateLabel) rateLabel.style.display = 'none';

  // Rating stars setup - will be enabled when products are available
  const stars = document.querySelectorAll('.rating-container .star');
  stars.forEach(star => {
    star.addEventListener('click', () => {
      if (!productsAvailable) return;
      
      const value = star.dataset.value;
      const shadeBtn = document.querySelector('.color-btn.active');
      const shadeId = shadeBtn ? shadeBtn.dataset.color : null;
      const brand = getCurrentBrand();

      stars.forEach(s => {
        if (s.dataset.value <= value) {
          s.classList.add('selected');
          s.textContent = "★";
        } else {
          s.classList.remove('selected');
          s.textContent = "☆";
        }
      });

      if (shadeId) {
        fetch('/rate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            shade_id: shadeId, 
            rating: value, 
            user_id: currentUserId,
            brand: brand
          })
        })
        .then(res => res.json())
        .then(data => console.log("✅ Rating saved:", data))
        .catch(err => console.error("❌ Rating error:", err));
      }
    });
  });

  // 📸 Capture + Preview Modal
  const previewModal = document.getElementById('capturePreviewModal');
  const previewImage = document.getElementById('previewImage');
  const closePreview = document.getElementById('closePreview');
  const previewOk = document.getElementById('previewOk');

  if (captureBtn) {
    captureBtn.addEventListener('click', () => {
      const brand = productsAvailable ? getCurrentBrand() : "No Brand";
      fetch('/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: currentUserId,
          brand: brand
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data.status === "success") {
            console.log("✅ Image saved at:", data.lipstick_path);
            previewImage.src = data.lipstick_path;
            previewModal.classList.remove("hidden");
          } else {
            alert("❌ Failed to capture image: " + data.message);
          }
        })
        .catch(err => {
          console.error("⚠️ Error while capturing image:", err);
          alert("⚠️ Error while capturing image.");
        });
    });
  }

  if (closePreview) {
    closePreview.addEventListener("click", () => {
      previewModal.classList.add("hidden");
    });
  }

  if (previewOk) {
    previewOk.addEventListener("click", () => {
      previewModal.classList.add("hidden");
    });
  }
});

// Global variables for dynamic products
let dynamicProducts = {};
let currentUserId = null;
let sessionEnded = false;
let modalInitialized = false;
let productsAvailable = false;

// Load products from backend API
async function loadProductsFromAPI() {
  try {
    const response = await fetch('/api/products');
    const data = await response.json();
    
    if (data.status === "success") {
      dynamicProducts = {};
      
      // Check if we have products with colors
      const hasProducts = data.data && data.data.length > 0;
      const hasColors = hasProducts && data.data.some(brand => brand.colors && brand.colors.length > 0);
      
      productsAvailable = hasProducts && hasColors;
      
      if (productsAvailable) {
        // Organize products by brand name (lowercase for consistency)
        data.data.forEach(brandData => {
          if (brandData.colors && brandData.colors.length > 0) {
            const brandName = brandData.brand.toLowerCase();
            dynamicProducts[brandName] = {
              brand: brandData.brand,
              colors: brandData.colors.map((color, index) => ({
                name: color.name,
                id: color.id || index + 1,
                hex: color.hex || color.colorHex || '#cccccc',
                colorHex: color.colorHex || color.hex || '#cccccc'
              }))
            };
          }
        });
        
        console.log("✅ Loaded products:", Object.keys(dynamicProducts));
        showProductSelectors();
        populateBrandButtons();
        
        // Debug: Log color values for verification
        debugColorValues();
      } else {
        showNoProductsMessage();
        hideProductSelectors();
      }
      
      return true;
    } else {
      throw new Error(data.message || "Failed to load products");
    }
  } catch (error) {
    console.error("❌ Error loading products:", error);
    // Fallback to no products if API fails
    setupNoProducts();
    return false;
  }
}

// Debug function to check color values
function debugColorValues() {
  console.log("=== COLOR DEBUG ===");
  Object.values(dynamicProducts).forEach(brandData => {
    console.log(`Brand: ${brandData.brand}`);
    brandData.colors.forEach((color, index) => {
      console.log(`  ${index + 1}. ${color.name}:`, {
        id: color.id,
        hex: color.hex,
        colorHex: color.colorHex,
        displayColor: color.hex || color.colorHex || '#cccccc'
      });
    });
  });
  console.log("===================");
}

// Show product selectors when products are available
function showProductSelectors() {
  const tryonScreen = document.getElementById('tryon');
  if (tryonScreen) {
    tryonScreen.classList.add('products-available');
  }
  
  // Show rating section
  const ratingBox = document.getElementById('ratingBox');
  const rateLabel = document.getElementById('rate-label');
  if (ratingBox) ratingBox.style.display = 'flex';
  if (rateLabel) rateLabel.style.display = 'block';
}

// Hide product selectors when no products are available
function hideProductSelectors() {
  const tryonScreen = document.getElementById('tryon');
  if (tryonScreen) {
    tryonScreen.classList.remove('products-available');
  }
  
  // Hide rating section
  const ratingBox = document.getElementById('ratingBox');
  const rateLabel = document.getElementById('rate-label');
  if (ratingBox) ratingBox.style.display = 'none';
  if (rateLabel) rateLabel.style.display = 'none';
}

// Show message when no products are available
function showNoProductsMessage() {
  const videoContainer = document.querySelector('.video-container');
  if (!videoContainer) return;
  
  // Remove existing message if any
  const existingMessage = document.getElementById('no-products-message');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  const messageDiv = document.createElement('div');
  messageDiv.id = 'no-products-message';
  messageDiv.className = 'no-products-message';
  messageDiv.innerHTML = `
    <h3 style="color: #cc6ff8; margin-bottom: 10px;">No Products Available</h3>
    <p style="color: #333; margin-bottom: 15px;">
      Please add products through the admin panel first.
    </p>
    <button onclick="goToSplash()" style="
      background: #cc6ff8;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      cursor: pointer;
      font-weight: bold;
    ">Return to Home</button>
  `;
  
  videoContainer.style.position = 'relative';
  videoContainer.appendChild(messageDiv);
}

// Remove no products message
function removeNoProductsMessage() {
  const existingMessage = document.getElementById('no-products-message');
  if (existingMessage) {
    existingMessage.remove();
  }
}

// Setup when no products are available
function setupNoProducts() {
  dynamicProducts = {};
  productsAvailable = false;
  hideProductSelectors();
  showNoProductsMessage();
}

// Populate brand buttons dynamically
function populateBrandButtons() {
  const brandScroll = document.querySelector('.brand-scroll .scroll-row');
  if (!brandScroll) return;
  
  brandScroll.innerHTML = '';
  
  Object.values(dynamicProducts).forEach(brandData => {
    const brandBtn = document.createElement('div');
    brandBtn.className = 'scroll-item brand-btn';
    brandBtn.textContent = brandData.brand;
    brandBtn.addEventListener('click', () => selectBrand(brandData.brand));
    brandScroll.appendChild(brandBtn);
  });
  
  // Select first brand by default if available
  const firstBrand = Object.values(dynamicProducts)[0];
  if (firstBrand) {
    selectBrand(firstBrand.brand);
  }
}

// Select brand and load its shades
function selectBrand(brandName) {
  if (!productsAvailable) return;
  
  const brandKey = brandName.toLowerCase();
  const brandData = dynamicProducts[brandKey];
  
  if (!brandData) return;
  
  // Update active state
  document.querySelectorAll('.brand-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent.trim() === brandData.brand) {
      btn.classList.add('active');
    }
  });
  
  loadShadesForBrand(brandData);
}

// Load shades for selected brand - UPDATED for proper color display
function loadShadesForBrand(brandData) {
  if (!productsAvailable) return;
  
  const scrollRow = document.querySelector('.color-scroll .scroll-row');
  if (!scrollRow) return;

  scrollRow.innerHTML = '';
  resetStars();

  brandData.colors.forEach(shade => {
    const item = document.createElement('div');
    item.className = 'scroll-item color-btn';
    item.dataset.color = shade.id;

    // Create color circle - FIXED: Use admin-provided hex color
    const colorCircle = document.createElement('div');
    colorCircle.className = 'color-circle';
    
    // Use the hex value from admin, fallback to colorHex, then default
    const displayColor = shade.hex || shade.colorHex || '#cccccc';
    colorCircle.style.backgroundColor = displayColor;
    
    // Create shade name
    const shadeName = document.createElement('div');
    shadeName.className = 'shade-name';
    shadeName.textContent = shade.name;

    // Append elements
    item.appendChild(colorCircle);
    item.appendChild(shadeName);

    item.addEventListener('click', () => {
      document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active'));
      item.classList.add('active');
      
      // Use the numeric ID for lipstick application
      fetch(`/set_color/${shade.id}`);
      resetStars();
      logShade(shade.id);
    });
    
    scrollRow.appendChild(item);
  });
  
  // Auto-select first shade
  if (brandData.colors.length > 0) {
    const firstShade = scrollRow.querySelector('.color-btn');
    if (firstShade) {
      firstShade.click();
    }
  }
}

// Get current brand name
function getCurrentBrand() {
  if (!productsAvailable) return "No Brand";
  
  const activeBrandBtn = document.querySelector('.brand-btn.active');
  return activeBrandBtn ? activeBrandBtn.textContent.trim() : "Unknown";
}

/* ⭐ Reset stars */
function resetStars() {
  if (!productsAvailable) return;
  
  document.querySelectorAll('.rating-container .star').forEach(star => {
    star.classList.remove('selected');
    star.textContent = "☆";
  });
}

/* Enhanced Horizontal Scroll with Drag */
function setupSimpleScroll(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  let isDragging = false;
  let startX, scrollLeft;

  container.addEventListener('mousedown', (e) => {
    isDragging = true;
    container.classList.add('dragging');
    startX = e.pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
    document.body.style.cursor = 'grabbing';
  });

  container.addEventListener('mouseleave', () => {
    if (isDragging) {
      isDragging = false;
      container.classList.remove('dragging');
      document.body.style.cursor = '';
    }
  });

  container.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      container.classList.remove('dragging');
      document.body.style.cursor = '';
    }
  });

  container.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 1.5;
    container.scrollLeft = scrollLeft - walk;
  });

  // Touch events for mobile
  container.addEventListener('touchstart', (e) => {
    isDragging = true;
    container.classList.add('dragging');
    startX = e.touches[0].pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
  });

  container.addEventListener('touchend', () => {
    isDragging = false;
    container.classList.remove('dragging');
  });

  container.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const x = e.touches[0].pageX - container.offsetLeft;
    const walk = (x - startX) * 1.5;
    container.scrollLeft = scrollLeft - walk;
  });

  // Mouse wheel scrolling
  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    container.scrollLeft += e.deltaY;
  }, { passive: false });
}

function setupModalEvents() {
  const doneButton = document.querySelector('.done-button');
  const modal = document.getElementById('confirmModal');
  const yesBtn = document.getElementById('confirmYes');
  const cancelBtn = document.getElementById('confirmCancel');

  if (!doneButton || !modal || !yesBtn || !cancelBtn) return;

  doneButton.addEventListener('click', () => {
    modal.classList.remove('hidden');
  });

  cancelBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  yesBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    goToPrivacy();
  });
}

// Function to reset the try-on screen
function resetTryOnScreen() {
  removeNoProductsMessage();
  loadProductsFromAPI(); // Reload products each time try-on screen opens
}

/* 🌟 Feedback Stars */
const fstars = document.querySelectorAll(".fstar");
fstars.forEach((star, index) => {
  star.addEventListener("click", () => {
    fstars.forEach((s, i) => {
      if (i <= index) {
        s.classList.add("selected");
        s.textContent = "★";
      } else {
        s.classList.remove("selected");
        s.textContent = "☆";
      }
    });
  });
});

function resetFeedbackForm() {
  document.querySelectorAll(".fstar").forEach(s => {
    s.classList.remove("selected");
    s.textContent = "☆";
  });
  const feedbackBox = document.getElementById("feedback-text");
  if (feedbackBox) feedbackBox.value = "";
}

function resetSession() {
  if (currentUserId) {
    console.log("Session reset locally for user:", currentUserId);
  }
  currentUserId = null;
  sessionEnded = false;
}

function goToSplash() {
  resetSession();
  document.getElementById('privacy').classList.add('hidden-section');
  document.getElementById('tryon').classList.add('hidden-section');
  document.getElementById('splash').classList.remove('hidden-section');
  document.getElementById('feedback').classList.add('hidden-section');
}

function goToSplashFromFeedback() {
  resetFeedbackForm();
  document.getElementById("feedback").classList.add("hidden-section");
  document.getElementById("splash").classList.remove("hidden-section");
}

/* 🌟 Feedback buttons */
document.getElementById("submitFeedback")?.addEventListener("click", () => {
  const rating = document.querySelectorAll(".fstar.selected").length;
  const feedbackText = document.getElementById("feedback-text").value;

  fetch('/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: currentUserId,
      feedback_rating: rating,
      feedback_text: feedbackText
    })
  })
  .then(res => res.json().catch(() => ({})))
  .then(data => {
    console.log("✅ Feedback saved:", data);

    if (currentUserId && !sessionEnded) {
      sessionEnded = true;
      return fetch('/end_session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUserId })
      }).then(res => res.json().catch(() => ({})));
    }
    return Promise.resolve({});
  })
  .then(endResp => {
    console.log("🛑 Session ended (after feedback):", endResp);
    resetFeedbackForm();
    goToSplashFromFeedback();
  })
  .catch(err => {
    console.error("❌ Feedback error:", err);
    resetFeedbackForm();
    goToSplashFromFeedback();
  });
});

document.getElementById("skipFeedback")?.addEventListener("click", () => {
  if (currentUserId && !sessionEnded) {
    sessionEnded = true;
    fetch('/end_session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUserId })
    })
    .then(res => res.json().catch(() => ({})))
    .then(data => {
      console.log("🛑 Session ended (skipped feedback):", data);
      resetFeedbackForm();
      goToSplashFromFeedback();
    })
    .catch(err => {
      console.error("❌ End session error on skip:", err);
      resetFeedbackForm();
      goToSplashFromFeedback();
    });
  } else {
    resetFeedbackForm();
    goToSplashFromFeedback();
  }
});

// Start session when Try-On screen opens
function goToTryOn() {
  document.getElementById('splash').classList.add('hidden-section');
  document.getElementById('privacy').classList.add('hidden-section');
  document.getElementById('feedback').classList.add('hidden-section');
  document.getElementById('tryon').classList.remove('hidden-section');
  resetTryOnScreen();
  
  modalInitialized = false;
  setupModalEvents();

  fetch('/start_session', { method: 'POST' })
    .then(res => res.json())
    .then(data => {
      currentUserId = data.user_id;
      sessionEnded = false;
      console.log("🎬 Session started for", currentUserId);
    });
}

// Update logShade function to include brand
function logShade(shadeId) {
  if (!currentUserId || !productsAvailable) return;
  const brand = getCurrentBrand();
  fetch('/log_shade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      user_id: currentUserId, 
      shade_id: shadeId,
      brand: brand
    })
  }).then(res => res.json())
    .then(data => console.log("💄 Shade logged:", data));
}

// End session when entering Privacy
function goToPrivacy() {
  document.getElementById('tryon').classList.add('hidden-section');
  document.getElementById('privacy').classList.remove('hidden-section');
}

// Load products when page loads
document.addEventListener('DOMContentLoaded', () => {
  loadProductsFromAPI();
});

// Temporary test function for color debugging
function testColorDisplay() {
  console.log("🧪 Testing color display...");
  debugColorValues();
  
  // Check if colors are being applied to circles
  const colorCircles = document.querySelectorAll('.color-circle');
  colorCircles.forEach((circle, index) => {
    const computedColor = getComputedStyle(circle).backgroundColor;
    console.log(`Circle ${index + 1}:`, {
      element: circle,
      backgroundColor: circle.style.backgroundColor,
      computedColor: computedColor
    });
  });
}

// Add refresh function to reload products
function refreshProducts() {
  console.log("🔄 Refreshing products...");
  loadProductsFromAPI();
}