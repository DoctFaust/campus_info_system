// Global variables
let map;
let markers = [];
let incidents = [];
let selectedLocation = null;
let chart = null;
let analysisLayers = [];
let incidentsVisible = true;
let analysisVisible = true;
let filteredIncidents = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    initMap();
    loadIncidents();
    setupEventListeners();
});

// Initialize the map
function initMap() {
    // Default to a university location (you can change coordinates)
    map = L.map('map').setView([31.846120, 117.290306], 17);

    // Add OpenStreetMap tiles
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add click event for location selection
    map.on('click', function (e) {
        if (document.getElementById('report-tab').classList.contains('hidden') === false) {
            selectLocation(e.latlng);
        }
    });
}

// Select location on map
function selectLocation(latlng) {
    selectedLocation = latlng;
    document.getElementById('location').value = `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;

    // Remove previous selection marker
    if (window.selectionMarker) {
        map.removeLayer(window.selectionMarker);
    }

    // Add new selection marker
    window.selectionMarker = L.marker(latlng, {
        icon: L.divIcon({
            className: 'selection-marker',
            html: '<i class="fas fa-map-pin" style="color: #ff4444; font-size: 24px;"></i>',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        })
    }).addTo(map);
}

// Load sample data
function loadSampleData() {
    const sampleIncidents = [
        {
            id: 1,
            type: 'traffic_accident',
            description: 'Minor collision at main entrance',
            location: [31.847120, 117.290306],
            severity: 'medium',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            status: 'active'
        },
        {
            id: 2,
            type: 'broken_facility',
            description: 'Broken water fountain in library',
            location: [31.846120, 117.290306],
            severity: 'low',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
            status: 'resolved'
        },
        {
            id: 3,
            type: 'campus_activity',
            description: 'Student concert at main quad',
            location: [31.847120, 117.291306],
            severity: 'low',
            timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
            status: 'active'
        },
        {
            id: 4,
            type: 'road_block',
            description: 'Construction blocking north entrance',
            location: [31.848120, 117.290306],
            severity: 'high',
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
            status: 'active'
        },
        {
            id: 5,
            type: 'noise',
            description: 'Loud construction work near dormitory',
            location: [31.847120, 117.289306],
            severity: 'medium',
            timestamp: new Date(Date.now() - 30 * 60 * 1000),
            status: 'active'
        }
    ];

    incidents = sampleIncidents;
    updateMapMarkers();
    updateIncidentsList();
}

// Update map markers
function updateMapMarkers() {
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    const colorMap = {
        'traffic_accident': '#ff4444',
        'traffic_jam': '#ff8800',
        'broken_facility': '#9C27B0',
        'noise': '#795548',
        'road_block': '#607D8B',
        'campus_activity': '#4CAF50',
        'security': '#f44336',
        'maintenance': '#2196F3',
        'other': '#9E9E9E'
    };
    
    const iconMap = {
        'traffic_accident': '🚗',
        'traffic_jam': '🚦',
        'broken_facility': '🔧',
        'noise': '🔊',
        'road_block': '🚧',
        'campus_activity': '🎉',
        'security': '🛡️',
        'maintenance': '⚙️',
        'other': '❓'
    };

    incidents.forEach(incident => {
        const color = colorMap[incident.type] || '#9E9E9E';
        const icon = iconMap[incident.type] || '❓';
        const size = incident.severity === 'critical' ? 35 : incident.severity === 'high' ? 30 : 25;
        const pulseAnimation = incident.status === 'active' ? 'animation: pulse 2s infinite;' : '';
        
        const marker = L.marker(incident.location, {
            icon: L.divIcon({
                className: 'custom-incident-marker',
                html: `
                    <div style="
                        position: relative;
                        width: ${size}px;
                        height: ${size}px;
                        ${pulseAnimation}
                    ">
                        <div style="
                            position: absolute;
                            top: 0;
                            left: 0;
                            width: 100%;
                            height: 100%;
                            background: ${color};
                            border-radius: 50%;
                            border: 3px solid white;
                            box-shadow: 0 3px 10px rgba(0,0,0,0.3);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: ${size * 0.4}px;
                        ">${icon}</div>
                        ${incident.severity === 'critical' ? `
                            <div style="
                                position: absolute;
                                top: -2px;
                                right: -2px;
                                width: 12px;
                                height: 12px;
                                background: #ff0000;
                                border-radius: 50%;
                                border: 2px solid white;
                                animation: pulse 1s infinite;
                            "></div>
                        ` : ''}
                    </div>
                `,
                iconSize: [size, size],
                iconAnchor: [size/2, size/2]
            })
        }).addTo(map);

        marker.bindPopup(`
            <div style="min-width: 220px; font-family: 'Segoe UI', sans-serif;">
                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                    <div style="font-size: 24px; margin-right: 10px;">${icon}</div>
                    <h4 style="color: ${color}; margin: 0; flex: 1;">
                        ${incident.type.replace('_', ' ').toUpperCase()}
                    </h4>
                </div>
                <p style="margin: 8px 0; color: #333; line-height: 1.4;">${incident.description}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; margin: 10px 0;">
                    <span style="
                        background: ${incident.severity === 'critical' ? '#ff0000' : 
                                     incident.severity === 'high' ? '#ff5722' :
                                     incident.severity === 'medium' ? '#ff9800' : '#4caf50'};
                        color: white;
                        padding: 3px 8px;
                        border-radius: 12px;
                        font-size: 11px;
                        font-weight: bold;
                    ">${incident.severity.toUpperCase()}</span>
                    <span style="
                        background: ${incident.status === 'active' ? '#4CAF50' : '#9E9E9E'};
                        color: white;
                        padding: 3px 8px;
                        border-radius: 12px;
                        font-size: 11px;
                    ">${incident.status.toUpperCase()}</span>
                </div>
                <small style="color: #666; font-size: 11px;">
                    📅 ${incident.timestamp.toLocaleString()}<br>
                    📍 ${incident.location[0].toFixed(4)}, ${incident.location[1].toFixed(4)}
                    ${incident.reporter_name ? `<br>👤 ${incident.reporter_name}` : ''}
                </small>
            </div>
        `);

        markers.push(marker);
    });
}

// Update incidents list
function updateIncidentsList() {
    const container = document.getElementById('incidents-list');
    container.innerHTML = '';

    const sortedIncidents = incidents.sort((a, b) => b.timestamp - a.timestamp);

    sortedIncidents.forEach(incident => {
        const card = document.createElement('div');
        card.className = 'incident-card';
        card.innerHTML = `
                <div class="incident-header">
                    <div class="incident-type">${incident.type.replace('_', ' ')}</div>
                    <div class="incident-time">${formatTimeAgo(incident.timestamp)}</div>
                </div>
                <div class="incident-description">${incident.description}</div>
                <div class="incident-location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${incident.location[0].toFixed(4)}, ${incident.location[1].toFixed(4)}
                </div>
            `;

        card.addEventListener('click', () => {
            map.setView(incident.location, 18);
            markers.find(m => m.getLatLng().lat === incident.location[0])?.openPopup();
        });

        container.appendChild(card);
    });
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('incident-form').addEventListener('submit', function (e) {
        e.preventDefault();
        submitIncident();
    });

    // Add sidebar tab click listeners
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchTab(tabName);
        });
    });
}

// Load data from API
async function loadIncidents() {
    console.log('Loading incidents from API...');
    try {
        const response = await fetch('/api/incidents');
        console.log('API Response status:', response.status);
        console.log('API Response headers:', response.headers);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Raw API data:', data);
        console.log('Data type:', typeof data);
        console.log('Is array:', Array.isArray(data));
        console.log('Number of incidents from API:', data.length);
        
        // Check if data is actually an array
        if (!Array.isArray(data)) {
            console.error('API returned non-array data:', data);
            throw new Error('API returned invalid data format');
        }
        
        // If no data from API, use sample data
        if (data.length === 0) {
            console.log('No data from API, loading sample data');
            loadSampleData();
            return;
        }
        
        // Convert API data to frontend format
        const newIncidents = data.map((incident, index) => {
            console.log(`Processing incident ${index}:`, incident);
            
            // Validate required fields
            if (!incident.latitude || !incident.longitude) {
                console.error(`Invalid coordinates for incident ${incident.id}:`, incident);
                return null;
            }
            
            return {
                id: incident.id,
                type: incident.type,
                description: incident.description,
                location: [incident.latitude, incident.longitude],
                severity: incident.severity,
                status: incident.status,
                timestamp: new Date(incident.timestamp),
                reporter_name: incident.reporter_name || 'Anonymous'
            };
        }).filter(incident => incident !== null); // Remove invalid incidents
        
        console.log('Converted incidents:', newIncidents);
        console.log('Number of valid converted incidents:', newIncidents.length);
        
        incidents = newIncidents;
        console.log('incidents array updated, length:', incidents.length);
        
        updateMapMarkers();
        updateIncidentsList();
        console.log('Map markers and list updated');
        
    } catch (error) {
        console.error('Error loading incidents:', error);
        console.log('Falling back to sample data');
        loadSampleData();
    }
}

async function submitIncident() {
    if (!selectedLocation) {
        showNotification('Please select a location on the map', 'error');
        return;
    }

    const formData = {
        id: Date.now() % 10000000,
        type: document.getElementById('incident-type').value,
        description: document.getElementById('description').value,
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        severity: document.getElementById('severity').value,
        reporter_name: 'Anonymous'
    };

    console.log('Submitting incident:', formData);
    showLoading();

    try {
        const response = await fetch('/api/incidents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        console.log('Submit response status:', response.status);

        if (response.ok) {
            // Reset form first
            document.getElementById('incident-form').reset();
            if (window.selectionMarker) {
                map.removeLayer(window.selectionMarker);
            }
            selectedLocation = null;
            
            console.log('Reloading incidents...');
            // Reload incidents from database with a small delay
            setTimeout(async () => {
                await loadIncidents();
                showNotification('Incident reported successfully!', 'success');
            }, 500);
        } else {
            throw new Error('Failed to submit incident');
        }
    } catch (error) {
        console.error('Error submitting incident:', error);
        showNotification('Error submitting incident', 'error');
    }

    hideLoading();
}

function switchTab(tabName) {
    // Remove active class from all tabs
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    
    // Add active to the clicked tab button
    document.querySelectorAll('.nav-tab').forEach(tab => {
        if (tab.getAttribute('data-tab') === tabName) {
            tab.classList.add('active');
        }
    });
    
    // Hide all tab panels and show the chosen one
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.add('hidden'));
    document.getElementById(`${tabName}-tab`).classList.remove('hidden');
    
    if (tabName === 'analytics') updateAnalytics();
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth <= 768) {
        // Mobile behavior
        sidebar.classList.toggle('open');
    } else {
        // Desktop behavior
        sidebar.classList.toggle('collapsed');
    }
}

function showFilterPanel() {
    document.getElementById('filter-panel').classList.remove('hidden');
}

function hideFilterPanel() {
    document.getElementById('filter-panel').classList.add('hidden');
}

function applyFilters() {
    const statusFilter = document.getElementById('status-filter').value;
    const severityFilter = document.getElementById('severity-filter').value;
    
    filteredIncidents = incidents.filter(incident => {
        const statusMatch = !statusFilter || incident.status === statusFilter;
        const severityMatch = !severityFilter || incident.severity === severityFilter;
        return statusMatch && severityMatch;
    });
    
    // Update markers with filtered data
    const originalIncidents = incidents;
    incidents = filteredIncidents;
    updateMapMarkers();
    incidents = originalIncidents;
    
    showNotification(`Applied filters: ${filteredIncidents.length} incidents shown`, 'success');
    hideFilterPanel();
}

function clearFilters() {
    document.getElementById('status-filter').value = '';
    document.getElementById('severity-filter').value = '';
    updateMapMarkers();
    showNotification('Filters cleared', 'info');
    hideFilterPanel();
}

function exportData() {
    const dataStr = JSON.stringify(incidents, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `campus_incidents_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Data exported successfully', 'success');
}

