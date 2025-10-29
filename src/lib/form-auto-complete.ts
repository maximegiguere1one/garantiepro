export interface AutoCompleteResult {
  value: string;
  label: string;
  metadata?: Record<string, any>;
}

export async function detectLocation(): Promise<{ province: string; country: string } | null> {
  try {
    if (!navigator.geolocation) {
      return null;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
            );
            const data = await response.json();
            const province = data.address?.state || 'QC';
            const country = data.address?.country || 'Canada';
            resolve({ province, country });
          } catch {
            resolve(null);
          }
        },
        () => resolve(null),
        { timeout: 5000 }
      );
    });
  } catch {
    return null;
  }
}

export function parseFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(' ');
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };

  const lastName = parts.pop() || '';
  const firstName = parts.join(' ');
  return { firstName, lastName };
}

export function parseAddress(address: string): {
  street: string;
  city: string;
  province: string;
  postalCode: string;
} {
  const result = {
    street: '',
    city: '',
    province: '',
    postalCode: '',
  };

  const postalCodeRegex = /[A-Z]\d[A-Z]\s?\d[A-Z]\d/i;
  const postalMatch = address.match(postalCodeRegex);
  if (postalMatch) {
    result.postalCode = postalMatch[0].toUpperCase().replace(/\s/g, '');
    address = address.replace(postalCodeRegex, '').trim();
  }

  const provinces = ['QC', 'ON', 'BC', 'AB', 'MB', 'SK', 'NS', 'NB', 'PE', 'NL'];
  for (const prov of provinces) {
    if (address.toUpperCase().includes(prov)) {
      result.province = prov;
      address = address.replace(new RegExp(prov, 'i'), '').trim();
      break;
    }
  }

  const parts = address.split(',').map(p => p.trim()).filter(p => p);
  if (parts.length >= 2) {
    result.street = parts.slice(0, -1).join(', ');
    result.city = parts[parts.length - 1];
  } else if (parts.length === 1) {
    result.street = parts[0];
  }

  return result;
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  return phone;
}

export function formatPostalCode(postalCode: string): string {
  const cleaned = postalCode.toUpperCase().replace(/\s/g, '');
  if (cleaned.length === 6) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  }
  return postalCode.toUpperCase();
}

export async function lookupPostalCode(postalCode: string): Promise<{
  city: string;
  province: string;
} | null> {
  const formatted = formatPostalCode(postalCode);

  const postalCodeData: Record<string, { city: string; province: string }> = {
    'H1A': { city: 'Montréal', province: 'QC' },
    'H2A': { city: 'Montréal', province: 'QC' },
    'H3A': { city: 'Montréal', province: 'QC' },
    'G1A': { city: 'Québec', province: 'QC' },
    'M5H': { city: 'Toronto', province: 'ON' },
    'V6B': { city: 'Vancouver', province: 'BC' },
  };

  const prefix = formatted.slice(0, 3);
  return postalCodeData[prefix] || null;
}

export function getRecentValues(key: string, limit: number = 5): string[] {
  try {
    const stored = localStorage.getItem(`recent_${key}`);
    if (!stored) return [];

    const values = JSON.parse(stored);
    return Array.isArray(values) ? values.slice(0, limit) : [];
  } catch {
    return [];
  }
}

export function saveRecentValue(key: string, value: string, maxItems: number = 10): void {
  if (!value || value.trim() === '') return;

  try {
    const existing = getRecentValues(key, maxItems);
    const filtered = existing.filter(v => v !== value);
    const updated = [value, ...filtered].slice(0, maxItems);
    localStorage.setItem(`recent_${key}`, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save recent value:', error);
  }
}
