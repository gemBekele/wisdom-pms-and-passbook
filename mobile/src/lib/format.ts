export function formatMoney(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}ETB ${formatted}`;
}

export function formatAmount(amount: number): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function formatDate(iso: string, language: 'en' | 'am'): string {
  const date = new Date(iso);
  try {
    return date.toLocaleDateString(language === 'am' ? 'am-ET' : 'en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function formatShortDate(iso: string, language: 'en' | 'am'): string {
  const date = new Date(iso);
  try {
    return date.toLocaleDateString(language === 'am' ? 'am-ET' : 'en-GB', {
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('251')) {
    return `+251 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  if (digits.length === 10 && digits.startsWith('09')) {
    return `0${digits.slice(1, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  if (digits.length === 9 && digits.startsWith('9')) {
    return `0${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  }
  return phone;
}

export function maskAccount(accountNumber: string): string {
  if (accountNumber.length <= 4) return accountNumber;
  return `••${accountNumber.slice(-4)}`;
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}