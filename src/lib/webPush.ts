import webpush from "web-push";

let configured = false;

export function getWebPushClient() {
  if (!configured) {
    const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
    const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
    const subject = process.env.WEB_PUSH_SUBJECT || "mailto:pgc.upvisayas@up.edu.ph";

    if (!publicKey || !privateKey) {
      throw new Error("Web Push VAPID keys are not configured");
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }

  return webpush;
}
