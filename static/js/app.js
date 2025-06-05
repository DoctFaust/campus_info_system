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
            id: 0,
            type: 'traffic_accident',
            description: 'Minor collision at main entrance',
            location: [31.847120, 117.290306],
            severity: 'medium',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
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
        '交通事故': '#f66262',
        '交通堵塞': '#f9ab52',
        '设施损坏': '#9b6dd4',
        '噪声扰民': 'rgb(48, 255, 183)',
        '道路施工': '#f1a8b1',
        '文艺活动': '#53cae8',
        '体育活动': '#1fc625',
        '物品丢失': '#3f3cff',
        '安全隐患': '#f82020',
        '其它事件/活动': '#c5c7c5',
    };
    
    const iconMap = {
        '交通事故': '🚗',
        '交通堵塞': '🚦',
        '设施损坏': '🔧',
        '噪声扰民': '🔊',
        '道路施工': '🚧',
        '文艺活动': '🎉',
        '体育活动': '⚽',
        '物品丢失': '🔍',
        '安全隐患': '🛡️',
        '其它事件/活动': '📋',
    };

    incidents.forEach(incident => {
        const color = colorMap[incident.type] || '#9E9E9E';
        const icon = iconMap[incident.type] || '❓';
        const size = incident.severity === 'critical' ? 35 : incident.severity === 'high' ? 30 : 25;
        const pulseAnimation = incident.status === 'active' ? 'animation: pulse 2s infinite;' : '';
        let border_color = '#ffffff';
        switch (incident.severity) {
            case 'critical': border_color = '#ff0000'; break;
            case 'high': border_color = '#ff5722'; break;
            case 'medium': border_color = '#ff9800'; break;
            case 'low': border_color = '#4caf50'; break;
        }
        
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
                            border: 3px solid ${border_color};
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
                                border: 2px solid ${border_color};
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
        }).addTo(map).bindPopup('查找结果').openPopup();
        
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
            title.textContent = '统计信息';
            showStatisticsAnalysis(content);
            break;
        case 'charts':
            title.textContent = '统计图表';
            showChartsAnalysis(content);
            break;
        case 'clustering':
            title.textContent = '聚类分析';
            showClusteringAnalysis(content);
            break;
        case 'buffer':
            title.textContent = '缓冲区分析';
            showBufferAnalysis(content);
            break;
        case 'ellipse':
            title.textContent = '标准差椭圆';
            showEllipseAnalysis(content);
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
            <h4>综合统计数据</h4>
            <div class="stat-row">
                <span class="stat-label">总事件/活动数量:</span>
                <span class="stat-value">${total}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">进行中数量:</span>
                <span class="stat-value">${active}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">已结束数量:</span>
                <span class="stat-value">${resolved}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">高优先度事件("重要"或"高"等级)数量:</span>
                <span class="stat-value">${highSeverity}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">最常见事件/活动类别:</span>
                <span class="stat-value">${mostCommon ? mostCommon[0].replace('_', ' ') : 'N/A'}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">已结束比例:</span>
                <span class="stat-value">${total > 0 ? Math.round((resolved/total)*100) : 0}%</span>
            </div>
        </div>
    `;
}

// Charts Analysis
function showChartsAnalysis(container) {
    container.innerHTML = `
        <div class="analysis-result">
            <h4>事件/活动种类分布</h4>
            <canvas id="popup-chart" class="analysis-chart"></canvas>
        </div>
        <div class="analysis-result">
            <h4>事件/活动等级分布</h4>
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
            <h4>空间聚类分析</h4>
            <p>利用空间聚类算法识别事件热点区域。</p>
            <button class="btn" onclick="performClustering()">开始分析</button>
            <div id="clustering-results"></div>
        </div>
    `;
}

// Buffer Analysis
function showBufferAnalysis(container) {
    container.innerHTML = `
        <div class="analysis-result">
            <h4>缓冲区分析</h4>
            <p>为事件点创建缓冲区。</p>
            <div class="form-group">
                <label>最小缓冲区半径(m):</label>
                <input type="number" id="buffer-distance" value="30" min="50" max="500">
            </div>
            <button class="btn" onclick="performBufferAnalysis()">创建缓冲区</button>
            <div id="buffer-results"></div>
        </div>
    `;
}

// Ellipse Analysis
function showEllipseAnalysis(container) {
    container.innerHTML = `
        <div class="analysis-result">
            <h4>标准差椭圆</h4>
            <p>创建各类别事件的标准差椭圆，指示其空间分布区域和趋势。</p>
            <button class="btn" onclick="createEllipseMap()">生成标准差椭圆</button>
            <div id="ellipse-results"></div>
        </div>
    `;
}

// Analysis implementation functions
function performClustering() {
    // Simple clustering based on proximity
    const clusters = [];
    const processed = new Set();
    const clusterDistance = 0.001; // Depends coordinate system
    
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
        
        circle.bindPopup(`包含 ${i + 1}: ${cluster.length} 个事件点`);
        analysisLayers.push(circle);
    });
    
    document.getElementById('clustering-results').innerHTML = `
        <p>共创建 ${clusters.length} 个聚类，包含 ${clusters.reduce((sum, c) => sum + c.length, 0)} 个事件点。</p>
    `;
}

function performBufferAnalysis() {
    const distance = parseInt(document.getElementById('buffer-distance').value);

    // Clear existing buffers
    analysisLayers.forEach(layer => map.removeLayer(layer));
    analysisLayers = [];
    
    const colorMap = {
        '交通事故': '#f66262',
        '交通堵塞': '#f9ab52',
        '设施损坏': '#9b6dd4',
        '噪声扰民': 'rgb(48, 255, 183)',
        '道路施工': '#f1a8b1',
        '文艺活动': '#53cae8',
        '体育活动': '#1fc625',
        '物品丢失': '#3f3cff',
        '安全隐患': '#f82020',
        '其它事件/活动': '#c5c7c5',
    };
    
    const severityMultiplier = {
        'low': 1,
        'medium': 1.5,
        'high': 2,
        'critical': 2.5
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
            等级: ${incident.severity}<br>
            半径: ${baseRadius}m<br>
            ${incident.description}
        `);
        analysisLayers.push(circle);
    });
    
    document.getElementById('buffer-results').innerHTML = `
        <p>创建了 ${incidents.length} 个缓冲区，大小和事件等级相关联，初始半径为 (${distance}m 。).</p>
    `;
    
    // Update button state
    const btn = document.getElementById('heatmap-btn');
    btn.style.background = 'rgba(76, 175, 80, 0.9)';
    btn.style.color = 'white';
    analysisVisible = true;
}

