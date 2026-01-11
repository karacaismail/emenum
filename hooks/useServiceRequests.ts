/**
 * useServiceRequests Hook
 *
 * Supabase Realtime subscription to service_requests table for instant notifications.
 * This hook enables real-time waiter call functionality across the application.
 *
 * Bu hook, servis istekleri icin gercek zamanli bildirim sistemi saglar.
 * Garson paneli, masa durumu ve diger bilesen lerde kullanilabilir.
 *
 * Features:
 * - Real-time subscription to service_requests table changes
 * - INSERT/UPDATE/DELETE event handling
 * - Audio notification support
 * - Automatic reconnection on connection loss
 * - Organization-scoped filtering
 * - Pending/completed/cancelled request tracking
 *
 * KRITIK: Bildirim 1 saniye icinde ulasmalidir (spec requirement)
 *
 * @example
 * ```tsx
 * 'use client';
 * import { useServiceRequests } from '@/hooks';
 *
 * function WaiterPanel({ organizationId }: { organizationId: string }) {
 *   const {
 *     requests,
 *     pendingCount,
 *     isConnected,
 *     handleRequest,
 *   } = useServiceRequests({
 *     organizationId,
 *     onNewRequest: (request) => {
 *       // Play notification sound
 *       new Audio('/sounds/notification.mp3').play();
 *     },
 *   });
 *
 *   return (
 *     <div>
 *       <p>Bekleyen: {pendingCount}</p>
 *       {requests.map(req => (
 *         <RequestCard key={req.id} request={req} onHandle={handleRequest} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { ServiceRequestType, ServiceRequestStatus } from '@/types/database';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Service request data structure
 */
export interface ServiceRequestData {
  /** Unique request ID */
  id: string;
  /** Organization ID */
  organization_id: string;
  /** Table ID (restaurant_tables.id) */
  table_id: string;
  /** Table number for display */
  table_number?: string;
  /** Table name (optional) */
  table_name?: string | null;
  /** Table section (e.g., "Bahce", "Ic Mekan") */
  section?: string | null;
  /** Type of request */
  request_type: ServiceRequestType;
  /** Request status */
  status: ServiceRequestStatus;
  /** Additional notes from customer */
  notes: string | null;
  /** When request was created */
  created_at: string;
  /** Who handled the request (user_id) */
  handled_by?: string | null;
  /** When request was handled */
  handled_at?: string | null;
  /** Calculated waiting time in seconds (updated in real-time) */
  waiting_seconds: number;
}

/**
 * Payload structure for realtime changes
 */
interface ServiceRequestPayload {
  id: string;
  organization_id: string;
  table_id: string;
  request_type: ServiceRequestType;
  status: ServiceRequestStatus;
  notes: string | null;
  created_at: string;
  handled_by: string | null;
  handled_at: string | null;
}

/**
 * Options for useServiceRequests hook
 */
export interface UseServiceRequestsOptions {
  /** Organization ID to filter requests (required) */
  organizationId: string;
  /** Only fetch pending requests (default: true) */
  pendingOnly?: boolean;
  /** Callback when new request is received */
  onNewRequest?: (request: ServiceRequestData) => void;
  /** Callback when request is updated */
  onRequestUpdated?: (request: ServiceRequestData, oldStatus: ServiceRequestStatus) => void;
  /** Callback when request is deleted */
  onRequestDeleted?: (requestId: string) => void;
  /** Callback when connection status changes */
  onConnectionChange?: (connected: boolean) => void;
  /** Enable audio notifications (default: false - caller should handle) */
  enableAudio?: boolean;
  /** Audio notification URL (default: /sounds/notification.mp3) */
  audioUrl?: string;
  /** Auto-update waiting times every second (default: true) */
  autoUpdateWaitingTime?: boolean;
  /** Initial requests data (for SSR hydration) */
  initialRequests?: ServiceRequestData[];
}

