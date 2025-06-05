from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from sqlalchemy import func, text
from geoalchemy2 import Geometry
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:1qazmkop@localhost/campus_incidents'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'static/uploads'

db = SQLAlchemy(app)
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

class Incident(db.Model):
    __tablename__ = 'incidents'
    id = db.Column(db.BigInteger, primary_key=True)
    type = db.Column(db.String(64), nullable=False)
    description = db.Column(db.Text, nullable=False)
    severity = db.Column(db.String(16), nullable=False)
    status = db.Column(db.String(16), default='active')
    timestamp = db.Column(db.DateTime, default=datetime.now, nullable=False)
    reporter_name = db.Column(db.String(64))
    location = db.Column(Geometry('POINT', srid=4326), nullable=False)

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/api/incidents', methods=['GET'])
def get_incidents():
    print("GET /api/incidents called")  # Debug log
    try:
        incidents = Incident.query.order_by(Incident.timestamp.desc()).limit(100).all()
        print(f"Found {len(incidents)} incidents in database")  # Debug log
        
        if len(incidents) == 0:
            print("No incidents found in database")
            return jsonify([])
        
        result = []
        for i in incidents:
            try:
                coords_text = db.session.scalar(i.location.ST_AsText())
                print(f"Incident {i.id} coordinates: {coords_text}")  # Debug log

                # PostGIS returns POINT(longitude latitude)
                coords_clean = coords_text.replace('POINT(', '').replace(')', '')
                lon, lat = map(float, coords_clean.split())

                timestamp_str = i.timestamp.isoformat() if i.timestamp else datetime.now().isoformat()
                
                incident_data = {
                    'id': i.id,
                    'type': i.type,
                    'description': i.description,
                    'severity': i.severity,
                    'status': i.status,
                    'timestamp': timestamp_str,
                    'latitude': lat,
                    'longitude': lon,
                    'reporter_name': i.reporter_name
                }
                result.append(incident_data)
                print(f"Processed incident {i.id}: {incident_data}")  # Debug log
                
            except Exception as e:
                print(f"Error processing incident {i.id}: {e}")
                continue
        
        print(f"Returning {len(result)} incidents")  # Debug log
        return jsonify(result)
        
    except Exception as e:
        print(f"Error in get_incidents: {e}")
        import traceback
        traceback.print_exc()
        return jsonify([]), 500  # Return empty array with error status

@app.route('/api/debug/incidents', methods=['GET'])
def debug_incidents():
    try:
        count = Incident.query.count()
        print(f"Total incidents in DB: {count}")
        
        if count > 0:
            latest = Incident.query.order_by(Incident.timestamp.desc()).first()
            return jsonify({
                'total_count': count,
                'latest_incident': {
                    'id': latest.id,
                    'type': latest.type,
                    'description': latest.description,
                    'timestamp': latest.timestamp.isoformat()
                }
            })
        else:
            return jsonify({'total_count': 0, 'message': 'No incidents in database'})
            
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/test/db', methods=['GET'])
def test_db():
    try:
        # Test basic database connection
        result = db.session.execute('SELECT 1 as test').fetchone()
        
        # Test incidents table exists
        table_check = db.session.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_name = 'incidents'
        """).fetchone()
        
        # Count incidents
        count = db.session.execute('SELECT COUNT(*) FROM incidents').scalar()
        
        return jsonify({
            'db_connection': 'OK' if result else 'FAILED',
            'incidents_table_exists': bool(table_check),
            'incidents_count': count
        })
        
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/incidents', methods=['POST'])
def create_incident():
    data = request.get_json()
    required = ['id', 'type', 'description', 'latitude', 'longitude', 'severity']
    for f in required:
        if f not in data:
            return jsonify({'error': f'Missing field: {f}'}), 400

    wkt = f"POINT({data['longitude']} {data['latitude']})"
    
    incident = Incident(
        id=data['id'],
        type=data['type'],
        description=data['description'],
        severity=data['severity'],
        location=func.ST_GeomFromText(wkt, 4326),
        reporter_name=data.get('reporter_name', 'Anonymous'),
        timestamp=datetime.now()
    )
    
    try:
        db.session.add(incident)
        db.session.commit()
        print(f"Successfully created incident {incident.id}")
        return jsonify({'id': incident.id, 'message': 'Incident created successfully'}), 201
    except Exception as e:
        print(f"Error creating incident: {e}")
        db.session.rollback()
        return jsonify({'error': 'Failed to create incident'}), 500

@app.route('/api/incidents/<int:incident_id>', methods=['PUT'])
def update_incident(incident_id):
    data = request.get_json()
    incident = Incident.query.get_or_404(incident_id)
    if 'status' in data:
        incident.status = data['status']
    if 'severity' in data:
        incident.severity = data['severity']
    if 'description' in data:
        incident.description = data['description']
    db.session.commit()
    return jsonify({'message': 'Incident updated successfully'})

@app.route('/api/analysis/clustering', methods=['GET'])
def get_clustering_analysis():
    # Using PostGIS for spatial clustering
    query = text("""
        SELECT 
            ST_ClusterKMeans(location, 3) OVER() as cluster_id,
            ST_X(location) as longitude,
            ST_Y(location) as latitude,
            type,
            severity,
            COUNT(*) OVER(PARTITION BY ST_ClusterKMeans(location, 3) OVER()) as cluster_size
        FROM incidents
        WHERE status = 'active'
    """)
    
    result = db.session.execute(query)
    clusters = {}
    
    for row in result:
        cluster_id = row.cluster_id
        if cluster_id not in clusters:
            clusters[cluster_id] = {
                'id': cluster_id,
                'incidents': [],
                'center': [0, 0],
                'size': row.cluster_size
            }
        
        clusters[cluster_id]['incidents'].append({
            'longitude': row.longitude,
            'latitude': row.latitude,
            'type': row.type,
            'severity': row.severity
        })
    
    # Calculate cluster centers
    for cluster in clusters.values():
        if cluster['incidents']:
            avg_lat = sum(inc['latitude'] for inc in cluster['incidents']) / len(cluster['incidents'])
            avg_lng = sum(inc['longitude'] for inc in cluster['incidents']) / len(cluster['incidents'])
            cluster['center'] = [avg_lat, avg_lng]
    
    return jsonify(list(clusters.values()))

@app.route('/api/analysis/buffer/<int:distance>', methods=['GET'])
def get_buffer_analysis(distance):
    # Buffer analysis for high-priority incidents
    query = text(f"""
        SELECT 
            id,
            type,
            description,
            ST_X(location) as longitude,
            ST_Y(location) as latitude,
            ST_AsGeoJSON(ST_Buffer(location::geography, {distance})) as buffer_geom
        FROM incidents 
        WHERE severity IN ('high', 'critical') AND status = 'active'
    """)
    
    result = db.session.execute(query)
    buffers = []
    
    for row in result:
        buffers.append({
            'id': row.id,
            'type': row.type,
            'description': row.description,
            'center': [row.latitude, row.longitude],
            'buffer': row.buffer_geom,
            'radius': distance
        })
    
    return jsonify(buffers)

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    ext = file.filename.rsplit('.', 1)[1].lower()
    if ext not in {'png', 'jpg', 'jpeg', 'gif'}:
        return jsonify({'error': 'Invalid file type'}), 400

    filename = datetime.now().strftime('%Y%m%d_%H%M%S_') + file.filename
    path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(path)
    return jsonify({'filename': filename, 'path': f'/static/uploads/{filename}'})

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
    app.run(debug=True, host='0.0.0.0', port=5000)