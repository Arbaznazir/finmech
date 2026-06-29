import { getApiBaseUrl } from "./api-config";

export interface PaymentsConfig {
  paymentsEnabled: boolean;
  configured: boolean;
  mode: "test" | "live" | "mock";
  keyId: string | null;
  companyName: string;
  mockMode: boolean;
}

let cachedConfig: PaymentsConfig | null = null;

export async function fetchPaymentsConfig(): Promise<PaymentsConfig> {
  if (cachedConfig) return cachedConfig;

  const res = await fetch(`${getApiBaseUrl()}/payments/config`, { cache: "no-store" });
  if (!res.ok) {
    return {
      paymentsEnabled: false,
      configured: false,
      mode: "mock",
      keyId: null,
      companyName: "FinMech",
      mockMode: true,
    };
  }

  const data = await res.json();
  cachedConfig = {
    paymentsEnabled: data.paymentsEnabled,
    configured: data.configured,
    mode: data.mode,
    keyId: data.keyId,
    companyName: data.companyName,
    mockMode: data.mockMode,
  };
  return cachedConfig;
}

export function clearPaymentsConfigCache() {
  cachedConfig = null;
}
