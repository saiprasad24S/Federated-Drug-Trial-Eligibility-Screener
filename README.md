# MedFed - Federated Learning Platform for Drug Trials

## Overview
This is a complete federated learning platform for drug trials that allows hospitals to collaborate securely while preserving patient privacy. The application has been fully updated with a working backend and authentication system.

## What's Fixed
- ✅ **Login Authentication**: Built a complete Flask backend with JWT-based authentication
- ✅ **Demo Credentials**: Pre-configured demo users for testing
- ✅ **Database Integration**: SQLite database with proper user management
- ✅ **CORS Support**: Cross-origin requests enabled for frontend-backend communication
- ✅ **Deployment Ready**: Both local and production deployment configurations

## Admin Credentials
Use these credentials to log in:

- **Y B Sai Prasad**: `SaiPrasad24` / `2724`

## Live Demo
The application is deployed and accessible at: **https://nghki1cz6mgv.manus.space**

## Project Structure
```
├── federated-learning-platform/     # React Frontend
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── dist/                        # Built frontend files
├── federated-backend/               # Flask Backend
│   ├── src/
│   │   ├── models/                  # Database models
│   │   ├── routes/                  # API routes
│   │   ├── static/                  # Frontend files (for deployment)
│   │   └── main.py                  # Main Flask application
│   ├── venv/                        # Python virtual environment
│   └── requirements.txt             # Python dependencies
└── README.md                        # This file
```

## Local Development

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd federated-backend
   ```

2. Activate the virtual environment:
   ```bash
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the Flask server:
   ```bash
   python src/main.py
   ```

The backend will be available at `http://localhost:5000`

### Frontend Setup (Development)
1. Navigate to the frontend directory:
   ```bash
   cd federated-learning-platform
   ```

2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend development server will be available at `http://localhost:5173`

### Full-Stack Deployment
For production deployment, the frontend is built and served from the Flask backend:

1. Build the frontend:
   ```bash
   cd federated-learning-platform
   npm run build
   ```

2. Copy built files to Flask static directory:
   ```bash
   cp -r dist/* ../federated-backend/src/static/
   ```

3. Run the Flask server:
   ```bash
   cd ../federated-backend
   source venv/bin/activate
   python src/main.py
   ```

The complete application will be available at `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Token verification

### User Management
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `GET /api/users/<id>` - Get specific user
- `PUT /api/users/<id>` - Update user
- `DELETE /api/users/<id>` - Delete user

### Utility
- `GET /health` - Health check endpoint
- `POST /api/seed-demo-users` - Seed database with demo users

## Features
- **Secure Authentication**: JWT-based authentication with password hashing
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Dashboard**: Interactive charts and statistics
- **Multi-hospital Support**: Support for multiple hospital networks
- **Privacy Focused**: HIPAA compliant design with end-to-end encryption
- **Modern UI**: Built with React, Tailwind CSS, and Shadcn/UI components

## Technologies Used
- **Frontend**: React, Vite, Tailwind CSS, Shadcn/UI, Lucide Icons
- **Backend**: Flask, SQLAlchemy, JWT, Flask-CORS
- **Database**: SQLite (development), easily configurable for PostgreSQL/MySQL
- **Authentication**: JWT tokens with secure password hashing

## Security Features
- Password hashing using Werkzeug's security utilities
- JWT token-based authentication
- CORS protection
- SQL injection prevention through SQLAlchemy ORM
- Secure session management

## Notes
- The application automatically creates demo users on first startup
- Database is automatically initialized with the required schema
- All API endpoints support JSON request/response format
- The application is configured to run on `0.0.0.0:5000` for deployment compatibility

## Support
For any issues or questions, please refer to the deployment logs or contact support.

