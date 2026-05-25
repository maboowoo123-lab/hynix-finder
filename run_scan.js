const axios = require('axios');
const { scrapeNaverFinance } = require('./scraper');

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function runStandaloneScan() {
    console.log('🚀 [Aegis Github Action] 글로벌 스캐닝 봇 가동 시작...');
    
    try {
        const scanData = await scrapeNaverFinance();
        
        let messageText = `🚀 *[Aegis Alert] 오늘의 글로벌 텐배거 후보 (Cloud Automated)*\n\n`;
        messageText += `━━━━━━━━━━━━━━━━━━━━━\n`;
        messageText += `🇰🇷 *국내 주식 Top 3*\n`;
        messageText += `━━━━━━━━━━━━━━━━━━━━━\n`;
        
        scanData.candidatesKR.forEach((stock, i) => {
            messageText += `*[${i+1}] ${stock.name} (${stock.ticker})*\n`;
            messageText += `🔹 현재가: ₩${stock.price} (${stock.change})\n`;
            messageText += `🔹 카탈리스트: ${stock.reason}\n\n`;
        });

        messageText += `━━━━━━━━━━━━━━━━━━━━━\n`;
        messageText += `🇺🇸 *미국 주식 Top 3*\n`;
        messageText += `━━━━━━━━━━━━━━━━━━━━━\n`;

        scanData.candidatesUS.forEach((stock, i) => {
            messageText += `*[${i+1}] ${stock.name} (${stock.ticker})*\n`;
            messageText += `🔹 현재가: $${stock.price} (${stock.change})\n`;
            messageText += `🔹 카탈리스트: ${stock.reason}\n\n`;
        });

        messageText += `👉 스캐너 열기: http://localhost:3000`; // 차후 실제 서버 주소로 변경 가능
        
        if (DISCORD_WEBHOOK_URL) {
            console.log('디스코드 웹훅 전송 중...');
            await axios.post(DISCORD_WEBHOOK_URL, { content: messageText.replace(/\*/g, '**') });
            console.log('디스코드 웹훅 전송 완료!');
        }

        if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
            console.log('텔레그램 전송 중...');
            const tgUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
            await axios.post(tgUrl, {
                chat_id: TELEGRAM_CHAT_ID,
                text: messageText,
                parse_mode: 'Markdown'
            });
            console.log('텔레그램 전송 완료!');
        }

        if (!DISCORD_WEBHOOK_URL && (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID)) {
            console.log('⚠️ 웹훅 환경변수(Secret)가 설정되지 않아 알림을 발송하지 못했습니다.');
        }

    } catch (error) {
        console.error('❌ 스캐닝 또는 전송 중 오류 발생:', error.message);
        process.exit(1);
    }
}

runStandaloneScan();
