import { Person } from '../map/models';

const escape = (text: string) => text.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\r?\n/g, '\\n');

/** vCard 3.0 for one person, with the household's address as their home. */
export function vcard(person: Person, address: string | null): string {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escape(person.name)}`,
    `N:;${escape(person.name)};;;`,
  ];
  if (person.phone) lines.push(`TEL;TYPE=CELL:${escape(person.phone)}`);
  if (person.email) lines.push(`EMAIL;TYPE=INTERNET:${escape(person.email)}`);
  if (address) lines.push(`ADR;TYPE=HOME:;;${escape(address)};;;;`);
  lines.push('END:VCARD');
  return lines.join('\r\n') + '\r\n';
}

export function downloadVcard(person: Person, address: string | null): void {
  const url = URL.createObjectURL(new Blob([vcard(person, address)], { type: 'text/vcard' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${person.name.replace(/[^\p{L}\p{N} .'-]+/gu, '').trim() || 'contact'}.vcf`;
  a.click();
  URL.revokeObjectURL(url);
}
