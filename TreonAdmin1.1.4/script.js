// script.js
document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('video');
  const captureBtn = document.getElementById('captureButton');
  const videoContainer = document.querySelector('.video-container');

  // Create error display element
  const errorDiv = document.createElement('div');
  errorDiv.className = 'camera-error';
  errorDiv.innerHTML = `
    <p>Camera Error: Please check camera permissions</p>
    <button id="retry-camera" class="retry-button">Retry Camera</button>
  `;
  videoContainer.appendChild(errorDiv);

  // Initialize video stream with cache-busting parameter
  function initVideo() {
    errorDiv.style.display = 'none';
    video.style.display = 'block';
    
    // Use a more efficient approach to video loading
    const videoSrc = "/video_feed?t=" + new Date().getTime();
    
    // Preload the video
    const preloadVideo = new Image();
    preloadVideo.src = videoSrc;
    preloadVideo.onload = function() {
      video.src = videoSrc;
      console.log("Video feed loaded successfully");
    };
    
    preloadVideo.onerror = function() {
      console.error("Failed to preload video feed");
      showCameraError();
    };
    
    // Set timeout to check if video loads properly
    let videoTimeout = setTimeout(() => {
      if (video.readyState < 2) { // 0=HAVE_NOTHING, 1=HAVE_METADATA
        console.warn("Video loading timeout");
        showCameraError();
      }
    }, 2000); // Reduced to 2 seconds timeout
  }
  
  function showCameraError() {
    errorDiv.style.display = 'block';
    video.style.display = 'none';
  }

  // Handle video loading events
  video.onloadeddata = function() {
    console.log("Video feed loaded successfully");
    errorDiv.style.display = 'none';
    video.style.display = 'block';
    clearTimeout(videoTimeout);
  };

  video.onerror = function() {
    console.error("Failed to load video feed");
    showCameraError();
    clearTimeout(videoTimeout);
  };

  // Retry button functionality
  document.getElementById('retry-camera').addEventListener('click', initVideo);

  // Initialize video on load with a small delay to allow page rendering
  setTimeout(initVideo, 100);

  // Initialize rating system
  initRatingSystem();
  setupCaptureWithRating();

  setupSimpleScroll('.brand-scroll');
  setupSimpleScroll('.color-scroll');
  setupModalEvents();
  
  // Populate brands dynamically
  populateBrands();
  
  // Set up product update listeners
  setupProductUpdateListeners();
});

// Initialize rating system
function initRatingSystem() {
  const stars = document.querySelectorAll('.star');
  window.currentRating = 0;
  
  stars.forEach(star => {
    star.addEventListener('click', () => {
      const value = parseInt(star.getAttribute('data-value'));
      window.currentRating = value;
      setRating(value);
    });
    
    star.addEventListener('mouseover', (e) => {
      const value = parseInt(star.getAttribute('data-value'));
      highlightStars(value);
    });
    
    star.addEventListener('mouseout', () => {
      highlightStars(window.currentRating);
    });
  });
}

function setRating(value) {
  const stars = document.querySelectorAll('.star');
  stars.forEach(star => {
    const starValue = parseInt(star.getAttribute('data-value'));
    if (starValue <= value) {
      star.classList.add('active');
    } else {
      star.classList.remove('active');
    }
  });
  
  // Store the rating for capture
  window.currentRating = value;
}

function highlightStars(value) {
  const stars = document.querySelectorAll('.star');
  stars.forEach(star => {
    const starValue = parseInt(star.getAttribute('data-value'));
    if (starValue <= value) {
      star.style.color = 'gold';
    } else {
      star.style.color = '#ccc';
    }
  });
}

// Reset rating stars function
function resetRatingStars() {
  const stars = document.querySelectorAll('.star');
  stars.forEach(star => {
    star.classList.remove('active');
    star.style.color = '#ccc';
  });
  window.currentRating = 0;
}

