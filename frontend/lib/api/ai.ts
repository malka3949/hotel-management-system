import { apiFetch } from './client';

const API = '/api';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendConciergeMessage(
  token: string,
  message: string,
  history: ConversationMessage[],
): Promise<string> {
  const res = await fetch(`${API}/v1/portal/concierge/${token}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) throw new Error('CONCIERGE_ERROR');
  const data = (await res.json()) as { success: boolean; data: { reply: string } };
  return data.data.reply;
}

export async function getPricingSuggestions(): Promise<string> {
  const res = await apiFetch<{ suggestions: string }>('/v1/reports/pricing-suggestions');
  return res.suggestions;
}

export async function queryNlReports(query: string): Promise<string> {
  const res = await apiFetch<{ answer: string }>('/v1/reports/query', {
    method: 'POST',
    body: JSON.stringify({ query }),
  });
  return res.answer;
}
