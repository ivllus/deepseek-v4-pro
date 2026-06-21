// ============================================================
//  配置
// ============================================================
const CONFIG = {
    API_KEY: 'sk-c2c7f7fdf13545da8656241acff333cb',
    API_URL: 'https://api.deepseek.com/chat/completions',
    MODEL: deepseek-v4-pro',
    STORAGE_KEY: 'deepseek_sessions'
};

// ============================================================
//  数据管理
// ============================================================
let sessions = [];
let currentSessionId = null;
let isLoading = false;
let isDark = false;

// 加载本地数据
function loadSessions() {
    try {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (saved) {
            sessions = JSON.parse(saved);
            // 确保每个会话都有完整结构
            sessions = sessions.filter(s => s.id && s.title && s.messages);
        }
    } catch (e) {
        sessions = [];
    }
    if (sessions.length === 0) {
        createNewSession();
    }
}

// 保存到本地
function saveSessions() {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
        console.error('保存失败:', e);
    }
}

// 创建新会话
function createNewSession() {
    const session = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title: '新对话',
        messages: [
            { role: 'system', content: '你是一个友好、专业、乐于助人的AI助手。回答简洁清晰，用中文。' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    sessions.unshift(session);
    currentSessionId = session.id;
    saveSessions();
    renderSessionList();
    renderChat();
    updateUI();
    return session;
}

// 获取当前会话
function getCurrentSession() {
    return sessions.find(s => s.id === currentSessionId) || sessions[0];
}

// 删除会话
function deleteSession(id) {
    if (sessions.length <= 1) {
        // 至少保留一个会话
        clearChatHistory();
        return;
    }
    sessions = sessions.filter(s => s.id !== id);
    if (currentSessionId === id) {
        currentSessionId = sessions[0].id;
    }
    saveSessions();
    renderSessionList();
    renderChat();
    updateUI();
}

// 清空当前会话历史
function clearChatHistory() {
    const session = getCurrentSession();
    if (session) {
        session.messages = [
            { role: 'system', content: '你是一个友好、专业、乐于助人的AI助手。回答简洁清晰，用中文。' }
        ];
        session.title = '新对话';
        session.updatedAt = new Date().toISOString();
        saveSessions();
        renderSessionList();
        renderChat();
        updateUI();
    }
}

// 清空所有会话
function clearAllSessions() {
    if (sessions.length === 0) return;
    if (!confirm('确定要删除所有对话吗？此操作不可恢复！')) return;
    sessions = [];
    createNewSession();
    renderSessionList();
    renderChat();
    updateUI();
}

// ============================================================
//  渲染：会话列表
// ============================================================
function renderSessionList() {
    const list = document.getElementById('sessionList');
    const count = document.getElementById('sessionCount');
    
    if (sessions.length === 0) {
        list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-light);font-size:14px;">暂无对话</div>';
        count.textContent = '0 个对话';
        return;
    }

    list.innerHTML = sessions.map(s => `
        <div class="session-item ${s.id === currentSessionId ? 'active' : ''}" data-id="${s.id}">
            <span class="session-title-text">${escapeHtml(s.title || '新对话')}</span>
            <button class="session-delete" data-id="${s.id}" title="删除">✕</button>
        </div>
    `).join('');

    count.textContent = `${sessions.length} 个对话`;

    // 绑定点击事件（切换会话）
    list.querySelectorAll('.session-item').forEach(item => {
        item.addEventListener('click', function(e) {
            if (e.target.closest('.session-delete')) return;
            const id = this.dataset.id;
            if (id && id !== currentSessionId) {
                currentSessionId = id;
                renderSessionList();
                renderChat();
                updateUI();
                closeSidebar();
            }
        });
    });

    // 绑定删除事件
    list.querySelectorAll('.session-delete').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            if (id) deleteSession(id);
        });
    });
}

