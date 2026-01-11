/**
 * Tables Client Component
 *
 * CRUD islemleri, QR kod olusturma ve toplu indirme icin
 * client-side component.
 *
 * Ozellikler:
 * - Masa ekleme (modal ile)
 * - Masa duzenleme (modal ile)
 * - Masa silme (onay ile)
 * - Her masa icin QR kod olusturma (qr_uuid kullanarak)
 * - Tek tek QR kod indirme
 * - Toplu QR kod indirme
 * - Masa durumu yonetimi (available, occupied, reserved, needs_service)
 *
 * KRITIK: QR kodlar qr_uuid (UUID) kullanir, ardisik sayilar degil!
 * URL formati: ${baseUrl}/menu/${organizationSlug}?table_id=${qr_uuid}
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Modal, ConfirmModal, Button, Input, Badge } from '@/components/ui';
import { LimitBanner } from '@/components/ui/UpgradePrompt';
import QRCode from 'qrcode';
import type { RestaurantTable, RestaurantTableInsert, RestaurantTableUpdate, TableStatus } from '@/types/database';

// =============================================================================
// TYPES
// =============================================================================

interface LimitCheckInfo {
  canAdd: boolean;
  limit: number;
  currentCount: number;
  remaining: number;
  shouldUpgrade: boolean;
  message: string;
}

interface TablesClientProps {
  initialTables: RestaurantTable[];
  organizationId: string;
  organizationSlug: string;
  baseUrl: string;
  limitCheck: LimitCheckInfo;
  userRole: string;
}

interface TableFormData {
  table_number: string;
  table_name: string;
  section: string;
  capacity: string;
  current_status: TableStatus;
  is_active: boolean;
}


// =============================================================================
// CONSTANTS
// =============================================================================

const TABLE_STATUS_OPTIONS: { value: TableStatus; label: string; color: string }[] = [
  { value: 'available', label: 'Bos', color: 'bg-green-100 text-green-800' },
  { value: 'occupied', label: 'Dolu', color: 'bg-blue-100 text-blue-800' },
  { value: 'reserved', label: 'Rezerve', color: 'bg-purple-100 text-purple-800' },
  { value: 'needs_service', label: 'Servis Bekliyor', color: 'bg-orange-100 text-orange-800' },
];

// =============================================================================
// ICONS
// =============================================================================

const Icons = {
  Plus: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Edit: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  QRCode: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
    </svg>
  ),
  Download: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  DownloadAll: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
    </svg>
  ),
  Table: () => (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  Warning: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Users: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  ExternalLink: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
  Copy: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate QR code URL for a table
 */
function generateTableUrl(baseUrl: string, organizationSlug: string, qrUuid: string): string {
  return `${baseUrl}/menu/${organizationSlug}?table_id=${qrUuid}`;
}

/**
 * Generate QR code as data URL
 */
