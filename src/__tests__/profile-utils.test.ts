import { describe, it, expect } from 'vitest';
import { getMissingProfileFields, getRequiredProfileFields } from '../lib/profile-utils';

describe('getMissingProfileFields', () => {
  it('eksik alanları doğru bulur', () => {
    const user = { avatarUrl: null, phone: '', birthDate: null, userType: 'INDIVIDUAL' };
    const result = getMissingProfileFields(user);
    expect(result).toContain('Profil fotoğrafı');
    expect(result).toContain('Telefon numarası');
    expect(result).toContain('Doğum tarihi');
  });

  it('tam profilde boş dizi döner', () => {
    const user = {
      name: 'Ali Veli',
      avatarUrl: 'https://example.com/avatar.jpg',
      phone: '5551234567',
      birthDate: new Date('1990-01-01'),
      userType: 'INDIVIDUAL',
      sports: [{ id: '1' }],
    };
    expect(getMissingProfileFields(user)).toEqual([]);
  });

  it('doğum tarihi yoksa eksik sayılır', () => {
    const user = { name: 'Salon', avatarUrl: 'url', phone: '555', birthDate: null, sports: [{ id: '1' }] };
    const result = getMissingProfileFields(user);
    expect(result).toContain('Doğum tarihi');
  });

  it('boş isim eksik sayılır', () => {
    const user = { name: '   ', avatarUrl: 'url', phone: '555', birthDate: new Date(), sports: [{ id: '1' }] };
    expect(getMissingProfileFields(user)).toContain('Ad soyad');
  });

  it('boş sports dizisi eksik sayılır', () => {
    const user = { name: 'Ali', avatarUrl: 'url', phone: '555', birthDate: new Date(), sports: [] };
    expect(getMissingProfileFields(user)).toContain('En az 1 spor dalı');
  });
});

describe('getRequiredProfileFields', () => {
  it('tam profilde boş dizi döner', () => {
    const user = { name: 'Ali', birthDate: new Date(), sports: [{ id: '1' }] };
    expect(getRequiredProfileFields(user)).toEqual([]);
  });

  it('eksik ad ve spor tespit eder', () => {
    const user = { name: null, birthDate: new Date(), sports: [] };
    const result = getRequiredProfileFields(user);
    expect(result).toContain('Ad soyad');
    expect(result).toContain('En az 1 spor dalı');
  });

  it('doğum tarihi yoksa zorunlu alan olarak döner', () => {
    const user = { name: 'Salon', birthDate: null, sports: [{ id: '1' }] };
    const result = getRequiredProfileFields(user);
    expect(result).toContain('Doğum tarihi');
  });

  it('telefon ve avatar kontrol etmez', () => {
    const user = { name: 'Ali', birthDate: new Date(), sports: [{ id: '1' }] };
    // avatarUrl ve phone yok ama sorun değil
    expect(getRequiredProfileFields(user)).toEqual([]);
  });
});