// ============================================================
//  渲染：聊天内容
// ============================================================
function renderChat() {
    const chatBox = document.getElementById('chatBox');
    const session = getCurrentSession();
    
    if (!session || session.messages.length <= 1) {
        // 显示欢迎页
        chatBox.innerHTML = `
            <div class="welcome-msg">
                <div class="welcome-icon">👋</div>
                <h2>你好，我是 DeepSeek</h2>
                <p>点击「＋ 新对话」开始聊天，所有记录自动保存</p>
            </div>
        `;
        return;
    }

    let html = '';
    const messages = session.messages.filter(m => m.role !== 'system');
    
    if (messages.length === 0) {
        chatBox.innerHTML = `
            <div class="welcome-msg">
                <div class="welcome-icon">👋</div>
                <h2>你好，我是 DeepSeek</h2>
                <p>开始你的第一句话吧！</p>
            </div>
        `;
        return;
    }

    messages.forEach(msg => {
        const role = msg.role === 'user' ? 'user' : 'ai';
        const content = escapeHtml(msg.content);
        html += `<div class="msg ${role}">${content}</div>`;
    });

    chatBox.innerHTML = html;
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ============================================================
//  辅助：HTML 转义
// ============================================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================
//  核心：发送消息
// ============================================================
async function sendMessage() {
    const input = document.getElementById('userInput');
    const text = input.value.trim();
    if (!text || isLoading) return;

    // 检查 API Key
    if (!CONFIG.API_KEY || CONFIG.API_KEY === 'sk-你的DeepSeek_API_Key') {
        appendMessage('⚠️ 请先在 script.js 中填入你的 DeepSeek API Key！', 'ai');
        return;
    }

    const session = getCurrentSession();
    if (!session) return;

    // 如果只有系统消息，说明是空会话，先创建
    if (session.messages.length <= 1) {
        // 用用户的第一句话作为标题
        session.title = text.length > 20 ? text.slice(0, 20) + '...' : text;
    }

    // 添加用户消息
    session.messages.push({ role: 'user', content: text });
    session.updatedAt = new Date().toISOString();
    saveSessions();
    
    // 重新渲染
    renderChat();
    renderSessionList();
    updateUI();
    
    input.value = '';
    isLoading = true;
    document.getElementById('sendBtn').disabled = true;

    // 创建 AI 占位（打字动画）
    const chatBox = document.getElementById('chatBox');
    const aiPlaceholder = document.createElement('div');
    aiPlaceholder.className = 'msg ai typing';
    aiPlaceholder.innerHTML = `
        <div class="typing-dots">
            <span></span><span></span><span></span>
        </div>
    `;
    chatBox.appendChild(aiPlaceholder);
    chatBox.scrollTop = chatBox.scrollHeight;

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

        // 移除占位
        aiPlaceholder.remove();

        // 添加 AI 回复
        session.messages.push({ role: 'assistant', content: reply });
        session.updatedAt = new Date().toISOString();
        saveSessions();
        renderChat();
        renderSessionList();
        updateUI();

    } catch (error) {
        aiPlaceholder.textContent = '❌ ' + error.message;
        aiPlaceholder.classList.remove('typing');
        aiPlaceholder.innerHTML = '❌ ' + escapeHtml(error.message);
        console.error('API Error:', error);
    }

    isLoading = false;
    document.getElementById('sendBtn').disabled = false;
}

// ============================================================
//  辅助：追加消息（外部调用）
// ============================================================
function appendMessage(text, role) {
    const chatBox = document.getElementById('chatBox');
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    div.textContent = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ============================================================
//  UI 更新
// ============================================================
function updateUI() {
    const session = getCurrentSession();
    const titleEl = document.getElementById('sessionTitle');
    if (session && titleEl) {
        titleEl.textContent = session.title || '新对话';
    }
}

// ============================================================
//  主题切换
// ============================================================
function toggleTheme() {
    isDark = !isDark;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : '');
    const btns = document.querySelectorAll('.header-theme-btn, .sidebar-theme-btn');
    btns.forEach(btn => {
        if (btn) btn.textContent = isDark ? '☀️' : '🌙';
    });
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function loadThemePreference() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
        isDark = true;
        document.documentElement.setAttribute('data-theme', 'dark');
        document.querySelectorAll('.header-theme-btn, .sidebar-theme-btn').forEach(btn => {
            if (btn) btn.textContent = '☀️';
        });
    }
}

// ============================================================
//  侧边栏（移动端）
// ============================================================
function openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebarOverlay').classList.add('show');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('show');
}

// ============================================================
//  事件绑定
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    // 加载数据
    loadSessions();
    loadThemePreference();
    renderSessionList();
    renderChat();
    updateUI();

    // 发送
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('userInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // 新对话
    document.getElementById('newChatBtn').addEventListener('click', function() {
        createNewSession();
        renderSessionList();
        renderChat();
        updateUI();
        closeSidebar();
    });

    // 清空当前
    document.getElementById('sidebarClearBtn').addEventListener('click', clearAllSessions);

    // 主题切换（两个按钮）
    document.getElementById('headerThemeBtn').addEventListener('click', toggleTheme);
    document.getElementById('sidebarThemeBtn').addEventListener('click', toggleTheme);

    // 菜单切换
    document.getElementById('menuToggle').addEventListener('click', openSidebar);
    document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);

    // 自动聚焦
    if (window.innerWidth > 600) {
        document.getElementById('userInput').focus();
    }

    console.log('🧠 DeepSeek 助手已启动！');
    console.log(`📚 已加载 ${sessions.length} 个会话`);
});
