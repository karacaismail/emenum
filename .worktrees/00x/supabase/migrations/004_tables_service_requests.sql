-- ============================================================================
-- 004_tables_service_requests.sql
-- Restaurant Table Management & Waiter Calling System
-- Tables: restaurant_tables, service_requests
-- ============================================================================

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Table status enum
-- available: Masa bos, musteri bekliyor
-- occupied: Masa dolu, musteri var
-- reserved: Masa rezerve edilmis
-- needs_service: Musteri servis bekliyor (garson cagrildi)
CREATE TYPE table_status AS ENUM ('available', 'occupied', 'reserved', 'needs_service');

-- Service request type enum
-- waiter_call: Garson cagirma
-- bill_request: Hesap isteme
-- other: Diger istekler
CREATE TYPE service_request_type AS ENUM ('waiter_call', 'bill_request', 'other');

-- Service request status enum
-- pending: Beklemede, henuz gorulmedi
-- acknowledged: Goruldu, uzerinde calisiliyor
-- completed: Tamamlandi
-- cancelled: Iptal edildi
CREATE TYPE service_request_status AS ENUM ('pending', 'acknowledged', 'completed', 'cancelled');

-- ============================================================================
-- RESTAURANT_TABLES TABLE
-- Masa yonetimi ve QR kod sistemi
-- ============================================================================

CREATE TABLE restaurant_tables (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign keys
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- QR Code UUID - Benzersiz, tahmin edilemez UUID
    -- URL'de table_id yerine bu kullanilir: /menu/{slug}?table_id={qr_uuid}
    -- KRITIK: Ardisik sayi (1, 2, 3) KULLANMA! UUID kullan.
    qr_uuid UUID NOT NULL DEFAULT uuid_generate_v4(),

    -- Table identification
    table_number TEXT NOT NULL,               -- Gosterim icin masa numarasi (1, 2, 3 veya A1, B2)
    table_name TEXT,                          -- Opsiyonel isim (Pencere Kenarı, Bahce vb.)
    section TEXT,                             -- Bolum/Alan (Kat 1, Teras, Bahce vb.)
    capacity INTEGER,                         -- Kisi kapasitesi

    -- Status tracking
    current_status table_status NOT NULL DEFAULT 'available',

    -- Spam prevention - Son garson cagirma zamani
    -- 30 saniye cooldown kontrolu icin kullanilir
    last_ping_at TIMESTAMPTZ,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT restaurant_tables_qr_uuid_unique UNIQUE (qr_uuid),
    CONSTRAINT restaurant_tables_org_table_number_unique UNIQUE (organization_id, table_number),
    CONSTRAINT restaurant_tables_table_number_length CHECK (char_length(table_number) >= 1 AND char_length(table_number) <= 20),
    CONSTRAINT restaurant_tables_table_name_length CHECK (table_name IS NULL OR char_length(table_name) <= 50),
    CONSTRAINT restaurant_tables_section_length CHECK (section IS NULL OR char_length(section) <= 50),
    CONSTRAINT restaurant_tables_capacity_positive CHECK (capacity IS NULL OR capacity > 0)
);

