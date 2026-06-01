import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get __dirname equivalent in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serviceAccount;
try {
  // Dynamically resolve the path to the service account file
  const serviceAccountPath = path.resolve(__dirname, '../../firebase-service-account.json');
  const serviceAccountContent = fs.readFileSync(serviceAccountPath, 'utf8');
  serviceAccount = JSON.parse(serviceAccountContent);
} catch (err) {
  console.error('Failed to load Firebase service account JSON:', err);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  const message = {
    token: fcmToken,
    notification: { title, body },
    data,
  };
  try {
    await admin.messaging().send(message);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};