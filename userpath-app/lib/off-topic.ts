const DESIGN_KEYWORDS = [
  'user flow', 'ux', 'ui', 'interface', 'wireframe', 'prototype',
  'product', 'app', 'website', 'dashboard', 'mobile', 'screen',
  'workflow', 'onboarding', 'checkout', 'signup', 'login',
  'register', 'payment', 'feature', 'navigation', 'journey',
  'user', 'customer', 'admin', 'page', 'flow', 'button',
  'form', 'process', 'step', 'click', 'tap', 'swipe',
  'fintech', 'ecommerce', 'saas', 'marketplace', 'platform',
  'savings', 'banking', 'subscription', 'notification',
];

const OFF_TOPIC_KEYWORDS = [
  'recipe', 'ingredients', 'essay', 'homework', 'assignment',
  'movie', 'song', 'album', 'vacation', 'weather', 'politics',
];

const productPatterns = [
  /(i'm|i am)\s+(building|designing|working\s+on|creating|making)\s+(a|an|the)/i,
  /(app|platform|tool|website|dashboard|service)\s+(for|to|that|where)/i,
  /help\s+\w+\s+(to\s+)?(do|manage|track|find|create|connect)/i,
];

function matchesProductPattern(description: string): boolean {
  for (const pattern of productPatterns) {
    if (pattern.test(description)) return true;
  }
  return false;
}

async function deepSeekOffTopicCheck(description: string): Promise<boolean> {
  const baseUrl = process.env.DEEPSEEK_API_URL?.replace(/\/+$/, '');
  const key = process.env.DEEPSEEK_API_KEY;

  if (!baseUrl || !key) return true;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a binary classifier. Respond "TOPIC" if the text describes a digital product, app, website, or software feature that could have a user flow. Respond "OFF_TOPIC" otherwise. Respond with exactly one word.',
        },
        { role: 'user', content: description },
      ],
      temperature: 0,
      max_tokens: 10,
      seed: 42,
    }),
  });

  if (!response.ok) return true;

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim().toLowerCase();
  return content !== 'topic';
}

export async function isOffTopic(description: string): Promise<boolean> {
  const lower = description.toLowerCase();

  const designMatches = DESIGN_KEYWORDS.filter((kw) => lower.includes(kw));

  // Fast pass: clearly on-topic (3+ design keywords)
  if (designMatches.length >= 3) return false;

  // Clearly off-topic: contains off-topic keywords with no design context
  if (designMatches.length === 0) {
    if (OFF_TOPIC_KEYWORDS.some((kw) => lower.includes(kw))) return true;
    if (matchesProductPattern(description)) return false;
  }

  // Borderline: use DeepSeek for classification
  try {
    return await deepSeekOffTopicCheck(description);
  } catch {
    // Fall back to heuristics on API failure
    if (designMatches.length >= 2) return false;
    if (OFF_TOPIC_KEYWORDS.some((kw) => lower.includes(kw))) return true;
    return !matchesProductPattern(description);
  }
}