// Update the capture functionality to include rating
function setupCaptureWithRating() {
  const captureBtn = document.getElementById('captureButton');
  if (captureBtn) {
    captureBtn.addEventListener('click', () => {
      const rating = window.currentRating || 0;
      const activeBrand = document.querySelector('.brand-btn.active');
      const activeColor = document.querySelector('.color-btn.active');
      
      if (!activeBrand || !activeColor) {
        alert('Please select a brand and color first');
        return;
      }
      
      const brand = activeBrand.textContent;
      const colorId = activeColor.dataset.color;
      
      // Submit rating to server
      fetch('/submit_rating', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          brand: brand,
          color_id: colorId,
          rating: rating
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          console.log('Rating submitted successfully');
        } else {
          console.error('Failed to submit rating');
        }
      })
      .catch(error => {
        console.error('Error submitting rating:', error);
      });
      
      // Capture the image
      fetch(`/capture?rating=${rating}`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') {
            alert('📸 Image captured!');
            // Reset rating after capture
            resetRatingStars();
          } else {
            alert('❌ Failed to capture image.');
          }
        })
        .catch(() => alert('⚠️ Error while capturing image.'));
    });
  }
}

// Set up listeners for product updates
function setupProductUpdateListeners() {
  // Listen for broadcast channel messages
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel('treon_products_update');
    channel.onmessage = function(event) {
      if (event.data.action === 'products_updated') {
        console.log('Products updated via broadcast channel');
        populateBrands();
      }
    };
  }
  
  // Listen for storage events
  window.addEventListener('storage', function(e) {
    if (e.key === 'treon_products' || e.key === 'treon_products_update') {
      console.log('Products updated via storage event');
      populateBrands();
    }
  });
  
  // Listen for custom events
  window.addEventListener('treonProductsUpdated', function() {
    console.log('Products updated via custom event');
    populateBrands();
  });
  
  // Listen for postMessage events (if in iframe)
  window.addEventListener('message', function(event) {
    if (event.data.type === 'products_updated') {
      console.log('Products updated via postMessage');
      populateBrands();
    }
  });
}

/* Check if products exist and populate accordingly */
function checkAndPopulateProducts() {
  const hasProducts = checkForProducts();
  
  if (hasProducts) {
    populateBrands();
  } else {
    showNoProductsMessage();
  }
}

/* Check if any products exist in localStorage */
function checkForProducts() {
  const storedProducts = localStorage.getItem('treon_products');
  if (!storedProducts) return false;
  
  try {
    const products = JSON.parse(storedProducts);
    return products.length > 0;
  } catch (e) {
    console.error("Error parsing products:", e);
    return false;
  }
}

/* Show message when no products are available */
function showNoProductsMessage() {
  const optionsRow = document.querySelector('.options-row');
  
  // Hide the selectors
  document.querySelector('.brand-scroll').style.display = 'none';
  document.querySelector('.color-scroll').style.display = 'none';
  
  // Remove any existing message
  const existingMsg = document.querySelector('.no-products-message');
  if (existingMsg) {
    existingMsg.remove();
  }
  
  // Create and add new message
  const noProductsMsg = document.createElement('div');
  noProductsMsg.className = 'no-products-message';
  noProductsMsg.innerHTML = `
    <p>No products available. Add brands and colors in the admin panel.</p>
  `;
  optionsRow.appendChild(noProductsMsg);
}

/* Dynamically Load Brands & Shades */
function getProductsForTryOn() {
  const storedProducts = localStorage.getItem('treon_products');
  if (!storedProducts) return {};
  
  try {
    const products = JSON.parse(storedProducts);
    const brands = {};
    
    products.forEach(brandProduct => {
      if (!brands[brandProduct.brand]) {
        brands[brandProduct.brand] = [];
      }
      
      // Add all colors for this brand
      brandProduct.colors.forEach(color => {
        brands[brandProduct.brand].push({
          name: color.name,
          id: `${brandProduct.id}-${color.name}`,
          hex: color.hex
        });
      });
    });
    
    return brands;
  } catch (e) {
    console.error("Error parsing products:", e);
    return {};
  }
}

