document.addEventListener('DOMContentLoaded', function () {
  // Authentication check
  if (sessionStorage.getItem("isLoggedIn") !== "true") {
    window.location.href = "Login.html";
    return;
  }

  // Navigation
  const navButtons = [
    { id: "dashboard-btn", url: "dashboard.html" },
    { id: "sessions-btn", url: "Session_managment.html" },
    { id: "products-btn", url: "product_management.html" },
    { id: "settings-btn", url: "setting.html" }
  ];

  navButtons.forEach(btn => {
    const button = document.getElementById(btn.id);
    if (button) {
      button.addEventListener("click", () => {
        window.location.href = btn.url;
      });
    }
  });

  // Highlight active nav
  const navEls = document.querySelectorAll(".nav-button");
  navEls.forEach(button => {
    button.addEventListener("click", function () {
      navEls.forEach(btn => btn.classList.remove("active"));
      this.classList.add("active");
    });
  });

  // Chart: Sessions This Week
  const sessionCanvas = document.getElementById('sessionsChart');
  if (sessionCanvas) {
    const sessionCtx = sessionCanvas.getContext('2d');
    
    // Create gradient for the chart
    const gradient = sessionCtx.createLinearGradient(0, 0, 0, sessionCanvas.height);
    gradient.addColorStop(0, 'rgba(163, 90, 245, 0.5)');
    gradient.addColorStop(1, 'rgba(163, 90, 245, 0)');
    
    new Chart(sessionCtx, {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          label: 'Sessions',
          data: [0, 0, 0, 0, 0, 0, 0], // All zero values
          borderColor: '#a35af5',
          backgroundColor: gradient,
          fill: true,
          tension: 0.3,
          pointRadius: 6,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#a35af5',
          pointBorderWidth: 2,
          pointHoverRadius: 8,
          pointHoverBackgroundColor: '#ffffff',
          pointHoverBorderColor: '#5f026f',
          pointHoverBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(95, 2, 111, 0.9)',
            titleFont: {
              size: 14,
              weight: 'bold'
            },
            bodyFont: {
              size: 13
            },
            padding: 10,
            callbacks: {
              label: function(context) {
                return `Sessions: ${context.parsed.y}`;
              },
              title: function(context) {
                return context[0].label;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            }
          },
          y: {
            beginAtZero: true,
            min: 0,
            max: 20,
            grid: {
              color: 'rgba(0,0,0,0.05)'
            },
            ticks: {
              stepSize: 5
            }
          }
        },
        hover: {
          mode: 'nearest',
          intersect: false
        }
      }
    });
  }

  // Dashboard stats update functionality
  const PRODUCTS_STORAGE_KEY = "treon_products";
  
  function updateDashboardStats() {
    try {
      const products = JSON.parse(localStorage.getItem(PRODUCTS_STORAGE_KEY) || []);
      
      // Update total products count
      const totalProductsEl = document.getElementById('total-products');
      if (totalProductsEl) {
        totalProductsEl.textContent = products.length;
      }
      
      // Update popular product
      const popularProductEl = document.getElementById('popular-product');
      if (popularProductEl) {
        if (products.length > 0) {
          // Find product with highest rating using a loop
          let popular = products[0];
          for (let i = 1; i < products.length; i++) {
            const current = products[i];
            const currentRating = current.rating || 0;
            const popularRating = popular.rating || 0;
            
            if (currentRating > popularRating) {
              popular = current;
            }
          }
          
          // Only show popular product if it has a rating
          if (popular.rating && popular.rating > 0) {
            popularProductEl.textContent = `${popular.brand} - ${popular.colorName}`;
          } else {
            popularProductEl.textContent = 'N/A';
          }
        } else {
          popularProductEl.textContent = 'N/A';
        }
      }
    } catch (e) {
      console.error("Error updating dashboard stats:", e);
    }
  }
  
  // Initial stats update
  updateDashboardStats();
  
  // Listen for storage updates
  window.addEventListener('storage', function(event) {
    if (event.key === PRODUCTS_STORAGE_KEY) {
      updateDashboardStats();
    }
  });
  
  // Listen for custom product added event
  window.addEventListener('productAdded', updateDashboardStats);
  
  // Also update when navigating to this page
  updateDashboardStats();
});