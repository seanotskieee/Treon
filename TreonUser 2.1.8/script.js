document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('video');
  const captureBtn = document.getElementById('captureButton');

  setupSimpleScroll('.brand-scroll');
  setupSimpleScroll('.color-scroll');
  setupBrandSelection();
  setupModalEvents();

  // Rating stars setup
  const ratingBox = document.getElementById('ratingBox');
  const rateLabel = document.getElementById('rate-label');
  if (ratingBox) ratingBox.classList.remove('hidden');
  if (rateLabel) rateLabel.style.display = 'block';

  const stars = document.querySelectorAll('.rating-container .star');
  stars.forEach(star => {
    star.addEventListener('click', () => {
      const value = star.dataset.value;
      const shadeBtn = document.querySelector('.color-btn.active');
      const shadeId = shadeBtn ? shadeBtn.dataset.color : null;
      const brand = getCurrentBrand();  // Get current brand

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
            brand: brand  // Add brand to rating
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

  // Update the capture function to include brand
  if (captureBtn) {
    captureBtn.addEventListener('click', () => {
      const brand = getCurrentBrand(); // Get current brand
      fetch('/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: currentUserId,
          brand: brand  // Add brand to capture request
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

/* Brand & Shades */
const brandShades = {
  mac: [
    { name: "Ruby Woo", id: 1 },
    { name: "Velvet Teddy", id: 2 },
    { name: "Whirl", id: 3 },
    { name: "Taupe", id: 4 },
    { name: "Double Fudge", id: 5 },
    { name: "Russian Red", id: 6 },
  ],
  nars: [
    { name: "Deborah", id: 7 },
    { name: "Cruella", id: 8 },
    { name: "Slow Ride", id: 9 },
    { name: "Tolede", id: 10 },
    { name: "Jane", id: 11 },
    { name: "Dragon Girl", id: 12 },
  ],
  maybelline: [
    { name: "Touch of Spice", id: 13 },
    { name: "Clay Crush", id: 14 },
    { name: "Divine Wine", id: 15 },
    { name: "Raw Cocoa", id: 16 },
    { name: "Toasted Brown", id: 17 },
    { name: "Red Revival", id: 18 },
  ],
  loreal: [
    { name: "I Choose", id: 19 },
    { name: "Blake's Red", id: 20 },
    { name: "Montmartre", id: 21 },
    { name: "Mahogany Studs", id: 22 },
    { name: "I Dare", id: 23 },
    { name: "Pure Rouge", id: 24 },
  ],
  avon: [
    { name: "Toasted Rose", id: 25 },
    { name: "Matte Cocoa", id: 26 },
    { name: "Mocha", id: 27 },
    { name: "Marvelous Mocha", id: 28 },
    { name: "Brick Rose", id: 29 },
    { name: "Red Supreme", id: 30 },
  ]
};

// Add this function to get the current brand (move it up here)
function getCurrentBrand() {
  const activeBrandBtn = document.querySelector('.brand-btn.active');
  return activeBrandBtn ? activeBrandBtn.textContent.trim() : "Unknown";
}

function loadShadesForBrand(brandName) {
  const scrollRow = document.querySelector('.color-scroll .scroll-row');
  if (!scrollRow) return;

  scrollRow.innerHTML = ''; // Clear previous shades
  resetStars();

  const shades = brandShades[brandName.toLowerCase()];
  if (!shades) return;

  // Define color values for each shade
  const shadeColors = {
    // MAC
    1: "#b31d27", // Ruby Woo – Classic vivid blue-red
    2: "#a86c5b", // Velvet Teddy – Deep-tone beige
    3: "#905d55", // Whirl – Rosy brown
    4: "#8e5441", // Taupe – Reddish brown nude
    5: "#4b2e2c", // Double Fudge – Deep chocolate brown
    6: "#bd3039", // Russian Red – Iconic matte red

    // NARS
    7: "#6f3c2c", // Deborah – Chestnut brown
    8: "#9b1c2d", // Cruella – Scarlet red
    9: "#945e57", // Slow Ride – Soft brown-pink
    10: "#ca6c75", // Tolede – Pink rose
    11: "#b35f4a", // Jane – Terracotta brown
    12: "#b22222", // Dragon Girl – Bright siren red

    // Maybelline
    13: "#965855", // Touch of Spice – Warm mauve nude
    14: "#c17865", // Clay Crush – Terracotta brown
    15: "#5e161f", // Divine Wine – Deep burgundy
    16: "#4d2d29", // Raw Cocoa – Deep cocoa brown
    17: "#6a3e38", // Toasted Brown – Chocolate brown
    18: "#c80000", // Red Revival – Bold true red

    // L’Oréal
    19: "#ad6b65", // I Choose – Brownish-pink nude ink
    20: "#a61723", // Blake's Red – Bold classic red
    21: "#7c4c40", // Montmartre – Coffee brown
    22: "#4a2c28", // Mahogany Studs – Mahogany brown
    23: "#5f3e3b", // I Dare – Deep neutral brown
    24: "#b81e28", // Pure Reds Collection – Pure Rouge

    // AVON (Filipino favorites)
    25: "#7d4436", // Toasted Rose – Warm brown-pink
    26: "#61362f", // Matte Cocoa – Dark chocolate brown
    27: "#9d5e50", // Mocha – Medium rosy brown
    28: "#714037", // Marvelous Mocha – Soft brown matte
    29: "#965745", // Brick Rose – Reddish-brown matte
    30: "#c01c28", // Red Supreme – Vibrant true red
  };

  shades.forEach(shade => {
    const item = document.createElement('div');
    item.className = 'scroll-item color-btn';
    item.dataset.color = shade.id;

    // Create color circle
    const colorCircle = document.createElement('div');
    colorCircle.className = 'color-circle';
    colorCircle.style.backgroundColor = shadeColors[shade.id] || "#cccccc";
    
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
      fetch(`/set_color/${shade.id}`);
      resetStars();
      logShade(shade.id);
    });
    scrollRow.appendChild(item);
  });
}

/* ⭐ Reset stars */
function resetStars() {
  document.querySelectorAll('.rating-container .star').forEach(star => {
    star.classList.remove('selected');
    star.textContent = "☆"; // empty star
  });
}

function setupBrandSelection() {
  const brandButtons = document.querySelectorAll('.brand-btn');

  brandButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active from all
      brandButtons.forEach(b => b.classList.remove('active'));

      // Add active to clicked
      btn.classList.add('active');

      const brandName = btn.textContent.trim().toLowerCase();
      loadShadesForBrand(brandName);
    });
    
    // Activate first brand by default
    if (btn.textContent.trim().toLowerCase() === 'mac') {
      btn.click();
    }
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

// Global modal state
let modalInitialized = false;

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

// function to reset the try-on screen
function resetTryOnScreen() {
  document.querySelectorAll('.brand-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active'));
  const scrollRow = document.querySelector('.color-scroll .scroll-row');
  if (scrollRow) scrollRow.innerHTML = '';

  const defaultBrand = document.querySelector('.brand-btn');
  if (defaultBrand) {
    defaultBrand.classList.add('active');
    loadShadesForBrand('mac');
  }
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

// Add this function to reset the session when going back to splash
function resetSession() {
  if (currentUserId) {
    // Remove the /clear_session call since it doesn't exist in app.py
    // Just reset the local session variables
    console.log("Session reset locally for user:", currentUserId);
  }
  currentUserId = null;
  sessionEnded = false;
}

// Update the goToSplash function
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
// UPDATED: submit => save feedback THEN end session THEN return to splash
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

    // end session after feedback is saved
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
    // still return UI to splash
    resetFeedbackForm();
    goToSplashFromFeedback();
  });
});

// UPDATED: skip => end session then go to splash
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
    // Just return to splash if no session
    resetFeedbackForm();
    goToSplashFromFeedback();
  }
});

let currentUserId = null;
let sessionEnded = false; // ✅ prevent duplicate /end_session

// Start session when Try-On screen opens
function goToTryOn() {
  document.getElementById('splash').classList.add('hidden-section');
  document.getElementById('privacy').classList.add('hidden-section');
  document.getElementById('feedback').classList.add('hidden-section');
  document.getElementById('tryon').classList.remove('hidden-section');
  resetTryOnScreen();
  
  // Reset modal initialization
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
  if (!currentUserId) return;
  const brand = getCurrentBrand();
  fetch('/log_shade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      user_id: currentUserId, 
      shade_id: shadeId,
      brand: brand  // Add brand to the request
    })
  }).then(res => res.json())
    .then(data => console.log("💄 Shade logged:", data));
}

// End session when entering Privacy (REMOVED ending here — session will end after feedback)
// This function now only switches UI to privacy screen
function goToPrivacy() {
  document.getElementById('tryon').classList.add('hidden-section');
  document.getElementById('privacy').classList.remove('hidden-section');

  // previously we ended the session here - removed so feedback can be collected first
}