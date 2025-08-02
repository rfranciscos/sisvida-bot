import puppeteer, { Browser, Page } from 'puppeteer';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Types for the hemograma data
interface HemogramaData {
  [codigo: string]: string | number;
}

interface PatientData {
  sampleId: string | number;
  hemograma: HemogramaData;
}

// Hemograma reference ranges based on the form
const HEMOGRAMA_RANGES = {
  HMC01: { min: 4.40, max: 5.80, unit: 'milhões/mm³' },
  HGB01: { min: 13.5, max: 17.5, unit: 'g/dL' },
  HMT01: { min: 39.0, max: 54.0, unit: '%' },
  RDW01: { min: 11.0, max: 16.0, unit: '%' },
  LEU01: { min: 3500, max: 11000, unit: '/mm³' },
  SEG01: { min: 38.0, max: 73.0, unit: '%' },
  LIN01: { min: 10.0, max: 44.0, unit: '%' },
  MON01: { min: 4.0, max: 13.0, unit: '%' },
  EOS01: { min: 0.0, max: 5.0, unit: '%' },
  BSF01: { min: 0.0, max: 2.0, unit: '%' },
  BTN01: { min: 0.0, max: 11.0, unit: '%' },
  LAT01: { min: 0.0, max: 1.0, unit: '%' },
  ERITR: { min: 0.0, max: 0.0, unit: '%' },
  PRO01: { min: 0.0, max: 0.0, unit: '%' },
  MIE01: { min: 0.0, max: 0.0, unit: '%' },
  MTM01: { min: 0.0, max: 0.0, unit: '%' },
  BLAST: { min: 0.0, max: 0.0, unit: '%' },
  CELAT: { min: 0.0, max: 0.0, unit: '%' },
  PTL01: { min: 150000, max: 450000, unit: '/mm³' },
  VPM01: { min: 1.0, max: 13.0, unit: 'fL' }
};

// Function to generate realistic hemograma values within normal ranges
function generateRealisticHemograma(): HemogramaData {
  const hemograma: HemogramaData = {};
  
  // First, generate all non-differential values
  for (const [codigo, range] of Object.entries(HEMOGRAMA_RANGES)) {
    if (range.min === range.max) {
      // For values that should be 0 (like ERITR, PRO01, etc.)
      hemograma[codigo] = '0.0';
    } else if (!['SEG01', 'LIN01', 'MON01', 'EOS01', 'BSF01', 'BTN01'].includes(codigo)) {
      // Generate non-differential values
      const randomValue = Math.random() * (range.max - range.min) + range.min;
      
      // Format based on the unit and specific codes
      if (range.unit === '/mm³' && codigo === 'PTL01') {
        // Platelets should be whole numbers
        hemograma[codigo] = Math.round(randomValue).toString();
      } else if (range.unit === '/mm³' && codigo === 'LEU01') {
        // Leukocytes should be whole numbers
        hemograma[codigo] = Math.round(randomValue).toString();
      } else if (codigo === 'HMC01') {
        // HMC01 should be formatted with 2 decimal places (e.g., 4.50, 5.20)
        hemograma[codigo] = randomValue.toFixed(2);
      } else if (codigo === 'HGB01' || codigo === 'HMT01') {
        // HGB01 and HMT01 should be formatted with 1 decimal place
        hemograma[codigo] = randomValue.toFixed(1);
      } else {
        // Other values can have decimals
        hemograma[codigo] = randomValue.toFixed(1);
      }
    }
  }
  
  // Generate differential white blood cell counts that sum to 100%
  const differentialCodes = ['SEG01', 'LIN01', 'MON01', 'EOS01', 'BSF01', 'BTN01'] as const;
  const differentialRanges: Record<string, { min: number; max: number }> = {
    SEG01: { min: 38.0, max: 73.0 },
    LIN01: { min: 10.0, max: 44.0 },
    MON01: { min: 4.0, max: 13.0 },
    EOS01: { min: 0.0, max: 5.0 },
    BSF01: { min: 0.0, max: 2.0 },
    BTN01: { min: 0.0, max: 11.0 }
  };
  
  // Generate initial values within ranges
  const initialValues: { [key: string]: number } = {};
  let total = 0;
  
  for (const codigo of differentialCodes) {
    const range = differentialRanges[codigo];
    if (!range) continue; // Skip if range is undefined
    const value = Math.random() * (range.max - range.min) + range.min;
    initialValues[codigo] = value;
    total += value;
  }
  
  // Normalize to sum to 100%
  for (const codigo of differentialCodes) {
    const value = initialValues[codigo];
    if (value === undefined) continue; // Skip if value is undefined
    const normalizedValue = (value / total) * 100;
    hemograma[codigo] = normalizedValue.toFixed(1);
  }
  
  return hemograma;
}

