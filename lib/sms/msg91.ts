import { SMSProvider } from "./sms-provider";

export class MSG91Provider implements SMSProvider {
  async sendOTP(phone: string, code: string): Promise<boolean> {
    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;
    const senderId = process.env.MSG91_SENDER_ID;
    const otpVarName = process.env.MSG91_OTP_VAR_NAME || "otp"; // Configurable DLT variable name

    if (!authKey || !templateId || !senderId) {
      console.error("MSG91 configuration missing");
      return false;
    }

    const cleanPhone = phone.replace(/\+/g, "");

    try {
      const response = await fetch("https://control.msg91.com/api/v5/flow/", {
        method: "POST",
        headers: {
          "authkey": authKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          template_id: templateId,
          sender: senderId,
          recipients: [
            {
              mobiles: cleanPhone,
              [otpVarName]: code
            }
          ]
        })
      });

      if (!response.ok) return false;

      // MSG91 returns HTTP 200 even on flow failures, but includes error info in body
      const resBody = await response.json();
      if (resBody.type === "error") {
        console.error("MSG91 Flow Error:", resBody.message);
        return false;
      }

      return true;
    } catch (e) {
      console.error("MSG91 send failure:", e);
      return false;
    }
  }
}
