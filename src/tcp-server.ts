import * as net from 'net';
import { EventEmitter } from 'events';

// HL7 Message Types
export interface HL7Message {
  msh: MSHSegment;
  pid?: PIDSegment;
  pv1?: PV1Segment;
  obr?: OBRSegment;
  obx: OBXSegment[];
  msa?: MSASegment;
  err?: ERRSegment;
}

export interface MSHSegment {
  sendingApplication: string;
  sendingFacility: string;
  receivingApplication: string;
  receivingFacility: string;
  dateTime: string;
  messageType: string;
  messageControlId: string;
  processingId: string;
  versionId: string;
}

export interface PIDSegment {
  sampleId: string;
  patientName: string;
  dateOfBirth: string;
  sex: string;
}

export interface PV1Segment {
  patientClass: string;
  assignedPatientLocation: string;
}

export interface OBRSegment {
  placerOrderNumber: string;
  universalServiceId: string;
  requestedDateTime: string;
  relevantClinicalInfo: string;
  specimenSource: string;
  orderingProvider: string;
}

export interface OBXSegment {
  setId: string;
  valueType: string;
  observationIdentifier: string;
  observationSubId: string;
  observationValue: string;
  units: string;
  referencesRange: string;
  abnormalFlags: string;
  observationStatus: string;
}

export interface MSASegment {
  acknowledgmentCode: string;
  messageControlId: string;
  textMessage: string;
  errorCondition?: string;
}

export interface ERRSegment {
  errorCode: string;
  testTubeNo?: string | undefined;
  testTubeRackNo?: string | undefined;
}

export class URIT5160Server extends EventEmitter {
  private server: net.Server;
  private port: number;
  private isRunning: boolean = false;

  constructor(port: number = 3000) {
    super();
    this.port = port;
    this.server = net.createServer();
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.server.on('connection', (socket: net.Socket) => {
      console.log(`URIT-5160 analyzer connected from ${socket.remoteAddress}:${socket.remotePort}`);
      
      let buffer = '';
      
      socket.on('data', (data: Buffer) => {
        buffer += data.toString('utf8');
        
        // Process complete messages (separated by <EB><CR>)
        while (buffer.includes('\x1C\r')) {
          const messageEnd = buffer.indexOf('\x1C\r');
          const messageStart = buffer.indexOf('\x0B');
          
          if (messageStart === -1 || messageStart >= messageEnd) {
            // Invalid message format, remove up to the end block
            buffer = buffer.substring(messageEnd + 2);
            continue;
          }
          
          const message = buffer.substring(messageStart + 1, messageEnd);
          buffer = buffer.substring(messageEnd + 2);
          
                     try {
                      console.log('Parsing HL7 message:', message);
             const parsedMessage = this.parseHL7Message(message);
             this.emit('message', parsedMessage);
             
             // Send acknowledgment
             const ack = this.createAcknowledgment(parsedMessage.msh.messageControlId);
             socket.write(ack);
             
           } catch (error) {
             console.error('Error parsing HL7 message:', error);
             const nack = this.createNegativeAcknowledgment('UNKNOWN', '103');
             socket.write(nack);
           }
        }
      });
      
      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
      
      socket.on('close', () => {
        console.log(`URIT-5160 analyzer disconnected from ${socket.remoteAddress}:${socket.remotePort}`);
      });
    });
    
    this.server.on('error', (error) => {
      console.error('Server error:', error);
      this.emit('error', error);
    });
  }

  private parseHL7Message(message: string): HL7Message {
    // Handle different line endings: \r\n, \r, or \n
    const segments = message.split(/\r\n|\r|\n/).filter(segment => segment.trim());
    const parsedMessage: HL7Message = { msh: {} as MSHSegment, obx: [] };
    
    // console.log(`Found ${segments.length} segments`);
    // console.log('First few segments:', segments.slice(0, 5));
    
    for (const segment of segments) {
      const fields = segment.split('|');
      const segmentType = fields[0];
      
      // console.log(`Processing segment type: ${segmentType}`);
      
      switch (segmentType) {
        case 'MSH':
          parsedMessage.msh = this.parseMSH(fields);
          break;
        case 'PID':
          parsedMessage.pid = this.parsePID(fields);
          break;
        case 'PV1':
          parsedMessage.pv1 = this.parsePV1(fields);
          break;
        case 'OBR':
          parsedMessage.obr = this.parseOBR(fields);
          break;
        case 'OBX':
          // console.log(`Processing OBX segment: ${segment}`);
          const obxData = this.parseOBX(fields);
          // console.log(`Parsed OBX data:`, obxData);
          parsedMessage.obx.push(obxData);
          break;
        case 'MSA':
          parsedMessage.msa = this.parseMSA(fields);
          break;
        case 'ERR':
          parsedMessage.err = this.parseERR(fields);
          break;
      }
    }
    
    return parsedMessage;
  }

  private parseMSH(fields: string[]): MSHSegment {
    return {
      sendingApplication: fields[2] || '',
      sendingFacility: fields[3] || '',
      receivingApplication: fields[4] || '',
      receivingFacility: fields[5] || '',
      dateTime: fields[6] || '',
      messageType: fields[8] || '',
      messageControlId: fields[9] || '',
      processingId: fields[10] || '',
      versionId: fields[11] || ''
    };
  }

