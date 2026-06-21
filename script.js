const CONFIG = {
    API_KEY: 'sk-你的DeepSeek_API_Key',
    API_URL: 'https://api.deepseek.com/chat/completions',
    MODEL: 'deepseek-chat',
    STORAGE_KEY: 'deepseek_sessions'
};

let sessions = [];
let currentSessionId = null;
let isLoading = false;
let isDark = false;

function loadSessions() {
    try {
        var saved = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (saved) {
            sessions = JSON.parse(saved);
            sessions = sessions.filter(function(s) { return s.id && s.messages; });
        }
    } catch(e) {
        sessions = [];
    }
    if (sessions.length === 0) createNewSession();
}

function saveSessions() {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(sessions));
}

function createNewSession() {
    var session = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
        title: '新对话',
        messages: [{ role: 'system', content: '你是一个友好、专业、乐于助人的AI助手。回答必须用中文，并且要分段呈现。每段之间空一行。用换行符分隔不同段落。重要内容用【】或**加粗**标注。回复要清晰易读，方便手机阅读。' }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    sessions.unshift(session);
    currentSessionId = session.id;
    saveSessions();
    renderAll();
    return session;
}

function getCurrentSession() {
    return sessions.find(function(s) { return s.id === currentSessionId; }) || sessions[0];
}

function deleteSession(id) {
    if (sessions.length <= 1) {
        clearChatHistory();
        return;
    }
    sessions = sessions.filter(function(s) { return s.id !== id; });
    if (currentSessionId === id) currentSessionId = sessions[0].id;
    saveSessions();
    renderAll();
}

function clearChatHistory() {
    var s = getCurrentSession();
    if (s) {
        s.messages = [{ role: 'system', content: '你是一个友好、专业、乐于助人的AI助手。回答必须用中文，并且要分段呈现。每段之间空一行。用换行符分隔不同段落。重要内容用【】或**加粗**标注。回复要清晰易读，方便手机阅读。' }];
        s.title = '新对话';
        saveSessions();
        renderAll();
    }
}

function clearAllSessions() {
    if (!confirm('确定删除所有对话吗？')) return;
    sessions = [];
    createNewSession();
    renderAll();
}

function renderSessionList() {
    var list = document.getElementById('sessionList');
    var count = document.getElementById('sessionCount');
    if (sessions.length === 0) {
        list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-light);">暂无对话</div>';
        count.textContent = '0 个对话';
        return;
    }
    var html = '';
    for (var i = 0; i < sessions.length; i++) {
        var s = sessions[i];
        var activeClass = (s.id === currentSessionId) ? ' active' : '';
        html += '<div class="session-item' + activeClass + '" data-id="' + s.id + '">';
        html += '<span class="session-title-text">' + escapeHtml(s.title || '新对话') + '</span>';
        html += '<button class="session-delete" data-id="' + s.id + '">✕</button>';
        html += '</div>';
    }
    list.innerHTML = html;
    count.textContent = sessions.length + ' 个对话';

    var items = list.querySelectorAll('.session-item');
    for (var j = 0; j < items.length; j++) {
        (function(item) {
            item.addEventListener('click', function(e) {
                if (e.target.closest('.session-delete')) return;
                var id = this.dataset.id;
                if (id && id !== currentSessionId) {
                    currentSessionId = id;
                    renderAll();
                    closeSidebar();
                }
            });
        })(items[j]);
    }

    var deletes = list.querySelectorAll('.session-delete');
    for (var k = 0; k < deletes.length; k++) {
        (function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                deleteSession(this.dataset.id);
            });
        })(deletes[k]);
    }
}

// ===== 【核心修改】渲染聊天，支持换行 =====
function renderChat() {
    var box = document.getElementById('chatBox');
    var s = getCurrentSession();
    if (!s || s.messages.length <= 1) {
        box.innerHTML = '<div class="welcome-msg"><div class="welcome-icon">👋</div><h2>你好，我是 DeepSeek</h2><p>点击「＋ 新对话」开始聊天，所有记录自动保存</p></div>';
        return;
    }
    var html = '';
    for (var i = 0; i < s.messages.length; i++) {
        var m = s.messages[i];
        if (m.role === 'system') continue;
        var cls = (m.role === 'user') ? 'user' : 'ai';
        // 🔥 关键：把 \n 换成 <br>，让文字分段
        var contentWithBreaks = escapeHtml(m.content).replace(/\n/g, '<br>');
        html += '<div class="msg ' + cls + '">' + contentWithBreaks + '</div>';
    }
    box.innerHTML = html;
    box.scrollTop = box.scrollHeight;
}

