import * as fs from 'fs/promises';
import * as path from 'path';
import { HL7Message } from './tcp-server';

export interface StoredMessage {
  id: string;
  timestamp: string;
  rawMessage: string;
  parsedMessage: HL7Message;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  lastAttempt?: string;
  errorMessage?: string;
  patientId?: string;
  hemogramaData?: Record<string, string>;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelayMs: number;
  backoffMultiplier: number;
}

export class DataPersistence {
  private dataDir: string;
  private pendingDir: string;
  private completedDir: string;
  private failedDir: string;
  private retryConfig: RetryConfig;

  constructor(dataDir: string = './data', retryConfig?: Partial<RetryConfig>) {
    this.dataDir = dataDir;
    this.pendingDir = path.join(dataDir, 'pending');
    this.completedDir = path.join(dataDir, 'completed');
    this.failedDir = path.join(dataDir, 'failed');
    
    this.retryConfig = {
      maxRetries: 3,
      retryDelayMs: 5000,
      backoffMultiplier: 2,
      ...retryConfig
    };
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.mkdir(this.pendingDir, { recursive: true });
      await fs.mkdir(this.completedDir, { recursive: true });
      await fs.mkdir(this.failedDir, { recursive: true });
      console.log('Data persistence directories initialized');
    } catch (error) {
      console.error('Failed to initialize data persistence directories:', error);
      throw error;
    }
  }

  async saveRawMessage(rawMessage: string, parsedMessage: HL7Message): Promise<string> {
    const messageId = this.generateMessageId();
    const timestamp = new Date().toISOString();
    
    const storedMessage: StoredMessage = {
      id: messageId,
      timestamp,
      rawMessage,
      parsedMessage,
      status: 'pending',
      retryCount: 0,
      patientId: parsedMessage.pid?.sampleId || parsedMessage.obr?.placerOrderNumber || 'UNKNOWN'
    };

    const filePath = path.join(this.pendingDir, `${messageId}.json`);
    
    try {
      await fs.writeFile(filePath, JSON.stringify(storedMessage, null, 2));
      console.log(`Raw message saved with ID: ${messageId}`);
      return messageId;
    } catch (error) {
      console.error('Failed to save raw message:', error);
      throw error;
    }
  }

  async updateMessageStatus(messageId: string, status: StoredMessage['status'], errorMessage?: string): Promise<void> {
    const pendingPath = path.join(this.pendingDir, `${messageId}.json`);
    const completedPath = path.join(this.completedDir, `${messageId}.json`);
    const failedPath = path.join(this.failedDir, `${messageId}.json`);

    try {
      // Read the current message
      const messageData = await fs.readFile(pendingPath, 'utf8');
      const message: StoredMessage = JSON.parse(messageData);

      // Update the message
      message.status = status;
      message.lastAttempt = new Date().toISOString();
      
      if (errorMessage) {
        message.errorMessage = errorMessage;
      }

      if (status === 'processing') {
        message.retryCount++;
      }

      // Move to appropriate directory based on status
      let targetPath: string;
      
      switch (status) {
        case 'completed':
          targetPath = completedPath;
          break;
        case 'failed':
          if (message.retryCount >= this.retryConfig.maxRetries) {
            targetPath = failedPath;
          } else {
            targetPath = pendingPath; // Keep in pending for retry
          }
          break;
        default:
          targetPath = pendingPath;
      }

      // Write updated message
      await fs.writeFile(targetPath, JSON.stringify(message, null, 2));
      
      // Remove from pending if moved
      if (targetPath !== pendingPath) {
        await fs.unlink(pendingPath);
      }

      console.log(`Message ${messageId} status updated to: ${status}`);
    } catch (error) {
      console.error(`Failed to update message ${messageId} status:`, error);
      throw error;
    }
  }

  async getPendingMessages(): Promise<StoredMessage[]> {
    try {
      const files = await fs.readdir(this.pendingDir);
      const messages: StoredMessage[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.pendingDir, file);
          const data = await fs.readFile(filePath, 'utf8');
          const message: StoredMessage = JSON.parse(data);
          messages.push(message);
        }
      }

      return messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } catch (error) {
      console.error('Failed to get pending messages:', error);
      return [];
    }
  }

  async getRetryableMessages(): Promise<StoredMessage[]> {
    const pendingMessages = await this.getPendingMessages();
    const now = new Date().getTime();

    return pendingMessages.filter(message => {
      // Check if message is failed and can be retried
      if (message.status !== 'failed' || message.retryCount >= this.retryConfig.maxRetries) {
        return false;
      }

      // Check if enough time has passed since last attempt
      if (message.lastAttempt) {
        const lastAttemptTime = new Date(message.lastAttempt).getTime();
        const delay = this.retryConfig.retryDelayMs * Math.pow(this.retryConfig.backoffMultiplier, message.retryCount - 1);
        return (now - lastAttemptTime) >= delay;
      }

      return true;
    });
  }

  async getMessageById(messageId: string): Promise<StoredMessage | null> {
    const directories = [this.pendingDir, this.completedDir, this.failedDir];
    
    for (const dir of directories) {
      const filePath = path.join(dir, `${messageId}.json`);
      try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
      } catch (error) {
        // File doesn't exist in this directory, continue to next
        continue;
      }
    }
    
    return null;
  }

  async deleteMessage(messageId: string): Promise<void> {
    const directories = [this.pendingDir, this.completedDir, this.failedDir];
    
    for (const dir of directories) {
      const filePath = path.join(dir, `${messageId}.json`);
      try {
        await fs.unlink(filePath);
        console.log(`Message ${messageId} deleted from ${dir}`);
        return;
      } catch (error) {
        // File doesn't exist in this directory, continue to next
        continue;
      }
    }
    
    throw new Error(`Message ${messageId} not found`);
  }

  async getStatistics(): Promise<{
    pending: number;
    completed: number;
    failed: number;
    total: number;
  }> {
    try {
      const pendingFiles = await fs.readdir(this.pendingDir);
      const completedFiles = await fs.readdir(this.completedDir);
      const failedFiles = await fs.readdir(this.failedDir);

      return {
        pending: pendingFiles.filter(f => f.endsWith('.json')).length,
        completed: completedFiles.filter(f => f.endsWith('.json')).length,
        failed: failedFiles.filter(f => f.endsWith('.json')).length,
        total: pendingFiles.filter(f => f.endsWith('.json')).length + 
               completedFiles.filter(f => f.endsWith('.json')).length + 
               failedFiles.filter(f => f.endsWith('.json')).length
      };
    } catch (error) {
      console.error('Failed to get statistics:', error);
      return { pending: 0, completed: 0, failed: 0, total: 0 };
    }
  }

  private generateMessageId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
  }

  getRetryConfig(): RetryConfig {
    return { ...this.retryConfig };
  }

  updateRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
  }
} 