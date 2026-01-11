/**
 * Waiter Panel Client Component
 *
 * Garson paneli client-side component. Gercek zamanli servis istekleri
 * ve masa durum tablosu yonetimi icin kullanilir.
 *
 * Ozellikler:
 * - Supabase Realtime ile gercek zamanli servis istekleri
 * - Masa durum grid'i
 * - Istekleri tamamlandi/iptal olarak isaretleme
 * - Sesli bildirim (opsiyonel)
 * - Otomatik yenileme
 *
 * KRITIK: module_waiter_call ozelligi kontrol edilir!
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Modal, ConfirmModal, Button, Badge } from '@/components/ui';
import UpgradePrompt from '@/components/ui/UpgradePrompt';
import type { RestaurantTable, TableStatus, ServiceRequestType, ServiceRequestStatus } from '@/types/database';

// =============================================================================
// TYPES
// =============================================================================

interface ServiceRequestData {
  id: string;
  table_id: string;
  table_number: string;
  table_name: string | null;
  section: string | null;
  request_type: ServiceRequestType;
  notes: string | null;
  created_at: string;
  waiting_seconds: number;
}

interface TableStats {
  total_tables: number;
  available_tables: number;
  occupied_tables: number;
  reserved_tables: number;
  needs_service_tables: number;
  pending_requests: number;
}

interface WaiterClientProps {
  initialRequests: ServiceRequestData[];
  initialTables: RestaurantTable[];
  initialStats: TableStats;
  organizationId: string;
  organizationSlug: string;
  hasWaiterCallFeature: boolean;
  userId: string;
  userRole: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const TABLE_STATUS_OPTIONS: { value: TableStatus; label: string; color: string; bgColor: string }[] = [
  { value: 'available', label: 'Bos', color: 'text-green-800', bgColor: 'bg-green-100' },
  { value: 'occupied', label: 'Dolu', color: 'text-blue-800', bgColor: 'bg-blue-100' },
  { value: 'reserved', label: 'Rezerve', color: 'text-purple-800', bgColor: 'bg-purple-100' },
  { value: 'needs_service', label: 'Servis Bekliyor', color: 'text-orange-800', bgColor: 'bg-orange-100' },
];

const REQUEST_TYPE_LABELS: Record<ServiceRequestType, { label: string; icon: string; color: string }> = {
  waiter_call: { label: 'Garson Cagirma', icon: '🔔', color: 'bg-primary-100 text-primary-800' },
  bill_request: { label: 'Hesap Istegi', icon: '💳', color: 'bg-amber-100 text-amber-800' },
  other: { label: 'Diger', icon: '📝', color: 'bg-gray-100 text-gray-800' },
};

// =============================================================================
// ICONS
// =============================================================================

const Icons = {
  Bell: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  Check: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  X: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Table: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  Refresh: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Volume: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  ),
  VolumeOff: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
    </svg>
  ),
  Warning: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Users: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format seconds to human-readable string
 */
function formatWaitingTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} sn`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} dk`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours} sa ${minutes} dk` : `${hours} sa`;
  }
}

/**
 * Get urgency level based on waiting time
 */
function getUrgencyLevel(seconds: number): 'low' | 'medium' | 'high' | 'critical' {
  if (seconds < 60) return 'low';      // < 1 min
  if (seconds < 180) return 'medium';  // 1-3 min
  if (seconds < 300) return 'high';    // 3-5 min
  return 'critical';                    // > 5 min
}

/**
 * Get urgency color classes
 */
function getUrgencyColor(level: 'low' | 'medium' | 'high' | 'critical'): string {
  switch (level) {
    case 'low': return 'border-green-200 bg-green-50';
    case 'medium': return 'border-yellow-200 bg-yellow-50';
    case 'high': return 'border-orange-200 bg-orange-50';
    case 'critical': return 'border-red-200 bg-red-50 animate-pulse';
  }
}

/**
 * Get status badge color
 */
function getStatusColor(status: TableStatus): string {
  const option = TABLE_STATUS_OPTIONS.find(o => o.value === status);
  return option ? `${option.bgColor} ${option.color}` : 'bg-gray-100 text-gray-800';
}

/**
 * Get status label
 */
function getStatusLabel(status: TableStatus): string {
  const option = TABLE_STATUS_OPTIONS.find(o => o.value === status);
  return option?.label || status;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function WaiterClient({
  initialRequests,
  initialTables,
  initialStats,
  organizationId,
  hasWaiterCallFeature,
  userId,
}: WaiterClientProps) {
  // State
  const [requests, setRequests] = useState<ServiceRequestData[]>(initialRequests);
  const [tables, setTables] = useState<RestaurantTable[]>(initialTables);
  const [stats, setStats] = useState<TableStats>(initialStats);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequestData | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'complete' | 'cancel'>('complete');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'requests' | 'tables'>('requests');

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousRequestCountRef = useRef(initialRequests.length);

  // Supabase client
  const supabase = createClient();

  // =============================================================================
  // DATA REFRESH FUNCTIONS (defined before useEffect to fix dependency order)
  // =============================================================================

  const refreshRequests = useCallback(async () => {
    try {
      const { data } = await supabase.rpc('get_pending_service_requests', {
        p_organization_id: organizationId,
      });

      interface PendingRequestRPC {
        request_id: string;
        table_id: string;
        table_number: string;
        table_name: string | null;
        section: string | null;
        request_type: ServiceRequestType;
        notes: string | null;
        created_at: string;
        waiting_seconds: number;
      }

      const requestsData = (data || []).map((req: PendingRequestRPC) => ({
        id: req.request_id,
        table_id: req.table_id,
        table_number: req.table_number,
        table_name: req.table_name,
        section: req.section,
        request_type: req.request_type,
        notes: req.notes,
        created_at: req.created_at,
        waiting_seconds: req.waiting_seconds,
      }));

      // Check if new requests came in
      if (requestsData.length > previousRequestCountRef.current && soundEnabled && audioRef.current) {
        try {
          await audioRef.current.play();
        } catch {
          // Audio play failed
        }
      }
      previousRequestCountRef.current = requestsData.length;

      setRequests(requestsData);

      // Also refresh stats
      const { data: statsData } = await supabase.rpc('get_table_statistics', {
        p_organization_id: organizationId,
      });

      if (statsData && Array.isArray(statsData) && statsData.length > 0) {
        setStats(statsData[0] as TableStats);
      }
    } catch {
      // Silently fail - will retry on next interval
    }
  }, [organizationId, soundEnabled, supabase]);

  const refreshTables = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('restaurant_tables')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('table_number', { ascending: true });

      if (data) {
        setTables(data as RestaurantTable[]);
      }
    } catch {
      // Silently fail
    }
  }, [organizationId, supabase]);

  // =============================================================================
  // REALTIME SUBSCRIPTION
  // =============================================================================

  useEffect(() => {
    // Create audio element for notification sound
    audioRef.current = new Audio('/sounds/notification.mp3');
    audioRef.current.volume = 0.5;

    // Subscribe to service_requests changes
    const channel = supabase
      .channel('service_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_requests',
          filter: `organization_id=eq.${organizationId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Yeni istek geldi - refresh requests
            await refreshRequests();

            // Sesli bildirim
            if (soundEnabled && audioRef.current) {
              try {
                await audioRef.current.play();
              } catch {
                // Audio play failed (user hasn't interacted with page)
              }
            }
          } else if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            // Istek guncellendi veya silindi - refresh requests
            await refreshRequests();
          }
        }
      )
      .subscribe();

    // Subscribe to restaurant_tables changes
    const tablesChannel = supabase
      .channel('restaurant_tables_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'restaurant_tables',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          // Masa durumu degisti - refresh tables
          refreshTables();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(tablesChannel);
    };
  }, [organizationId, soundEnabled, supabase, refreshRequests, refreshTables]);

  // Update waiting times every second
  useEffect(() => {
    const interval = setInterval(() => {
      setRequests(prev => prev.map(req => ({
        ...req,
        waiting_seconds: req.waiting_seconds + 1,
      })));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([refreshRequests(), refreshTables()]);
    setIsRefreshing(false);
  }, [refreshRequests, refreshTables]);

  // =============================================================================
  // REQUEST HANDLERS
  // =============================================================================

  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  }, []);

  const showError = useCallback((message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  }, []);

  const handleRequestAction = useCallback(async (
    request: ServiceRequestData,
    action: 'complete' | 'cancel'
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const newStatus: ServiceRequestStatus = action === 'complete' ? 'completed' : 'cancelled';

      const { data, error: rpcError } = await supabase.rpc('handle_service_request', {
        p_request_id: request.id,
        p_new_status: newStatus,
        p_handler_id: userId,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (data === false) {
        throw new Error('Istek bulunamadi');
      }

      // Refresh data
      await refreshRequests();
      await refreshTables();

      showSuccess(
        action === 'complete'
          ? `Masa ${request.table_number} istegi tamamlandi`
          : `Masa ${request.table_number} istegi iptal edildi`
      );

      setIsConfirmModalOpen(false);
      setSelectedRequest(null);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Bir hata olustu');
    } finally {
      setIsLoading(false);
    }
  }, [userId, supabase, refreshRequests, refreshTables, showSuccess, showError]);

  const openConfirmModal = useCallback((request: ServiceRequestData, action: 'complete' | 'cancel') => {
    setSelectedRequest(request);
    setConfirmAction(action);
    setIsConfirmModalOpen(true);
  }, []);

  const handleTableStatusChange = useCallback(async (table: RestaurantTable, newStatus: TableStatus) => {
    try {
      const { error: updateError } = await supabase
        .from('restaurant_tables')
        .update({
          current_status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', table.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Update local state
      setTables(prev => prev.map(t =>
        t.id === table.id ? { ...t, current_status: newStatus } : t
      ));

      showSuccess(`Masa ${table.table_number} durumu guncellendi`);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Durum guncellenemedi');
    }
  }, [supabase, showSuccess, showError]);

  // =============================================================================
  // RENDER
  // =============================================================================

  // If feature not available, show upgrade prompt
  if (!hasWaiterCallFeature) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <UpgradePrompt
          featureKey="module_waiter_call"
          variant="card"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Icons.Bell />
            Garson Paneli
          </h1>
          <p className="text-gray-500 mt-1">
            Servis isteklerini gercek zamanli olarak yonetin.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(prev => !prev)}
            className={`p-2 rounded-lg transition-colors ${
              soundEnabled
                ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            title={soundEnabled ? 'Sesi kapat' : 'Sesi ac'}
          >
            {soundEnabled ? <Icons.Volume /> : <Icons.VolumeOff />}
          </button>

          {/* Refresh Button */}
          <Button
            variant="secondary"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <span className={isRefreshing ? 'animate-spin' : ''}>
              <Icons.Refresh />
            </span>
            Yenile
          </Button>

          {/* View Toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setViewMode('requests')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'requests'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Istekler ({requests.length})
            </button>
            <button
              onClick={() => setViewMode('tables')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'tables'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Masalar
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard
          label="Bekleyen"
          value={stats.pending_requests}
          color={stats.pending_requests > 0 ? 'text-red-600' : 'text-gray-900'}
          bgColor={stats.pending_requests > 0 ? 'bg-red-50' : 'bg-gray-50'}
        />
        <StatCard
          label="Servis Bekliyor"
          value={stats.needs_service_tables}
          color="text-orange-600"
          bgColor="bg-orange-50"
        />
        <StatCard
          label="Dolu"
          value={stats.occupied_tables}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard
          label="Bos"
          value={stats.available_tables}
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <StatCard
          label="Rezerve"
          value={stats.reserved_tables}
          color="text-purple-600"
          bgColor="bg-purple-50"
        />
        <StatCard
          label="Toplam"
          value={stats.total_tables}
          color="text-gray-900"
          bgColor="bg-gray-50"
        />
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <Icons.Check />
          {successMessage}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <Icons.Warning />
          {error}
        </div>
      )}

      {/* Main Content */}
      {viewMode === 'requests' ? (
        <RequestsView
          requests={requests}
          onComplete={(req) => openConfirmModal(req, 'complete')}
          onCancel={(req) => openConfirmModal(req, 'cancel')}
        />
      ) : (
        <TablesView
          tables={tables}
          requests={requests}
          onStatusChange={handleTableStatusChange}
        />
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setSelectedRequest(null);
        }}
        onConfirm={() => selectedRequest && handleRequestAction(selectedRequest, confirmAction)}
        title={confirmAction === 'complete' ? 'Istegi Tamamla' : 'Istegi Iptal Et'}
        message={
          selectedRequest && (
            <span>
              <strong>Masa {selectedRequest.table_number}</strong>
              {selectedRequest.table_name && ` (${selectedRequest.table_name})`}
              {' '}icin{' '}
              <strong>{REQUEST_TYPE_LABELS[selectedRequest.request_type].label}</strong>
              {' '}istegini {confirmAction === 'complete' ? 'tamamlamak' : 'iptal etmek'} istediginize emin misiniz?
            </span>
          )
        }
        confirmText={confirmAction === 'complete' ? 'Tamamla' : 'Iptal Et'}
        cancelText="Vazgec"
        variant={confirmAction === 'complete' ? 'primary' : 'danger'}
        isLoading={isLoading}
      />
    </div>
  );
}

// =============================================================================
// STAT CARD COMPONENT
// =============================================================================

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  bgColor: string;
}

function StatCard({ label, value, color, bgColor }: StatCardProps) {
  return (
    <div className={`${bgColor} rounded-lg p-4 text-center`}>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-600 mt-1">{label}</div>
    </div>
  );
}

// =============================================================================
// REQUESTS VIEW COMPONENT
// =============================================================================

interface RequestsViewProps {
  requests: ServiceRequestData[];
  onComplete: (request: ServiceRequestData) => void;
  onCancel: (request: ServiceRequestData) => void;
}

function RequestsView({ requests, onComplete, onCancel }: RequestsViewProps) {
  if (requests.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center text-green-600">
          <Icons.Check />
        </div>
        <h3 className="text-lg font-medium text-gray-900">
          Bekleyen istek yok
        </h3>
        <p className="text-gray-500 mt-1">
          Tum servis istekleri tamamlandi. Yeni istekler otomatik olarak gorunecek.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => {
        const urgency = getUrgencyLevel(request.waiting_seconds);
        const urgencyColor = getUrgencyColor(urgency);
        const typeInfo = REQUEST_TYPE_LABELS[request.request_type];

        return (
          <div
            key={request.id}
            className={`card border-2 ${urgencyColor} p-4`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Request Info */}
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${typeInfo.color}`}>
                  {typeInfo.icon}
                </div>

                {/* Details */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-gray-900">
                      Masa {request.table_number}
                    </span>
                    {request.table_name && (
                      <span className="text-gray-500">({request.table_name})</span>
                    )}
                    <Badge variant={urgency === 'critical' ? 'error' : urgency === 'high' ? 'warning' : 'default'} size="sm">
                      {formatWaitingTime(request.waiting_seconds)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                    {request.section && (
                      <span className="text-sm text-gray-500">{request.section}</span>
                    )}
                  </div>
                  {request.notes && (
                    <p className="text-sm text-gray-600 mt-2 bg-white rounded px-2 py-1">
                      {request.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onComplete(request)}
                  className="flex items-center gap-1"
                >
                  <Icons.Check />
                  Tamamla
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onCancel(request)}
                  className="flex items-center gap-1"
                >
                  <Icons.X />
                  Iptal
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// TABLES VIEW COMPONENT
// =============================================================================

interface TablesViewProps {
  tables: RestaurantTable[];
  requests: ServiceRequestData[];
  onStatusChange: (table: RestaurantTable, newStatus: TableStatus) => void;
}

function TablesView({ tables, requests, onStatusChange }: TablesViewProps) {
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);

  // Get pending request count for a table
  const getPendingRequestCount = (tableId: string) => {
    return requests.filter(req => req.table_id === tableId).length;
  };

  // Group tables by section
  const tablesBySection = tables.reduce<Record<string, RestaurantTable[]>>((acc, table) => {
    const section = table.section || 'Diger';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(table);
    return acc;
  }, {});

  if (tables.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
          <Icons.Table />
        </div>
        <h3 className="text-lg font-medium text-gray-900">
          Henuz masa yok
        </h3>
        <p className="text-gray-500 mt-1">
          Masalari &quot;Masalar&quot; sayfasindan ekleyebilirsiniz.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {Object.entries(tablesBySection).map(([section, sectionTables]) => (
        <div key={section}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{section}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {sectionTables.map((table) => {
              const pendingCount = getPendingRequestCount(table.id);
              const hasRequests = pendingCount > 0;

              return (
                <button
                  key={table.id}
                  onClick={() => {
                    setSelectedTable(table);
                    setStatusModalOpen(true);
                  }}
                  className={`relative card p-4 text-center hover:shadow-md transition-shadow ${
                    hasRequests ? 'ring-2 ring-orange-400 animate-pulse' : ''
                  }`}
                >
                  {/* Pending Request Badge */}
                  {hasRequests && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {pendingCount}
                    </div>
                  )}

                  {/* Table Number */}
                  <div className="text-xl font-bold text-gray-900">
                    {table.table_number}
                  </div>

                  {/* Table Name */}
                  {table.table_name && (
                    <div className="text-xs text-gray-500 truncate">
                      {table.table_name}
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className={`mt-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(table.current_status)}`}>
                    {getStatusLabel(table.current_status)}
                  </div>

                  {/* Capacity */}
                  {table.capacity && (
                    <div className="flex items-center justify-center gap-1 mt-2 text-xs text-gray-400">
                      <Icons.Users />
                      {table.capacity}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Status Change Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => {
          setStatusModalOpen(false);
          setSelectedTable(null);
        }}
        title={`Masa ${selectedTable?.table_number}`}
        description={selectedTable?.table_name || undefined}
        size="sm"
      >
        {selectedTable && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Masa durumunu secin:</p>
            <div className="grid grid-cols-2 gap-3">
              {TABLE_STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onStatusChange(selectedTable, option.value);
                    setStatusModalOpen(false);
                    setSelectedTable(null);
                  }}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedTable.current_status === option.value
                      ? `border-primary-500 ${option.bgColor}`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`text-sm font-medium ${option.color}`}>
                    {option.label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
