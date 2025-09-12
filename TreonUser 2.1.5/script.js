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
  resetStars();

  const shades = brandShades[brandName.toLowerCase()];
  if (!shades) return;

  // Define color values for each shade (you'll need to add these)
  const shadeColors = {
    1: "#9c0d38", // Ruby Woo
    2: "#b76e79", // Velvet Teddy
    3: "#964b00", // Whirl
    4: "#b38b6d", // Taupe
    5: "#3c1321", // Double Fudge
    6: "#ff6b6b", // Deborah
    7: "#c1121f", // Cruella
    8: "#7b2cbf", // Slow Ride
    9: "#d9bf77", // Tolede
    10: "#ff9f1c", // Jane
    11: "#c44569", // Touch of Spice - mauve
    12: "#a1785d", // Clay Crush - clay brown
    13: "#8d1f32", // Divine Wine - wine red
    14: "#7d5a50", // Raw Cocoa - cocoa brown
    15: "#a57164", // Toasted Brown - toasted brown
    16: "#e84393", // I Choose - pink
    17: "#d63031", // Blake's Red - true red
    18: "#fd79a8", // Montmartre 129 - light pink
    19: "#6d6875", // Mahogany Studs - mauve brown
    20: "#ff7675", // I Dare - coral
    21: "#e77e7e", // Toasted Rose - rose
    22: "#7d5a50", // Matte Cocoa - matte cocoa
    23: "#8d6e63", // Mocha - mocha
    24: "#a1887f", // Marvelous Mocha - mocha
    25: "#e57373", // Brick Rose - brick rose
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

document.addEventListener('DOMContentLoaded', () => {
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
    yesBtn.disabled = true; // prevent double clicks
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

  //const ratingBox = document.getElementById('ratingBox');
  //const rateLabel = document.getElementById('rate-label');
  //if (ratingBox) ratingBox.classList.add('hidden');
  //if (rateLabel) rateLabel.style.display = 'none';

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

// ✅ Keep only one goToSplashFromFeedback
function goToSplashFromFeedback() {
  resetFeedbackForm();
  document.getElementById("feedback").classList.add("hidden");
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
  .then(res => res.json())
  .then(data => {
    console.log("✅ Feedback saved:", data);
    resetFeedbackForm();
    goToSplashFromFeedback();
  })
  .catch(err => console.error("❌ Feedback error:", err));
});

document.getElementById("skipFeedback")?.addEventListener("click", goToSplashFromFeedback);

let currentUserId = null;
let sessionEnded = false; // ✅ prevent duplicate /end_session

// Start session when Try-On screen opens
function goToTryOn() {
  document.getElementById('splash').classList.add('hidden-section');
  document.getElementById('privacy').classList.add('hidden-section');
  document.getElementById('tryon').classList.remove('hidden-section');
  resetTryOnScreen();

  fetch('/start_session', { method: 'POST' })
    .then(res => res.json())
    .then(data => {
      currentUserId = data.user_id;
      sessionEnded = false;
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

  if (currentUserId && !sessionEnded) {
    sessionEnded = true;
    fetch('/end_session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUserId })
    }).then(res => res.json())
      .then(data => console.log("🛑 Session ended:", data));
  }
}
