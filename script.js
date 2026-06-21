const chatEl = document.getElementById('chat');
const input = document.getElementById('msgInput');
const keyInput = document.getElementById('apiKeyInput');

let history = [];

function appendMsg(text, cls) {
  const d = document.createElement('div');
  d.className = 'msg ' + cls;
  d.textContent = text;
  chatEl.appendChild(d);
  chatEl.scrollTop = chatEl.scrollHeight;
}

async function send() {
  const apiKey = keyInput.value.trim();
  const text = input.value.trim();
  if (!apiKey) return alert('请先填入 API Key！');
  if (!text) return;

  appendMsg(text, 'user');
  history.push({ role: 'user', content: text });
  input.value = '';

  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: history,
        temperature: 0.7
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || '请求失败 ' + res.status);
    }

    const data = await res.json();
    const reply = data.choices[0].message.content;
    history.push({ role: 'assistant', content: reply });
    appendMsg(reply, 'ai');
  } catch (e) {
    appendMsg('❌ ' + e.message, 'ai');
  }
}

// 回车发送
input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });