import * as net from 'net';

// Sample HL7 message based on the URIT-5160 protocol
function createSampleHL7Message(patientId: string = '1010051'): string {
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
  
  const message = [
    `MSH|^~\\&|URIT|UT-5160|LIS|PC|${now}||ORU^R01|0001|P|2.3.1||||||UNICODE`,
    `PID|1|${patientId}|A1123145|15|Mary||19811011|M`,
    `PV1|1|Clinic|Surgery|`,
    `OBR|1|${patientId}|000001|URIT^UT-5160||${now}||${now}||sender|||diagnosis^remark||BLD|Inspector||||||||||||verifier|`,
    `OBX|1|NM|WBC||8.21|10^9/L|4.00-10.00|N|||F||`,
    `OBX|2|NM|LYM||35.57|%|20.00-40.00|N|||F||`,
    `OBX|3|NM|MON||5.84|%|3.00-8.00|N|||F||`,
    `OBX|4|NM|NEU||57.37|%|50.00-70.00|N|||F||`,
    `OBX|5|NM|EOS||1.14|%|0.50-5.00|N|||F||`,
    `OBX|6|NM|BASO||0.08|%|0.00-1.00|N|||F||`,
    `OBX|7|NM|LYM#||284.5|10^9/L|80.0-400.0|N|||F||`,
    `OBX|8|NM|MON#||46.7|10^9/L|10.0-80.0|N|||F||`,
    `OBX|9|NM|NEU#||458.9|10^9/L|200.0-700.0|N|||F||`,
    `OBX|10|NM|EOS#||9.1|10^9/L|0.0-50.0|N|||F||`,
    `OBX|11|NM|BASO#||0.6|10^9/L|0.0-10.0|N|||F||`,
    `OBX|12|NM|RBC||4.49|10^12/L|3.50-5.50|N|||F||`,
    `OBX|13|NM|HGB||145|g/L|130-175|N|||F||`,
    `OBX|14|NM|HCT||42.4|%|37.0-50.0|N|||F||`,
    `OBX|15|NM|MCV||94.0|fL|80.0-100.0|N|||F||`,
    `OBX|16|NM|MCH||32.0|pg|27.0-31.0|N|||F||`,
    `OBX|17|NM|MCHC||342|g/L|320-360|N|||F||`,
    `OBX|18|NM|RDW_CV||13.1|%|11.5-14.5|N|||F||`,
    `OBX|19|NM|RDW_SD||45.0|fL|35.0-56.0|N|||F||`,
    `OBX|20|NM|PLT||250|10^9/L|150-450|N|||F||`,
    `OBX|21|NM|MPV||9.3|fL|7.0-11.0|N|||F||`,
    `OBX|22|NM|PDW||16.7|fL|15.0-17.0|N|||F||`,
    `OBX|23|NM|PCT||0.25|%|0.10-0.28|N|||F||`,
    `OBX|24|NM|P_LCR||1.37|%|0.50-1.80|N|||F||`
  ].join('\r');
  
  // Wrap with start/end block characters
  return `\x0B${message}\x1C\r`;
}

class URIT5160TestClient {
  private client: net.Socket;
  private host: string;
  private port: number;

  constructor(host: string = 'localhost', port: number = 3000) {
    this.host = host;
    this.port = port;
    this.client = new net.Socket();
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.on('connect', () => {
      console.log(`Connected to server at ${this.host}:${this.port}`);
    });

    this.client.on('data', (data: Buffer) => {
      console.log('Received acknowledgment from server:');
      console.log(data.toString('utf8'));
    });

    this.client.on('error', (error) => {
      console.error('Client error:', error);
    });

    this.client.on('close', () => {
      console.log('Connection closed');
    });
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.connect(this.port, this.host, () => {
        resolve();
      });

      this.client.on('error', (error) => {
        reject(error);
      });
    });
  }

  public sendMessage(message: string): void {
    console.log('Sending HL7 message to server...');
    this.client.write(message);
  }

  public disconnect(): void {
    this.client.destroy();
  }
}

// Main function to run the test client
async function main() {
  const args = process.argv.slice(2);
  const host = args[0] || 'localhost';
  const port = parseInt(args[1] || '3000');
  const patientId = args[2] || '1010051';

  const client = new URIT5160TestClient(host, port);

  try {
    await client.connect();
    
    // Send sample message
    const message = createSampleHL7Message(patientId);
    client.sendMessage(message);
    
    // Wait a bit for acknowledgment
    setTimeout(() => {
      client.disconnect();
      process.exit(0);
    }, 2000);
    
  } catch (error) {
    console.error('Failed to connect to server:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { URIT5160TestClient, createSampleHL7Message }; 