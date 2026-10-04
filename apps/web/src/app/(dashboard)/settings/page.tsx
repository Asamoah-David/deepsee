export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      
      <div className="flex border-b border-border">
        {['General', 'Security', 'Notifications', 'Features', 'Billing'].map((tab, i) => (
          <button 
            key={tab} 
            className={`px-4 py-2 text-sm font-medium border-b-2 ${i === 0 ? 'border-accent text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-lg max-w-3xl">
        <div className="p-6 space-y-8">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b border-border pb-2">Organization Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-text-secondary">Organization Name</label>
                <input type="text" defaultValue="Acme Corp" className="w-full bg-surface-2 border border-border rounded p-2 text-sm focus:border-accent focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-text-secondary">Organization ID</label>
                <input type="text" readOnly defaultValue="org_9f8e7d6c" className="w-full bg-surface-2/50 border border-border rounded p-2 text-sm font-mono text-text-muted" />
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b border-border pb-2">Data Retention</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">Audit Log Retention</div>
                  <div className="text-xs text-text-secondary">How long to keep administrative action logs</div>
                </div>
                <select className="bg-surface-2 border border-border rounded p-2 text-sm focus:border-accent focus:outline-none">
                  <option>30 Days</option>
                  <option>90 Days</option>
                  <option>1 Year</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="pt-4 flex justify-end">
            <button className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded text-sm font-medium transition-colors">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
