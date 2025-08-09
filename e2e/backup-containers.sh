#!/bin/bash

# IMF Container Backup und Restore System
# Erstellt Backups von Docker Images und kann diese wiederherstellen

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BACKUP_DIR="./docker-backups"
REGISTRY_HOST="localhost:5000"

print_status() {
    echo -e "${BLUE}[Container Backup]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_help() {
    echo "IMF Container Backup System"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  backup       Erstelle Backup aller IMF Images"
    echo "  restore      Stelle Images aus Backup wieder her"
    echo "  list         Zeige verfügbare Backups"
    echo "  clean        Lösche alte Backups"
    echo "  export TAG   Exportiere spezifisches Image"
    echo "  import FILE  Importiere Image-Backup"
    echo ""
    echo "Examples:"
    echo "  $0 backup                    # Backup aller Images"
    echo "  $0 restore                   # Restore aus letztem Backup"
    echo "  $0 export imf-app:latest     # Exportiere IMF App Image"
    echo "  $0 import imf-app-backup.tar # Importiere Image"
    echo ""
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

# List of images to backup
IMAGES_TO_BACKUP=(
    "${REGISTRY_HOST}/imf-app:latest"
    "${REGISTRY_HOST}/imf-playwright:latest"
    "${REGISTRY_HOST}/postgres:15"
    "${REGISTRY_HOST}/redis:7-alpine"
    "postgres:15"
    "redis:7-alpine"
    "node:20-alpine"
    "mcr.microsoft.com/playwright:v1.40.0-focal"
)

create_backup() {
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_subdir="${BACKUP_DIR}/backup_${timestamp}"
    
    print_status "Erstelle Backup in: $backup_subdir"
    mkdir -p "$backup_subdir"
    
    # Create backup manifest
    cat > "$backup_subdir/manifest.json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "hostname": "$(hostname)",
  "docker_version": "$(docker --version)",
  "images": [
EOF

    local first=true
    for image in "${IMAGES_TO_BACKUP[@]}"; do
        if docker image inspect "$image" > /dev/null 2>&1; then
            print_status "Backup: $image"
            
            # Clean image name for filename
            local clean_name=$(echo "$image" | sed 's/[^a-zA-Z0-9._-]/_/g')
            local backup_file="${backup_subdir}/${clean_name}.tar"
            
            # Export image
            docker save -o "$backup_file" "$image"
            
            # Add to manifest
            if [ "$first" = false ]; then
                echo "    ," >> "$backup_subdir/manifest.json"
            fi
            echo -n "    {\"image\": \"$image\", \"file\": \"${clean_name}.tar\", \"size\": \"$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file")\"}\"" >> "$backup_subdir/manifest.json"
            first=false
            
            print_success "✓ $image -> ${clean_name}.tar"
        else
            print_warning "⚠ Image nicht gefunden: $image"
        fi
    done
    
    # Close manifest
    echo "" >> "$backup_subdir/manifest.json"
    echo "  ]" >> "$backup_subdir/manifest.json"
    echo "}" >> "$backup_subdir/manifest.json"
    
    # Create compressed archive
    print_status "Komprimiere Backup..."
    cd "$BACKUP_DIR"
    tar -czf "backup_${timestamp}.tar.gz" "backup_${timestamp}/"
    rm -rf "backup_${timestamp}/"
    cd - > /dev/null
    
    print_success "Backup erstellt: ${BACKUP_DIR}/backup_${timestamp}.tar.gz"
}

restore_backup() {
    local latest_backup=$(ls -t "${BACKUP_DIR}"/backup_*.tar.gz 2>/dev/null | head -1)
    
    if [ -z "$latest_backup" ]; then
        print_error "Keine Backups gefunden in $BACKUP_DIR"
        return 1
    fi
    
    print_status "Stelle wieder her aus: $latest_backup"
    
    # Extract backup
    cd "$BACKUP_DIR"
    tar -xzf "$(basename "$latest_backup")"
    local backup_dir=$(basename "$latest_backup" .tar.gz)
    
    if [ ! -f "${backup_dir}/manifest.json" ]; then
        print_error "Manifest nicht gefunden in Backup"
        return 1
    fi
    
    print_status "Lade Images aus Backup..."
    
    # Read manifest and restore images
    while IFS= read -r line; do
        if [[ $line =~ \"file\":\ \"([^\"]+)\" ]]; then
            local tar_file="${BASH_REMATCH[1]}"
            local full_path="${backup_dir}/${tar_file}"
            
            if [ -f "$full_path" ]; then
                print_status "Lade: $tar_file"
                docker load -i "$full_path"
                print_success "✓ $tar_file geladen"
            fi
        fi
    done < "${backup_dir}/manifest.json"
    
    # Cleanup extracted files
    rm -rf "$backup_dir"
    cd - > /dev/null
    
    print_success "Restore abgeschlossen!"
}

list_backups() {
    print_status "Verfügbare Backups:"
    
    if ls "${BACKUP_DIR}"/backup_*.tar.gz > /dev/null 2>&1; then
        for backup in "${BACKUP_DIR}"/backup_*.tar.gz; do
            local filename=$(basename "$backup")
            local size=$(stat -f%z "$backup" 2>/dev/null || stat -c%s "$backup")
            local size_mb=$((size / 1024 / 1024))
            local date_part=$(echo "$filename" | grep -o '[0-9]\{8\}_[0-9]\{6\}')
            
            echo "  📦 $filename (${size_mb}MB) - $(echo $date_part | sed 's/\([0-9]\{4\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)_\([0-9]\{2\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)/\1-\2-\3 \4:\5:\6/')"
        done
    else
        echo "  Keine Backups gefunden"
    fi
}

clean_backups() {
    print_status "Lösche Backups älter als 7 Tage..."
    
    find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +7 -type f -delete 2>/dev/null || true
    
    print_success "Alte Backups gelöscht"
}

export_image() {
    local image="$1"
    if [ -z "$image" ]; then
        print_error "Kein Image angegeben"
        return 1
    fi
    
    if ! docker image inspect "$image" > /dev/null 2>&1; then
        print_error "Image nicht gefunden: $image"
        return 1
    fi
    
    local clean_name=$(echo "$image" | sed 's/[^a-zA-Z0-9._-]/_/g')
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="${BACKUP_DIR}/${clean_name}_${timestamp}.tar"
    
    print_status "Exportiere $image..."
    docker save -o "$backup_file" "$image"
    
    print_success "Image exportiert: $backup_file"
}

import_image() {
    local backup_file="$1"
    if [ -z "$backup_file" ]; then
        print_error "Keine Backup-Datei angegeben"
        return 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        print_error "Backup-Datei nicht gefunden: $backup_file"
        return 1
    fi
    
    print_status "Importiere aus $backup_file..."
    docker load -i "$backup_file"
    
    print_success "Image importiert!"
}

# Main command handling
case "${1:-help}" in
    backup)
        create_backup
        ;;
    restore)
        restore_backup
        ;;
    list)
        list_backups
        ;;
    clean)
        clean_backups
        ;;
    export)
        export_image "$2"
        ;;
    import)
        import_image "$2"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unbekannter Befehl: $1"
        show_help
        exit 1
        ;;
esac