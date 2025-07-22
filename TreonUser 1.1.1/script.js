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

  enableManualInfiniteScroll('.color-scroll');
  enableManualInfiniteScroll('.brand-scroll');
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
  ],
  nars: [
    { name: "Deborah", id: 5 },
    { name: "Cruella", id: 6 },
    { name: "Slow Ride", id: 7 },
    { name: "Tolede", id: 8 },
  ],
  maybelline: [
    { name: "Touch of Spice", id: 9 },
    { name: "Clay Crush", id: 10 },
    { name: "Divine Wine", id: 11 },
    { name: "Raw Cocoa", id: 12 },
  ],
  loreal: [
    { name: "I Choose", id: 13 },
    { name: "Blake’s Red", id: 14 },
    { name: "Montmartre 129", id: 15 },
    { name: "Mahogany Studs", id: 16 },
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
      fetch(`/set_color/${shade.id}`);
    });

    scrollRow.appendChild(item);
  });

  enableManualInfiniteScroll('.color-scroll');
}

function setupBrandSelection() {
  document.querySelectorAll('.brand-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const brandName = btn.textContent.trim().toLowerCase();
      loadShadesForBrand(brandName);
    });
  });
}

/* Infinite Scroll for Brand/Shade */
function enableManualInfiniteScroll(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const row = container.querySelector('.scroll-row');
  if (!row || row.dataset.tripled === 'true') return;

  row.innerHTML += row.innerHTML + row.innerHTML; // Tripling
  row.dataset.tripled = 'true';

  const totalWidth = row.scrollWidth;
  const third = totalWidth / 3;
  container.scrollLeft = third;

  container.addEventListener('scroll', () => {
    if (container.scrollLeft <= 0) {
      container.scrollLeft = third;
    } else if (container.scrollLeft >= totalWidth - container.clientWidth) {
      container.scrollLeft = third - container.clientWidth;
    }
  });

  container.addEventListener('wheel', e => {
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
  modal.classList.add('hidden'); // (optional, if not already hidden)
  goToPrivacy(); // ✅ switch to privacy section without reloading
});

}
