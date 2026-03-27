export const ValidationRules = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Email inválido',
  },
  phone: {
    pattern: /^\+?[\d\s\-()]+$/,
    message: 'Teléfono inválido',
    minLength: 10,
  },
  password: {
    minLength: 6,
    message: 'La contraseña debe tener al menos 6 caracteres',
  },
  name: {
    minLength: 3,
    message: 'El nombre debe tener al menos 3 caracteres',
  },
  required: {
    message: 'Este campo es requerido',
  },
};

export interface ValidationError {
  field: string;
  message: string;
}

export class Validator {
  static email(value: string): string {
    if (!value) return ValidationRules.required.message;
    if (!ValidationRules.email.pattern.test(value)) {
      return ValidationRules.email.message;
    }
    return '';
  }

  static phone(value: string): string {
    if (!value) return ValidationRules.required.message;
    const cleanPhone = value.replace(/[\s\-()]/g, '');
    if (cleanPhone.length < ValidationRules.phone.minLength) {
      return ValidationRules.phone.message;
    }
    if (!ValidationRules.phone.pattern.test(value)) {
      return ValidationRules.phone.message;
    }
    return '';
  }

  static password(value: string): string {
    if (!value) return ValidationRules.required.message;
    if (value.length < ValidationRules.password.minLength) {
      return ValidationRules.password.message;
    }
    return '';
  }

  static name(value: string): string {
    if (!value) return ValidationRules.required.message;
    if (value.length < ValidationRules.name.minLength) {
      return ValidationRules.name.message;
    }
    return '';
  }

  static required(value: string | number | boolean | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return ValidationRules.required.message;
    }
    return '';
  }

  static confirmPassword(password: string, confirmPassword: string): string {
    if (!confirmPassword) return ValidationRules.required.message;
    if (password !== confirmPassword) {
      return 'Las contraseñas no coinciden';
    }
    return '';
  }

  static getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
    if (password.length < 6) return 'weak';
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) return 'weak';
    if (strength <= 4) return 'medium';
    return 'strong';
  }
}
