const TelegramBot = require("node-telegram-bot-api");
const { Client } = require("ssh2");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path")
const axios = require("axios");
//const owner = settings.adminId;
const settings = require("./settings");
const owner = settings.adminId;
const botToken = settings.token;
const adminfile = "adminID.json";
const premiumUsersFile = "premiumUsers.json";
const domain = settings.domain;
const plta = settings.plta;
const pltc = settings.pltc;
const verifiedUsersFile = "verifiedUsers.json";

let forceJoinChannels = [
  { id: "@aboutzetzyy", name: "Channel Admin", link: "https://t.me/aboutzetzyy" },
  { id: "@grubpubliczet", name: "Group Public", link: "https://t.me/grubpubliczet" },
];

let verifiedUsers = new Set();
try {
  if (fs.existsSync(verifiedUsersFile)) {
    verifiedUsers = new Set(JSON.parse(fs.readFileSync(verifiedUsersFile)));
  }
} catch (error) {
  console.error("Error loading verified users:", error);
}

function saveVerifiedUsers() {
  try {
    fs.writeFileSync(verifiedUsersFile, JSON.stringify([...verifiedUsers]));
  } catch (error) {
    console.error("Error saving verified users:", error);
  }
}

async function checkUserMembership(userId, channelId) {
  try {
    const member = await bot.getChatMember(channelId, userId);
    const validStatuses = ['member', 'administrator', 'creator'];
    return validStatuses.includes(member.status);
  } catch (error) {
    console.error(`Error checking membership: ${error.message}`);
    return false;
  }
}

async function checkForceJoin(msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (forceJoinChannels.length === 0) {
    return true;
  }
  
  if (verifiedUsers.has(userId)) {
    return true;
  }
  
  const notJoinedChannels = [];
  
  for (const channel of forceJoinChannels) {
    const isMember = await checkUserMembership(userId, channel.id);
    if (!isMember) {
      notJoinedChannels.push(channel);
    }
  }
  
  if (notJoinedChannels.length === 0) {
    verifiedUsers.add(userId);
    saveVerifiedUsers();
    return true;
  }
  
  let messageText = `⚠️ *WAJIB JOIN CHANNEL/GROUP TERLEBIH DAHULU!*\n\n`;
  messageText += `Untuk menggunakan bot ini, kamu harus join channel/group berikut:\n\n`;
  
  const keyboard = [];
  
  notJoinedChannels.forEach((channel, index) => {
    messageText += `${index + 1}. ${channel.name}\n`;
    keyboard.push([{ text: `📢 Join ${channel.name}`, url: channel.link }]);
  });
  
  messageText += `\nSetelah join semua channel/group, klik tombol "Cek Ulang" di bawah.`;
  
  keyboard.push([{ text: "🔄 Cek Ulang", callback_data: "verify_membership" }]);
  
  await bot.sendMessage(chatId, messageText, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard }
  });
  
  return false;
}
let targetGroups = new Set();
let autoForwardInterval = null;
let forwardChatId = null;
let forwardMessageId = null;

let premiumUsers = [];
let adminUsers = ["adminID.json"];

if (fs.existsSync('groups.json')) {
    targetGroups = new Set(JSON.parse(fs.readFileSync('groups.json')));
}

function saveGroups() {
    fs.writeFileSync('groups.json', JSON.stringify([...targetGroups]));
}

try {
  premiumUsers = JSON.parse(fs.readFileSync(premiumUsersFile));
} catch (error) {
  console.error("Error reading premiumUsers file:", error);
}
const bot = new TelegramBot(botToken, { polling: true });
try {
  adminUsers = JSON.parse(fs.readFileSync(adminfile));
} catch (error) {
  console.error("Error reading adminUsers file:", error);
}
const sendMessage = (chatId, text) => bot.sendMessage(chatId, text);
function generateRandomPassword() {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#%^&*";
  const length = 10;
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    password += characters[randomIndex];
  }
  return password;
}
function getRuntime(startTime) {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  return `${hours} Jam ${minutes} Menit ${seconds} Detik`;
}
// File untuk logging
const logFile = "bot.log";

// Fungsi untuk menulis log ke file dan console
function logToFileAndConsole(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage);
  fs.appendFileSync(logFile, logMessage);
}

// Scrape proxy dari sumber yang diberikan
async function scrapeProxies() {
  const proxySources = [
    "https://api.proxyscrape.com/v3/free-proxy-list/get?request=displayproxies&protocol=http&proxy_format=ipport&format=text&timeout=20000",
    "https://raw.githubusercontent.com/ErcinDedeoglu/proxies/main/proxies/http.txt",
    "https://raw.githubusercontent.com/Zaeem20/FREE_PROXIES_LIST/master/http.txt",
    "https://raw.githubusercontent.com/Zaeem20/FREE_PROXIES_LIST/master/https.txt",
    "https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt",
    "https://raw.githubusercontent.com/officialputuid/KangProxy/KangProxy/http/http.txt",
    "https://raw.githubusercontent.com/vakhov/fresh-proxy-list/master/http.txt",
    "https://raw.githubusercontent.com/vakhov/fresh-proxy-list/master/https.txt",
    "https://raw.githubusercontent.com/berkay-digital/Proxy-Scraper/main/proxies.txt",
    "https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/http.txt",
    "https://raw.githubusercontent.com/mmpx12/proxy-list/master/http.txt",
    "https://raw.githubusercontent.com/mmpx12/proxy-list/master/https.txt",
    "https://raw.githubusercontent.com/ALIILAPRO/Proxy/main/http.txt",
    "https://raw.githubusercontent.com/HumayunShariarHimu/Proxy/main/Anonymous_HTTP_One.md",
    "https://raw.githubusercontent.com/ArrayIterator/proxy-lists/main/proxies/https.txt",
    "https://raw.githubusercontent.com/ArrayIterator/proxy-lists/main/proxies/http.txt",
    "https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/http/data.txt",
    "https://raw.githubusercontent.com/zloi-user/hideip.me/main/http.txt",
    "https://raw.githubusercontent.com/zloi-user/hideip.me/main/https.txt",
    "https://raw.githubusercontent.com/elliottophellia/proxylist/master/results/http/global/http_checked.txt",
    "https://raw.githubusercontent.com/officialputuid/KangProxy/KangProxy/https/https.txt",
  ];

  let proxies = [];

  // Hapus file proxy.txt lama
  if (fs.existsSync("proxy.txt")) {
    fs.unlinkSync("proxy.txt");
    logToFileAndConsole("proxy.txt lama berhasil dihapus");
  }

  for (const source of proxySources) {
    try {
      const response = await axios.get(source);
      proxies = proxies.concat(response.data.split("\n"));
    } catch (error) {
      logToFileAndConsole(
        `Error scraping proxies from ${source}: ${error.message}`
      );
    }
  }

  fs.writeFileSync("proxy.txt", proxies.join("\n"));
  logToFileAndConsole("Proxies successfully scraped and saved to proxy.txt");
}

// Mulai dengan scraping proxy saat bot dijalankan
scrapeProxies();
const nama = "Zetsyy";
const author = "Zetsy";
// Informasi waktu mulai bot
const startTime = Date.now();

let videoCache = null;
let videoCachePath = null;

function loadVideoToCache() {
  if (videoCache) return videoCache;

  const videoPath = path.join(__dirname, "./assets/videos/video.mp4");
  if (fs.existsSync(videoPath)) {
    videoCachePath = videoPath;
    videoCache = fs.readFileSync(videoPath);
    return videoCache;
  }
  return null;
}