function refreshData() {
    showLoading();
    loadIncidents().then(() => {
        hideLoading();
        showNotification('Data refreshed', 'success');
    });
}

function showSearchPanel() {
    document.getElementById('search-panel').classList.remove('hidden');
}

function hideSearchPanel() {
    document.getElementById('search-panel').classList.add('hidden');
}

function searchLocation() {
    const query = document.getElementById('search-input').value.trim();
    if (!query) return;
    
    // Try to parse as coordinates
    const coordMatch = query.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
    if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lng = parseFloat(coordMatch[2]);
        map.setView([lat, lng], 18);
        
        L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'search-marker',
                html: '<i class="fas fa-search" style="color: #2196F3; font-size: 20px;"></i>',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        }).addTo(map).bindPopup('Search Result').openPopup();
        
        hideSearchPanel();
        showNotification('Location found', 'success');
    } else {
        // Search in incident descriptions
        const found = incidents.find(incident => 
            incident.description.toLowerCase().includes(query.toLowerCase()) ||
            incident.type.toLowerCase().includes(query.toLowerCase())
        );
        
        if (found) {
            map.setView(found.location, 18);
            const marker = markers.find(m => 
                m.getLatLng().lat === found.location[0] && 
                m.getLatLng().lng === found.location[1]
            );
            if (marker) marker.openPopup();
            hideSearchPanel();
            showNotification('Incident found', 'success');
        } else {
            showNotification('No matching incidents found', 'error');
        }
    }
}

