#!/bin/bash

# ===========================================
# init.sh - Ozon QR Menu & Dijital Fiyat Defteri
# Development Environment Setup Script
# ===========================================
# Bu script projeyi kurulum icin gerekli adimlari otomatik olarak yapar:
# 1. Gereksinimleri kontrol eder (Node.js, npm, Supabase CLI)
# 2. .env.local.example dosyasini .env.local olarak kopyalar
# 3. npm install ile bagimliliklari kurar
# 4. Supabase migration'larini uygular (eger Supabase CLI kurulu ise)
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Icons
CHECK_MARK="\xE2\x9C\x94"
CROSS_MARK="\xE2\x9C\x98"
WARNING_MARK="\xE2\x9A\xA0"
ARROW="\xE2\x9E\x9C"

# Print header
print_header() {
    echo ""
    echo -e "${CYAN}========================================"
    echo "   Ozon QR Menu & Dijital Fiyat Defteri"
    echo "   Kurulum Scripti"
    echo -e "========================================${NC}"
    echo ""
}

# Print step header
print_step() {
    local step_num=$1
    local step_name=$2
    echo ""
    echo -e "${BLUE}${ARROW} Adim $step_num: $step_name${NC}"
    echo "----------------------------------------"
}

# Print success message
print_success() {
    echo -e "${GREEN}${CHECK_MARK} $1${NC}"
}

# Print error message
print_error() {
    echo -e "${RED}${CROSS_MARK} $1${NC}"
}

# Print warning message
print_warning() {
    echo -e "${YELLOW}${WARNING_MARK} $1${NC}"
}

# Print info message
print_info() {
    echo -e "${BLUE}  $1${NC}"
}

# ===========================================
# STEP 1: Check Prerequisites
# ===========================================

check_prerequisites() {
    print_step "1" "Gereksinimleri Kontrol Etme"

    local all_ok=true

    # Check Node.js
    echo -e "\n${BLUE}Node.js kontrol ediliyor...${NC}"
    if ! command -v node &> /dev/null; then
        print_error "Node.js bulunamadi!"
        print_info "Lutfen Node.js 20.9 veya ustu yukleyin: https://nodejs.org"
        all_ok=false
    else
        NODE_VERSION=$(node -v | cut -d'v' -f2)
        REQUIRED_VERSION="20.9.0"

        # Compare versions
        if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
            print_error "Node.js surumu $NODE_VERSION cok eski!"
            print_info "Gereken minimum surum: 20.9"
            print_info "Lutfen Node.js'i guncelleyin: https://nodejs.org"
            all_ok=false
        else
            print_success "Node.js $NODE_VERSION (>= 20.9 gerekli)"
        fi
    fi

    # Check npm
    echo -e "\n${BLUE}npm kontrol ediliyor...${NC}"
    if ! command -v npm &> /dev/null; then
        print_error "npm bulunamadi!"
        print_info "npm genellikle Node.js ile birlikte gelir"
        all_ok=false
    else
        NPM_VERSION=$(npm -v)
        print_success "npm $NPM_VERSION"
    fi

    # Check Supabase CLI (optional)
    echo -e "\n${BLUE}Supabase CLI kontrol ediliyor...${NC}"
    if ! command -v supabase &> /dev/null; then
        print_warning "Supabase CLI bulunamadi (opsiyonel)"
        print_info "Lokal gelistirme icin: npm install -g supabase"
        print_info "veya: brew install supabase/tap/supabase (macOS)"
        SUPABASE_CLI_AVAILABLE=false
    else
        SUPABASE_VERSION=$(supabase --version 2>/dev/null || echo "unknown")
        print_success "Supabase CLI $SUPABASE_VERSION"
        SUPABASE_CLI_AVAILABLE=true
    fi

    # Check git (optional but recommended)
    echo -e "\n${BLUE}Git kontrol ediliyor...${NC}"
    if ! command -v git &> /dev/null; then
        print_warning "Git bulunamadi (opsiyonel)"
    else
        GIT_VERSION=$(git --version | cut -d' ' -f3)
        print_success "Git $GIT_VERSION"
    fi

    if [ "$all_ok" = false ]; then
        echo ""
        print_error "Bazi gereksinimler karsilanmadi. Lutfen yukaridaki hatalari duzeltin."
        exit 1
    fi

    print_success "Tum zorunlu gereksinimler karsilandi!"
}