-- Indexes for restaurant_tables
CREATE INDEX idx_restaurant_tables_organization_id ON restaurant_tables (organization_id);
CREATE INDEX idx_restaurant_tables_qr_uuid ON restaurant_tables (qr_uuid);
CREATE INDEX idx_restaurant_tables_status ON restaurant_tables (organization_id, current_status);
CREATE INDEX idx_restaurant_tables_active ON restaurant_tables (organization_id, is_active) WHERE is_active = true;
CREATE INDEX idx_restaurant_tables_section ON restaurant_tables (organization_id, section) WHERE section IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER trigger_restaurant_tables_updated_at
    BEFORE UPDATE ON restaurant_tables
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE restaurant_tables IS 'Restoran masalari. Her masa benzersiz QR UUID''ye sahiptir. QR kod bu UUID''yi icerir.';
COMMENT ON COLUMN restaurant_tables.qr_uuid IS 'QR kodda kullanilan benzersiz UUID. URL: /menu/{slug}?table_id={qr_uuid}. Gizlilik icin ardisik sayi yerine UUID kullanilir.';
COMMENT ON COLUMN restaurant_tables.table_number IS 'Gosterim icin masa numarasi. Ornek: "1", "2", "A1", "B2"';
COMMENT ON COLUMN restaurant_tables.table_name IS 'Opsiyonel masa ismi. Ornek: "Pencere Kenari", "VIP Bolumu"';
COMMENT ON COLUMN restaurant_tables.section IS 'Masanin bulundugu bolum. Ornek: "Teras", "1. Kat", "Bahce"';
COMMENT ON COLUMN restaurant_tables.capacity IS 'Masanin kisi kapasitesi.';
COMMENT ON COLUMN restaurant_tables.current_status IS 'available: Bos, occupied: Dolu, reserved: Rezerve, needs_service: Servis bekliyor';
COMMENT ON COLUMN restaurant_tables.last_ping_at IS 'Son garson cagirma zamani. Spam onlemek icin 30 saniye cooldown kontrolu yapilir.';
COMMENT ON COLUMN restaurant_tables.is_active IS 'false yapilarak masa gecici olarak devre disi birakilabilir.';

-- ============================================================================
-- SERVICE_REQUESTS TABLE
-- Garson cagirma ve servis istekleri
-- ============================================================================

CREATE TABLE service_requests (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign keys
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES restaurant_tables(id) ON DELETE CASCADE,

    -- Request details
    request_type service_request_type NOT NULL DEFAULT 'waiter_call',
    status service_request_status NOT NULL DEFAULT 'pending',
    notes TEXT,                               -- Opsiyonel notlar (ozel istekler vb.)

    -- Handling info
    handled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- Istegi karsilayan garson
    handled_at TIMESTAMPTZ,                   -- Istegit karsilama zamani

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT service_requests_notes_length CHECK (notes IS NULL OR char_length(notes) <= 500),
    CONSTRAINT service_requests_handled_consistency CHECK (
        (status IN ('completed', 'cancelled') AND handled_at IS NOT NULL)
        OR status IN ('pending', 'acknowledged')
    )
);

-- Indexes for service_requests
CREATE INDEX idx_service_requests_organization_id ON service_requests (organization_id);
CREATE INDEX idx_service_requests_table_id ON service_requests (table_id);
CREATE INDEX idx_service_requests_status ON service_requests (organization_id, status);
CREATE INDEX idx_service_requests_pending ON service_requests (organization_id, created_at DESC) WHERE status = 'pending';
CREATE INDEX idx_service_requests_created_at ON service_requests (created_at DESC);
CREATE INDEX idx_service_requests_handled_by ON service_requests (handled_by) WHERE handled_by IS NOT NULL;

-- Comments
COMMENT ON TABLE service_requests IS 'Servis istekleri (garson cagirma, hesap isteme vb.). Supabase Realtime ile anlik bildirim gonderilir.';
COMMENT ON COLUMN service_requests.request_type IS 'waiter_call: Garson cagirma, bill_request: Hesap isteme, other: Diger';
COMMENT ON COLUMN service_requests.status IS 'pending: Beklemede, acknowledged: Goruldu, completed: Tamamlandi, cancelled: Iptal';
COMMENT ON COLUMN service_requests.notes IS 'Musterinin opsiyonel notu. Ornek: "Bebeğimiz için mama sandalyesi lazım"';
COMMENT ON COLUMN service_requests.handled_by IS 'Istegi karsilayan garsonun user ID''si.';
COMMENT ON COLUMN service_requests.handled_at IS 'Istegin tamamlanma veya iptal zamani.';

-- ============================================================================
-- HELPER FUNCTION: Get table by QR UUID
-- QR kod tarandiginda masa bilgilerini almak icin
-- ============================================================================