// Enhanced toggle functions
function toggleHeatmap() {
    analysisVisible = !analysisVisible;
    const btn = document.getElementById('heatmap-btn');
    
    analysisLayers.forEach(layer => {
        if (analysisVisible) {
            layer.addTo(map);
            btn.style.background = 'rgba(76, 175, 80, 0.9)';
            btn.style.color = 'white';
        } else {
            map.removeLayer(layer);
            btn.style.background = 'rgba(255, 255, 255, 0.95)';
            btn.style.color = '#333';
        }
    });
    
    showNotification(
        analysisVisible ? 'Analysis results shown' : 'Analysis results hidden', 
        'info'
    );
}

function toggleIncidents() {
    incidentsVisible = !incidentsVisible;
    const btn = document.getElementById('incidents-btn');
    
    markers.forEach(marker => {
        if (incidentsVisible) {
            marker.addTo(map);
            btn.style.background = 'rgba(76, 175, 80, 0.9)';
            btn.style.color = 'white';
        } else {
            map.removeLayer(marker);
            btn.style.background = 'rgba(255, 255, 255, 0.95)';
            btn.style.color = '#333';
        }
    });
    
    showNotification(
        incidentsVisible ? 'Incidents shown' : 'Incidents hidden', 
        'info'
    );
}

