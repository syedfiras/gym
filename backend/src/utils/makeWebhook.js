import axios from 'axios';

const MAKE_WEBHOOK_URL = process.env.MAKE_MEMBERSHIP_WEBHOOK_URL;

export async function triggerMakeWebhook(payload) {
  if (!MAKE_WEBHOOK_URL) {
    console.warn('[MAKE] Webhook URL not configured');
    return;
  }

  try {
    await axios.post(MAKE_WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    console.log('[MAKE] Webhook triggered successfully');
  } catch (error) {
    console.error(
      '[MAKE] Failed to trigger webhook:',
      error.response?.data || error.message
    );
  }
}
