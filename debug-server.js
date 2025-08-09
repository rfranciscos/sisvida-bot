const net = require('net');

const server = net.createServer((socket) => {
  console.log('Client connected from', socket.remoteAddress, ':', socket.remotePort);
  
  let buffer = '';
  let currentMessage = '';
  let messageStarted = false;
  
  socket.on('data', (data) => {
    const rawData = data.toString('utf8');
    console.log('Raw data received:');
    console.log('Length:', rawData.length);
    console.log('Hex:', Buffer.from(rawData).toString('hex'));
    console.log('Text:', JSON.stringify(rawData));
    console.log('---');
    
    buffer += rawData;
    
    // Process complete messages - accumulate until we have a complete HL7 message
    const lines = buffer.split(/\r\n|\r|\n/);
    buffer = lines.pop() || ''; // Keep the last incomplete line in buffer
    
    console.log('Lines found:', lines.length);
    lines.forEach((line, i) => {
      console.log(`Line ${i}:`, JSON.stringify(line));
    });
    console.log('Remaining buffer:', JSON.stringify(buffer));
    console.log('---');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      console.log('Processing line:', JSON.stringify(trimmedLine));
      
      // Skip special characters that are not part of HL7 segments
      if (trimmedLine === '∟' || trimmedLine.startsWith('♂')) {
        console.log('Found end marker, processing current message if exists');
        if (messageStarted && currentMessage.trim()) {
          console.log('Complete message:', JSON.stringify(currentMessage));
          // Process message here
          currentMessage = '';
          messageStarted = false;
        }
        continue;
      }
      
      // Start of a new message (MSH segment)
      if (trimmedLine.startsWith('MSH|')) {
        console.log('Found MSH, starting new message');
        if (messageStarted && currentMessage.trim()) {
          console.log('Processing previous message:', JSON.stringify(currentMessage));
          // Process previous message
        }
        currentMessage = trimmedLine + '\r';
        messageStarted = true;
      } else if (messageStarted && (trimmedLine.startsWith('PID|') || trimmedLine.startsWith('OBR|') || trimmedLine.startsWith('OBX|'))) {
        console.log('Adding segment to current message:', trimmedLine.substring(0, 10) + '...');
        currentMessage += trimmedLine + '\r';
      }
    }
    
    console.log('Current message state:', JSON.stringify(currentMessage));
    console.log('Message started:', messageStarted);
    console.log('=====================================');
    
    // Send acknowledgment
    socket.write('MSH|^~\\&|LIS|PC|URIT|8031|20250809T193037||ACK^R01|ACK123|P|2.3.1||||||ASCII\rMSA|AA|202508090002\r');
  });
  
  socket.on('close', () => {
    console.log('Client disconnected');
  });
  
  socket.on('error', (err) => {
    console.error('Socket error:', err);
  });
});

server.listen(8083, () => {
  console.log('Debug server listening on port 8083');
});
