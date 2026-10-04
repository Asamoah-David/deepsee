export default async function DeviceProfilePage({ params }: { params: Promise<{ id: string }> }) {
  // Phase 2 will call notFound() when the device id does not resolve to a device
  // in the caller's organisation. Until the data layer exists, the id is
  // deliberately unused rather than silently discarded into a fake device.
  const { id: deviceId } = await params;
  void deviceId;
  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight font-mono">PC-017</h1>
            <span className="dot dot-online" />
          </div>
          <div className="text-sm text-text-secondary">Windows 11 Pro (23H2) • Last seen: Just now</div>
        </div>
        
        <div className="flex gap-2">
          <button className="bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded text-sm font-medium transition-colors">View Screen</button>
          <button className="bg-surface-3 hover:bg-border text-text-primary px-3 py-1.5 rounded text-sm font-medium transition-colors">Terminal</button>
          <button className="bg-surface-3 hover:bg-border text-text-primary px-3 py-1.5 rounded text-sm font-medium transition-colors">Files</button>
          <button className="bg-surface-3 hover:bg-border text-text-primary px-3 py-1.5 rounded text-sm font-medium transition-colors">Restart</button>
        </div>
      </div>

      <div className="flex border-b border-border">
        {['Overview', 'Performance', 'Applications', 'Processes', 'Services', 'Activity', 'Alerts'].map((tab, i) => (
          <button 
            key={tab} 
            className={`px-4 py-2 text-sm font-medium border-b-2 ${i === 0 ? 'border-accent text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 flex-1">
        <div className="col-span-2 space-y-6">
          <div className="bg-surface border border-border rounded-lg p-4">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-text-secondary mb-4">Hardware Info</h2>
            <div className="grid grid-cols-2 gap-y-4 text-sm">
              <div><span className="text-text-muted block">CPU</span><span className="font-mono">Intel Core i7-12700H @ 2.30GHz</span></div>
              <div><span className="text-text-muted block">RAM</span><span className="font-mono">32 GB (DDR5)</span></div>
              <div><span className="text-text-muted block">Disk 0</span><span className="font-mono">1 TB NVMe SSD</span></div>
              <div><span className="text-text-muted block">Network</span><span className="font-mono">192.168.1.45 (Ethernet)</span></div>
            </div>
          </div>
          
          <div className="bg-surface border border-border rounded-lg p-4">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-text-secondary mb-4">Current Usage</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1 font-mono"><span>CPU</span><span>24%</span></div>
                <div className="h-2 bg-surface-3 rounded overflow-hidden"><div className="h-full bg-accent w-[24%]" /></div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1 font-mono"><span>RAM</span><span>68%</span></div>
                <div className="h-2 bg-surface-3 rounded overflow-hidden"><div className="h-full bg-status-warning w-[68%]" /></div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1 font-mono"><span>Disk</span><span>45%</span></div>
                <div className="h-2 bg-surface-3 rounded overflow-hidden"><div className="h-full bg-accent w-[45%]" /></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-span-1 space-y-6">
          <div className="bg-surface border border-border rounded-lg flex flex-col h-full">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold text-sm uppercase tracking-wider text-text-secondary">Recent Activity</h2>
            </div>
            <div className="flex-1 p-4 space-y-4 overflow-auto">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <div className="mt-1 w-2 h-2 rounded-full bg-surface-3 shrink-0" />
                  <div>
                    <div className="text-text-primary">System verified healthy</div>
                    <div className="text-xs text-text-muted font-mono">{i * 15} minutes ago</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
