const API_URL = 'http://localhost:3000';

async function main() {
  const pixelData = [
    // individual pixels
    { tile: 0, x: 100, y: 100, color: '#ed1c24' },
    { tile: 0, x: 101, y: 100, color: '#ed1c24' },
    { tile: 0, x: 102, y: 100, color: '#ed1c24' },

    // rectangle that will be optimized as region batch
    // will use "defaultColor"
    { tile: 1, x: 50, y: 50 },
    { tile: 1, x: 51, y: 50 },
    { tile: 1, x: 52, y: 50 },
    { tile: 1, x: 53, y: 50 },
    { tile: 1, x: 50, y: 51 },
    { tile: 1, x: 51, y: 51 },
    { tile: 1, x: 52, y: 51 },
    { tile: 1, x: 53, y: 51 },

    // mixed pixels on different tile
    { tile: 2, x: 200, y: 300, color: '#aa38b9' },
    { tile: 2, x: 205, y: 310, color: '#aa38b9' },
    { tile: 2, x: 201, y: 301, color: '#aa38b9' }
  ];

  try {
    const response = await fetch(API_URL + '/pixels/debug', {
      method: 'POST',
      body: JSON.stringify({ pixels: pixelData, defaultColor: '#13e67b' })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('batch preview:', result);

    return result;
  } catch (error) {
    console.error('error previewing pixels:', error);
  }
}

void main();
