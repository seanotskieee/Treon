function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'tryon') startCamera();
}

function startCamera() {
  const video = document.getElementById('video');
  if (video && navigator.mediaDevices?.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => video.srcObject = stream)
      .catch(() => alert("Camera not available"));
  }
}

function enableSimpleScroll(selector) {
  const container = document.querySelector(selector);
  if (!container) return;

  let isDragging = false;
  let startX = 0;
  let scrollLeft = 0;

  container.addEventListener('mousedown', e => {
    isDragging = true;
    startX = e.pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
    container.classList.add('dragging');
  });

  container.addEventListener('mouseup', () => {
    isDragging = false;
    container.classList.remove('dragging');
  });

  container.addEventListener('mouseleave', () => {
    if (isDragging) {
      isDragging = false;
      container.classList.remove('dragging');
    }
  });

  function handleBrandClick(e) {
  if (e.target.classList.contains('scroll-item')) {
    const selectedBrand = e.target.dataset.brand;
    console.log("Selected brand:", selectedBrand);
    document.querySelectorAll('.brand-scroll .scroll-item').forEach(item => item.classList.remove('selected'));
    e.target.classList.add('selected');
    // Add logic to apply brand
  }
}

function handleColorClick(e) {
  if (e.target.classList.contains('scroll-item')) {
    const selectedColor = e.target.dataset.color;
    console.log("Selected color:", selectedColor);
    document.querySelectorAll('.color-scroll .scroll-item').forEach(item => item.classList.remove('selected'));
    e.target.classList.add('selected');
    // Add logic to apply color overlay
  }
}

document.querySelector('.brand-scroll').addEventListener('click', handleBrandClick);
document.querySelector('.color-scroll').addEventListener('click', handleColorClick);

  container.addEventListener('mousemove', e => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 1.5;
    container.scrollLeft = scrollLeft - walk;
  });

  container.addEventListener('wheel', e => {
    container.scrollLeft += e.deltaY;
  }, { passive: true });
}

document.addEventListener('DOMContentLoaded', () => {
  showScreen('splash');

  document.getElementById('splash').addEventListener('click', () => showScreen('tryon'));
  document.querySelector('.back-button')?.addEventListener('click', () => showScreen('splash'));

  enableSimpleScroll('.brand-scroll');
  enableSimpleScroll('.color-scroll');

  const doneBtn = document.querySelector('.done-button');
  const modal = document.getElementById('confirmModal');
  const yesBtn = document.getElementById('confirmYes');
  const cancelBtn = document.getElementById('confirmCancel');

  doneBtn?.addEventListener('click', () => {
    modal.style.display = 'flex';
  });

  yesBtn?.addEventListener('click', () => {
    modal.style.display = 'none';
    clearSelections();
    showScreen('privacy');
  });

  cancelBtn?.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  document.querySelector('.accept-button')?.addEventListener('click', () => showScreen('splash'));
  document.querySelector('.decline-button')?.addEventListener('click', () => showScreen('splash'));
});

function clearSelections() {
  document.querySelectorAll('.scroll-item.selected').forEach(item => {
    item.classList.remove('selected');
  });
}