/**
 * Result of useServiceRequests hook
 */
export interface UseServiceRequestsResult {
  /** All service requests (filtered by options) */
  requests: ServiceRequestData[];
  /** Number of pending requests */
  pendingCount: number;
  /** Whether realtime connection is active */
  isConnected: boolean;
  /** Whether initial data is loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Handle (complete/cancel) a request */
  handleRequest: (requestId: string, action: 'complete' | 'cancel', handlerId: string) => Promise<boolean>;
  /** Manually refresh requests */
  refresh: () => Promise<void>;
  /** Subscribe to a specific table's requests */
  subscribeToTable: (tableId: string) => void;
  /** Unsubscribe from table-specific subscription */
  unsubscribeFromTable: () => void;
  /** Get requests for a specific table */
  getTableRequests: (tableId: string) => ServiceRequestData[];
  /** Connection status details */
  connectionStatus: ConnectionStatus;
}

/**
 * Connection status details
 */
export interface ConnectionStatus {
  /** Whether currently connected */
  connected: boolean;
  /** Last successful connection time */
  lastConnectedAt: Date | null;
  /** Number of reconnection attempts */
  reconnectAttempts: number;
  /** Channel state */
  channelState: 'SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'connecting';
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default audio notification URL */
const DEFAULT_AUDIO_URL = '/sounds/notification.mp3';

/** Reconnection delay in milliseconds */
const RECONNECT_DELAY = 3000;

/** Maximum reconnection attempts before giving up */
const MAX_RECONNECT_ATTEMPTS = 10;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate waiting time in seconds from created_at
 */
function calculateWaitingSeconds(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / 1000);
}

/**
 * Sort requests by waiting time (longest waiting first)
 */
function sortByWaitingTime(requests: ServiceRequestData[]): ServiceRequestData[] {
  return [...requests].sort((a, b) => b.waiting_seconds - a.waiting_seconds);
}

/**
 * Get urgency level based on waiting time
 */
export function getUrgencyLevel(seconds: number): 'low' | 'medium' | 'high' | 'critical' {
  if (seconds < 60) return 'low';      // < 1 min
  if (seconds < 180) return 'medium';  // 1-3 min
  if (seconds < 300) return 'high';    // 3-5 min
  return 'critical';                    // > 5 min
}

/**
 * Format waiting time for display
 */
