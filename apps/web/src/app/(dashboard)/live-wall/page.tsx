export default function LiveWallPage() {
  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Live Wall</h1>
        <div className="flex gap-2">
          <select className="bg-surface-2 border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-accent text-text-primary">
            <option>All Groups</option>
            <option>Engineering</option>
            <option>Sales</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-4 flex-1">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="bg-surface border border-border rounded-lg overflow-hidden flex flex-col group cursor-pointer hover:border-accent transition-colors">
            <div className="p-3 border-b border-border bg-surface-2 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className={`dot ${i % 3 === 0 ? 'dot-offline' : 'dot-online'}`} />
                <span className="font-mono text-sm font-medium">DESKTOP-{1000 + i}</span>
              </div>
              <span className="text-xs text-text-muted">Win 11</span>
            </div>
            <div className="flex-1 bg-black flex items-center justify-center min-h-[120px] relative">
              {i % 3 === 0 ? (
                <span className="text-text-muted text-sm font-mono">OFFLINE</span>
              ) : (
                <div className="text-center w-full h-full flex flex-col items-center justify-center bg-surface-3/30 border border-border/50 m-2 rounded">
                  {/* Mock placeholder for actual screen content */}
                  <span className="text-accent/50 text-xs uppercase tracking-widest mt-2 block">Live Stream Active</span>
                </div>
              )}
              <div className="absolute inset-0 bg-accent/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                <button className="bg-accent text-white px-3 py-1.5 rounded text-xs font-medium uppercase tracking-wider shadow-lg">View Full</button>
              </div>
            </div>
            <div className="p-2 border-t border-border bg-surface-2 flex justify-between text-[10px] text-text-secondary font-mono">
              <span>CPU: {Math.floor(Math.random() * 50) + 10}%</span>
              <span>RAM: {Math.floor(Math.random() * 40) + 30}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
