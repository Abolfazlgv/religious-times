require("dotenv").config();
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");

// Load Telegram and API tokens from .env
const token = process.env.BOT_TOKEN;
const tokenApi = process.env.API_TOKEN;

// Initialize Telegram bot with polling
const bot = new TelegramBot(token, { polling: true });

// Array of Iranian months
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

// Function to convert Persian digits to English digits
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

// Function to convert English digits to Persian digits
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

// Function to convert Unix timestamp to HH:MM format in Persian digits
function formatTimeToPersian(unixTimestamp) {
  const date = new Date(unixTimestamp * 1000); // Convert seconds to milliseconds
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

// Handle any other messages (city names)
bot.on("message", async (msg) => {
  const chatID = msg.chat.id;
  const city = msg.text;

  // Format the message received time
  const messageTime = formatTimeToPersian(msg.date);

  // Ignore commands (messages starting with /)
  if (!city.startsWith("/")) {
    try {
      // Call the prayer times API
      const response = await axios.get(
        `https://one-api.ir/owghat/?token=${tokenApi}&city=` +
          encodeURIComponent(city)
      );

      const cityData = response.data.result;

      if (cityData) {
        // Convert Persian month to English number for array indexing
        const monthNumber = parseInt(
          persianNumberToEnglish(cityData.month),
          10
        );
        // Convert Persian day to English, then back to Persian for consistent display
        const dayNumber = englishNumberToPersian(
          persianNumberToEnglish(cityData.day)
        );
        const monthName = iranianMonths[monthNumber - 1];

        // Construct the message with Persian numbers and emojis
        const message =
          `📅 امروز ${dayNumber} ${monthName} ساعت ${messageTime}\n` +
          `🌇 اوقات شرعی به افق ${cityData.city}:\n` +
          `🌅 اذان صبح: ${cityData.azan_sobh}\n` +
          `🌄 طلوع آفتاب: ${cityData.toloe_aftab}\n` +
          `🕌 اذان ظهر: ${cityData.azan_zohre}\n` +
          `🌆 غروب آفتاب: ${cityData.ghorob_aftab}\n` +
          `🌙 اذان مغرب: ${cityData.azan_maghreb}\n` +
          `🕛 نیمه شب شرعی: ${cityData.nime_shabe_sharie}\n`;

        // Send the message to the user
        bot.sendMessage(chatID, message);
      } else {
        // If city is not found
        bot.sendMessage(chatID, "❌ شهر مورد نظر وجود ندارد!");
      }
    } catch (error) {
      // Handle API or network errors
      console.error(error);
      bot.sendMessage(chatID, "⚠️ مشکلی در دریافت اطلاعات پیش آمد!");
    }
  }
});
