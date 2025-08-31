document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('video');
  const captureBtn = document.getElementById('captureButton');

  // Capture frame from camera
  if (captureBtn) {
  captureBtn.addEventListener('click', () => {
    fetch('/capture', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.status === "success") {
          console.log("✅ Image saved at:", data.file_path);

          // Optional: preview captured image
          const preview = document.getElementById("capture-preview");
          if (preview) {
            preview.src = data.file_path;
            preview.style.display = "block";
          } else {
            alert("📸 Image captured and saved!");
          }
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


  setupSimpleScroll('.brand-scroll');
  setupSimpleScroll('.color-scroll');
  setupBrandSelection();
  setupModalEvents();
});

/* Brand & Shades */
const brandShades = {
  mac: [
    { name: "Ruby Woo", id: 1 },
    { name: "Velvet Teddy", id: 2 },
    { name: "Whirl", id: 3 },
    { name: "Taupe", id: 4 },
    { name: "Double Fudge", id: 5 },
  ],
  nars: [
    { name: "Deborah", id: 6 },
    { name: "Cruella", id: 7 },
    { name: "Slow Ride", id: 8 },
    { name: "Tolede", id: 9 },
    { name: "Jane", id: 10 },
  ],
  maybelline: [
    { name: "Touch of Spice", id: 11 },
    { name: "Clay Crush", id: 12 },
    { name: "Divine Wine", id: 13 },
    { name: "Raw Cocoa", id: 14 },
    { name: "Toasted Brown", id: 15 },
  ],
  loreal: [
    { name: "I Choose", id: 16 },
    { name: "Blake's Red", id: 17 },
    { name: "Montmartre 129", id: 18 },
    { name: "Mahogany Studs", id: 19 },
    { name: "I Dare", id: 20 },
  ],
  avon: [
    { name: "Toasted Rose", id: 21 },
    { name: "Matte Cocoa", id: 22 },
    { name: "Mocha", id: 23 },
    { name: "Marvelous Mocha", id: 24 },
    { name: "Brick Rose", id: 25 },
  ]
};

function loadShadesForBrand(brandName) {
  const scrollRow = document.querySelector('.color-scroll .scroll-row');
  if (!scrollRow) return;

  scrollRow.innerHTML = ''; // Clear previous shades
  resetStars();             // ✅ Reset stars when switching brand

  const shades = brandShades[brandName.toLowerCase()];
  if (!shades) return;

  shades.forEach(shade => {
    const item = document.createElement('div');
    item.className = 'scroll-item color-btn';
    item.textContent = shade.name;
    item.dataset.color = shade.id;

    item.addEventListener('click', () => {
      document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active'));
      item.classList.add('active');
      fetch(`/set_color/${shade.id}`);

      // ✅ Show rating box + label immediately
      const ratingBox = document.getElementById('ratingBox');
      const rateLabel = document.getElementById('rate-label');
      if (ratingBox) ratingBox.classList.remove('hidden');
      if (rateLabel) rateLabel.style.display = 'block';

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

document.addEventListener('DOMContentLoaded', () => {
  const stars = document.querySelectorAll('.rating-container .star');
  stars.forEach(star => {
    star.addEventListener('click', () => {
      const value = star.dataset.value;
      const shadeBtn = document.querySelector('.color-btn.active');
      const shadeId = shadeBtn ? shadeBtn.dataset.color : null;

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
          body: JSON.stringify({ shade_id: shadeId, rating: value })
        })
        .then(res => res.json())
        .then(data => console.log("✅ Rating saved:", data))
        .catch(err => console.error("❌ Rating error:", err));
      }
    });
  });
});



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

  // Mouse events for desktop
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
    const walk = (x - startX) * 1.5; // Adjust multiplier for scroll speed
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
    const walk = (x - startX) * 1.5; // Adjust multiplier for scroll speed
    container.scrollLeft = scrollLeft - walk;
  });

  // Mouse wheel scrolling
  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    container.scrollLeft += e.deltaY;
  }, { passive: false });
}

/* Done Modal */
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
  // Clear all active brand selections
  document.querySelectorAll('.brand-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Clear all active shade selections
  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Clear the shades row
  const scrollRow = document.querySelector('.color-scroll .scroll-row');
  if (scrollRow) {
    scrollRow.innerHTML = '';
  }

  // Hide rating box + label for new session
  const ratingBox = document.getElementById('ratingBox');
  const rateLabel = document.getElementById('rate-label');
  if (ratingBox) ratingBox.classList.add('hidden');
  if (rateLabel) rateLabel.style.display = 'none';
  
  // Activate the default brand (MAC)
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
  // Reset stars back to ☆
  document.querySelectorAll(".fstar").forEach(s => {
    s.classList.remove("selected");
    s.textContent = "☆";
  });

  // Reset textarea
  const feedbackBox = document.getElementById("feedback-text");
  if (feedbackBox) feedbackBox.value = "";
}

// Call reset when returning to splash
function goToSplashFromFeedback() {
  resetFeedbackForm();
  showSection("splash");
}


/* 🌟 Feedback buttons */
document.getElementById("submitFeedback")?.addEventListener("click", () => {
  const rating = document.querySelectorAll(".fstar.selected").length;
  const feedbackText = document.getElementById("feedback-text").value;

  fetch('/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: currentUserId,   // 👈 include session user_id
      feedback_rating: rating,
      feedback_text: feedbackText
    })
  })
  .then(res => res.json())
  .then(data => {
    console.log("✅ Feedback saved:", data);
    resetFeedbackForm();
    goToSplashFromFeedback();
  })
  .catch(err => console.error("❌ Feedback error:", err));


});



document.getElementById("skipFeedback")?.addEventListener("click", goToSplashFromFeedback);

function goToSplashFromFeedback() {
  document.getElementById("feedback").classList.add("hidden");
  document.getElementById("splash").classList.remove("hidden-section");
}

let currentUserId = null;

// Start session when Try-On screen opens
function goToTryOn() {
  document.getElementById('splash').classList.add('hidden-section');
  document.getElementById('privacy').classList.add('hidden-section');
  document.getElementById('tryon').classList.remove('hidden-section');
  resetTryOnScreen();

  // Start session with backend
  fetch('/start_session', { method: 'POST' })
    .then(res => res.json())
    .then(data => {
      currentUserId = data.user_id;
      console.log("🎬 Session started for", currentUserId);
    });
}

// Log shade selection
function logShade(shadeId) {
  if (!currentUserId) return;
  fetch('/log_shade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: currentUserId, shade_id: shadeId })
  }).then(res => res.json())
    .then(data => console.log("💄 Shade logged:", data));
}

// End session when entering Privacy
function goToPrivacy() {
  document.getElementById('tryon').classList.add('hidden-section');
  document.getElementById('privacy').classList.remove('hidden-section');

  if (currentUserId) {
    fetch('/end_session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUserId })
    }).then(res => res.json())
      .then(data => console.log("🛑 Session ended:", data));
  }
}