// Analysis popup functions
function showAnalysisPopup(analysisType) {
    const popup = document.getElementById('analysis-popup');
    const title = document.getElementById('popup-title');
    const content = document.getElementById('popup-content');
    
    popup.classList.remove('hidden');
    
    switch(analysisType) {
        case 'statistics':
            title.textContent = 'Statistics Analysis';
            showStatisticsAnalysis(content);
            break;
        case 'charts':
            title.textContent = 'Charts Analysis';
            showChartsAnalysis(content);
            break;
        case 'clustering':
            title.textContent = 'Clustering Analysis';
            showClusteringAnalysis(content);
            break;
        case 'buffer':
            title.textContent = 'Buffer Analysis';
            showBufferAnalysis(content);
            break;
        case 'density':
            title.textContent = 'Density Analysis';
            showDensityAnalysis(content);
            break;
    }
}

function closeAnalysisPopup() {
    document.getElementById('analysis-popup').classList.add('hidden');
}

// Statistics Analysis
function showStatisticsAnalysis(container) {
    const total = incidents.length;
    const active = incidents.filter(i => i.status === 'active').length;
    const resolved = incidents.filter(i => i.status === 'resolved').length;
    const highSeverity = incidents.filter(i => i.severity === 'high' || i.severity === 'critical').length;
    
    // Calculate type distribution
    const typeCounts = {};
    incidents.forEach(i => {
        typeCounts[i.type] = (typeCounts[i.type] || 0) + 1;
    });
    
    const mostCommon = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
    
    container.innerHTML = `
        <div class="analysis-result">
            <h4>General Statistics</h4>
            <div class="stat-row">
                <span class="stat-label">Total Incidents:</span>
                <span class="stat-value">${total}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Active Incidents:</span>
                <span class="stat-value">${active}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Resolved Incidents:</span>
                <span class="stat-value">${resolved}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">High Priority:</span>
                <span class="stat-value">${highSeverity}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Most Common Type:</span>
                <span class="stat-value">${mostCommon ? mostCommon[0].replace('_', ' ') : 'N/A'}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Resolution Rate:</span>
                <span class="stat-value">${total > 0 ? Math.round((resolved/total)*100) : 0}%</span>
            </div>
        </div>
    `;
}

// Charts Analysis
function showChartsAnalysis(container) {
    container.innerHTML = `
        <div class="analysis-result">
            <h4>Incident Distribution</h4>
            <canvas id="popup-chart" class="analysis-chart"></canvas>
        </div>
        <div class="analysis-result">
            <h4>Severity Distribution</h4>
            <canvas id="severity-chart" class="analysis-chart"></canvas>
        </div>
    `;
    
    // Create charts
    setTimeout(() => {
        createPopupCharts();
    }, 100);
}

