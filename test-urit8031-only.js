const { URIT8031Server } = require('./dist/tcp-server');

// Create and start only the URIT-8031 server
const server = new URIT8031Server(8083);

// Listen for messages
server.on('message', (message) => {
  console.log('✅ Received URIT-8031 message:');
  console.log('  Message Control ID:', message.msh.messageControlId);
  console.log('  Sample ID:', message.pid?.sampleId || message.obr?.placerOrderNumber || 'UNKNOWN');
  console.log('  Number of OBX segments:', message.obx.length);
  
  if (message.obx.length > 0) {
    console.log('  OBX data:');
    message.obx.forEach((obx, i) => {
      console.log(`    ${i+1}. ${obx.observationIdentifier}: ${obx.observationValue} ${obx.units}`);
    });
  }
  
  // Test biochemistry data extraction
  const { extractBiochemistryData } = require('./dist/tcp-server');
  const biochemData = extractBiochemistryData(message.obx);
  console.log('  Extracted biochemistry data:', biochemData);
  console.log('  Keys found:', Object.keys(biochemData));
  console.log('');
});

server.on('started', () => {
  console.log('URIT-8031 server started on port 8083');
  console.log('Ready to receive messages...');
});

server.on('error', (error) => {
  console.error('Server error:', error);
});

// Start the server
server.start().catch(console.error);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await server.stop();
  process.exit(0);
});
