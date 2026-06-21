// ============================================================
//  配置
// ============================================================
const CONFIG = {
    // ⚠️ 替换成你的 DeepSeek API Key
    API_KEY: 'sk-c2c7f7fdf13545da8656241acff333cb',
    API_URL: 'https://api.deepseek.com/chat/completions',
    MODEL: 'deepseek-v4-pro'
};

// ============================================================
//  DOM 引用
// ============================================================
const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const clearBtn = document.getElementById('clearBtn');
const themeToggle = document.getElementById('themeToggle');

// ============================================================
//  状态
// ============================================================
let isDark = false;
let isLoading = false;
let messages = [
    { role: 'system', content: '你是一个友好、专业、乐于助人的AI助手。回答简洁清晰，用中文。' }
];

// ============================================================
//  核心功能：发送消息
// ============================================================
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text || isLoading) return;

    // 检查 API Key
    if (!CONFIG.API_KEY || CONFIG.API_KEY === 'sk-c2c7f7fdf13545da8656241acff333cb') {
        appendMsg('⚠️ 请先在 script.js 中填入你的 DeepSeek API Key！', 'ai');
        return;
    }

    // 移除欢迎消息（如果有）
    const welcome = chatBox.querySelector('.welcome-msg');
    if (welcome) welcome.remove();

    // 显示用户消息
    appendMsg(text, 'user');
    userInput.value = '';
    isLoading = true;
    sendBtn.disabled = true;

    // 加入历史
    messages.push({ role: 'user', content: text });

    // 创建 AI 占位消息（带打字动画）
    const aiMsgEl = createTypingMessage();

    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.API_KEY}`
            },
            body: JSON.stringify({
                model: CONFIG.MODEL,
                messages: messages,
                stream: false,
                temperature: 0.7,
                max_tokens: 2048
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const reply = data.choices[0].message.content;

        // 更新 AI 消息
        aiMsgEl.textContent = reply;
        aiMsgEl.classList.remove('typing');
        messages.push({ role: 'assistant', content: reply });

    } catch (error) {
        aiMsgEl.textContent = '❌ ' + error.message;
        aiMsgEl.classList.remove('typing');
        console.error('API Error:', error);
    }

    isLoading = false;
    sendBtn.disabled = false;
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ============================================================
//  辅助：创建打字中的消息
// ============================================================
function createTypingMessage() {
    const div = document.createElement('div');
    div.className = 'msg ai typing';
    div.innerHTML = `
        <div class="typing-dots">
            <span></span><span></span><span></span>
        </div>
    `;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    return div;
}

// ============================================================
//  辅助：追加消息
// ============================================================
function appendMsg(text, role) {
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    div.textContent = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    return div;
}

// ============================================================
//  清空对话
// ============================================================
function clearChat() {
    if (isLoading) return;
    // 保留欢迎消息
    chatBox.innerHTML = `
        <div class="welcome-msg">
            <div class="welcome-icon">👋</div>
            <h2>你好，我是 DeepSeek</h2>
            <p>随时为你解答问题，开始对话吧！</p>
        </div>
    `;
    // 重置历史（保留 system prompt）
    messages = [
        { role: 'system', content: '你是一个友好、专业、乐于助人的AI助手。回答简洁清晰，用中文。' }
    ];
    userInput.value = '';
}

// ============================================================
//  主题切换
// ============================================================
function toggleTheme() {
    isDark = !isDark;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : '');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    // 保存偏好
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// ============================================================
//  加载保存的主题偏好
// ============================================================
function loadThemePreference() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
        isDark = true;
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.textContent = '☀️';
    }
}

// ============================================================
//  事件绑定
// ============================================================
sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
clearBtn.addEventListener('click', clearChat);
themeToggle.addEventListener('click', toggleTheme);

// ============================================================
//  初始化
// ============================================================
loadThemePreference();

// 自动聚焦输入框（移动端不自动弹键盘）
if (window.innerWidth > 600) {
    userInput.focus();
}

console.log('🤖 DeepSeek 助手已启动！');
