let token = null;

async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (response.ok) {
    const data = await response.json();
    token = data.token;
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
    headers: { 'Authorization': `Bearer ${token}` },
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
    headers: { 'Authorization': `Bearer ${token}` }
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
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (response.ok) {
    // Получаем файл как бинарный объект
    const blob = await response.blob();
    // Создаём временную ссылку для скачивания
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename; // Используем оригинальное имя файла
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url); // Освобождаем память
  } else {
    alert('Failed to download file');
  }
}
