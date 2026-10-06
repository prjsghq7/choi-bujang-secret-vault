export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return response.status(500).json({ error: 'Server storage is not configured' });
  try {
    const upstream = await fetch(url + '/rest/v1/notes?select=title,content&order=id', {
      headers: { apikey: key, Authorization: 'Bearer ' + key }
    });
    if (!upstream.ok) return response.status(502).json({ error: 'Storage request failed' });
    const notes = await upstream.json();
    return response.status(200).json({ notes });
  } catch {
    return response.status(502).json({ error: 'Storage request failed' });
  }
}
