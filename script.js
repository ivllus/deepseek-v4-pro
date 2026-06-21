const chatEl  = document.getElementById('chat');
const input   = document.getElementById('msgInput');
const keyIn   = document.getElementById('apiKeyInput');
let history = [];

function addBubble(text, cls) {
  const d = document.createElement('div');
  d.className = 'msg ' + cls;
  d.textContent = text;
  chatEl.appendChild(d);
  chatEl.scrollTop = chatEl.scrollHeight;
  return d;
}

function showTyping() {
  const d = document.createElement('div');
  d.className = 'typing-indicator';
  d.id = 'typing';
  d.innerHTML = '<span></span><span></span><span></span>';
  chatEl.appendChild(d);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function hideTyping() {
  const t = document.getElementById('typing');
  if (t) t.remove();
}

async function send() {
  const key = keyIn.value.trim();
  const txt = input.value.trim();
  if (!key) return alert('请先填入 API Key！');
  if (!txt) return;

  addBubble(txt, 'user');
  history.push({ role: 'user', content: txt });
  input.value = '';
  showTyping();

  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: history,
        temperature: 0.7
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'HTTP ' + res.status);
    }
    const data = await res.json();
    const reply = data.choices[0].message.content;
    history.push({ role: 'assistant', content: reply });
    hideTyping();
    addBubble(reply, 'ai');
  } catch (e) {
    hideTyping();
    addBubble('❌ ' + e.message, 'ai');
  }
}

input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