async function generateQRCode(url: string, size: number = 256): Promise<string> {
  return QRCode.toDataURL(url, {
    width: size,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}

/**
 * Download a single QR code
 */
function downloadQRCode(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Get status badge color
 */
function getStatusColor(status: TableStatus): string {
  const option = TABLE_STATUS_OPTIONS.find(o => o.value === status);
  return option?.color || 'bg-gray-100 text-gray-800';
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

export function TablesClient({
  initialTables,
  organizationId,
  organizationSlug,
  baseUrl,
  limitCheck,
  userRole,
}: TablesClientProps) {
  // State
  const [tables, setTables] = useState<RestaurantTable[]>(initialTables);
  const [currentLimit, setCurrentLimit] = useState<LimitCheckInfo>(limitCheck);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // QR codes cache
  const [qrCodes, setQrCodes] = useState<Map<string, string>>(new Map());

  // Form state
  const [formData, setFormData] = useState<TableFormData>({
    table_number: '',
    table_name: '',
    section: '',
    capacity: '',
    current_status: 'available',
    is_active: true,
  });

  // Filter state
  const [statusFilter, setStatusFilter] = useState<TableStatus | 'all'>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');

  // Check if user can edit (manager+ roles)
  const canEdit = ['owner', 'admin', 'manager'].includes(userRole);

  // Supabase client
  const supabase = createClient();

  // Get unique sections for filter
  const sections = useMemo(() => {
    const uniqueSections = new Set(tables.map(t => t.section).filter(Boolean));
    return Array.from(uniqueSections) as string[];
  }, [tables]);

  // Filtered tables
  const filteredTables = useMemo(() => {
    return tables.filter(table => {
      if (statusFilter !== 'all' && table.current_status !== statusFilter) {
        return false;
      }
      if (sectionFilter !== 'all' && table.section !== sectionFilter) {
        return false;
      }
      return true;
    });
  }, [tables, statusFilter, sectionFilter]);

  // =============================================================================
  // QR CODE GENERATION
  // =============================================================================

  // Generate QR codes for all tables on mount
  useEffect(() => {
    const generateAllQRCodes = async () => {
      const newQrCodes = new Map<string, string>();

      for (const table of tables) {
        const url = generateTableUrl(baseUrl, organizationSlug, table.qr_uuid);
        const dataUrl = await generateQRCode(url);
        newQrCodes.set(table.id, dataUrl);
      }

      setQrCodes(newQrCodes);
    };

    generateAllQRCodes();
  }, [tables, baseUrl, organizationSlug]);

  // Generate QR code for a new table
  const generateQRForTable = useCallback(async (table: RestaurantTable) => {
    const url = generateTableUrl(baseUrl, organizationSlug, table.qr_uuid);
    const dataUrl = await generateQRCode(url);
    setQrCodes(prev => new Map(prev).set(table.id, dataUrl));
    return dataUrl;
  }, [baseUrl, organizationSlug]);

  // =============================================================================
  // HELPER FUNCTIONS
  // =============================================================================

  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  }, []);

  const showError = useCallback((message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      table_number: '',
      table_name: '',
      section: '',
      capacity: '',
      current_status: 'available',
      is_active: true,
    });
    setSelectedTable(null);
    setError(null);
  }, []);

  const updateLimitCheck = useCallback(() => {
    const newCount = tables.length;
    const canAdd = currentLimit.limit === -1 || newCount < currentLimit.limit;
    const remaining = currentLimit.limit === -1 ? -1 : Math.max(0, currentLimit.limit - newCount);

    setCurrentLimit(prev => ({
      ...prev,
      currentCount: newCount,
      canAdd,
      remaining,
      shouldUpgrade: currentLimit.limit > 0 && (newCount / currentLimit.limit) >= 0.8,
    }));
  }, [tables.length, currentLimit.limit]);

  // Copy URL to clipboard
  const copyToClipboard = useCallback(async (text: string, tableId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUrl(tableId);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch {
      showError('URL kopyalanamadi');
    }
  }, [showError]);

  // =============================================================================
  // CRUD OPERATIONS
  // =============================================================================

  const handleAddTable = useCallback(async () => {
    if (!formData.table_number.trim()) {
      showError('Masa numarasi zorunludur');
      return;
    }

    // Limit kontrolu
    if (!currentLimit.canAdd && currentLimit.limit !== -1) {
      showError(`Masa limitine ulastiniz (${currentLimit.currentCount}/${currentLimit.limit}). Paketinizi yukseltin.`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newTable: RestaurantTableInsert = {
        organization_id: organizationId,
        table_number: formData.table_number.trim(),
        table_name: formData.table_name.trim() || null,
        section: formData.section.trim() || null,
        capacity: formData.capacity ? parseInt(formData.capacity, 10) : null,
        current_status: formData.current_status,
        is_active: formData.is_active,
      };

      const { data, error: insertError } = await supabase
        .from('restaurant_tables')
        .insert(newTable)
        .select()
        .single();

      if (insertError) {
        if (insertError.message.includes('unique')) {
          throw new Error('Bu masa numarasi zaten mevcut');
        }
        throw new Error(insertError.message);
      }

      // Type-safe data conversion
      const tableData: RestaurantTable = {
        id: data.id,
        organization_id: data.organization_id,
        qr_uuid: data.qr_uuid,
        table_number: data.table_number,
        table_name: data.table_name,
        section: data.section,
        capacity: data.capacity,
        current_status: data.current_status,
        last_ping_at: data.last_ping_at,
        is_active: data.is_active,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      // Listeye ekle
      setTables(prev => [...prev, tableData]);

      // Generate QR code for new table
      await generateQRForTable(tableData);

      updateLimitCheck();

      // Modal kapat ve formu sifirla
      setIsAddModalOpen(false);
      resetForm();
      showSuccess('Masa basariyla eklendi');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Masa eklenirken hata olustu');
    } finally {
      setIsLoading(false);
    }
  }, [formData, currentLimit, organizationId, supabase, showError, showSuccess, resetForm, updateLimitCheck, generateQRForTable]);

  const handleEditTable = useCallback(async () => {
    if (!selectedTable) return;

    if (!formData.table_number.trim()) {
      showError('Masa numarasi zorunludur');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const updateData: RestaurantTableUpdate = {
        table_number: formData.table_number.trim(),
        table_name: formData.table_name.trim() || null,
        section: formData.section.trim() || null,
        capacity: formData.capacity ? parseInt(formData.capacity, 10) : null,
        current_status: formData.current_status,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('restaurant_tables')
        .update(updateData)
        .eq('id', selectedTable.id);

      if (updateError) {
        if (updateError.message.includes('unique')) {
          throw new Error('Bu masa numarasi zaten mevcut');
        }
        throw new Error(updateError.message);
      }

      // Listeyi guncelle
      setTables(prev => prev.map(table =>
        table.id === selectedTable.id
          ? { ...table, ...updateData }
          : table
      ));

      // Modal kapat ve formu sifirla
      setIsEditModalOpen(false);
      resetForm();
      showSuccess('Masa basariyla guncellendi');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Masa guncellenirken hata olustu');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTable, formData, supabase, showError, showSuccess, resetForm]);

  const handleDeleteTable = useCallback(async () => {
    if (!selectedTable) return;

    setIsLoading(true);
    setError(null);

    try {
      // Check for pending service requests
      const { count } = await supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .eq('table_id', selectedTable.id)
        .eq('status', 'pending');

      if (count && count > 0) {
        throw new Error(`Bu masada ${count} bekleyen servis istegi var. Once istekleri tamamlayin.`);
      }

      const { error: deleteError } = await supabase
        .from('restaurant_tables')
        .delete()
        .eq('id', selectedTable.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      // Listeden kaldir
      setTables(prev => prev.filter(table => table.id !== selectedTable.id));

      // Remove QR code from cache
      setQrCodes(prev => {
        const newMap = new Map(prev);
        newMap.delete(selectedTable.id);
        return newMap;
      });

      updateLimitCheck();

      // Modal kapat
      setIsDeleteModalOpen(false);
      setSelectedTable(null);
      showSuccess('Masa basariyla silindi');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Masa silinirken hata olustu');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTable, supabase, showError, showSuccess, updateLimitCheck]);

  // =============================================================================
  // QR CODE DOWNLOAD FUNCTIONS
  // =============================================================================

  const handleDownloadQR = useCallback(async (table: RestaurantTable) => {
    let dataUrl = qrCodes.get(table.id);

    if (!dataUrl) {
      dataUrl = await generateQRForTable(table);
    }

    const filename = `QR_Masa_${table.table_number}${table.table_name ? `_${table.table_name}` : ''}.png`;
    downloadQRCode(dataUrl, filename);
    showSuccess(`${table.table_number} numarali masanin QR kodu indirildi`);
  }, [qrCodes, generateQRForTable, showSuccess]);

  const handleBulkDownloadQR = useCallback(async () => {
    if (tables.length === 0) {
      showError('Indirilecek masa bulunamadi');
      return;
    }

    setIsBulkDownloading(true);

    try {
      // Generate high-res QR codes for all tables
      const qrCodePromises = tables.map(async (table) => {
        const url = generateTableUrl(baseUrl, organizationSlug, table.qr_uuid);
        const dataUrl = await generateQRCode(url, 512); // High resolution
        return {
          table,
          dataUrl,
        };
      });

      const results = await Promise.all(qrCodePromises);

      // Download each QR code with a small delay to prevent browser blocking
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (!result) continue;
        const { table, dataUrl } = result;
        const filename = `QR_Masa_${table.table_number}${table.table_name ? `_${table.table_name}` : ''}.png`;

        // Add small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 100 * i));
        downloadQRCode(dataUrl, filename);
      }

      showSuccess(`${results.length} adet QR kod basariyla indirildi`);
    } catch {
      showError('QR kodlar indirilirken hata olustu');
    } finally {
      setIsBulkDownloading(false);
    }
  }, [tables, baseUrl, organizationSlug, showSuccess, showError]);

  // =============================================================================
  // MODAL HANDLERS
  // =============================================================================

  const openAddModal = useCallback(() => {
    resetForm();
    setIsAddModalOpen(true);
  }, [resetForm]);

  const openEditModal = useCallback((table: RestaurantTable) => {
    setSelectedTable(table);
    setFormData({
      table_number: table.table_number,
      table_name: table.table_name || '',
      section: table.section || '',
      capacity: table.capacity?.toString() || '',
      current_status: table.current_status,
      is_active: table.is_active,
    });
    setIsEditModalOpen(true);
  }, []);

  const openDeleteModal = useCallback((table: RestaurantTable) => {
    setSelectedTable(table);
    setIsDeleteModalOpen(true);
  }, []);

  const openQRModal = useCallback((table: RestaurantTable) => {
    setSelectedTable(table);
    setIsQRModalOpen(true);
  }, []);

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Masalar</h1>
          <p className="text-gray-500 mt-1">
            Masalarinizi yonetin ve QR kodlari olusturun.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {tables.length > 0 && canEdit && (
            <Button
              variant="secondary"
              onClick={handleBulkDownloadQR}
              disabled={isBulkDownloading}
              className="flex items-center gap-2"
            >
              <Icons.DownloadAll />
              {isBulkDownloading ? 'Indiriliyor...' : 'Tum QR Kodlari Indir'}
            </Button>
          )}
          {canEdit && (
            <Button
              onClick={openAddModal}
              disabled={!currentLimit.canAdd && currentLimit.limit !== -1}
              className="flex items-center gap-2"
            >
              <Icons.Plus />
              Masa Ekle
            </Button>
          )}
        </div>
      </div>

      {/* Limit Warning Banner */}
      {currentLimit.shouldUpgrade && currentLimit.limit > 0 && (
        <LimitBanner
          featureKey="limit_tables"
          current={currentLimit.currentCount}
          limit={currentLimit.limit}
        />
      )}

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

      {/* Filters and Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Durum:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TableStatus | 'all')}
            className="input py-1.5 px-3 text-sm"
          >
            <option value="all">Tumu</option>
            {TABLE_STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {/* Section Filter */}
        {sections.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Bolum:</label>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="input py-1.5 px-3 text-sm"
            >
              <option value="all">Tumu</option>
              {sections.map(section => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
          </div>
        )}

        {/* Stats */}
        <div className="ml-auto flex items-center gap-4 text-sm text-gray-600">
          {currentLimit.limit > 0 && (
            <span>
              Masa kullanimi: {currentLimit.currentCount} / {currentLimit.limit}
            </span>
          )}
          {currentLimit.limit === -1 && (
            <span>Toplam: {tables.length} masa</span>
          )}
        </div>
      </div>

      {/* Tables Grid */}
      {filteredTables.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
            <Icons.Table />
          </div>
          <h3 className="text-lg font-medium text-gray-900">
            {tables.length === 0 ? 'Henuz masa yok' : 'Filtrelere uygun masa bulunamadi'}
          </h3>
          <p className="text-gray-500 mt-1 mb-4">
            {tables.length === 0
              ? 'QR kodlu masa eklemek icin "Masa Ekle" butonunu kullanin.'
              : 'Filtreleri degistirerek diger masalari gorebilirsiniz.'}
          </p>
          {canEdit && currentLimit.canAdd && tables.length === 0 && (
            <Button onClick={openAddModal}>
              <Icons.Plus />
              Ilk Masayi Ekle
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTables.map((table) => (
            <div
              key={table.id}
              className={`card p-4 flex flex-col ${
                !table.is_active ? 'opacity-60' : ''
              }`}
            >
              {/* Table Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Masa {table.table_number}
                    </h3>
                    {!table.is_active && (
                      <Badge variant="secondary" size="sm">Pasif</Badge>
                    )}
                  </div>
                  {table.table_name && (
                    <p className="text-sm text-gray-500">{table.table_name}</p>
                  )}
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(table.current_status)}`}>
                  {getStatusLabel(table.current_status)}
                </span>
              </div>

              {/* Table Info */}
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                {table.section && (
                  <span>{table.section}</span>
                )}
                {table.capacity && (
                  <span className="flex items-center gap-1">
                    <Icons.Users />
                    {table.capacity} kisi
                  </span>
                )}
              </div>

              {/* QR Code Preview - Using img for data URL (base64), next/image doesn't support data URLs */}
              <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg p-4 mb-4">
                {qrCodes.get(table.id) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrCodes.get(table.id)}
                    alt={`QR kod - Masa ${table.table_number}`}
                    className="w-32 h-32"
                  />
                ) : (
                  <div className="w-32 h-32 flex items-center justify-center text-gray-400">
                    <Icons.QRCode />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openQRModal(table)}
                  className="flex-1 flex items-center justify-center gap-1"
                >
                  <Icons.QRCode />
                  QR Kod
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDownloadQR(table)}
                  className="flex items-center justify-center"
                  title="QR Kodu Indir"
                >
                  <Icons.Download />
                </Button>
                {canEdit && (
                  <>
                    <button
                      onClick={() => openEditModal(table)}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Duzenle"
                    >
                      <Icons.Edit />
                    </button>
                    <button
                      onClick={() => openDeleteModal(table)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Sil"
                    >
                      <Icons.Trash />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Table Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          resetForm();
        }}
        title="Yeni Masa"
        description="Yeni bir masa ekleyin ve QR kod olusturun"
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setIsAddModalOpen(false);
                resetForm();
              }}
              disabled={isLoading}
            >
              Iptal
            </Button>
            <Button
              onClick={handleAddTable}
              disabled={isLoading || !formData.table_number.trim()}
            >
              {isLoading ? 'Ekleniyor...' : 'Ekle'}
            </Button>
          </>
        }
      >
        <TableForm formData={formData} setFormData={setFormData} />
      </Modal>

      {/* Edit Table Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          resetForm();
        }}
        title="Masa Duzenle"
        description={`Masa ${selectedTable?.table_number}`}
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditModalOpen(false);
                resetForm();
              }}
              disabled={isLoading}
            >
              Iptal
            </Button>
            <Button
              onClick={handleEditTable}
              disabled={isLoading || !formData.table_number.trim()}
            >
              {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </>
        }
      >
        <TableForm formData={formData} setFormData={setFormData} />
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedTable(null);
        }}
        onConfirm={handleDeleteTable}
        title="Masayi Sil"
        message={
          <span>
            <strong>Masa {selectedTable?.table_number}</strong> silmek istediginize emin misiniz?
            Bu islem geri alinamaz ve QR kod gecersiz olur.
          </span>
        }
        confirmText="Sil"
        cancelText="Iptal"
        variant="danger"
        isLoading={isLoading}
      />

      {/* QR Code Modal */}
      <Modal
        isOpen={isQRModalOpen}
        onClose={() => {
          setIsQRModalOpen(false);
          setSelectedTable(null);
        }}
        title={`QR Kod - Masa ${selectedTable?.table_number}`}
        description={selectedTable?.table_name || undefined}
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setIsQRModalOpen(false);
                setSelectedTable(null);
              }}
            >
              Kapat
            </Button>
            {selectedTable && (
              <Button
                onClick={() => handleDownloadQR(selectedTable)}
                className="flex items-center gap-2"
              >
                <Icons.Download />
                Indir
              </Button>
            )}
          </>
        }
      >
        {selectedTable && (
          <QRCodeDisplay
            table={selectedTable}
            qrCodeDataUrl={qrCodes.get(selectedTable.id)}
            baseUrl={baseUrl}
            organizationSlug={organizationSlug}
            onCopyUrl={copyToClipboard}
            copiedUrl={copiedUrl}
          />
        )}
      </Modal>
    </div>
  );
}

// =============================================================================
// TABLE FORM COMPONENT
// =============================================================================

interface TableFormProps {
  formData: TableFormData;
  setFormData: React.Dispatch<React.SetStateAction<TableFormData>>;
}

function TableForm({ formData, setFormData }: TableFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="table_number" className="label">
          Masa Numarasi *
        </label>
        <Input
          id="table_number"
          value={formData.table_number}
          onChange={(e) => setFormData(prev => ({ ...prev, table_number: e.target.value }))}
          placeholder="Ornegin: 1, A1, VIP-1"
          autoFocus
        />
        <p className="text-xs text-gray-500 mt-1">
          Her masa icin benzersiz bir numara veya kod girin
        </p>
      </div>

      <div>
        <label htmlFor="table_name" className="label">
          Masa Ismi (Opsiyonel)
        </label>
        <Input
          id="table_name"
          value={formData.table_name}
          onChange={(e) => setFormData(prev => ({ ...prev, table_name: e.target.value }))}
          placeholder="Ornegin: Pencere Kenari, Bahce"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="section" className="label">
            Bolum (Opsiyonel)
          </label>
          <Input
            id="section"
            value={formData.section}
            onChange={(e) => setFormData(prev => ({ ...prev, section: e.target.value }))}
            placeholder="Ornegin: Teras, 1. Kat"
          />
        </div>
        <div>
          <label htmlFor="capacity" className="label">
            Kapasite
          </label>
          <Input
            id="capacity"
            type="number"
            min="1"
            value={formData.capacity}
            onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
            placeholder="Kisi sayisi"
          />
        </div>
      </div>

      <div>
        <label htmlFor="current_status" className="label">
          Durum
        </label>
        <select
          id="current_status"
          value={formData.current_status}
          onChange={(e) => setFormData(prev => ({ ...prev, current_status: e.target.value as TableStatus }))}
          className="input w-full"
        >
          {TABLE_STATUS_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <label htmlFor="is_active" className="text-sm text-gray-700">
          Aktif (QR kod taranabilir)
        </label>
      </div>
    </div>
  );
}

// =============================================================================
// QR CODE DISPLAY COMPONENT
// =============================================================================

interface QRCodeDisplayProps {
  table: RestaurantTable;
  qrCodeDataUrl: string | undefined;
  baseUrl: string;
  organizationSlug: string;
  onCopyUrl: (url: string, tableId: string) => void;
  copiedUrl: string | null;
}

function QRCodeDisplay({
  table,
  qrCodeDataUrl,
  baseUrl,
  organizationSlug,
  onCopyUrl,
  copiedUrl,
}: QRCodeDisplayProps) {
  const menuUrl = generateTableUrl(baseUrl, organizationSlug, table.qr_uuid);

  return (
    <div className="space-y-4">
      {/* QR Code Image - Using img for data URL (base64), next/image doesn't support data URLs */}
      <div className="flex justify-center bg-white p-6 rounded-lg border border-gray-200">
        {qrCodeDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrCodeDataUrl}
            alt={`QR kod - Masa ${table.table_number}`}
            className="w-64 h-64"
          />
        ) : (
          <div className="w-64 h-64 flex items-center justify-center text-gray-400">
            QR kod yukleniyor...
          </div>
        )}
      </div>

      {/* Table Info */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Masa Bilgileri</h4>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-gray-500">Numara:</dt>
          <dd className="text-gray-900 font-medium">{table.table_number}</dd>
          {table.table_name && (
            <>
              <dt className="text-gray-500">Isim:</dt>
              <dd className="text-gray-900">{table.table_name}</dd>
            </>
          )}
          {table.section && (
            <>
              <dt className="text-gray-500">Bolum:</dt>
              <dd className="text-gray-900">{table.section}</dd>
            </>
          )}
          {table.capacity && (
            <>
              <dt className="text-gray-500">Kapasite:</dt>
              <dd className="text-gray-900">{table.capacity} kisi</dd>
            </>
          )}
        </dl>
      </div>

      {/* Menu URL */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Menu URL</h4>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-white p-2 rounded border border-gray-200 break-all">
            {menuUrl}
          </code>
          <button
            onClick={() => onCopyUrl(menuUrl, table.id)}
            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-white rounded-lg transition-colors"
            title="URL Kopyala"
          >
            {copiedUrl === table.id ? (
              <Icons.Check />
            ) : (
              <Icons.Copy />
            )}
          </button>
          <a
            href={menuUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-white rounded-lg transition-colors"
            title="Menuyu Ac"
          >
            <Icons.ExternalLink />
          </a>
        </div>
        {copiedUrl === table.id && (
          <p className="text-xs text-green-600 mt-1">URL kopyalandi!</p>
        )}
      </div>

      {/* QR UUID Info */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-1">QR Kod UUID</h4>
        <code className="text-xs text-blue-700 break-all">{table.qr_uuid}</code>
        <p className="text-xs text-blue-600 mt-2">
          Bu benzersiz kimlik, QR kodun icinde saklidir ve tahmin edilemez.
          Gizlilik icin ardisik sayilar yerine UUID kullanilir.
        </p>
      </div>
    </div>
  );
}
