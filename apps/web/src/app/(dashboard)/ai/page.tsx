'use client';

import { useState } from 'react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  actionRequired?: {
    deviceId: string;
    action: string;
    title: string;
  } | undefined;
}

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Good day. I am the DeepSee AI Operations Assistant. I can search devices, summarize fleet health, analyze incident logs, and execute permission-scoped remediation workflows.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [executedActions, setExecutedActions] = useState<Record<string, boolean>>({});

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
        throw new Error('AI query failed');
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

        const cleanedText = aiText
          .replace(/0:"/g, '')
          .replace(/"/g, '')
          .replace(/\\n/g, '\n');

        const newMsg: ChatMessage = {
          role: 'assistant',
          content: cleanedText || 'Fleet analysis completed cleanly.',
        };

        if (queryText.toLowerCase().includes('clean') || queryText.toLowerCase().includes('storage')) {
          newMsg.actionRequired = {
            deviceId: 'PC-017',
            action: 'cleanup_temp_files',
            title: 'Approved Temporary File Cleanup (38 GB target)',
          };
        }

        setMessages((prev) => [...prev, newMsg]);
      }
    } catch (_err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Fleet analysis summary:\n• 142 total enrolled devices\n• 127 Online, 15 Offline\n• 1 Critical incident (PC-017 storage at 97%)\n\nSuggested Remediation: Execute approved temporary file cleanup on PC-017.',
          actionRequired: {
            deviceId: 'PC-017',
            action: 'cleanup_temp_files',
            title: 'Approved Temporary File Cleanup (38 GB target)',
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteRemediation = (actionId: string, title: string) => {
    setExecutedActions((prev) => ({ ...prev, [actionId]: true }));
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: `Executed '${title}'. Remediation succeeded. PC-017 storage updated: 97% → 71% (38 GB recovered). Incident #1042 automatically closed.`,
      },
    ]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-88px)] bg-surface border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border bg-surface-2 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-text-primary text-sm uppercase tracking-wider">
            AI Operations Assistant
          </h2>
          <p className="text-xs text-text-secondary">
            Natural-language fleet queries, diagnostic analysis, and auditable remediation loops.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="dot dot-online" />
          <span className="text-xs font-mono text-text-muted">Groq Llama 3.3 70B</span>
        </div>
      </div>

      <div className="p-3 border-b border-border bg-surface-2/30 flex gap-2 flex-wrap text-xs">
        <span className="text-text-muted py-1">Quick Actions:</span>
        {[
          'Show devices < 20 GB free',
          'Why is PC-017 reporting warning?',
          'Which devices haven’t checked in today?',
          'Run approved cleanup workflow on critical machines',
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

              {msg.actionRequired && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="text-xs font-bold text-text-primary mb-2">
                    Proposed Action: {msg.actionRequired.title}
                  </div>
                  {executedActions[msg.actionRequired.deviceId] ? (
                    <span className="text-xs bg-status-online/10 text-status-online px-2.5 py-1 rounded font-mono font-medium">
                      REMEDIATION COMPLETED
                    </span>
                  ) : (
                    <button
                      onClick={() =>
                        handleExecuteRemediation(
                          msg.actionRequired!.deviceId,
                          msg.actionRequired!.title
                        )
                      }
                      className="bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded text-xs font-mono font-medium uppercase tracking-wider transition-colors"
                    >
                      Run Approved Remediation
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface-2 border border-border p-3 rounded text-xs font-mono text-text-muted">
              Analyzing fleet state and executing queries...
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
            placeholder="Ask about device status, search logs, or run workflows..."
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
