'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { AccountingPeriod } from '../../../types/accounting-period';

interface Notification {
  id: string;
  type: 'reminder' | 'overdue' | 'escalation';
  severity: 'info' | 'warning' | 'error';
  period: AccountingPeriod;
  message: string;
  daysInfo: number;
  read: boolean;
  timestamp: Date;
}

interface NotificationCenterProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function NotificationCenter({ isOpen = true, onClose }: NotificationCenterProps) {
  const router = useRouter();
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPeriods();
    loadReadNotifications();
  }, []);

  const fetchPeriods = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
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

  const saveReadNotifications = (notificationIds: Set<string>) => {
    try {
      localStorage.setItem('accounting_period_read_notifications', JSON.stringify(Array.from(notificationIds)));
    } catch (err) {
      console.error('Error saving read notifications:', err);
    }
  };

  // Generate notifications from periods
  const notifications = useMemo(() => {
    const today = new Date();
    const notifs: Notification[] = [];

    periods.forEach(period => {
      const endDate = new Date(period.end_date);
      const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Reminder notification (3 days before end date by default)
      if (daysUntilEnd > 0 && daysUntilEnd <= 3) {
        const notifId = `reminder-${period.name}`;
        notifs.push({
          id: notifId,
          type: 'reminder',
          severity: 'info',
          period,
          message: `Periode "${period.period_name}" akan berakhir dalam ${daysUntilEnd} hari`,
          daysInfo: daysUntilEnd,
          read: readNotifications.has(notifId),
          timestamp: new Date(endDate.getTime() - (daysUntilEnd * 24 * 60 * 60 * 1000))
        });
      }
      
      // Overdue notification (period has passed end date)
      if (daysUntilEnd < 0 && daysUntilEnd >= -7) {
        const notifId = `overdue-${period.name}`;
        notifs.push({
          id: notifId,
          type: 'overdue',
          severity: 'warning',
          period,
          message: `Periode "${period.period_name}" melewati tanggal akhir ${Math.abs(daysUntilEnd)} hari yang lalu`,
          daysInfo: Math.abs(daysUntilEnd),
          read: readNotifications.has(notifId),
          timestamp: endDate
        });
      }
      
      // Escalation notification (7+ days after end date)
      if (daysUntilEnd < -7) {
        const notifId = `escalation-${period.name}`;
        notifs.push({
          id: notifId,
          type: 'escalation',
          severity: 'error',
          period,
          message: `ESKALASI: Periode "${period.period_name}" belum ditutup ${Math.abs(daysUntilEnd)} hari setelah tanggal akhir`,
          daysInfo: Math.abs(daysUntilEnd),
          read: readNotifications.has(notifId),
          timestamp: endDate
        });
      }
    });

    // Sort by severity (error > warning > info) and then by timestamp (newest first)
    return notifs.sort((a, b) => {
      const severityOrder = { error: 0, warning: 1, info: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }, [periods, readNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (notificationId: string) => {
    const newReadNotifications = new Set(readNotifications);
    newReadNotifications.add(notificationId);
    setReadNotifications(newReadNotifications);
    saveReadNotifications(newReadNotifications);
  };

  const markAllAsRead = () => {
    const allIds = new Set(notifications.map(n => n.id));
    setReadNotifications(allIds);
    saveReadNotifications(allIds);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'reminder':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        );
      case 'overdue':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'escalation':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const badges = {
      info: 'bg-blue-100 text-blue-800 border-blue-200',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      error: 'bg-red-100 text-red-800 border-red-200'
    };
    return badges[severity as keyof typeof badges] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getSeverityText = (severity: string) => {
    const texts = {
      info: 'Pengingat',
      warning: 'Peringatan',
      error: 'Kritis'
    };
    return texts[severity as keyof typeof texts] || severity;
  };

  if (!isOpen) return null;

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Pusat Notifikasi</h2>
              <p className="text-xs text-gray-500">
                {unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : 'Semua notifikasi sudah dibaca'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-indigo-600 hover:text-indigo-900 font-medium"
              >
                Tandai Semua Dibaca
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-[600px] overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-sm text-gray-500">Memuat notifikasi...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada notifikasi</h3>
            <p className="mt-1 text-sm text-gray-500">Semua periode akuntansi dalam kondisi baik</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 transition-colors ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getSeverityBadge(notification.severity)}`}>
                        {getSeverityText(notification.severity)}
                      </span>
                      {!notification.read && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          Baru
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-900 font-medium">
                      {notification.message}
                    </p>
                    <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                      <span>Perusahaan: {notification.period.company}</span>
                      <span>•</span>
                      <span>
                        Berakhir: {new Date(notification.period.end_date).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center space-x-2">
                      <button
                        onClick={() => {
                          markAsRead(notification.id);
                          router.push(`/accounting-period/${encodeURIComponent(notification.period.name)}`);
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        Lihat Detail
                      </button>
                      {notification.severity !== 'info' && (
                        <button
                          onClick={() => {
                            markAsRead(notification.id);
                            router.push(`/accounting-period/close/${encodeURIComponent(notification.period.name)}`);
                          }}
                          className="text-xs text-indigo-600 hover:text-indigo-900 font-medium"
                        >
                          Tutup Periode
                        </button>
                      )}
                      {!notification.read && (
                        <>
                          <span className="text-gray-300">•</span>
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-xs text-gray-600 hover:text-gray-900"
                          >
                            Tandai Dibaca
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>Total: {notifications.length} notifikasi</span>
            <button
              onClick={() => router.push('/accounting-period')}
              className="text-indigo-600 hover:text-indigo-900 font-medium"
            >
              Lihat Semua Periode →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
