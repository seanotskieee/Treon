import { db } from './firebase-init.js';
import { collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { monitorAuthState } from './auth-service.js';

document.addEventListener('DOMContentLoaded', function () {
  // Authentication check
  monitorAuthState((user) => {
    if (!user) {
      window.location.href = "Login.html";
      return;
    }
  });

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
  
  function initChart() {
    const sessionCanvas = document.getElementById('sessionsChart');
    if (!sessionCanvas) return;
    
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
      // Load sessions from Firestore
      const sessionsQuery = query(collection(db, "sessions"), orderBy("datetime", "desc"), limit(10));
      const sessionsSnapshot = await getDocs(sessionsQuery);
      const sessions = sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Load products from Firestore
      const productsSnapshot = await getDocs(collection(db, "products"));
      const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Load ratings from Firestore
      const ratingsSnapshot = await getDocs(collection(db, "ratings"));
      const ratings = ratingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Update UI with all data
      updateRecentSessions(sessions);
      updateStatistics(sessions, products, ratings);
      
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
    const recentSessions = sessions.slice(0, 5);
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

  // Update dashboard statistics
  function updateStatistics(sessions, products, ratings) {
    // Update session statistics
    if (!sessions || sessions.length === 0) {
      document.getElementById('total-users').textContent = '0';
      document.getElementById('avg-session').textContent = '0m 0s';
    } else {
      document.getElementById('total-users').textContent = sessions.length;
      
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
    }
    
    // Update product statistics
    document.getElementById('total-products').textContent = products.length;
    
    // Calculate average rating across all products
    if (ratings.length > 0) {
      const totalRating = ratings.reduce((sum, rating) => sum + rating.rating, 0);
      const avgRating = (totalRating / ratings.length).toFixed(1);
      document.getElementById('average-rating').textContent = `${avgRating} ⭐`;
    } else {
      document.getElementById('average-rating').textContent = '0.0 ⭐';
    }
    
    // Find popular product
    if (products.length > 0 && ratings.length > 0) {
      const brandCounts = {};
      ratings.forEach(rating => {
        brandCounts[rating.brand] = (brandCounts[rating.brand] || 0) + 1;
      });
      
      let popularBrand = Object.keys(brandCounts)[0];
      for (const brand in brandCounts) {
        if (brandCounts[brand] > brandCounts[popularBrand]) {
          popularBrand = brand;
        }
      }
      
      document.getElementById('popular-product').textContent = popularBrand || 'N/A';
    } else {
      document.getElementById('popular-product').textContent = 'N/A';
    }
  }

  // Initialize chart and load data
  initChart();
  loadDashboardData();
  
  // Set up periodic refresh of dashboard data
  setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
  
  // Listen for product updates
  window.addEventListener('productsUpdated', loadDashboardData);
});