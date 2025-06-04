from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import json
from datetime import datetime, timedelta
import pandas as pd
import geopandas as gpd
from shapely.geometry import Point
import numpy as np
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

# Configuration
DATABASE = 'campus_incidents.db'
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def init_db():
    """Initialize the database with required tables"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Create incidents table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS incidents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            description TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            severity TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            reporter_name TEXT,
            image_path TEXT
        )
    ''')
    
    # Create users table for future use
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Insert sample data if table is empty
    cursor.execute('SELECT COUNT(*) FROM incidents')
    if cursor.fetchone()[0] == 0:
        sample_data = [
            ('traffic_accident', 'Minor collision at main entrance', 40.7589, -73.9851, 'medium', 'active', datetime.now() - timedelta(hours=2)),
            ('broken_facility', 'Broken water fountain in library', 40.7599, -73.9841, 'low', 'resolved', datetime.now() - timedelta(hours=4)),
            ('campus_activity', 'Student concert at main quad', 40.7579, -73.9861, 'low', 'active', datetime.now() - timedelta(hours=1)),
            ('road_block', 'Construction blocking north entrance', 40.7605, -73.9835, 'high', 'active', datetime.now() - timedelta(hours=6)),
            ('noise', 'Loud construction work near dormitory', 40.7585, -73.9875, 'medium', 'active', datetime.now() - timedelta(minutes=30)),
            ('maintenance', 'Elevator maintenance in science building', 40.7595, -73.9845, 'low', 'active', datetime.now() - timedelta(hours=3)),
            ('security', 'Suspicious activity reported near parking lot', 40.7575, -73.9855, 'high', 'resolved', datetime.now() - timedelta(hours=8)),
            ('traffic_jam', 'Heavy traffic during peak hours', 40.7580, -73.9870, 'medium', 'resolved', datetime.now() - timedelta(hours=5))
        ]
        
        cursor.executemany('''
            INSERT INTO incidents (type, description, latitude, longitude, severity, status, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', sample_data)
    
    conn.commit()
    conn.close()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/api/incidents', methods=['GET'])
def get_incidents():
    """Get all incidents with optional filtering"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Get query parameters
    incident_type = request.args.get('type')
    status = request.args.get('status')
    severity = request.args.get('severity')
    limit = request.args.get('limit', 100)
    
    # Build query
    query = 'SELECT * FROM incidents WHERE 1=1'
    params = []
    
    if incident_type:
        query += ' AND type = ?'
        params.append(incident_type)
    
    if status:
        query += ' AND status = ?'
        params.append(status)
    
    if severity:
        query += ' AND severity = ?'
        params.append(severity)
    
    query += ' ORDER BY timestamp DESC LIMIT ?'
    params.append(limit)
    
    cursor.execute(query, params)
    incidents = cursor.fetchall()
    
    # Convert to list of dictionaries
    columns = [description[0] for description in cursor.description]
    incidents_list = [dict(zip(columns, incident)) for incident in incidents]
    
    conn.close()
    return jsonify(incidents_list)

