from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from sqlalchemy import func
from geoalchemy2 import Geometry
from datetime import datetime
import os

# Configuration
app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:1qazmkop@localhost/campus_incidents'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'static/uploads'

db = SQLAlchemy(app)
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Models
class Incident(db.Model):
    __tablename__ = 'incidents'
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(64), nullable=False)
    description = db.Column(db.Text, nullable=False)
    severity = db.Column(db.String(16), nullable=False)
    status = db.Column(db.String(16), default='active')
    timestamp = db.Column(db.DateTime, server_default=func.now())
    reporter_name = db.Column(db.String(64))
    location = db.Column(Geometry('POINT', srid=4326), nullable=False)

# Routes
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/api/incidents', methods=['GET'])
def get_incidents():
    incidents = Incident.query.order_by(Incident.timestamp.desc()).limit(100).all()
    result = []
    for i in incidents:
        lon, lat = map(float, db.session.scalar(i.location.ST_AsText()).strip('POINT()').split())
        result.append({
            'id': i.id,
            'type': i.type,
            'description': i.description,
            'severity': i.severity,
            'status': i.status,
            'timestamp': i.timestamp.isoformat(),
            'latitude': lat,
            'longitude': lon,
            'reporter_name': i.reporter_name
        })
    return jsonify(result)

@app.route('/api/incidents', methods=['POST'])
def create_incident():
    data = request.get_json()
    required = ['type', 'description', 'latitude', 'longitude', 'severity']
    for f in required:
        if f not in data:
            return jsonify({'error': f'Missing field: {f}'}), 400

    wkt = f"POINT({data['longitude']} {data['latitude']})"
    incident = Incident(
        type=data['type'],
        description=data['description'],
        severity=data['severity'],
        location=func.ST_GeomFromText(wkt, 4326),
        reporter_name=data.get('reporter_name', 'Anonymous')
    )
    db.session.add(incident)
    db.session.commit()
    return jsonify({'id': incident.id, 'message': 'Incident created successfully'}), 201

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