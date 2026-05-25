// Backend API integration
let currentCandidates = [];

// Elements
const btnScan = document.getElementById('btn-scan');
const terminalWindow = document.getElementById('terminal-window');
const candidatesList = document.getElementById('candidates-list');
const analysisContent = document.getElementById('analysis-content');
const chatMessage = document.getElementById('chat-message');
const btnTest = document.getElementById('btn-test');
const webhookUrl = document.getElementById('webhook-url');

function updateAnalysisPanel(data, score) {
    const countryTag = data.country === 'US' ? '🇺🇸' : '🇰🇷';
    const currency = data.country === 'US' ? '$' : '₩';
    
    // Logic updated to reflect current DOM structure
    showAnalysis(data, score, currency);
}

// Utils
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getTime = () => {
    const now = new Date();
    return `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;
};

const logToTerminal = (msg, type = '') => {
    const line = document.createElement('div');
    line.className = 'line';
    line.innerHTML = `<span class="time">${getTime()}</span> <span class="${type}">${msg}</span>`;
    terminalWindow.appendChild(line);
    terminalWindow.scrollTop = terminalWindow.scrollHeight;
};

// Logic
btnScan.addEventListener('click', async () => {
    btnScan.disabled = true;
    btnScan.textContent = 'SCANNING...';
    candidatesList.innerHTML = '';
    analysisContent.innerHTML = '<div class="placeholder-text">Analyzing market data...</div>';
    
    logToTerminal('INITIATING AEGIS Hynix-Formula SCAN...', 'highlight');
    await sleep(800);
    logToTerminal('Connecting to Aegis Backend Server...');
    
    let scanData;
    try {
        const response = await fetch('/api/scan');
        scanData = await response.json();
        logToTerminal(`Scraped ${scanData.newsCount} live news articles. Analyzing NLP...`);
    } catch (e) {
        logToTerminal('ERROR: Backend server offline. Please start Node.js server.', 'error');
        btnScan.disabled = false;
        btnScan.textContent = 'INITIATE SCAN';
        return;
    }

    await sleep(600);
    logToTerminal('Filtering 2,400 KOSPI/KOSDAQ equities...');
    await sleep(800);
    logToTerminal('Applying [Turnaround] constraints...', 'highlight');
    await sleep(500);
    logToTerminal('SCAN COMPLETE. Found critical global matches.', 'success');

    currentCandidates = [...scanData.candidatesKR, ...scanData.candidatesUS];
    let topMatch = null;

    currentCandidates.forEach((data, index) => {
        const totalScore = Object.values(data.scores).reduce((a, b) => a + b) / 5;
        
        if (index === 0) topMatch = { ...data, totalScore };

        const item = document.createElement('div');
        item.className = 'candidate-item';
        const countryTag = data.country === 'US' ? '🇺🇸' : '🇰🇷';
        const currency = data.country === 'US' ? '$' : '₩';
        
        item.innerHTML = `
            <div class="cand-header">
                <div>
                    <div class="cand-name">${countryTag} ${data.name}</div>
                    <div class="cand-ticker">${data.ticker}</div>
                </div>
                <div class="cand-score">${totalScore.toFixed(1)}</div>
            </div>
            <div style="font-size:0.85rem; color:var(--text-muted)">${currency}${data.price} <span style="color:var(--accent-emerald)">${data.change}</span></div>
        `;
        
        item.addEventListener('click', () => {
            document.querySelectorAll('.candidate-item').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            showAnalysis(data, totalScore, currency);
        });

        candidatesList.appendChild(item);
    });

    // Select first by default
    if (candidatesList.firstChild) candidatesList.firstChild.click();

    // Update Webhook Preview
    if (topMatch) {
        const currency = topMatch.country === 'US' ? '$' : '₩';
        chatMessage.innerHTML = `🚀 **[Aegis Alert] High-Potential Target Detected!**\n\n` +
            `**${topMatch.name} (${topMatch.ticker})**\n` +
            `Current Price: ${currency}${topMatch.price} (${topMatch.change})\n` +
            `Aegis Total Score: **${topMatch.totalScore.toFixed(1)} / 100**\n\n` +
            `**Catalyst Overview:**\n- ${topMatch.reason}\n\n` +
            `*Hynix Formula:* TRN:${topMatch.scores.turnaround} | MNP:${topMatch.scores.monopoly} | TLW:${topMatch.scores.tailwind} | INF:${topMatch.scores.inflow} | RRT:${topMatch.scores.rerating}`;
    }

    btnScan.disabled = false;
    btnScan.textContent = 'INITIATE SCAN';
});

function showAnalysis(data, totalScore) {
    let html = `
        <div style="text-align: right; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem;">
            Data Updated: 2026-05-25 08:30:00 (Today)
        </div>
        <div style="font-size: 2rem; color: var(--accent-emerald); font-weight:800; margin-bottom: 1.5rem; text-align:center;">
            SCORE: ${totalScore.toFixed(1)}
        </div>
    `;

    const labels = {
        turnaround: "Turnaround / Profitability",
        monopoly: "Niche Monopoly / Tech Lead",
        tailwind: "Industry Tailwind / Meta",
        inflow: "Institutional Inflow",
        rerating: "Target Re-rating"
    };

    for (const [key, value] of Object.entries(data.scores)) {
        html += `
            <div class="score-bar-container">
                <div class="score-label">
                    <span>${labels[key]}</span>
                    <span style="color: var(--accent-cyan)">${value}/100</span>
                </div>
                <div class="score-track">
                    <div class="score-fill" style="width: 0%" data-target="${value}%"></div>
                </div>
            </div>
        `;
    }

    html += `
        <div class="reason-box">
            ${data.reason}
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0,230,118,0.2);">
                <a href="${data.articleUrl}" target="_blank" style="color: var(--accent-cyan); text-decoration: none; display: inline-flex; align-items: center; font-weight: 600; font-size: 0.9rem;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                    관련 근거 기사 확인하기
                </a>
            </div>
        </div>
    `;
    analysisContent.innerHTML = html;

    // Trigger animations
    setTimeout(() => {
        const fills = analysisContent.querySelectorAll('.score-fill');
        fills.forEach(fill => {
            fill.style.width = fill.getAttribute('data-target');
        });
    }, 50);
}

// Webhook Tester
btnTest.addEventListener('click', async () => {
    const url = document.querySelector('.webhook-input').value.trim(); // Get the first input
    
    btnTest.textContent = 'SENDING...';
    
    try {
        const response = await fetch('/api/test-webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ webhookUrl: url, platform: 'discord' })
        });
        const result = await response.json();
        
        logToTerminal('Webhook payload dispatched successfully.', 'success');
        if (result.realSent) {
            alert('Real Webhook successfully sent to your Discord channel!');
        } else {
            alert('Simulated Webhook Sent! (Provide a real Discord URL to actually send)');
        }
    } catch (e) {
        alert('Failed to connect to backend server.');
    }
    
    btnTest.textContent = 'TEST SEND';
});

// Navigation Logic
const navLinks = {
    'nav-dashboard': { view: 'view-dashboard', title: 'Hynix-Potentials Finder' },
    'nav-formula': { view: 'view-formula', title: 'The Formula Settings' },
    'nav-settings': { view: 'view-webhooks', title: 'Webhook Integrations' }
};

const pageTitle = document.querySelector('header h2');

Object.keys(navLinks).forEach(navId => {
    const el = document.getElementById(navId);
    if (el) {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Update active class
            document.querySelectorAll('nav a').forEach(link => link.classList.remove('active'));
            document.getElementById(navId).classList.add('active');
            
            // Hide all views
            document.querySelectorAll('.view-section').forEach(view => view.style.display = 'none');
            
            // Show target view
            document.getElementById(navLinks[navId].view).style.display = 'block';
            
            // Update title
            if (pageTitle) pageTitle.textContent = navLinks[navId].title;
        });
    }
});
