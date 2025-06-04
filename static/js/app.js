// Global variables
let map;
let markers = [];
let incidents = [];
let selectedLocation = null;
let chart = null;
let incident_id = 0;

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    initMap();
    loadIncidents();
    initChart();
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
    updateAnalytics();
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

    incidents.forEach(incident => {
        const color = colorMap[incident.type] || '#9E9E9E';
        const marker = L.marker(incident.location, {
            icon: L.divIcon({
                className: 'incident-marker',
                html: `<div style="
                        background: ${color};
                        width: 20px;
                        height: 20px;
                        border-radius: 50%;
                        border: 3px solid white;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                        ${incident.status === 'active' ? 'animation: pulse 2s infinite;' : 'opacity: 0.7;'}
                    "></div>`,
                iconSize: [26, 26],
                iconAnchor: [13, 13]
            })
        }).addTo(map);

        marker.bindPopup(`
                <div style="min-width: 200px;">
                    <h4 style="color: ${color}; margin-bottom: 8px;">
                        ${incident.type.replace('_', ' ').toUpperCase()}
                    </h4>
                    <p style="margin-bottom: 8px;">${incident.description}</p>
                    <small style="color: #666;">
                        ${incident.timestamp.toLocaleString()}
                    </small>
                    <div style="margin-top: 8px;">
                        <span style="
                            background: ${incident.status === 'active' ? '#4CAF50' : '#9E9E9E'};
                            color: white;
                            padding: 2px 8px;
                            border-radius: 12px;
                            font-size: 11px;
                        ">${incident.status.toUpperCase()}</span>
                    </div>
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

// Update analytics
function updateAnalytics() {
    const total = incidents.length;
    const active = incidents.filter(i => i.status === 'active').length;
    const resolved = incidents.filter(i => i.status === 'resolved').length;

    document.getElementById('total-incidents').textContent = total;
    document.getElementById('active-incidents').textContent = active;
    document.getElementById('resolved-incidents').textContent = resolved;

    updateChart();
}

// Initialize chart
function initChart() {
    const ctx = document.getElementById('chart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#ff4444', '#ff8800', '#4CAF50', '#2196F3',
                    '#9C27B0', '#795548', '#607D8B', '#f44336', '#9E9E9E'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Update chart
function updateChart() {
    const typeCounts = {};
    incidents.forEach(incident => {
        typeCounts[incident.type] = (typeCounts[incident.type] || 0) + 1;
    });

    chart.data.labels = Object.keys(typeCounts).map(type =>
        type.replace('_', ' ').toUpperCase()
    );
    chart.data.datasets[0].data = Object.values(typeCounts);
    chart.update();
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
    try {
        const response = await fetch('/api/incidents');
        const data = await response.json();
        
        // If no data from API, use sample data
        if (data.length === 0) {
            loadSampleData();
        } else {
            incidents = data.map(incident => ({
                ...incident,
                location: [incident.latitude, incident.longitude],
                timestamp: new Date(incident.timestamp)
            }));
            updateMapMarkers();
            updateIncidentsList();
            updateAnalytics();
        }
    } catch (error) {
        console.error('Error loading incidents:', error);
        loadSampleData(); // Fallback to sample data
    }
}

// Update the submitIncident function to save to database
async function submitIncident() {
    if (!selectedLocation) {
        showNotification('Please select a location on the map', 'error');
        return;
    }

    incident_id += 1;

    const formData = {
        id: incident_id,
        type: document.getElementById('incident-type').value,
        description: document.getElementById('description').value,
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        severity: document.getElementById('severity').value,
        reporter_name: 'Anonymous' // You can add a field for this
    };

    showLoading();

    try {
        const response = await fetch('/api/incidents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            // Reload incidents from database
            await loadIncidents();
            
            // Reset form
            document.getElementById('incident-form').reset();
            if (window.selectionMarker) {
                map.removeLayer(window.selectionMarker);
            }
            selectedLocation = null;
            
            showNotification('Incident reported successfully!', 'success');
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

function centerMap() {
    map.setView([31.846120, 117.290306], 17);
}

function toggleHeatmap() {
    showNotification('Heatmap toggle feature coming soon!', 'info');
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
}