export interface SMSProvider {
  sendOTP(phone: string, code: string): Promise<boolean>;
}

import { MSG91Provider } from "./msg91";
import { MockProvider } from "./mock";

const providerType = process.env.SMS_PROVIDER || "mock";

export const smsProvider: SMSProvider = providerType === "msg91"
  ? new MSG91Provider()
  : new MockProvider();
