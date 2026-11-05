const form = document.querySelector('form');
const message = document.querySelector('#message');
async function send(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: {'X-Requested-With': 'MeetScientist'},
    body: new URLSearchParams(body)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text);
  return text;
}
if (form) form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button');
  const data = new FormData(form);
  message.className = 'message';
  if (form.dataset.action === 'signup' && data.get('password') !== data.get('confirm')) {
    message.textContent = 'The passwords do not match.'; return;
  }
  if (form.dataset.action === 'signup') {
    const size = new TextEncoder().encode(data.get('password')).length;
    if (size < 15 || size > 128) { message.textContent = 'Use a longer password or passphrase (15–128 bytes).'; return; }
  }
  button.disabled = true; message.textContent = 'Please wait…';
  try {
    await send('/api/' + form.dataset.action, data);
    location.href = form.dataset.action === 'signup' ? '/login.html?created=1' : '/account.html';
  } catch (error) { message.textContent = error.message || 'Could not connect. Check that the server is running.'; }
  finally { button.disabled = false; }
});
if (location.pathname === '/login.html' && new URLSearchParams(location.search).has('created')) {
  message.className = 'message success';
  message.textContent = 'Your account is saved. Log in below.';
}
if (location.pathname === '/account.html') {
  (async () => {
    try {
      const response = await fetch('/api/me');
      if (response.status === 401) { location.replace('/login.html'); return; }
      if (!response.ok) throw new Error('Could not load your account. Try refreshing.');
      const user = await response.json();
      for (const field of ['name', 'email', 'role']) document.querySelector('#' + field).textContent = user[field];
      document.querySelector('#details').hidden = false;
      message.textContent = '';
    } catch(error) { message.textContent = error.message; }
  })();
  document.querySelector('#logout').addEventListener('click', async () => {
    try { await send('/api/logout', {}); location.replace('/login.html'); }
    catch(error) { message.textContent = error.message; }
  });
}
