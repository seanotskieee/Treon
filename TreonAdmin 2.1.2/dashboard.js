// dashboard.js - Complete redesign with monthly overview and date picker

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

  // Global variables for monthly data
  let currentMonth = new Date().getMonth();
  let currentYear = new Date().getFullYear();
  let sessionsChart = null;

  // Initialize the dashboard
  function initDashboard() {
    initChart();
    setupMonthlyControls();
    loadDashboardData();
    setupRealtimeListeners();
  }

  // Setup monthly controls and selectors
  function setupMonthlyControls() {
    // Populate month selector
    const monthSelect = document.getElementById('monthSelect');
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    months.forEach((month, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = month;
      if (index === currentMonth) {
        option.selected = true;
      }
      monthSelect.appendChild(option);
    });

    // Set current year
    document.getElementById('yearInput').value = currentYear;

    // Event listeners
    document.getElementById('monthSelect').addEventListener('change', function() {
      currentMonth = parseInt(this.value);
      loadMonthlyData();
    });

    document.getElementById('yearInput').addEventListener('change', function() {
      const newYear = parseInt(this.value);
      if (newYear >= 2024 && newYear <= 2030) {
        currentYear = newYear;
        loadMonthlyData();
      } else {
        this.value = currentYear;
        alert('Please enter a year between 2024 and 2030');
      }
    });

    document.getElementById('prevMonthBtn').addEventListener('click', goToPreviousMonth);
    document.getElementById('nextMonthBtn').addEventListener('click', goToNextMonth);

    // Update initial month display
    updateMonthDisplay();
  }

  // Navigation between months
  function goToPreviousMonth() {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    updateMonthDisplay();
    loadMonthlyData();
  }

  function goToNextMonth() {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    updateMonthDisplay();
    loadMonthlyData();
  }

  function updateMonthDisplay() {
    const monthSelect = document.getElementById('monthSelect');
    const yearInput = document.getElementById('yearInput');
    
    monthSelect.value = currentMonth;
    yearInput.value = currentYear;
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    document.getElementById('currentMonthDisplay').textContent = 
      `${monthNames[currentMonth]} ${currentYear}`;
  }

  // Initialize chart for weekly breakdown - UPDATED to use line chart
  function initChart() {
    const sessionCanvas = document.getElementById('sessionsChart');
    if (!sessionCanvas) return;
    
    const sessionCtx = sessionCanvas.getContext('2d');
    
    // Create gradient for the chart
    const gradient = sessionCtx.createLinearGradient(0, 0, 0, sessionCanvas.height);
    gradient.addColorStop(0, 'rgba(163, 90, 245, 0.5)');
    gradient.addColorStop(1, 'rgba(163, 90, 245, 0)');
    
    sessionsChart = new Chart(sessionCtx, {
      type: 'line', // CHANGED: from 'bar' to 'line'
      data: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
        datasets: [{
          label: 'Sessions',
          data: [0, 0, 0, 0, 0],
          backgroundColor: gradient,
          borderColor: '#5f026f',
          borderWidth: 3,
          pointBackgroundColor: '#a35af5',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          fill: true,
          tension: 0.4 // Smooth curve for the line
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
            grid: {
              color: 'rgba(0,0,0,0.05)'
            },
            ticks: {
              stepSize: 5
            }
          }
        }
      }
    });
  }

  // Load monthly data breakdown from ACTUAL SESSIONS
  async function loadMonthlyData() {
    try {
      const monthStart = new Date(currentYear, currentMonth, 1);
      const monthEnd = new Date(currentYear, currentMonth + 1, 0);
      
      // Get sessions for the selected month
      const sessionsSnapshot = await db.collection("sessions")
        .where("start_time", ">=", monthStart)
        .where("start_time", "<=", monthEnd)
        .get();

      // Get manual daily records for the selected month
      const dailySessionsRef = db.collection("daily_sessions");
      const dailySnapshot = await dailySessionsRef
        .where("date", ">=", monthStart.toISOString().split('T')[0])
        .where("date", "<=", monthEnd.toISOString().split('T')[0])
        .get();

      // Initialize weekly data
      const weeklyData = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let monthTotal = 0;

      // Process ACTUAL sessions from sessions collection
      console.log(`📊 Processing ${sessionsSnapshot.size} actual sessions for ${monthStart.toLocaleDateString()}`);
      
      sessionsSnapshot.forEach((doc) => {
        const session = doc.data();
        if (session.start_time && session.start_time.seconds) {
          const sessionDate = new Date(session.start_time.seconds * 1000);
          const day = sessionDate.getDate();
          const weekNumber = Math.ceil(day / 7);
          
          if (weekNumber >= 1 && weekNumber <= 5) {
            weeklyData[weekNumber] += 1; // Count each session
            monthTotal += 1;
          }
          
          console.log(`📅 Session ${doc.id}: ${sessionDate.toISOString()} -> Week ${weekNumber}`);
        }
      });

      // Process MANUAL daily records (add to existing counts)
      dailySnapshot.forEach((doc) => {
        const dailyData = doc.data();
        if (dailyData.manuallyAdded) {
          const day = new Date(dailyData.date).getDate();
          const weekNumber = Math.ceil(day / 7);
          
          if (weekNumber >= 1 && weekNumber <= 5) {
            weeklyData[weekNumber] += dailyData.count;
            monthTotal += dailyData.count;
          }
          
          console.log(`📝 Manual record: ${dailyData.date} -> ${dailyData.count} sessions -> Week ${weekNumber}`);
        }
      });

      // Update weekly breakdown display
      updateWeeklyBreakdown(weeklyData, monthTotal);
      
      // Update chart
      if (sessionsChart) {
        sessionsChart.data.datasets[0].data = [
          weeklyData[1], weeklyData[2], weeklyData[3], weeklyData[4], weeklyData[5]
        ];
        
        // Adjust the max value for the y-axis based on the highest value
        const maxValue = Math.max(...Object.values(weeklyData), 5);
        sessionsChart.options.scales.y.max = maxValue + (5 - (maxValue % 5));
        
        sessionsChart.update();
      }

      console.log(`✅ Monthly breakdown: ${monthTotal} total sessions across ${Object.keys(weeklyData).length} weeks`);

    } catch (error) {
      console.error("❌ Error loading monthly data:", error);
    }
  }

  // Update weekly breakdown display
  function updateWeeklyBreakdown(weeklyData, monthTotal) {
    // Update week cards
    for (let week = 1; week <= 5; week++) {
      const weekElement = document.getElementById(`week${week}Count`);
      if (weekElement) {
        weekElement.textContent = weeklyData[week];
      }
    }

    // Update month total
    document.getElementById('monthTotalCount').textContent = monthTotal;
  }

  // Load dashboard data
  function loadDashboardData() {
    try {
      loadRecentSessions();
      loadTotalSessions();
      loadPopularProduct();
      loadWeeklyAverageSessionTime();
      loadMonthlyData(); // Load current month's data by default
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }

  // Load total sessions count - DIRECT FROM SESSIONS COLLECTION
  function loadTotalSessions() {
    db.collection("sessions")
      .orderBy("start_time", "desc")
      .get()
      .then((querySnapshot) => {
        const totalSessions = querySnapshot.size;
        document.getElementById('total-sessions').textContent = totalSessions;
        console.log(`📈 Total sessions from database: ${totalSessions}`);
      })
      .catch((error) => {
        console.error("Error getting completed sessions count: ", error);
        document.getElementById('total-sessions').textContent = '0';
      });
  }

  // Load weekly average session time - DIRECT FROM SESSIONS
  function loadWeeklyAverageSessionTime() {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    db.collection("sessions")
      .where("start_time", ">=", oneWeekAgo)
      .get()
      .then((querySnapshot) => {
        let totalDuration = 0;
        let sessionCount = 0;
        
        querySnapshot.forEach((doc) => {
          const session = doc.data();
          if (session.duration_sec) {
            totalDuration += session.duration_sec;
            sessionCount++;
          }
        });
        
        const avgSeconds = sessionCount > 0 ? Math.round(totalDuration / sessionCount) : 0;
        const avgMinutes = Math.floor(avgSeconds / 60);
        const remainingSeconds = avgSeconds % 60;
        
        document.getElementById('avg-session').textContent = 
          sessionCount > 0 ? `${avgMinutes}m ${remainingSeconds}s` : '0m 0s';
          
        console.log(`⏱️ Weekly average: ${sessionCount} sessions, ${avgMinutes}m ${remainingSeconds}s average`);
      })
      .catch((error) => {
        console.error("Error getting weekly average session time: ", error);
        document.getElementById('avg-session').textContent = '0m 0s';
      });
  }

  // Load recent sessions - ENHANCED WITH DETAILED LOGGING
  function loadRecentSessions() {
    const sessionsList = document.getElementById('recent-sessions-list');
    
    sessionsList.innerHTML = `
      <div class="placeholder-table">
        <i class="fas fa-spinner fa-spin fa-2x"></i>
        <p>Loading sessions...</p>
      </div>
    `;

    console.log("🔄 Loading recent sessions...");

    const activeSessionsPromise = db.collection("active_sessions")
      .orderBy("last_activity", "desc")
      .limit(10)
      .get()
      .then((querySnapshot) => {
        const activeSessions = [];
        querySnapshot.forEach((doc) => {
          const session = { id: doc.id, ...doc.data(), status: 'active' };
          activeSessions.push(session);
        });
        console.log(`🟢 Found ${activeSessions.length} active sessions`);
        return activeSessions;
      })
      .catch((error) => {
        console.error("Error getting active sessions: ", error);
        return [];
      });

    const completedSessionsPromise = db.collection("sessions")
      .orderBy("start_time", "desc")
      .limit(10)
      .get()
      .then((querySnapshot) => {
        const completedSessions = [];
        querySnapshot.forEach((doc) => {
          const session = { id: doc.id, ...doc.data(), status: 'completed' };
          completedSessions.push(session);
        });
        console.log(`✅ Found ${completedSessions.length} completed sessions`);
        return completedSessions;
      })
      .catch((error) => {
        console.error("Error getting completed sessions: ", error);
        return [];
      });

    Promise.all([activeSessionsPromise, completedSessionsPromise])
      .then(([activeSessions, completedSessions]) => {
        const allSessions = [...activeSessions, ...completedSessions]
          .sort((a, b) => {
            const timeA = a.last_activity || a.start_time;
            const timeB = b.last_activity || b.start_time;
            return new Date(timeB.seconds * 1000) - new Date(timeA.seconds * 1000);
          })
          .slice(0, 8); // Get top 8 most recent

        updateRecentSessions(allSessions);
        updateProductCount();
        
        // Log session details for debugging
        allSessions.forEach((session, index) => {
          const timeField = session.last_activity || session.start_time;
          if (timeField && timeField.seconds) {
            const date = new Date(timeField.seconds * 1000);
            console.log(`📋 Session ${index + 1}: ${date.toISOString()} - ${session.status}`);
          }
        });
      })
      .catch((error) => {
        console.error('Error loading sessions:', error);
        sessionsList.innerHTML = `
          <div class="placeholder-table">
            <i class="fas fa-exclamation-triangle fa-2x"></i>
            <p>Error loading sessions</p>
          </div>
        `;
      });
  }

  // Load popular product - ENHANCED WITH LOGGING
  function loadPopularProduct() {
    console.log("⭐ Loading popular product ratings...");
    
    db.collection("ratings").get()
      .then((querySnapshot) => {
        const brandRatings = {};
        let totalRatings = 0;
        
        querySnapshot.forEach((doc) => {
          const rating = doc.data();
          const brand = rating.brand;
          const ratingValue = parseInt(rating.rating) || 0;
          
          if (!brandRatings[brand]) {
            brandRatings[brand] = {
              total: 0,
              count: 0,
              average: 0
            };
          }
          
          brandRatings[brand].total += ratingValue;
          brandRatings[brand].count += 1;
          brandRatings[brand].average = brandRatings[brand].total / brandRatings[brand].count;
          totalRatings++;
        });
        
        console.log(`⭐ Processed ${totalRatings} ratings across ${Object.keys(brandRatings).length} brands`);
        updateDashboardPopularProduct(brandRatings);
      })
      .catch((error) => {
        console.error('Error fetching ratings for popular product:', error);
        document.getElementById('popular-product').textContent = 'N/A';
      });
  }

  // Update popular product display
  function updateDashboardPopularProduct(brandRatings) {
    let popularBrand = null;
    let highestAverage = 0;

    if (!brandRatings || Object.keys(brandRatings).length === 0) {
      document.getElementById('popular-product').textContent = 'N/A';
      console.log("⭐ No ratings found for popular product");
      return;
    }

    Object.entries(brandRatings).forEach(([brand, data]) => {
      if (data.count > 0 && data.average > highestAverage) {
        highestAverage = data.average;
        popularBrand = brand;
      }
    });

    if (popularBrand) {
      document.getElementById('popular-product').textContent = 
        `${popularBrand} (${highestAverage.toFixed(1)}⭐)`;
      console.log(`⭐ Popular product: ${popularBrand} with ${highestAverage.toFixed(1)} average rating`);
    } else {
      document.getElementById('popular-product').textContent = 'N/A';
    }
  }

  // Update recent sessions list - ENHANCED WITH DETAILED INFO
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
      console.log("📭 No sessions found to display");
      return;
    }
    
    sessionsList.innerHTML = '';
    
    sessions.forEach(session => {
      const sessionEl = document.createElement('div');
      sessionEl.className = 'session-entry';
      
      const timeField = session.last_activity || session.start_time;
      let displayTime = "Unknown Date";
      let isoDate = "Unknown";
      
      if (timeField && timeField.seconds) {
        const date = new Date(timeField.seconds * 1000);
        displayTime = date.toLocaleString();
        isoDate = date.toISOString().split('T')[0];
      }
      
      const brand = session.current_brand || session.brand || 'Unknown';
      const shadeId = session.current_shade_id || session.shade_id || 'N/A';
      const status = session.status === 'active' ? '🟢 Active' : '✅ Completed';
      const duration = session.duration_sec ? ` (${Math.round(session.duration_sec)}s)` : '';
      
      sessionEl.innerHTML = `
        <span class="arrow">➢</span>
        <span class="session-time">${displayTime}</span>
        <span class="session-details">${brand} #${shadeId} - ${status}${duration}</span>
      `;
      sessionsList.appendChild(sessionEl);
      
      // Log for monthly data correlation
      console.log(`📋 Recent Session: ${isoDate} - ${brand} #${shadeId} - ${status}`);
    });
    
    console.log(`📋 Displayed ${sessions.length} recent sessions`);
  }

  // Update product count - UPDATED to match product_management module filtering
  function updateProductCount() {
    db.collection("products").get()
      .then((querySnapshot) => {
        let validProductCount = 0;
        
        querySnapshot.forEach((doc) => {
          const productData = doc.data();
          // Apply the same filtering logic as product_management module
          if (productData.brand && productData.brand !== "undefined" && 
              productData.colors && Array.isArray(productData.colors) && 
              productData.colors.length > 0) {
            validProductCount++;
          }
        });
        
        document.getElementById('total-products').textContent = validProductCount;
        console.log(`📦 Total valid products: ${validProductCount} (filtered from ${querySnapshot.size} total documents)`);
      })
      .catch((error) => {
        console.error("Error getting products: ", error);
        document.getElementById('total-products').textContent = '0';
      });
  }

  // Set up real-time listeners - UPDATED TO USE ACTUAL SESSIONS
  const setupRealtimeListeners = () => {
    console.log("🔔 Setting up real-time listeners...");
    
    // Listen for active sessions
    db.collection("active_sessions")
      .onSnapshot((querySnapshot) => {
        console.log("🔄 Active sessions updated");
        loadRecentSessions();
      });
    
    // Listen for completed sessions - THIS IS THE SOURCE OF TRUTH
    db.collection("sessions")
      .onSnapshot((querySnapshot) => {
        console.log("🔄 Completed sessions updated - reloading all data");
        loadRecentSessions();
        loadTotalSessions();
        loadWeeklyAverageSessionTime();
        loadMonthlyData(); // Reload monthly data when sessions change
      });
    
    // Listen for manual daily records
    db.collection("daily_sessions")
      .onSnapshot((querySnapshot) => {
        console.log("🔄 Manual records updated");
        loadMonthlyData();
      });
    
    // Listen for ratings
    db.collection("ratings")
      .onSnapshot((querySnapshot) => {
        console.log("🔄 Ratings updated");
        loadPopularProduct();
      });

    // Listen for products - UPDATED to use filtered counting
    db.collection("products")
      .onSnapshot((querySnapshot) => {
        console.log("🔄 Products updated");
        updateProductCount();
      });
  };

  // Initialize the dashboard
  initDashboard();

  // Function to sync daily_sessions with actual sessions (for historical data)
  async function syncDailySessionsWithActualData() {
    try {
      console.log("🔄 Syncing daily sessions with actual session data...");
      
      // Get all sessions
      const sessionsSnapshot = await db.collection("sessions").get();
      const dailyCounts = {};
      
      // Count sessions by date
      sessionsSnapshot.forEach((doc) => {
        const session = doc.data();
        if (session.start_time && session.start_time.seconds) {
          const sessionDate = new Date(session.start_time.seconds * 1000);
          const dateString = sessionDate.toISOString().split('T')[0];
          
          if (!dailyCounts[dateString]) {
            dailyCounts[dateString] = 0;
          }
          dailyCounts[dateString]++;
        }
      });
      
      // Update daily_sessions collection
      const batch = db.batch();
      Object.keys(dailyCounts).forEach(date => {
        const dailySessionRef = db.collection("daily_sessions").doc(date);
        batch.set(dailySessionRef, {
          date: date,
          count: dailyCounts[date],
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          autoCalculated: true
        }, { merge: true }); // Merge to preserve manual entries
      });
      
      await batch.commit();
      console.log(`✅ Synced ${Object.keys(dailyCounts).length} days with actual session data`);
      
      // Reload monthly data
      loadMonthlyData();
      
    } catch (error) {
      console.error("❌ Error syncing daily sessions:", error);
    }
  }

  // Expose functions globally
  window.syncDailySessionsWithActualData = syncDailySessionsWithActualData;
});