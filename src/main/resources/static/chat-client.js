const wsUrl = (location.protocol === 'https:' ? 'wss' : 'ws') + '://' + location.host + '/chat';
const socket = new WebSocket(wsUrl);

const messagesEl = document.getElementById('messages');
const senderEl = document.getElementById('sender');
const textEl = document.getElementById('text');
const sendBtn = document.getElementById('send');

const messages = new Map();

function renderMessage(m) {
  let el = document.getElementById('m-' + m.messageId);
  if (m.deleted) {
    if (el) {
      el.innerHTML = '<div class="message">(deleted)</div>';
    }
    return;
  }
  const reactions = m.reactions ? Object.entries(m.reactions).map(([k,v]) => `${k} ${v}`).join(' ') : '';
  const edited = m.edited ? ' (edited)' : '';
  const html = `<div class="message" id="m-${m.messageId}"><b>${m.sender}:</b> ${m.content}${edited}<div class="meta">${new Date(m.sentAt).toLocaleTimeString()} ${reactions}</div>
    <button onclick="react('${m.messageId}','👍')">👍</button>
    <button onclick="react('${m.messageId}','❤️')">❤️</button>
    <button onclick="edit('${m.messageId}')">Edit</button>
    <button onclick="del('${m.messageId}')">Delete</button>
  </div>`;
  if (el) {
    el.outerHTML = html;
  } else {
    messagesEl.insertAdjacentHTML('beforeend', html);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
}

socket.addEventListener('open', () => {
  console.log('ws open');
  // register name if provided
  if (senderEl.value) {
    socket.send(JSON.stringify({ type: 'register', sender: senderEl.value }));
  }
});

socket.addEventListener('message', ev => {
  try {
    const m = JSON.parse(ev.data);
    if (m.type === 'update' || m.type === 'chat' || m.type === 'delete') {
      messages.set(m.messageId, m);
      renderMessage(m);
    } else if (m.type === 'system') {
      const id = 'sys-' + Math.random();
      messagesEl.insertAdjacentHTML('beforeend', `<div class="message meta">${m.content}</div>`);
    }
  } catch (e) {
    console.error(e);
  }
});

sendBtn.addEventListener('click', () => {
  const msg = { type: 'chat', sender: senderEl.value || 'Anonymous', content: textEl.value };
  socket.send(JSON.stringify(msg));
  textEl.value = '';
});

function react(messageId, reaction) {
  socket.send(JSON.stringify({ type: 'reaction', messageId, reaction }));
}

function edit(messageId) {
  const newText = prompt('Edit message');
  if (newText !== null) {
    socket.send(JSON.stringify({ type: 'edit', messageId, content: newText }));
  }
}

function del(messageId) {
  if (confirm('Delete message?')) {
    socket.send(JSON.stringify({ type: 'delete', messageId }));
  }
}
