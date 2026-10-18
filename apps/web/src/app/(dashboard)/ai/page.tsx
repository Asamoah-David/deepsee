'use client';

import { useState } from 'react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'I can answer read-only questions using the device, fleet health, and alert data available to your account. I cannot execute device actions.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const handleQuery = async (queryText: string) => {
    if (!queryText.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: queryText };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || `AI request failed (${res.status})`);
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.message || 'Analysis complete.' },
        ]);
      } else {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let aiText = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            aiText += chunk;
          }
        }

        const cleanedText = aiText.split('\n')
          .filter((line) => line.startsWith('0:'))
          .map((line) => {
            try { return JSON.parse(line.slice(2)) as string; } catch { return ''; }
          })
          .join('');

        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: cleanedText || 'The assistant returned no response text.',
        }]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: err instanceof Error ? err.message : 'The request failed. No device action was taken.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-88px)] bg-surface border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border bg-surface-2 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wider">
            AI Operations Assistant
          </h2>
          <p className="text-xs text-text-secondary">Read-only fleet queries and alert summaries</p>
        </div>
        <span className="text-xs font-mono text-text-muted">Read-only</span>
      </div>

      <div className="p-3 border-b border-border bg-surface-2/30 flex gap-2 flex-wrap text-xs">
        <span className="text-text-muted py-1">Quick Actions:</span>
        {[
          'Summarize fleet health',
          'Show recent alerts',
          'Find a device by name',
        ].map((q, i) => (
          <button
            key={i}
            onClick={() => handleQuery(q)}
            disabled={loading}
            className="bg-surface hover:bg-surface-3 text-text-secondary hover:text-text-primary px-2.5 py-1 rounded border border-border transition-colors font-mono"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] p-4 rounded-lg text-sm ${
                msg.role === 'user'
                  ? 'bg-accent text-white font-medium'
                  : 'bg-surface-2 border border-border text-text-primary'
              }`}
            >
              <div className="mb-1 text-[10px] uppercase opacity-70 font-mono tracking-wider">
                {msg.role === 'user' ? 'Administrator' : 'DeepSee AI Operations'}
              </div>
              <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
                {msg.content}
              </div>

            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface-2 border border-border p-3 rounded text-xs font-mono text-text-muted">
              Querying authorized fleet data...
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border bg-surface-2/50">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleQuery(input);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about device status, fleet health, or recent alerts..."
            className="flex-1 bg-surface border border-border rounded px-4 py-2 text-sm focus:outline-none focus:border-accent text-text-primary"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-accent hover:bg-accent-hover text-white px-5 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
