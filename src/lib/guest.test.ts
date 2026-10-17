import {
  clearStoredGuestConsent,
  hasStoredGuestConsent,
  isGuestUser,
  storeGuestConsent,
} from './guest';

describe('guest helpers', () => {
  beforeEach(() => clearStoredGuestConsent());

  it('isGuestUser: النطاق المحجوز فقط', () => {
    expect(isGuestUser({ email: 'guest-1@guest.invalid' })).toBe(true);
    expect(isGuestUser({ email: 'GUEST-1@GUEST.INVALID' })).toBe(true);
    expect(isGuestUser({ email: 'a@notguest.invalid' })).toBe(false);
    expect(isGuestUser({ email: 'a@guest.invalid.com' })).toBe(false);
    expect(isGuestUser({ email: 'user@example.com' })).toBe(false);
    expect(isGuestUser(null)).toBe(false);
    expect(isGuestUser(undefined)).toBe(false);
  });

  it('الموافقة تُتذكَّر لنفس النسخة فقط', () => {
    expect(hasStoredGuestConsent('v1')).toBe(false);
    storeGuestConsent('v1');
    expect(hasStoredGuestConsent('v1')).toBe(true);
    expect(hasStoredGuestConsent('v2')).toBe(false); // نسخة سياسة جديدة = موافقة جديدة
  });

  it('تعذّر التخزين لا يرمى (يعود false)', () => {
    const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(hasStoredGuestConsent('v1')).toBe(false);
    spy.mockRestore();
  });
});
