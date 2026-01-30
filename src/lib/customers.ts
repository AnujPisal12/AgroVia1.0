export interface Customer {
  phone: string;
  memberId: string;
  name?: string;
  email?: string;
  createdAt: string;
}

const STORAGE_KEY = 'agrovia_customers';

function loadCustomers(): Customer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Customer[];
  } catch {
    return [];
  }
}

function saveCustomers(customers: Customer[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
  } catch {
    // ignore
  }
}

export function getCustomerByPhone(phone: string): Customer | undefined {
  const normalized = phone.trim();
  if (!normalized) return undefined;
  return loadCustomers().find((c) => c.phone === normalized);
}

function generateMemberId(phone: string): string {
  const suffix = phone.replace(/\D/g, '').slice(-6) || Math.random().toString(36).slice(2, 8).toUpperCase();
  return `AGV-${suffix}`;
}

export function createCustomer(opts: {
  phone: string;
  name?: string;
  email?: string;
}): Customer {
  const customers = loadCustomers();
  const existing = customers.find((c) => c.phone === opts.phone.trim());
  if (existing) return existing;

  const customer: Customer = {
    phone: opts.phone.trim(),
    memberId: generateMemberId(opts.phone),
    name: opts.name?.trim() || undefined,
    email: opts.email?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  customers.push(customer);
  saveCustomers(customers);
  return customer;
}

export function getAllCustomers(): Customer[] {
  return loadCustomers();
}

