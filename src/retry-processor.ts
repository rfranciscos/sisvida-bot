import { DataPersistence, StoredMessage } from './data-persistence';
import { SisvidaBot } from './index';
import { extractHemogramaData } from './tcp-server';
import { EventEmitter } from 'events';

export interface RetryProcessorConfig {
  checkIntervalMs: number;
  maxConcurrentRetries: number;
  enableRetryProcessor: boolean;
}

export class RetryProcessor extends EventEmitter {
  private dataPersistence: DataPersistence;
  private sisvidaBot: SisvidaBot;
  private config: RetryProcessorConfig;
  private isRunning: boolean = false;
  private retryInterval?: NodeJS.Timeout | undefined;
  private activeRetries: Set<string> = new Set();

  constructor(
    dataPersistence: DataPersistence,
    sisvidaBot: SisvidaBot,
    config?: Partial<RetryProcessorConfig>
  ) {
    super();
    this.dataPersistence = dataPersistence;
    this.sisvidaBot = sisvidaBot;
    this.config = {
      checkIntervalMs: 30000, // Check every 30 seconds
      maxConcurrentRetries: 2,
      enableRetryProcessor: true,
      ...config
    };
  }

  async start(): Promise<void> {
    if (!this.config.enableRetryProcessor || this.isRunning) {
      return;
    }

    this.isRunning = true;
    console.log('Retry processor started');

    // Start the retry interval
    this.retryInterval = setInterval(async () => {
      await this.processRetries();
    }, this.config.checkIntervalMs);

    // Process any existing retries immediately
    await this.processRetries();
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = undefined;
    }

    // Wait for active retries to complete
    while (this.activeRetries.size > 0) {
      console.log(`Waiting for ${this.activeRetries.size} active retries to complete...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('Retry processor stopped');
  }

  private async processRetries(): Promise<void> {
    try {
      // Check if we can process more retries
      if (this.activeRetries.size >= this.config.maxConcurrentRetries) {
        return;
      }

      // Get retryable messages
      const retryableMessages = await this.dataPersistence.getRetryableMessages();
      
      for (const message of retryableMessages) {
        // Check if we can process this retry
        if (this.activeRetries.size >= this.config.maxConcurrentRetries) {
          break;
        }

        // Check if this message is already being processed
        if (this.activeRetries.has(message.id)) {
          continue;
        }

        // Process the retry
        this.processRetry(message).catch(error => {
          console.error(`Error processing retry for message ${message.id}:`, error);
        });
      }
    } catch (error) {
      console.error('Error in retry processor:', error);
    }
  }

  private async processRetry(message: StoredMessage): Promise<void> {
    this.activeRetries.add(message.id);
    
    try {
      console.log(`Processing retry for message ${message.id} (attempt ${message.retryCount + 1})`);
      
      // Update status to processing
      await this.dataPersistence.updateMessageStatus(message.id, 'processing');

      // Extract hemograma data if not already extracted
      let hemogramaData = message.hemogramaData;
      if (!hemogramaData) {
        hemogramaData = extractHemogramaData(message.parsedMessage.obx);
        message.hemogramaData = hemogramaData;
      }

      if (Object.keys(hemogramaData).length === 0) {
        throw new Error('No hemograma data found in message');
      }

      // Create patient data object
      const patientData = {
        sampleId: message.patientId || 'UNKNOWN',
        hemograma: hemogramaData
      };

      // Ensure browser is launched
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
      await this.dataPersistence.updateMessageStatus(message.id, 'completed');
      
      console.log(`Successfully processed retry for message ${message.id}`);
      this.emit('retry-success', message);

    } catch (error) {
      console.error(`Retry failed for message ${message.id}:`, error);
      
      // Update status to failed
      await this.dataPersistence.updateMessageStatus(
        message.id, 
        'failed', 
        error instanceof Error ? error.message : String(error)
      );
      
      this.emit('retry-failed', message, error);
    } finally {
      this.activeRetries.delete(message.id);
    }
  }

  async retryMessage(messageId: string): Promise<void> {
    const message = await this.dataPersistence.getMessageById(messageId);
    if (!message) {
      throw new Error(`Message ${messageId} not found`);
    }

    if (message.status === 'completed') {
      throw new Error(`Message ${messageId} is already completed`);
    }

    // Process the retry immediately (this will reset retry count)
    await this.processRetry(message);
  }

  async getActiveRetries(): Promise<string[]> {
    return Array.from(this.activeRetries);
  }

  async getRetryStatistics(): Promise<{
    activeRetries: number;
    maxConcurrentRetries: number;
    isRunning: boolean;
  }> {
    return {
      activeRetries: this.activeRetries.size,
      maxConcurrentRetries: this.config.maxConcurrentRetries,
      isRunning: this.isRunning
    };
  }

  updateConfig(config: Partial<RetryProcessorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): RetryProcessorConfig {
    return { ...this.config };
  }
} 