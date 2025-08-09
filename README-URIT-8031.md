# URIT-8031 Biochemistry Analyzer Integration

This document describes the integration of the URIT-8031 biochemistry analyzer with the Sisvida Bot system.

## Overview

The URIT-8031 is a biochemistry analyzer that transmits test results via HL7 v2.3.1 protocol over TCP/IP. The system automatically processes glucose and other biochemistry parameters and inputs them into the Sisvida laboratory management system.

## Features

- **Automatic message processing**: Receives and parses HL7 messages from URIT-8031
- **Parameter mapping**: Maps URIT-8031 codes to Sisvida parameter codes
- **Multi-parameter support**: Handles glucose and 19 other biochemistry parameters
- **Error handling**: Comprehensive error handling with retry mechanisms
- **Dual analyzer support**: Runs alongside URIT-5160 on different ports

## Protocol Details

### HL7 Message Format

The URIT-8031 sends HL7 v2.3.1 messages in ASCII format with the following structure:

```
MSH|^~\&|urit|8030|||20250809123926||ORU^R01|202508090002|P|2.3.1||||0||ASCII|||
PID|1||||||0|||||0|||||||||||||||||||
OBR|1|0000966134|202508090002|urit^8030|N||2025-08-09|||||||||||||||||||||||||||||||||||||||
OBX|1|NM|1|GLI|111|mg/dL|65-99|N|||F||0.2441|2025-08-09||Admin||
```

### Supported Parameters

| URIT-8031 Code | Sisvida Code | Parameter Name |
|----------------|--------------|----------------|
| GLI | GLI01 | Glucose |
| ALT | ALT01 | Alanine Aminotransferase |
| AST | AST01 | Aspartate Aminotransferase |
| CRE | CRE01 | Creatinine |
| URE | URE01 | Urea |
| COL | COL01 | Total Cholesterol |
| TRI | TRI01 | Triglycerides |
| ALB | ALB01 | Albumin |
| BIL | BIL01 | Total Bilirubin |
| HDL | HDL01 | HDL Cholesterol |
| LDL | LDL01 | LDL Cholesterol |
| ALP | ALP01 | Alkaline Phosphatase |
| GGT | GGT01 | Gamma-Glutamyl Transferase |
| LDH | LDH01 | Lactate Dehydrogenase |
| AMY | AMY01 | Amylase |
| LIP | LIP01 | Lipase |
| CK | CK01 | Creatine Kinase |
| UA | UA01 | Uric Acid |
| TP | TP01 | Total Protein |
| GLO | GLO01 | Globulins |

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# URIT-8031 TCP port (default: 8081)
URIT8031_PORT=8081

# URIT-5160 TCP port (default: 8080) 
URIT5160_PORT=8080

# Sisvida credentials
SISVIDA_USERNAME=your_username
SISVIDA_PASSWORD=your_password

# Browser settings
HEADLESS=true
```

### Network Configuration

The URIT-8031 analyzer should be configured to connect to:
- **Host**: IP address of the server running the bot
- **Port**: 8081 (or configured URIT8031_PORT)
- **Protocol**: TCP/IP
- **Data format**: HL7 v2.3.1

## Usage

### Starting the Server

Start the integrated server that handles both URIT-5160 and URIT-8031:

```bash
# Start with default ports (5160: 8080, 8031: 8081)
npm run server

# Start with environment variables
npm run server:env

# Start in headless mode
npm run server:headless
```

### Testing

Test the URIT-8031 integration using the test client:

```bash
# Simple glucose test
npm run test-client-8031

# Advanced multi-parameter test
npm run test-client-8031:advanced

