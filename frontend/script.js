async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Включаем отправку кук
    body: JSON.stringify({ username, password })
  });

  if (response.ok) {
    document.getElementById('login').style.display = 'none';
    document.getElementById('upload').style.display = 'block';
    document.getElementById('fileList').style.display = 'block';
    loadFiles();
  } else {
    alert('Login failed');
  }
}

async function uploadFile() {
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];

  if (!file) {
    alert('Please select a file');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    credentials: 'include', // Включаем отправку кук
    body: formData
  });

  if (response.ok) {
    alert('File uploaded');
    loadFiles();
  } else {
    alert('Upload failed');
  }
}

async function loadFiles() {
  const response = await fetch('/api/files', {
    credentials: 'include', // Включаем отправку кук
  });

  if (response.ok) {
    const files = await response.json();
    const fileList = document.getElementById('files');
    fileList.innerHTML = files.map(file => `
      <li>
        <button onclick="downloadFile(${file.id}, '${file.filename}')">${file.filename}</button>
      </li>
    `).join('');
  } else {
    alert('Failed to load files');
  }
}

async function downloadFile(fileId, filename) {
  const response = await fetch(`/api/download/${fileId}`, {
    credentials: 'include', // Включаем отправку кук
  });

  if (response.ok) {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } else {
    alert('Failed to download file');
  }
}

// Функция для выхода из системы
async function logout() {
  const response = await fetch('/api/logout', {
    method: 'POST',
    credentials: 'include', // Включаем отправку кук
  });

  if (response.ok) {
    document.getElementById('login').style.display = 'block';
    document.getElementById('upload').style.display = 'none';
    document.getElementById('fileList').style.display = 'none';
    alert('Logged out');
  } else {
    alert('Logout failed');
  }
}