// Clustering Analysis
function showClusteringAnalysis(container) {
    container.innerHTML = `
        <div class="analysis-result">
            <h4>Spatial Clustering</h4>
            <p>Identifying incident hotspots using spatial clustering...</p>
            <button class="btn" onclick="performClustering()">Run Clustering Analysis</button>
            <div id="clustering-results"></div>
        </div>
    `;
}

// Buffer Analysis
function showBufferAnalysis(container) {
    container.innerHTML = `
        <div class="analysis-result">
            <h4>Buffer Zone Analysis</h4>
            <p>Create buffer zones around high-priority incidents.</p>
            <div class="form-group">
                <label>Buffer Distance (meters):</label>
                <input type="number" id="buffer-distance" value="100" min="50" max="500">
            </div>
            <button class="btn" onclick="performBufferAnalysis()">Create Buffer Zones</button>
            <div id="buffer-results"></div>
        </div>
    `;
}

// Density Analysis
function showDensityAnalysis(container) {
    container.innerHTML = `
        <div class="analysis-result">
            <h4>Incident Density Heatmap</h4>
            <p>Generate density heatmap of incident locations.</p>
            <button class="btn" onclick="createDensityMap()">Generate Heatmap</button>
            <div id="density-results"></div>
        </div>
    `;
}

// Analysis implementation functions
function performClustering() {
    // Simple clustering based on proximity
    const clusters = [];
    const processed = new Set();
    const clusterDistance = 0.001; // Adjust based on your coordinate system
    
    incidents.forEach((incident, i) => {
        if (processed.has(i)) return;
        
        const cluster = [incident];
        processed.add(i);
        
        incidents.forEach((other, j) => {
            if (i !== j && !processed.has(j)) {
                const distance = Math.sqrt(
                    Math.pow(incident.location[0] - other.location[0], 2) +
                    Math.pow(incident.location[1] - other.location[1], 2)
                );
                
                if (distance < clusterDistance) {
                    cluster.push(other);
                    processed.add(j);
                }
            }
        });
        
        if (cluster.length > 1) {
            clusters.push(cluster);
        }
    });
    
    // Visualize clusters on map
    clusters.forEach((cluster, i) => {
        const centerLat = cluster.reduce((sum, inc) => sum + inc.location[0], 0) / cluster.length;
        const centerLng = cluster.reduce((sum, inc) => sum + inc.location[1], 0) / cluster.length;
        
        const circle = L.circle([centerLat, centerLng], {
            color: `hsl(${i * 60}, 70%, 50%)`,
            fillColor: `hsl(${i * 60}, 70%, 50%)`,
            fillOpacity: 0.3,
            radius: 50
        }).addTo(map);
        
        circle.bindPopup(`Cluster ${i + 1}: ${cluster.length} incidents`);
        analysisLayers.push(circle);
    });
    
    document.getElementById('clustering-results').innerHTML = `
        <p>Found ${clusters.length} clusters with ${clusters.reduce((sum, c) => sum + c.length, 0)} incidents.</p>
    `;
}

function performBufferAnalysis() {
    const distance = parseInt(document.getElementById('buffer-distance').value);

    // Clear existing buffers
    analysisLayers.forEach(layer => map.removeLayer(layer));
    analysisLayers = [];
    
    const colorMap = {
        'traffic_accident': '#ff4444',
        'traffic_jam': '#ff8800',
        'broken_facility': '#9C27B0',
        'noise': '#795548',
        'road_block': '#607D8B',
        'campus_activity': '#4CAF50',
        'security': '#f44336',
        'maintenance': '#2196F3',
        'other': '#9E9E9E'
    };
    
    const severityMultiplier = {
        'low': 1,
        'medium': 1.5,
        'high': 2,
        'critical': 3
    };
    
    incidents.forEach(incident => {
        const baseRadius = distance * (severityMultiplier[incident.severity] || 1);
        const color = colorMap[incident.type] || '#9E9E9E';
        
        const circle = L.circle(incident.location, {
            color: color,
            fillColor: color,
            fillOpacity: 0.3,
            radius: baseRadius,
            weight: 2
        }).addTo(map);
        
        circle.bindPopup(`
            <strong>${incident.type.replace('_', ' ').toUpperCase()}</strong><br>
            Severity: ${incident.severity}<br>
            Buffer: ${baseRadius}m<br>
            ${incident.description}
        `);
        analysisLayers.push(circle);
    });
    
    document.getElementById('buffer-results').innerHTML = `
        <p>Created ${incidents.length} buffer zones with radius based on severity (${distance}m base).</p>
        <p>Use the <strong>Toggle Analysis</strong> button on the map to show/hide results.</p>
    `;
    
    // Update button state
    const btn = document.getElementById('heatmap-btn');
    btn.style.background = 'rgba(76, 175, 80, 0.9)';
    btn.style.color = 'white';
    analysisVisible = true;
}

