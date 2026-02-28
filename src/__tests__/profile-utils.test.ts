import { describe, it, expect } from 'vitest';
import { getMissingProfileFields } from '../lib/profile-utils';

// Basit birim test örneği

describe('getMissingProfileFields', () => {
  it('eksik alanları doğru bulur', () => {
    const user = { avatarUrl: null, phone: '', birthDate: null, userType: 'INDIVIDUAL' };
    const result = getMissingProfileFields(user);
    expect(result).toContain('Profil fotoğrafı');
    expect(result).toContain('Telefon numarası');
    expect(result).toContain('Doğum tarihi');
  });
});
