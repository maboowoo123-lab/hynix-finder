const axios = require('axios');
const { scrapeNaverFinance } = require('./scraper');

// GitHub Secrets 등 환경변수에서 웹훅 URL을 가져옵니다.
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

async function runStandaloneScan() {
    console.log('🚀 [Aegis Github Action] 스캐닝 봇 가동 시작...');
    
    try {
        const scanData = await scrapeNaverFinance();
        const topMatch = scanData.candidates[0];
        
        console.log(`✅ 스캔 완료. 1순위 종목: ${topMatch.name}`);

        if (WEBHOOK_URL) {
            const messageText = `🚀 **[Aegis Alert] Hynix-Potential Stock Detected! (Cloud Automated)**\n\n` +
                                `**${topMatch.name} (${topMatch.ticker})**\n` +
                                `현재가: ₩${topMatch.price} (${topMatch.change})\n\n` +
                                `**핵심 카탈리스트:**\n${topMatch.reason}\n\n` +
                                `자세히 보기: ${topMatch.articleUrl}`;
            
            console.log('웹훅 전송 중...');
            await axios.post(WEBHOOK_URL, { content: messageText });
            console.log('웹훅 전송 완료!');
        } else {
            console.log('⚠️ DISCORD_WEBHOOK_URL 환경변수가 설정되지 않아 메시지를 발송하지 못했습니다.');
        }

    } catch (error) {
        console.error('❌ 스캐닝 또는 전송 중 오류 발생:', error.message);
        process.exit(1);
    }
}

runStandaloneScan();
