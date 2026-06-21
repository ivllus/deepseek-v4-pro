// ============================================================
//  配置
// ============================================================
const CONFIG = {
    // ⚠️ 替换成你的 DeepSeek API Key
    API_KEY: 'sk-c2c7f7fdf13545da8656241acff333cb',
    API_URL: 'https://api.deepseek.com/chat/completions',
    MODEL: 'deepseek-v4-pro',
    STORAGE_KEY: 'deepseek_sessions'
};

// ============================================================
//  状态
// ============================================================
let currentSessionId = null;
let sessions = [];
let isLoading = false;
let isDark = false;

// ============================================================
//  DOM 引用
// ============================================================
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sidebarClose = document.getElementById('sidebarClose');
const menuBtn = document.getElementById('menuBtn');
const sessionList = document.getElementById('sessionList');
const newChatBtn = document.getElementById('newChatBtn');
const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const clearBtn = document.getElementById('clearBtn');
const themeToggle = document.getElementById('themeToggle');
const sidebarThemeBtn = document.getElementById('sidebarThemeBtn');
const sessionTitle = document.getElementById('sessionTitle');

// ============================================================
//  数据管理
// ============================================================
function loadSessions() {
    try {
        const data = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (data) {
            sessions = JSON.parse(data);
        } else {
            // 初始化：创建一个默认会话
            sessions = [{
                id: generateId(),
                name: '新对话',
                messages: [
                    { role: 'system', content: '你是一个友好、专业、乐于助人的AI助手。回答简洁清晰，用中文。' }
                ],
                createdAt: Date.now()
            }];
            saveSessions();
        }
    } catch (e) {
        sessions = [{
            id: generateId(),
            name: '新对话',
            messages: [{ role: 'system', content: '你是一个友好、专业、乐于助人的AI助手。回答简洁清晰，用中文。' }],
            createdAt: Date.now()
        }];
        saveSessions();
    }
}

function saveSessions() {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(sessions));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ============================================================
//  会话操作
// ============================================================
function createNewSession() {
    const newSession = {
        id: generateId(),
        name: '新对话',
        messages: [
            { role: 'system', content: '你是一个友好、专业、乐于助人的AI助手。回答简洁清晰，用中文。' }
        ],
        createdAt: Date.now()
    };
    sessions.unshift(newSession);
    saveSessions();
    switchSession(newSession.id);
    renderSessionList();
    closeSidebar();
}

function switchSession(sessionId) {
    currentSessionId = sessionId;
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    // 更新标题
    sessionTitle.textContent = session.name || '新对话';

    // 渲染消息
    renderMessages(session.messages);

    // 更新列表高亮
    renderSessionList();
    saveSessions();
}

function deleteSession(sessionId, e) {
    e.stopPropagation();
    if (sessions.length <= 1) {
        // 至少保留一个会话
        showToast('至少保留一个对话');
        return;
    }
    if (!confirm('确定要删除这个对话吗？')) return;

    sessions = sessions.filter(s => s.id !== sessionId);
    saveSessions();

    if (currentSessionId === sessionId) {
        // 切换到第一个会话
        switchSession(sessions[0].id);
    } else {
        renderSessionList();
    }
}

function renameSession(sessionId, newName) {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
        session.name = newName.trim() || '新对话';
        saveSessions();
        if (currentSessionId === sessionId) {
            sessionTitle.textContent = session.name;
        }
        renderSessionList();
    }
}

function getCurrentSession() {
    return sessions.find(s => s.id === currentSessionId);
}

// ============================================================
//  渲染
// ============================================================
function renderSessionList() {
    if (!sessionList) return;
    sessionList.innerHTML = sessions.map(s => `
        <div class="session-item ${s.id === currentSessionId ? 'active' : ''}" data-id="${s.id}">
            <span class="session-icon">💬</span>
            <span class="session-name" data-id="${s.id}">${escapeHtml(s.name || '新对话')}</span>
            <button class="session-delete" data-id="${s.id}">✕</button>
        </div>
    `).join('');

    // 事件绑定：点击切换
    sessionList.querySelectorAll('.session-item').forEach(item => {
        item.addEventListener('click', function(e) {
            if (e.target.closest('.session-delete')) return;
            const id = this.dataset.id;
            if (id && id !== currentSessionId) {
                switchSession(id);
                closeSidebar();
            }
        });
    });

    // 事件绑定：双击重命名
    sessionList.querySelectorAll('.session-name').forEach(nameEl => {
        nameEl.addEventListener('dblclick', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            const session = sessions.find(s => s.id === id);
            if (!session) return;
            const newName = prompt('重命名对话：', session.name);
            if (newName !== null) {
                renameSession(id, newName);
            }
        });
    });

    // 事件绑定：删除
    sessionList.querySelectorAll('.session-delete').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const id = this.dataset.id;
            deleteSession(id, e);
        });
    });
}

