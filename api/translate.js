export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  try {
    const { texts, lang } = req.body;

    if (!texts || !lang || !Array.isArray(texts)) {
      return res.status(400).json({ error: 'Missing texts array or lang' });
    }

    const langNames = {
      fr: 'French',
      ar: 'Arabic',
      ru: 'Russian',
      zh: 'Simplified Chinese'
    };

    if (!langNames[lang]) {
      return res.status(400).json({ error: 'Unsupported language' });
    }

    const prompt = `Translate the following HTML fragments into ${langNames[lang]}. 
Preserve ALL HTML tags, attributes, classes, and structure exactly as they are. Only translate the visible text content.
Do not translate proper nouns like: Hannibal, Cannae, Rome, Carthage, Scipio, Maharbal, Aristotle, Polybius, Livy, Zama, BCE, CE, Punic, Mediterranean, Hellenistic, Mongol, etc. Keep these in their original form.
Do not add any explanation. Return ONLY a JSON array of translated strings, one per input fragment.
Keep translations elegant and literary in tone — this is a scholarly publication.

Input fragments:
${JSON.stringify(texts)}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error || 'API error' });
    }

    const text = data.content.map(c => c.text || '').join('');
    const cleaned = text.replace(/```json|```/g, '').trim();
    const translations = JSON.parse(cleaned);

    return res.status(200).json({ translations });
  } catch (err) {
    console.error('Translation error:', err);
    return res.status(500).json({ error: 'Translation failed' });
  }
}
