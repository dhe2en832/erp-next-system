require('dotenv').config({ path: '.env.local' });

async function testSubmit() {
  try {
    console.log('Testing API call to /api/delivery-note/DN-2026-00003/submit');
    
    const response = await fetch('http://localhost:3000/api/delivery-note/DN-2026-00003/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'DN-2026-00003' }),
    });

    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('Response Data:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testSubmit();
