function slugPart(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function usernameBase(fullName: string, email: string): string {
  const name = slugPart(fullName);
  const localPart = slugPart(email.split('@')[0] ?? '');
  return (name || localPart || 'user').slice(0, 24);
}

export function usernameCandidate(fullName: string, email: string, suffix = 0): string {
  const base = usernameBase(fullName, email);
  return suffix === 0 ? base : `${base.slice(0, 32 - String(suffix).length - 1)}_${suffix}`;
}