function renderAll() {
    renderSessionList();
    renderChat();
    var s = getCurrentSession();
    document.getElementById('sessionTitle').textContent = s ? s.title : '新对话';
}

function escapeHtml(text) {
    var d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

// ===== 【核心修改】发送消息，回复自动换行 =====
function sendMessage() {
    var input = document.getElementById('userInput');
    var text = input.value.trim();
    if (!text || isLoading) return;

    if (!CONFIG.API_KEY || CONFIG.API_KEY === 'sk-你的DeepSeek_API_Key') {
        appendSystemMsg('请先在 script.js 中填入你的 DeepSeek API Key！');
        return;
    }

    var s = getCurrentSession();
    if (!s) return;

    if (s.messages.length <= 1) {
        s.title = text.length > 20 ? text.slice(0,20) + '...' : text;
    }

    s.messages.push({ role: 'user', content: text });
    saveSessions();
    renderAll();
    input.value = '';
    isLoading = true;
    document.getElementById('sendBtn').disabled = true;

    var box = document.getElementById('chatBox');
    var placeholder = document.createElement('div');
    placeholder.className = 'msg ai typing';
    placeholder.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
    box.appendChild(placeholder);
    box.scrollTop = box.scrollHeight;

    fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + CONFIG.API_KEY
        },
        body: JSON.stringify({
            model: CONFIG.MODEL,
            messages: s.messages,
            stream: false,
            temperature: 0.7,
            max_tokens: 2048
        })
    })
    .then(function(resp) {
        if (!resp.ok) {
            return resp.json().then(function(err) {
                throw new Error(err.error?.message || 'HTTP ' + resp.status);
            });
        }
        return resp.json();
    })
    .then(function(data) {
        var reply = data.choices[0].message.content;
        placeholder.remove();
        // 🔥 存入历史（原文）
        s.messages.push({ role: 'assistant', content: reply });
        saveSessions();
        // 🔥 重新渲染（自动处理换行）
        renderAll();
    })
    .catch(function(e) {
        placeholder.textContent = '错误：' + e.message;
        placeholder.classList.remove('typing');
    })
    .finally(function() {
        isLoading = false;
        document.getElementById('sendBtn').disabled = false;
    });
}

function appendSystemMsg(text) {
    var box = document.getElementById('chatBox');
    var d = document.createElement('div');
    d.className = 'msg ai';
    d.textContent = text;
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
}

function toggleTheme() {
    isDark = !isDark;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : '');
    var btns = document.querySelectorAll('.header-theme-btn, .sidebar-theme-btn');
    for (var i = 0; i < btns.length; i++) {
        btns[i].textContent = isDark ? '☀️' : '🌙';
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function loadTheme() {
    if (localStorage.getItem('theme') === 'dark') {
        isDark = true;
        document.documentElement.setAttribute('data-theme', 'dark');
        var btns = document.querySelectorAll('.header-theme-btn, .sidebar-theme-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].textContent = '☀️';
        }
    }
}

function openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebarOverlay').classList.add('show');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('show');
}

document.addEventListener('DOMContentLoaded', function() {
    loadSessions();
    loadTheme();
    renderAll();

    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('userInput').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    document.getElementById('newChatBtn').addEventListener('click', function() {
        createNewSession();
        renderAll();
        closeSidebar();
    });
    document.getElementById('sidebarClearBtn').addEventListener('click', clearAllSessions);
    document.getElementById('headerThemeBtn').addEventListener('click', toggleTheme);
    document.getElementById('sidebarThemeBtn').addEventListener('click', toggleTheme);
    document.getElementById('menuToggle').addEventListener('click', openSidebar);
    document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);

    if (window.innerWidth > 600) {
        document.getElementById('userInput').focus();
    }
    console.log('DeepSeek 已启动，会话数:', sessions.length);
});