//━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Command /updateproxy untuk memperbarui proxy
bot.onText(/\/updateproxy/, (msg) => {
  const chatId = msg.chat.id;
  scrapeProxies();
  const message = "Proxy Updated.";
  bot.sendMessage(chatId, message);
});
// Handler untuk command /proxycount
bot.onText(/\/proxycount/, (msg) => {
  const chatId = msg.chat.id;

  fs.readFile("proxy.txt", "utf8", (err, data) => {
    if (err) {
      bot.sendMessage(
        chatId,
        "Gagal membaca file proxy.txt. Pastikan file tersebut ada dan bisa diakses."
      );
      logToFileAndConsole(`Error reading proxy.txt: ${err.message}`);
      return;
    }

    // Pisahkan setiap baris yang ada di file proxy.txt
    const proxies = data.split("\n").filter(Boolean);
    const proxyCount = proxies.length;

    bot.sendMessage(
      chatId,
      `Jumlah proxy yang ada di proxy.txt: ${proxyCount}`
    );
    logToFileAndConsole(`Sent proxy count: ${proxyCount} to chat ${chatId}`);
  });
});
// Command /ongoing untuk mengecek command yang sedang berjalan
bot.onText(/\/ongoing/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Tidak ada command yang sedang berjalan.");
  logToFileAndConsole(`Checked ongoing commands for chat ${chatId}`);
});
bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    if ((msg.chat.type === 'group' || msg.chat.type === 'supergroup') && !msg.from.is_bot) {
        if (!targetGroups.has(chatId)) {
            targetGroups.add(chatId);
            saveGroups();
            console.log(`✅ Grup baru ditambahkan: ${chatId}`);
        }
    }
});
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const startTime = Date.now();
  const cachedVideo = loadVideoToCache();
  
  const menuText = `
╭━━━━━━━━━━━━━━━━━━━━━━❍
┃ ʙᴏᴛ ɴᴀᴍᴇ : ᴢᴇᴛᴢʏ✦ ᴊᴀsʜᴇʀ
┃ ᴅᴇᴠᴇʟᴏᴘᴇʀ : @Zeeellli
┃ ʙᴜʏ sᴄ : @Zeeellli
┃ ᴠᴇʀsɪᴏɴ : ᴠɪᴘ ʙᴜʏ ᴏɴʟʏ 
┃ ʀᴜɴᴛɪᴍᴇ : ${getRuntime(startTime)}
╰━━━━━━━━━━━━━━━━━━━━━━❍

╭━━━━━━━━━━━━━━━━━━━━━━❍
┃ [ sᴇʟᴇᴄᴛ ʙᴜᴛᴛᴏɴ ʙᴇʟᴏᴡ ]
╰━━━━━━━━━━━━━━━━━━━━━━❍
© 𝗭𝗘𝗧𝗭𝗬`;
  // Event listener for button 'My Profil'
  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "owner") {
      bot.answerCallbackQuery(callbackQuery.id);
      bot.sendMessage(callbackQuery.from.id, "OWNER @Zeeellli");
    }
  });
  // Event listener for button 'Start'
  bot.on("callback_query", (callbackQuery) => {
    if (callbackQuery.data === "start") {
      const chatId = callbackQuery.message.chat.id;
      const startTime = Date.now();

      const menuText = `
─────────────
ketik /start untuk kembali 
ke awal menu
©BY Zetsy`;
      const message = menuText;
      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "JASHER", callback_data: "cekid" },
          { text: "PAYMENT", callback_data: "payment" },
          { text: "CPANEL", callback_data: "createpanel" },
        ],
        [
          { text: "OWNERMENU", callback_data: "ownermenu" },
          { text: "INSTALLMENU", callback_data: "installmenu" },
          { text: "DOWNLOADMENU", callback_data: "download" },
        ],
        [
          { text: "TESTIMONI", 'url': "https://t.me/aboutzetzyy" },
          { text: "OWNER", 'url': "t.me/Zeeellli" },
          { text:"ROOM PUBLIC", 'url': "https://t.me/grubpubliczet" },
         ],
         [
         { text: '➕ ADD GROUP', 'url': "https://t.me/JasherFreeZetsybot?startgroup=true" }
        ],
          ],
        },
      };
      bot.answerCallbackQuery(callbackQuery.id);
      bot.editMessageCaption(message, {
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
        reply_markup: keyboard,
        parse_mode: "Markdown",
      });
    }
  });
  //▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
  // ramlist2
  const message = menuText;
  const keyboard = {
    caption: message,
    reply_markup: {
      inline_keyboard: [
        [
      { text: "JASHER", callback_data: "cekid" },
          { text: "PAYMENT", callback_data: "payment" },
          { text: "CPANEL", callback_data: "createpanel" },
        ],
        [
          { text: "OWNERMENU", callback_data: "ownermenu" },
          { text: "INSTALLMENU", callback_data: "installmenu" },
          { text: "DOWNLOADMENU", callback_data: "download" },
        ],
        [
          { text: "TESTIMONI", 'url': "https://t.me/aboutzetzyy" },
          { text: "OWNER", 'url': "t.me/Zeeellli" },
          { text:"ROOM PUBLIC", 'url': "https://t.me/grubpubliczet" },
         ],
         [
         { text: '➕ ADD GROUP', 'url': "https://t.me/JasherFreeZetsybot?startgroup=true" }
        ],
          ],
        },
      };
  bot.sendVideo(chatId, cachedVideo, keyboard);
});
bot.on("callback_query", (callbackQuery) => {
  if (callbackQuery.data === "createpanel") {
    bot.answerCallbackQuery(callbackQuery.id);
    const ramListMessage =
      "┏━⬣『 CREATE PANEL 』\n│› 1gb user,idtele\n║› 2gb user,idtele\n│› 3gb user,idtele\n║› 4gb user,idtele\n│› 5gb user,idtele\n║› 6gb user,idtele\n│› 7gb user,idtele\n║› 8gb user,idtele\n│› 9gb user,idtele\n║› 10gb user,idtele\n│› unli user,idtele\n║› createadmin user,idtele\n┗━━━━━━━━━━⬣\n  ⿻ Powered By @@Zeeellli";
    bot.editMessageCaption(ramListMessage, {
      chat_id: callbackQuery.message.chat.id,
      message_id: callbackQuery.message.message_id,
      reply_markup: {
        inline_keyboard: [
          [
          { text: "JASHER", callback_data: "cekid" },
          { text: "PAYMENT", callback_data: "payment" },
          { text: "CPANEL", callback_data: "createpanel" },
        ],
        [
          { text: "OWNERMENU", callback_data: "ownermenu" },
          { text: "INSTALLMENU", callback_data: "installmenu" },
          { text: "DOWNLOADMENU", callback_data: "download" },
        ],
        [
          { text: "TESTIMONI", 'url': "https://t.me/aboutzetzyy" },
          { text: "OWNER", 'url': "t.me/@Zeeellli" },
          { text:"ROOM PUBLIC", 'url': "https://t.me/grubpubliczet" },
         ],
         [
         { text: '➕ ADD GROUP', 'url': "https://t.me/JasherFreeZetsybot?startgroup=true" }
        ],
          ],
        },
    });
  }
});
bot.on("callback_query", (callbackQuery) => {
  if (callbackQuery.data === "cekid") {
    bot.answerCallbackQuery(callbackQuery.id);
    const ramListMessage =
      "┏━⌲KONTROL JASHER ANDA\n║\n│› /set ᴛᴇxᴛ ᴘʀᴏᴍᴏsɪ\n║› /share ᴊᴘᴍ ɢʀᴜᴘ\n│› /auto ᴀᴜᴛᴏ ᴘʀᴏᴍᴏsɪ\n║\n┗━━━━━━━⬣\n   Powered By @@Zeeellli";
    bot.editMessageCaption(ramListMessage, {
      chat_id: callbackQuery.message.chat.id,
      message_id: callbackQuery.message.message_id,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "JASHER", callback_data: "cekid" },
          { text: "PAYMENT", callback_data: "payment" },
          { text: "CPANEL", callback_data: "createpanel" },
        ],
        [
          { text: "OWNERMENU", callback_data: "ownermenu" },
          { text: "INSTALLMENU", callback_data: "installmenu" },
          { text: "DOWNLOADMENU", callback_data: "download" },
        ],
                [
          { text: "TESTIMONI", 'url': "https://t.me/aboutzetzyy" },
          { text: "OWNER", 'url': "t.me/Zeeellli" },
          { text:"ROOM PUBLIC", 'url': "https://t.me/grubpubliczet" },
         ],
         [
         { text: '➕ ADD GROUP', 'url': "https://t.me/JasherFreeZetsybot?startgroup=true" }
        ],
          ],
        },
    });
  }
});
bot.on("callback_query", (callbackQuery) => {
  if (callbackQuery.data === "installmenu") {
    bot.answerCallbackQuery(callbackQuery.id);
    const ramListMessage =
      "┏━━⬣『 INSTALLMENU 』\n│› /installpanel\n║› /uninstallpanel\n│› /hackback\n║› /installdepend\n│› /stellar\n║› /elysium\n│› /installpanel2\n┗━━━━━━━⬣\n   Powered By @@Zeeellli";
    bot.editMessageCaption(ramListMessage, {
      chat_id: callbackQuery.message.chat.id,
      message_id: callbackQuery.message.message_id,
      reply_markup: {
        inline_keyboard: [
          [
           { text: "JASHER", callback_data: "cekid" },
          { text: "PAYMENT", callback_data: "payment" },
          { text: "CPANEL", callback_data: "createpanel" },
        ],
        [
          { text: "OWNERMENU", callback_data: "ownermenu" },
          { text: "INSTALLMENU", callback_data: "installmenu" },
          { text: "DOWNLOADMENU", callback_data: "download" },
        ],
                [
          { text: "TESTIMONI", 'url': "https://t.me/aboutzetzyy" },
          { text: "OWNER", 'url': "t.me/@Zeeellli" },
          { text:"ROOM PUBLIC", 'url': "https://t.me/grubpubliczet" },
         ],
         [
         { text: '➕ ADD GROUP', 'url': "https://t.me/JasherFreeZetsybot?startgroup=true" }
        ],
          ],
        },
    });
  }
});
bot.on("callback_query", (callbackQuery) => {
  if (callbackQuery.data === "payment") {
    bot.answerCallbackQuery(callbackQuery.id);
    const ramListMessage =
      "┏━━⬣『 PAYMENTMENU 』\n│› /dana\n║› /gopay\n│› /qris\n║› /ovo\n│› ┗━━━━━━━⬣\n   SERTAKAN BUKTI TRANSFER KE ADMIN YA KONTOL";
    bot.editMessageCaption(ramListMessage, {
      chat_id: callbackQuery.message.chat.id,
      message_id: callbackQuery.message.message_id,
      reply_markup: {
        inline_keyboard: [
          [
           { text: "JASHER", callback_data: "cekid" },
          { text: "PAYMENT", callback_data: "payment" },
          { text: "CPANEL", callback_data: "createpanel" },
        ],
        [
          { text: "OWNERMENU", callback_data: "ownermenu" },
          { text: "INSTALLMENU", callback_data: "installmenu" },
          { text: "DOWNLOADMENU", callback_data: "download" },
        ],
                [
          { text: "TESTIMONI", 'url': "https://t.me/aboutzetzyy" },
          { text: "OWNER", 'url': "t.me/Zeeellli" },
          { text:"ROOM PUBLIC", 'url': "https://t.me/grubpubliczet" },
         ],
         [
         { text: '➕ ADD GROUP', 'url': "https://t.me/JasherFreeZetsybot?startgroup=true" }
        ],
          ],
        },
    });
  }
});
bot.on("callback_query", (callbackQuery) => {
  if (callbackQuery.data === "ownermenu") {
    bot.answerCallbackQuery(callbackQuery.id);
    const ramListMessage =
      "┏━━⬣『 OWNERMENU 』\n│› addowner\n║› addprem\n│› delowner\n║› delprem\n│› listsrv\n║› delsrv\n│› listadmin\n┗━━━━━━━⬣\n   Powered By @@Zeeellli";
    bot.editMessageCaption(ramListMessage, {
      chat_id: callbackQuery.message.chat.id,
      message_id: callbackQuery.message.message_id,
      reply_markup: {
        inline_keyboard: [
          [
          { text: "JASHER", callback_data: "cekid" },
          { text: "PAYMENT", callback_data: "payment" },
          { text: "CPANEL", callback_data: "createpanel" },
        ],
        [
          { text: "OWNERMENU", callback_data: "ownermenu" },
          { text: "INSTALLMENU", callback_data: "installmenu" },
          { text: "DOWNLOADMENU", callback_data: "download" },
        ],
                [
          { text: "TESTIMONI", 'url': "https://t.me/aboutzetzyy" },
          { text: "OWNER", 'url': "t.me/Zeeellli" },
          { text:"ROOM PUBLIC", 'url': "https://t.me/grubpubliczet" },
         ],
         [
         { text: '➕ ADD GROUP', 'url': "https://t.me/JasherFreeZetsybot?startgroup=true" }
        ],
          ],
        },
    });
  }
});
bot.on("callback_query", (callbackQuery) => {
  if (callbackQuery.data === "download") {
    bot.answerCallbackQuery(callbackQuery.id);
    const ramListMessage =
      "┏━━⬣『 DOWNLOADER 』\n│› tiktok\n║› pin\n│› youtube\n║› ig\n│› terabox\n║› videy\n│› xnxx\n┗━━━━━━━⬣\n   Powered By @@Zeeellli";
    bot.editMessageCaption(ramListMessage, {
      chat_id: callbackQuery.message.chat.id,
      message_id: callbackQuery.message.message_id,
      reply_markup: {
        inline_keyboard: [
          [
          { text: "JASHER", callback_data: "cekid" },
          { text: "PAYMENT", callback_data: "payment" },
          { text: "CPANEL", callback_data: "createpanel" },
        ],
        [
          { text: "OWNERMENU", callback_data: "ownermenu" },
          { text: "INSTALLMENU", callback_data: "installmenu" },
          { text: "DOWNLOADMENU", callback_data: "download" },
        ],
                [
          { text: "TESTIMONI", 'url': "https://t.me/aboutzetzyy" },
          { text: "OWNER", 'url': "t.me/Zeeellli" },
          { text:"ROOM PUBLIC", 'url': "https://t.me/grubpubliczet" },
         ],
         [
         { text: '➕ ADD GROUP', 'url': "https://t.me/JasherFreeZetsybot?startgroup=true" }
        ],
          ],
        },
    });
  }
});
//======MENU DOWNLOADER=====▰▰//
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// tiktok
bot.onText(/\/tiktok (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const url = match[1].trim();
  
  // Cek apakah URL TikTok
  const tiktokPattern = /(vm\.tiktok\.com|tiktok\.com|vt\.tiktok\.com)/;
  if (!tiktokPattern.test(url)) {
    return bot.sendMessage(chatId, "❌ Bukan link TikTok!");
  }
  
  try {
    // Kirim status
    const statusMsg = await bot.sendMessage(chatId, "⏳ Mengunduh video...");
    
    // API TikTok downloader
    const apiUrl = `https://cikaa-rest-api.vercel.app/download/tiktok?url=${encodeURIComponent(url)}`;
    
    console.log('Mengakses API:', apiUrl);
    
    const response = await axios.get(apiUrl, { timeout: 30000 });
    
    console.log('Response API:', response.data);
    
    // Cek response format
    if (!response.data || !response.data.result) {
      await bot.editMessageText("❌ API tidak merespon dengan benar!", {
        chat_id: chatId,
        message_id: statusMsg.message_id
      });
      return;
    }
    
    const data = response.data.result;
    
    // Cek apakah ada video
    if (!data.video || !data.video.url) {
      await bot.editMessageText("❌ Video tidak ditemukan!", {
        chat_id: chatId,
        message_id: statusMsg.message_id
      });
      return;
    }
    
    // Dapatkan video URL
    const videoUrl = data.video.url;
    
    console.log('Video URL:', videoUrl);
    
    // Update status
    await bot.editMessageText("✅ Mengirim video...", {
      chat_id: chatId,
      message_id: statusMsg.message_id
    });
    
    // Kirim video
    await bot.sendVideo(chatId, videoUrl, {
      caption: `🎵 TikTok Download\n🔗 ${url}`
    });
    
    // Hapus status
    await bot.deleteMessage(chatId, statusMsg.message_id);
    
  } catch (error) {
    console.error('TikTok error:', error.message);
    console.error('Error stack:', error.stack);
    
    let errorMsg = "❌ Gagal mengunduh video!";
    if (error.code === 'ECONNABORTED') {
      errorMsg = "⏱️ Timeout!";
    } else if (error.response) {
      errorMsg = `❌ API Error: ${error.response.status}`;
    }
    
    bot.sendMessage(chatId, `${errorMsg}\n\nCoba lagi nanti.`);
  }
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
//━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//===================MENU CPANEL===≈====≈============//
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// addprem
bot.onText(/\/addprem (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = match[1];

  if (msg.from.id.toString() === owner) {
    if (!premiumUsers.includes(userId)) {
      premiumUsers.push(userId);
      fs.writeFileSync(premiumUsersFile, JSON.stringify(premiumUsers));
      bot.sendMessage(chatId, `User ${userId} KELAZZ JADI USER BOT Zetsy.`);
    } else {
      bot.sendMessage(chatId, `User ${userId} is already a premium user.`);
    }
  } else {
    bot.sendMessage(chatId, "Only the owner can perform this action.");
  }
});
// DANA
bot.onText(/\/dana/, (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, "DANA\n0895321308269\nA/N Iwa******o\n\nSERTAKAN KIRIM PEMBUKTIAN\nTRANSFER KE OWNER,\nUNTUK MELANJUTKAN TRANSAKSI.", {
        'reply_markup' :{
            'inline_keyboard': [[{ 'text': 'CHANEL', 'url': 'https://t.me/abouzetzyy'},
            { 'text': 'OWNER', 'url': 'https://t.me/Zeeellli'}]]
        }
    })
})
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//INSTALL ELYSIUM
bot.onText(/^(\.|\#|\/)elysium$/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `Format salah!\nPenggunaan: /elysium ipvps,password`);
  });
// Menangani perintah /installdepend
bot.onText(/\/elysium (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const text = match[1];

    let t = text.split(',');
    if (t.length < 2) {
        return bot.sendMessage(chatId, `Format salah!\nPenggunaan: /elysium ipvps,password`);
    }

    let ipvps = t[0];
    let passwd = t[1];
    

    const connSettings = {
        host: ipvps,
        port: '22',
        username: 'root',
        password: passwd
    };

    const command = 'bash <(curl -s https://raw.githubusercontent.com/LeXcZxMoDz9/folderr/refs/heads/main/installp.sh)';

    const conn = new Client();
    let isSuccess = false; // Flag untuk menentukan keberhasilan koneksi

    conn.on('ready', () => {
        isSuccess = true; // Set flag menjadi true jika koneksi berhasil
        bot.sendMessage(chatId, 'PROSES INSTALL THEME DIMULAI MOHON TUNGGU 1-2 MENIT KEDEPAN');

        conn.exec(command, (err, stream) => {
            if (err) throw err;
            stream.on('close', (code, signal) => {
                console.log('Stream closed with code ' + code + ' and signal ' + signal);
                bot.sendMessage(chatId, '`SUKSES INSTALL THEME ELSYUM`');
                conn.end();
            }).on('data', (data) => {
                stream.write('1\n');
                stream.write('y\n');
                stream.write('yes\n');

                console.log('STDOUT: ' + data);
            }).stderr.on('data', (data) => {
                console.log('STDERR: ' + data);
            });
        });
    }).on('error', (err) => {
        console.log('Connection Error: ' + err);
        bot.sendMessage(chatId, 'Katasandi atau IP tidak valid');
    }).connect(connSettings);

    setTimeout(() => {
        if (isSuccess) {
            bot.sendMessage(chatId, '');
        }
    }, 60000); // 180000 ms = 3 menit
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//INSTALL STELLAR
bot.onText(/^(\.|\#|\/)stellar$/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `Format salah!\nPenggunaan: /stellar ipvps,password`);
  });
// Menangani perintah /nebula
bot.onText(/\/stellar (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const text = match[1];

    let t = text.split(',');
    if (t.length < 2) {
        return bot.sendMessage(chatId, `Format salah!\nPenggunaan: /stellar ipvps,password`);
    }

    let ipvps = t[0];
    let passwd = t[1];
    

    const connSettings = {
        host: ipvps,
        port: '22',
        username: 'root',
        password: passwd
    };

    const command = 'bash <(curl -s https://raw.githubusercontent.com/LeXcZxMoDz9/Installerlex/refs/heads/main/install.sh)';

    const conn = new Client();
    let isSuccess = false; // Flag untuk menentukan keberhasilan koneksi

    conn.on('ready', () => {
        isSuccess = true; // Set flag menjadi true jika koneksi berhasil
        bot.sendMessage(chatId, 'PROSES INSTALL THEME DIMULAI MOHON TUNGGU 5-10 MENIT KEDEPAN');

        conn.exec(command, (err, stream) => {
            if (err) throw err;
            stream.on('close', (code, signal) => {
                console.log('Stream closed with code ' + code + ' and signal ' + signal);
                bot.sendMessage(chatId, '`SUKSES INSTALL THEME PANEL STELLAR, SILAHKAN CEK WEB PANEL ANDA`');
                conn.end();
            }).on('data', (data) => {
                stream.write('1\n');
                stream.write('1\n');
                stream.write('y\n');
                stream.write('x\n');

                console.log('STDOUT: ' + data);
            }).stderr.on('data', (data) => {
                console.log('STDERR: ' + data);
            });
        });
    }).on('error', (err) => {
        console.log('Connection Error: ' + err);
        bot.sendMessage(chatId, 'Katasandi atau IP tidak valid');
    }).connect(connSettings);

    setTimeout(() => {
        if (isSuccess) {
            bot.sendMessage(chatId, '');
        }
    }, 180000); // 180000 ms = 3 menit
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//INSTALL PANEL 2
bot.onText(/^(\.|\#|\/)installpanel2$/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `𝗙𝗼𝗿𝗺𝗮𝘁 𝘀𝗮𝗹𝗮𝗵!\n𝗣𝗲𝗻𝗴𝗴𝘂𝗻𝗮𝗮𝗻: /𝗶𝗻𝘀𝘁𝗮𝗹𝗹𝗽𝗮𝗻𝗲𝗹2 𝗶𝗽𝘃𝗽𝘀,𝗽𝗮𝘀𝘀𝘄𝗼𝗿𝗱𝘃𝗽𝘀,𝗱𝗼𝗺𝗮𝗶𝗻𝗽𝗻𝗹,𝗱𝗼𝗺𝗮𝗶𝗻𝗻𝗼𝗱𝗲,𝟭𝟲𝟬𝟬𝟬𝟬𝟬𝟬`);
  });

bot.onText(/\/installpanel2 (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const t = text.split(',');

  if (t.length < 3) {
    return bot.sendMessage(chatId, '𝗙𝗼𝗿𝗺𝗮𝘁 𝘀𝗮𝗹𝗮𝗵!\n𝗣𝗲𝗻𝗴𝗴𝘂𝗻𝗮𝗮𝗻: /𝗶𝗻𝘀𝘁𝗮𝗹𝗹𝗽𝗮𝗻𝗲𝗹2 𝗶𝗽𝘃𝗽𝘀,𝗽𝗮𝘀𝘀𝘄𝗼𝗿𝗱𝘃𝗽𝘀,𝗱𝗼𝗺𝗮𝗶𝗻𝗽𝗻𝗹,𝗱𝗼𝗺𝗮𝗶𝗻𝗻𝗼𝗱𝗲,𝗿𝗮𝗺𝘃𝗽𝘀 ( ᴄᴏɴᴛᴏʜ : 𝟾𝟶𝟶𝟶 = ʀᴀᴍ 𝟾');
  }

  const ipvps = t[0];
  const passwd = t[1];
  const subdomain = t[2];
  const domainnode = t[3];
  const ramvps = t[4];

  
  const connSettings = {
    host: ipvps,
    port: 22,
    username: 'root',
    password: passwd
  };

  const password = generateRandomPassword();
  const command = 'bash <(curl -s https://pterodactyl-installer.se)';
  const commandWings = 'bash <(curl -s https://pterodactyl-installer.se)';
  const conn = new Client();

  conn.on('ready', () => {
    bot.sendMessage(chatId, '𝗣𝗥𝗢𝗦𝗘𝗦 𝗣𝗘𝗡𝗚𝗜𝗡𝗦𝗧𝗔𝗟𝗟𝗔𝗡 𝗦𝗘𝗗𝗔𝗡𝗚 𝗕𝗘𝗥𝗟𝗔𝗡𝗚𝗦𝗨𝗡𝗚 𝗠𝗢𝗛𝗢𝗡 𝗧𝗨𝗡𝗚𝗚𝗨 𝟱-𝟭𝟬𝗠𝗘𝗡𝗜𝗧');
    
    conn.exec(command, (err, stream) => {
      if (err) {
        bot.sendMessage(chatId, '𝗧𝗲𝗿𝗷𝗮𝗱𝗶 𝗸𝗲𝘀𝗮𝗹𝗮𝗵𝗮𝗻 𝘀𝗮𝗮𝘁 𝗺𝗲𝗻𝗷𝗮𝗹𝗮𝗻𝗸𝗮𝗻 𝗽𝗲𝗿𝗶𝗻𝘁𝗮𝗵 𝗶𝗻𝘀𝘁𝗮𝗹𝗮𝘀𝗶.');
        conn.end();
        return;
      }

      stream.on('close', (code, signal) => {
        console.log(`Stream closed with code ${code} and signal ${signal}`);
        installWings(conn, domainnode, subdomain, password, ramvps);
      }).on('data', (data) => {
        handlePanelInstallationInput(data, stream, subdomain, password);
      }).stderr.on('data', (data) => {
        console.log('STDERR: ' + data);
      });
    });
  }).on('error', (err) => {
    // Tangani error jika koneksi gagal
    if (err.message.includes('All configured authentication methods failed')) {
      bot.sendMessage(chatId, 'Koneksi gagal: Kata sandi salah atau VPS tidak dapat diakses.');
    } else if (err.message.includes('connect ECONNREFUSED')) {
      bot.sendMessage(chatId, 'Koneksi gagal: VPS tidak bisa diakses atau mati.');
    } else {
      bot.sendMessage(chatId, `Koneksi gagal: ${err.message}`);
    }
    console.error('Connection Error: ', err.message);
  }).connect(connSettings);
  
  async function installWings(conn, domainnode, subdomain, password, ramvps) {
    bot.sendMessage(chatId, '𝗣𝗥𝗢𝗦𝗘𝗦 𝗣𝗘𝗡𝗚𝗜𝗡𝗦𝗧𝗔𝗟𝗟𝗔𝗡 𝗪𝗜𝗡𝗚𝗦 𝗦𝗘𝗗𝗔𝗡𝗚 𝗕𝗘𝗥𝗟𝗔𝗡𝗚𝗦𝗨𝗡𝗚 𝗠𝗢𝗛𝗢𝗡 𝗧𝗨𝗡𝗚𝗚𝗨 𝟱 𝗠𝗘𝗡𝗜𝗧');
    conn.exec(commandWings, (err, stream) => {
      if (err) {
        bot.sendMessage(chatId, '𝗧𝗲𝗿𝗷𝗮𝗱𝗶 𝗸𝗲𝘀𝗮𝗹𝗮𝗵𝗮𝗻 𝘀𝗮𝗮𝘁 𝗺𝗲𝗻𝗷𝗮𝗹𝗮𝗻𝗸𝗮𝗻 𝗽𝗲𝗿𝗶𝗻𝘁𝗮𝗵 𝗶𝗻𝘀𝘁𝗮𝗹𝗮𝘀𝗶 𝘄𝗶𝗻𝗴𝘀.');
        conn.end();
        return;
      }
      
      stream.on('close', (code, signal) => {
        console.log(`Wings installation stream closed with code ${code} and signal ${signal}`);
        createNode(conn, domainnode, ramvps, subdomain, password);
      }).on('data', (data) => {
        handleWingsInstallationInput(data, stream, domainnode, subdomain);
      }).stderr.on('data', (data) => {
        console.log('STDERR: ' + data);
      });
    });
  }

  async function createNode(conn, domainnode, ramvps, subdomain, password) {
    const command = 'bash <(curl -s https://raw.githubusercontent.com/LeXcZxMoDz9/Installerlex/refs/heads/main/install.sh)';
    bot.sendMessage(chatId, '𝗠𝗘𝗠𝗨𝗟𝗔𝗜 𝗖𝗥𝗘𝗔𝗧𝗘 𝗡𝗢𝗗𝗘 & 𝗟𝗢𝗖𝗔𝗧𝗜𝗢𝗡');
    
    conn.exec(command, (err, stream) => {
      if (err) {
        bot.sendMessage(chatId, '𝗧𝗲𝗿𝗷𝗮𝗱𝗶 𝗸𝗲𝘀𝗮𝗹𝗮𝗵𝗮𝗻 𝘀𝗮𝗮𝘁 𝗺𝗲𝗺𝗯𝘂𝗮𝘁 𝗻𝗼𝗱𝗲.');
        conn.end();
        return;
      }

      stream.on('close', (code, signal) => {
        console.log(`Node creation stream closed with code ${code} and ${signal} signal`);
        conn.end();
        sendPanelData(subdomain);
      }).on('data', (data) => {
        handleNodeCreationInput(data, stream, domainnode, ramvps);
      }).stderr.on('data', (data) => {
        console.log('STDERR: ' + data);
      });
    });
  }

  function sendPanelData(subdomain) {
    bot.sendMessage(chatId, `𝗗𝗔𝗧𝗔 𝗣𝗔𝗡𝗘𝗟 𝗔𝗡𝗗𝗔\n\n𝗨𝗦𝗘𝗥𝗡𝗔𝗠𝗘: 𝗿𝗲𝘅𝘅𝗮\n𝗣𝗔𝗦𝗦𝗪𝗢𝗥𝗗: 𝗿𝗲𝘅𝘅𝗮\n𝗟𝗢𝗚𝗜𝗡: ${subdomain}\n\n𝗡𝗼𝘁𝗲: 𝗦𝗲𝗺𝘂𝗮 𝗜𝗻𝘀𝘁𝗮𝗹𝗮𝘀𝗶 𝗧𝗲𝗹𝗮𝗵 𝗦𝗲𝗹𝗲𝘀𝗮𝗶. 𝗦𝗶𝗹𝗮𝗵𝗸𝗮𝗻 𝗰𝗿𝗲𝗮𝘁𝗲 𝗮𝗹𝗹𝗼𝗰𝗮𝘁𝗶𝗼𝗻 𝗱𝗶 𝗻𝗼𝗱𝗲 𝘆𝗮𝗻𝗴 𝗱𝗶𝗯𝘂𝗮𝘁 𝗼𝗹𝗲𝗵 𝗯𝗼𝘁 𝗱𝗮𝗻 𝗮𝗺𝗯𝗶𝗹 𝘁𝗼𝗸𝗲𝗻 𝗸𝗼𝗻𝗳𝗶𝗴𝘂𝗿𝗮𝘀𝗶, 𝗹𝗮𝗹𝘂 𝗸𝗲𝘁𝗶𝗸 /𝘄𝗶𝗻𝗴𝘀 𝗶𝗽𝘃𝗽𝘀,𝗽𝘄𝘃𝗽𝘀,(𝘁𝗼𝗸𝗲𝗻). \n𝗡𝗼𝘁𝗲: 𝗛𝗮𝗿𝗮𝗽 𝘁𝘂𝗻𝗴𝗴𝘂 𝟭-𝟱 𝗺𝗲𝗻𝗶𝘁 𝗮𝗴𝗮𝗿 𝘄𝗲𝗯 𝗯𝗶𝘀𝗮 𝗱𝗶𝗮𝗸𝘀𝗲𝘀.`);
  }

  function handlePanelInstallationInput(data, stream, subdomain, password) {
    if (data.toString().includes('Input')) {
      stream.write('0\n');
    }
    if (data.toString().includes('Input')) {
            stream.write(`${password}\n`);
        }
        if (data.toString().includes('Input')) {
            stream.write(`${password}\n`);
        }
        if (data.toString().includes('Input')) {
            stream.write(`${password}\n`);
        }
        if (data.toString().includes('Input')) {
            stream.write('Asia/Jakarta\n');
        }
        if (data.toString().includes('Input')) {
            stream.write('rexxaoffc@gmail.com\n');
        }
        if (data.toString().includes('Input')) {
            stream.write('rexxaoffc@gmail.com\n');
        }
        if (data.toString().includes('Input')) {
            stream.write('rexxa\n');
        }
        if (data.toString().includes('Input')) {
            stream.write('rexxa\n');
        }
        if (data.toString().includes('Input')) {
            stream.write('rexxa\n');
        }
        if (data.toString().includes('Input')) {
            stream.write(`rexxa\n`);
        }
        if (data.toString().includes('Input')) {
            stream.write(`${subdomain}\n`);
        }
        if (data.toString().includes('Input')) {
            stream.write('y\n');
        }
        if (data.toString().includes('Input')) {
            stream.write('y\n');
        }
        if (data.toString().includes('Input')) {
            stream.write('y\n');
        }
        if (data.toString().includes('Input')) {
            stream.write('y\n');
        }
        if (data.toString().includes('Input')) {
            stream.write('yes\n');
        }
        if (data.toString().includes('Please read the Terms of Service')) {
            stream.write('A\n');
        }
        if (data.toString().includes('Input')) {
            stream.write('\n');
        }
        if (data.toString().includes('Input')) {
            stream.write('1\n');
        }
    console.log('STDOUT: ' + data);
  }

  function handleWingsInstallationInput(data, stream, domainnode, subdomain) {
    if (data.toString().includes('Input')) {
      stream.write('1\n');
    }
    if (data.toString().includes('Input')) {
            stream.write('y\n');
        }
        if (data.toString().includes('Input')) {
            stream.write('y\n');
        }
        if (data.toString().includes('Input')) {
            stream.write('y\n');
        }
        if (data.toString().includes('Input')) {
            stream.write(`${subdomain}\n`);
        }
        if (data.toString().includes('Input')) {
            stream.write('y\n');
        }
        if (data.toString().includes('Input')) {
            stream.write(`${password}\n`);
        }
        if (data.toString().includes('Input')) {
            stream.write(`${password}\n`);
        }
        if (data.toString().includes('Input')) {
            stream.write('y\n');
        }
        if (data.toString().includes('Input')) {
            stream.write(`${domainnode}\n`);
        }
        if (data.toString().includes('Input')) {
            stream.write('y\n');
        }
        if (data.toString().includes('Input')) {
            stream.write('rexxaoffc@gmail.com\n');
        }
        if (data.toString().includes('Input')) {
            stream.write('y\n');
        }
    console.log('STDOUT: ' + data);
  }

  function handleNodeCreationInput(data, stream, domainnode, ramvps) {
    stream.write('4\n');
    stream.write('ReXcZ\n');
    stream.write('ReXcZ\n');
    stream.write(`${domainnode}\n`);
    stream.write('ReXcZ\n');
    stream.write(`${ramvps}\n`);
    stream.write(`${ramvps}\n`);
    stream.write('1\n');
    console.log('STDOUT: ' + data);
  }
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//HACKBACK PANEL
bot.onText(/^(\.|\#|\/)hackback$/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `𝗙𝗼𝗿𝗺𝗮𝘁 𝘀𝗮𝗹𝗮𝗵!\n𝗣𝗲𝗻𝗴𝗴𝘂𝗻𝗮𝗮𝗻: /hackback 𝗶𝗽𝘃𝗽𝘀,𝗽𝗮𝘀𝘀𝘄𝗼𝗿𝗱`);
  });
bot.onText(/\/hackback (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const t = text.split(',');
  if (t.length < 2) {
    return bot.sendMessage(chatId, '𝗙𝗼𝗿𝗺𝗮𝘁 𝘀𝗮𝗹𝗮𝗵!\n𝗣𝗲𝗻𝗴𝗴𝘂𝗻𝗮𝗮𝗻: /hackback 𝗶𝗽𝘃𝗽𝘀,𝗽𝗮𝘀𝘀𝘄𝗼𝗿𝗱,𝘁𝗼𝗸𝗲𝗻');
  }
  const ipvps = t[0];
  const passwd = t[1];

  const connSettings = {
    host: ipvps,
    port: 22,
    username: 'root',
    password: passwd
  };
    const conn = new Client();
    const command = 'bash <(curl -s https://raw.githubusercontent.com/LeXcZxMoDz9/Installerlex/refs/heads/main/install.sh)'
 
    conn.on('ready', () => {
        isSuccess = true; // Set flag menjadi true jika koneksi berhasil
        bot.sendMessage(chatId,'PROSES HACK BACK PTERODACTYL')
        
        conn.exec(command, (err, stream) => {
            if (err) throw err;
            stream.on('close', (code, signal) => {
                console.log('Stream closed with code ${code} and ${signal} signal');
         bot.sendMessage(chatId, '𝗗𝗔𝗧𝗔 𝗣𝗔𝗡𝗘𝗟 𝗔𝗡𝗗𝗔\n\n𝗨𝗦𝗘𝗥𝗡𝗔𝗠𝗘: lexcz\n𝗣𝗔𝗦𝗦𝗪𝗢𝗥𝗗: lexcz\n\n\n');
                conn.end();
            }).on('data', (data) => {
                stream.write('7\n');
                console.log('STDOUT: ' + data);
            }).stderr.on('data', (data) => {
                console.log('STDERR: ' + data);
            });
        });
    }).on('error', (err) => {
        console.log('Connection Error: ' + err);
        bot.sendMessage(chatId, 'Katasandi atau IP tidak valid');
    }).connect(connSettings);
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//INSTALL DEPEND
bot.onText(/\/installdepend (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const text = match[1];

    let t = text.split(',');
    if (t.length < 2) {
        return bot.sendMessage(chatId, `Format salah!\nPenggunaan: /installdepend ipvps,password`);
    }

    let ipvps = t[0];
    let passwd = t[1];
    

    const connSettings = {
        host: ipvps,
        port: '22',
        username: 'root',
        password: passwd
    };

    const command = 'bash <(curl https://raw.githubusercontent.com/LeXcZxMoDz9/folderr/refs/heads/main/install.sh)';

    const conn = new Client();
    let isSuccess = false; // Flag untuk menentukan keberhasilan koneksi

    conn.on('ready', () => {
        isSuccess = true; // Set flag menjadi true jika koneksi berhasil
        bot.sendMessage(chatId, 'PROSES INSTALL DEPEND DIMULAI MOHON TUNGGU 1-2 MENIT KEDEPAN');

        conn.exec(command, (err, stream) => {
            if (err) throw err;
            stream.on('close', (code, signal) => {
                console.log('Stream closed with code ' + code + ' and signal ' + signal);
                bot.sendMessage(chatId, '`SUKSES INSTALL DEPEND ADDON/NEBULA`');
                conn.end();
            }).on('data', (data) => {
                stream.write('11\n');
                stream.write('A\n');
                stream.write('Y\n');
                stream.write('Y\n');

                console.log('STDOUT: ' + data);
            }).stderr.on('data', (data) => {
                console.log('STDERR: ' + data);
            });
        });
    }).on('error', (err) => {
        console.log('Connection Error: ' + err);
        bot.sendMessage(chatId, 'Katasandi atau IP tidak valid');
    }).connect(connSettings);

    setTimeout(() => {
        if (isSuccess) {
            bot.sendMessage(chatId, '');
        }
    }, 60000); // 180000 ms = 3 menit
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//HACKBACK PANEL
bot.onText(/^(\.|\#|\/)hackback$/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `𝗙𝗼𝗿𝗺𝗮𝘁 𝘀𝗮𝗹𝗮𝗵!\n𝗣𝗲𝗻𝗴𝗴𝘂𝗻𝗮𝗮𝗻: /hackback 𝗶𝗽𝘃𝗽𝘀,𝗽𝗮𝘀𝘀𝘄𝗼𝗿𝗱`);
  });
bot.onText(/\/hackback (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const t = text.split(',');
  if (t.length < 2) {
    return bot.sendMessage(chatId, '𝗙𝗼𝗿𝗺𝗮𝘁 𝘀𝗮𝗹𝗮𝗵!\n𝗣𝗲𝗻𝗴𝗴𝘂𝗻𝗮𝗮𝗻: /hackback 𝗶𝗽𝘃𝗽𝘀,𝗽𝗮𝘀𝘀𝘄𝗼𝗿𝗱,𝘁𝗼𝗸𝗲𝗻');
  }
  const ipvps = t[0];
  const passwd = t[1];

  const connSettings = {
    host: ipvps,
    port: 22,
    username: 'root',
    password: passwd
  };
    const conn = new Client();
    const command = 'bash <(curl -s https://raw.githubusercontent.com/LeXcZxMoDz9/Installerlex/refs/heads/main/install.sh)'
 
    conn.on('ready', () => {
        isSuccess = true; // Set flag menjadi true jika koneksi berhasil
        bot.sendMessage(chatId,'PROSES HACK BACK PTERODACTYL')
        
        conn.exec(command, (err, stream) => {
            if (err) throw err;
            stream.on('close', (code, signal) => {
                console.log('Stream closed with code ${code} and ${signal} signal');
         bot.sendMessage(chatId, '𝗗𝗔𝗧𝗔 𝗣𝗔𝗡𝗘𝗟 𝗔𝗡𝗗𝗔\n\n𝗨𝗦𝗘𝗥𝗡𝗔𝗠𝗘: lexcz\n𝗣𝗔𝗦𝗦𝗪𝗢𝗥𝗗: lexcz\n\n\n');
                conn.end();
            }).on('data', (data) => {
                stream.write('7\n');
                console.log('STDOUT: ' + data);
            }).stderr.on('data', (data) => {
                console.log('STDERR: ' + data);
            });
        });
    }).on('error', (err) => {
        console.log('Connection Error: ' + err);
        bot.sendMessage(chatId, 'Katasandi atau IP tidak valid');
    }).connect(connSettings);
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// Gopay
bot.onText(/\/gopay/, (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, "gopay\nIwa*****o\nA/N D\n\nSERTAKAN KIRIM PEMBUKTIAN\nTRANSFER KE OWNER,\nUNTUK MELANJUTKAN TRANSAKSI.", {
        'reply_markup' :{
            'inline_keyboard': [[{ 'text': 'CHANEL', 'url': 'https://t.me/abouzetzyy'},
            { 'text': 'OWNER', 'url': 'https://t.me/@Zeeellli'}]]
        }
    })
})
// qris
bot.onText(/\/qris/, (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, "Qris\nTIDAK ADA QRIS DANA OWNER BLUM PREM JIR KALO MAU QRIS PV YA NANTI DI KASIH QRIS LAIN\nA/N ZETSY\n\nSERTAKAN KIRIM PEMBUKTIAN\nTRANSFER KE OWNER,\nUNTUK MELANJUTKAN TRANSAKSI.", {
        'reply_markup' :{
            'inline_keyboard': [[{ 'text': 'CHANEL', 'url': 'https://t.me/abouzetzyy'},
            { 'text': 'OWNER', 'url': 'https://t.me/@Zeeellli'}]]
        }
    })
})
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// Ovo
bot.onText(/\/ovo/, (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, "Ovo\nTIDAK ADA\nA/N RRIZT\n\nSERTAKAN KIRIM PEMBUKTIAN\nTRANSFER KE OWNER,\nUNTUK MELANJUTKAN TRANSAKSI.", {
        'reply_markup' :{
            'inline_keyboard': [[{ 'text': 'CHANEL', 'url': 'https://t.me/abouzetzyy'},
            { 'text': 'OWNER', 'url': 'https//t.me/@Zeeellli'}]]
        }
    })
})
bot.onText(/^(\.|\#|\/)uninstallpanel$/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `𝗙𝗼𝗿𝗺𝗮𝘁 𝘀𝗮𝗹𝗮𝗵!\n𝗣𝗲𝗻𝗴𝗴𝘂𝗻𝗮𝗮𝗻: /𝘂𝗻𝗶𝗻𝘀𝘁𝗮𝗹𝗹𝗽𝗮𝗻𝗲𝗹 𝗶𝗽𝘃𝗽𝘀,𝗽𝗮𝘀𝘀𝘄𝗼𝗿𝗱`);
  });
bot.onText(/\/uninstallpanel (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const t = text.split(',');
  if (t.length < 2) {
    return bot.sendMessage(chatId, '𝗙𝗼𝗿𝗺𝗮𝘁 𝘀𝗮𝗹𝗮𝗵!\n𝗣𝗲𝗻𝗴𝗴𝘂𝗻𝗮𝗮𝗻: /𝘂𝗻𝗶𝗻𝘀𝘁𝗮𝗹𝗹𝗽𝗮𝗻𝗲𝗹 𝗶𝗽𝘃𝗽𝘀,𝗽𝗮𝘀𝘀𝘄𝗼𝗿𝗱,𝘁𝗼𝗸𝗲𝗻');
  }
  const ipvps = t[0];
  const passwd = t[1];

  const connSettings = {
    host: ipvps,
    port: 22,
    username: 'root',
    password: passwd
  };
    const conn = new Client();
    const command = 'bash <(curl -s https://pterodactyl-installer.se)'
 
    conn.on('ready', () => {
        isSuccess = true; // Set flag menjadi true jika koneksi berhasil
        bot.sendMessage(chatId,'PROSES UNINSTALL PTERODACTYL')
        
        conn.exec(command, (err, stream) => {
            if (err) throw err;
            stream.on('close', (code, signal) => {
                console.log('Stream closed with code ${code} and ${signal} signal');
         bot.sendMessage(chatId, '𝗦𝗨𝗖𝗖𝗘𝗦 𝗨𝗡𝗜𝗡𝗦𝗧𝗔𝗟𝗟 𝗣𝗧𝗘𝗥𝗢𝗗𝗔𝗖𝗧𝗬𝗟');
                conn.end();
            }).on('data', (data) => {
                stream.write('6\n');
                stream.write(`y\n`);
                stream.write('y\n');
                stream.write(`y\n`);
                stream.write('y\n');
                stream.write(`\n`);
                stream.write('\n')
                console.log('STDOUT: ' + data);
            }).stderr.on('data', (data) => {
                console.log('STDERR: ' + data);
            });
        });
    }).on('error', (err) => {
        console.log('Connection Error: ' + err);
        bot.sendMessage(chatId, 'Katasandi atau IP tidak valid');
    }).connect(connSettings);
});
bot.onText(/^(\.|\#|\/)installpanel$/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `𝗙𝗼𝗿𝗺𝗮𝘁 𝘀𝗮𝗹𝗮𝗵!\n𝗣𝗲𝗻𝗴𝗴𝘂𝗻𝗮𝗮𝗻: /𝗶𝗻𝘀𝘁𝗮𝗹𝗹𝗽𝗮𝗻𝗲𝗹1 𝗶𝗽𝘃𝗽𝘀,𝗽𝗮𝘀𝘀𝘄𝗼𝗿𝗱𝘃𝗽𝘀,𝗱𝗼𝗺𝗮𝗶𝗻𝗽𝗻𝗹,𝗱𝗼𝗺𝗮𝗶𝗻𝗻𝗼𝗱𝗲,𝟭𝟲𝟬𝟬𝟬𝟬𝟬𝟬`);
  });

bot.onText(/\/installpanel (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const t = text.split(',');

  if (t.length < 3) {
    return bot.sendMessage(chatId, '𝗙𝗼𝗿𝗺𝗮𝘁 𝘀𝗮𝗹𝗮𝗵!\n𝗣𝗲𝗻𝗴𝗴𝘂𝗻𝗮𝗮𝗻: /𝗶𝗻𝘀𝘁𝗮𝗹𝗹𝗽𝗮𝗻𝗲l 𝗶𝗽𝘃𝗽𝘀,𝗽𝗮𝘀𝘀𝘄𝗼𝗿𝗱𝘃𝗽𝘀,𝗱𝗼𝗺𝗮𝗶𝗻𝗽𝗻𝗹,𝗱𝗼𝗺𝗮𝗶𝗻𝗻𝗼𝗱𝗲,𝗿𝗮𝗺𝘃𝗽𝘀 ( ᴄᴏɴᴛᴏʜ : 𝟾𝟶𝟶𝟶 = ʀᴀᴍ 𝟾');
  }

  const ipvps = t[0];
  const passwd = t[1];
  const subdomain = t[2];
  const domainnode = t[3];
  const ramvps = t[4];

  
  const connSettings = {
    host: ipvps,
    port: 22,
    username: 'root',
    password: passwd
  };

  const password = generateRandomPassword();
  const command = 'bash <(curl -s https://pterodactyl-installer.se)';
  const commandWings = 'bash <(curl -s https://pterodactyl-installer.se)';
  const conn = new Client();

  conn.on('ready', () => {
    bot.sendMessage(chatId, '𝗣𝗥𝗢𝗦𝗘𝗦 𝗣𝗘𝗡𝗚𝗜𝗡𝗦𝗧𝗔𝗟𝗟𝗔𝗡 𝗦𝗘𝗗𝗔𝗡𝗚 𝗕𝗘𝗥𝗟𝗔𝗡𝗚𝗦𝗨𝗡𝗚 𝗠𝗢𝗛𝗢𝗡 𝗧𝗨𝗡𝗚𝗚𝗨 𝟱-𝟭𝟬𝗠𝗘𝗡𝗜𝗧');
    
    conn.exec(command, (err, stream) => {
      if (err) {
        bot.sendMessage(chatId, '𝗧𝗲𝗿𝗷𝗮𝗱𝗶 𝗸𝗲𝘀𝗮𝗹𝗮𝗵𝗮𝗻 𝘀𝗮𝗮𝘁 𝗺𝗲𝗻𝗷𝗮𝗹𝗮𝗻𝗸𝗮𝗻 𝗽𝗲𝗿𝗶𝗻𝘁𝗮𝗵 𝗶𝗻𝘀𝘁𝗮𝗹𝗮𝘀𝗶.');
        conn.end();
        return;
      }

      stream.on('close', (code, signal) => {
        console.log(`Stream closed with code ${code} and signal ${signal}`);
        installWings(conn, domainnode, subdomain, password, ramvps);
      }).on('data', (data) => {
        handlePanelInstallationInput(data, stream, subdomain, password);
      }).stderr.on('data', (data) => {
        console.log('STDERR: ' + data);
      });
    });
  }).on('error', (err) => {
    // Tangani error jika koneksi gagal
    if (err.message.includes('All configured authentication methods failed')) {
      bot.sendMessage(chatId, 'Koneksi gagal: Kata sandi salah atau VPS tidak dapat diakses.');
    } else if (err.message.includes('connect ECONNREFUSED')) {
      bot.sendMessage(chatId, 'Koneksi gagal: VPS tidak bisa diakses atau mati.');
    } else {
      bot.sendMessage(chatId, `Koneksi gagal: ${err.message}`);
    }
    console.error('Connection Error: ', err.message);
  }).connect(connSettings);
  
  async function installWings(conn, domainnode, subdomain, password, ramvps) {
    bot.sendMessage(chatId, '𝗣𝗥𝗢𝗦𝗘𝗦 𝗣𝗘𝗡𝗚𝗜𝗡𝗦𝗧𝗔𝗟𝗟𝗔𝗡 𝗪𝗜𝗡𝗚𝗦 𝗦𝗘𝗗𝗔𝗡𝗚 𝗕𝗘𝗥𝗟𝗔𝗡𝗚𝗦𝗨𝗡𝗚 𝗠𝗢𝗛𝗢𝗡 𝗧𝗨𝗡𝗚𝗚𝗨 𝟱 𝗠𝗘𝗡𝗜𝗧');
    conn.exec(commandWings, (err, stream) => {
      if (err) {
        bot.sendMessage(chatId, '𝗧𝗲𝗿𝗷𝗮𝗱𝗶 𝗸𝗲𝘀𝗮𝗹𝗮𝗵𝗮𝗻 𝘀𝗮𝗮𝘁 𝗺𝗲𝗻𝗷𝗮𝗹𝗮𝗻𝗸𝗮𝗻 𝗽𝗲𝗿𝗶𝗻𝘁𝗮𝗵 𝗶𝗻𝘀𝘁𝗮𝗹𝗮𝘀𝗶 𝘄𝗶𝗻𝗴𝘀.');
        conn.end();
        return;
      }
      
      stream.on('close', (code, signal) => {
        console.log(`Wings installation stream closed with code ${code} and signal ${signal}`);
        createNode(conn, domainnode, ramvps, subdomain, password);
      }).on('data', (data) => {
        handleWingsInstallationInput(data, stream, domainnode, subdomain);
      }).stderr.on('data', (data) => {
        console.log('STDERR: ' + data);
      });
    });
  }

  async function createNode(conn, domainnode, ramvps, subdomain, password) {
    const command = 'bash <(curl -s https://raw.githubusercontent.com/LeXcZxMoDz9/Installerlex/refs/heads/main/install.sh)';
    bot.sendMessage(chatId, '𝗠𝗘𝗠𝗨𝗟𝗔𝗜 𝗖𝗥𝗘𝗔𝗧𝗘 𝗡𝗢𝗗𝗘 & 𝗟𝗢𝗖𝗔𝗧𝗜𝗢𝗡');
    
    conn.exec(command, (err, stream) => {
      if (err) {
        bot.sendMessage(chatId, '𝗧𝗲𝗿𝗷𝗮𝗱𝗶 𝗸𝗲𝘀𝗮𝗹𝗮𝗵𝗮𝗻 𝘀𝗮𝗮𝘁 𝗺𝗲𝗺𝗯𝘂𝗮𝘁 𝗻𝗼𝗱𝗲.');
        conn.end();
        return;
      }

      stream.on('close', (code, signal) => {
        console.log(`Node creation stream closed with code ${code} and ${signal} signal`);
        conn.end();
        sendPanelData(subdomain);
      }).on('data', (data) => {
        handleNodeCreationInput(data, stream, domainnode, ramvps);
      }).stderr.on('data', (data) => {
        console.log('STDERR: ' + data);
      });
    });
  }

  function sendPanelData(subdomain) {
    bot.sendMessage(chatId, `𝗗𝗔𝗧𝗔 𝗣𝗔𝗡𝗘𝗟 𝗔𝗡𝗗𝗔\n\n𝗨𝗦𝗘𝗥𝗡𝗔𝗠𝗘: 𝗿𝗲𝘅𝘅𝗮\n𝗣𝗔𝗦𝗦𝗪𝗢𝗥𝗗: 𝗿𝗲𝘅𝘅𝗮\n𝗟𝗢𝗚𝗜𝗡: ${subdomain}\n\n𝗡𝗼𝘁𝗲: 𝗦𝗲𝗺𝘂𝗮 𝗜𝗻𝘀𝘁𝗮𝗹𝗮𝘀𝗶 𝗧𝗲𝗹𝗮𝗵 𝗦𝗲𝗹𝗲𝘀𝗮𝗶. 𝗦𝗶𝗹𝗮𝗵𝗸𝗮𝗻 𝗰𝗿𝗲𝗮𝘁𝗲 𝗮𝗹𝗹𝗼𝗰𝗮𝘁𝗶𝗼𝗻 𝗱𝗶 𝗻𝗼𝗱𝗲 𝘆𝗮𝗻𝗴 𝗱𝗶𝗯𝘂𝗮𝘁 𝗼𝗹𝗲𝗵 𝗯𝗼𝘁 𝗱𝗮𝗻 𝗮𝗺𝗯𝗶𝗹 𝘁𝗼𝗸𝗲𝗻 𝗸𝗼𝗻𝗳𝗶𝗴𝘂𝗿𝗮𝘀𝗶, 𝗹𝗮𝗹𝘂 𝗸𝗲𝘁𝗶𝗸 /𝘄𝗶𝗻𝗴𝘀 𝗶𝗽𝘃𝗽𝘀,𝗽𝘄𝘃𝗽𝘀,(𝘁𝗼𝗸𝗲𝗻). \n𝗡𝗼𝘁𝗲: 𝗛𝗮𝗿𝗮𝗽 𝘁𝘂𝗻𝗴𝗴𝘂 𝟭-𝟱 𝗺𝗲𝗻𝗶𝘁 𝗮𝗴𝗮𝗿 𝘄𝗲𝗯 𝗯𝗶𝘀𝗮 𝗱𝗶𝗮𝗸𝘀𝗲𝘀.`);
  }

  function handlePanelInstallationInput(data, stream, subdomain, password) {
    if (data.toString().includes('Input')) {
      stream.write('0\n');
    }
    if (data.toString().includes('Input')) {
            stream.write(`${password}\n`);
        }
        if (data.toString().includes('Input')) {
            stream.write(`${password}\n`);
        }
        if (data.toString().includes('Input')) {
            stream.write(`${password}\n`);
        }
        if (data.toString().includes('Input')) {
            stream.write('Asia/Jakarta\n');
        }
        if (data.toString().includes('Input')) {
            stream.write('rexxaoffc@gmail.com\n');
        }
        if (data.toString().includes('Input')) {
            stream.write('rexxaoffc@gmail.com\n');
        }
        if (data.toString().includes('Input')) {
            stream.write('rexxa\n');
        }
        if (data.toString().includes('Input')) {
            stream.write('rexxa\n');
        }
        if (data.toString().includes('Input')) {
            stream.write('rexxa\n');
        }
        if (data.toString().includes('Input')) {
            stream.write(`rexxa\n`);
        }
        if (data.toString().includes('Input')) {
            stream.write(`${subdomain}\n`);
        }
        if (data.toString().includes('Input')) {
            stream.write('y\n');
        }
        if (data.toString().includes('Input')) {
            stream.write('y\n');
        }
        if (data.toString().includes('Input')) {
            stream.write('y\n');
        }
        if (data.toString().includes('Input')) {
            stream.write('y\n');
        }
        if (data.toString().includes('Input')) {
            stream.write('yes\n');
        }
        if (data.toString().includes('Please read the Terms of Service')) {
            stream.write('Y\n');
        }
        if (data.toString().includes('Input')) {
            stream.write('\n');
        }
        if (data.toString().includes('Input')) {
            stream.write('1\n');
        }
    console.log('STDOUT: ' + data);
  }

  function handleWingsInstallationInput(data, stream, domainnode, subdomain) {
    if (data.toString().includes('Input')) {
      stream.write('1\n');
    }
    if (data.toString().includes('Input')) {
            stream.write('y\n');
        }
        if (data.toString().includes('Input')) {
            stream.write('y\n');
        }
        if (data.toString().includes('Input')) {
            stream.write('y\n');
        }
        if (data.toString().includes('Input')) {
            stream.write(`${subdomain}\n`);
        }
        if (data.toString().includes('Input')) {
            stream.write('y\n');
        }
        if (data.toString().includes('Input')) {
            stream.write(`${password}\n`);
        }
        if (data.toString().includes('Input')) {
            stream.write(`${password}\n`);
        }
        if (data.toString().includes('Input')) {
            stream.write('y\n');
        }
        if (data.toString().includes('Input')) {
            stream.write(`${domainnode}\n`);
        }
        if (data.toString().includes('Input')) {
            stream.write('y\n');
        }
        if (data.toString().includes('Input')) {
            stream.write('rexxaoffc@gmail.com\n');
        }
        if (data.toString().includes('Input')) {
            stream.write('y\n');
        }
    console.log('STDOUT: ' + data);
  }

  function handleNodeCreationInput(data, stream, domainnode, ramvps) {
    stream.write('4\n');
    stream.write('ReXcZ\n');
    stream.write('ReXcZ\n');
    stream.write(`${domainnode}\n`);
    stream.write('ReXcZ\n');
    stream.write(`${ramvps}\n`);
    stream.write(`${ramvps}\n`);
    stream.write('1\n');
    console.log('STDOUT: ' + data);
  }
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// cekid
bot.onText(/\/cekid/, (msg) => {
  const chatId = msg.chat.id;
  const sender = msg.from.username;
  const id = msg.from.id;
  const owner = "7630452576"; // Ganti dengan ID pemilik bot
  const text12 = `Hi @${sender} 
┏━━━━━⬣  
│ ID Telegram Anda: ${id}
│  Full Name Anda : @${sender}
┗━━━━━━━⬣
 Developer : @@Zeeellli`;
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Testimoni", url: "https://t.me/abouzetzyy" },
          { text: "List Produk Lainnya", url: "https://t.me/Zeeellli" },
        ],
        [{ text: "OWNER", url: "https://t.me/Zeeellli" }],
      ],
    },
  };
  bot.sendAnimation(chatId, settings.pp, {
    caption: text12,
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
//Auto Premium//
const DATA_FILE = 'premium_data.json';

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
  return { groups: [], premium: {}, user_group_count: {} };
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving data:', error);
    return false;
  }
}

// OWNER ID (ganti dengan ID kamu)
const OWNER_IDS = ['7057502492'];

// Handler bot ditambahkan/dikeluarkan dari grup
bot.on('my_chat_member', async (msg) => {
  try {
    const data = loadData();
    const chat = msg.chat;
    const user = msg.from;
    const status = msg.new_chat_member.status;
    const chatId = chat.id;
    const userId = user.id;

    if (!chat || !user || !status) return;

    const isGroup = chat.type === 'group' || chat.type === 'supergroup';

    // BOT DITAMBAHKAN KE GRUP
    if (['member', 'administrator'].includes(status)) {
      if (isGroup && !data.groups.includes(chatId)) {
        data.groups.push(chatId);

        if (!data.user_group_count) data.user_group_count = {};
        if (!data.premium) data.premium = {};

        data.user_group_count[userId] = (data.user_group_count[userId] || 0) + 1;
        const total = data.user_group_count[userId];

        if (total >= 2) {
          let memberCount = 0;
          try {
            memberCount = await bot.getChatMemberCount(chatId);
          } catch {
            memberCount = 0;
          }

          if (memberCount >= 10) { // Minimal 10 member
            const sekarang = Math.floor(Date.now() / 1000);
            data.premium[userId] = sekarang + 86400; // 24 jam

            bot.sendMessage(userId,
              `🎉 Kamu berhasil menambahkan gua ke ${total} grup (member ≥ 10).\n` +
              `✅ Akses Premium diberikan selama *1 hari*!`,
              { parse_mode: "Markdown" }
            ).catch(() => {});

            const info = `
⬡ Username: @${user.username || "-"}
⬡ ID User: \`${userId}\`
⬡ Nama Grup: ${chat.title}
⬡ ID Grup: \`${chatId}\`
⬡ Total Grup Ditambahkan: ${total}
⬡ Member Grup: ${memberCount}
`.trim();

            OWNER_IDS.forEach(owner => {
              bot.sendMessage(owner, `➕ Bot Ditambahkan ke grup baru!\n\n${info}`, { 
                parse_mode: "Markdown" 
              }).catch(() => {});
            });
          } else {
            bot.sendMessage(userId,
              `⚠️ Grup ${chat.title} hanya punya ${memberCount} member.\n❌ Tidak memenuhi syarat (minimal 10 member).`
            ).catch(() => {});
          }
        } else {
          bot.sendMessage(userId,
            `✅ Grup ${chat.title} berhasil ditambahkan.\n⚠️ Tambahkan 1 grup lagi (dengan ≥ 10 member) untuk dapatkan akses premium.`
          ).catch(() => {});
        }

        saveData(data);
      }
    }

    // BOT DIKELUARKAN DARI GRUP
    if (['left', 'kicked'].includes(status)) {
      if (isGroup && data.groups.includes(chatId)) {
        data.groups = data.groups.filter(id => id !== chatId);

        if (!data.user_group_count) data.user_group_count = {};
        if (!data.premium) data.premium = {};

        if (data.user_group_count[userId]) {
          data.user_group_count[userId]--;

          if (data.user_group_count[userId] < 2) {
            delete data.premium[userId];

            bot.sendMessage(userId,
              `❌ Kamu menghapus bot dari grup.\n🔒 Akses Premium otomatis dicabut.`
            ).catch(() => {});
          }
        }

        saveData(data);
      }
    }
  } catch (err) {
    console.error("Error my_chat_member:", err);
  }
});

// Auto cleaner untuk premium expired
setInterval(() => {
  const data = loadData();
  const now = Math.floor(Date.now() / 1000);
  let changed = false;

  for (const uid in data.premium) {
    if (data.premium[uid] <= now) {
      delete data.premium[uid];
      changed = true;
      console.log(`Premium expired untuk ${uid}`);

      bot.sendMessage(uid, "⚠️ Masa aktif Premium kamu sudah *expired*.", {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "💎 Beli Akses", url: "https://t.me/Zeeellli" }]
          ]
        }
      }).catch(() => {});
    }
  }

  if (changed) saveData(data);
}, 60 * 1000); // Cek tiap 1 menit

//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// delprem
bot.onText(/\/delprem (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = match[1];
  if (msg.from.id.toString() === owner) {
    const index = premiumUsers.indexOf(userId);
    if (index !== -1) {
      premiumUsers.splice(index, 1);
      fs.writeFileSync(premiumUsersFile, JSON.stringify(premiumUsers));
      bot.sendMessage(
        chatId,
        `User ${userId} MAMPUS KAU DI DELPREM BNGST BABI.`
      );
    } else {
      bot.sendMessage(chatId, `User ${userId} is not a premium user.`);
    }
  } else {
    bot.sendMessage(chatId, "Only the owner can perform this action.");
  }
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// addowner
bot.onText(/\/addowner (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = match[1];

  if (msg.from.id.toString() === owner) {
    if (!adminUsers.includes(userId)) {
      adminUsers.push(userId);
      fs.writeFileSync(adminfile, JSON.stringify(adminUsers));
      bot.sendMessage(
        chatId,
        `User ${userId} LEBIH KELAZZ JADI OWNER BOT RRIZT.`
      );
    } else {
      bot.sendMessage(chatId, `User ${userId} is already an admin user.`);
    }
  } else {
    bot.sendMessage(chatId, "Only the owner can perform this action.");
  }
});

bot.onText(/\/set/, (msg) => {
    const chatId = msg.chat.id;
  const premiumUsers = JSON.parse(fs.readFileSync(premiumUsersFile));
  const isPremium = premiumUsers.includes(String(msg.from.id));
  if (!isPremium) {
    bot.sendMessage(chatId, "DI ADDPREM DULU SAYANG,MINTA AMA SI ZET SANA...", {
           reply_markup: {
        inline_keyboard: [
          [{ text: "HUBUNGI ADMIN", url: "https://t.me/Zeeellli" }],
        ],
      },
    });
    return;
  }

    if (!msg.reply_to_message) {
        return bot.sendMessage(chatId, '❌ Gunakan /set dengan membalas pesan yang ingin disimpan.');
    }

    forwardChatId = chatId;
    forwardMessageId = msg.reply_to_message.message_id;
    bot.sendMessage(chatId, '✅ Pesan berhasil disimpan untuk diteruskan.');
});

bot.onText(/\/share/, (msg) => {
    const chatId = msg.chat.id;
  const premiumUsers = JSON.parse(fs.readFileSync(premiumUsersFile));
  const isPremium = premiumUsers.includes(String(msg.from.id));
  if (!isPremium) {
    bot.sendMessage(chatId, "DI ADDPREM DULU SAYANG,MINTA AMA SI ZET SANA...", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "HUBUNGI ADMIN", url: "https://t.me/Zeeellli" }],
        ],
      },
    });
    return;
  }

    if (!forwardChatId || !forwardMessageId) {
        return bot.sendMessage(chatId, '❌ Belum ada pesan yang diset. Gunakan /set.');
    }

    targetGroups.forEach(groupId => {
        bot.forwardMessage(groupId, forwardChatId, forwardMessageId).catch(err => {
            console.log(`Gagal kirim ke ${groupId}: ${err.message}`);
        });
    });

    bot.sendMessage(chatId, `✅ Pesan diteruskan ke ${targetGroups.size} grup.`);
});

bot.onText(/\/auto/, (msg) => {
    const chatId = msg.chat.id;

  const adminUsers = JSON.parse(fs.readFileSync(adminfile));
  const isAdmin = adminUsers.includes(String(msg.from.id));

  if (!isAdmin) {
    bot.sendMessage(
      chatId,
      "Perintah hanya untuk Owner, Hubungi Admin Saya Untuk Menjadi Owner atau Users Premium...",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Hubungi Admin", url: "https://t.me/Zeeellli" }],
          ],
        },
      }
    );
    return;
  }

    if (!forwardChatId || !forwardMessageId) {
        return bot.sendMessage(chatId, '❌ Belum ada pesan yang diset. Gunakan /set.');
    }

    if (autoForwardInterval) {
        clearInterval(autoForwardInterval);
        autoForwardInterval = null;
        return bot.sendMessage(chatId, '❌ Auto Promosi dimatikan.');
    }

    autoForwardInterval = setInterval(() => {
        targetGroups.forEach(groupId => {
            bot.forwardMessage(groupId, forwardChatId, forwardMessageId).catch(() => {});
        });
    }, 10 * 60 * 1000); // 5 menit

    bot.sendMessage(chatId, `✅ Auto Promosi aktif setiap 10 menit ke ${targetGroups.size} grup.`);
});
// panel
bot.onText(/\/panel/, (msg) => {
    const chatId = msg.chat.id;
    const sender = msg.from.username;
    const owner = '7577041779'; // Ganti dengan ID pemilik bot 
    const text12 = `*Hi @${sender} 👋*
    
𝗖𝗔𝗥𝗔 𝗕𝗜𝗞𝗜𝗡 𝗣𝗔𝗡𝗘𝗟 𝗕𝗬 RRIZT

𝗖𝗔𝗥𝗔 𝗔𝗗𝗗 𝗨𝗦𝗘𝗥 𝗣𝗔𝗡𝗘𝗟 :
𝗿𝗮𝗺 𝘂𝘀𝗲𝗿𝘀,𝗜𝗱

𝗰𝗼𝗻𝘁𝗼𝗵 : /𝟭𝗴𝗯 RRIZT,𝟭𝟯𝟰𝟰𝟱𝟱𝘅𝘅𝘅

𝗕𝘂𝘆 𝗣𝗿𝗲𝗺? 𝗕𝘂𝘆 𝗩𝗽𝘀? 𝗕𝘂𝘆 𝗔𝗱𝗺𝗶𝗻𝗣&𝗣𝘁 𝗣𝗮𝗻𝗲𝗹? 𝗕𝘂𝘆 𝗦𝗰? 𝗣𝘃 (@@Zeeellli)`;
    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🖥️ Buy Panel', url: 'https://t.me/Zeeellli/buy_panel' }, { text: '👤 Buy Admin', url: 'https://t.me/@Zeeellli/buyadminp & ptpanel' }],
                [{ text: '🇲🇨 Buy Vps', url: 'https://t.me/Zeeellli/buyvps' }]
            ]
        }
    };
    bot.sendPhoto(chatId, settings.pp, { caption: text12, parse_mode: 'Markdown', reply_markup: keyboard });
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// delowner
bot.onText(/\/delowner (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = match[1];

  if (msg.from.id.toString() === owner) {
    const index = adminUsers.indexOf(userId);
    if (index !== -1) {
      adminUsers.splice(index, 1);
      fs.writeFileSync(adminfile, JSON.stringify(adminUsers));
      bot.sendMessage(chatId, `User ${userId} MAMPUS KAU BABI DI DELL.`);
    } else {
      bot.sendMessage(chatId, `User ${userId} is not an admin user.`);
    }
  } else {
    bot.sendMessage(chatId, "Only the owner can perform this action.");
  }
});

