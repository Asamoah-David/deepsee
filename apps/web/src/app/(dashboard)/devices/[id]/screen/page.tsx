'use client';

import { use } from 'react';

export default function DeviceScreenPage({ params }: { params: Promise<{ id: string }> }) {
  // Phase 5 binds this to the relay. The id is retained now because the route
  // contract is fixed by the device directory links.
  const { id: deviceId } = use(params);
  void deviceId;

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] -mx-6 -my-6 bg-black">
      <div className="h-12 bg-surface border-b border-border flex items-center justify-between px-4 text-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="dot dot-offline" />
            <span className="font-mono font-medium text-text-primary">Not connected</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-text-secondary font-mono text-xs">
          <span>No session</span>
          <button
            type="button"
            disabled
            className="uppercase tracking-wider font-medium opacity-50 cursor-not-allowed"
          >
            Control unavailable
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-surface-2/20">
        <div className="text-center max-w-sm px-6">
          <p className="text-text-primary text-sm font-medium mb-2">Screen streaming is not yet available</p>
          <p className="text-text-secondary text-xs leading-relaxed">
            The remote screen engine is delivered in Phase 5. This view intentionally reports no
            connection rather than displaying a simulated stream.
          </p>
        </div>
      </div>
    </div>
  );
}