function createDensityMap() {
    // Simple density visualization using circles
    const densityGrid = {};
    const gridSize = 0.001;
    
    incidents.forEach(incident => {
        const gridX = Math.floor(incident.location[0] / gridSize);
        const gridY = Math.floor(incident.location[1] / gridSize);
        const key = `${gridX},${gridY}`;
        
        densityGrid[key] = (densityGrid[key] || 0) + 1;
    });
    
    // Clear existing density layers
    analysisLayers.forEach(layer => map.removeLayer(layer));
    analysisLayers = [];
    
    Object.entries(densityGrid).forEach(([key, count]) => {
        const [gridX, gridY] = key.split(',').map(Number);
        const lat = gridX * gridSize;
        const lng = gridY * gridSize;
        
        const intensity = Math.min(count / 3, 1); // Normalize intensity
        const circle = L.circle([lat, lng], {
            color: `rgba(255, 68, 68, ${intensity})`,
            fillColor: `rgba(255, 68, 68, ${intensity * 0.6})`,
            fillOpacity: intensity * 0.6,
            radius: 30 + (count * 10),
            weight: 1
        }).addTo(map);
        
        circle.bindPopup(`Density: ${count} incidents`);
        analysisLayers.push(circle);
    });
    
    document.getElementById('density-results').innerHTML = `
        <p>Generated density map with ${Object.keys(densityGrid).length} density zones.</p>
    `;
}

function createPopupCharts() {
    // Type distribution chart
    const typeCtx = document.getElementById('popup-chart');
    if (typeCtx) {
        const typeCounts = {};
        incidents.forEach(incident => {
            typeCounts[incident.type] = (typeCounts[incident.type] || 0) + 1;
        });
        
        new Chart(typeCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: Object.keys(typeCounts).map(type => type.replace('_', ' ').toUpperCase()),
                datasets: [{
                    data: Object.values(typeCounts),
                    backgroundColor: ['#ff4444', '#ff8800', '#4CAF50', '#2196F3', '#9C27B0', '#795548', '#607D8B', '#f44336', '#9E9E9E']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { 
                        position: 'bottom',
                        labels: { boxWidth: 12, fontSize: 10 }
                    } 
                }
            }
        });
    }
    
    // Severity distribution chart
    const severityCtx = document.getElementById('severity-chart');
    if (severityCtx) {
        const severityCounts = {};
        incidents.forEach(incident => {
            severityCounts[incident.severity] = (severityCounts[incident.severity] || 0) + 1;
        });
        
        new Chart(severityCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: Object.keys(severityCounts).map(s => s.toUpperCase()),
                datasets: [{
                    data: Object.values(severityCounts),
                    backgroundColor: ['#4CAF50', '#FF9800', '#FF5722', '#F44336']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { 
                    y: { 
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    } 
                }
            }
        });
    }
}

function centerMap() {
    map.setView([31.846120, 117.290306], 17);
}

function toggleHeatmap() {
    analysisVisible = !analysisVisible;
    const btn = document.getElementById('heatmap-btn');
    
    if (analysisLayers.length === 0) {
        showNotification('No analysis results to display. Run an analysis first.', 'info');
        return;
    }
    
    analysisLayers.forEach(layer => {
        if (analysisVisible) {
            if (!map.hasLayer(layer)) {
                layer.addTo(map);
            }
            btn.style.background = 'rgba(76, 175, 80, 0.9)';
            btn.style.color = 'white';
        } else {
            if (map.hasLayer(layer)) {
                map.removeLayer(layer);
            }
            btn.style.background = 'rgba(255, 255, 255, 0.95)';
            btn.style.color = '#333';
        }
    });
    
    showNotification(
        analysisVisible ? 'Analysis results shown' : 'Analysis results hidden', 
        'info'
    );
}

function formatTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
}

function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

function showNotification(message, type) {
    const notif = document.getElementById('notification');
    notif.textContent = message;
    notif.className = 'notification ' + type;
    notif.classList.remove('hidden');
    setTimeout(() => notif.classList.add('hidden'), 3000);
    console.log(`Notification: ${message} (${type})`);
}