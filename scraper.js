require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 사용자가 입력할 Gemini API 키
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// API 키가 없을 때 제공할 백업(Mock) 데이터 (기존과 동일)
const fallbackData = {
    timestamp: new Date().toISOString(),
    status: 'MOCK_SUCCESS',
    newsCount: 0,
    candidatesKR: [
        { ticker: "006260", name: "LS", price: "425,000", change: "+8.5%", country: "KR", scores: { turnaround: 85, monopoly: 90, tailwind: 95, inflow: 88, rerating: 98 }, reason: "1분기 사상 최대 영업이익 달성. 글로벌 전력망 사이클 수혜.", articleUrl: "https://search.naver.com/search.naver?query=LS" },
        { ticker: "031430", name: "신세계인터내셔날", price: "15,800", change: "+5.2%", country: "KR", scores: { turnaround: 95, monopoly: 70, tailwind: 85, inflow: 80, rerating: 90 }, reason: "본격적인 흑자전환 유력. 목표가 1만9000원으로 대폭 상향.", articleUrl: "https://search.naver.com/search.naver?query=신세계인터내셔날" },
        { ticker: "006400", name: "삼성SDI", price: "780,000", change: "+3.8%", country: "KR", scores: { turnaround: 92, monopoly: 88, tailwind: 90, inflow: 85, rerating: 94 }, reason: "전고체 배터리 상용화 기술 선점. 목표가 100만원 선.", articleUrl: "https://search.naver.com/search.naver?query=삼성SDI" }
    ],
    candidatesUS: [
        { ticker: "TGT", name: "Target Corp", price: "165.20", change: "+6.8%", country: "US", scores: { turnaround: 94, monopoly: 75, tailwind: 80, inflow: 85, rerating: 90 }, reason: "5개 분기 만에 매출 성장 전환. 어닝 서프라이즈.", articleUrl: "https://finance.yahoo.com/quote/TGT" },
        { ticker: "PODD", name: "Insulet Corp", price: "215.50", change: "+4.2%", country: "US", scores: { turnaround: 88, monopoly: 95, tailwind: 92, inflow: 80, rerating: 85 }, reason: "인슐린 펌프 압도적 시장 점유율. 목표가 450달러 상향.", articleUrl: "https://finance.yahoo.com/quote/PODD" },
        { ticker: "LOW", name: "Lowe's", price: "248.30", change: "+3.5%", country: "US", scores: { turnaround: 85, monopoly: 88, tailwind: 90, inflow: 82, rerating: 88 }, reason: "예상치 웃도는 호실적 및 하반기 주택시장 회복 사이클 진입.", articleUrl: "https://finance.yahoo.com/quote/LOW" }
    ]
};

async function scrapeNaverFinance() {
    try {
        // 1. 네이버 금융 메인 뉴스 스크래핑 (데이터 수집)
        const response = await axios.get('https://finance.naver.com/news/mainnews.naver');
        const $ = cheerio.load(response.data);
        
        let newsText = "";
        const liveNews = [];
        $('.newsList li').each((i, el) => {
            const title = $(el).find('.articleSubject a').text().trim();
            const link = 'https://finance.naver.com' + $(el).find('.articleSubject a').attr('href');
            if (title) {
                liveNews.push({ title, link });
                newsText += `- ${title}\n`;
            }
        });

        // 2. Gemini API 키가 없다면 기존처럼 임시 데이터 반환
        if (!GEMINI_API_KEY) {
            console.log('[Scraper] ⚠️ GEMINI_API_KEY가 없습니다. 시연용 백업 데이터를 반환합니다.');
            fallbackData.newsCount = liveNews.length;
            return fallbackData;
        }

        console.log('[Scraper] 🧠 구글 Gemini AI 엔진 가동... 뉴스 데이터 분석 중...');

        // 3. Gemini AI를 활용한 '하이닉스 공식' 텍스트 추론
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        // 매우 빠르고 저렴한 1.5 flash 모델 사용 (무료 Tier 가능)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
당신은 'Aegis Stock Scanner'라는 세계 최고의 턴어라운드 종목 발굴 인공지능입니다.
당신의 임무는 제공된 오늘의 최신 뉴스 헤드라인과 당신의 방대한 금융 지식을 바탕으로, 
다음 '하이닉스 10배 상승 공식'에 부합하는 [한국 주식 3개]와 [미국 주식 3개]를 엄선하는 것입니다.

[하이닉스 공식 조건]
1. Turnaround: 심각한 적자나 부진을 딛고 확실한 흑자전환(어닝 서프라이즈)을 기록할 것
2. Monopoly: 특정 틈새 시장이나 미래 기술에서 독점적 해자를 가질 것
3. Structural Tailwind: 일시적 테마가 아닌 거대한 시대적 흐름(AI, 전력망, 고령화 등)을 탈 것
4. Target Upgrade: 증권가에서 목표주가를 파격적으로 상향하고 있을 것

오늘 수집된 뉴스 헤드라인:
${newsText}

위 뉴스와 현재 시장 트렌드를 종합하여 가장 유망한 6종목(KR 3개, US 3개)을 JSON 포맷으로만 출력하세요. 
마크다운(\`\`\`json 등)은 절대 포함하지 말고 순수 JSON 문자열만 반환해야 합니다.

[JSON 구조 예시]
{
  "candidatesKR": [
    { "ticker": "000000", "name": "종목명", "price": "100,000", "change": "+5.0%", "country": "KR", "scores": { "turnaround": 90, "monopoly": 85, "tailwind": 95, "inflow": 80, "rerating": 90 }, "reason": "턴어라운드 이유 설명", "articleUrl": "관련 기사 링크" }
  ],
  "candidatesUS": [ ...동일 구조 (country: "US")... ]
}
`;

        const result = await model.generateContent(prompt);
        let rawJson = result.response.text().trim();
        
        // 마크다운 백틱 제거 (만약 AI가 실수로 포함시켰을 경우)
        if (rawJson.startsWith('```json')) rawJson = rawJson.replace('```json', '');
        if (rawJson.startsWith('```')) rawJson = rawJson.replace('```', '');
        if (rawJson.endsWith('```')) rawJson = rawJson.slice(0, -3).trim();

        const parsedData = JSON.parse(rawJson);
        
        return {
            timestamp: new Date().toISOString(),
            status: 'AI_SUCCESS',
            newsCount: liveNews.length,
            candidatesKR: parsedData.candidatesKR,
            candidatesUS: parsedData.candidatesUS
        };

    } catch (error) {
        console.error("[Scraper Error]", error.message);
        // AI 분석 중 에러가 나면 안전하게 백업 데이터 반환
        fallbackData.status = 'AI_ERROR_FALLBACK';
        return fallbackData;
    }
}

module.exports = { scrapeNaverFinance };
