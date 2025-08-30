// Authentication check
if (sessionStorage.getItem("isLoggedIn") !== "true") {
  window.location.href = "Login.html";
}

// Navigation functionality
document.getElementById("dashboard-btn").addEventListener("click", () => {
  window.location.href = "dashboard.html";
});

document.getElementById("sessions-btn").addEventListener("click", () => {
  window.location.href = "Session_managment.html";
});

document.getElementById("settings-btn").addEventListener("click", () => {
  window.location.href = "setting.html";
});

// Active button highlight
document.querySelectorAll(".nav-button").forEach((button) => {
  button.addEventListener("click", function () {
    document.querySelectorAll(".nav-button").forEach((btn) => {
      btn.classList.remove("active");
    });
    this.classList.add("active");
  });
});

// Product management functionality
const PRODUCTS_STORAGE_KEY = "treon_products";
let products = [];
let nextProductId = 26;
let ratingsData = { brands: {}, colors: {}, brand_colors: {} };

const colorMap = {
  "ruby red": "#9b111e",
  "coral pink": "#f88379",
  "berry burst": "#a63a79",
  "classic rose": "#fbcce7",
  "midnight blue": "#191970",
  "forest green": "#228B22",
  "deep sky blue": "#00BFFF",
  "golden rod": "#DAA520",
  "light salmon": "#FFA07A",
  "indigo": "#4B0082",
  "dark orange": "#FF8C00",
  "steel blue": "#4682B4",
  "orchid": "#DA70D6",
  "sienna": "#A0522D",
  "slate gray": "#708090",
  "crimson": "#DC143C",
  "chartreuse": "#7FFF00",
  "turquoise": "#40E0D0",
  "lavender": "#E6E6FA",
  "hot pink": "#FF69B4",
  "sky blue": "#87CEEB",
  "sea green": "#2E8B57",
  "peach puff": "#FFDAB9",
  "powder blue": "#B0E0E6",
  "salmon": "#FA8072",
  "rosy brown": "#BC8F8F",
  "cadet blue": "#5F9EA0",
  "lemon chiffon": "#FFFACD",
  "misty rose": "#FFE4E1",
  "navajo white": "#FFDEAD",
  "pale violet red": "#DB7093",
  "medium purple": "#9370DB",
  "dark sea green": "#8FBC8F",
  "pale turquoise": "#AFEEEE",
  "light steel blue": "#B0C4DE",
  "medium aquamarine": "#66CDAA",
  "light goldenrod yellow": "#FAFAD2",
  "medium orchid": "#BA55D3",
  "thistle": "#D8BFD8",
  "dark khaki": "#BDB76B",
  "pale goldenrod": "#EEE8AA",
  "dark salmon": "#E9967A",
  "light coral": "#F08080",
  "khaki": "#F0E68C",
  "wheat": "#F5DEB3",
  "light sky blue": "#87CEFA",
  "plum": "#DDA0DD",
  "light pink": "#FFB6C1",
  "dark gray": "#A9A9A9",
  "light gray": "#D3D3D3",
  "gainsboro": "#DCDCDC",
  "snow": "#FFFAFA",
  "honeydew": "#F0FFF0",
  "mint cream": "#F5FFFA",
  "azure": "#F0FFFF",
  "alice blue": "#F0F8FF",
  "ghost white": "#F8F8FF",
  "whitesmoke": "#F5F5F5",
  "beige": "#F5F5DC",
  "old lace": "#FDF5E6",
  "floral white": "#FFFAF0",
  "ivory": "#FFFFF0",
  "antique white": "#FAEBD7",
  "linen": "#FAF0E6",
  "lavender blush": "#FFF0F5",
  "seashell": "#FFF5EE",
  "cornsilk": "#FFF8DC",
  "lemon": "#FFF44F",
  "caramel": "#FFDDAF",
  "rose gold": "#B76E79",
  "sand": "#C2B280",
  "rose brown": "#BC5F5F",
  "olive drab": "#6B8E23",
  "cyan": "#00FFFF",
  "magenta": "#FF00FF",
  "lime": "#00FF00",
  "orange red": "#FF4500",
  "teal": "#008080",
  "navy": "#000080",
  "maroon": "#800000",
  "gray": "#808080",
  "black": "#000000",
  "white": "#FFFFFF",

  /* --- Lipstick shade entries (added) --- */
  "ruby woo": "#9B111E",
  "velvet teddy": "#7E5A50",
  "russian red": "#A81C23",
  "diva": "#8B0016",
  "twig": "#C08A6D",

  "touch of spice": "#A56E6E",
  "divine wine": "#6A0D1A",
  "mauve for me": "#B7848A",
  "pink wink": "#FF66B2",
  "ruby for me": "#B0002F",

  "fire & ice": "#FF2D2A",
  "cherries in the snow": "#B22222",
  "certainly red": "#D32F2F",
  "toast of new york": "#C38A6A",
  "rum raisin": "#7B3F3F",

  "abu dhabi": "#A56D6D",
  "copenhagen": "#B35A5A",
  "stockholm": "#D8A79A",
  "monte carlo": "#9B1B1B",
  "london": "#C76B6B",

  "uncensored": "#B00020",
  "ma'damn": "#6F1E1E",
  "freckle fiesta": "#FFC4A3",
  "s1ngle": "#A66B4F",
  "shawty": "#6E4B3A"
};

