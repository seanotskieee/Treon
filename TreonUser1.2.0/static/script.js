document.addEventListener('DOMContentLoaded', () => {
  const video      = document.getElementById('video');
  const startBtn   = document.getElementById('startCameraBtn');
  const captureBtn = document.getElementById('captureButton');   // 🆕 grab capture button

  /* ― Start Camera ― */
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      startBtn.classList.add('hidden');
      video.classList.remove('hidden');
    });
  }

  /* ― Capture current frame ― 🆕 */
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

  enableManualInfiniteScroll('.color-scroll');
  enableManualInfiniteScroll('.brand-scroll');
  setupBrandSelection();
  setupModalEvents();
});

/* ---------------- Existing helpers below ---------------- */

const brandShades = {
  mac: [
    { name: "Ruby Woo", color: "#B31D27", id: 1 },
    { name: "Velvet Teddy", color: "#A86C5B", id: 2 },
    { name: "Whirl", color: "#905D55", id: 3 },
    { name: "Taupe", color: "#8E5441", id: 4 },
  ],
  nars: [
    { name: "Deborah", color: "#6F3C2C", id: 5 },
    { name: "Cruella", color: "#9B1C2D", id: 6 },
    { name: "Slow Ride", color: "#945E57", id: 7 },
    { name: "Tolede", color: "#CA6C75", id: 8 },
  ],
  maybelline: [
    { name: "Touch of Spice", color: "#965855", id: 9 },
    { name: "Clay Crush", color: "#C17865", id: 10 },
    { name: "Divine Wine", color: "#5E161F", id: 11 },
    { name: "Raw Cocoa", color: "#4D2D29", id: 12 },
  ],
  loreal: [
    { name: "I Choose", color: "#AD6B65", id: 13 },
    { name: "Blake’s Red", color: "#A61723", id: 14 },
    { name: "Montmartre 129", color: "#7C4C40", id: 15 },
    { name: "Mahogany Studs", color: "#4A2C28", id: 16 },
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
    item.style.color = shade.color;
    item.dataset.color = shade.id;

    item.addEventListener('click', () => {
      fetch(`/set_color/${shade.id}`);
    });

    scrollRow.appendChild(item);
  });

  // ✅ Add this to re-enable scrolling after shades are loaded
  enableManualInfiniteScroll('.color-scroll');
}


function setupBrandSelection() {
  document.querySelectorAll('.brand-btn').forEach(item => {
    item.addEventListener('click', () => {
      loadShadesForBrand(item.textContent.toLowerCase());
    });
  });
}

function enableManualInfiniteScroll(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const row = container.querySelector('.scroll-row');
  if (!row || row.dataset.tripled === 'true') return;

  row.innerHTML = row.innerHTML + row.innerHTML + row.innerHTML;
  row.dataset.tripled = 'true'; // Mark this row so it's only tripled once

  const totalWidth = row.scrollWidth;
  const third = totalWidth / 3;
  container.scrollLeft = third;

  container.addEventListener(
    'scroll',
    () => {
      if (container.scrollLeft <= 0) {
        container.scrollLeft = third;
      } else if (container.scrollLeft >= totalWidth - container.clientWidth) {
        container.scrollLeft = third - container.clientWidth;
      }
    }
  );

  container.addEventListener(
    'wheel',
    e => {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    },
    { passive: false }
  );
}


function setupModalEvents() {
  const doneButton = document.querySelector('.done-button');
  const modal      = document.getElementById('confirmModal');
  const yesBtn     = document.getElementById('confirmYes');
  const cancelBtn  = document.getElementById('confirmCancel');

  if (doneButton && modal && yesBtn && cancelBtn) {
    doneButton.addEventListener('click', () => modal.classList.remove('hidden'));
    yesBtn.addEventListener('click', () => (window.location.href = '/privacy'));
    cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));
  }
}
