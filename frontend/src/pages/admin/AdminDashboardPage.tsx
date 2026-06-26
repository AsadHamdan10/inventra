import { useQuery } from '@tanstack/react-query';
import { Users, Clock, UserCheck, Ban, Activity } from 'lucide-react';
import { adminApi } from '../../services/apiServices';
import { PageHeader, StatCard, Spinner } from '../../components/ui';
import { format } from 'date-fns';

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-dashboard'], queryFn: adminApi.dashboard });
  if (isLoading) return <Spinner/>;
  if (!data) return null;

  return (
    <div className="space-y-5">
      <PageHeader title="Super Admin Dashboard" subtitle="Platform-wide overview"/>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Tenants" value={data.totalUsers} icon={Users} color="blue"/>
        <StatCard label="Pending Approval" value={data.pending} icon={Clock} color="amber"/>
        <StatCard label="Active Tenants" value={data.approved} icon={UserCheck} color="green"/>
        <StatCard label="Suspended" value={data.suspended} icon={Ban} color="red"/>
      </div>
      {data.pending > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-5 py-4">
          <p className="text-amber-800 dark:text-amber-300 font-semibold text-sm">
            ⏳ {data.pending} tenant{data.pending>1?'s':''} waiting for approval — <a href="/admin/users" className="underline">Go to User Management →</a>
          </p>
        </div>
      )}
      <div className="card">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2 font-semibold text-sm">
          <Activity size={15}/> Recent Activity
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {(data.recentLogs||[]).map((log:any)=>(
            <div key={log.id} className="px-4 py-2.5 flex items-start gap-3">
              <div className="w-2 h-2 mt-1.5 rounded-full bg-brand-500 flex-shrink-0"/>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  <span className="font-medium">{log.user?.companyName||'System'}</span>
                  {" — "}{log.action}
                  {log.details && <span className="text-gray-500 ml-1 text-xs">{log.details}</span>}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{format(new Date(log.createdAt),'dd MMM yyyy, HH:mm')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
