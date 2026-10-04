export default function UsersPage() {
  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Users & Roles</h1>
        <button className="bg-accent text-white px-4 py-2 rounded text-sm font-medium">Invite User</button>
      </div>
      
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-surface-2 text-text-muted text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-medium">User</th>
              <th className="px-6 py-4 font-medium">Role</th>
              <th className="px-6 py-4 font-medium">Department</th>
              <th className="px-6 py-4 font-medium">Joined</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[
              { email: 'admin@acme.com', role: 'Owner', dept: 'IT Ops' },
              { email: 'sarah.j@acme.com', role: 'Admin', dept: 'IT Support' },
              { email: 'dev.ops@acme.com', role: 'Viewer', dept: 'Engineering' }
            ].map((u, i) => (
              <tr key={i} className="hover:bg-surface-2/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-text-primary">{u.email}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs uppercase font-medium tracking-wider ${u.role === 'Owner' ? 'bg-accent/20 text-accent' : 'bg-surface-3 text-text-secondary'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-text-secondary">{u.dept}</td>
                <td className="px-6 py-4 text-text-muted font-mono">Oct 12, 2023</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-text-primary hover:text-white text-xs uppercase tracking-wider font-medium mr-4">Edit</button>
                  <button className="text-status-critical hover:underline text-xs uppercase tracking-wider font-medium">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
