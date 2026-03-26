// Test script to verify sensor data mapping
import axios from 'axios';

async function testSensorData() {
  try {
    console.log('Testing sensor data from chat endpoint...');
    
    // Test the chat endpoint to see what sensor data it's reading
    const response = await axios.post('http://localhost:3000/api/chat', {
      message: 'what is my soil moisture level'
    }, {
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Chat response:', response.data);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testSensorData();
