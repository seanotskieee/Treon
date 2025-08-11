document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('video');
  const captureBtn = document.getElementById('captureButton');

  // Capture frame from camera
  if (captureBtn) {
    captureBtn.addEventListener('click', () => {
      fetch('/capture')
        .then(res => {
          if (res.ok) {
            alert('📸 Image captured!');
          } else {
            alert('❌ Failed to capture image.');
          }
        })
        .catch(() => alert('⚠️ Error while capturing image.'));
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
    });

    scrollRow.appendChild(item);
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

function resetTryOnScreen() {
  document.querySelectorAll('.brand-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  const scrollRow = document.querySelector('.color-scroll .scroll-row');
  if (scrollRow) {
    scrollRow.innerHTML = '';
  }

  const defaultBrand = document.querySelector('.brand-btn');
  if (defaultBrand) {
    defaultBrand.classList.add('active');
    loadShadesForBrand('mac');
  }
}
