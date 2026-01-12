export function generateVerificationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function generateOrderCodes(): { pickupCode: string; deliveryCode: string } {
  let pickupCode = generateVerificationCode();
  let deliveryCode = generateVerificationCode();

  while (pickupCode === deliveryCode) {
    deliveryCode = generateVerificationCode();
  }

  return { pickupCode, deliveryCode };
}

export function formatVerificationCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function validateCodeFormat(code: string): boolean {
  const formatted = formatVerificationCode(code);
  return formatted.length === 5;
}