# ===========================================
# STEP 2: Setup Environment Variables
# ===========================================

setup_env_file() {
    print_step "2" "Ortam Degiskenlerini Ayarlama"

    if [ -f ".env.local" ]; then
        print_success ".env.local dosyasi zaten mevcut"
        print_info "Mevcut yapilandirma korunuyor"
    elif [ -f ".env.local.example" ]; then
        print_info ".env.local.example dosyasi bulundu"
        cp .env.local.example .env.local
        print_success ".env.local.example -> .env.local kopyalandi"
        echo ""
        print_warning "ONEMLI: .env.local dosyasini Supabase bilgilerinizle guncelleyin!"
        echo ""
        echo "  Gerekli degiskenler:"
        echo "    - NEXT_PUBLIC_SUPABASE_URL"
        echo "    - NEXT_PUBLIC_SUPABASE_ANON_KEY"
        echo "    - SUPABASE_SERVICE_ROLE_KEY"
        echo ""
        echo "  Bu bilgileri Supabase Dashboard'dan alabilirsiniz:"
        echo "    https://supabase.com/dashboard > Settings > API"
        echo ""
    else
        print_error ".env.local.example dosyasi bulunamadi!"
        print_info ".env.local dosyasini manuel olarak olusturmaniz gerekiyor"

        # Create a basic .env.local template
        cat > .env.local << 'EOF'
# ===========================================
# Supabase Configuration
# ===========================================
# Bu dosyayi Supabase bilgilerinizle doldurun
# Supabase Dashboard > Settings > API

NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
EOF

        print_success ".env.local sablonu olusturuldu"
        print_warning "Lutfen .env.local dosyasini Supabase bilgilerinizle guncelleyin!"
    fi
}

# ===========================================
# STEP 3: Install Dependencies
# ===========================================

install_dependencies() {
    print_step "3" "Bagimliliklari Kurma"

    if [ ! -f "package.json" ]; then
        print_error "package.json bulunamadi!"
        print_info "Bu script proje dizininden calistirilmalidir"
        exit 1
    fi

    print_info "npm paketleri kuruluyor..."
    echo ""

    # Use npm ci for reproducible builds if lock file exists
    if [ -f "package-lock.json" ]; then
        npm ci --loglevel=error
    else
        npm install --loglevel=error
    fi

    print_success "Tum bagimliliklar kuruldu"
}

# ===========================================
# STEP 4: Apply Database Migrations
# ===========================================

