from flask import Blueprint, jsonify, request
from src.models.user import User, db
import jwt
from datetime import datetime, timedelta
import os

user_bp = Blueprint('user', __name__)

# Secret key for JWT tokens
JWT_SECRET = os.environ.get('JWT_SECRET', 'federated-learning-secret-key')

def generate_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def verify_token(token):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

@user_bp.route('/auth/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'message': 'Username and password required'}), 400
    
    user = User.query.filter_by(username=username).first()
    
    if not user or not user.check_password(password):
        return jsonify({'message': 'Invalid credentials'}), 401
    
    token = generate_token(user.id)
    
    return jsonify({
        'token': token,
        'user': user.to_dict()
    })

@user_bp.route('/auth/verify', methods=['GET'])
def verify():
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'message': 'Token required'}), 401
    
    token = auth_header.split(' ')[1]
    user_id = verify_token(token)
    
    if not user_id:
        return jsonify({'message': 'Invalid or expired token'}), 401
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    return jsonify({'user': user.to_dict()})

@user_bp.route('/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])

@user_bp.route('/users', methods=['POST'])
def create_user():
    data = request.json
    user = User(
        username=data['username'], 
        hospital_name=data['hospital_name'],
        email=data.get('email', ''),
        role=data.get('role', 'admin')
    )
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201

@user_bp.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())

@user_bp.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.json
    user.username = data.get('username', user.username)
    user.hospital_name = data.get('hospital_name', user.hospital_name)
    user.email = data.get('email', user.email)
    user.role = data.get('role', user.role)
    if 'password' in data:
        user.set_password(data['password'])
    db.session.commit()
    return jsonify(user.to_dict())

@user_bp.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return '', 204

@user_bp.route('/seed-demo-users', methods=['POST'])
def seed_demo_users():
    """Seed the database with demo users"""
    demo_users = [
        {'username': 'mayo_admin', 'password': 'demo123', 'hospital_name': 'Mayo Clinic'},
        {'username': 'jh_admin', 'password': 'demo123', 'hospital_name': 'Johns Hopkins'},
        {'username': 'cc_admin', 'password': 'demo123', 'hospital_name': 'Cleveland Clinic'},
    ]
    
    for user_data in demo_users:
        existing_user = User.query.filter_by(username=user_data['username']).first()
        if not existing_user:
            user = User(
                username=user_data['username'],
                hospital_name=user_data['hospital_name'],
                email=f"{user_data['username']}@{user_data['hospital_name'].lower().replace(' ', '')}.com",
                role='admin'
            )
            user.set_password(user_data['password'])
            db.session.add(user)
    
    db.session.commit()
    return jsonify({'message': 'Demo users seeded successfully'})
