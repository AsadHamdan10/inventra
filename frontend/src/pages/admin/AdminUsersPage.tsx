import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, PauseCircle, KeyRound, Users, Clock, UserCheck, Ban, Mail, Phone, CalendarDays } from 'lucide-react';
import { adminApi } from '../../services/apiServices';
import { PageHeader, Modal, Field, Spinner, EmptyState, StatusBadge, StatCard, inr } from '../../components/ui';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../services/api';

type Filter = 'all' | 'pending' | 'approved' | 'rejected' | 'suspended';

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('pending');
  const [resetModal, setResetModal] = useState<{open:boolean;id:number|null;name:string}>({open:false,id:null,name:''});
  const [newPassword, setNewPassword] = useState('');
  const [search, setSearch] = useState('');

  const { data: stats } = useQuery({ queryKey: ['admin-dashboard'], queryFn: adminApi.dashboard });
  const { data: users = [], isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: adminApi.users });

  const action = useMutation({
    mutationFn: ({ type, id }: { type: string; id: number }) =>
      type === 'approve' ? adminApi.approveUser(id) : type === 'reject' ? adminApi.rejectUser(id) : adminApi.suspendUser(id),
    onSuccess: (_, v) => { qc.invalidateQueries({queryKey:['admin-users']}); qc.invalidateQueries({queryKey:['admin-dashboard']}); toast.success(`User ${v.type}d successfully.`); },
    onError: (e: any) => toast.error(e.response?.data?.error||'Action failed.'),
  });

  const resetPassword = async () => {
    if (!newPassword || newPassword.length < 8) { toast.error('Min 8 characters.'); return; }
    if (!resetModal.id) return;
    try {
      await api.post(`/admin/users/${resetModal.id}/reset-password`, { password: newPassword });
      setResetModal({open:false,id:null,name:''}); setNewPassword('');
      toast.success('Password reset. User must change on next login.');
    } catch (e: any) { toast.error(e.response?.data?.error||'Failed.'); }
  };

  const filtered = users.filter((u: any) => {
    const mf = filter === 'all' || u.status === filter;
    const ms = !search || [u.companyName,u.username,u.email].some(f=>f?.toLowerCase().includes(search.toLowerCase()));
    return mf && ms;
  });

  const fc: Record<string,number> = {
    all: users.length,
    pending: users.filter((u:any)=>u.status==='pending').length,
    approved: users.filter((u:any)=>u.status==='approved').length,
    rejected: users.filter((u:any)=>u.status==='rejected').length,
    suspended: users.filter((u:any)=>u.status==='suspended').length,
  };

  return (
    <div className="space-y-5">
      <PageHeader title="User Management" subtitle="Manage tenant registrations and approvals" />
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Users" value={stats.totalUsers} icon={Users} color="blue" />
          <StatCard label="Pending" value={stats.pending} icon={Clock} color="amber" />
          <StatCard label="Approved" value={stats.approved} icon={UserCheck} color="green" />
          <StatCard label="Suspended" value={stats.suspended} icon={Ban} color="red" />
        </div>
      )}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">

        <div className="flex overflow-x-auto scrollbar-hide gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(['all','pending','approved','rejected','suspended'] as Filter[]).map(f=>(
            <button
              key={f}
              onClick={()=>setFilter(f)}
              className={`flex-shrink-0 px-3 py-2 rounded-md text-xs font-semibold capitalize transition-colors ${
                filter===f
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              {f}

              {fc[f]>0 && (
                <span className="ml-1 text-[10px] bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 px-1.5 rounded-full">
                  {fc[f]}
                </span>
              )}
            </button>
          ))}
        </div>

        <input
          className="input w-full lg:w-64 text-sm"
          placeholder="Search company, username, email..."
          value={search}
          onChange={e=>setSearch(e.target.value)}
        />

      </div>
      {fc.pending>0&&filter!=='pending' && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2.5 flex items-center gap-3 text-sm">
          <Clock size={15} className="text-amber-600 flex-shrink-0"/>
          <span className="text-amber-800 dark:text-amber-300"><strong>{fc.pending}</strong> registration{fc.pending>1?'s':''} waiting for approval.</span>
          <button onClick={()=>setFilter('pending')} className="text-amber-600 underline text-xs font-bold ml-1">Review →</button>
        </div>
      )}
      <div className="table-container">

        {/* Desktop Table */}
        <div className="hidden lg:block">
          {isLoading?<Spinner/>:filtered.length===0?<EmptyState message={filter==='pending'?'No pending registrations.':`No ${filter} users.`}/>:(
            <table className="table">
              <thead><tr><th>Company</th><th>Username</th><th>Email</th><th>Mobile</th><th>Status</th><th>Registered</th><th className="text-center">Actions</th></tr></thead>
              <tbody>
                {filtered.map((u:any)=>(
                  <tr key={u.id}>
                    <td className="font-semibold">{u.companyName}</td>
                    <td className="font-mono text-xs text-gray-500">@{u.username}</td>
                    <td className="text-sm">{u.email}</td>
                    <td className="text-sm tabular-nums">{u.mobile ? (u.mobile.length > 10 ? `${u.mobile.slice(0,10)}…` : u.mobile) : '—'}</td>
                    <td><StatusBadge status={u.status}/></td>
                    <td className="text-xs text-gray-500">{format(new Date(u.createdAt),'dd MMM yyyy')}</td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        {(u.status==='pending'||u.status==='rejected'||u.status==='suspended') && (
                          <button onClick={()=>action.mutate({type:'approve',id:u.id})} disabled={action.isPending} title="Approve" className="p-1.5 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"><CheckCircle size={15}/></button>
                        )}
                        {u.status==='pending' && (
                          <button onClick={()=>action.mutate({type:'reject',id:u.id})} disabled={action.isPending} title="Reject" className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"><XCircle size={15}/></button>
                        )}
                        {u.status==='approved' && (
                          <button onClick={()=>action.mutate({type:'suspend',id:u.id})} disabled={action.isPending} title="Suspend" className="p-1.5 rounded text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30"><PauseCircle size={15}/></button>
                        )}
                        <button onClick={()=>setResetModal({open:true,id:u.id,name:u.companyName})} title="Reset Password" className="p-1.5 rounded text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30"><KeyRound size={15}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-3 p-3">
          {isLoading ? (
            <Spinner/>
          ) : filtered.length===0 ? (
            <EmptyState message={filter==='pending'?'No pending registrations.':`No ${filter} users.`}/>
          ) : (
            filtered.map((u:any)=>{
              const initial = (u.companyName||'?').trim().charAt(0).toUpperCase();
              const mobileDisplay = u.mobile
                ? (u.mobile.length > 10 ? `${u.mobile.slice(0,10)}…` : u.mobile)
                : null;
              return (
                <div
                  key={u.id}
                  className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden"
                >
                  {/* Header */}
                  <div className="flex items-start gap-3 p-4 pb-3">
                    <div className="flex-shrink-0 w-11 h-11 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center font-semibold text-base">
                      {initial}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white leading-tight truncate">
                        {u.companyName}
                      </h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                        @{u.username}
                      </p>
                    </div>

                    <div className="flex-shrink-0">
                      <StatusBadge status={u.status}/>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="px-4 pb-4 space-y-2">
                    <div className="flex items-center gap-2.5 text-sm rounded-lg bg-gray-50 dark:bg-gray-800/60 px-3 py-2">
                      <Mail size={14} className="text-gray-400 flex-shrink-0"/>
                      <span className="text-gray-700 dark:text-gray-300 truncate" title={u.email}>{u.email}</span>
                    </div>

                    <div className="flex items-center gap-2.5 text-sm rounded-lg bg-gray-50 dark:bg-gray-800/60 px-3 py-2">
                      <Phone size={14} className="text-gray-400 flex-shrink-0"/>
                      <span className="text-gray-700 dark:text-gray-300 tabular-nums truncate" title={u.mobile||''}>
                        {mobileDisplay || <span className="text-gray-400">—</span>}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 text-sm rounded-lg bg-gray-50 dark:bg-gray-800/60 px-3 py-2">
                      <CalendarDays size={14} className="text-gray-400 flex-shrink-0"/>
                      <span className="text-gray-700 dark:text-gray-300">
                        {format(new Date(u.createdAt),'dd MMM yyyy')}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30">

                    {(u.status==='pending'||u.status==='rejected'||u.status==='suspended') && (
                      <button
                        onClick={()=>action.mutate({type:'approve',id:u.id})}
                        disabled={action.isPending}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle size={14}/> Approve
                      </button>
                    )}

                    {u.status==='pending' && (
                      <button
                        onClick={()=>action.mutate({type:'reject',id:u.id})}
                        disabled={action.isPending}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                      >
                        <XCircle size={14}/> Reject
                      </button>
                    )}

                    {u.status==='approved' && (
                      <button
                        onClick={()=>action.mutate({type:'suspend',id:u.id})}
                        disabled={action.isPending}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50 transition-colors disabled:opacity-50"
                      >
                        <PauseCircle size={14}/> Suspend
                      </button>
                    )}

                    <button
                      onClick={()=>setResetModal({open:true,id:u.id,name:u.companyName})}
                      title="Reset Password"
                      className="flex-shrink-0 p-2.5 rounded-lg text-brand-600 bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-400 dark:hover:bg-brand-900/50 transition-colors"
                    >
                      <KeyRound size={15}/>
                    </button>

                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
      <Modal open={resetModal.open} onClose={()=>{setResetModal({open:false,id:null,name:''});setNewPassword('');}} title="Reset Password" size="sm">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Set temporary password for <strong>{resetModal.name}</strong>. They must change it on next login.</p>
        <Field label="New Password" required><input className="input" type="password" placeholder="Min 8 characters" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></Field>
        <div className="flex gap-2 justify-end mt-4">
          <button className="btn-secondary btn-sm" onClick={()=>{setResetModal({open:false,id:null,name:''});setNewPassword('');}}>Cancel</button>
          <button className="btn-primary btn-sm" onClick={resetPassword}>Reset Password</button>
        </div>
      </Modal>
    </div>
  );
}