'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { AccountingPeriod } from '../../../types/accounting-period';

export default function NotificationBadge() {
  const router = useRouter();
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetchPeriods();
    loadReadNotifications();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchPeriods, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchPeriods = async () => {
    try {
      const response = await fetch('/api/accounting-period/periods?status=Open', { 
        credentials: 'include' 
      });
      const data = await response.json();

      if (data.success) {
        setPeriods(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching periods:', err);
    }
  };

  const loadReadNotifications = () => {
    try {
      const stored = localStorage.getItem('accounting_period_read_notifications');
      if (stored) {
        setReadNotifications(new Set(JSON.parse(stored)));
      }
    } catch (err) {
      console.error('Error loading read notifications:', err);
    }
  };

  // Count unread notifications
  const unreadCount = useMemo(() => {
    const today = new Date();
    let count = 0;

    periods.forEach(period => {
      const endDate = new Date(period.end_date);
      const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Reminder (3 days before)
      if (daysUntilEnd > 0 && daysUntilEnd <= 3) {
        const notifId = `reminder-${period.name}`;
        if (!readNotifications.has(notifId)) count++;
      }
      
      // Overdue (up to 7 days after)
      if (daysUntilEnd < 0 && daysUntilEnd >= -7) {
        const notifId = `overdue-${period.name}`;
        if (!readNotifications.has(notifId)) count++;
      }
      
      // Escalation (7+ days after)
      if (daysUntilEnd < -7) {
        const notifId = `escalation-${period.name}`;
        if (!readNotifications.has(notifId)) count++;
      }
    });

    return count;
  }, [periods, readNotifications]);

  // Get critical notifications (escalations and overdue)
  const criticalNotifications = useMemo(() => {
    const today = new Date();
    const notifs: Array<{ period: AccountingPeriod; type: string; daysInfo: number }> = [];

    periods.forEach(period => {
      const endDate = new Date(period.end_date);
      const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilEnd < -7) {
        notifs.push({ period, type: 'escalation', daysInfo: Math.abs(daysUntilEnd) });
      } else if (daysUntilEnd < 0) {
        notifs.push({ period, type: 'overdue', daysInfo: Math.abs(daysUntilEnd) });
      }
    });

    return notifs.slice(0, 3); // Show max 3 in dropdown
  }, [periods]);

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-900">Notifikasi Periode</h3>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {unreadCount} baru
                  </span>
                )}
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {criticalNotifications.length === 0 ? (
                <div className="p-6 text-center">
                  <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">Tidak ada notifikasi kritis</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {criticalNotifications.map((notif) => (
                    <div
                      key={notif.period.name}
                      className="p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setShowDropdown(false);
                        router.push(`/accounting-period/${encodeURIComponent(notif.period.name)}`);
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {notif.type === 'escalation' ? (
                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {notif.period.period_name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {notif.type === 'escalation' 
                              ? `Eskalasi: ${notif.daysInfo} hari overdue`
                              : `Overdue ${notif.daysInfo} hari`
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowDropdown(false);
                  router.push('/accounting-period/notifications');
                }}
                className="w-full text-center text-sm text-indigo-600 hover:text-indigo-900 font-medium"
              >
                Lihat Semua Notifikasi
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