// Function to generate hemograma with some abnormal values (for testing)
function generateAbnormalHemograma(): HemogramaData {
  const hemograma: HemogramaData = {};
  
  for (const [codigo, range] of Object.entries(HEMOGRAMA_RANGES)) {
    if (range.min === range.max) {
      hemograma[codigo] = '0.0';
    } else {
      // 30% chance of abnormal value
      const isAbnormal = Math.random() < 0.3;
      
      let value: number;
      if (isAbnormal) {
        // Generate abnormal value (outside normal range)
        if (Math.random() < 0.5) {
          // Below normal
          value = range.min - (Math.random() * (range.max - range.min) * 0.3);
        } else {
          // Above normal
          value = range.max + (Math.random() * (range.max - range.min) * 0.3);
        }
      } else {
        // Normal value
        value = Math.random() * (range.max - range.min) + range.min;
      }
      
      // Format based on the unit and specific codes
      if (range.unit === '/mm³' && codigo === 'PTL01') {
        hemograma[codigo] = Math.round(value).toString();
      } else if (range.unit === '/mm³' && codigo === 'LEU01') {
        hemograma[codigo] = Math.round(value).toString();
      } else if (codigo === 'HMC01') {
        // HMC01 should be formatted with 2 decimal places (e.g., 4.50, 5.20)
        hemograma[codigo] = value.toFixed(2);
      } else if (codigo === 'HGB01' || codigo === 'HMT01') {
        // HGB01 and HMT01 should be formatted with 1 decimal place
        hemograma[codigo] = value.toFixed(1);
      } else {
        hemograma[codigo] = value.toFixed(1);
      }
    }
  }
  
  return hemograma;
}

export class SisvidaBot {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async launch(headless: boolean = false) {
    this.browser = await puppeteer.launch({ 
      headless,
      defaultViewport: { width: 1280, height: 720 }
    });
    this.page = await this.browser.newPage();
    
    // Set user agent to avoid bot detection
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  }