# Custom test with specific patient ID
npx ts-node src/test-client-8031.ts localhost 8081 advanced 123456
```

### Sample Test Messages

#### Simple Glucose Test
```
MSH|^~\&|urit|8030|||20250809123926||ORU^R01|202508090002|P|2.3.1||||0||ASCII|||
PID|1||||||0|||||0|||||||||||||||||||
OBR|1|0000966134|202508090002|urit^8030|N||2025-08-09|||||||||||||||||||||||||||||||||||||||
OBX|1|NM|1|GLI|111|mg/dL|65-99|N|||F||0.2441|2025-08-09||Admin||
```

#### Multi-Parameter Test
```
MSH|^~\&|urit|8031|||20250809123926||ORU^R01|202508090001|P|2.3.1||||0||ASCII|||
PID|1||||||0|||||0|||||||||||||||||||
OBR|1|123456|202508090001|urit^8031|N||20250809|||||||||||||||||||||||||||||||||||||||
OBX|1|NM|1|GLI|95|mg/dL|70-99|N|||F||0.2441|20250809||Admin||
OBX|2|NM|2|ALT|35|U/L|7-56|N|||F||0.2441|20250809||Admin||
OBX|3|NM|3|AST|28|U/L|10-40|N|||F||0.2441|20250809||Admin||
OBX|4|NM|4|CRE|1.1|mg/dL|0.7-1.3|N|||F||0.2441|20250809||Admin||
```

## Processing Flow

1. **Connection**: URIT-8031 establishes TCP connection to port 8081
2. **Message Reception**: Server receives HL7 message with test results
3. **Parsing**: Message is parsed and validated according to HL7 v2.3.1 standard
4. **Data Extraction**: Biochemistry parameters are extracted from OBX segments
5. **Parameter Mapping**: URIT codes are mapped to Sisvida parameter codes
6. **Browser Automation**: Browser launches and logs into Sisvida system
7. **Patient Search**: System searches for patient by sample ID in BIOQUÍMICA setor
8. **Form Filling**: Biochemistry form is filled with mapped parameter values
9. **Form Submission**: Form is saved and browser session is closed
10. **Acknowledgment**: Success/failure acknowledgment is sent back to analyzer

## Error Handling

The system includes comprehensive error handling:

- **Message Validation**: Invalid HL7 messages receive NACK responses
- **Parameter Validation**: Unknown parameters are logged but don't stop processing
- **Browser Errors**: Automatic screenshot capture for debugging
- **Network Errors**: Connection errors are logged and monitored
- **Retry Mechanism**: Failed submissions are automatically retried
- **Graceful Degradation**: System continues processing other messages if one fails

## Monitoring and Logging

The system provides detailed logging:

```
URIT-8031 TCP Server listening on port 8081
URIT-8031 analyzer connected from 192.168.1.100:52341
Received URIT-8031 message: 202508090002
Processing biochemistry for sample: 966134
Extracted biochemistry data: {"GLI01":"111"}
✓ GLI01 filled successfully
Biochemistry form saved successfully!
URIT-8031 analyzer disconnected from 192.168.1.100:52341
```

## Docker Support

The Docker configuration supports both analyzers:

```bash
# Build image
docker build -t urit-server .

# Run with port mapping for both analyzers
docker run -p 8080:8080 -p 8081:8081 --env-file .env urit-server

# Using docker-compose
docker-compose up -d
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check if port 8081 is available
   - Verify firewall settings
   - Ensure server is running

2. **Message Parsing Errors**
   - Verify HL7 message format
   - Check character encoding (should be ASCII)
   - Validate message terminators

3. **Parameter Not Found**
   - Check if parameter mapping exists in `extractBiochemistryData`
   - Verify Sisvida form field names
   - Add new mappings if needed

4. **Browser Automation Issues**
   - Check Sisvida credentials
   - Verify patient exists in system
   - Ensure BIOQUÍMICA setor is accessible

### Adding New Parameters

To add support for new biochemistry parameters:

1. Update the parameter mapping in `tcp-server.ts`:
```typescript
const parameterMapping: Record<string, string> = {
  // Existing mappings...
  NEW_PARAM: 'NEW01',  // Add new mapping
};
```

2. Ensure the Sisvida form has corresponding input fields
3. Test with sample messages containing the new parameter

## API Reference

### URIT8031Server Class

```typescript
class URIT8031Server extends EventEmitter {
  constructor(port: number = 3001)
  start(): Promise<void>
  stop(): Promise<void>
  isServerRunning(): boolean
  getPort(): number
}
```

### Events

- `message`: Emitted when HL7 message is received and parsed
- `started`: Emitted when server starts successfully
- `error`: Emitted when server encounters an error

### Functions

```typescript
extractBiochemistryData(obxSegments: OBXSegment[]): Record<string, string>
```

Extracts biochemistry parameters from OBX segments and maps them to Sisvida codes.

## Integration Testing

Use the provided test client to verify integration:

```bash
# Test with sample patient ID 966134
npm run test-client-8031

# Test with advanced multi-parameter message
npm run test-client-8031:advanced

# Test with custom parameters
npx ts-node src/test-client-8031.ts localhost 8081 advanced 999888
```

Expected output:
```
URIT-8031 Test Client
Connected to URIT-8031 server at localhost:8081
Sending advanced URIT-8031 message for patient 999888...
Message sent successfully!
Received acknowledgment: MSH|^~\&|LIS|PC|URIT|8031|...
```

## Support

For issues or questions:
1. Check the logs for detailed error messages
2. Verify configuration settings
3. Test with the provided test client
4. Review the troubleshooting section above

