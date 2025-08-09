import * as net from 'net';

// Sample HL7 message based on the URIT-8031 protocol with the provided sample
function createSampleHL7Message8031(_patientId: string = '1'): string {
  const now = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 14);
  
  return [
    `MSH|^~\\&|urit|8030|||${now}||ORU^R01|202508090002|P|2.3.1||||0||ASCII|||`,
    `PID|1||||||0|||||0|||||||||||||||||||`,
    `OBR|1|0000966134|202508090002|urit^8030|N||2025-08-09|||||||||||||||||||||||||||||||||||||||`,
    `OBX|1|NM|1|GLI|111|mg/dL|65-99|N|||F||0.2441|2025-08-09||Admin||`
  ].join('\r') + '\r';
}

// Advanced biochemistry message with multiple parameters
function createAdvancedBiochemistryMessage(patientId: string = '1'): string {
  const now = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 14);
  
  return [
    `MSH|^~\\&|urit|8031|||${now}||ORU^R01|${now}001|P|2.3.1||||0||ASCII|||`,
    `PID|1||||||0|||||0|||||||||||||||||||`,
    `OBR|1|${patientId}|${now}001|urit^8031|N||${now.substring(0, 8)}|||||||||||||||||||||||||||||||||||||||`,
    `OBX|1|NM|1|GLI|95|mg/dL|70-99|N|||F||0.2441|${now.substring(0, 8)}||Admin||`,
    `OBX|2|NM|2|ALT|35|U/L|7-56|N|||F||0.2441|${now.substring(0, 8)}||Admin||`,
    `OBX|3|NM|3|AST|28|U/L|10-40|N|||F||0.2441|${now.substring(0, 8)}||Admin||`,
    `OBX|4|NM|4|CRE|1.1|mg/dL|0.7-1.3|N|||F||0.2441|${now.substring(0, 8)}||Admin||`,
    `OBX|5|NM|5|URE|42|mg/dL|15-45|N|||F||0.2441|${now.substring(0, 8)}||Admin||`,
    `OBX|6|NM|6|COL|180|mg/dL|<200|N|||F||0.2441|${now.substring(0, 8)}||Admin||`,
    `OBX|7|NM|7|TRI|120|mg/dL|<150|N|||F||0.2441|${now.substring(0, 8)}||Admin||`
  ].join('\r') + '\r';
}

class URIT8031TestClient {
  private socket: net.Socket | null = null;

  constructor(private host: string = 'localhost', private port: number = 8081) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();
      
      this.socket.connect(this.port, this.host, () => {
        console.log(`Connected to URIT-8031 server at ${this.host}:${this.port}`);
        resolve();
      });

      this.socket.on('error', (error) => {
        reject(error);
      });

      this.socket.on('data', (data) => {
        console.log('Received acknowledgment:', data.toString());
      });

      this.socket.on('close', () => {
        console.log('Connection closed');
      });
    });
  }

  async sendMessage(message: string): Promise<void> {
    if (!this.socket) {
      throw new Error('Not connected. Call connect() first.');
    }

    console.log('Sending message:', message);
    this.socket.write(message);
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.end();
      this.socket = null;
    }
  }
}

// Main function for testing
async function main() {
  const host = process.argv[2] || 'localhost';
  const port = parseInt(process.argv[3] || '8081');
  const messageType = process.argv[4] || 'simple'; // 'simple' or 'advanced'
  const patientId = process.argv[5] || '966134';

  const client = new URIT8031TestClient(host, port);

  try {
    await client.connect();
    
    console.log(`\nSending ${messageType} URIT-8031 message for patient ${patientId}...`);
    
    let message: string;
    if (messageType === 'advanced') {
      message = createAdvancedBiochemistryMessage(patientId);
    } else {
      message = createSampleHL7Message8031(patientId);
    }
    
    console.log('\nMessage content:');
    console.log(message.replace(/\r/g, '\\r\n'));
    
    await client.sendMessage(message);
    
    // Wait a bit for the acknowledgment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\nMessage sent successfully!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.disconnect();
  }
}

// Usage examples
console.log('URIT-8031 Test Client');
console.log('Usage: ts-node src/test-client-8031.ts [host] [port] [messageType] [patientId]');
console.log('Default: localhost 8081 simple 966134');
console.log('Message types: simple, advanced');
console.log('Example: ts-node src/test-client-8031.ts localhost 8081 advanced 123456');
console.log('');

if (require.main === module) {
  main().catch(console.error);
}

export { URIT8031TestClient, createSampleHL7Message8031, createAdvancedBiochemistryMessage };