bot.onText(/\/1gb (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const premiumUsers = JSON.parse(fs.readFileSync(premiumUsersFile));
  const isPremium = premiumUsers.includes(String(msg.from.id));
  if (!isPremium) {
    bot.sendMessage(chatId, "DI ADDPREM DULU SAYANG,MINTA AMA SI ZET SANA...", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "HUBUNGI ADMIN", url: "https://t.me/Zeeellli" }],
        ],
      },
    });
    return;
  }
  const t = text.split(",");
  if (t.length < 2) {
    bot.sendMessage(chatId, "Invalid format. Usage: /1gb namapanel,idtele");
    return;
  }
  const username = t[0];
  const u = t[1];
  const name = username + "1gb";
  const egg = settings.eggs;
  const loc = settings.loc;
  const memo = "1024";
  const cpu = "30";
  const disk = "1024";
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN}';
  const email = `${username}@buyer.RAJA`;
  const akunlo = settings.pp;
  const password = `${username}001`;
  let user;
  let server;
  try {
    const response = await fetch(`${domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        email: email,
        username: username,
        first_name: username,
        last_name: username,
        language: "en",
        password: password,
      }),
    });
    const data = await response.json();
    if (data.errors) {
      if (
        data.errors[0].meta.rule === "unique" &&
        data.errors[0].meta.source_field === "email"
      ) {
        bot.sendMessage(
          chatId,
          "Email already exists. Please use a different email."
        );
      } else {
        bot.sendMessage(
          chatId,
          `Error: ${JSON.stringify(data.errors[0], null, 2)}`
        );
      }
      return;
    }
    user = data.attributes;
    const response2 = await fetch(`${domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        name: name,
        description: "",
        user: user.id,
        egg: parseInt(egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: spc,
        environment: {
          INST: "npm",
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          CMD_RUN: "npm start",
        },
        limits: {
          memory: memo,
          swap: 0,
          disk: disk,
          io: 500,
          cpu: cpu,
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 1,
        },
        deploy: {
          locations: [parseInt(loc)],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });
    const data2 = await response2.json();
    server = data2.attributes;
  } catch (error) {
    bot.sendMessage(chatId, `Error: ${error.message}`);
  }
  if (user && server) {
    bot.sendMessage(
      chatId,
      `BERIKUT DATA PANEL ANDA
NAMA: ${username}
EMAIL: ${email}
ID: ${user.id}
MEMORY: ${server.limits.memory === 0 ? "Unlimited" : server.limits.memory} MB
DISK: ${server.limits.disk === 0 ? "Unlimited" : server.limits.disk} MB
CPU: ${server.limits.cpu}%`
    );
    if (akunlo) {
      bot.sendAnimation(u, akunlo, {
        caption: `Hai @${u}

 PANEL DATA ANDA :
〽️ Login : ${domain}
〽️ Username : ${user.username}
〽️ Password : ${password} 
┏━━━━━━━⬣
│• Jangan Ddos Server
│• Wajib tutup domain saat screenshot
┗━━━━━━━━━━━━━━━━━━⬣
CREATE PANEL BY Zetsy`,
      });
      bot.sendMessage(
        chatId,
        "Data panel berhasil dikirim ke ID Telegram yang dimaksud."
      );
    }
  } else {
    bot.sendMessage(chatId, "Gagal membuat data panel. Silakan coba lagi.");
  }
});
// 2gb
bot.onText(/\/2gb (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const premiumUsers = JSON.parse(fs.readFileSync(premiumUsersFile));
  const isPremium = premiumUsers.includes(String(msg.from.id));
  if (!isPremium) {
    bot.sendMessage(chatId, "DI ADDPREM DULU SAYANG,MINTA AMA SI ZET SANA...", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "HUBUNGI ADMIN", url: "https://t.me/Zeeellli" }],
        ],
      },
    });
    return;
  }
  const t = text.split(",");
  if (t.length < 2) {
    bot.sendMessage(chatId, "Invalid format. Usage: /2gb namapanel,idtele");
    return;
  }
  const username = t[0];
  const u = t[1];
  const name = username + "2gb";
  const egg = settings.eggs;
  const loc = settings.loc;
  const memo = "2048";
  const cpu = "60";
  const disk = "2048";
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN}';
  const email = `${username}_${u}@buyer.RAJA`;
  const akunlo = settings.pp;
  const password = `${username}001`;
  let user;
  let server;
  try {
    const response = await fetch(`${domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        email: email,
        username: username,
        first_name: username,
        last_name: username,
        language: "en",
        password: password,
      }),
    });
    const data = await response.json();
    if (data.errors) {
      if (
        data.errors[0].meta.rule === "unique" &&
        data.errors[0].meta.source_field === "email"
      ) {
        bot.sendMessage(
          chatId,
          "Email already exists. Please use a different email."
        );
      } else {
        bot.sendMessage(
          chatId,
          `Error: ${JSON.stringify(data.errors[0], null, 2)}`
        );
      }
      return;
    }
    user = data.attributes;
    const response2 = await fetch(`${domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        name: name,
        description: "",
        user: user.id,
        egg: parseInt(egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: spc,
        environment: {
          INST: "npm",
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          CMD_RUN: "npm start",
        },
        limits: {
          memory: memo,
          swap: 0,
          disk: disk,
          io: 500,
          cpu: cpu,
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 1,
        },
        deploy: {
          locations: [parseInt(loc)],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });
    const data2 = await response2.json();
    server = data2.attributes;
  } catch (error) {
    bot.sendMessage(chatId, `Error: ${error.message}`);
  }
  if (user && server) {
    bot.sendMessage(
      chatId,
      `BERIKUT DATA PANEL ANDA
NAMA: ${username}
EMAIL: ${email}
ID: ${user.id}
MEMORY: ${server.limits.memory === 0 ? "Unlimited" : server.limits.memory} MB
DISK: ${server.limits.disk === 0 ? "Unlimited" : server.limits.disk} MB
CPU: ${server.limits.cpu}%`
    );
    if (akunlo) {
      bot.sendAnimation(u, akunlo, {
        caption: `Hai @${u}

 PANEL DATA ANDA :
〽️ Login : ${domain}
〽️ Username : ${user.username}
〽️ Password : ${password} 
┏━━━━━━━⬣
│• Jangan Ddos Server
│• Wajib tutup domain saat screenshot
│• Jngan bagikan domain ke siapapun
┗━━━━━━━━━━━━━━━━━━⬣
CREATE PANEL BY Zetsy`,
      });
      bot.sendMessage(
        chatId,
        "Data panel berhasil dikirim ke ID Telegram yang dimaksud."
      );
    }
  } else {
    bot.sendMessage(chatId, "Gagal membuat data panel. Silakan coba lagi.");
  }
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// 3gb
// 3gb
bot.onText(/\/3gb (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const premiumUsers = JSON.parse(fs.readFileSync(premiumUsersFile));
  const isPremium = premiumUsers.includes(String(msg.from.id));
  if (!isPremium) {
    bot.sendMessage(chatId, "DI ADDPREM DULU SAYANG,MINTA AMA SI ZET SANA...", {
      reply_markup: {
        inline_keyboard: [[{ text: "HUBUNGI ADMIN", url: "@t.me/Zeeellli" }]],
      },
    });
    return;
  }
  const t = text.split(",");
  if (t.length < 2) {
    bot.sendMessage(chatId, "Invalid format. Usage: /3gb namapanel,idtele");
    return;
  }
  const username = t[0];
  const u = t[1];
  const name = username + "3gb";
  const egg = settings.eggs;
  const loc = settings.loc;
  const memo = "3072";
  const cpu = "90";
  const disk = "3072";
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN}';
  const email = `${username}@buyer.RAJA`;
  const akunlo = settings.pp;
  const password = `${username}001`;
  let user;
  let server;
  try {
    const response = await fetch(`${domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        email: email,
        username: username,
        first_name: username,
        last_name: username,
        language: "en",
        password: password,
      }),
    });
    const data = await response.json();
    if (data.errors) {
      if (
        data.errors[0].meta.rule === "unique" &&
        data.errors[0].meta.source_field === "email"
      ) {
        bot.sendMessage(chatId, "Email&user telah ada di data panel vemos.");
      } else {
        bot.sendMessage(
          chatId,
          `Error: ${JSON.stringify(data.errors[0], null, 2)}`
        );
      }
      return;
    }
    user = data.attributes;
    const response2 = await fetch(`${domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        name: name,
        description: "",
        user: user.id,
        egg: parseInt(egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: spc,
        environment: {
          INST: "npm",
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          CMD_RUN: "npm start",
        },
        limits: {
          memory: memo,
          swap: 0,
          disk: disk,
          io: 500,
          cpu: cpu,
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 1,
        },
        deploy: {
          locations: [parseInt(loc)],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });
    const data2 = await response2.json();
    server = data2.attributes;
  } catch (error) {
    bot.sendMessage(chatId, `Error: ${error.message}`);
  }
  if (user && server) {
    bot.sendMessage(
      chatId,
      `BERIKUT DATA PANEL ANDA
NAMA: ${username}
EMAIL: ${email}
ID: ${user.id}
MEMORY: ${server.limits.memory === 0 ? "Unlimited" : server.limits.memory} MB
DISK: ${server.limits.disk === 0 ? "Unlimited" : server.limits.disk} MB
CPU: ${server.limits.cpu}%`
    );
    if (akunlo) {
      bot.sendAnimation(u, akunlo, {
        caption: `Hai @${u}

PANEL DATA ANDA :
〽️ Login : ${domain}
〽️ Username : ${user.username}
〽️ Password : ${password} 
┏━━━━━━━⬣
│RULES :
│• Jangan Ddos Server
│• Wajib tutup domain saat screenshot
│• Jngan bagikan domain ke siapapun
┗━━━━━━━━━━━━━━━━━━⬣
CREATE PANEL BY Zetsy`,
      });
      bot.sendMessage(
        chatId,
        "Data panel berhasil dikirim ke ID Telegram yang dimaksud."
      );
    }
  } else {
    bot.sendMessage(chatId, "Gagal membuat data panel. Silakan coba lagi.");
  }
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// 4gb
bot.onText(/\/4gb (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const premiumUsers = JSON.parse(fs.readFileSync(premiumUsersFile));
  const isPremium = premiumUsers.includes(String(msg.from.id));
  if (!isPremium) {
    bot.sendMessage(chatId, "DI ADDPREM DULU SAYANG, MINTA SANA AMA SI ZET...", {
      reply_markup: {
        inline_keyboard: [[{ text: "HUBUNGI ADMIN", url: "@Zeeellli" }]],
      },
    });
    return;
  }
  const t = text.split(",");
  if (t.length < 2) {
    bot.sendMessage(chatId, "Invalid format. Usage: /4gb namapanel,idtele");
    return;
  }
  const username = t[0];
  const u = t[1];
  const name = username + "4gb";
  const egg = settings.eggs;
  const loc = settings.loc;
  const memo = "4048";
  const cpu = "110";
  const disk = "4048";
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN}';
  const email = `${username}@buyer.RAJA`;
  const akunlo = settings.pp;
  const password = `${username}001`;
  let user;
  let server;
  try {
    const response = await fetch(`${domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        email: email,
        username: username,
        first_name: username,
        last_name: username,
        language: "en",
        password: password,
      }),
    });
    const data = await response.json();
    if (data.errors) {
      if (
        data.errors[0].meta.rule === "unique" &&
        data.errors[0].meta.source_field === "email"
      ) {
        bot.sendMessage(
          chatId,
          "Email already exists. Please use a different email."
        );
      } else {
        bot.sendMessage(
          chatId,
          `Error: ${JSON.stringify(data.errors[0], null, 2)}`
        );
      }
      return;
    }
    user = data.attributes;
    const response2 = await fetch(`${domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        name: name,
        description: "",
        user: user.id,
        egg: parseInt(egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: spc,
        environment: {
          INST: "npm",
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          CMD_RUN: "npm start",
        },
        limits: {
          memory: memo,
          swap: 0,
          disk: disk,
          io: 500,
          cpu: cpu,
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 1,
        },
        deploy: {
          locations: [parseInt(loc)],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });
    const data2 = await response2.json();
    server = data2.attributes;
  } catch (error) {
    bot.sendMessage(chatId, `Error: ${error.message}`);
  }
  if (user && server) {
    bot.sendMessage(
      chatId,
      `BERIKUT DATA PANEL ANDA
NAMA: ${username}
EMAIL: ${email}
ID: ${user.id}
MEMORY: ${server.limits.memory === 0 ? "Unlimited" : server.limits.memory} MB
DISK: ${server.limits.disk === 0 ? "Unlimited" : server.limits.disk} MB
CPU: ${server.limits.cpu}%`
    );
    if (akunlo) {
      bot.sendAnimation(u, akunlo, {
        caption: `Hai @${u}

 PANEL DATA ANDA :
〽️ Login : ${domain}
〽️ Username : ${user.username}
〽️ Password : ${password} 
┏━━━━━━━⬣
│ RULES :
│• Jangan Ddos Server
│• Wajib tutup domain saat screenshot
│• Jngan bagikan domain ke siapapun
┗━━━━━━━━━━━━━━━━━━⬣
CREATE PANEL BY Zetsy`,
      });
      bot.sendMessage(
        chatId,
        "Data panel berhasil dikirim ke ID Telegram yang dimaksud."
      );
    }
  } else {
    bot.sendMessage(chatId, "Gagal membuat data panel. Silakan coba lagi.");
  }
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// 5gb
bot.onText(/\/5gb (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const premiumUsers = JSON.parse(fs.readFileSync(premiumUsersFile));
  const isPremium = premiumUsers.includes(String(msg.from.id));
  if (!isPremium) {
    bot.sendMessage(chatId, "DI ADDPREM DULU SAYANG, MINTA AMA SI ZET SANA...", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "HUBUNGI ADMIN", url: "https://t.me/Zeeellli" }],
        ],
      },
    });
    return;
  }
  const t = text.split(",");
  if (t.length < 2) {
    bot.sendMessage(chatId, "Invalid format. Usage: /5gb namapanel,idtele");
    return;
  }
  const username = t[0];
  const u = t[1];
  const name = username + "5gb";
  const egg = settings.eggs;
  const loc = settings.loc;
  const memo = "5048";
  const cpu = "140";
  const disk = "5048";
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN}';
  const email = `${username}@buyer.RAJA`;
  const akunlo = settings.pp;
  const password = `${username}001`;
  let user;
  let server;
  try {
    const response = await fetch(`${domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        email: email,
        username: username,
        first_name: username,
        last_name: username,
        language: "en",
        password: password,
      }),
    });
    const data = await response.json();
    if (data.errors) {
      if (
        data.errors[0].meta.rule === "unique" &&
        data.errors[0].meta.source_field === "email"
      ) {
        bot.sendMessage(chatId, "Email&user telah ada di panel vemos.");
      } else {
        bot.sendMessage(
          chatId,
          `Error: ${JSON.stringify(data.errors[0], null, 2)}`
        );
      }
      return;
    }
    user = data.attributes;
    const response2 = await fetch(`${domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        name: name,
        description: "",
        user: user.id,
        egg: parseInt(egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: spc,
        environment: {
          INST: "npm",
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          CMD_RUN: "npm start",
        },
        limits: {
          memory: memo,
          swap: 0,
          disk: disk,
          io: 500,
          cpu: cpu,
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 1,
        },
        deploy: {
          locations: [parseInt(loc)],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });
    const data2 = await response2.json();
    server = data2.attributes;
  } catch (error) {
    bot.sendMessage(chatId, `Error: ${error.message}`);
  }
  if (user && server) {
    bot.sendMessage(
      chatId,
      `BERIKUT DATA PANEL ANDA
NAMA: ${username}
EMAIL: ${email}
ID: ${user.id}
MEMORY: ${server.limits.memory === 0 ? "Unlimited" : server.limits.memory} MB
DISK: ${server.limits.disk === 0 ? "Unlimited" : server.limits.disk} MB
CPU: ${server.limits.cpu}%`
    );
    if (akunlo) {
      bot.sendAnimation(u, akunlo, {
        caption: `Hai @${u}

PANEL DATA ANDA :
〽️ Login : ${domain}
〽️ Username : ${user.username}
〽️ Password : ${password} 
┏━━━━━━━⬣
│RULES :
│• Jangan Ddos Server
│• Wajib tutup domain saat screenshot
│• Jngan bagikan domain ke siapapun
┗━━━━━━━━━━━━━━━━━━⬣
CREATE PANEL BY Zetsy`,
      });
      bot.sendMessage(
        chatId,
        "Data panel berhasil dikirim ke ID Telegram yang dimaksud."
      );
    }
  } else {
    bot.sendMessage(chatId, "Gagal membuat data panel. Silakan coba lagi.");
  }
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
bot.onText(/\/delsrv (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const srv = match[1].trim();

  const adminUsers = JSON.parse(fs.readFileSync(adminfile));
  const isAdmin = adminUsers.includes(String(msg.from.id));

  if (!isAdmin) {
    bot.sendMessage(
      chatId,
      "Perintah hanya untuk Owner, Hubungi Admin Saya Untuk Menjadi Owner atau Users Premium...",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Hubungi Admin", url: "https://t.me/Zeeellli" }],
          ],
        },
      }
    );
    return;
  }

  if (!srv) {
    bot.sendMessage(
      chatId,
      "Mohon masukkan ID server yang ingin dihapus, contoh: /delsrv 1234"
    );
    return;
  }

  try {
    let f = await fetch(domain + "/api/application/servers/" + srv, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
    });

    let res = f.ok ? { errors: null } : await f.json();

    if (res.errors) {
      bot.sendMessage(chatId, "SERVER TIDAK ADA");
    } else {
      bot.sendMessage(chatId, "SUCCESFULLY DELETE SERVER");
    }
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "Terjadi kesalahan saat menghapus server.");
  }
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// 6gb
bot.onText(/\/6gb (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const premiumUsers = JSON.parse(fs.readFileSync(premiumUsersFile));
  const isPremium = premiumUsers.includes(String(msg.from.id));
  if (!isPremium) {
    bot.sendMessage(chatId, "DI ADDPREM DULU SAYANG,MINTA AMA SI ZET SANA...", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "HUBUNGI ADMIN", url: "https://t.me/Zeeellli" }],
        ],
      },
    });
    return;
  }
  const t = text.split(",");
  if (t.length < 2) {
    bot.sendMessage(chatId, "Invalid format. Usage: /6gb namapanel,idtele");
    return;
  }
  const username = t[0];
  const u = t[1];
  const name = username + "6gb";
  const egg = settings.eggs;
  const loc = settings.loc;
  const memo = "6048";
  const cpu = "170";
  const disk = "6048";
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN}';
  const email = `${username}@buyer.RAJA`;
  const akunlo = settings.pp;
  const password = `${username}001`;
  let user;
  let server;
  try {
    const response = await fetch(`${domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        email: email,
        username: username,
        first_name: username,
        last_name: username,
        language: "en",
        password: password,
      }),
    });
    const data = await response.json();
    if (data.errors) {
      if (
        data.errors[0].meta.rule === "unique" &&
        data.errors[0].meta.source_field === "email"
      ) {
        bot.sendMessage(chatId, "Email&user telah ada di panel vemos.");
      } else {
        bot.sendMessage(
          chatId,
          `Error: ${JSON.stringify(data.errors[0], null, 2)}`
        );
      }
      return;
    }
    user = data.attributes;
    const response2 = await fetch(`${domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        name: name,
        description: "",
        user: user.id,
        egg: parseInt(egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: spc,
        environment: {
          INST: "npm",
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          CMD_RUN: "npm start",
        },
        limits: {
          memory: memo,
          swap: 0,
          disk: disk,
          io: 500,
          cpu: cpu,
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 1,
        },
        deploy: {
          locations: [parseInt(loc)],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });
    const data2 = await response2.json();
    server = data2.attributes;
  } catch (error) {
    bot.sendMessage(chatId, `Error: ${error.message}`);
  }
  if (user && server) {
    bot.sendMessage(
      chatId,
      `BERIKUT DATA PANEL ANDA
NAMA: ${username}
EMAIL: ${email}
ID: ${user.id}
MEMORY: ${server.limits.memory === 0 ? "Unlimited" : server.limits.memory} MB
DISK: ${server.limits.disk === 0 ? "Unlimited" : server.limits.disk} MB
CPU: ${server.limits.cpu}%`
    );
    if (akunlo) {
      bot.sendAnimation(u, akunlo, {
        caption: `Hai @${u}

 PANEL DATA ANDA :
〽️ Login : ${domain}
〽️ Username : ${user.username}
〽️ Password : ${password} 
┏━━━━━━━⬣
│RULES :
│• Jangan Ddos Server
│• Wajib tutup domain saat screenshot
│• Jngan bagikan domain ke siapapun
┗━━━━━━━━━━━━━━━━━━⬣
CREATE PANEL BY Zetsy`,
      });
      bot.sendMessage(
        chatId,
        "Data panel berhasil dikirim ke ID Telegram yang dimaksud."
      );
    }
  } else {
    bot.sendMessage(chatId, "Gagal membuat data panel. Silakan coba lagi.");
  }
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// 7gb
bot.onText(/\/7gb (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const premiumUsers = JSON.parse(fs.readFileSync(premiumUsersFile));
  const isPremium = premiumUsers.includes(String(msg.from.id));
  if (!isPremium) {
    bot.sendMessage(chatId, "DI ADDPREM DULU SAYANG,MINTA AMA SI ZET SANA...", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "HUBUNGI ADMIN", url: "https://t.me/Zeeellli" }],
        ],
      },
    });
    return;
  }
  const t = text.split(",");
  if (t.length < 2) {
    bot.sendMessage(chatId, "Invalid format. Usage: /7gb namapanel,idtele");
    return;
  }
  const username = t[0];
  const u = t[1];
  const name = username + "7gb";
  const egg = settings.eggs;
  const loc = settings.loc;
  const memo = "7048";
  const cpu = "200";
  const disk = "7048";
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN}';
  const email = `${username}@buyer.RAJA`;
  const akunlo = settings.pp;
  const password = `${username}001`;
  let user;
  let server;
  try {
    const response = await fetch(`${domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        email: email,
        username: username,
        first_name: username,
        last_name: username,
        language: "en",
        password: password,
      }),
    });
    const data = await response.json();
    if (data.errors) {
      if (
        data.errors[0].meta.rule === "unique" &&
        data.errors[0].meta.source_field === "email"
      ) {
        bot.sendMessage(chatId, "Email&user telah ada di panel vemos.");
      } else {
        bot.sendMessage(
          chatId,
          `Error: ${JSON.stringify(data.errors[0], null, 2)}`
        );
      }
      return;
    }
    user = data.attributes;
    const response2 = await fetch(`${domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        name: name,
        description: "",
        user: user.id,
        egg: parseInt(egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: spc,
        environment: {
          INST: "npm",
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          CMD_RUN: "npm start",
        },
        limits: {
          memory: memo,
          swap: 0,
          disk: disk,
          io: 500,
          cpu: cpu,
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 1,
        },
        deploy: {
          locations: [parseInt(loc)],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });
    const data2 = await response2.json();
    server = data2.attributes;
  } catch (error) {
    bot.sendMessage(chatId, `Error: ${error.message}`);
  }
  if (user && server) {
    bot.sendMessage(
      chatId,
      `BERIKUT DATA PANEL ANDA
NAMA: ${username}
EMAIL: ${email}
ID: ${user.id}
MEMORY: ${server.limits.memory === 0 ? "Unlimited" : server.limits.memory} MB
DISK: ${server.limits.disk === 0 ? "Unlimited" : server.limits.disk} MB
CPU: ${server.limits.cpu}%`
    );
    if (akunlo) {
      bot.sendAnimation(u, akunlo, {
        caption: `Hai @${u}

 PANEL DATA ANDA :
〽️ Login : ${domain}
〽️ Username : ${user.username}
〽️ Password : ${password} 
┏━━━━━━━⬣
│• Jangan Ddos Server
│• Wajib tutup domain saat screenshot
│• Jngan bagikan domain ke siapapun
┗━━━━━━━━━━━━━━━━━━⬣
CREATE PANEL BY Zetsy`,
      });
      bot.sendMessage(
        chatId,
        "Data panel berhasil dikirim ke ID Telegram yang dimaksud."
      );
    }
  } else {
    bot.sendMessage(chatId, "Gagal membuat data panel. Silakan coba lagi.");
  }
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// 8gb
bot.onText(/\/8gb (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const premiumUsers = JSON.parse(fs.readFileSync(premiumUsersFile));
  const isPremium = premiumUsers.includes(String(msg.from.id));
  if (!isPremium) {
    bot.sendMessage(chatId, "DI ADDPREM DULU SAYANG,MINTA AMA SI ZET SANA...", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "HUBUNGI ADMIN", url: "https://t.me/Zeeellli" }],
        ],
      },
    });
    return;
  }
  const t = text.split(",");
  if (t.length < 2) {
    bot.sendMessage(chatId, "Invalid format. Usage: /8gb namapanel,idtele");
    return;
  }
  const username = t[0];
  const u = t[1];
  const name = username + "8gb";
  const egg = settings.eggs;
  const loc = settings.loc;
  const memo = "8048";
  const cpu = "230";
  const disk = "8048";
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN}';
  const email = `${username}@buyer.RAJA`;
  const akunlo = settings.pp;
  const password = `${username}001`;
  let user;
  let server;
  try {
    const response = await fetch(`${domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        email: email,
        username: username,
        first_name: username,
        last_name: username,
        language: "en",
        password: password,
      }),
    });
    const data = await response.json();
    if (data.errors) {
      if (
        data.errors[0].meta.rule === "unique" &&
        data.errors[0].meta.source_field === "email"
      ) {
        bot.sendMessage(
          chatId,
          "Email already exists. Please use a different email."
        );
      } else {
        bot.sendMessage(
          chatId,
          `Error: ${JSON.stringify(data.errors[0], null, 2)}`
        );
      }
      return;
    }
    user = data.attributes;
    const response2 = await fetch(`${domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        name: name,
        description: "",
        user: user.id,
        egg: parseInt(egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: spc,
        environment: {
          INST: "npm",
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          CMD_RUN: "npm start",
        },
        limits: {
          memory: memo,
          swap: 0,
          disk: disk,
          io: 500,
          cpu: cpu,
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 1,
        },
        deploy: {
          locations: [parseInt(loc)],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });
    const data2 = await response2.json();
    server = data2.attributes;
  } catch (error) {
    bot.sendMessage(chatId, `Error: ${error.message}`);
  }
  if (user && server) {
    bot.sendMessage(
      chatId,
      `BERIKUT DATA PANEL ANDA
NAMA: ${username}
EMAIL: ${email}
ID: ${user.id}
MEMORY: ${server.limits.memory === 0 ? "Unlimited" : server.limits.memory} MB
DISK: ${server.limits.disk === 0 ? "Unlimited" : server.limits.disk} MB
CPU: ${server.limits.cpu}%`
    );
    if (akunlo) {
      bot.sendAnimation(u, akunlo, {
        caption: `Hai @${u}

 PANEL DATA ANDA :
〽️ Login : ${domain}
〽️ Username : ${user.username}
〽️ Password : ${password} 
┏━━━━━━━⬣
│RULES :
│• Jangan Ddos Server
│• Wajib tutup domain saat screenshot
│• Jngan bagikan domain ke siapapun
┗━━━━━━━━━━━━━━━━━━⬣
CREATE PANEL BY Zetsy`,
      });
      bot.sendMessage(
        chatId,
        "Data panel berhasil dikirim ke ID Telegram yang dimaksud."
      );
    }
  } else {
    bot.sendMessage(chatId, "Gagal membuat data panel. Silakan coba lagi.");
  }
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// 9gb
bot.onText(/\/9gb (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const premiumUsers = JSON.parse(fs.readFileSync(premiumUsersFile));
  const isPremium = premiumUsers.includes(String(msg.from.id));
  if (!isPremium) {
    bot.sendMessage(chatId, "DI ADDPREM DULU SAYANG,MINTA AMA SI ZET SANA...", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "HUBUNGI ADMIN", url: "https://t.me/Zeeellli" }],
        ],
      },
    });
    return;
  }
  const t = text.split(",");
  if (t.length < 2) {
    bot.sendMessage(chatId, "Invalid format. Usage: /9gb namapanel,idtele");
    return;
  }
  const username = t[0];
  const u = t[1];
  const name = username + "9gb";
  const egg = settings.eggs;
  const loc = settings.loc;
  const memo = "9048";
  const cpu = "260";
  const disk = "9048";
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN}';
  const email = `${username}@buyer.RAJA`;
  const akunlo = settings.pp;
  const password = `${username}001`;
  let user;
  let server;
  try {
    const response = await fetch(`${domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        email: email,
        username: username,
        first_name: username,
        last_name: username,
        language: "en",
        password: password,
      }),
    });
    const data = await response.json();
    if (data.errors) {
      if (
        data.errors[0].meta.rule === "unique" &&
        data.errors[0].meta.source_field === "email"
      ) {
        bot.sendMessage(
          chatId,
          "Email already exists. Please use a different email."
        );
      } else {
        bot.sendMessage(
          chatId,
          `Error: ${JSON.stringify(data.errors[0], null, 2)}`
        );
      }
      return;
    }
    user = data.attributes;
    const response2 = await fetch(`${domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        name: name,
        description: "",
        user: user.id,
        egg: parseInt(egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: spc,
        environment: {
          INST: "npm",
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          CMD_RUN: "npm start",
        },
        limits: {
          memory: memo,
          swap: 0,
          disk: disk,
          io: 500,
          cpu: cpu,
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 1,
        },
        deploy: {
          locations: [parseInt(loc)],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });
    const data2 = await response2.json();
    server = data2.attributes;
  } catch (error) {
    bot.sendMessage(chatId, `Error: ${error.message}`);
  }
  if (user && server) {
    bot.sendMessage(
      chatId,
      `BERIKUT DATA PANEL ANDA
NAMA: ${username}
EMAIL: ${email}
ID: ${user.id}
MEMORY: ${server.limits.memory === 0 ? "Unlimited" : server.limits.memory} MB
DISK: ${server.limits.disk === 0 ? "Unlimited" : server.limits.disk} MB
CPU: ${server.limits.cpu}%`
    );
    if (akunlo) {
      bot.sendAnimation(u, akunlo, {
        caption: `Hai @${u}

PANEL DATA ANDA :
〽️ Login : ${domain}
〽️ Username : ${user.username}
〽️ Password : ${password} 
┏━━━━━━━⬣
│RULES :
│• Jangan Ddos Server
│• Wajib tutup domain saat screenshot
│• Jngan bagikan domain ke siapapun
┗━━━━━━━━━━━━━━━━━━⬣
CREATE PANEL BY Zetsy`,
      });
      bot.sendMessage(
        chatId,
        "Data panel berhasil dikirim ke ID Telegram yang dimaksud."
      );
    }
  } else {
    bot.sendMessage(chatId, "Gagal membuat data panel. Silakan coba lagi.");
  }
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// 10gb
bot.onText(/\/10gb (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const premiumUsers = JSON.parse(fs.readFileSync(premiumUsersFile));
  const isPremium = premiumUsers.includes(String(msg.from.id));
  if (!isPremium) {
    bot.sendMessage(chatId, "DI ADDPREM DULU SAYANG,MINTA AMA SI ZET SANA...", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "HUBUNGI ADMIN", url: "https://t.me/Zeeellli" }],
        ],
      },
    });
    return;
  }
  const t = text.split(",");
  if (t.length < 2) {
    bot.sendMessage(chatId, "Invalid format. Usage: /10gb namapanel,idtele");
    return;
  }
  const username = t[0];
  const u = t[1];
  const name = username + "10gb";
  const egg = settings.eggs;
  const loc = settings.loc;
  const memo = "10000";
  const cpu = "290";
  const disk = "10000";
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN}';
  const email = `${username}@buyer.RAJA`;
  const akunlo = settings.pp;
  const password = `${username}001`;
  let user;
  let server;
  try {
    const response = await fetch(`${domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        email: email,
        username: username,
        first_name: username,
        last_name: username,
        language: "en",
        password: password,
      }),
    });
    const data = await response.json();
    if (data.errors) {
      if (
        data.errors[0].meta.rule === "unique" &&
        data.errors[0].meta.source_field === "email"
      ) {
        bot.sendMessage(
          chatId,
          "Email already exists. Please use a different email."
        );
      } else {
        bot.sendMessage(
          chatId,
          `Error: ${JSON.stringify(data.errors[0], null, 2)}`
        );
      }
      return;
    }
    user = data.attributes;
    const response2 = await fetch(`${domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        name: name,
        description: "",
        user: user.id,
        egg: parseInt(egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: spc,
        environment: {
          INST: "npm",
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          CMD_RUN: "npm start",
        },
        limits: {
          memory: memo,
          swap: 0,
          disk: disk,
          io: 500,
          cpu: cpu,
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 1,
        },
        deploy: {
          locations: [parseInt(loc)],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });
    const data2 = await response2.json();
    server = data2.attributes;
  } catch (error) {
    bot.sendMessage(chatId, `Error: ${error.message}`);
  }
  if (user && server) {
    bot.sendMessage(
      chatId,
      `BERIKUT DATA PANEL ANDA
NAMA: ${username}
EMAIL: ${email}
ID: ${user.id}
MEMORY: ${server.limits.memory === 0 ? "Unlimited" : server.limits.memory} MB
DISK: ${server.limits.disk === 0 ? "Unlimited" : server.limits.disk} MB
CPU: ${server.limits.cpu}%`
    );
    if (akunlo) {
      bot.sendAnimation(u, akunlo, {
        caption: `Hai @${u}
 PANEL DATA ANDA :
〽️ Login : ${domain}
〽️ Username : ${user.username}
〽️ Password : ${password} 
┏━━━━━━━⬣
│RULES :
│• Jangan Ddos Server
│• Wajib tutup domain saat screenshot
│• Jngan bagikan domain ke siapapun
┗━━━━━━━━━━━━━━━━━━⬣
CREATE PANEL BY Zetsy`,
      });
      bot.sendMessage(
        chatId,
        "Data panel berhasil dikirim ke ID Telegram yang dimaksud."
      );
    }
  } else {
    bot.sendMessage(chatId, "Gagal membuat data panel. Silakan coba lagi.");
  }
});
bot.onText(/\/11gb (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const premiumUsers = JSON.parse(fs.readFileSync(premiumUsersFile));
  const isPremium = premiumUsers.includes(String(msg.from.id));
  if (!isPremium) {
    bot.sendMessage(chatId, "DI ADDPREM DULU SAYANG,MINTA AMA SI ZET SANA...", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "HUBUNGI ADMIN", url: "https://t.me/Zeeellli" }],
        ],
      },
    });
    return;
  }
  const t = text.split(",");
  if (t.length < 2) {
    bot.sendMessage(chatId, "Invalid format. Usage: /10gb namapanel,idtele");
    return;
  }
  const username = t[0];
  const u = t[1];
  const name = username + "10gb";
  const egg = settings.eggs;
  const loc = settings.loc;
  const memo = "11000";
  const cpu = "290";
  const disk = "10000";
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN}';
  const email = `${username}@buyer.RAJA`;
  const akunlo = settings.pp;
  const password = `${username}001`;
  let user;
  let server;
  try {
    const response = await fetch(`${domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        email: email,
        username: username,
        first_name: username,
        last_name: username,
        language: "en",
        password: password,
      }),
    });
    const data = await response.json();
    if (data.errors) {
      if (
        data.errors[0].meta.rule === "unique" &&
        data.errors[0].meta.source_field === "email"
      ) {
        bot.sendMessage(
          chatId,
          "Email already exists. Please use a different email."
        );
      } else {
        bot.sendMessage(
          chatId,
          `Error: ${JSON.stringify(data.errors[0], null, 2)}`
        );
      }
      return;
    }
    user = data.attributes;
    const response2 = await fetch(`${domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        name: name,
        description: "",
        user: user.id,
        egg: parseInt(egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: spc,
        environment: {
          INST: "npm",
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          CMD_RUN: "npm start",
        },
        limits: {
          memory: memo,
          swap: 0,
          disk: disk,
          io: 500,
          cpu: cpu,
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 1,
        },
        deploy: {
          locations: [parseInt(loc)],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });
    const data2 = await response2.json();
    server = data2.attributes;
  } catch (error) {
    bot.sendMessage(chatId, `Error: ${error.message}`);
  }
  if (user && server) {
    bot.sendMessage(
      chatId,
      `BERIKUT DATA PANEL ANDA
NAMA: ${username}
EMAIL: ${email}
ID: ${user.id}
MEMORY: ${server.limits.memory === 0 ? "Unlimited" : server.limits.memory} MB
DISK: ${server.limits.disk === 0 ? "Unlimited" : server.limits.disk} MB
CPU: ${server.limits.cpu}%`
    );
    if (akunlo) {
      bot.sendAnimation(u, akunlo, {
        caption: `Hai @${u}

PANEL DATA ANDA :
👾 Login : ${domain}
👾 Username : ${user.username}
👾 Password : ${password} 
┏━━━━━━━⬣
│RULES :
│• Jangan Ddos Server
│• Wajib tutup domain saat screenshot
│• Jngan bagikan domain ke siapapun
┗━━━━━━━━━━━━━━━━━━⬣
CREATE PANEL BY Zetsy`,
      });
      bot.sendMessage(
        chatId,
        "Data panel berhasil dikirim ke ID Telegram yang dimaksud."
      );
    }
  } else {
    bot.sendMessage(chatId, "Gagal membuat data panel. Silakan coba lagi.");
  }
});

