'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { Wrench, ChevronRight, Clock, CheckCircle2, AlertCircle, Laptop } from 'lucide-react';

export default function CustomerServiceJobsListPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadJobs() {
      setIsLoading(true);
      try {
        const res = await api.getUserServiceJobs();
        setJobs(res || []);
      } catch (err: any) {
        setError(err?.message || 'Failed to load service bookings');
      } finally {
        setIsLoading(false);
      }
    }
    loadJobs();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Service Bookings</h1>
          <p className="text-xs text-slate-500">Track and manage your laptop maintenance and general service appointments.</p>
        </div>
        <Link href="/account/laptops" className="btn-secondary text-xs">
          View My Laptops
        </Link>
      </div>

      {isLoading ? (
        <div className="card p-12 text-center text-xs text-slate-500 space-y-2">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p>Loading your service bookings...</p>
        </div>
      ) : error ? (
        <div className="card p-6 text-center space-y-2 text-rose-600 text-xs">
          <p>{error}</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <Wrench className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Service Bookings Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You have not booked any general service appointments. Check your eligible laptops to schedule your free doorstep service.
          </p>
          <Link href="/account/laptops" className="btn-primary text-xs inline-block">
            Go to My Laptops
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/account/service-jobs/${job.id}`}
              className="card p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-center justify-between gap-4 block"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Wrench className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                      {job.jobNumber}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        job.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : job.status === 'CANCELLED'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {job.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {job.soldUnit?.product?.name || job.soldUnit?.modelSnapshot || 'Laptop'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Scheduled for {formatDate(job.scheduledPickupAt)}
                  </p>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