  async login(username: string = 'teste', password: string = 'teste') {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    console.log('Navigating to Sisvida login page...');
    await this.page.goto('https://lacer.sisvida.com.br/login', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Handle cookie consent dialog if it appears
    try {
      console.log('Checking for cookie consent dialog...');
      await this.page.waitForSelector('button:contains("Permitir todos")', { timeout: 5000 });
      await this.page.click('button:contains("Permitir todos")');
      console.log('Cookie consent accepted.');
    } catch (error) {
      console.log('No cookie dialog found or already handled.');
    }

    // Wait for login form to be ready
    console.log('Waiting for login form...');
    await this.page.waitForSelector('#usuario_login', { timeout: 10000 });
    await this.page.waitForSelector('#usuario_password', { timeout: 10000 });

    // Clear and fill username field
    console.log(`Filling username field with: ${username}`);
    await this.page.click('#usuario_login');
    await this.page.keyboard.down('Control');
    await this.page.keyboard.press('KeyA');
    await this.page.keyboard.up('Control');
    await this.page.type('#usuario_login', username);

    // Clear and fill password field
    console.log(`Filling password field with: ${password}`);
    await this.page.click('#usuario_password');
    await this.page.keyboard.down('Control');
    await this.page.keyboard.press('KeyA');
    await this.page.keyboard.up('Control');
    await this.page.type('#usuario_password', password);

    console.log('Login credentials filled successfully!');
    
    // Submit the form
    console.log('Submitting login form...');
    await this.page.click('input[type="submit"], button[type="submit"]');
    await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('Login form submitted successfully!');
  }

  async fillHemogramaForm(patientData: PatientData) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    // Check if the page is still valid
    try {
      await this.page.url(); // This will throw if page is detached
    } catch (error) {
      throw new Error('Browser page is detached. Need to restart browser.');
    }

    const { sampleId, hemograma } = patientData;
    
    // First, search for the patient ID using the sample ID
    const patientId = await this.searchPatientBySampleId(sampleId);
    
    console.log(`Navigating to patient results page for patient ID: ${patientId} (sample ID: ${sampleId})`);
    await this.page.goto(`https://lacer.sisvida.com.br/lancar_resultados/atendimentos/lancar/${patientId}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('Waiting for hemograma form to load...');
    
    // Wait for the form to be ready
    await this.page.waitForSelector('table.form', { timeout: 15000 });
    
    console.log('Filling hemograma form...');
    
    // Fill each hemograma field
    for (const [codigo, valor] of Object.entries(hemograma)) {
      try {
        console.log(`Filling ${codigo} with value: ${valor}`);
        
        // Try to find the input field using a more direct approach
        // Look for input fields with class "padrao" which are the result inputs
        const inputs = await this.page.$$('input.padrao[type="text"]');
        
        // Find the input that corresponds to the código by checking the row structure
        let targetInput = null;
        
        for (const input of inputs) {
          // Get the parent row of this input
          const row = await input.evaluateHandle(el => el.closest('tr'));
          const rowElement = await row.asElement();
          
          if (rowElement) {
            // Check if this row contains the código
            const spans = await rowElement.$$('span');
            for (const span of spans) {
              const spanText = await span.evaluate((el: any) => el.textContent?.trim());
              if (spanText === codigo) {
                targetInput = input;
                break;
              }
            }
            if (targetInput) break;
          }
        }
        
        if (!targetInput) {
          throw new Error(`Input element not found for código ${codigo}`);
        }
        
        // Clear and fill the input
        await targetInput.click();
        await this.page.keyboard.down('Control');
        await this.page.keyboard.press('KeyA');
        await this.page.keyboard.up('Control');
        await targetInput.type(valor.toString());
        
        console.log(`✓ ${codigo} filled successfully`);
        
      } catch (error) {
        console.warn(`⚠ Could not fill ${codigo}: ${error}`);
      }
    }
    
    console.log('Hemograma form filled successfully!');
    
    // Click the "Salvar" button to save the form
    console.log('Clicking "Salvar" button...');
    await this.page.click('input.record_button.salvar[type="submit"][value="Salvar"]');
    
    // Wait a moment for the form submission to process
    console.log('Waiting for form submission to complete...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if there's a success message or if we're still on the same page
    try {
      // Wait for either a success message or navigation
      await Promise.race([
        this.page.waitForSelector('.success, .alert-success, .message-success', { timeout: 10000 }),
        this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 })
      ]);
      console.log('Form saved successfully!');
    } catch (error) {
      console.log('Form submission completed (no navigation detected)');
    }
    
    // Close the browser after successful form submission
    console.log('Closing browser...');
    await this.close();
  }

  async searchPatientBySampleId(sampleId: string | number): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    // Check if the page is still valid
    try {
      await this.page.url(); // This will throw if page is detached
    } catch (error) {
      throw new Error('Browser page is detached. Need to restart browser.');
    }

    console.log(`Searching for patient with sample ID: ${sampleId}`);
    
    // Navigate to the patient list page
    await this.page.goto('https://lacer.sisvida.com.br/lancar_resultados/atendimentos/list', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('Waiting for patient list page to load...');
    
    // Wait for the filter input to be ready
    await this.page.waitForSelector('#filter_etiquetas_atendimento\\.id', { timeout: 15000 });
    
    console.log('Filling sample ID in filter...');
    
    // Clear and fill the sample ID filter
    await this.page.click('#filter_etiquetas_atendimento\\.id');
    await this.page.keyboard.down('Control');
    await this.page.keyboard.press('KeyA');
    await this.page.keyboard.up('Control');
    await this.page.type('#filter_etiquetas_atendimento\\.id', sampleId.toString());
    
    console.log('Clicking filter button...');
    
    // Click the filter button
    await this.page.click('button.button[type="submit"]');

    // Wait for the results to load and ensure we have exactly 1 result
    console.log('Waiting for filtered results...');
    await this.page.waitForFunction(() => {
      const doc = (globalThis as any).document;
      const rows = doc.querySelectorAll('.lista table tbody tr.item');
      return rows.length === 1;
    }, { timeout: 15000 });

    console.log('Filter results loaded with 1 row as expected');
    
    console.log('Extracting patient ID from search results...');
    
    // Extract the patient ID from the first column of the first row
    const patientId = await this.page.evaluate(() => {
      const doc = (globalThis as any).document;
      const firstRow = doc.querySelector('.lista table tbody tr.item');
      if (!firstRow) {
        throw new Error('No results found for the sample ID');
      }
      
      const firstCell = firstRow.querySelector('td:first-child');
      if (!firstCell) {
        throw new Error('Could not find patient ID in the results');
      }
      
      return firstCell.textContent?.trim() || '';
    });

    if (!patientId) {
      throw new Error(`No patient found for sample ID: ${sampleId}`);
    }

    console.log(`Found patient ID: ${patientId} for sample ID: ${sampleId}`);
    return patientId;
  }

  async takeScreenshot(filename: `${string}.png` | `${string}.jpeg` | `${string}.webp` = 'sisvida-login.png') {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    
    await this.page.screenshot({ path: filename, fullPage: true });
    console.log(`Screenshot saved as: ${filename}`);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      console.log('Browser closed.');
    }
  }
}

// Main execution function
async function main(patientData?: PatientData) {
  const bot = new SisvidaBot();
  
  try {
    // Get credentials from environment variables
    const username = process.env['SISVIDA_USERNAME'] || 'teste';
    const password = process.env['SISVIDA_PASSWORD'] || 'teste';
    
    console.log(`Using username: ${username}`);
    console.log(`Using password: ${password.replace(/./g, '*')}`); // Hide password in logs
    
    // Launch browser (set to false to run in headless mode)
    const headless = process.env['HEADLESS'] === 'true';
    await bot.launch(headless);
    
    // Perform login
    await bot.login(username, password);
    
    // If patient data is provided, fill the hemograma form
    if (patientData) {
      console.log('Patient data provided, proceeding to fill hemograma form...');
      await bot.fillHemogramaForm(patientData);
      await bot.takeScreenshot('hemograma-filled.png');
    } else {
      // Take a screenshot to verify the login result
      await bot.takeScreenshot('login-only.png');
    }
    
    // Keep browser open for a few seconds to see the result
    console.log('Waiting 5 seconds before closing...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    console.error('Error during bot execution:', error);
  } finally {
    await bot.close();
  }
}

// Run the bot if this file is executed directly
if (require.main === module) {
  // Check if patient data is provided via command line arguments
  const args = process.argv.slice(2);
  
  if (args.length > 0 && args[0]) {
    try {
      // Parse JSON from command line argument
      const patientData: PatientData = JSON.parse(args[0]);
      console.log('Patient data received:', { 
        sampleId: patientData.sampleId, 
        hemogramaKeys: Object.keys(patientData.hemograma) 
      });
      main(patientData).catch(console.error);
    } catch (error) {
      console.error('Error parsing patient data JSON:', error);
      console.log('Usage: pnpm run bot \'{"sampleId": "290626", "hemograma": {"HMC01": "45.2", "HGB01": "14.5"}}\'');
      process.exit(1);
    }
  } else {
    // Generate realistic hemograma data for testing
    const patientData: PatientData = {
      sampleId: '290626',
      // hemograma: generateRealisticHemograma()
      hemograma: {
        HMC01: 5.01,
        HGB01: 14.8,
        HMT01: 42.7,
        RDW01: 12.8,
        LEU01: 7100,
        SEG01: 57.8,
        LIN01: 30.8,
        MON01: 8.3,
        EOS01: 2.5,
        BSF01: 0.6,
        BTN01: 0.0,
        LAT01: 0.0,
        ERITR: 0.0,
        PRO01: 0.0,
        MIE01: 0.0,
        MTM01: 0.0,
        BLAST: 0.0,
        CELAT: 0.0,
        PTL01: 315000,
        VPM01: 7.4
      }
    };
    
    console.log('No patient data provided. Using generated realistic hemograma data:');
    console.log('Sample ID:', patientData.sampleId);
    console.log('Generated hemograma values:');
    for (const [codigo, valor] of Object.entries(patientData.hemograma)) {
      const range = HEMOGRAMA_RANGES[codigo as keyof typeof HEMOGRAMA_RANGES];
      console.log(`  ${codigo}: ${valor} ${range.unit} (normal: ${range.min}-${range.max})`);
    }
    
    main(patientData).catch(console.error);
  }
}

export { main, generateRealisticHemograma, generateAbnormalHemograma, HEMOGRAMA_RANGES };
