module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  try {
    var texts = req.body.texts;
    var lang = req.body.lang;

    if (!texts || !lang || !Array.isArray(texts)) {
      return res.status(400).json({ error: 'Missing texts array or lang' });
    }

    var langNames = {
      fr: 'French',
      ar: 'Arabic',
      ru: 'Russian',
      zh: 'Simplified Chinese'
    };

    if (!langNames[lang]) {
      return res.status(400).json({ error: 'Unsupported language' });
    }

    var prompt = 'Translate the following HTML fragments into ' + langNames[lang] + '. ' +
      'Preserve ALL HTML tags, attributes, classes, and structure exactly as they are. Only translate the visible text content. ' +
      'Do not translate proper nouns like: Hannibal, Cannae, Rome, Carthage, Scipio, Maharbal, Aristotle, Polybius, Livy, Zama, BCE, CE, Punic, Mediterranean, Hellenistic, Mongol, etc. Keep these in their original form. ' +
      'Do not add any explanation. Return ONLY a JSON array of translated strings, one per input fragment. ' +
      'Keep translations elegant and literary in tone — this is a scholarly publication.\n\n' +
      'Input fragments:\n' + JSON.stringify(texts);

    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    var data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error || 'API error' });
    }

    var rawText = '';
    for (var i = 0; i < data.content.length; i++) {
      rawText += data.content[i].text || '';
    }
    var cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    var translations = JSON.parse(cleaned);

    return res.status(200).json({ translations: translations });
  } catch (err) {
    console.error('Translation error:', err);
    return res.status(500).json({ error: 'Translation failed: ' + err.message });
  }
};
