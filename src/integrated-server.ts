import { URIT5160Server, extractHemogramaData, HL7Message } from './tcp-server';
import { SisvidaBot } from './index';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export class IntegratedServer {
  private uritServer: URIT5160Server;
  private sisvidaBot: SisvidaBot;
  private isRunning: boolean = false;

  constructor(tcpPort: number = 8080) {
    this.uritServer = new URIT5160Server(tcpPort);
    this.sisvidaBot = new SisvidaBot();
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Handle URIT-5160 messages
    this.uritServer.on('message', async (message: HL7Message) => {
      console.log('Received URIT-5160 message:', message.msh.messageControlId);
      
      try {
        await this.processURITMessage(message);
      } catch (error) {
        console.error('Error processing URIT message:', error);
      }
    });

    // Handle server events
    this.uritServer.on('started', () => {
      console.log('URIT-5160 server started successfully');
    });

    this.uritServer.on('error', (error) => {
      console.error('URIT-5160 server error:', error);
    });
  }

  private async processURITMessage(message: HL7Message) {

    // console.log('Processing URIT message:', message);``
    // Extract patient information
    const patientId = message.pid?.patientId || message.obr?.universalServiceId || 'UNKNOWN';
    
    // Extract hemograma data from OBX segments
    const hemogramaData = extractHemogramaData(message.obx);
    
    if (Object.keys(hemogramaData).length === 0) {
      console.log('No hemograma data found in message');
      return;
    }

    console.log(`Processing hemograma for patient: ${patientId}`);
    console.log('Extracted hemograma data:', hemogramaData);

    // Create patient data object
    const patientData = {
      patientId,
      hemograma: hemogramaData
    };

    try {
      // Launch browser if not already running
      if (!this.sisvidaBot['browser']) {
        const headless = process.env['HEADLESS'] === 'true';
        await this.sisvidaBot.launch(headless);
      }

      // Login to Sisvida
      const username = process.env['SISVIDA_USERNAME'] || 'teste';
      const password = process.env['SISVIDA_PASSWORD'] || 'teste';
      await this.sisvidaBot.login(username, password);

      // Fill hemograma form
      await this.sisvidaBot.fillHemogramaForm(patientData);

      console.log(`Successfully processed hemograma for patient ${patientId}`);

    } catch (error) {
      console.error(`Error processing hemograma for patient ${patientId}:`, error);
      
      // Take screenshot for debugging
      try {
        await this.sisvidaBot.takeScreenshot(`error-${patientId}-${Date.now()}.png`);
      } catch (screenshotError) {
        console.error('Error taking screenshot:', screenshotError);
      }
      
      // Close browser even on error to ensure clean state for next message
      try {
        await this.sisvidaBot.close();
        console.log('Browser closed after error');
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Integrated server is already running');
      return;
    }

    try {
      // Start URIT-5160 TCP server
      await this.uritServer.start();
      
      this.isRunning = true;
      console.log('Integrated server started successfully');
      console.log(`URIT-5160 TCP Server listening on port ${this.uritServer.getPort()}`);
      console.log('Waiting for analyzer messages...');
      
    } catch (error) {
      console.error('Failed to start integrated server:', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('Integrated server is not running');
      return;
    }

    try {
      // Stop URIT-5160 server
      await this.uritServer.stop();
      
      // Close Sisvida bot browser
      await this.sisvidaBot.close();
      
      this.isRunning = false;
      console.log('Integrated server stopped successfully');
      
    } catch (error) {
      console.error('Error stopping integrated server:', error);
      throw error;
    }
  }

  public isServerRunning(): boolean {
    return this.isRunning && this.uritServer.isServerRunning();
  }

  public getURITServer(): URIT5160Server {
    return this.uritServer;
  }

  public getSisvidaBot(): SisvidaBot {
    return this.sisvidaBot;
  }
}

// Main function to run the integrated server
async function main() {
  const port = parseInt(process.env['TCP_PORT'] || '8080');
  const server = new IntegratedServer(port);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  try {
    await server.start();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main }; 