  private parsePID(fields: string[]): PIDSegment {
    return {
      sampleId: fields[5] || '',  // Use field 5 (959775) as sample ID
      patientName: fields[4] || '',
      dateOfBirth: fields[6] || '',
      sex: fields[7] || ''
    };
  }

  private parsePV1(fields: string[]): PV1Segment {
    return {
      patientClass: fields[1] || '',
      assignedPatientLocation: fields[2] || ''
    };
  }

  private parseOBR(fields: string[]): OBRSegment {
    return {
      placerOrderNumber: fields[1] || '',
      universalServiceId: fields[3] || '',
      requestedDateTime: fields[5] || '',
      relevantClinicalInfo: fields[12] || '',
      specimenSource: fields[14] || '',
      orderingProvider: fields[15] || ''
    };
  }

  private parseOBX(fields: string[]): OBXSegment {
    return {
      setId: fields[1] || '',
      valueType: fields[2] || '',
      observationIdentifier: fields[3] || '',
      observationSubId: fields[4] || '',
      observationValue: fields[5] || '',
      units: fields[6] || '',
      referencesRange: fields[7] || '',
      abnormalFlags: fields[8] || '',
      observationStatus: fields[10] || ''
    };
  }

  private parseMSA(fields: string[]): MSASegment {
    return {
      acknowledgmentCode: fields[1] || '',
      messageControlId: fields[2] || '',
      textMessage: fields[3] || '',
      errorCondition: fields[6] || ''
    };
  }

  private parseERR(fields: string[]): ERRSegment {
    const errorCode = fields[1] || '';
    const result: ERRSegment = { errorCode };
    
    if (errorCode === '001' || errorCode === '002' || errorCode === '003') {
      result.testTubeNo = fields[2];
    }
    
    if (errorCode === '004') {
      result.testTubeRackNo = fields[2];
    }
    
    return result;
  }

  private createAcknowledgment(messageControlId: string): string {
    const msa = `MSH|^~\\&|LIS|PC|URIT|UT-5160|${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}||ACK^R01|ACK${Date.now()}|P|2.3.1||||||UNICODE\r`;
    const ack = `MSA|AA|${messageControlId}\r`;
    return `\x0B${msa}${ack}\x1C\r`;
  }

  private createNegativeAcknowledgment(messageControlId: string, errorCode: string): string {
    const msh = `MSH|^~\\&|LIS|PC|URIT|UT-5160|${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}||ACK^R01|ACK${Date.now()}|P|2.3.1||||||UNICODE\r`;
    const msa = `MSA|AE|${messageControlId}\r`;
    const err = `ERR||${errorCode}\r`;
    return `\x0B${msh}${msa}${err}\x1C\r`;
  }

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isRunning) {
        resolve();
        return;
      }

      this.server.listen(this.port, () => {
        this.isRunning = true;
        console.log(`URIT-5160 TCP Server listening on port ${this.port}`);
        this.emit('started');
        resolve();
      });

      this.server.on('error', (error) => {
        reject(error);
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isRunning) {
        resolve();
        return;
      }

      this.server.close(() => {
        this.isRunning = false;
        console.log('URIT-5160 TCP Server stopped');
        this.emit('stopped');
        resolve();
      });
    });
  }

  public isServerRunning(): boolean {
    return this.isRunning;
  }

  public getPort(): number {
    return this.port;
  }
}

// Utility function to extract hemograma data from OBX segments
export function extractHemogramaData(obxSegments: OBXSegment[]): Record<string, string> {
  const hemogramaData: Record<string, string> = {
    'BTN01': '0.0',
    'LAT01': '0.0',
    'ERITR': '0.0',
    'PRO01': '0.0',
    'MIE01': '0.0',
    'MTM01': '0.0',
    'BLAST': '0.0',
    'CELAT': '0.0',
  };
  
  for (const obx of obxSegments) {
    if (obx.valueType === 'NM' && obx.observationValue) {
      // Map URIT-5160 parameters to Sisvida codes
      const parameterMapping: Record<string, string> = {
        'WBC': 'LEU01',
        'RBC': 'HMC01',
        'HGB': 'HGB01',
        'HCT': 'HMT01',
        'RDW_CV': 'RDW01',
        'PLT': 'PTL01',
        'MPV': 'VPM01',
        'LYM%': 'LIN01',
        'MON%': 'MON01',
        'NEU%': 'SEG01',
        'EOS%': 'EOS01',
        'BASO%': 'BSF01'
      };
      
      const uritCode = obx.observationIdentifier;
      const sisvidaCode = parameterMapping[uritCode];
      
      if (sisvidaCode) {
        if(['PTL01', 'LEU01'].includes(sisvidaCode)) {
          hemogramaData[sisvidaCode] = (Number(obx.observationValue) * 1000).toFixed(0);
        } else {
          hemogramaData[sisvidaCode] = obx.observationValue;
        }
      }
    }
  }
  
  return hemogramaData;
} 