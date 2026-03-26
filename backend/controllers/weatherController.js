import axios from "axios";

export const getWeatherData = async (req, res) => {
  try {
    const { location } = req.body;
    
    // Default to India coordinates if no location provided
    const lat = location?.lat || 20.5937; // India center
    const lon = location?.lon || 78.9629;
    
    // Using OpenWeatherMap API (you'll need to add API key to .env)
    const weatherApiKey = process.env.WEATHER_API_KEY;
    if (!weatherApiKey) {
      return res.status(400).json({ 
        success: false,
        message: "Weather API key not configured",
        error: "Please add WEATHER_API_KEY to your .env file"
      });
    }
    
    try {
      // Get current weather
      const weatherResponse = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weatherApiKey}&units=metric`,
        { timeout: 5000 } // 5 second timeout
      );
      
      // Get 5-day forecast
      const forecastResponse = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${weatherApiKey}&units=metric`,
        { timeout: 5000 } // 5 second timeout
      );

      const current = weatherResponse.data;
      const forecast = forecastResponse.data;

      // Process forecast data (get one forecast per day)
      const dailyForecasts = forecast.list.filter((item, index) => index % 8 === 0).slice(0, 5);

      res.json({
        success: true,
        data: {
          location: {
            name: current.name,
            country: current.sys.country,
            lat: current.coord.lat,
            lon: current.coord.lon
          },
          current: {
            temperature: Math.round(current.main.temp),
            feelsLike: Math.round(current.main.feels_like),
            humidity: current.main.humidity,
            pressure: current.main.pressure,
            windSpeed: current.wind.speed,
            windDirection: current.wind.deg,
            visibility: current.visibility / 1000, // Convert to km
            uvIndex: current.uvi || 0,
            condition: current.weather[0].main,
            description: current.weather[0].description,
            icon: current.weather[0].icon,
            sunrise: new Date(current.sys.sunrise * 1000),
            sunset: new Date(current.sys.sunset * 1000)
          },
          forecast: dailyForecasts.map(item => ({
            date: new Date(item.dt * 1000),
            temperature: {
              min: Math.round(item.main.temp_min),
              max: Math.round(item.main.temp_max)
            },
            humidity: item.main.humidity,
            condition: item.weather[0].main,
            description: item.weather[0].description,
            icon: item.weather[0].icon,
            windSpeed: item.wind.speed,
            precipitation: item.pop * 100 // Probability of precipitation
          })),
          farmingAdvice: generateFarmingAdvice(current, dailyForecasts.slice(0, 3))
        },
        timestamp: new Date()
      });

    } catch (networkError) {
      console.error("Weather API network error:", networkError.message);
      
      // Return mock weather data when API is unavailable
      const mockWeatherData = {
        location: {
          name: "Default Location",
          country: "IN",
          lat: lat,
          lon: lon
        },
        current: {
          temperature: 28,
          feelsLike: 30,
          humidity: 65,
          pressure: 1013,
          windSpeed: 3.5,
          windDirection: 180,
          visibility: 10,
          uvIndex: 6,
          condition: "Clear",
          description: "clear sky",
          icon: "01d",
          sunrise: new Date(Date.now() - 6 * 60 * 60 * 1000),
          sunset: new Date(Date.now() + 6 * 60 * 60 * 1000)
        },
        forecast: Array.from({ length: 5 }, (_, i) => ({
          date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
          temperature: { min: 25, max: 32 },
          humidity: 60 + Math.random() * 20,
          condition: "Clear",
          description: "clear sky",
          icon: "01d",
          windSpeed: 2 + Math.random() * 4,
          precipitation: Math.random() * 30
        })),
        farmingAdvice: [
          "🌱 Weather data is currently unavailable. Using default conditions for farming advice.",
          "💧 Ensure regular irrigation based on crop needs.",
          "🌡️ Monitor temperature changes and adjust watering accordingly."
        ]
      };

      res.json({
        success: true,
        data: mockWeatherData,
        timestamp: new Date(),
        note: "Using mock weather data due to API connectivity issues"
      });
    }

  } catch (error) {
    console.error("Weather API error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch weather data",
      error: error.message 
    });
  }
};

// Generate farming advice based on weather
const generateFarmingAdvice = (current, forecast) => {
  const advice = [];
  
  // Temperature advice
  if (current.main.temp > 35) {
    advice.push("🌡️ High temperature detected. Consider increasing irrigation frequency and providing shade for sensitive crops.");
  } else if (current.main.temp < 10) {
    advice.push("🥶 Low temperature. Protect sensitive plants with covers and consider delaying planting.");
  }
  
  // Humidity advice
  if (current.main.humidity > 80) {
    advice.push("💧 High humidity increases risk of fungal diseases. Ensure proper ventilation and monitor crops closely.");
  } else if (current.main.humidity < 30) {
    advice.push("🏜️ Low humidity levels. Increase irrigation and consider mulching to retain soil moisture.");
  }
  
  // Rain advice
  const rainChance = forecast.reduce((acc, day) => acc + (day.pop * 100), 0) / forecast.length;
  if (rainChance > 60) {
    advice.push("🌧️ High chance of rain expected. Consider postponing irrigation and check drainage systems.");
  } else if (rainChance < 20) {
    advice.push("☀️ Dry weather expected. Ensure adequate irrigation and consider drought-resistant crops.");
  }
  
  // Wind advice
  if (current.wind.speed > 10) {
    advice.push("💨 Strong winds detected. Secure loose items and consider windbreaks for young plants.");
  }
  
  // General advice based on conditions
  if (current.main.temp >= 20 && current.main.temp <= 30 && 
      current.main.humidity >= 40 && current.main.humidity <= 70) {
    advice.push("🌱 Optimal conditions for most crops. Good time for planting and maintenance activities.");
  }
  
  return advice.length > 0 ? advice : ["🌾 Weather conditions are moderate. Continue regular farming activities."];
};