function createEllipseMap() {
    // Clear existing ellipse layers
    analysisLayers.forEach(layer => map.removeLayer(layer));
    analysisLayers = [];
    
    // Color map for different incident types (same as your existing colorMap)
    const colorMap = {
        '交通事故': '#f66262',
        '交通堵塞': '#f9ab52',
        '设施损坏': '#9b6dd4',
        '噪声扰民': 'rgb(48, 255, 183)',
        '道路施工': '#f1a8b1',
        '文艺活动': '#53cae8',
        '体育活动': '#1fc625',
        '物品丢失': '#3f3cff',
        '安全隐患': '#f82020',
        '其它事件/活动': '#c5c7c5',
    };
    
    // Group incidents by type
    const incidentsByType = {};
    incidents.forEach(incident => {
        if (!incidentsByType[incident.type]) {
            incidentsByType[incident.type] = [];
        }
        incidentsByType[incident.type].push(incident);
    });
    
    let ellipseCount = 0;
    
    // Create standard deviational ellipse for each incident type
    Object.entries(incidentsByType).forEach(([type, typeIncidents]) => {
        if (typeIncidents.length < 3) {
            console.log(`Skipping ${type}: need at least 3 incidents for ellipse`);
            return; // Need at least 3 points for meaningful ellipse
        }
        
        const ellipseData = calculateStandardDeviationalEllipse(typeIncidents);
        if (!ellipseData) return;
        
        const color = colorMap[type] || '#9E9E9E';
        
        // Create ellipse polygon
        const ellipsePoints = generateEllipsePoints(
            ellipseData.centerLat,
            ellipseData.centerLng,
            ellipseData.semiMajorAxis,
            ellipseData.semiMinorAxis,
            ellipseData.rotation
        );
        
        const ellipse = L.polygon(ellipsePoints, {
            color: color,
            fillColor: color,
            fillOpacity: 0.2,
            weight: 3,
            opacity: 0.8,
            dashArray: '5, 5'
        }).addTo(map);
        
        // Add popup with ellipse information
        ellipse.bindPopup(`
            <div style="font-family: 'Segoe UI', sans-serif; min-width: 200px;">
                <h4 style="color: ${color}; margin: 0 0 10px 0;">
                    ${type.replace('_', ' ').toUpperCase()}  空间分布
                </h4>
                <div style="font-size: 12px; line-height: 1.4;">
                    <strong>事件数:</strong> ${typeIncidents.length}<br>
                    <strong>分布中心:</strong> ${ellipseData.centerLat.toFixed(6)}, ${ellipseData.centerLng.toFixed(6)}<br>
                    <strong>长轴:</strong> ${ellipseData.semiMajorAxis.toFixed(1)}m<br>
                    <strong>短轴:</strong> ${ellipseData.semiMinorAxis.toFixed(1)}m<br>
                    <strong>旋转角度:</strong> ${ellipseData.rotation.toFixed(1)}°
                </div>
            </div>
        `);
        
        // Add center point marker
        const centerMarker = L.circleMarker([ellipseData.centerLat, ellipseData.centerLng], {
            color: color,
            fillColor: color,
            fillOpacity: 0.8,
            radius: 6,
            weight: 2
        }).addTo(map);
        
        centerMarker.bindPopup(`Center of ${type.replace('_', ' ')} incidents`);
        
        analysisLayers.push(ellipse);
        analysisLayers.push(centerMarker);
        ellipseCount++;
    });
    
    document.getElementById('ellipse-results').innerHTML = `
        <p>生成了 ${ellipseCount} 个标准差椭圆。</p>
        <p>每个椭圆代表一类事件的总体空间分布位置与趋势。</p>
    `;
    
    // Update button state
    const btn = document.getElementById('heatmap-btn');
    btn.style.background = 'rgba(76, 175, 80, 0.9)';
    btn.style.color = 'white';
    analysisVisible = true;
    
    showNotification(`Created ${ellipseCount} deviational ellipses`, 'success');
}

