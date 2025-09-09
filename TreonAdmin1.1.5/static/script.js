document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('video');
  const startBtn = document.getElementById('startCameraBtn');

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      startBtn.classList.add('hidden');
      video.classList.remove('hidden');
    });
  }

  enableManualInfiniteScroll('.color-scroll');
  setupBrandSelection();
  setupModalEvents();
});

// Brand-to-shade mapping
const brandShades = {
  mac: [
    { name: "Ruby Woo", color: "#b1002b", id: 1 },
    { name: "Velvet Teddy", color: "#d4a373", id: 2 },
    { name: "Diva", color: "#7b1e3a", id: 3 },
    { name: "Candy Yum Yum", color: "#ff4da6", id: 4 },
  ],
  nars: [
    { name: "Cruella", color: "#990000", id: 5 },
    { name: "Dolce Vita", color: "#b35a66", id: 6 },
    { name: "Dragon Girl", color: "#d9003c", id: 7 },
    { name: "Schiap", color: "#ff2993", id: 8 },
  ],
  maybelline: [
    { name: "Touch of Spice", color: "#a0525a", id: 9 },
    { name: "Divine Wine", color: "#6b1d3d", id: 10 },
    { name: "Clay Crush", color: "#d1a07d", id: 11 },
    { name: "Pink For Me", color: "#e573a0", id: 12 },
  ],
  loreal: [
    { name: "Blake’s Red", color: "#a70e26", id: 13 },
    { name: "Eva’s Nude", color: "#debba0", id: 14 },
    { name: "Greige Perfecto", color: "#6e5a5c", id: 15 },
    { name: "Bold Burgundy", color: "#5c1a23", id: 16 },
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
}

function setupBrandSelection() {
  const brandItems = document.querySelectorAll('.brand-btn');
  brandItems.forEach(item => {
    item.addEventListener('click', () => {
      const brand = item.textContent.toLowerCase();
      loadShadesForBrand(brand);
    });
  });
}

function enableManualInfiniteScroll(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const row = container.querySelector('.scroll-row');
  if (!row) return;

  row.innerHTML = row.innerHTML + row.innerHTML + row.innerHTML;

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

  if (doneButton && modal && yesBtn && cancelBtn) {
    doneButton.addEventListener('click', () => {
      modal.classList.remove('hidden');
    });

    yesBtn.addEventListener('click', () => {
      window.location.href = '/privacy';
    });

    cancelBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }
}
