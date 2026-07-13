import { platformPolicyRepository } from '../repositories/platformPolicy.repository.js';

const DEFAULT_POLICIES = [
  {
    slug:    'privacy_policy',
    title:   'Privacy Policy',
    content: `ServeNow is committed to protecting your privacy.\n\nWe collect the information you provide when you register, book services, or contact support. This includes your name, email, phone number, and address.\n\nYour data is used solely to provide and improve our services. We do not sell or share your personal information with third parties except as required to fulfil bookings (e.g. sharing your name with a professional).\n\nYou may request deletion of your account and data at any time from the app settings.\n\nLast updated: July 2026`,
  },
  {
    slug:    'terms',
    title:   'Terms & Conditions',
    content: `By using ServeNow you agree to these terms.\n\n1. You must be 18 or older to use this platform.\n2. Bookings are subject to professional availability and confirmation.\n3. Cancellations made within 2 hours of the scheduled time may incur a fee.\n4. ServeNow is a marketplace; we are not responsible for the work quality of independent professionals.\n5. Fraudulent bookings or misuse of the platform will result in account suspension.\n\nLast updated: July 2026`,
  },
  {
    slug:    'data_retention',
    title:   'Data Retention Policy',
    content: `ServeNow retains your personal data for as long as your account is active.\n\nUpon account deletion:\n• Profile data is removed within 30 days.\n• Booking history is anonymised and retained for 12 months for compliance purposes.\n• Payment records are retained for 7 years as required by financial regulations.\n• Support tickets are retained for 2 years.\n\nYou may request a copy of your data at any time by contacting support@servenow.in.\n\nLast updated: July 2026`,
  },
];

export const platformPolicyService = {
  async getAll() {
    let rows = await platformPolicyRepository.getAll();
    // Seed defaults on first access if table is empty
    if (rows.length === 0) {
      for (const p of DEFAULT_POLICIES) {
        await platformPolicyRepository.upsert(p.slug, p.title, p.content);
      }
      rows = await platformPolicyRepository.getAll();
    }
    return rows;
  },

  async getBySlug(slug: string) {
    let row = await platformPolicyRepository.getBySlug(slug);
    if (!row) {
      const def = DEFAULT_POLICIES.find(p => p.slug === slug);
      if (def) row = await platformPolicyRepository.upsert(def.slug, def.title, def.content);
    }
    return row ?? null;
  },

  async upsert(slug: string, title: string, content: string) {
    return platformPolicyRepository.upsert(slug, title, content);
  },

  async create(slug: string, title: string, content: string) {
    const existing = await platformPolicyRepository.getBySlug(slug);
    if (existing) throw new Error('A policy with this slug already exists.');
    return platformPolicyRepository.create(slug, title, content);
  },

  async remove(slug: string) {
    return platformPolicyRepository.remove(slug);
  },
};
