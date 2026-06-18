import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
const userUid = process.env.FIREBASE_USER_UID;
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const now = new Date();
const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

const snapshot = await db
  .collection(`users/${userUid}/expenses`)
  .where("date", ">=", Timestamp.fromDate(startOfDay))
  .where("date", "<", Timestamp.fromDate(endOfDay))
  .limit(1)
  .get();

if (snapshot.empty) {
  console.log("No records today — sending Telegram reminder...");

  const message =
    `📝 *Expense Reminder*\n\n` +
    `You haven't logged any expense today (${now.toDateString()}).\n\n` +
    `Don't forget to record your transactions! 💰`;

  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    }
  );

  const result = await res.json();
  if (!result.ok) {
    console.error("Telegram error:", result);
    process.exit(1);
  }
  console.log("Reminder sent successfully.");
} else {
  console.log("Records found for today — no reminder needed.");
}
