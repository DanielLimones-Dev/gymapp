const SUPABASE_URL = 'https://vlnmhwaadyejdnmgktjt.supabase.co';
const SUPABASE_ANON = 'sb_publishable_ZHJhHtk3REmxd3EblLt6NA_9YIsoiSb';

async function findDaniel() {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/perfiles?select=*`, {
    headers: {
      'apikey': SUPABASE_ANON,
      'Authorization': `Bearer ${SUPABASE_ANON}`
    }
  });
  
  const data = await resp.json();
}

findDaniel();
