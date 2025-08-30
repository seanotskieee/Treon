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

  // Initialize chart
  let sessionsChart = null;
  const sessionCanvas = document.getElementById('sessionsChart');
  if (sessionCanvas) {
    const sessionCtx = sessionCanvas.getContext('2d');
    
    // Create gradient for the chart
    const gradient = sessionCtx.createLinearGradient(0, 0, 0, sessionCanvas.height);
    gradient.addColorStop(0, 'rgba(163, 90, 245, 0.5)');
    gradient.addColorStop(1, 'rgba(163, 90, 245, 0)');
    
    sessionsChart = new Chart(sessionCtx, {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          label: 'Sessions',
          data: [0, 0, 0, 0, 0, 0, 0],
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

  // Load recent sessions and update chart
  async function loadDashboardData() {
    try {
      // Load sessions data
      const sessionsResponse = await fetch('/get_sessions');
      const sessions = await sessionsResponse.json();
      
      // Load weekly sessions data
      const weeklyResponse = await fetch('/get_weekly_sessions');
      const weeklyData = await weeklyResponse.json();
      
      // Load ratings data for popular product
      const ratingsResponse = await fetch('/get_ratings');
      const ratingsData = await ratingsResponse.json();
      
      // Update recent sessions list
      updateRecentSessions(sessions);
      
      // Update weekly chart with the specific weekly data
      updateWeeklyChart(weeklyData.days);
      
      // Update statistics
      updateStatistics(sessions);
      
      // Update popular product based on ratings
      updatePopularProduct(ratingsData);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      document.getElementById('recent-sessions-list').innerHTML = `
        <div class="placeholder-table">
          <i class="fas fa-exclamation-triangle fa-2x"></i>
          <p>Error loading sessions data</p>
        </div>
      `;
    }
  }

  // Update recent sessions list
  function updateRecentSessions(sessions) {
    const sessionsList = document.getElementById('recent-sessions-list');
    
    if (!sessions || sessions.length === 0) {
      sessionsList.innerHTML = `
        <div class="placeholder-table">
          <i class="fas fa-clock fa-2x"></i>
          <p>No sessions recorded yet</p>
          <p>Try capturing an image first</p>
        </div>
      `;
      return;
    }
    
    // Show only the 5 most recent sessions (newest first)
    const recentSessions = sessions.slice(-5).reverse();
    sessionsList.innerHTML = '';
    
    recentSessions.forEach(session => {
      const sessionEl = document.createElement('div');
      sessionEl.className = 'session-entry';
      sessionEl.innerHTML = `
        <span class="arrow">➢</span>
        <span class="session-time">${session.formatted_datetime}</span>
        <span class="session-details">${session.brand} #${session.shade_id} - ${session.duration}</span>
      `;
      sessionsList.appendChild(sessionEl);
    });
  }

  // Update weekly chart with session data
  function updateWeeklyChart(dayCounts) {
    if (!sessionsChart) return;
    
    // Update the chart data
    sessionsChart.data.datasets[0].data = [
      dayCounts[0] || 0, // Monday
      dayCounts[1] || 0, // Tuesday
      dayCounts[2] || 0, // Wednesday
      dayCounts[3] || 0, // Thursday
      dayCounts[4] || 0, // Friday
      dayCounts[5] || 0, // Saturday
      dayCounts[6] || 0  // Sunday
    ];
    
    // Adjust the max value for the y-axis based on the highest value
    const maxValue = Math.max(...dayCounts, 5);
    sessionsChart.options.scales.y.max = maxValue + (5 - (maxValue % 5));
    
    sessionsChart.update();
  }

  // Update dashboard statistics
  function updateStatistics(sessions) {
    if (!sessions || sessions.length === 0) return;
    
    // Calculate average session time
    let totalSeconds = 0;
    let sessionCount = 0;
    
    sessions.forEach(session => {
      const duration = session.duration;
      if (duration && duration !== '0m 0s') {
        const parts = duration.split(' ');
        let minutes = 0, seconds = 0;
        
        if (parts.length >= 2) {
          minutes = parseInt(parts[0].replace('m', '')) || 0;
          seconds = parseInt(parts[1].replace('s', '')) || 0;
        }
        
        totalSeconds += minutes * 60 + seconds;
        sessionCount++;
      }
    });
    
    const avgSeconds = sessionCount > 0 ? Math.round(totalSeconds / sessionCount) : 0;
    const avgMinutes = Math.floor(avgSeconds / 60);
    const remainingSeconds = avgSeconds % 60;
    
    document.getElementById('avg-session').textContent = `${avgMinutes}m ${remainingSeconds}s`;
    
    // Update other statistics
    document.getElementById('total-users').textContent = sessions.length;
  }

  // Update popular product based on ratings data
  function updatePopularProduct(ratingsData) {
    let popularProduct = 'N/A';
    let highestRating = 0;
    
    // Check if we have ratings data
    if (ratingsData && ratingsData.brands && Object.keys(ratingsData.brands).length > 0) {
      // Find the brand with the highest average rating
      Object.entries(ratingsData.brands).forEach(([brand, data]) => {
        if (data.average > highestRating) {
          highestRating = data.average;
          popularProduct = brand;
        }
      });
      
      // If we found a product with ratings, format the display
      if (highestRating > 0) {
        popularProduct = `${popularProduct} (${highestRating.toFixed(1)}⭐)`;
      }
    }
    
    // Update the popular product display
    document.getElementById('popular-product').textContent = popularProduct;
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
      
    } catch (e) {
      console.error("Error updating dashboard stats:", e);
    }
  }
  
  // Initial data load
  loadDashboardData();
  updateDashboardStats();
  
  // Set up periodic refresh of dashboard data
  setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
  
  // Listen for storage updates
  window.addEventListener('storage', function(event) {
    if (event.key === PRODUCTS_STORAGE_KEY) {
      updateDashboardStats();
    }
  });
  
  // Listen for custom product added event
  window.addEventListener('productAdded', updateDashboardStats);
});