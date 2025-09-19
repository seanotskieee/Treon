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

  // Update the daily chart with current week data
  function updateDailyChart(dailyData) {
    if (!sessionsChart) return;
    
    // Get current week dates (Monday to Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weekDates = [];
    const sessionCounts = [];
    
    // Generate dates for the current week
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateString = currentDate.toISOString().split('T')[0];
      
      weekDates.push(`${weekDays[i]} ${currentDate.getDate()}`);
      sessionCounts.push(dailyData[dateString] || 0);
    }
    
    // Update the chart data and labels
    sessionsChart.data.labels = weekDates;
    sessionsChart.data.datasets[0].data = sessionCounts;
    
    // Adjust the max value for the y-axis based on the highest value
    const maxValue = Math.max(...sessionCounts, 5);
    sessionsChart.options.scales.y.max = maxValue + (5 - (maxValue % 5));
    
    sessionsChart.update();
  }

  // Load recent sessions and update chart using Firebase
  function loadDashboardData() {
    try {
      // Load sessions from Firebase
      db.collection("sessions").orderBy("start_time", "desc").limit(10)
        .get()
        .then((querySnapshot) => {
          const sessions = [];
          querySnapshot.forEach((doc) => {
            sessions.push({ id: doc.id, ...doc.data() });
          });
          
          // Update recent sessions list
          updateRecentSessions(sessions);
          
          // Update statistics
          updateStatistics(sessions);
        })
        .catch((error) => {
          console.error("Error getting sessions: ", error);
        });
      
      // Load ratings from Firebase for popular product
      db.collection("ratings").get()
        .then((querySnapshot) => {
          const ratingsData = { brands: {} };
          
          querySnapshot.forEach((doc) => {
            const rating = doc.data();
            const brand = rating.brand;
            
            if (!ratingsData.brands[brand]) {
              ratingsData.brands[brand] = {
                total: 0,
                count: 0,
                average: 0
              };
            }
            
            ratingsData.brands[brand].total += rating.rating;
            ratingsData.brands[brand].count += 1;
            ratingsData.brands[brand].average = 
              ratingsData.brands[brand].total / ratingsData.brands[brand].count;
          });
          
          // Update popular product based on ratings
          updatePopularProduct(ratingsData);
        })
        .catch((error) => {
          console.error("Error getting ratings: ", error);
        });
      
      // Load daily sessions data for chart
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      db.collection("sessions")
        .where("start_time", ">=", weekAgo)
        .get()
        .then((querySnapshot) => {
          const dailyData = {};
          
          querySnapshot.forEach((doc) => {
            const session = doc.data();
            const date = new Date(session.start_time.seconds * 1000);
            const dateString = date.toISOString().split('T')[0];
            
            if (!dailyData[dateString]) {
              dailyData[dateString] = 0;
            }
            
            dailyData[dateString] += 1;
          });
          
          // Update weekly chart with daily data
          updateDailyChart(dailyData);
        })
        .catch((error) => {
          console.error("Error getting daily sessions: ", error);
        });
        
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
    
    sessionsList.innerHTML = '';
    
    sessions.forEach(session => {
      const sessionEl = document.createElement('div');
      sessionEl.className = 'session-entry';
      
      // Format the date for display
      const startTime = new Date(session.start_time.seconds * 1000);
      const formattedDate = startTime.toLocaleString();
      
      sessionEl.innerHTML = `
        <span class="arrow">➢</span>
        <span class="session-time">${formattedDate}</span>
        <span class="session-details">${session.brand || 'Unknown'} #${session.shade_id || 'N/A'} - ${session.duration || '0m 0s'}</span>
      `;
      sessionsList.appendChild(sessionEl);
    });
  }

  // Update dashboard statistics
  function updateStatistics(sessions) {
    if (!sessions || sessions.length === 0) return;
    
    // Calculate average session time
    let totalSeconds = 0;
    let sessionCount = 0;
    
    sessions.forEach(session => {
      if (session.duration_sec) {
        totalSeconds += session.duration_sec;
        sessionCount++;
      }
    });
    
    const avgSeconds = sessionCount > 0 ? Math.round(totalSeconds / sessionCount) : 0;
    const avgMinutes = Math.floor(avgSeconds / 60);
    const remainingSeconds = avgSeconds % 60;
    
    document.getElementById('avg-session').textContent = `${avgMinutes}m ${remainingSeconds}s`;
    
    // Update other statistics
    document.getElementById('total-users').textContent = sessions.length;
    
    // Get product count from Firebase
    db.collection("products").get()
      .then((querySnapshot) => {
        document.getElementById('total-products').textContent = querySnapshot.size;
      })
      .catch((error) => {
        console.error("Error getting products: ", error);
      });
  }

  // Update popular product based on ratings data
  function updatePopularProduct(ratingsData) {
    let popularBrand = null;
    let highestAvg = 0;
    let highestCount = 0;
    
    // Check if we have ratings data
    if (ratingsData && ratingsData.brands && Object.keys(ratingsData.brands).length > 0) {
      // Find the brand with the highest average rating, and if tied, the one with more ratings
      Object.entries(ratingsData.brands).forEach(([brand, data]) => {
        // Only consider brands with at least one rating
        if (data.count > 0) {
          if (data.average > highestAvg) {
            highestAvg = data.average;
            highestCount = data.count;
            popularBrand = brand;
          } else if (data.average === highestAvg) {
            // If the average is the same, check the count of ratings
            if (data.count > highestCount) {
              highestCount = data.count;
              popularBrand = brand;
            }
          }
        }
      });
      
      // If we found a product with ratings, format the display
      if (popularBrand) {
        document.getElementById('popular-product').textContent = `${popularBrand} (${highestAvg.toFixed(1)}⭐)`;
      } else {
        document.getElementById('popular-product').textContent = 'N/A';
      }
    } else {
      document.getElementById('popular-product').textContent = 'N/A';
    }
  }

  // Initialize chart and load data
  initChart();
  loadDashboardData();
  
  // Set up real-time listener for sessions
  db.collection("sessions").orderBy("start_time", "desc").limit(10)
    .onSnapshot((querySnapshot) => {
      const sessions = [];
      querySnapshot.forEach((doc) => {
        sessions.push({ id: doc.id, ...doc.data() });
      });
      updateRecentSessions(sessions);
      updateStatistics(sessions);
    });
  
  // Set up real-time listener for ratings
  db.collection("ratings")
    .onSnapshot((querySnapshot) => {
      const ratingsData = { brands: {} };
      
      querySnapshot.forEach((doc) => {
        const rating = doc.data();
        const brand = rating.brand;
        
        if (!ratingsData.brands[brand]) {
          ratingsData.brands[brand] = {
            total: 0,
            count: 0,
            average: 0
          };
        }
        
        ratingsData.brands[brand].total += rating.rating;
        ratingsData.brands[brand].count += 1;
        ratingsData.brands[brand].average = 
          ratingsData.brands[brand].total / ratingsData.brands[brand].count;
      });
      
      updatePopularProduct(ratingsData);
    });
});