'use client';
import { useState } from 'react';

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<{role: string, content: string}[]>([
    { role: 'assistant', content: 'Hello. I am the DeepSee AI Operations Assistant. How can I help you manage your fleet today?' }
  ]);
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setInput('');
    
    // Mock response
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: 'I am analyzing the recent logs. It appears there is a high CPU usage spike on WIN-DEV-105. Would you like me to run a diagnostic?' }]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-88px)] bg-surface border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border bg-surface-2">
        <h2 className="font-semibold text-text-primary">AI Operations Assistant</h2>
        <p className="text-xs text-text-secondary">Powered by Groq</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-accent text-white' : 'bg-surface-2 border border-border text-text-primary'}`}>
              <div className="mb-1 text-xs opacity-70 font-mono">{msg.role === 'user' ? 'Admin' : 'DeepSee AI'}</div>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-4 border-t border-border bg-surface-2/50">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about device health, run commands, or analyze logs..." 
            className="flex-1 bg-surface border border-border rounded px-4 py-2 text-sm focus:outline-none focus:border-accent text-text-primary"
          />
          <button type="submit" className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded text-sm font-medium transition-colors">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
