import { URIT5160Server, URIT8031Server, extractHemogramaData, extractBiochemistryData, HL7Message } from './tcp-server';
import { SisvidaBot } from './index';
import { DataPersistence } from './data-persistence';
import { RetryProcessor } from './retry-processor';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export class IntegratedServer {
  private urit5160Server: URIT5160Server;
  private urit8031Server: URIT8031Server;
  private sisvidaBot: SisvidaBot;
  private dataPersistence: DataPersistence;
  private retryProcessor: RetryProcessor;
  private isRunning: boolean = false;

  constructor(urit5160Port: number = 8080, urit8031Port: number = 8081) {
    this.urit5160Server = new URIT5160Server(urit5160Port);
    this.urit8031Server = new URIT8031Server(urit8031Port);
    this.sisvidaBot = new SisvidaBot();
    this.dataPersistence = new DataPersistence();
    this.retryProcessor = new RetryProcessor(this.dataPersistence, this.sisvidaBot);
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Handle URIT-5160 messages
    this.urit5160Server.on('message', async (message: HL7Message) => {
      console.log('Received URIT-5160 message:', message.msh.messageControlId);
      
      try {
        await this.processHemogramaMessage(message);
      } catch (error) {
        console.error('Error processing URIT-5160 message:', error);
      }
    });

    // Handle URIT-8031 messages  
    this.urit8031Server.on('message', async (message: HL7Message) => {
      console.log('Received URIT-8031 message:', message.msh.messageControlId);
      
      try {
        await this.processBiochemistryMessage(message);
      } catch (error) {
        console.error('Error processing URIT-8031 message:', error);
      }
    });

    // Handle URIT-5160 server events
    this.urit5160Server.on('started', () => {
      console.log('URIT-5160 server started successfully');
    });

    this.urit5160Server.on('error', (error) => {
      console.error('URIT-5160 server error:', error);
    });

    // Handle URIT-8031 server events
    this.urit8031Server.on('started', () => {
      console.log('URIT-8031 server started successfully');
    });

    this.urit8031Server.on('error', (error) => {
      console.error('URIT-8031 server error:', error);
    });

    // Handle retry processor events
    this.retryProcessor.on('retry-success', (message) => {
      console.log(`Retry successful for message: ${message.id}`);
    });

    this.retryProcessor.on('retry-failed', (message, error) => {
      console.error(`Retry failed for message ${message.id}:`, error);
    });
  }

  private async processHemogramaMessage(message: HL7Message) {
    // console.log('Processing URIT message:', message);
    // Extract sample/test ID information
    const sampleId = message.pid?.sampleId || message.obr?.universalServiceId || 'UNKNOWN';
    
    // Extract hemograma data from OBX segments
    const hemogramaData = extractHemogramaData(message.obx);
    
    if (Object.keys(hemogramaData).length === 0) {
      console.log('No hemograma data found in message');
      return;
    }

    console.log(`Processing hemograma for sample: ${sampleId}`);
    // console.log('Extracted hemograma data:', hemogramaData);

    // Create patient data object (using sampleId for the test)
    const patientData = {
      sampleId,
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

      console.log(`Successfully processed hemograma for sample ${sampleId}`);

    } catch (error) {
      console.error(`Error processing hemograma for sample ${sampleId}:`, error);
      
      // Try to take screenshot for debugging (only if browser is still accessible)
      try {
        // Check if browser is still running before attempting screenshot
        if (this.sisvidaBot['browser'] && this.sisvidaBot['page']) {
          await this.sisvidaBot.takeScreenshot(`error-${sampleId}-${Date.now()}.png`);
        } else {
          console.log('Browser not accessible for screenshot');
        }
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

  private async processBiochemistryMessage(message: HL7Message) {
    // Extract sample/test ID information
    const sampleId = message.pid?.sampleId || message.obr?.universalServiceId || 'UNKNOWN';
    
    // Extract biochemistry data from OBX segments
    const biochemistryData = extractBiochemistryData(message.obx);
    
    if (Object.keys(biochemistryData).length === 0) {
      console.log('No biochemistry data found in message');
      return;
    }

    console.log(`Processing biochemistry for sample: ${sampleId}`);
    console.log('Extracted biochemistry data:', biochemistryData);

    // Create patient data object with biochemistry results
    const patientData = {
      sampleId,
      biochemistry: biochemistryData
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

      // Fill biochemistry form (need to implement this method)
      await this.sisvidaBot.fillBiochemistryForm(patientData);

      console.log(`Successfully processed biochemistry for sample ${sampleId}`);

    } catch (error) {
      console.error(`Error processing biochemistry for sample ${sampleId}:`, error);
      
      // Try to take screenshot for debugging
      try {
        if (this.sisvidaBot['browser'] && this.sisvidaBot['page']) {
          await this.sisvidaBot.takeScreenshot(`error-biochemistry-${sampleId}-${Date.now()}.png`);
        } else {
          console.log('Browser not accessible for screenshot');
        }
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
      // Initialize data persistence
      await this.dataPersistence.initialize();
      
      // Start retry processor
      await this.retryProcessor.start();
      
      // Start both URIT TCP servers
      await this.urit5160Server.start();
      await this.urit8031Server.start();
      
      this.isRunning = true;
      console.log('Integrated server started successfully');
      console.log(`URIT-5160 TCP Server listening on port ${this.urit5160Server.getPort()}`);
      console.log(`URIT-8031 TCP Server listening on port ${this.urit8031Server.getPort()}`);
      console.log('Data persistence and retry processor initialized');
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
      // Stop retry processor
      await this.retryProcessor.stop();
      
      // Stop both URIT servers
      await this.urit5160Server.stop();
      await this.urit8031Server.stop();
      
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
    return this.isRunning && this.urit5160Server.isServerRunning() && this.urit8031Server.isServerRunning();
  }

  public getURIT5160Server(): URIT5160Server {
    return this.urit5160Server;
  }

  public getURIT8031Server(): URIT8031Server {
    return this.urit8031Server;
  }

  public getSisvidaBot(): SisvidaBot {
    return this.sisvidaBot;
  }

  public getDataPersistence(): DataPersistence {
    return this.dataPersistence;
  }

  public getRetryProcessor(): RetryProcessor {
    return this.retryProcessor;
  }
}

// Main function to run the integrated server
async function main() {
  const urit5160Port = parseInt(process.env['URIT5160_PORT'] || '8080');
  const urit8031Port = parseInt(process.env['URIT8031_PORT'] || '8081');
  const server = new IntegratedServer(urit5160Port, urit8031Port);

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