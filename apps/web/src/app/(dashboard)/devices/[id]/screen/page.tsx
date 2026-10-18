'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ id: string }>;
}

type ConnectionState = 'authorizing' | 'connecting' | 'connected' | 'offline' | 'error';

export default function DeviceScreenPage({ params }: PageProps) {
  const { id: deviceId } = use(params);
  const [connected, setConnected] = useState(false);
  const [hasFrame, setHasFrame] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('authorizing');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;
    let socket: WebSocket | null = null;

    async function connect() {
      setConnectionState('authorizing');
      setConnectionError(null);
      setConnected(false);
      setHasFrame(false);
      try {
        const authResponse = await fetch(
          `/api/relay/session-token?deviceId=${encodeURIComponent(deviceId)}&mode=view_only`,
          { cache: 'no-store' },
        );
        const authData = await authResponse.json();
        if (!authResponse.ok) throw new Error(authData.error || 'Remote session authorization failed.');
        if (cancelled) return;

        const relayUrl = process.env.NEXT_PUBLIC_RELAY_URL;
        if (!relayUrl) throw new Error('The relay address is not configured.');
        const target = new URL(relayUrl);
        target.searchParams.set('deviceId', authData.relayDeviceId);
        target.searchParams.set('mode', 'view_only');
        setConnectionState('connecting');
        socket = new WebSocket(target.toString(), ['deepsee', `deepsee-auth.${authData.token}`]);
        wsRef.current = socket;

        socket.onopen = () => {
          setConnected(true);
          setConnectionState('connected');
          socket?.send(JSON.stringify({ type: 'screen.subscribe', deviceId: authData.relayDeviceId }));
        };
        socket.onmessage = async (event) => {
          if (!(event.data instanceof Blob)) return;
          const objectUrl = URL.createObjectURL(event.data);
          const image = new Image();
          image.onload = () => {
            const canvas = canvasRef.current;
            const context = canvas?.getContext('2d');
            if (canvas && context) {
              if (canvas.width !== image.naturalWidth || canvas.height !== image.naturalHeight) {
                canvas.width = image.naturalWidth;
                canvas.height = image.naturalHeight;
              }
              context.drawImage(image, 0, 0);
              setHasFrame(true);
            }
            URL.revokeObjectURL(objectUrl);
          };
          image.onerror = () => URL.revokeObjectURL(objectUrl);
          image.src = objectUrl;
        };
        socket.onerror = () => {
          setConnectionState('error');
          setConnected(false);
          setConnectionError('Could not connect to the remote session relay.');
        };
        socket.onclose = (event) => {
          setConnected(false);
          if (event.code === 1008) {
            setConnectionState('error');
            setConnectionError(event.reason || 'The relay denied this session.');
          } else {
            setConnectionState('offline');
          }
        };
      } catch (error) {
        if (cancelled) return;
        setConnectionState('error');
        setConnectionError(error instanceof Error ? error.message : 'Could not authorize remote session.');
      }
    }

    void connect();
    return () => {
      cancelled = true;
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'screen.unsubscribe' }));
      }
      socket?.close();
      if (wsRef.current === socket) wsRef.current = null;
    };
  }, [deviceId]);

  const takeScreenshot = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasFrame) return;
    const link = document.createElement('a');
    link.download = `DeepSee_${deviceId}_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const statusLabel: Record<ConnectionState, string> = {
    authorizing: 'Authorizing session',
    connecting: 'Connecting to device',
    connected: hasFrame ? 'Live screen connected' : 'Connected; waiting for screen frames',
    offline: 'Device or relay disconnected',
    error: connectionError || 'Session unavailable',
  };

  return (
    <div className={`flex flex-col h-[calc(100vh-88px)] ${fullscreen ? 'fixed inset-0 z-50 bg-black' : 'bg-surface border border-border rounded-lg'} overflow-hidden`}>
      <div className="min-h-12 bg-surface-2 border-b border-border flex flex-wrap items-center justify-between gap-3 px-4 py-2 text-sm shrink-0">
        <div className="flex flex-wrap items-center gap-4">
          <Link href={`/devices/${deviceId}`} className="text-text-secondary hover:text-text-primary text-xs font-mono uppercase">
            Back to Device Profile
          </Link>
          <div className="flex items-center gap-2 border-l border-border pl-4">
            <span className={`dot ${connected ? 'dot-online' : connectionState === 'error' ? 'dot-critical' : 'dot-offline'}`} />
            <span className="font-mono text-text-primary text-xs">{statusLabel[connectionState]}</span>
          </div>
          <span className="border-l border-border pl-4 text-xs font-mono text-text-muted">View only</span>
        </div>
        <div className="flex items-center gap-2">
          <button disabled={!hasFrame} onClick={takeScreenshot} className="bg-surface-3 hover:bg-border disabled:opacity-40 text-text-primary px-2.5 py-1 rounded text-xs uppercase tracking-wider font-medium">
            Save screenshot
          </button>
          <button onClick={() => setFullscreen(!fullscreen)} className="bg-surface-3 hover:bg-border text-text-primary px-2.5 py-1 rounded text-xs uppercase tracking-wider font-medium">
            {fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          </button>
        </div>
      </div>

      <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="max-w-full max-h-full object-contain"
        />
        {!hasFrame && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
            <div className="max-w-lg space-y-2">
              <p className="text-sm text-white">{statusLabel[connectionState]}</p>
              <p className="text-xs text-slate-400">
                If this device remains online without a screen, check its screen capture permission and connection.
              </p>
            </div>
          </div>
        )}
        {hasFrame && (
          <div className="absolute top-4 right-4 bg-black/80 border border-border text-text-secondary px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider">
            View only
          </div>
        )}
      </div>
    </div>
  );
}
