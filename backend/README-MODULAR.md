# Smart Farming Backend - Modular Structure

## 📁 Project Structure

```
backend/
├── config/
│   ├── database.js          # MongoDB connection
│   └── index.js             # Configuration settings
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── chatController.js    # Chatbot functionality
│   ├── motorController.js   # Motor control logic
│   ├── sensorController.js  # Sensor data handling
│   ├── weatherController.js # Weather API integration
│   └── deviceController.js  # Device status monitoring
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── chat.js              # Chat routes
│   ├── motor.js             # Motor control routes
│   ├── sensors.js           # Sensor data routes
│   ├── weather.js           # Weather API routes
│   └── device.js            # Device status routes
├── utils/
│   ├── api.js               # External API utilities (ThingSpeak, ML Model)
│   └── auth.js              # Authentication utilities
├── server.js                # Main server file (modular)
├── server-backup.js         # Original server backup
└── package.json
```

## 🚀 Features Maintained

### ✅ Authentication System
- JWT-based authentication
- Mock mode when MongoDB unavailable
- Password hashing and verification

### ✅ Chatbot Integration
- Gemini AI integration
- ThingSpeak sensor context
- Chat history logging
- Multilingual support

### ✅ Motor Control
- ThingSpeak field3 updates
- Rate limiting (15 seconds)
- Status monitoring

### ✅ Sensor Data
- Real-time sensor readings
- Device online/offline status
- Historical data access
- Field mapping (field1=temp, field2=moisture)

### ✅ Weather API
- OpenWeatherMap integration
- Farming advice generation
- 5-day forecast
- Location-based data

### ✅ Device Monitoring
- Online/offline status
- Sensor validation
- Connection health checks

## 🔧 Configuration

### Environment Variables
```env
PORT=3000
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_key
MONGODB_URI=your_mongodb_uri
WEATHER_API_KEY=your_openweather_key
NODE_ENV=development
```

### ThingSpeak Configuration
- Channel ID: 3314379
- Read API Key: JRDAPKYRYFI67DZB
- Write API Key: K3H52YQQRAIKCS59

## 📡 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login

### Chat
- `POST /api/chat` - Send message to chatbot
- `GET /api/chat/history` - Get chat history

### Motor Control
- `POST /api/motor/control` - Control motor (on/off)
- `GET /api/motor/status` - Get motor status
- `GET /api/debug/thingspeak` - Debug ThingSpeak data

### Sensors
- `GET /api/sensors/latest` - Get latest sensor data
- `GET /api/sensors/history` - Get sensor history

### Weather
- `POST /api/weather` - Get weather data and forecast

### Device
- `POST /api/device/status` - Get device status

### System
- `GET /api/health` - Health check
- `GET /api/test` - API test endpoint

## 🛠️ Running the Server

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## 🔄 Migration Benefits

### Before (Monolithic)
- Single 776-line server file
- Mixed concerns
- Hard to maintain
- Difficult to test

### After (Modular)
- Separated concerns
- Easy to maintain
- Testable modules
- Scalable structure
- Clear responsibilities

## 📊 Data Flow

```
Frontend → Routes → Controllers → Utils → External APIs
    ↓
Middleware (Auth) → Database (MongoDB/Mock)
```

## 🔍 Key Improvements

1. **Separation of Concerns**: Each module has a single responsibility
2. **Reusable Utils**: Common functions extracted for reuse
3. **Configuration Management**: Centralized config with environment variables
4. **Error Handling**: Consistent error handling across controllers
5. **Maintainability**: Easy to add new features or modify existing ones
6. **Testing**: Each module can be tested independently

## 🚦 Status Indicators

- ✅ All original functionality preserved
- ✅ API endpoints unchanged
- ✅ Database compatibility maintained
- ✅ External integrations working
- ✅ Environment variables supported
- ✅ Error handling improved