function renderMessages(messages) {
    chatBox.innerHTML = '';
    // 过滤掉 system 消息
    const userMessages = messages.filter(m => m.role !== 'system');

    if (userMessages.length === 0) {
        // 显示欢迎消息
        chatBox.innerHTML = `
            <div class="welcome-msg">
                <div class="welcome-icon">👋</div>
                <h2>你好，我是 DeepSeek</h2>
                <p>随时为你解答问题，开始对话吧！</p>
            </div>
        `;
        return;
    }

    userMessages.forEach(msg => {
        const div = document.createElement('div');
        div.className = `msg ${msg.role}`;
        div.textContent = msg.content;
        chatBox.appendChild(div);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================
//  核心：发送消息
// ============================================================
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text || isLoading) return;

    // 检查 API Key
    if (!CONFIG.API_KEY || CONFIG.API_KEY === 'sk-c2c7f7fdf13545da8656241acff333cb') {
        appendMsg('⚠️ 请先在 script.js 中填入你的 DeepSeek API Key！', 'ai');
        return;
    }

    const session = getCurrentSession();
    if (!session) return;

    // 移除欢迎消息
    const welcome = chatBox.querySelector('.welcome-msg');
    if (welcome) welcome.remove();

    // 显示用户消息
    appendMsg(text, 'user');
    userInput.value = '';
    isLoading = true;
    sendBtn.disabled = true;

    // 加入历史
    session.messages.push({ role: 'user', content: text });
    saveSessions();

    // 如果会话没有名字，用第一条消息命名
    if (session.name === '新对话') {
        const shortName = text.length > 20 ? text.slice(0, 20) + '...' : text;
        session.name = shortName;
        sessionTitle.textContent = session.name;
        renderSessionList();
        saveSessions();
    }

    // 创建 AI 占位消息
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
                messages: session.messages,
                // 启用深度思考并设置强度
                reasoning_effort: "high", 
                extra_body: {
                    "thinking": {
                        "type": "enabled"
                    }
                },
                 // 声明联网搜索工具
                 tools: [{
                     "type": "web_search",
                     "search_config": {
                         "max_results": 3 // 可选：控制返回的搜索结果数量
                     }
                  }],
                stream: false,
                max_tokens: 4096
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const reply = data.choices[0].message.content;

        aiMsgEl.textContent = reply;
        aiMsgEl.classList.remove('typing');
        session.messages.push({ role: 'assistant', content: reply });
        saveSessions();

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
//  辅助函数
// ============================================================
function appendMsg(text, role) {
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    div.textContent = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    return div;
}

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
//  清空当前对话
// ============================================================
function clearCurrentChat() {
    if (isLoading) return;
    const session = getCurrentSession();
    if (!session) return;

    // 保留 system 消息
    const systemMsg = session.messages.find(m => m.role === 'system');
    session.messages = systemMsg ? [systemMsg] : [{ role: 'system', content: '你是一个友好、专业、乐于助人的AI助手。回答简洁清晰，用中文。' }];
    saveSessions();
    renderMessages(session.messages);
    // 重置会话名称
    session.name = '新对话';
    sessionTitle.textContent = '新对话';
    renderSessionList();
    showToast('已清空当前对话');
}

// ============================================================
//  侧边栏控制
// ============================================================
function openSidebar() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

function toggleSidebar() {
    if (sidebar.classList.contains('open')) {
        closeSidebar();
    } else {
        openSidebar();
    }
}

// ============================================================
//  主题切换
// ============================================================
function toggleTheme() {
    isDark = !isDark;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : '');
    const icon = isDark ? '☀️' : '🌙';
    themeToggle.textContent = icon;
    sidebarThemeBtn.textContent = isDark ? '☀️ 切换主题' : '🌙 切换主题';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function loadThemePreference() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
        isDark = true;
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.textContent = '☀️';
        sidebarThemeBtn.textContent = '☀️ 切换主题';
    }
}

// ============================================================
//  Toast 提示（简易）
// ============================================================
function showToast(text) {
    const existing = document.querySelector('.toast-msg');
    if (existing) existing.remove();

    const div = document.createElement('div');
    div.className = 'toast-msg';
    div.textContent = text;
    Object.assign(div.style, {
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.75)',
        color: '#fff',
        padding: '10px 24px',
        borderRadius: '12px',
        fontSize: '14px',
        zIndex: '9999',
        animation: 'fadeUp 0.3s ease',
        backdropFilter: 'blur(8px)',
        maxWidth: '90%',
        textAlign: 'center'
    });
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 2000);
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
menuBtn.addEventListener('click', toggleSidebar);
sidebarClose.addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);
newChatBtn.addEventListener('click', createNewSession);
clearBtn.addEventListener('click', clearCurrentChat);
themeToggle.addEventListener('click', toggleTheme);
sidebarThemeBtn.addEventListener('click', toggleTheme);

// 键盘快捷键：Ctrl+K 新建对话
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        createNewSession();
    }
});

// ============================================================
//  初始化
// ============================================================
loadThemePreference();
loadSessions();

// 如果有会话，切换到第一个
if (sessions.length > 0) {
    switchSession(sessions[0].id);
} else {
    // 兜底
    createNewSession();
}

// 桌面端聚焦输入框
if (window.innerWidth > 768) {
    userInput.focus();
}

console.log('🧠 DeepSeek 助手已启动！多会话管理已开启');
console.log(`📚 当前会话数: ${sessions.length}`);
