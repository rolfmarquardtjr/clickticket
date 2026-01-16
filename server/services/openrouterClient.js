const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

function getOpenRouterConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-r1-0528:free';
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY não configurada');
  }
  return { apiKey, model };
}

function extractJsonPayload(content) {
  if (!content) return null;
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced && fenced[1]) return fenced[1].trim();
  const firstBrace = content.indexOf('{');
  const lastBrace = content.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return content.slice(firstBrace, lastBrace + 1).trim();
  }
  return content.trim();
}

async function callOpenRouter({ apiKey, model, messages, temperature = 0.2 }) {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model, messages, temperature })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter erro: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('OpenRouter retornou resposta vazia');
  }
  return content;
}

export async function classifyEmailWithAI({ subject, body, from, areas, categories, products, defaults }) {
  const { apiKey, model } = getOpenRouterConfig();

  const systemPrompt = [
    'Você é um classificador de tickets de suporte.',
    'Responda SOMENTE com JSON válido, sem texto extra.',
    'Escolha area_id, category_id e subcategory_id a partir das listas fornecidas.',
    'Se não tiver certeza, use os defaults fornecidos.',
    'Impacto deve ser: baixo, medio ou alto.',
    'Campos obrigatórios: area_id, category_id, subcategory_id, impact, summary, description.'
  ].join(' ');

  const userPrompt = JSON.stringify({
    email: { subject, body, from },
    areas,
    categories,
    products,
    defaults
  });

  const content = await callOpenRouter({
    apiKey,
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.2
  });

  try {
    const payload = extractJsonPayload(content);
    return JSON.parse(payload);
  } catch (err) {
    const repairPrompt = [
      'Você respondeu com JSON inválido.',
      'Conserte e devolva SOMENTE JSON válido no formato esperado.',
      'Não use markdown, não use blocos de código.'
    ].join(' ');

    const fixed = await callOpenRouter({
      apiKey,
      model,
      messages: [
        { role: 'system', content: repairPrompt },
        { role: 'user', content }
      ],
      temperature: 0
    });
    const payload = extractJsonPayload(fixed);
    return JSON.parse(payload);
  }
}