function populateBrands() {
  const brandScroll = document.querySelector('.brand-scroll .scroll-row');
  const colorScroll = document.querySelector('.color-scroll .scroll-row');
  
  if (!brandScroll || !colorScroll) return;
  
  // Clear existing content
  brandScroll.innerHTML = '';
  colorScroll.innerHTML = '';
  
  // Remove any no products message
  const noProductsMsg = document.querySelector('.no-products-message');
  if (noProductsMsg) {
    noProductsMsg.remove();
  }
  
  // Show the selectors
  document.querySelector('.brand-scroll').style.display = 'block';
  document.querySelector('.color-scroll').style.display = 'block';
  
  const brandProducts = getProductsForTryOn();
  const hasProducts = Object.keys(brandProducts).length > 0;
  
  if (!hasProducts) {
    showNoProductsMessage();
    return;
  }
  
  // Populate brands if products exist
  Object.keys(brandProducts).forEach(brand => {
    const brandBtn = document.createElement('div');
    brandBtn.className = 'scroll-item brand-btn';
    brandBtn.textContent = brand;
    brandBtn.addEventListener('click', () => {
      document.querySelectorAll('.brand-btn').forEach(btn => btn.classList.remove('active'));
      brandBtn.classList.add('active');
      loadShadesForBrand(brand);
    });
    
    brandScroll.appendChild(brandBtn);
  });
  
  // Activate first brand if available
  const firstBrand = Object.keys(brandProducts)[0];
  if (firstBrand) {
    const firstBrandBtn = brandScroll.querySelector('.brand-btn');
    if (firstBrandBtn) {
      firstBrandBtn.classList.add('active');
      loadShadesForBrand(firstBrand);
    }
  }
}

function loadShadesForBrand(brandName) {
  const scrollRow = document.querySelector('.color-scroll .scroll-row');
  if (!scrollRow) return;

  scrollRow.innerHTML = '';
  const brandProducts = getProductsForTryOn();
  const shades = brandProducts[brandName];
  
  if (!shades || shades.length === 0) {
    return;
  }

  shades.forEach(shade => {
    const item = document.createElement('div');
    item.className = 'scroll-item color-btn';
    item.textContent = shade.name;
    item.dataset.color = shade.id;

    item.addEventListener('click', () => {
      document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active'));
      item.classList.add('active');
      fetch(`/set_color/${shade.id}`);
      console.log(`Selected color: ${shade.id} - ${shade.name}`);
    });

    scrollRow.appendChild(item);
  });
  
  // Auto-select first shade
  const firstShadeBtn = scrollRow.querySelector('.color-btn');
  if (firstShadeBtn) {
    firstShadeBtn.classList.add('active');
    const colorId = firstShadeBtn.dataset.color;
    fetch(`/set_color/${colorId}`);
    console.log(`Selected color: ${colorId} - ${firstShadeBtn.textContent}`);
  }
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

  // Repopulate based on current product state
  checkAndPopulateProducts();
}

function goToPrivacy() {
  document.getElementById('tryon').classList.add('hidden-section');
  document.getElementById('privacy').classList.remove('hidden-section');
  // Reset rating stars when going to privacy screen
  resetRatingStars();
}

function goToSplash() {
  document.getElementById('privacy').classList.add('hidden-section');
  document.getElementById('tryon').classList.add('hidden-section');
  document.getElementById('splash').classList.remove('hidden-section');
  // Reset rating stars when returning to splash screen
  resetRatingStars();
}

// Listen for product updates from admin panel
window.addEventListener('storage', function(e) {
  if (e.key === 'treon_products' || e.key === 'treon_products_update') {
    // Products were updated, refresh the try-on interface
    checkAndPopulateProducts();
  }
});

// Also listen for custom event in case we're in the same window
window.addEventListener('treonProductsUpdated', function() {
  checkAndPopulateProducts();
});