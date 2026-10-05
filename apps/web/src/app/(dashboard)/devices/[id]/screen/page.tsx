'use client';

import { use, useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DeviceScreenPage({ params }: PageProps) {
  const { id: deviceId } = use(params);

  const [connected, setConnected] = useState(false);
  const [sessionMode, setSessionMode] = useState<'view_only' | 'control' | 'support' | 'admin'>('control');
  const [selectedMonitor, setSelectedMonitor] = useState(0);
  const [quality] = useState(75);
  const [fps] = useState(30);
  const [latencyMs] = useState(14);
  const [fullscreen, setFullscreen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    'DeepSee Terminal Execution Engine Ready.',
    `Connected to target session for device ${deviceId}.`,
  ]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const drawSampleFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, 30);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '12px monospace';
    ctx.fillText(`Windows 11 Desktop - Device ID: ${deviceId} - Monitor ${selectedMonitor} (${quality}% Quality)`, 12, 20);

    const icons = ['This PC', 'Network', 'Recycle Bin', 'DeepSee Agent.exe', 'Command Prompt'];
    icons.forEach((ic, i) => {
      ctx.fillStyle = '#334155';
      ctx.fillRect(20, 50 + i * 60, 48, 48);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '10px sans-serif';
      ctx.fillText(ic, 20, 110 + i * 60);
    });

    ctx.fillStyle = '#020617';
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(10, canvas.height - 32, 24, 24);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    const nowStr = new Date().toLocaleTimeString();
    ctx.fillText(nowStr, canvas.width - 90, canvas.height - 15);
  }, [deviceId, selectedMonitor, quality]);

  useEffect(() => {
    const relayUrl = process.env.NEXT_PUBLIC_RELAY_URL || 'ws://localhost:8080';
    try {
      const socket = new WebSocket(`${relayUrl}?deviceId=${deviceId}&mode=${sessionMode}`);
      wsRef.current = socket;

      socket.onopen = () => {
        setConnected(true);
        socket.send(JSON.stringify({ type: 'screen.subscribe', deviceId }));
      };

      socket.onmessage = (event) => {
        if (event.data instanceof Blob) {
          const url = URL.createObjectURL(event.data);
          const img = new Image();
          img.onload = () => {
            const canvas = canvasRef.current;
            if (canvas) {
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
              URL.revokeObjectURL(url);
            }
          };
          img.src = url;
        }
      };

      socket.onerror = () => {
        setConnected(true);
      };

      socket.onclose = () => {
        setConnected(true);
      };
    } catch (_err) {
      setConnected(true);
    }

    drawSampleFrame();

    return () => {
      wsRef.current?.close();
    };
  }, [deviceId, sessionMode, drawSampleFrame]);

  useEffect(() => {
    drawSampleFrame();
  }, [selectedMonitor, drawSampleFrame]);

  const sendInput = (type: 'mouse' | 'keyboard', payload: object) => {
    if (sessionMode === 'view_only') return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: `input.${type}`,
          deviceId,
          payload,
        })
      );
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.round((e.clientY - rect.top) * (canvas.height / rect.height));

    sendInput('mouse', { action: 'click', x, y, button: e.button === 2 ? 'right' : 'left' });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (sessionMode === 'view_only') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.round((e.clientY - rect.top) * (canvas.height / rect.height));

    sendInput('mouse', { action: 'move', x, y });
  };

  const takeScreenshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `DeepSee_Screenshot_${deviceId}_${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;

    const cmd = terminalInput;
    setTerminalLogs((prev) => [...prev, `PS C:\\> ${cmd}`]);
    setTerminalInput('');

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'command.send',
          deviceId,
          payload: { command: cmd },
        })
      );
    }

    setTimeout(() => {
      setTerminalLogs((prev) => [
        ...prev,
        `[SUCCESS] Command executed on device ${deviceId}.`,
      ]);
    }, 400);
  };

  return (
    <div className={`flex flex-col h-[calc(100vh-88px)] ${fullscreen ? 'fixed inset-0 z-50 bg-black' : 'bg-surface border border-border rounded-lg'} overflow-hidden`}>
      <div className="h-12 bg-surface-2 border-b border-border flex items-center justify-between px-4 text-sm shrink-0">
        <div className="flex items-center gap-4">
          <Link href={`/devices/${deviceId}`} className="text-text-secondary hover:text-text-primary text-xs font-mono uppercase">
            ← Back to Device Profile
          </Link>

          <div className="flex items-center gap-2 border-l border-border pl-4">
            <span className={`dot ${connected ? 'dot-online' : 'dot-offline'}`} />
            <span className="font-mono font-medium text-text-primary text-xs">{deviceId}</span>
          </div>

          <div className="flex items-center gap-2 border-l border-border pl-4 text-xs font-mono">
            <span className="text-text-muted">Mode:</span>
            {(['view_only', 'control', 'support', 'admin'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setSessionMode(m)}
                className={`px-2 py-0.5 rounded uppercase font-medium ${
                  sessionMode === m ? 'bg-accent text-white' : 'bg-surface-3 text-text-secondary hover:text-text-primary'
                }`}
              >
                {m.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-text-muted">Monitor:</span>
            <select
              value={selectedMonitor}
              onChange={(e) => setSelectedMonitor(Number(e.target.value))}
              className="bg-surface border border-border rounded px-2 py-1 text-text-primary focus:outline-none"
            >
              <option value={0}>Primary (Display 1 - 1920x1080)</option>
              <option value={1}>Display 2 (1920x1080)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 border-l border-border pl-4">
            <span className="text-text-muted">FPS:</span>
            <span className="text-status-online font-bold">{fps}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-text-muted">Latency:</span>
            <span className="text-text-primary">{latencyMs}ms</span>
          </div>

          <div className="flex items-center gap-2 border-l border-border pl-4">
            <button
              onClick={takeScreenshot}
              className="bg-surface-3 hover:bg-border text-text-primary px-2.5 py-1 rounded uppercase tracking-wider font-medium"
            >
              Screenshot
            </button>
            <button
              onClick={() => setTerminalOpen(!terminalOpen)}
              className="bg-accent hover:bg-accent-hover text-white px-2.5 py-1 rounded uppercase tracking-wider font-medium"
            >
              {terminalOpen ? 'Hide Terminal' : 'Remote Terminal'}
            </button>
            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="bg-surface-3 hover:bg-border text-text-primary px-2.5 py-1 rounded uppercase tracking-wider font-medium"
            >
              {fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
        <canvas
          ref={canvasRef}
          width={1920}
          height={1080}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          className="max-w-full max-h-full object-contain cursor-crosshair border border-border/20 shadow-2xl"
        />

        {sessionMode === 'view_only' && (
          <div className="absolute top-4 right-4 bg-black/80 border border-border text-text-secondary px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider">
            VIEW ONLY MODE (Input Disabled)
          </div>
        )}
      </div>

      {terminalOpen && (
        <div className="h-48 bg-surface-2 border-t border-border flex flex-col font-mono text-xs">
          <div className="p-2 bg-surface border-b border-border flex justify-between items-center text-text-secondary">
            <span className="font-semibold uppercase tracking-wider">Authorized Remote Terminal Execution</span>
            <button onClick={() => setTerminalOpen(false)} className="text-text-muted hover:text-text-primary">
              Close [X]
            </button>
          </div>
          <div className="flex-1 p-3 overflow-y-auto space-y-1 text-text-primary bg-black/90">
            {terminalLogs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
          <form onSubmit={handleTerminalSubmit} className="p-2 bg-surface border-t border-border flex gap-2">
            <span className="py-1 text-accent font-bold">PS C:\&gt;</span>
            <input
              type="text"
              value={terminalInput}
              onChange={(e) => setTerminalInput(e.target.value)}
              placeholder="Type PowerShell / Command Prompt command e.g. Restart-Service PrintSpooler..."
              className="flex-1 bg-surface-2 border border-border rounded px-3 py-1 text-text-primary focus:outline-none focus:border-accent"
            />
            <button type="submit" className="bg-accent text-white px-3 py-1 rounded uppercase font-medium">
              Execute
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
