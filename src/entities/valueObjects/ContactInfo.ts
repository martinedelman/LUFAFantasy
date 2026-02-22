import { ValueObject } from "../base/ValueObject";

/**
 * Value Object: Información de contacto
 * Inmutable
 */
export class ContactInfo extends ValueObject {
  public readonly email?: string;
  public readonly phone?: string;
  public readonly address?: string;
  public readonly socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };

  constructor(data: {
    email?: string;
    phone?: string;
    address?: string;
    socialMedia?: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
    };
  }) {
    super();
    this.email = data.email;
    this.phone = data.phone;
    this.address = data.address;
    this.socialMedia = data.socialMedia;
  }

  public equals(vo?: ValueObject): boolean {
    if (!vo || !(vo instanceof ContactInfo)) {
      return false;
    }
    return this.email === vo.email && this.phone === vo.phone && this.address === vo.address;
  }

  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Email validation básica
    if (this.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      errors.push("El formato del email es inválido");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  public hasContact(): boolean {
    return !!(this.email || this.phone || this.address);
  }
}
