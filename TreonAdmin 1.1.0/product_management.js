let productCount = 0;
let totalRating = 0;
let ratingCount = 0;

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
  "caramel": "#FFDDA0",
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
  "white": "#FFFFFF"
};

function updateAverageRating() {
  const avg = ratingCount === 0 ? 0 : (totalRating / ratingCount).toFixed(1);
  document.getElementById('average-rating').textContent = `${avg} ⭐`;
}

function updateTotalShades() {
  document.getElementById('total-products').textContent = productCount;
}

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

window.addEventListener('DOMContentLoaded', () => {
  const colorInput = document.getElementById('color');
  const colorPreview = document.getElementById('colorPreview');
  const hexDisplay = document.getElementById('hexDisplay');

  if (colorInput && colorPreview && hexDisplay) {
    colorInput.addEventListener('input', () => {
      const resolved = resolveColorName(colorInput.value);
      colorPreview.style.backgroundColor = resolved;
      const computed = getComputedStyle(colorPreview).backgroundColor;
      hexDisplay.textContent = rgbToHex(computed);
    });
  }
});

function createHalfStarSystem(container, onRate) {
  container.innerHTML = ''; // clear container

  for (let i = 1; i <= 5; i++) {
    const starWrapper = document.createElement('span');
    starWrapper.style.position = 'relative';
    starWrapper.style.display = 'inline-block';
    starWrapper.style.fontSize = '24px';
    starWrapper.style.color = '#ccc';
    starWrapper.style.width = '1em';
    starWrapper.style.cursor = 'pointer';

    const starIcon = document.createElement('i');
    starIcon.className = 'fa fa-star';
    starIcon.style.position = 'relative';
    starIcon.style.zIndex = '0';
    starWrapper.appendChild(starIcon);

    // half star left
    const halfLeft = document.createElement('div');
    halfLeft.style.position = 'absolute';
    halfLeft.style.left = '0';
    halfLeft.style.top = '0';
    halfLeft.style.width = '50%';
    halfLeft.style.height = '100%';
    halfLeft.style.zIndex = '2';
    halfLeft.dataset.value = (i - 0.5).toString();
    halfLeft.onclick = (e) => {
      e.stopPropagation();
      onRate(i - 0.5);
    };
    starWrapper.appendChild(halfLeft);

    // half star right
    const halfRight = document.createElement('div');
    halfRight.style.position = 'absolute';
    halfRight.style.right = '0';
    halfRight.style.top = '0';
    halfRight.style.width = '50%';
    halfRight.style.height = '100%';
    halfRight.style.zIndex = '1';
    halfRight.dataset.value = i.toString();
    halfRight.onclick = (e) => {
      e.stopPropagation();
      onRate(i);
    };
    starWrapper.appendChild(halfRight);

    container.appendChild(starWrapper);
  }
}

function applyHalfStarHighlight(container, rating) {
  const stars = container.querySelectorAll('span');
  stars.forEach((starWrapper, idx) => {
    const value = idx + 1;
    const icon = starWrapper.querySelector('i');
    icon.style.color = '#ccc';
    icon.style.background = 'none';

    if (rating >= value) {
      icon.style.color = 'gold';
    } else if (rating >= value - 0.5) {
      // half star gradient effect
      icon.style.background = 'linear-gradient(to right, gold 50%, #ccc 50%)';
      icon.style.webkitBackgroundClip = 'text';
      icon.style.webkitTextFillColor = 'transparent';
    }
  });
}

function addProduct() {
  const brand = document.getElementById('brand').value.trim();
  const color = document.getElementById('color').value.trim();
  const resolved = resolveColorName(color);

  if (!brand || !color) return;

  const colorPreview = document.getElementById('colorPreview');
  const hexDisplay = document.getElementById('hexDisplay');

  const display = `${brand} - ${color}`;
  const div = document.createElement('div');
  div.className = 'product-item';

  const content = document.createElement('div');
  content.className = 'product-info';

  const preview = document.createElement('div');
  preview.style.backgroundColor = resolved;
  preview.style.width = '30px';
  preview.style.height = '30px';
  preview.style.borderRadius = '4px';

  const meta = document.createElement('div');
  meta.className = 'product-meta';
  meta.innerHTML = `
    <div>${display} (${hexDisplay.textContent})</div>
    <div class="stars"></div>
  `;

  const starsContainer = meta.querySelector('.stars');
  let rated = false;
  let currentRating = 0;

  const handleRate = (ratingValue) => {
    if (!rated) {
      ratingCount++;
      rated = true;
    } else {
      totalRating -= currentRating;
    }
    currentRating = ratingValue;
    totalRating += ratingValue;
    applyHalfStarHighlight(starsContainer, ratingValue);
    updateAverageRating();
  };

  createHalfStarSystem(starsContainer, handleRate);

  content.appendChild(preview);
  content.appendChild(meta);

  const delBtn = document.createElement('button');
  delBtn.className = 'delete';
  delBtn.textContent = 'Delete';
  delBtn.onclick = () => {
    if (rated) {
      ratingCount--;
      totalRating -= currentRating;
      updateAverageRating();
    }
    div.remove();
    productCount--;
    updateTotalShades();
  };

  div.appendChild(content);
  div.appendChild(delBtn);
  document.getElementById('product-container').appendChild(div);

  productCount++;
  updateTotalShades();

  // Reset inputs
  document.getElementById('brand').value = '';
  document.getElementById('color').value = '';
  colorPreview.style.backgroundColor = 'transparent';
  hexDisplay.textContent = '';
}
