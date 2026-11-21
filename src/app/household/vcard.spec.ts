import { vcard } from './vcard';

describe('vcard', () => {
  it('writes a vCard 3.0 with phone, email and the household address', () => {
    const card = vcard(
      { id: 'p', version: 1, name: 'Barnaby', role: 'adult', phone: '555-0101', email: 'b@x.co' },
      '11 Quillfeather Ln, Hoboken, NJ',
    );
    expect(card.split('\r\n')).toEqual([
      'BEGIN:VCARD',
      'VERSION:3.0',
      'FN:Barnaby',
      'N:;Barnaby;;;',
      'TEL;TYPE=CELL:555-0101',
      'EMAIL;TYPE=INTERNET:b@x.co',
      'ADR;TYPE=HOME:;;11 Quillfeather Ln\\, Hoboken\\, NJ;;;;',
      'END:VCARD',
      '',
    ]);
  });

  it('leaves out what the person lacks', () => {
    expect(vcard({ id: 'p', version: 1, name: 'Ida; Jr', role: 'adult' }, null)).toBe(
      'BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Ida\\; Jr\r\nN:;Ida\\; Jr;;;\r\nEND:VCARD\r\n',
    );
  });
});
