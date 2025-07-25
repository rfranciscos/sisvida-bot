import { URIT5160Server, extractHemogramaData, HL7Message } from './tcp-server';
import { SisvidaBot } from './index';
import { DataPersistence } from './data-persistence';
import { RetryProcessor } from './retry-processor';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export class IntegratedServer {
  private uritServer: URIT5160Server;
  private sisvidaBot: SisvidaBot;
  private dataPersistence: DataPersistence;
  private retryProcessor: RetryProcessor;
  private isRunning: boolean = false;

  constructor(tcpPort: number = 8080) {
    this.uritServer = new URIT5160Server(tcpPort);
    this.sisvidaBot = new SisvidaBot();
    this.dataPersistence = new DataPersistence();
    this.retryProcessor = new RetryProcessor(this.dataPersistence, this.sisvidaBot);
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

    // Handle retry processor events
    this.retryProcessor.on('retry-success', (message) => {
      console.log(`Retry successful for message: ${message.id}`);
    });

    this.retryProcessor.on('retry-failed', (message, error) => {
      console.error(`Retry failed for message ${message.id}:`, error);
    });
  }

  private async processURITMessage(message: HL7Message) {
    // Save raw message first
    const messageId = await this.dataPersistence.saveRawMessage(
      JSON.stringify(message), // Store as string for now
      message
    );

    // Extract patient information
    const patientId = message.pid?.patientId || message.obr?.placerOrderNumber || 'UNKNOWN';
    
    // Extract hemograma data from OBX segments
    const hemogramaData = extractHemogramaData(message.obx);
    
    if (Object.keys(hemogramaData).length === 0) {
      console.log('No hemograma data found in message');
      await this.dataPersistence.updateMessageStatus(messageId, 'failed', 'No hemograma data found');
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
      // Update status to processing
      await this.dataPersistence.updateMessageStatus(messageId, 'processing');

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

      // Update status to completed
      await this.dataPersistence.updateMessageStatus(messageId, 'completed');

      console.log(`Successfully processed hemograma for patient ${patientId}`);

    } catch (error) {
      console.error(`Error processing hemograma for patient ${patientId}:`, error);
      
      // Update status to failed
      await this.dataPersistence.updateMessageStatus(
        messageId, 
        'failed', 
        error instanceof Error ? error.message : String(error)
      );
      
      // Take screenshot for debugging
      try {
        await this.sisvidaBot.takeScreenshot(`error-${patientId}-${Date.now()}.png`);
      } catch (screenshotError) {
        console.error('Error taking screenshot:', screenshotError);
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
      
      // Start URIT-5160 TCP server
      await this.uritServer.start();
      
      this.isRunning = true;
      console.log('Integrated server started successfully');
      console.log(`URIT-5160 TCP Server listening on port ${this.uritServer.getPort()}`);
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

  public getDataPersistence(): DataPersistence {
    return this.dataPersistence;
  }

  public getRetryProcessor(): RetryProcessor {
    return this.retryProcessor;
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