export async function detectMode() {
  try {
    const response = await fetch('./api/status', { cache: 'no-store', signal: AbortSignal.timeout(1500) });
    if (!response.ok) throw new Error('API indisponível');
    return response.json();
  } catch { return { mode: 'readonly', editable: false }; }
}

export async function loadDatabase(mode) {
  const endpoint = mode.editable ? './api/objects' : './generated/database.json';
  const response = await fetch(endpoint, { cache: 'no-store' });
  if (!response.ok) throw new Error('Não foi possível carregar os dados gerados. Execute npm run analyze.');
  return response.json();
}

export async function api(path, options = {}) {
  const response = await fetch(`./api/${path}`, { headers: { 'Content-Type': 'application/json', ...options.headers }, ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || 'Falha na operação.');
    error.details = body;
    error.status = response.status;
    throw error;
  }
  return body;
}
