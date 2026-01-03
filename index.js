require("dotenv").config();
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");
const express = require("express");

// ------------------- Express Server -------------------
const app = express();

// Simple ping route to prevent idle
app.get("/ping", (req, res) => {
  res.send("ok");
});

// Start Express server on Render port or 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// ------------------- Telegram Bot -------------------
const token = process.env.BOT_TOKEN;
const tokenApi = process.env.API_TOKEN;

const bot = new TelegramBot(token, { polling: true });

// Iranian months
const iranianMonths = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

// Convert Persian digits to English
function persianNumberToEnglish(persianNum) {
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  const englishDigits = "0123456789";
  return persianNum
    .split("")
    .map((c) => {
      const index = persianDigits.indexOf(c);
      return index !== -1 ? englishDigits[index] : c;
    })
    .join("");
}

// Convert English digits to Persian
function englishNumberToPersian(num) {
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  return num
    .toString()
    .split("")
    .map((c) => {
      if (/\d/.test(c)) return persianDigits[c];
      return c;
    })
    .join("");
}

// Format Unix timestamp to HH:MM in Persian
function formatTimeToPersian(unixTimestamp) {
  const date = new Date(unixTimestamp * 1000);
  const hours = englishNumberToPersian(
    date.getHours().toString().padStart(2, "0")
  );
  const minutes = englishNumberToPersian(
    date.getMinutes().toString().padStart(2, "0")
  );
  return `${hours}:${minutes}`;
}

// Handle /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "🌙 برای دریافت اوقات شرعی شهر خود لطفا نام شهر را وارد کنید."
  );
});

// Handle city messages
bot.on("message", async (msg) => {
  const chatID = msg.chat.id;
  const city = msg.text;

  // Format message received time
  const messageTime = formatTimeToPersian(msg.date);

  // Ignore commands (messages starting with /)
  if (!city.startsWith("/")) {
    try {
      // Call prayer times API
      const response = await axios.get(
        `https://one-api.ir/owghat/?token=${tokenApi}&city=` +
          encodeURIComponent(city)
      );

      const cityData = response.data.result;

      if (cityData) {
        const monthNumber = parseInt(
          persianNumberToEnglish(cityData.month),
          10
        );
        const dayNumber = englishNumberToPersian(
          persianNumberToEnglish(cityData.day)
        );
        const monthName = iranianMonths[monthNumber - 1];

        const message =
          `📅 امروز ${dayNumber} ${monthName} ساعت ${messageTime}\n` +
          `🌇 اوقات شرعی به افق ${cityData.city}:\n` +
          `🌅 اذان صبح: ${cityData.azan_sobh}\n` +
          `🌄 طلوع آفتاب: ${cityData.toloe_aftab}\n` +
          `🕌 اذان ظهر: ${cityData.azan_zohre}\n` +
          `🌆 غروب آفتاب: ${cityData.ghorob_aftab}\n` +
          `🌙 اذان مغرب: ${cityData.azan_maghreb}\n` +
          `🕛 نیمه شب شرعی: ${cityData.nime_shabe_sharie}\n`;

        bot.sendMessage(chatID, message);
      } else {
        bot.sendMessage(chatID, "❌ شهر مورد نظر وجود ندارد!");
      }
    } catch (error) {
      console.error(error);
      bot.sendMessage(chatID, "⚠️ مشکلی در دریافت اطلاعات پیش آمد!");
    }
  }
});