CREATE OR REPLACE FUNCTION get_table_by_qr_uuid(p_qr_uuid UUID)
RETURNS TABLE (
    table_id UUID,
    organization_id UUID,
    organization_slug TEXT,
    table_number TEXT,
    table_name TEXT,
    current_status table_status
) AS $$
    SELECT
        rt.id,
        rt.organization_id,
        o.slug,
        rt.table_number,
        rt.table_name,
        rt.current_status
    FROM restaurant_tables rt
    JOIN organizations o ON o.id = rt.organization_id
    WHERE rt.qr_uuid = p_qr_uuid
      AND rt.is_active = true
      AND o.status = 'active';
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_table_by_qr_uuid IS 'QR UUID ile masa bilgilerini alir. Aktif olmayan masalar ve organizasyonlar dondurulmez.';

-- ============================================================================
-- HELPER FUNCTION: Check cooldown for service request
-- Spam onlemek icin 30 saniye cooldown kontrolu
-- ============================================================================

CREATE OR REPLACE FUNCTION can_create_service_request(
    p_table_id UUID,
    p_cooldown_seconds INTEGER DEFAULT 30
)
RETURNS BOOLEAN AS $$
DECLARE
    v_last_ping TIMESTAMPTZ;
BEGIN
    -- Son ping zamanini al
    SELECT last_ping_at INTO v_last_ping
    FROM restaurant_tables
    WHERE id = p_table_id;

    -- Hic ping yapilmamissa izin ver
    IF v_last_ping IS NULL THEN
        RETURN true;
    END IF;

    -- Cooldown suresi gectiyse izin ver
    RETURN v_last_ping + (p_cooldown_seconds || ' seconds')::INTERVAL < NOW();
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION can_create_service_request IS 'Masanin servis istegi olusturabilecegini kontrol eder. Spam onlemek icin cooldown kontrolu yapar.';

-- ============================================================================
-- HELPER FUNCTION: Create service request with cooldown check
-- Garson cagirma istegi olusturur, cooldown ve limit kontrolleri yapar
-- ============================================================================

CREATE OR REPLACE FUNCTION create_service_request(
    p_qr_uuid UUID,
    p_request_type service_request_type DEFAULT 'waiter_call',
    p_notes TEXT DEFAULT NULL,
    p_cooldown_seconds INTEGER DEFAULT 30
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    request_id UUID
) AS $$
DECLARE
    v_table_record RECORD;
    v_can_create BOOLEAN;
    v_has_waiter_call BOOLEAN;
    v_new_request_id UUID;
BEGIN
    -- 1. Masayi bul
    SELECT rt.id, rt.organization_id, rt.last_ping_at
    INTO v_table_record
    FROM restaurant_tables rt
    JOIN organizations o ON o.id = rt.organization_id
    WHERE rt.qr_uuid = p_qr_uuid
      AND rt.is_active = true
      AND o.status = 'active';

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Masa bulunamadi veya aktif degil.', NULL::UUID;
        RETURN;
    END IF;

    -- 2. Organizasyonun waiter_call ozelligine sahip oldugunu kontrol et
    v_has_waiter_call := has_feature(v_table_record.organization_id, 'module_waiter_call');
    IF NOT v_has_waiter_call THEN
        RETURN QUERY SELECT false, 'Bu ozellik mevcut paketinizde aktif degil.', NULL::UUID;
        RETURN;
    END IF;

    -- 3. Cooldown kontrolu
    v_can_create := can_create_service_request(v_table_record.id, p_cooldown_seconds);
    IF NOT v_can_create THEN
        RETURN QUERY SELECT false, 'Lutfen ' || p_cooldown_seconds || ' saniye bekleyin.', NULL::UUID;
        RETURN;
    END IF;

    -- 4. Servis istegi olustur
    INSERT INTO service_requests (organization_id, table_id, request_type, notes)
    VALUES (v_table_record.organization_id, v_table_record.id, p_request_type, p_notes)
    RETURNING id INTO v_new_request_id;

    -- 5. Masanin last_ping_at ve current_status'unu guncelle
    UPDATE restaurant_tables
    SET last_ping_at = NOW(),
        current_status = 'needs_service',
        updated_at = NOW()
    WHERE id = v_table_record.id;

    RETURN QUERY SELECT true, 'Servis isteginiz iletildi.', v_new_request_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