function calculateStandardDeviationalEllipse(incidents) {
    if (incidents.length < 3) return null;
    
    // Calculate mean center
    const meanLat = incidents.reduce((sum, inc) => sum + inc.location[0], 0) / incidents.length;
    const meanLng = incidents.reduce((sum, inc) => sum + inc.location[1], 0) / incidents.length;
    
    // Convert to approximate meters for calculation (rough conversion for small areas)
    const latToMeters = 111320; // meters per degree latitude (approximate)
    const lngToMeters = Math.cos(meanLat * Math.PI / 180) * 111320; // meters per degree longitude
    
    // Calculate deviations from mean in meters
    const deviations = incidents.map(inc => ({
        x: (inc.location[1] - meanLng) * lngToMeters, // longitude deviation in meters
        y: (inc.location[0] - meanLat) * latToMeters   // latitude deviation in meters
    }));
    
    // Calculate variance-covariance matrix elements
    const n = incidents.length;
    let sumX2 = 0, sumY2 = 0, sumXY = 0;
    
    deviations.forEach(dev => {
        sumX2 += dev.x * dev.x;
        sumY2 += dev.y * dev.y;
        sumXY += dev.x * dev.y;
    });
    
    const varX = sumX2 / (n - 1);
    const varY = sumY2 / (n - 1);
    const covarXY = sumXY / (n - 1);
    
    // Calculate eigenvalues and eigenvectors for ellipse orientation
    const trace = varX + varY;
    const determinant = varX * varY - covarXY * covarXY;
    const discriminant = Math.sqrt(trace * trace - 4 * determinant);
    
    const eigenvalue1 = (trace + discriminant) / 2;
    const eigenvalue2 = (trace - discriminant) / 2;
    
    // Semi-axes lengths (1 standard deviation)
    const semiMajorAxis = Math.sqrt(Math.max(eigenvalue1, eigenvalue2));
    const semiMinorAxis = Math.sqrt(Math.min(eigenvalue1, eigenvalue2));
    
    // Rotation angle (in degrees)
    let rotation = 0;
    if (Math.abs(covarXY) > 1e-10) {
        rotation = Math.atan2(2 * covarXY, varX - varY) / 2;
        rotation = rotation * 180 / Math.PI; // Convert to degrees
    }
    
    return {
        centerLat: meanLat,
        centerLng: meanLng,
        semiMajorAxis: semiMajorAxis,
        semiMinorAxis: semiMinorAxis,
        rotation: rotation
    };
}

function generateEllipsePoints(centerLat, centerLng, semiMajorAxis, semiMinorAxis, rotation, numPoints = 64) {
    const points = [];
    const rotationRad = rotation * Math.PI / 180;
    
    // Approximate conversion factors
    const latToMeters = 111320;
    const lngToMeters = Math.cos(centerLat * Math.PI / 180) * 111320;
    
    for (let i = 0; i < numPoints; i++) {
        const angle = (2 * Math.PI * i) / numPoints;
        
        // Calculate point on ellipse in local coordinate system
        const x = semiMajorAxis * Math.cos(angle);
        const y = semiMinorAxis * Math.sin(angle);
        
        // Rotate the point
        const rotatedX = x * Math.cos(rotationRad) - y * Math.sin(rotationRad);
        const rotatedY = x * Math.sin(rotationRad) + y * Math.cos(rotationRad);
        
        // Convert back to lat/lng
        const lat = centerLat + rotatedY / latToMeters;
        const lng = centerLng + rotatedX / lngToMeters;
        
        points.push([lat, lng]);
    }
    
    return points;
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
                    backgroundColor: ['#f66262','#f9ab52','#9b6dd4','rgb(48, 255, 183)','#f1a8b1','#53cae8','#1fc625','#3f3cff','#f82020','#c5c7c5']
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
                    backgroundColor: ['#f66262','#f9ab52','#9b6dd4','rgb(48, 255, 183)','#f1a8b1','#53cae8','#1fc625','#3f3cff','#f82020','#c5c7c5']
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