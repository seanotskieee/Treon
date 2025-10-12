// Authentication check
if (sessionStorage.getItem("isLoggedIn") !== "true") {
  window.location.href = "Login.html";
}

// Navigation functionality - FIXED: Corrected session button URL
document.getElementById("dashboard-btn").addEventListener("click", () => {
  window.location.href = "dashboard.html";
});

document.getElementById("sessions-btn").addEventListener("click", () => {
  window.location.href = "Session_managment.html"; // FIXED: Correct URL
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

// Product management functionality with Firebase
let products = []; // Initialize as empty array
let ratingsData = { brands: {}, shades: {}, brand_shades: {} };

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

  /* --- Lipstick shade entries --- */
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
  "shawty": "#6E4B3A",

  /* --- Brand-specific lipstick shades --- */
  // MAC Shades
  "ruby woo mac": "#b31d27",
  "velvet teddy mac": "#a86c5b",
  "whirl mac": "#905d55",
  "taupe mac": "#8e5441",
  "double fudge mac": "#4b2e2c",
  "russian red mac": "#bd3039",

  // NARS Shades
  "deborah nars": "#6f3c2c",
  "cruella nars": "#9b1c2d",
  "slow ride nars": "#945e57",
  "tolede nars": "#ca6c75",
  "jane nars": "#b35f4a",
  "dragon girl nars": "#b22222",

  // Maybelline Shades
  "touch of spice maybelline": "#965855",
  "clay crush maybelline": "#c17865",
  "divine wine maybelline": "#5e161f",
  "raw cocoa maybelline": "#4d2d29",
  "toasted brown maybelline": "#6a3e38",
  "red revival maybelline": "#c80000",

  // L'Oréal Shades
  "i choose loreal": "#ad6b65",
  "blake's red loreal": "#a61723",
  "montmartre loreal": "#7c4c40",
  "mahogany studs loreal": "#4a2c28",
  "i dare loreal": "#5f3e3b",
  "pure reds collection loreal": "#b81e28",

  // AVON Shades (Filipino favorites)
  "toasted rose avon": "#7d4436",
  "matte cocoa avon": "#61362f",
  "mocha avon": "#9d5e50",
  "marvelous mocha avon": "#714037",
  "brick rose avon": "#965745",
  "red supreme avon": "#c01c28",

  // Alternative names (without brand for easier typing)
  "ruby woo": "#b31d27",
  "velvet teddy": "#a86c5b",
  "whirl": "#905d55",
  "taupe": "#8e5441",
  "double fudge": "#4b2e2c",
  "russian red": "#bd3039",

  "deborah": "#6f3c2c",
  "cruella": "#9b1c2d",
  "slow ride": "#945e57",
  "tolede": "#ca6c75",
  "jane": "#b35f4a",
  "dragon girl": "#b22222",

  "touch of spice": "#965855",
  "clay crush": "#c17865",
  "divine wine": "#5e161f",
  "raw cocoa": "#4d2d29",
  "toasted brown": "#6a3e38",
  "red revival": "#c80000",

  "i choose": "#ad6b65",
  "blake's red": "#a61723",
  "montmartre": "#7c4c40",
  "mahogany studs": "#4a2c28",
  "i dare": "#5f3e3b",
  "pure reds": "#b81e28",

  "toasted rose": "#7d4436",
  "matte cocoa": "#61362f",
  "mocha": "#9d5e50",
  "marvelous mocha": "#714037",
  "brick rose": "#965745",
  "red supreme": "#c01c28"
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

function loadProducts() {
  db.collection("products").get()
    .then((querySnapshot) => {
      products = []; // Ensure products is always an array
      querySnapshot.forEach((doc) => {
        const productData = doc.data();
        // FIX: Only add products that have a valid brand and colors array
        if (productData.brand && productData.brand !== "undefined" && 
            productData.colors && Array.isArray(productData.colors) && 
            productData.colors.length > 0) {
          products.push({ id: doc.id, ...productData });
        } else {
          console.log("Skipping invalid product:", doc.id, productData);
        }
      });
      renderProducts();
      populateBrandDropdown();
      updateTotalShades();
      updatePopularShade();
    })
    .catch((error) => {
      console.error("Error getting products: ", error);
      // Ensure products is an array even on error
      products = [];
      renderProducts();
    });
}

function fetchRatings() {
  db.collection("ratings").get()
    .then((querySnapshot) => {
      ratingsData = { brands: {}, shades: {}, brand_shades: {} };
      
      querySnapshot.forEach((doc) => {
        const rating = doc.data();
        const brand = rating.brand;
        const shadeId = rating.shade_id;
        const shadeName = rating.shade_name;
        
        // FIX: Skip ratings with undefined or invalid brand/shade
        if (!brand || brand === "undefined" || !shadeName || shadeName === "undefined") {
          console.log("Skipping invalid rating:", doc.id, rating);
          return;
        }
        
        // FIX: Convert rating to number to prevent string concatenation
        const ratingValue = parseInt(rating.rating) || 0;
        
        const brandShadeKey = `${brand}_${shadeName}`;
        
        // Update brand ratings
        if (!ratingsData.brands[brand]) {
          ratingsData.brands[brand] = {
            total: 0,
            count: 0,
            average: 0,
            distribution: {1:0, 2:0, 3:0, 4:0, 5:0}
          };
        }
        
        ratingsData.brands[brand].total += ratingValue;
        ratingsData.brands[brand].count += 1;
        ratingsData.brands[brand].average = 
          ratingsData.brands[brand].total / ratingsData.brands[brand].count;
        ratingsData.brands[brand].distribution[ratingValue] += 1;
        
        // Update shade ratings
        if (!ratingsData.shades[shadeId]) {
          ratingsData.shades[shadeId] = {
            name: shadeName,
            total: 0,
            count: 0,
            average: 0,
            distribution: {1:0, 2:0, 3:0, 4:0, 5:0}
          };
        }
        
        ratingsData.shades[shadeId].total += ratingValue;
        ratingsData.shades[shadeId].count += 1;
        ratingsData.shades[shadeId].average = 
          ratingsData.shades[shadeId].total / ratingsData.shades[shadeId].count;
        ratingsData.shades[shadeId].distribution[ratingValue] += 1;
        
        // Update brand_shade ratings - FIXED: Use brand + shade name as key
        if (!ratingsData.brand_shades[brandShadeKey]) {
          ratingsData.brand_shades[brandShadeKey] = {
            brand: brand,
            shade_id: shadeId,
            shade_name: shadeName,
            total: 0,
            count: 0,
            average: 0,
            distribution: {1:0, 2:0, 3:0, 4:0, 5:0}
          };
        }
        
        ratingsData.brand_shades[brandShadeKey].total += ratingValue;
        ratingsData.brand_shades[brandShadeKey].count += 1;
        ratingsData.brand_shades[brandShadeKey].average = 
          ratingsData.brand_shades[brandShadeKey].total / ratingsData.brand_shades[brandShadeKey].count;
        ratingsData.brand_shades[brandShadeKey].distribution[ratingValue] += 1;
      });
      
      renderProducts();
      updateAverageRating();
      updatePopularShade();
    })
    .catch((error) => {
      console.error('Error fetching ratings:', error);
    });
}

function populateBrandDropdown() {
  const brandSelect = document.getElementById('brand-select');
  brandSelect.innerHTML = '<option value="">-- Choose Brand --</option>';
  
  // Add safety check for products array and filter out undefined brands
  if (products && Array.isArray(products)) {
    const uniqueBrands = new Set();
    
    products.forEach(product => {
      if (product.brand && product.brand !== "undefined") {
        uniqueBrands.add(product.brand);
      }
    });
    
    // Convert Set to Array and sort alphabetically
    const sortedBrands = Array.from(uniqueBrands).sort();
    
    sortedBrands.forEach(brand => {
      const option = document.createElement('option');
      option.value = brand;
      option.textContent = brand;
      brandSelect.appendChild(option);
    });
  }
}

function loadBrandColors() {
  const brandSelect = document.getElementById('brand-select');
  const colorSelect = document.getElementById('color-select');
  const selectedBrand = brandSelect.value;
  
  colorSelect.innerHTML = '<option value="">-- Choose Color --</option>';
  
  if (selectedBrand && products && Array.isArray(products)) {
    const brand = products.find(p => p.brand === selectedBrand);
    if (brand && brand.colors && Array.isArray(brand.colors)) {
      brand.colors.forEach(color => {
        // FIX: Skip colors with undefined names
        if (color.name && color.name !== "undefined") {
          const option = document.createElement('option');
          option.value = `${brand.id}-${color.name}`;
          option.textContent = color.name;
          colorSelect.appendChild(option);
        }
      });
    }
  }
}

function showColorRating() {
  const brandSelect = document.getElementById('brand-select');
  const colorSelect = document.getElementById('color-select');
  const selectedBrand = brandSelect.value;
  const selectedColor = colorSelect.value;
  
  if (selectedBrand && selectedColor && selectedBrand !== "undefined") {
    const colorName = colorSelect.options[colorSelect.selectedIndex].text;
    // FIXED: Use brand + color name as key
    const brandColorKey = `${selectedBrand}_${colorName}`;
    const colorRating = ratingsData.brand_shades[brandColorKey] || { average: 0, count: 0, distribution: {1:0, 2:0, 3:0, 4:0, 5:0} };
    
    // Update the rating details display
    document.getElementById('selected-color-name').textContent = colorName;
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
  
  // Add safety check for products array
  if (!products || !Array.isArray(products)) {
    products = [];
  }
  
  // FIX: Filter out any products with undefined or invalid brands
  const validProducts = products.filter(product => 
    product.brand && product.brand !== "undefined" && 
    product.colors && Array.isArray(product.colors)
  );
  
  if (validProducts.length === 0) {
    container.innerHTML = '<div class="placeholder-table"><i class="fas fa-box-open fa-2x"></i><p>No products found</p></div>';
    return;
  }
  
  validProducts.forEach((product, index) => {
    const brandDiv = document.createElement('div');
    brandDiv.className = 'brand-group';
    
    // Get brand rating data
    const brandRating = ratingsData.brands[product.brand] || { average: 0, count: 0, distribution: {1:0, 2:0, 3:0, 4:0, 5:0} };
    
    const brandHeader = document.createElement('div');
    brandHeader.className = 'brand-header';
    brandHeader.innerHTML = `
      <h4>${product.brand}</h4>
      <div class="brand-rating">
        <div class="rating-average">${brandRating.average.toFixed(1)} ⭐</div>
        <div class="rating-count">(${brandRating.count} ratings)</div>
      </div>
      <button class="delete">Delete Brand</button>
    `;
    
    const delBtn = brandHeader.querySelector('.delete');
    delBtn.onclick = () => {
      // Delete from Firebase
      db.collection("products").doc(product.id).delete()
        .then(() => {
          console.log("Product successfully deleted!");
          loadProducts();
        })
        .catch((error) => {
          console.error("Error removing product: ", error);
        });
    };
    
    brandDiv.appendChild(brandHeader);
    
    const colorsContainer = document.createElement('div');
    colorsContainer.className = 'colors-container';
    
    // Add safety check for product.colors and filter out invalid colors
    if (product.colors && Array.isArray(product.colors)) {
      const validColors = product.colors.filter(color => 
        color && color.name && color.name !== "undefined"
      );
      
      if (validColors.length === 0) {
        // If no valid colors, skip this product entirely
        return;
      }
      
      validColors.forEach((color, colorIndex) => {
        // FIXED: Use brand + color name as key to match rating data
        const brandShadeKey = `${product.brand}_${color.name}`;
        const colorRating = ratingsData.brand_shades[brandShadeKey] || { average: 0, count: 0, distribution: {1:0, 2:0, 3:0, 4:0, 5:0} };
        
        const colorDiv = document.createElement('div');
        colorDiv.className = 'color-item';
        
        colorDiv.innerHTML = `
          <div class="color-preview" style="background-color:${color.hex || '#ccc'};"></div>
          <div class="color-meta">
            <div class="color-name">${color.name} (${color.hex || 'N/A'})</div>
            <div class="color-rating">
              <div class="rating-average">${colorRating.average.toFixed(1)} ⭐</div>
              <div class="rating-count">(${colorRating.count} ratings)</div>
            </div>
            <div class="rating-distribution">
              <div class="distribution-bar">
                <div class="distribution-segment" data-rating="5" style="width: ${(colorRating.distribution[5] / Math.max(colorRating.count, 1)) * 100}%"></div>
                <div class="distribution-segment" data-rating="4" style="width: ${(colorRating.distribution[4] / Math.max(colorRating.count, 1)) * 100}%"></div>
                <div class="distribution-segment" data-rating="3" style="width: ${(colorRating.distribution[3] / Math.max(colorRating.count, 1)) * 100}%"></div>
                <div class="distribution-segment" data-rating="2" style="width: ${(colorRating.distribution[2] / Math.max(colorRating.count, 1)) * 100}%"></div>
                <div class="distribution-segment" data-rating="1" style="width: ${(colorRating.distribution[1] / Math.max(colorRating.count, 1)) * 100}%"></div>
              </div>
            </div>
          </div>
          <button class="delete-color">×</button>
        `;
        
        const colorDelBtn = colorDiv.querySelector('.delete-color');
        colorDelBtn.onclick = () => {
          // Remove color from product
          const updatedColors = product.colors.filter((_, idx) => idx !== colorIndex);
          
          if (updatedColors.length === 0) {
            // Delete the entire product if no colors left
            db.collection("products").doc(product.id).delete()
              .then(() => {
                console.log("Product successfully deleted!");
                loadProducts();
              })
              .catch((error) => {
                console.error("Error removing product: ", error);
              });
          } else {
            // Update the product with remaining colors
            db.collection("products").doc(product.id).update({
              colors: updatedColors
            })
            .then(() => {
              console.log("Color successfully removed!");
              loadProducts();
            })
            .catch((error) => {
              console.error("Error updating product: ", error);
            });
          }
        };
        
        colorsContainer.appendChild(colorDiv);
      });
    }
    
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
  
  // Add product to Firebase
  db.collection("products").add(product)
    .then((docRef) => {
      console.log("Product written with ID: ", docRef.id);
      alert(`Added ${product.colors.length} colors for ${brand}`);
      
      document.getElementById('brand').value = '';
      
      // Clear and hide the color container
      const container = document.getElementById('color-container');
      container.innerHTML = '';
      container.style.display = 'none';
      
      // Reload products
      loadProducts();
    })
    .catch((error) => {
      console.error("Error adding product: ", error);
      alert("Error adding product. Please try again.");
    });
}

// FIXED: Correct average rating calculation with proper number parsing
function updateAverageRating() {
  let totalSum = 0;
  let totalCount = 0;
  
  // Sum all ratings across all brands, excluding undefined brands
  Object.entries(ratingsData.brands).forEach(([brand, brandData]) => {
    if (brand && brand !== "undefined") {
      totalSum += brandData.total;  // brand.total is already the sum of all ratings for this brand
      totalCount += brandData.count;
    }
  });
  
  // Calculate the overall average, ensuring it doesn't exceed 5
  const overallAverage = totalCount > 0 ? 
    Math.min(5, (totalSum / totalCount)).toFixed(1) : 0;
  
  document.getElementById('average-rating').textContent = `${overallAverage} ⭐ (${totalCount} ratings)`;
}

// Update total products count - count only valid brands, not individual shades
function updateTotalShades() {
  // FIX: Only count products with valid brands
  const validProducts = products.filter(product => 
    product.brand && product.brand !== "undefined"
  );
  document.getElementById('total-products').textContent = validProducts.length;
}

// UPDATED: Update popular brand based on highest average rating (excluding undefined)
function updatePopularShade() {
  let popularBrand = null;
  let highestAverage = 0;

  // First, check if there are any ratings with valid brands
  if (!ratingsData.brands || Object.keys(ratingsData.brands).length === 0) {
    document.getElementById('popular-shade').textContent = 'N/A';
    return;
  }

  // Iterate over each brand to find the one with highest average rating (excluding undefined)
  Object.entries(ratingsData.brands).forEach(([brand, data]) => {
    // Only consider brands with at least one rating and valid brand name
    if (brand && brand !== "undefined" && data.count > 0 && data.average > highestAverage) {
      highestAverage = data.average;
      popularBrand = brand;
    }
  });

  // If we found a popular brand, display it. Otherwise, display N/A.
  if (popularBrand) {
    document.getElementById('popular-shade').textContent = 
      `${popularBrand} (${highestAverage.toFixed(1)}⭐)`;
  } else {
    document.getElementById('popular-shade').textContent = 'N/A';
  }
}

// Add this function to handle clearing ratings
function clearRatings() {
  if (confirm('Are you sure you want to clear all ratings? This action cannot be undone.')) {
    // Get all ratings documents
    db.collection("ratings").get()
      .then((querySnapshot) => {
        const batch = db.batch();
        querySnapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
        return batch.commit();
      })
      .then(() => {
        alert('All ratings have been cleared successfully.');
        // Reset ratings data
        ratingsData = { brands: {}, shades: {}, brand_shades: {} };
        renderProducts();
        updateAverageRating();
        updatePopularShade();
        showColorRating();
      })
      .catch((error) => {
        console.error('Error clearing ratings:', error);
        alert('An error occurred while clearing ratings.');
      });
  }
}

// Load products on page load
window.addEventListener('DOMContentLoaded', () => {
  // Initialize products as empty array
  products = [];
  
  loadProducts();
  fetchRatings();
  
  // Set up real-time listeners with filtering for undefined data
  db.collection("products").onSnapshot((querySnapshot) => {
    products = [];
    querySnapshot.forEach((doc) => {
      const productData = doc.data();
      // FIX: Only add products that have a valid brand and colors array
      if (productData.brand && productData.brand !== "undefined" && 
          productData.colors && Array.isArray(productData.colors) && 
          productData.colors.length > 0) {
        products.push({ id: doc.id, ...productData });
      }
    });
    renderProducts();
    populateBrandDropdown();
    updateTotalShades();
  });
  
  db.collection("ratings").onSnapshot((querySnapshot) => {
    ratingsData = { brands: {}, shades: {}, brand_shades: {} };
    
    querySnapshot.forEach((doc) => {
      const rating = doc.data();
      const brand = rating.brand;
      const shadeId = rating.shade_id;
      const shadeName = rating.shade_name;
      
      // FIX: Skip ratings with undefined or invalid brand/shade
      if (!brand || brand === "undefined" || !shadeName || shadeName === "undefined") {
        return;
      }
      
      // FIXED: Use brand + shade name as key
      const brandShadeKey = `${brand}_${shadeName}`;
      
      // FIX: Convert rating to number to prevent string concatenation
      const ratingValue = parseInt(rating.rating) || 0;
      
      // Update brand ratings
      if (!ratingsData.brands[brand]) {
        ratingsData.brands[brand] = {
          total: 0,
          count: 0,
          average: 0,
          distribution: {1:0, 2:0, 3:0, 4:0, 5:0}
        };
      }
      
      ratingsData.brands[brand].total += ratingValue;
      ratingsData.brands[brand].count += 1;
      ratingsData.brands[brand].average = 
        ratingsData.brands[brand].total / ratingsData.brands[brand].count;
      ratingsData.brands[brand].distribution[ratingValue] += 1;
      
      // Update shade ratings
      if (!ratingsData.shades[shadeId]) {
        ratingsData.shades[shadeId] = {
          name: shadeName,
          total: 0,
          count: 0,
          average: 0,
          distribution: {1:0, 2:0, 3:0, 4:0, 5:0}
        };
      }
      
      ratingsData.shades[shadeId].total += ratingValue;
      ratingsData.shades[shadeId].count += 1;
      ratingsData.shades[shadeId].average = 
        ratingsData.shades[shadeId].total / ratingsData.shades[shadeId].count;
      ratingsData.shades[shadeId].distribution[ratingValue] += 1;
      
      // Update brand_shade ratings
      if (!ratingsData.brand_shades[brandShadeKey]) {
        ratingsData.brand_shades[brandShadeKey] = {
          brand: brand,
          shade_id: shadeId,
          shade_name: shadeName,
          total: 0,
          count: 0,
          average: 0,
          distribution: {1:0, 2:0, 3:0, 4:0, 5:0}
        };
      }
      
      ratingsData.brand_shades[brandShadeKey].total += ratingValue;
      ratingsData.brand_shades[brandShadeKey].count += 1;
      ratingsData.brand_shades[brandShadeKey].average = 
        ratingsData.brand_shades[brandShadeKey].total / ratingsData.brand_shades[brandShadeKey].count;
      ratingsData.brand_shades[brandShadeKey].distribution[ratingValue] += 1;
    });
    
    renderProducts();
    updateAverageRating();
    updatePopularShade();
  });
  
  // Add Clear button event listener
  const clearBtn = document.getElementById('clear-ratings-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearRatings);
  }
});