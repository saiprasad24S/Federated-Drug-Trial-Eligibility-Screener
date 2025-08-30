import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from src.models.user import db, User
from src.routes.user import user_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = 'asdf#FGSgvasgf$5$WGT'

# Enable CORS for all routes
CORS(app)

app.register_blueprint(user_bp, url_prefix='/api')

# uncomment if you need to use database
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

def init_demo_users():
    """Initialize demo users if they don't exist"""
    # Clear all existing users first
    User.query.delete()
    
    # Create single admin user
    admin_user = User(
        username='SaiPrasad24',
        hospital_name='Y B Sai Prasad',
        email='admin@admin.com',
        role='admin'
    )
    admin_user.set_password('2724')
    db.session.add(admin_user)
    
    db.session.commit()

with app.app_context():
    db.create_all()
    init_demo_users()

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
            return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404

@app.route('/health')
def health_check():
    return jsonify({'status': 'healthy', 'message': 'Federated Learning Platform API is running'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
