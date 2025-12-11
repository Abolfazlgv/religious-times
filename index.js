require("dotenv").config();
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");

const token = process.env.BOT_TOKEN;
const tokenApi = process.env.API_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// آرایه ماه‌های ایرانی
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

// تابع تبدیل اعداد فارسی به انگلیسی
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

// تابع تبدیل اعداد انگلیسی به فارسی
function englishNumberToPersian(num) {
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  return num.toString().split("").map(c => {
    if (/\d/.test(c)) return persianDigits[c];
    return c;
  }).join("");
}

// تبدیل timestamp به ساعت:دقیقه و فارسی کردن
function formatTimeToPersian(unixTimestamp) {
  const date = new Date(unixTimestamp * 1000);
  const hours = englishNumberToPersian(date.getHours().toString().padStart(2, "0"));
  const minutes = englishNumberToPersian(date.getMinutes().toString().padStart(2, "0"));
  return `${hours}:${minutes}`;
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "🌙 برای دریافت اوقات شرعی شهر خود لطفا نام شهر را وارد کنید."
  );
});

bot.on("message", async (msg) => {
  const chatID = msg.chat.id;
  const city = msg.text;

  // زمان پیام به صورت فارسی
  const messageTime = formatTimeToPersian(msg.date);

  if (!city.startsWith("/")) {
    try {
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