export function formatWaitingTime(seconds: number): string {
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

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * Hook for real-time service request subscription
 *
 * Provides Supabase Realtime subscription to service_requests table
 * with instant notifications and automatic updates.
 *
 * @param options - Configuration options
 * @returns Service requests state and utilities
 */
export function useServiceRequests(options: UseServiceRequestsOptions): UseServiceRequestsResult {
  const {
    organizationId,
    pendingOnly = true,
    onNewRequest,
    onRequestUpdated,
    onRequestDeleted,
    onConnectionChange,
    enableAudio = false,
    audioUrl = DEFAULT_AUDIO_URL,
    autoUpdateWaitingTime = true,
    initialRequests = [],
  } = options;

  // State
  const [requests, setRequests] = useState<ServiceRequestData[]>(
    initialRequests.map(req => ({
      ...req,
      waiting_seconds: calculateWaitingSeconds(req.created_at),
    }))
  );
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    lastConnectedAt: null,
    reconnectAttempts: 0,
    channelState: 'connecting',
  });

  // Refs
  const channelRef = useRef<RealtimeChannel | null>(null);
  const tableChannelRef = useRef<RealtimeChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const supabaseRef = useRef(createClient());

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  /**
   * Fetch initial requests from database
   */
  const fetchRequests = useCallback(async () => {
    const supabase = supabaseRef.current;

    try {
      setError(null);

      // Use RPC for pending requests (includes table info)
      if (pendingOnly) {
        const { data, error: rpcError } = await supabase.rpc('get_pending_service_requests', {
          p_organization_id: organizationId,
        });

        if (rpcError) {
          throw new Error(rpcError.message);
        }

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

        const requestsData: ServiceRequestData[] = (data || []).map((req: PendingRequestRPC) => ({
          id: req.request_id,
          organization_id: organizationId,
          table_id: req.table_id,
          table_number: req.table_number,
          table_name: req.table_name,
          section: req.section,
          request_type: req.request_type,
          status: 'pending' as ServiceRequestStatus,
          notes: req.notes,
          created_at: req.created_at,
          waiting_seconds: req.waiting_seconds,
        }));

        setRequests(sortByWaitingTime(requestsData));
      } else {
        // Fetch all requests with table join
        const { data, error: fetchError } = await supabase
          .from('service_requests')
          .select(`
            *,
            table:restaurant_tables(table_number, table_name, section)
          `)
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(100);

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        interface ServiceRequestWithTable {
          id: string;
          organization_id: string;
          table_id: string;
          request_type: ServiceRequestType;
          status: ServiceRequestStatus;
          notes: string | null;
          created_at: string;
          handled_by: string | null;
          handled_at: string | null;
          table: {
            table_number: string;
            table_name: string | null;
            section: string | null;
          } | null;
        }

        const requestsData: ServiceRequestData[] = (data || []).map((req: ServiceRequestWithTable) => ({
          id: req.id,
          organization_id: req.organization_id,
          table_id: req.table_id,
          table_number: req.table?.table_number,
          table_name: req.table?.table_name,
          section: req.table?.section,
          request_type: req.request_type,
          status: req.status,
          notes: req.notes,
          created_at: req.created_at,
          handled_by: req.handled_by,
          handled_at: req.handled_at,
          waiting_seconds: calculateWaitingSeconds(req.created_at),
        }));

        setRequests(requestsData);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Servis istekleri yuklenemedi';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, pendingOnly]);

  /**
   * Manually refresh requests
   */
  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchRequests();
  }, [fetchRequests]);

  // =============================================================================
  // REQUEST HANDLERS
  // =============================================================================

  /**
   * Handle (complete or cancel) a service request
   */
  const handleRequest = useCallback(async (
    requestId: string,
    action: 'complete' | 'cancel',
    handlerId: string
  ): Promise<boolean> => {
    const supabase = supabaseRef.current;

    try {
      const newStatus: ServiceRequestStatus = action === 'complete' ? 'completed' : 'cancelled';

      const { data, error: rpcError } = await supabase.rpc('handle_service_request', {
        p_request_id: requestId,
        p_new_status: newStatus,
        p_handler_id: handlerId,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (data === false) {
        throw new Error('Istek bulunamadi veya zaten islenmis');
      }

      // Optimistic update - remove from pending list immediately
      if (pendingOnly) {
        setRequests(prev => prev.filter(req => req.id !== requestId));
      } else {
        setRequests(prev => prev.map(req =>
          req.id === requestId
            ? { ...req, status: newStatus, handled_by: handlerId, handled_at: new Date().toISOString() }
            : req
        ));
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Istek islenemedi';
      setError(message);
      return false;
    }
  }, [pendingOnly]);

  // =============================================================================
  // TABLE-SPECIFIC SUBSCRIPTION
  // =============================================================================

  /**
   * Subscribe to a specific table's requests (for customer-facing components)
   */
  const subscribeToTable = useCallback((tableId: string) => {
    const supabase = supabaseRef.current;

    // Clean up existing table subscription
    if (tableChannelRef.current) {
      supabase.removeChannel(tableChannelRef.current);
    }

    tableChannelRef.current = supabase
      .channel(`table_requests_${tableId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_requests',
          filter: `table_id=eq.${tableId}`,
        },
        () => {
          // Refresh requests when table-specific changes occur
          fetchRequests();
        }
      )
      .subscribe();
  }, [fetchRequests]);

  /**
   * Unsubscribe from table-specific subscription
   */
  const unsubscribeFromTable = useCallback(() => {
    const supabase = supabaseRef.current;

    if (tableChannelRef.current) {
      supabase.removeChannel(tableChannelRef.current);
      tableChannelRef.current = null;
    }
  }, []);

  /**
   * Get requests for a specific table
   */
  const getTableRequests = useCallback((tableId: string): ServiceRequestData[] => {
    return requests.filter(req => req.table_id === tableId);
  }, [requests]);

  // =============================================================================
  // REALTIME SUBSCRIPTION
  // =============================================================================

  useEffect(() => {
    const supabase = supabaseRef.current;

    // Initialize audio element if enabled
    if (enableAudio && typeof window !== 'undefined') {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.volume = 0.5;
    }

    // Fetch initial data
    fetchRequests();

    // Create realtime subscription
    const setupChannel = () => {
      // Clean up existing channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      channelRef.current = supabase
        .channel(`service_requests_${organizationId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'service_requests',
            filter: `organization_id=eq.${organizationId}`,
          },
          async (payload: RealtimePostgresChangesPayload<ServiceRequestPayload>) => {
            if (payload.eventType === 'INSERT') {
              // New request received
              const newRequest = payload.new as ServiceRequestPayload;

              // Fetch table info for the new request
              const { data: tableData } = await supabase
                .from('restaurant_tables')
                .select('table_number, table_name, section')
                .eq('id', newRequest.table_id)
                .single();

              const requestData: ServiceRequestData = {
                id: newRequest.id,
                organization_id: newRequest.organization_id,
                table_id: newRequest.table_id,
                table_number: tableData?.table_number,
                table_name: tableData?.table_name,
                section: tableData?.section,
                request_type: newRequest.request_type,
                status: newRequest.status,
                notes: newRequest.notes,
                created_at: newRequest.created_at,
                handled_by: newRequest.handled_by,
                handled_at: newRequest.handled_at,
                waiting_seconds: calculateWaitingSeconds(newRequest.created_at),
              };

              // Only add if pending (when pendingOnly mode)
              if (!pendingOnly || newRequest.status === 'pending') {
                setRequests(prev => sortByWaitingTime([requestData, ...prev]));

                // Play audio notification
                if (enableAudio && audioRef.current) {
                  try {
                    await audioRef.current.play();
                  } catch {
                    // Audio play failed (user hasn't interacted with page)
                  }
                }

                // Call callback
                onNewRequest?.(requestData);
              }
            } else if (payload.eventType === 'UPDATE') {
              const updatedRequest = payload.new as ServiceRequestPayload;
              const oldRequest = payload.old as Partial<ServiceRequestPayload>;

              if (pendingOnly && updatedRequest.status !== 'pending') {
                // Remove from list if no longer pending
                setRequests(prev => prev.filter(req => req.id !== updatedRequest.id));
              } else {
                // Update in list
                setRequests(prev => prev.map(req =>
                  req.id === updatedRequest.id
                    ? {
                        ...req,
                        status: updatedRequest.status,
                        handled_by: updatedRequest.handled_by,
                        handled_at: updatedRequest.handled_at,
                      }
                    : req
                ));
              }

              // Find existing request for callback
              const existingRequest = requests.find(req => req.id === updatedRequest.id);
              if (existingRequest && oldRequest.status) {
                onRequestUpdated?.(
                  { ...existingRequest, status: updatedRequest.status },
                  oldRequest.status
                );
              }
            } else if (payload.eventType === 'DELETE') {
              const deletedId = (payload.old as Partial<ServiceRequestPayload>).id;
              if (deletedId) {
                setRequests(prev => prev.filter(req => req.id !== deletedId));
                onRequestDeleted?.(deletedId);
              }
            }
          }
        )
        .subscribe((status) => {
          const connected = status === 'SUBSCRIBED';
          setIsConnected(connected);

          setConnectionStatus(prev => ({
            connected,
            lastConnectedAt: connected ? new Date() : prev.lastConnectedAt,
            reconnectAttempts: connected ? 0 : prev.reconnectAttempts,
            channelState: status as ConnectionStatus['channelState'],
          }));

          onConnectionChange?.(connected);

          // Handle reconnection on error
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setConnectionStatus(prev => ({
              ...prev,
              reconnectAttempts: prev.reconnectAttempts + 1,
            }));

            if (connectionStatus.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
              // Attempt reconnection
              reconnectTimeoutRef.current = setTimeout(() => {
                setupChannel();
              }, RECONNECT_DELAY);
            } else {
              setError('Baglanti kurulamadi. Lutfen sayfayi yenileyin.');
            }
          }
        });
    };

    setupChannel();

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      if (tableChannelRef.current) {
        supabase.removeChannel(tableChannelRef.current);
        tableChannelRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, pendingOnly, enableAudio, audioUrl]);

  // =============================================================================
  // AUTO-UPDATE WAITING TIME
  // =============================================================================

  useEffect(() => {
    if (!autoUpdateWaitingTime) return;

    const interval = setInterval(() => {
      setRequests(prev => prev.map(req => ({
        ...req,
        waiting_seconds: req.waiting_seconds + 1,
      })));
    }, 1000);

    return () => clearInterval(interval);
  }, [autoUpdateWaitingTime]);

  // =============================================================================
  // COMPUTED VALUES
  // =============================================================================

  const pendingCount = requests.filter(req => req.status === 'pending').length;

  // =============================================================================
  // RETURN
  // =============================================================================

  return {
    requests,
    pendingCount,
    isConnected,
    isLoading,
    error,
    handleRequest,
    refresh,
    subscribeToTable,
    unsubscribeFromTable,
    getTableRequests,
    connectionStatus,
  };
}

// =============================================================================
// SIMPLE HOOK FOR PENDING COUNT ONLY
// =============================================================================

/**
 * Simple hook to get pending request count for an organization
 *
 * @param organizationId - Organization to monitor
 * @returns Pending request count
 *
 * @example
 * ```tsx
 * const pendingCount = usePendingRequestCount('org-123');
 *
 * return <Badge>{pendingCount}</Badge>;
 * ```
 */
export function usePendingRequestCount(organizationId: string): number {
  const { pendingCount } = useServiceRequests({
    organizationId,
    pendingOnly: true,
  });

  return pendingCount;
}

// =============================================================================
// HOOK FOR SINGLE TABLE REQUESTS
// =============================================================================

/**
 * Hook to monitor requests for a specific table
 *
 * Useful for customer-facing components that only care about their table.
 *
 * @param organizationId - Organization ID
 * @param tableId - Table ID to monitor
 * @returns Requests for that table
 *
 * @example
 * ```tsx
 * const requests = useTableServiceRequests('org-123', 'table-456');
 *
 * return (
 *   <div>
 *     {requests.map(req => (
 *       <p key={req.id}>{req.request_type}: {req.status}</p>
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useTableServiceRequests(
  organizationId: string,
  tableId: string
): {
  requests: ServiceRequestData[];
  pendingCount: number;
  isLoading: boolean;
} {
  const { getTableRequests, isLoading, subscribeToTable, unsubscribeFromTable } = useServiceRequests({
    organizationId,
    pendingOnly: false,
  });

  // Subscribe to table-specific updates
  useEffect(() => {
    subscribeToTable(tableId);

    return () => {
      unsubscribeFromTable();
    };
  }, [tableId, subscribeToTable, unsubscribeFromTable]);

  const tableRequests = getTableRequests(tableId);

  return {
    requests: tableRequests,
    pendingCount: tableRequests.filter(req => req.status === 'pending').length,
    isLoading,
  };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default useServiceRequests;
