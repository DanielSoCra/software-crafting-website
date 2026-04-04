import type { AdminClient, AdminDeliverable, AdminForm } from '../../lib/types';

interface Props {
  clients: AdminClient[];
  deliverables: AdminDeliverable[];
  forms: AdminForm[];
}

export default function AdminDashboard({ clients, deliverables, forms }: Props) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
      <p className="text-gray-500 text-sm mb-8">{clients.length} Clients</p>
      <p className="text-gray-400 text-sm">Admin dashboard — implementation in progress</p>
    </div>
  );
}