function resolveColorName(colorName) {
  const key = colorName.toLowerCase();
  return colorMap[key] || colorName;
}

function rgbToHex(rgb) {
  const result = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(rgb);
  if (!result) return "Invalid color";

  const r = parseInt(result[1]).toString(16).padStart(2, '0');
  const g = parseInt(result[2]).toString(16).padStart(2, '0');
  const b = parseInt(result[3]).toString(16).padStart(2, '0');

  return `#${r}${g}${b}`.toUpperCase();
}

function saveProducts() {
  localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
  // Dispatch a custom event to notify about the update
  window.dispatchEvent(new Event('treonProductsUpdated'));
  window.dispatchEvent(new Event('productAdded'));
}

function loadProducts() {
  const storedProducts = localStorage.getItem(PRODUCTS_STORAGE_KEY);
  if (storedProducts) {
    products = JSON.parse(storedProducts);
    renderProducts();
    populateBrandDropdown();
    updateTotalShades();
    updatePopularProduct();
  }
}

function fetchRatings() {
  fetch('/get_ratings')
    .then(response => response.json())
    .then(data => {
      ratingsData = data;
      renderProducts();
      updateAverageRating();
      updatePopularProduct();
    })
    .catch(error => {
      console.error('Error fetching ratings:', error);
    });
}

function populateBrandDropdown() {
  const brandSelect = document.getElementById('brand-select');
  brandSelect.innerHTML = '<option value="">-- Choose Brand --</option>';
  
  products.forEach(product => {
    const option = document.createElement('option');
    option.value = product.brand;
    option.textContent = product.brand;
    brandSelect.appendChild(option);
  });
}

function loadBrandColors() {
  const brandSelect = document.getElementById('brand-select');
  const colorSelect = document.getElementById('color-select');
  const selectedBrand = brandSelect.value;
  
  colorSelect.innerHTML = '<option value="">-- Choose Color --</option>';
  
  if (selectedBrand) {
    const brand = products.find(p => p.brand === selectedBrand);
    if (brand) {
      brand.colors.forEach(color => {
        const option = document.createElement('option');
        option.value = `${brand.id}-${color.name}`;
        option.textContent = color.name;
        colorSelect.appendChild(option);
      });
    }
  }
}

function showColorRating() {
  const brandSelect = document.getElementById('brand-select');
  const colorSelect = document.getElementById('color-select');
  const selectedBrand = brandSelect.value;
  const selectedColor = colorSelect.value;
  
  if (selectedBrand && selectedColor) {
    const brandColorKey = `${selectedBrand}_${selectedColor}`;
    const colorRating = ratingsData.brand_colors[brandColorKey] || { average: 0, count: 0, distribution: {1:0, 2:0, 3:0, 4:0, 5:0} };
    
    // Update the rating details display
    document.getElementById('selected-color-name').textContent = colorSelect.options[colorSelect.selectedIndex].text;
    document.querySelector('.large-rating').textContent = colorRating.average.toFixed(1);
    document.querySelector('.rating-count').textContent = `(${colorRating.count} ratings)`;
    
    // Update the large stars
    const stars = document.querySelectorAll('.large-star');
    const ratingValue = Math.round(colorRating.average);
    
    stars.forEach((star, index) => {
      if (index < ratingValue) {
        star.classList.add('active');
      } else {
        star.classList.remove('active');
      }
    });
    
    // Update the distribution bar
    const total = Object.values(colorRating.distribution).reduce((sum, count) => sum + count, 0);
    const distributionBar = document.querySelector('.distribution-bar');
    
    if (total > 0) {
      for (let i = 5; i >= 1; i--) {
        const percentage = (colorRating.distribution[i] / total) * 100;
        const segment = distributionBar.querySelector(`.distribution-segment[data-rating="${i}"]`);
        segment.style.width = `${percentage}%`;
        segment.setAttribute('data-count', colorRating.distribution[i]);
      }
    } else {
      // Reset distribution bar if no ratings
      for (let i = 5; i >= 1; i--) {
        const segment = distributionBar.querySelector(`.distribution-segment[data-rating="${i}"]`);
        segment.style.width = '0%';
        segment.setAttribute('data-count', '0');
      }
    }
  } else {
    // Reset display if no color selected
    document.getElementById('selected-color-name').textContent = 'Select a color to view ratings';
    document.querySelector('.large-rating').textContent = '0.0';
    document.querySelector('.rating-count').textContent = '(0 ratings)';
    
    // Reset stars
    document.querySelectorAll('.large-star').forEach(star => {
      star.classList.remove('active');
    });
    
    // Reset distribution bar
    const distributionBar = document.querySelector('.distribution-bar');
    for (let i = 5; i >= 1; i--) {
      const segment = distributionBar.querySelector(`.distribution-segment[data-rating="${i}"]`);
      segment.style.width = '0%';
      segment.setAttribute('data-count', '0');
    }
  }
}