COMMENT ON FUNCTION create_service_request IS 'QR UUID ile servis istegi olusturur. Cooldown ve ozellik kontrolu yapar. Realtime bildirim icin service_requests tablosuna INSERT yapar.';

-- ============================================================================
-- HELPER FUNCTION: Mark service request as handled
-- Garson istegi tamamladiginda cagrilir
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_service_request(
    p_request_id UUID,
    p_new_status service_request_status,
    p_handler_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_table_id UUID;
    v_pending_count INTEGER;
BEGIN
    -- 1. Istegi guncelle
    UPDATE service_requests
    SET status = p_new_status,
        handled_by = COALESCE(p_handler_id, auth.uid()),
        handled_at = CASE WHEN p_new_status IN ('completed', 'cancelled') THEN NOW() ELSE handled_at END
    WHERE id = p_request_id
    RETURNING table_id INTO v_table_id;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- 2. Bu masa icin bekleyen baska istek var mi kontrol et
    SELECT COUNT(*) INTO v_pending_count
    FROM service_requests
    WHERE table_id = v_table_id
      AND status = 'pending';

    -- 3. Bekleyen istek yoksa masanin durumunu guncelle
    IF v_pending_count = 0 THEN
        UPDATE restaurant_tables
        SET current_status = 'occupied',  -- veya 'available' yapilabilir, is mantığina gore
            updated_at = NOW()
        WHERE id = v_table_id
          AND current_status = 'needs_service';
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

COMMENT ON FUNCTION handle_service_request IS 'Servis istegini tamamlar veya iptal eder. Masa durumunu otomatik gunceller.';

-- ============================================================================
-- HELPER FUNCTION: Get pending service requests for organization
-- Garson panelinde gosterilecek bekleyen istekler
-- ============================================================================

CREATE OR REPLACE FUNCTION get_pending_service_requests(p_organization_id UUID)
RETURNS TABLE (
    request_id UUID,
    table_id UUID,
    table_number TEXT,
    table_name TEXT,
    section TEXT,
    request_type service_request_type,
    notes TEXT,
    created_at TIMESTAMPTZ,
    waiting_seconds INTEGER
) AS $$
    SELECT
        sr.id,
        sr.table_id,
        rt.table_number,
        rt.table_name,
        rt.section,
        sr.request_type,
        sr.notes,
        sr.created_at,
        EXTRACT(EPOCH FROM (NOW() - sr.created_at))::INTEGER
    FROM service_requests sr
    JOIN restaurant_tables rt ON rt.id = sr.table_id
    WHERE sr.organization_id = p_organization_id
      AND sr.status = 'pending'
    ORDER BY sr.created_at ASC;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_pending_service_requests IS 'Organizasyonun bekleyen servis isteklerini listeler. Garson panelinde kullanilir.';

-- ============================================================================
-- HELPER FUNCTION: Get table statistics for organization
-- Dashboard'da gosterilecek masa istatistikleri
-- ============================================================================

CREATE OR REPLACE FUNCTION get_table_statistics(p_organization_id UUID)
RETURNS TABLE (
    total_tables INTEGER,
    available_tables INTEGER,
    occupied_tables INTEGER,
    reserved_tables INTEGER,
    needs_service_tables INTEGER,
    pending_requests INTEGER
) AS $$
    SELECT
        COUNT(*)::INTEGER,
        COUNT(*) FILTER (WHERE current_status = 'available')::INTEGER,
        COUNT(*) FILTER (WHERE current_status = 'occupied')::INTEGER,
        COUNT(*) FILTER (WHERE current_status = 'reserved')::INTEGER,
        COUNT(*) FILTER (WHERE current_status = 'needs_service')::INTEGER,
        (SELECT COUNT(*) FROM service_requests sr
         WHERE sr.organization_id = p_organization_id AND sr.status = 'pending')::INTEGER
    FROM restaurant_tables
    WHERE organization_id = p_organization_id
      AND is_active = true;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_table_statistics IS 'Organizasyonun masa istatistiklerini dondurur. Dashboard''da kullanilir.';
