/**
 * Categories Client Component
 *
 * CRUD islemleri, surukle-birak siralama ve limit kontrolu icin
 * client-side component.
 *
 * Ozellikler:
 * - Kategori ekleme (modal ile)
 * - Kategori duzenleme (modal ile)
 * - Kategori silme (onay ile)
 * - Surukle-birak siralama (drag-drop)
 * - Limit uyarisi (Lite plan icin 3 kategori)
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Modal, ConfirmModal, Button, Input, Badge } from '@/components/ui';
import { LimitBanner } from '@/components/ui/UpgradePrompt';
import type { Category, CategoryInsert, CategoryUpdate } from '@/types/database';

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

interface CategoriesClientProps {
  initialCategories: Category[];
  organizationId: string;
  limitCheck: LimitCheckInfo;
  userRole: string;
}

interface CategoryFormData {
  name: string;
  description: string;
  is_active: boolean;
}

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
  GripVertical: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" />
    </svg>
  ),
  Empty: () => (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
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
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CategoriesClient({
  initialCategories,
  organizationId,
  limitCheck,
  userRole,
}: CategoriesClientProps) {
  // State
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [currentLimit, setCurrentLimit] = useState<LimitCheckInfo>(limitCheck);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    is_active: true,
  });

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);

  // Check if user can edit (manager+ roles)
  const canEdit = ['owner', 'admin', 'manager'].includes(userRole);

  // Supabase client
  const supabase = createClient();

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
      name: '',
      description: '',
      is_active: true,
    });
    setSelectedCategory(null);
    setError(null);
  }, []);

  const updateLimitCheck = useCallback(() => {
    const newCount = categories.length;
    const canAdd = currentLimit.limit === -1 || newCount < currentLimit.limit;
    const remaining = currentLimit.limit === -1 ? -1 : Math.max(0, currentLimit.limit - newCount);

    setCurrentLimit(prev => ({
      ...prev,
      currentCount: newCount,
      canAdd,
      remaining,
      shouldUpgrade: currentLimit.limit > 0 && (newCount / currentLimit.limit) >= 0.8,
    }));
  }, [categories.length, currentLimit.limit]);

  // =============================================================================
  // CRUD OPERATIONS
  // =============================================================================

  const handleAddCategory = useCallback(async () => {
    if (!formData.name.trim()) {
      showError('Kategori adi zorunludur');
      return;
    }

    // Limit kontrolu
    if (!currentLimit.canAdd && currentLimit.limit !== -1) {
      showError(`Kategori limitine ulastiniz (${currentLimit.currentCount}/${currentLimit.limit}). Paketinizi yukseltin.`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Yeni sort_order hesapla
      const maxSortOrder = categories.length > 0
        ? Math.max(...categories.map(c => c.sort_order))
        : 0;

      const newCategory: CategoryInsert = {
        organization_id: organizationId,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        sort_order: maxSortOrder + 1,
        is_active: formData.is_active,
      };

      const { data, error: insertError } = await supabase
        .from('categories')
        .insert(newCategory)
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      // Listeye ekle
      setCategories(prev => [...prev, data as Category]);
      updateLimitCheck();

      // Modal kapat ve formu sifirla
      setIsAddModalOpen(false);
      resetForm();
      showSuccess('Kategori basariyla eklendi');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Kategori eklenirken hata olustu');
    } finally {
      setIsLoading(false);
    }
  }, [formData, currentLimit, categories, organizationId, supabase, showError, showSuccess, resetForm, updateLimitCheck]);

  const handleEditCategory = useCallback(async () => {
    if (!selectedCategory) return;

    if (!formData.name.trim()) {
      showError('Kategori adi zorunludur');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const updateData: CategoryUpdate = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('categories')
        .update(updateData)
        .eq('id', selectedCategory.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Listeyi guncelle
      setCategories(prev => prev.map(cat =>
        cat.id === selectedCategory.id
          ? { ...cat, ...updateData }
          : cat
      ));

      // Modal kapat ve formu sifirla
      setIsEditModalOpen(false);
      resetForm();
      showSuccess('Kategori basariyla guncellendi');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Kategori guncellenirken hata olustu');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, formData, supabase, showError, showSuccess, resetForm]);

  const handleDeleteCategory = useCallback(async () => {
    if (!selectedCategory) return;

    setIsLoading(true);
    setError(null);

    try {
      // Kategoride urun var mi kontrol et
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', selectedCategory.id);

      if (count && count > 0) {
        throw new Error(`Bu kategoride ${count} urun bulunuyor. Once urunleri baska kategoriye tasiyiniz.`);
      }

      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', selectedCategory.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      // Listeden kaldir
      setCategories(prev => prev.filter(cat => cat.id !== selectedCategory.id));
      updateLimitCheck();

      // Modal kapat
      setIsDeleteModalOpen(false);
      setSelectedCategory(null);
      showSuccess('Kategori basariyla silindi');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Kategori silinirken hata olustu');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, supabase, showError, showSuccess, updateLimitCheck]);

  // =============================================================================
  // DRAG AND DROP HANDLERS
  // =============================================================================

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
    dragRef.current = index;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragRef.current !== null && dragRef.current !== index) {
      setDragOverIndex(index);
    }
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(async (targetIndex: number) => {
    if (dragRef.current === null || dragRef.current === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      dragRef.current = null;
      return;
    }

    const sourceIndex = dragRef.current;
    const newCategories = [...categories];
    const [movedItem] = newCategories.splice(sourceIndex, 1);
    if (!movedItem) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      dragRef.current = null;
      return;
    }
    newCategories.splice(targetIndex, 0, movedItem);

    // Update sort_order for all items
    const updatedCategories = newCategories.map((cat, idx) => ({
      ...cat,
      sort_order: idx + 1,
    }));

    // Optimistic update
    setCategories(updatedCategories);
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragRef.current = null;

    // Persist to database
    try {
      const updates = updatedCategories.map(cat => ({
        id: cat.id,
        sort_order: cat.sort_order,
      }));

      // Update each category's sort_order
      for (const update of updates) {
        const { error } = await supabase
          .from('categories')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);

        if (error) {
          throw new Error(error.message);
        }
      }

      showSuccess('Siralama guncellendi');
    } catch {
      // Rollback on error
      setCategories(categories);
      showError('Siralama guncellenirken hata olustu');
    }
  }, [categories, supabase, showError, showSuccess]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragRef.current = null;
  }, []);

  // =============================================================================
  // MODAL HANDLERS
  // =============================================================================

  const openAddModal = useCallback(() => {
    resetForm();
    setIsAddModalOpen(true);
  }, [resetForm]);

  const openEditModal = useCallback((category: Category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      is_active: category.is_active,
    });
    setIsEditModalOpen(true);
  }, []);

  const openDeleteModal = useCallback((category: Category) => {
    setSelectedCategory(category);
    setIsDeleteModalOpen(true);
  }, []);

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kategoriler</h1>
          <p className="text-gray-500 mt-1">
            Menunuzdeki kategorileri yonetin ve siralayin.
          </p>
        </div>
        {canEdit && (
          <Button
            onClick={openAddModal}
            disabled={!currentLimit.canAdd && currentLimit.limit !== -1}
            className="flex items-center gap-2"
          >
            <Icons.Plus />
            Kategori Ekle
          </Button>
        )}
      </div>

      {/* Limit Warning Banner */}
      {currentLimit.shouldUpgrade && currentLimit.limit > 0 && (
        <LimitBanner
          featureKey="limit_categories"
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

      {/* Limit Info */}
      {currentLimit.limit > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>
            Kategori kullanimi: {currentLimit.currentCount} / {currentLimit.limit}
          </span>
          {currentLimit.remaining > 0 && currentLimit.limit !== -1 && (
            <Badge variant="info" size="sm">
              {currentLimit.remaining} kalan
            </Badge>
          )}
          {currentLimit.limit !== -1 && currentLimit.remaining === 0 && (
            <Badge variant="warning" size="sm">
              Limit doldu
            </Badge>
          )}
        </div>
      )}

      {/* Categories List */}
      {categories.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
            <Icons.Empty />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Henuz kategori yok</h3>
          <p className="text-gray-500 mt-1 mb-4">
            Menuye urun eklemek icin once kategori olusturun.
          </p>
          {canEdit && currentLimit.canAdd && (
            <Button onClick={openAddModal}>
              <Icons.Plus />
              Ilk Kategoriyi Ekle
            </Button>
          )}
        </div>
      ) : (
        <div className="card divide-y divide-gray-100">
          {categories.map((category, index) => (
            <div
              key={category.id}
              draggable={canEdit}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
              className={`
                flex items-center gap-4 p-4 transition-all
                ${draggedIndex === index ? 'opacity-50 bg-gray-50' : ''}
                ${dragOverIndex === index ? 'bg-primary-50 border-t-2 border-primary-500' : ''}
                ${canEdit ? 'cursor-grab active:cursor-grabbing' : ''}
              `}
            >
              {/* Drag Handle */}
              {canEdit && (
                <div className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                  <Icons.GripVertical />
                </div>
              )}

              {/* Category Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {category.name}
                  </h3>
                  {!category.is_active && (
                    <Badge variant="secondary" size="sm">
                      Pasif
                    </Badge>
                  )}
                </div>
                {category.description && (
                  <p className="text-sm text-gray-500 truncate mt-0.5">
                    {category.description}
                  </p>
                )}
              </div>

              {/* Sort Order Badge */}
              <div className="flex-shrink-0">
                <Badge variant="default" size="sm">
                  #{category.sort_order}
                </Badge>
              </div>

              {/* Actions */}
              {canEdit && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEditModal(category)}
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="Duzenle"
                  >
                    <Icons.Edit />
                  </button>
                  <button
                    onClick={() => openDeleteModal(category)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Sil"
                  >
                    <Icons.Trash />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drag Instructions */}
      {canEdit && categories.length > 1 && (
        <p className="text-sm text-gray-500 text-center">
          Kategorileri surukleyerek siralayabilirsiniz.
        </p>
      )}

      {/* Add Category Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          resetForm();
        }}
        title="Yeni Kategori"
        description="Menuye yeni bir kategori ekleyin"
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
              onClick={handleAddCategory}
              disabled={isLoading || !formData.name.trim()}
            >
              {isLoading ? 'Ekleniyor...' : 'Ekle'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="label">
              Kategori Adi *
            </label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ornegin: Sicak Icecekler"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="description" className="label">
              Aciklama
            </label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Kategori hakkinda kisa bir aciklama"
            />
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
              Aktif (Menude gorunsun)
            </label>
          </div>
        </div>
      </Modal>

      {/* Edit Category Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          resetForm();
        }}
        title="Kategori Duzenle"
        description={selectedCategory?.name}
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
              onClick={handleEditCategory}
              disabled={isLoading || !formData.name.trim()}
            >
              {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="edit-name" className="label">
              Kategori Adi *
            </label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ornegin: Sicak Icecekler"
            />
          </div>
          <div>
            <label htmlFor="edit-description" className="label">
              Aciklama
            </label>
            <Input
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Kategori hakkinda kisa bir aciklama"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="edit-is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="edit-is_active" className="text-sm text-gray-700">
              Aktif (Menude gorunsun)
            </label>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedCategory(null);
        }}
        onConfirm={handleDeleteCategory}
        title="Kategoriyi Sil"
        message={
          <span>
            <strong>{selectedCategory?.name}</strong> kategorisini silmek istediginize emin misiniz?
            Bu islem geri alinamaz.
          </span>
        }
        confirmText="Sil"
        cancelText="Iptal"
        variant="danger"
        isLoading={isLoading}
      />
    </div>
  );
}
