export interface VINDecodeResult {
  valid: boolean;
  make?: string;
  model?: string;
  year?: number;
  vehicleType?: string;
  error?: string;
}

export function validateVIN(vin: string): boolean {
  if (!vin || vin.length !== 17) return false;

  const invalidChars = /[IOQ]/i;
  if (invalidChars.test(vin)) return false;

  const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  const transliteration: Record<string, number> = {
    A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
    J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
    S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  };

  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const char = vin[i].toUpperCase();
    const value = /\d/.test(char) ? parseInt(char) : transliteration[char] || 0;
    sum += value * weights[i];
  }

  const checkDigit = vin[8].toUpperCase();
  const expectedCheckDigit = sum % 11 === 10 ? 'X' : String(sum % 11);

  return checkDigit === expectedCheckDigit;
}

export function decodeVIN(vin: string): VINDecodeResult {
  if (!validateVIN(vin)) {
    return {
      valid: false,
      error: 'NIV invalide. Vérifiez que vous avez entré les 17 caractères correctement.',
    };
  }

  const yearChar = vin[9].toUpperCase();
  const year = getYearFromCode(yearChar);

  const wmiCode = vin.substring(0, 3).toUpperCase();
  const makeInfo = getMakeFromWMI(wmiCode);

  return {
    valid: true,
    make: makeInfo.make,
    year,
    vehicleType: 'trailer',
  };
}

function getYearFromCode(code: string): number {
  const yearCodes: Record<string, number> = {
    'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014,
    'F': 2015, 'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019,
    'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024,
    'S': 2025, 'T': 2026, 'V': 2027, 'W': 2028, 'X': 2029,
    'Y': 2030, '1': 2031, '2': 2032, '3': 2033, '4': 2034,
    '5': 2035, '6': 2036, '7': 2037, '8': 2038, '9': 2039,
  };

  return yearCodes[code] || new Date().getFullYear();
}

function getMakeFromWMI(wmi: string): { make: string; country: string } {
  const wmiDatabase: Record<string, { make: string; country: string }> = {
    '1FT': { make: 'Ford', country: 'USA' },
    '1GC': { make: 'Chevrolet', country: 'USA' },
    '1HD': { make: 'Harley-Davidson', country: 'USA' },
    '2C3': { make: 'Chrysler', country: 'Canada' },
    '2T1': { make: 'Toyota', country: 'Canada' },
    '3VW': { make: 'Volkswagen', country: 'Mexico' },
    '4T1': { make: 'Toyota', country: 'USA' },
    '5FN': { make: 'Honda', country: 'USA' },
    'JM1': { make: 'Mazda', country: 'Japan' },
    'KNA': { make: 'Kia', country: 'South Korea' },
    'WBA': { make: 'BMW', country: 'Germany' },
    'YV1': { make: 'Volvo', country: 'Sweden' },
  };

  return wmiDatabase[wmi] || { make: 'Unknown', country: 'Unknown' };
}

export function formatVIN(vin: string): string {
  const cleaned = vin.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
  return cleaned.substring(0, 17);
}

export async function lookupVINOnline(vin: string): Promise<VINDecodeResult> {
  const localResult = decodeVIN(vin);

  if (!localResult.valid) {
    return localResult;
  }

  try {
    const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`);
    const data = await response.json();

    if (data.Results) {
      const makeResult = data.Results.find((r: any) => r.Variable === 'Make');
      const modelResult = data.Results.find((r: any) => r.Variable === 'Model');
      const yearResult = data.Results.find((r: any) => r.Variable === 'Model Year');

      return {
        valid: true,
        make: makeResult?.Value || localResult.make,
        model: modelResult?.Value || undefined,
        year: yearResult?.Value ? parseInt(yearResult.Value) : localResult.year,
        vehicleType: 'trailer',
      };
    }
  } catch (error) {
    console.warn('Online VIN lookup failed, using local decode:', error);
  }

  return localResult;
}