// unli
bot.onText(/\/unli (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const premiumUsers = JSON.parse(fs.readFileSync(premiumUsersFile));
  const isPremium = premiumUsers.includes(String(msg.from.id));
  if (!isPremium) {
    bot.sendMessage(chatId, "DI ADDPREM DULU SAYANG,MINTA AMA SI ZET SANA...", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "HUBUNGI ADMIN", url: "https://t.me/Zeeellli" }],
        ],
      },
    });
    return;
  }
  const t = text.split(",");
  if (t.length < 2) {
    bot.sendMessage(chatId, "Invalid format. Usage: /unli namapanel,idtele");
    return;
  }
  const username = t[0];
  const u = t[1];
  const name = username + "unli";
  const egg = settings.eggs;
  const loc = settings.loc;
  const memo = "0";
  const cpu = "0";
  const disk = "0";
  const email = `${username}@unli.RAJA`;
  const akunlo = settings.pp;
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN}';
  const password = `${username}001`;
  let user;
  let server;
  try {
    const response = await fetch(`${domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        email: email,
        username: username,
        first_name: username,
        last_name: username,
        language: "en",
        password: password,
      }),
    });
    const data = await response.json();
    if (data.errors) {
      if (
        data.errors[0].meta.rule === "unique" &&
        data.errors[0].meta.source_field === "email"
      ) {
        bot.sendMessage(chatId, "Email&user telah ada di panel RAJA.");
      } else {
        bot.sendMessage(
          chatId,
          `Error: ${JSON.stringify(data.errors[0], null, 2)}`
        );
      }
      return;
    }
    user = data.attributes;
    const response2 = await fetch(`${domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        name: name,
        description: "",
        user: user.id,
        egg: parseInt(egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: spc,
        environment: {
          INST: "npm",
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          CMD_RUN: "npm start",
        },
        limits: {
          memory: memo,
          swap: 0,
          disk: disk,
          io: 500,
          cpu: cpu,
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 1,
        },
        deploy: {
          locations: [parseInt(loc)],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });
    const data2 = await response2.json();
    server = data2.attributes;
  } catch (error) {
    bot.sendMessage(chatId, `Error: ${error.message}`);
  }
  if (user && server) {
    bot.sendMessage(
      chatId,
      `BERIKUT DATA PANEL ANDA
NAMA: ${username}
EMAIL: ${email}
ID: ${user.id}
MEMORY: ${server.limits.memory === 0 ? "Unlimited" : server.limits.memory} MB
DISK: ${server.limits.disk === 0 ? "Unlimited" : server.limits.disk} MB
CPU: ${server.limits.cpu}%`
    );
    if (akunlo) {
      bot.sendAnimation(u, akunlo, {
        caption: `Hai @${u}

PANEL DATA ANDA :
👾 Login : ${domain}
👾 Username : ${user.username}
👾 Password : ${password} 
┏━━━━━━━⬣
RULES :
│• Jangan Ddos Server
│• Wajib tutup domain saat screenshot
│• Jngan bagikan domain ke siapapun
┗━━━━━━━━━━━━━━━━━━⬣
CREATE PANEL BY Zetsy`,
      });
      bot.sendMessage(
        chatId,
        "Data panel berhasil dikirim ke ID Telegram yang dimaksud."
      );
    }
  } else {
    bot.sendMessage(chatId, "Gagal membuat data panel. Silakan coba lagi.");
  }
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// createadmin
bot.onText(/\/createadmin (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const adminUsers = JSON.parse(fs.readFileSync(adminfile));
  const isAdmin = adminUsers.includes(String(msg.from.id));
  if (!isAdmin) {
    bot.sendMessage(
      chatId,
      "BAPAK KAU MAU CREATE ADMIN, ADDOWNER DULU AMA SI ZET SANA..",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "HUBUNGI ADMIN", url: "https://t.me/Zeeellli" }],
          ],
        },
      }
    );
    return;
  }
  const commandParams = match[1].split(",");
  const panelName = commandParams[0].trim();
  const telegramId = commandParams[1].trim();
  if (commandParams.length < 2) {
    bot.sendMessage(
      chatId,
      "Format Salah! Penggunaan: /createadmin namapanel,idtele"
    );
    return;
  }
  const password = panelName + "117";
  try {
    const response = await fetch(`${domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        email: `${panelName}@admin.HC`,
        username: panelName,
        first_name: panelName,
        last_name: "Memb",
        language: "en",
        root_admin: true,
        password: password,
      }),
    });
    const data = await response.json();
    if (data.errors) {
      bot.sendMessage(chatId, JSON.stringify(data.errors[0], null, 2));
      return;
    }
    const user = data.attributes;
    const userInfo = `
TYPE: user
➟ ID: ${user.id}
➟ USERNAME: ${user.username}
➟ EMAIL: ${user.email}
➟ NAME: ${user.first_name} ${user.last_name}
➟ LANGUAGE: ${user.language}
➟ ADMIN: ${user.root_admin}
➟ CREATED AT: ${user.created_at}
    `;
    bot.sendMessage(chatId, userInfo);
    bot.sendMessage(
      telegramId,
      `
┏━⬣❏「 INFO DATA ADMIN PANEL 」❏
│➥  Login : ${domain}
│➥  Username : ${user.username}
│➥  Password : ${password} 
┗━━━━━━━━━⬣
│ Rules : 
│• Jangan Curi Sc
│• Jangan Buka Panel Orang
│• Jangan Ddos Server
│• Kalo jualan sensor domainnya
│• Jangan Bagi² Panel Free !!
│• Jangan bagi bagi panel free !! ngelanggar? maklu matyy
┗━━━━━━━━━━━━━━━━━━⬣
THANKS FOR Zetsy
    `
    );
  } catch (error) {
    console.error(error);
    bot.sendMessage(
      chatId,
      "Terjadi kesalahan dalam pembuatan admin. Silakan coba lagi nanti."
    );
  }
});
fs.readFile(adminfile, (err, data) => {
  if (err) {
    console.error(err);
  } else {
    adminIDs = JSON.parse(data);
  }
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// listsrv
bot.onText(/\/listsrv/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  // Check if the user is the Owner
  const adminUsers = JSON.parse(fs.readFileSync(adminfile));
  const isAdmin = adminUsers.includes(String(msg.from.id));
  if (!isAdmin) {
    bot.sendMessage(
      chatId,
      "KHUSUS OWNER TOLOL SONO MINTA ADD OWNER SAMA SI ZET...",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "HUBUNGI ADMIN", url: "https://t.me/Zeeellli" }],
          ],
        },
      }
    );
    return;
  }
  let page = 1; // Mengubah penggunaan args[0] yang tidak didefinisikan sebelumnya
  try {
    let f = await fetch(`${domain}/api/application/servers?page=${page}`, {
      // Menggunakan backticks untuk string literal
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
    });
    let res = await f.json();
    let servers = res.data;
    let messageText = "Daftar server aktif yang dimiliki:\n\n";
    for (let server of servers) {
      let s = server.attributes;

      let f3 = await fetch(
        `${domain}/api/client/servers/${s.uuid.split("-")[0]}/resources`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${pltc}`,
          },
        }
      );
      let data = await f3.json();
      let status = data.attributes ? data.attributes.current_state : s.status;

      messageText += `ID Server: ${s.id}\n`;
      messageText += `Nama Server: ${s.name}\n`;
      messageText += `Status: ${status}\n\n`;
    }

    bot.sendMessage(chatId, messageText);
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "Terjadi kesalahan dalam memproses permintaan.");
  }
});
//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
// listadmin
bot.onText(/\/listadmin/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const adminUsers = JSON.parse(fs.readFileSync(adminfile));
  const isAdmin = adminUsers.includes(String(msg.from.id));
  if (!isAdmin) {
    bot.sendMessage(
      chatId,
      "KHUSUS OWNER SAYANG SONO MINTA ADD OWNER SAMA SI ZET..",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "HUBUNGI ADMIN", url: "https://t.me/Zeeellli" }],
          ],
        },
      }
    );
    return;
  }
  let page = "1";
  try {
    let f = await fetch(`${domain}/api/application/users?page=${page}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
    });
    let res = await f.json();
    let users = res.data;
    let messageText = "Berikut list admin :\n\n";
    for (let user of users) {
      let u = user.attributes;
      if (u.root_admin) {
        messageText += `🆔 ID: ${u.id} - 🌟 Status: ${
          u.attributes?.user?.server_limit === null ? "Inactive" : "Active"
        }\n`;
        messageText += `${u.username}\n`;
        messageText += `${u.first_name} ${u.last_name}\n\n`;
        messageText += "𝗕𝗬 RRIZT OFFICIAL";
      }
    }
    messageText += `Page: ${res.meta.pagination.current_page}/${res.meta.pagination.total_pages}\n`;
    messageText += `Total Admin: ${res.meta.pagination.count}`;
    const keyboard = [
      [
        {
          text: "BACK",
          callback_data: JSON.stringify({
            action: "back",
            page: parseInt(res.meta.pagination.current_page) - 1,
          }),
        },
        {
          text: "NEXT",
          callback_data: JSON.stringify({
            action: "next",
            page: parseInt(res.meta.pagination.current_page) + 1,
          }),
        },
      ],
    ];
    bot.sendMessage(chatId, messageText, {
      reply_markup: {
        inline_keyboard: keyboard,
      },
    });
    //▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//
    // batas akhir
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "Terjadi kesalahan dalam memproses permintaan.");
  }
});
bot.onText(/\/panel/, (msg) => {
  const chatId = msg.chat.id;
  const sender = msg.from.username;
  const owner = "7577041779"; // Ganti dengan ID pemilik bot
  const text12 = `*Hi @${sender} 👋*    
𝗖𝗔𝗥𝗔 𝗕𝗜𝗞𝗜𝗡 𝗣𝗔𝗡𝗘𝗟 𝗕𝗬 𝗭𝗘𝗧𝗭𝗬

𝗖𝗔𝗥𝗔 𝗔𝗗𝗗 𝗨𝗦𝗘𝗥 𝗣𝗔𝗡𝗘𝗟 :
𝗿𝗮𝗺 NAMA,IDLU
𝗰𝗼𝗻𝘁𝗼𝗵 : /𝟭𝗴𝗯 Kocak,𝟭𝟯𝟰𝟰𝟱𝟱𝘅𝘅𝘅

UNTUK ID TELE NYA BISA CEK KETIK /cekidtelegram

𝗕𝘂𝘆 𝗣𝗿𝗲𝗺? 𝗕𝘂𝘆 𝗩𝗽𝘀? 𝗕𝘂𝘆 𝗔𝗱𝗺𝗶𝗻𝗣&𝗣𝘁 𝗣𝗮𝗻𝗲𝗹? 𝗕𝘂𝘆 𝗦𝗰? 𝗣𝘃 (@Zeeellli)`;
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🖥️ Buy Panel", url: "https://t.me/Zeeellli" },
          { text: "👤 Buy Admin", url: "https://t.me/Zeeellli" },
        ],
        [{ text: "👾 Buy Vps", url: "https://t.me/Zeeellli" }],
      ],
    },
  };
  bot.sendAnimation(chatId, settings.pp, {
    caption: text12,
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
});