apply_migrations() {
    print_step "4" "Veritabani Migration'larini Uygulama"

    # Check if migrations folder exists
    if [ ! -d "supabase/migrations" ]; then
        print_warning "supabase/migrations klasoru bulunamadi"
        print_info "Migration dosyalari henuz olusturulmamis olabilir"
        return 0
    fi

    # Count migration files
    MIGRATION_COUNT=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l | tr -d ' ')

    if [ "$MIGRATION_COUNT" -eq 0 ]; then
        print_warning "Hicbir migration dosyasi bulunamadi"
        return 0
    fi

    print_info "$MIGRATION_COUNT migration dosyasi bulundu"
    echo ""

    # List migration files
    echo "  Migration dosyalari:"
    for file in supabase/migrations/*.sql; do
        if [ -f "$file" ]; then
            echo "    - $(basename $file)"
        fi
    done
    echo ""

    if [ "$SUPABASE_CLI_AVAILABLE" = true ]; then
        # Check if supabase is linked to a project
        if supabase projects list &> /dev/null; then
            print_info "Supabase CLI ile migration'lar uygulanabilir"
            echo ""
            echo "  Lokal veritabani icin:"
            echo "    supabase db reset"
            echo ""
            echo "  Uzak veritabani icin:"
            echo "    supabase db push"
            echo ""
        else
            print_warning "Supabase projesi bagli degil"
            print_info "Projenizi baglamak icin: supabase link"
        fi
    else
        print_info "Migration'lari uygulamak icin:"
        echo ""
        echo "  Secnek 1 - Supabase Dashboard (onerilen):"
        echo "    1. https://supabase.com/dashboard adresine gidin"
        echo "    2. SQL Editor'u acin"
        echo "    3. Her migration dosyasini sirayla calistirin"
        echo ""
        echo "  Secnek 2 - Supabase CLI:"
        echo "    1. npm install -g supabase"
        echo "    2. supabase login"
        echo "    3. supabase link --project-ref YOUR_PROJECT_REF"
        echo "    4. supabase db push"
        echo ""
    fi

    # Check for seed file
    if [ -f "supabase/seed.sql" ]; then
        print_info "Seed dosyasi bulundu: supabase/seed.sql"
        echo "  Migration'lardan sonra seed data'yi uygulayin"
    fi

    print_success "Migration talimatlari hazir"
}

# ===========================================
# STEP 5: Final Summary
# ===========================================

print_summary() {
    echo ""
    echo -e "${CYAN}========================================"
    echo "   Kurulum Tamamlandi!"
    echo -e "========================================${NC}"
    echo ""

    # Check if .env.local has actual values
    local env_configured=false
    if [ -f ".env.local" ]; then
        if grep -q "your-project-ref" .env.local || grep -q "your-anon-key-here" .env.local; then
            env_configured=false
        else
            env_configured=true
        fi
    fi

    echo -e "${BLUE}Sonraki Adimlar:${NC}"
    echo ""

    if [ "$env_configured" = false ]; then
        echo "  1. .env.local dosyasini Supabase bilgilerinizle guncelleyin"
        echo "     Supabase Dashboard > Settings > API"
        echo ""
        echo "  2. Veritabani migration'larini uygulayin"
        echo "     (Yukaridaki talimatlara bakin)"
        echo ""
        echo "  3. Gelistirme sunucusunu baslatin:"
        echo "     npm run dev"
        echo ""
    else
        echo "  1. Veritabani migration'larini uygulayin (henuz yapilmadiysa)"
        echo ""
        echo "  2. Gelistirme sunucusunu baslatin:"
        echo "     npm run dev"
        echo ""
    fi

    echo -e "${BLUE}Faydali Komutlar:${NC}"
    echo ""
    echo "  npm run dev          Gelistirme sunucusunu baslatir"
    echo "  npm run build        Uretim icin derler"
    echo "  npm run lint         Kod kalitesini kontrol eder"
    echo "  npm run typecheck    TypeScript hatalarini kontrol eder"
    echo "  npm run test         Testleri calistirir"
    echo ""

    echo -e "${BLUE}Onemli URL'ler (sunucu baslatildiktan sonra):${NC}"
    echo ""
    echo "  Anasayfa:        http://localhost:3000"
    echo "  Giris:           http://localhost:3000/login"
    echo "  Kayit:           http://localhost:3000/register"
    echo "  Dashboard:       http://localhost:3000/dashboard"
    echo "  Admin Paneli:    http://localhost:3000/admin"
    echo "  Herkese Acik Menu: http://localhost:3000/menu/[slug]"
    echo ""

    echo -e "${BLUE}Dokumantasyon:${NC}"
    echo ""
    echo "  README.md           Proje dokumantasyonu"
    echo "  temel.md            Is gereksinimleri"
    echo "  paketler.md         Paket ozellikleri matrisi"
    echo ""

    echo -e "${GREEN}Iyi gelistirmeler!${NC}"
    echo ""
}

# ===========================================
# MAIN SCRIPT
# ===========================================

main() {
    print_header

    # Run all steps
    check_prerequisites
    setup_env_file
    install_dependencies
    apply_migrations
    print_summary
}

# Run main function
main "$@"