function renderProducts() {
  const container = document.getElementById('product-container');
  container.innerHTML = '';
  
  products.forEach((product, index) => {
    const brandDiv = document.createElement('div');
    brandDiv.className = 'brand-group';
    
    // Get brand rating data
    const brandRating = ratingsData.brands[product.brand] || { average: 0, count: 0, distribution: {1:0, 2:0, 3:0, 4:0, 5:0} };
    
    const brandHeader = document.createElement('div');
    brandHeader.className = 'brand-header';
    brandHeader.innerHTML = `
      <h4>${product.brand}</h4>
      <div class="brand-rating">
        <div class="rating-average">${brandRating.average} ⭐</div>
        <div class="rating-count">(${brandRating.count} ratings)</div>
      </div>
      <button class="delete">Delete Brand</button>
    `;
    
    const delBtn = brandHeader.querySelector('.delete');
    delBtn.onclick = () => {
      products.splice(index, 1);
      saveProducts();
      renderProducts();
      populateBrandDropdown();
      updateTotalShades();
      updatePopularProduct();
      syncProductsWithServer();
    };
    
    brandDiv.appendChild(brandHeader);
    
    const colorsContainer = document.createElement('div');
    colorsContainer.className = 'colors-container';
    
    product.colors.forEach((color, colorIndex) => {
      const shadeId = `${product.id}-${color.name}`;
      const brandColorKey = `${product.brand}_${shadeId}`;
      const colorRating = ratingsData.brand_colors[brandColorKey] || { average: 0, count: 0, distribution: {1:0, 2:0, 3:0, 4:0, 5:0} };
      
      const colorDiv = document.createElement('div');
      colorDiv.className = 'color-item';
      
      colorDiv.innerHTML = `
        <div class="color-preview" style="background-color:${color.colorHex};"></div>
        <div class="color-meta">
          <div class="color-name">${color.name} (${color.hex})</div>
          <div class="color-rating">
            <div class="rating-average">${colorRating.average} ⭐</div>
            <div class="rating-count">(${colorRating.count} ratings)</div>
          </div>
        </div>
        <button class="delete-color">×</button>
      `;
      
      const colorDelBtn = colorDiv.querySelector('.delete-color');
      colorDelBtn.onclick = () => {
        product.colors.splice(colorIndex, 1);
        
        if (product.colors.length === 0) {
          products.splice(index, 1);
        }
        
        saveProducts();
        renderProducts();
        populateBrandDropdown();
        updateTotalShades();
        updatePopularProduct();
        syncProductsWithServer();
      };
      
      colorsContainer.appendChild(colorDiv);
    });
    
    brandDiv.appendChild(colorsContainer);
    container.appendChild(brandDiv);
  });
}

function addColorField() {
  const container = document.getElementById('color-container');
  // Show the container when adding the first color
  if (container.style.display === 'none') {
    container.style.display = 'flex';
  }
  
  const colorGroup = document.createElement('div');
  colorGroup.className = 'color-group';
  
  colorGroup.innerHTML = `
    <input type="text" class="color-input" placeholder="Color or Hex" />
    <div class="color-preview"></div>
    <div class="hex-display"></div>
    <button class="remove-color" onclick="removeColorField(this)">×</button>
  `;
  
  container.appendChild(colorGroup);
  
  const colorInput = colorGroup.querySelector('.color-input');
  const colorPreview = colorGroup.querySelector('.color-preview');
  const hexDisplay = colorGroup.querySelector('.hex-display');
  
  colorInput.addEventListener('input', () => {
    const resolved = resolveColorName(colorInput.value);
    colorPreview.style.backgroundColor = resolved;
    const computed = getComputedStyle(colorPreview).backgroundColor;
    hexDisplay.textContent = rgbToHex(computed);
  });
  
  colorPreview.style.width = '30px';
  colorPreview.style.height = '30px';
  colorPreview.style.borderRadius = '6px';
  colorPreview.style.border = '1px solid #000';
  colorPreview.style.backgroundColor = 'transparent';
}

