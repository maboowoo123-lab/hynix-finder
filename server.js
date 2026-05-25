const express = require('express');
const cron = require('node-cron');
const axios = require('axios');
const path = require('path');
const { scrapeNaverFinance } = require('./scraper');

const app = express();
const PORT = 3000;

app.use(express.static(__dirname)); // 루트 디렉토리의 HTML/CSS/JS 서빙
app.use(express.json());

// [API] 스캐너 실행 엔드포인트
app.get('/api/scan', async (req, res) => {
    try {
        console.log('[API] /api/scan called. Scraping financial data...');
        const scanData = await scrapeNaverFinance();
        res.json(scanData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to scrape data.' });
    }
});

// [API] 웹훅 테스트 엔드포인트
app.post('/api/test-webhook', async (req, res) => {
    const { webhookUrl, platform } = req.body;
    try {
        const scanData = await scrapeNaverFinance();
        
        let messageText = `🚀 **[Aegis Alert] 오늘의 글로벌 텐배거 후보 (Preview)**\n\n`;
        messageText += `🇰🇷 **국내 주식 Top 3**\n`;
        scanData.candidatesKR.forEach((stock, i) => {
            messageText += `**[${i+1}] ${stock.name} (${stock.ticker})**\n현재가: ₩${stock.price} (${stock.change})\n카탈리스트: ${stock.reason}\n\n`;
        });
        messageText += `🇺🇸 **미국 주식 Top 3**\n`;
        scanData.candidatesUS.forEach((stock, i) => {
            messageText += `**[${i+1}] ${stock.name} (${stock.ticker})**\n현재가: $${stock.price} (${stock.change})\n카탈리스트: ${stock.reason}\n\n`;
        });

        // 실제 디스코드 웹훅 전송 로직
        if (webhookUrl && webhookUrl.includes('discord.com/api/webhooks')) {
            console.log('[API] Sending real webhook to Discord...');
            await axios.post(webhookUrl, { content: messageText });
            return res.json({ success: true, realSent: true });
        }
        
        res.json({ success: true, realSent: false, payload: messageText });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Webhook failed.' });
    }
});

// 매일 아침 8시 30분 자동 스캐닝 및 알림 발송 크론잡
cron.schedule('30 8 * * *', async () => {
    console.log('[CRON] 08:30 AM - 자동 스캐닝 시작...');
    try {
        const scanData = await scrapeNaverFinance();
        console.log(`[CRON] 스캐닝 완료. ${scanData.candidates.length}개의 종목 발견됨.`);
        // 향후 DB 연동 시 저장된 웹훅 주소들을 불러와 반복 전송하는 로직 추가
    } catch (e) {
        console.error('[CRON] 스캐닝 실패:', e.message);
    }
});

app.listen(PORT, () => {
    console.log(`==========================================`);
    console.log(` 🛡️ Aegis Stock Scanner 백엔드 서버 가동 🛡️`);
    console.log(` 접속 주소: http://localhost:${PORT}`);
    console.log(`==========================================`);
});