@app.route('/api/incidents', methods=['POST'])
def create_incident():
    """Create a new incident"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    required_fields = ['type', 'description', 'latitude', 'longitude', 'severity']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing field: {field}'}), 400
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO incidents (type, description, latitude, longitude, severity, reporter_name)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        data['type'],
        data['description'],
        data['latitude'],
        data['longitude'],
        data['severity'],
        data.get('reporter_name', 'Anonymous')
    ))
    
    incident_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({'id': incident_id, 'message': 'Incident created successfully'}), 201

@app.route('/api/incidents/<int:incident_id>', methods=['PUT'])
def update_incident(incident_id):
    """Update an incident (e.g., change status)"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Check if incident exists
    cursor.execute('SELECT id FROM incidents WHERE id = ?', (incident_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Incident not found'}), 404
    
    # Update fields
    update_fields = []
    params = []
    
    for field in ['status', 'severity', 'description']:
        if field in data:
            update_fields.append(f'{field} = ?')
            params.append(data[field])
    
    if not update_fields:
        conn.close()
        return jsonify({'error': 'No valid fields to update'}), 400
    
    params.append(incident_id)
    query = f'UPDATE incidents SET {", ".join(update_fields)} WHERE id = ?'
    
    cursor.execute(query, params)
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Incident updated successfully'})

@app.route('/api/analytics/summary', methods=['GET'])
def get_analytics_summary():
    """Get analytics summary"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Total incidents
    cursor.execute('SELECT COUNT(*) FROM incidents')
    total = cursor.fetchone()[0]
    
    # Active incidents
    cursor.execute('SELECT COUNT(*) FROM incidents WHERE status = "active"')
    active = cursor.fetchone()[0]
    
    # Resolved incidents
    cursor.execute('SELECT COUNT(*) FROM incidents WHERE status = "resolved"')
    resolved = cursor.fetchone()[0]
    
    # Incidents by type
    cursor.execute('''
        SELECT type, COUNT(*) as count 
        FROM incidents 
        GROUP BY type 
        ORDER BY count DESC
    ''')
    by_type = dict(cursor.fetchall())
    
    # Incidents by severity
    cursor.execute('''
        SELECT severity, COUNT(*) as count 
        FROM incidents 
        GROUP BY severity 
        ORDER BY count DESC
    ''')
    by_severity = dict(cursor.fetchall())
    
    # Recent incidents (last 24 hours)
    cursor.execute('''
        SELECT COUNT(*) FROM incidents 
        WHERE timestamp > datetime('now', '-1 day')
    ''')
    recent = cursor.fetchone()[0]
    
    conn.close()
    
    return jsonify({
        'total': total,
        'active': active,
        'resolved': resolved,
        'recent_24h': recent,
        'by_type': by_type,
        'by_severity': by_severity
    })

@app.route('/api/analytics/heatmap', methods=['GET'])
def get_heatmap_data():
    """Get heatmap data for incident locations"""
    conn = sqlite3.connect(DATABASE)
    
    # Get incidents with coordinates
    df = pd.read_sql_query('''
        SELECT latitude, longitude, type, severity, timestamp
        FROM incidents
        WHERE status = 'active'
    ''', conn)
    
    conn.close()
    
    if df.empty:
        return jsonify([])
    
    # Create GeoDataFrame
    geometry = [Point(lon, lat) for lon, lat in zip(df['longitude'], df['latitude'])]
    gdf = gpd.GeoDataFrame(df, geometry=geometry)
    
    # Convert to heatmap format
    heatmap_data = []
    for _, row in gdf.iterrows():
        # Weight based on severity
        weight_map = {'low': 1, 'medium': 2, 'high': 3, 'critical': 4}
        weight = weight_map.get(row['severity'], 1)
        
        heatmap_data.append({
            'lat': row['latitude'],
            'lng': row['longitude'],
            'weight': weight,
            'type': row['type']
        })
    
    return jsonify(heatmap_data)

@app.route('/api/analytics/clusters', methods=['GET'])
def get_cluster_analysis():
    """Get cluster analysis of incidents"""
    conn = sqlite3.connect(DATABASE)
    
    df = pd.read_sql_query('''
        SELECT latitude, longitude, type, severity, timestamp
        FROM incidents
    ''', conn)
    
    conn.close()
    
    if len(df) < 3:
        return jsonify({'clusters': [], 'message': 'Not enough data for clustering'})
    
    # Simple spatial clustering based on distance
    from sklearn.cluster import DBSCAN
    
    # Prepare coordinates
    coords = df[['latitude', 'longitude']].values
    
    # Perform clustering (eps in degrees, roughly 100 meters)
    clustering = DBSCAN(eps=0.001, min_samples=2).fit(coords)
    df['cluster'] = clustering.labels_
    
    # Get cluster centers and statistics
    clusters = []
    for cluster_id in set(clustering.labels_):
        if cluster_id == -1:  # Noise points
            continue
        
        cluster_data = df[df['cluster'] == cluster_id]
        
        clusters.append({
            'id': int(cluster_id),
            'center': {
                'lat': float(cluster_data['latitude'].mean()),
                'lng': float(cluster_data['longitude'].mean())
            },
            'count': len(cluster_data),
            'types': cluster_data['type'].value_counts().to_dict(),
            'severity_distribution': cluster_data['severity'].value_counts().to_dict()
        })
    
    return jsonify({'clusters': clusters})

@app.route('/api/analytics/trends', methods=['GET'])
def get_trend_analysis():
    """Get trend analysis over time"""
    conn = sqlite3.connect(DATABASE)
    
    # Get daily incident counts for the last 30 days
    cursor = conn.cursor()
    cursor.execute('''
        SELECT 
            DATE(timestamp) as date,
            COUNT(*) as count,
            type
        FROM incidents
        WHERE timestamp > datetime('now', '-30 days')
        GROUP BY DATE(timestamp), type
        ORDER BY date DESC
    ''')
    
    daily_data = cursor.fetchall()
    
    # Get hourly distribution
    cursor.execute('''
        SELECT 
            CAST(strftime('%H', timestamp) AS INTEGER) as hour,
            COUNT(*) as count
        FROM incidents
        GROUP BY hour
        ORDER BY hour
    ''')
    
    hourly_data = cursor.fetchall()
    
    conn.close()
    
    # Format daily data
    daily_trends = {}
    for date, count, incident_type in daily_data:
        if date not in daily_trends:
            daily_trends[date] = {}
        daily_trends[date][incident_type] = count
    
    # Format hourly data
    hourly_trends = {hour: count for hour, count in hourly_data}
    
    return jsonify({
        'daily_trends': daily_trends,
        'hourly_distribution': hourly_trends
    })

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Upload image for incident"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Add timestamp to avoid conflicts
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
        filename = timestamp + filename
        
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        return jsonify({'filename': filename, 'path': f'/static/uploads/{filename}'})
    
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/static/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Initialize database
    init_db()
    
    # Run the application
    app.run(debug=True, host='0.0.0.0', port=5000)