function removeColorField(button) {
  const colorGroup = button.parentElement;
  colorGroup.remove();
  
  // Hide the container if no color fields remain
  const container = document.getElementById('color-container');
  if (container.children.length === 0) {
    container.style.display = 'none';
  }
}

function addProducts() {
  const brand = document.getElementById('brand').value.trim();
  if (!brand) {
    alert('Please enter a brand name');
    return;
  }
  
  const colorGroups = document.querySelectorAll('.color-group');
  if (colorGroups.length === 0) {
    alert('Please add at least one color');
    return;
  }
  
  const product = {
    id: nextProductId++,
    brand,
    colors: []
  };
  
  colorGroups.forEach(group => {
    const colorInput = group.querySelector('.color-input');
    const colorPreview = group.querySelector('.color-preview');
    const color = colorInput.value.trim();
    
    if (!color) return;
    
    const resolved = colorPreview.style.backgroundColor;
    const hex = group.querySelector('.hex-display').textContent;
    
    product.colors.push({
      name: color,
      hex,
      colorHex: resolved
    });
  });
  
  products.push(product);
  saveProducts();
  renderProducts();
  populateBrandDropdown();
  updateTotalShades();
  
  document.getElementById('brand').value = '';
  
  // Clear and hide the color container
  const container = document.getElementById('color-container');
  container.innerHTML = '';
  container.style.display = 'none';
  
  syncProductsWithServer();
  
    alert(`Added ${product.colors.length} colors for ${brand}`);
}

function syncProductsWithServer() {
  const flatProducts = [];
  products.forEach(brandProduct => {
    brandProduct.colors.forEach(color => {
      flatProducts.push({
        id: `${brandProduct.id}-${color.name}`,
        brand: brandProduct.brand,
        name: color.name,
        hex: color.hex
      });
    });
  });
  
  fetch('/update_colors', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(flatProducts)
  })
  .then(response => response.json())
  .then(data => {
    if (!data.success) {
      console.error('Failed to sync products with server');
    } else {
      console.log('✅ Colors updated on server');
      
      // Notify try-on interface about the update
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('treon_products_update');
        channel.postMessage({ action: 'products_updated' });
        setTimeout(() => channel.close(), 1000);
      }
      
      // Also trigger a storage event for cross-tab communication
      localStorage.setItem('treon_products_update', Date.now().toString());
      
      // Refresh the try-on interface if it's open in the same window
      if (window.parent && window.parent.document.getElementById('tryon')) {
        window.parent.postMessage({ type: 'products_updated' }, '*');
      }
    }
  })
  .catch(error => console.error('Error syncing products:', error));
}

// Update average rating from customer ratings
function updateAverageRating() {
  let totalRating = 0;
  let totalCount = 0;
  
  Object.values(ratingsData.brands).forEach(brand => {
    totalRating += brand.average * brand.count;
    totalCount += brand.count;
  });
  
  const overallAverage = totalCount > 0 ? (totalRating / totalCount).toFixed(1) : 0;
  document.getElementById('average-rating').textContent = `${overallAverage} ⭐ (${totalCount} ratings)`;
}

// Update total products count - count only brands, not individual shades
function updateTotalShades() {
  document.getElementById('total-products').textContent = products.length;
}

// Update popular product based on highest average rating
function updatePopularProduct() {
  let popularBrand = null;
  let highestAvg = 0;
  
  Object.entries(ratingsData.brands).forEach(([brand, data]) => {
    if (data.count > 0 && data.average > highestAvg) {
      highestAvg = data.average;
      popularBrand = brand;
    }
  });
  
  document.getElementById('popular-product').textContent = popularBrand || 'N/A';
}

// Add this function to handle clearing ratings
function clearRatings() {
  if (confirm('Are you sure you want to clear all ratings? This action cannot be undone.')) {
    // Reset ratings data structure
    const emptyRatings = {
      brands: {},
      colors: {},
      brand_colors: {}
    };
    
    // Update local data
    ratingsData = emptyRatings;
    
    // Update UI
    renderProducts();
    updateAverageRating();
    updatePopularProduct();
    showColorRating(); // Refresh the current rating display
    
    // Send request to server to clear ratings
    fetch('/clear_ratings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert('All ratings have been cleared successfully.');
      } else {
        alert('Failed to clear ratings on the server.');
      }
    })
    .catch(error => {
      console.error('Error clearing ratings:', error);
      alert('An error occurred while clearing ratings.');
    });
  }
}

// Load products on page load
window.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  
  if (products.length > 0) {
    nextProductId = Math.max(...products.map(p => p.id)) + 1;
  }
  
  // Fetch ratings from server
  fetchRatings();
  
  syncProductsWithServer();
  
  // Add Clear button event listener
  const clearBtn = document.getElementById('clear-ratings-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearRatings);
  }
});
