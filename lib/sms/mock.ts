import { SMSProvider } from "./sms-provider";

export class MockProvider implements SMSProvider {
  async sendOTP(phone: string, code: string): Promise<boolean> {
    console.log(`[SMS MOCK] Sending OTP code [${code}] to ${phone}`);
    return true;
  }
}
