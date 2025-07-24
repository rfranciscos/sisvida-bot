# URIT-5160 TCP Server Integration

This project now includes a TCP server that can receive messages from a URIT-5160 hematology analyzer and automatically process the results through the Sisvida bot.

## Overview

The TCP server implements the HL7 v2.3.1 communication protocol as specified in the URIT-5160 documentation. It can:

- Receive HL7 messages from the URIT-5160 analyzer
- Parse hemograma data from OBX segments
- Automatically map URIT-5160 parameters to Sisvida codes
- Process results through the Sisvida bot
- Send acknowledgments back to the analyzer

## Protocol Implementation

### Message Format
Messages follow the HL7 v2.3.1 standard with URIT-5160 specific formatting:

```
<SB>MSH|^~\&|URIT|UT-5160|LIS|PC|20110627144458||ORU^R01|0001|P|2.3.1||||||UNICODE<CR>
PID|1|1010051|A1123145|15|Mary||19811011|M<CR>
PV1|1|Clinic|Surgery|<CR>
OBR|1|1010051|000001|URIT^UT-5160||||01110621143134|||||^||||||||||||||||<CR>
OBX|1|NM|WBC||8.21|10^9/L|4.00-10.00|N|||F||<CR>
OBX|2|NM|RBC||4.49|10^12/L|3.50-5.50|N|||F||<CR>
...<EB><CR>
```

Where:
- `<SB>` = Start Block (ASCII VT, hex 0x0B)
- `<EB>` = End Block (ASCII FS, hex 0x1C)
- `<CR>` = Carriage Return (ASCII CR, hex 0x0D)

### Parameter Mapping

The server automatically maps URIT-5160 parameters to Sisvida codes:

| URIT-5160 Code | Sisvida Code | Description |
|----------------|--------------|-------------|
| WBC | LEU01 | White Blood Cell Count |
| RBC | HMC01 | Red Blood Cell Count |
| HGB | HGB01 | Hemoglobin |
| HCT | HMT01 | Hematocrit |
| RDW_CV | RDW01 | Red Cell Distribution Width |
| PLT | PTL01 | Platelet Count |
| MPV | VPM01 | Mean Platelet Volume |
| LYM | LIN01 | Lymphocytes (%) |
| MON | MON01 | Monocytes (%) |
| NEU | SEG01 | Neutrophils (%) |
| EOS | EOS01 | Eosinophils (%) |
| BASO | BSF01 | Basophils (%) |

## Usage

### Starting the Integrated Server

```bash
# Start with default settings
npm run server

# Start in headless mode
npm run server:headless

# Start with environment variables
npm run server:env
```

### Configuration

Add the following to your `.env` file:

```env
# TCP Server Configuration
TCP_PORT=3000

# Sisvida Credentials
SISVIDA_USERNAME=your_username
SISVIDA_PASSWORD=your_password

# Browser Mode
HEADLESS=false
```

### Testing with the Test Client

The project includes a test client to simulate the URIT-5160 analyzer:

```bash
# Run test client with default settings
npm run test-client

# Run with custom parameters
npm run test-client localhost 3000 290626
```

## Architecture

### Files Structure

- `src/tcp-server.ts` - Core TCP server implementation
- `src/integrated-server.ts` - Integrated server combining TCP and Sisvida bot
- `src/test-client.ts` - Test client for simulating analyzer messages

### Classes

#### URIT5160Server
- Handles TCP connections from the analyzer
- Parses HL7 messages
- Sends acknowledgments
- Emits events for message processing

#### IntegratedServer
- Combines URIT-5160 server with Sisvida bot
- Automatically processes received messages
- Handles browser lifecycle
- Provides graceful shutdown

#### URIT5160TestClient
- Simulates analyzer connections
- Sends sample HL7 messages
- Useful for testing and development

## Message Processing Flow

1. **Connection**: Analyzer connects to TCP server
2. **Message Reception**: Server receives HL7 message with start/end blocks
3. **Parsing**: Message is parsed into structured data
4. **Data Extraction**: Hemograma parameters are extracted and mapped
5. **Bot Processing**: Sisvida bot processes the data
6. **Acknowledgment**: Server sends ACK/NAK back to analyzer

## Error Handling

The server implements comprehensive error handling:

- **Message Parsing Errors**: Sends NAK with error code 103 (Data type error)
- **Bot Processing Errors**: Takes screenshots for debugging
- **Connection Errors**: Logs and handles gracefully
- **Graceful Shutdown**: Handles SIGINT/SIGTERM signals

## Acknowledgment Codes

| Code | Description |
|------|-------------|
| AA | Message accepted |
| AE | Error (with specific error condition) |
| AR | Rejected |

## Error Conditions

| Code | Description |
|------|-------------|
| 101 | Segment sequence error |
| 102 | Required field missing |
| 103 | Data type error |
| 104 | Key not found |
| 105 | Resend |

## Development

### Adding New Parameters

To add support for new URIT-5160 parameters:

1. Update the `parameterMapping` in `extractHemogramaData()` function
2. Add corresponding Sisvida code mapping
3. Test with sample data

### Customizing Message Processing

Override the `processURITMessage()` method in `IntegratedServer` to customize how messages are processed.

### Logging

The server provides detailed logging for:
- Connection events
- Message reception
- Data extraction
- Bot processing
- Errors and acknowledgments

## Security Considerations

- Use environment variables for credentials
- Consider implementing message validation
- Monitor for malformed messages
- Implement rate limiting if needed
- Use secure connections in production

## Troubleshooting

### Common Issues

1. **Connection Refused**: Check if server is running and port is available
2. **Message Parsing Errors**: Verify HL7 message format
3. **Bot Processing Errors**: Check Sisvida credentials and network connectivity
4. **Parameter Mapping Issues**: Verify parameter codes match expected format

### Debug Mode

Enable detailed logging by setting environment variables:

```bash
DEBUG=true npm run server
```

### Screenshots

Error screenshots are automatically saved when bot processing fails, helping with debugging. 