#!/usr/bin/env node

import { DataPersistence } from './data-persistence';
import { RetryProcessor } from './retry-processor';
import { SisvidaBot } from './index';
import * as readline from 'readline';

class CLI {
  private dataPersistence: DataPersistence;
  private retryProcessor: RetryProcessor;
  private rl: readline.Interface;

  constructor() {
    this.dataPersistence = new DataPersistence();
    this.retryProcessor = new RetryProcessor(this.dataPersistence, new SisvidaBot());
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start(): Promise<void> {
    console.log('URIT-5160 Server CLI');
    console.log('===================');
    
    await this.showMenu();
  }

  private async showMenu(): Promise<void> {
    console.log('\nAvailable commands:');
    console.log('1. Show statistics');
    console.log('2. List pending messages');
    console.log('3. List failed messages');
    console.log('4. Retry failed message');
    console.log('5. Show message details');
    console.log('6. Delete message');
    console.log('7. Exit');
    
    const answer = await this.question('\nEnter your choice (1-7): ');
    
    switch (answer.trim()) {
      case '1':
        await this.showStatistics();
        break;
      case '2':
        await this.listPendingMessages();
        break;
      case '3':
        await this.listFailedMessages();
        break;
      case '4':
        await this.retryFailedMessage();
        break;
      case '5':
        await this.showMessageDetails();
        break;
      case '6':
        await this.deleteMessage();
        break;
      case '7':
        console.log('Goodbye!');
        this.rl.close();
        return;
      default:
        console.log('Invalid choice. Please try again.');
    }
    
    await this.showMenu();
  }

  private async showStatistics(): Promise<void> {
    try {
      const stats = await this.dataPersistence.getStatistics();
      console.log('\n📊 Message Statistics:');
      console.log(`Pending: ${stats.pending}`);
      console.log(`Completed: ${stats.completed}`);
      console.log(`Failed: ${stats.failed}`);
      console.log(`Total: ${stats.total}`);
    } catch (error) {
      console.error('Error getting statistics:', error);
    }
  }

  private async listPendingMessages(): Promise<void> {
    try {
      const messages = await this.dataPersistence.getPendingMessages();
      console.log('\n⏳ Pending Messages:');
      
      if (messages.length === 0) {
        console.log('No pending messages.');
        return;
      }

      messages.forEach(msg => {
        console.log(`ID: ${msg.id}`);
        console.log(`Patient: ${msg.patientId}`);
        console.log(`Status: ${msg.status}`);
        console.log(`Retry Count: ${msg.retryCount}`);
        console.log(`Timestamp: ${msg.timestamp}`);
        if (msg.errorMessage) {
          console.log(`Error: ${msg.errorMessage}`);
        }
        console.log('---');
      });
    } catch (error) {
      console.error('Error listing pending messages:', error);
    }
  }

  private async listFailedMessages(): Promise<void> {
    try {
      // This would need to be implemented in DataPersistence
      console.log('\n❌ Failed Messages:');
      console.log('Feature not yet implemented.');
    } catch (error) {
      console.error('Error listing failed messages:', error);
    }
  }

  private async retryFailedMessage(): Promise<void> {
    try {
      const messageId = await this.question('Enter message ID to retry: ');
      console.log(`Retrying message: ${messageId}`);
      
      await this.retryProcessor.retryMessage(messageId.trim());
      console.log('Retry initiated successfully.');
    } catch (error) {
      console.error('Error retrying message:', error);
    }
  }

  private async showMessageDetails(): Promise<void> {
    try {
      const messageId = await this.question('Enter message ID: ');
      const message = await this.dataPersistence.getMessageById(messageId.trim());
      
      if (!message) {
        console.log('Message not found.');
        return;
      }

      console.log('\n📋 Message Details:');
      console.log(`ID: ${message.id}`);
      console.log(`Patient: ${message.patientId}`);
      console.log(`Status: ${message.status}`);
      console.log(`Retry Count: ${message.retryCount}`);
      console.log(`Timestamp: ${message.timestamp}`);
      if (message.lastAttempt) {
        console.log(`Last Attempt: ${message.lastAttempt}`);
      }
      if (message.errorMessage) {
        console.log(`Error: ${message.errorMessage}`);
      }
      if (message.hemogramaData) {
        console.log(`Hemograma Parameters: ${Object.keys(message.hemogramaData).length}`);
      }
    } catch (error) {
      console.error('Error showing message details:', error);
    }
  }

  private async deleteMessage(): Promise<void> {
    try {
      const messageId = await this.question('Enter message ID to delete: ');
      const confirm = await this.question('Are you sure? (y/N): ');
      
      if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
        await this.dataPersistence.deleteMessage(messageId.trim());
        console.log('Message deleted successfully.');
      } else {
        console.log('Deletion cancelled.');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  }

  private question(query: string): Promise<string> {
    return new Promise(resolve => {
      this.rl.question(query, resolve);
    });
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  const cli = new CLI();
  cli.start().catch(console.error);
}

export { CLI }; 