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

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)