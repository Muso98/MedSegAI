#!/bin/bash
# =========================================================================
# MedSegAI - Hetzner CX43 Server O'rnatish va Deploy Qilish Sksripti
# Server: Hetzner CX43 (8 vCPU, 16 GB RAM, 160 GB Disk)
# Domain: brainweb.uz
# =========================================================================

set -e

# Ranglar
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== MedSegAI Server O'rnatish Boshlandi (Hetzner CX43) ===${NC}"

# 1. Tizimni yangilash va kerakli dasturlarni o'rnatish
echo -e "${GREEN}[1/6] Tizim yangilanmoqda...${NC}"
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw python3-pip nano htop unzip software-properties-common

# 2. Docker va Docker Compose o'rnatish
echo -e "${GREEN}[2/6] Docker o'rnatilmoqda...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo -e "${BLUE}Docker o'rnatildi.${NC}"
else
    echo -e "${BLUE}Docker allaqachon o'rnatilgan.${NC}"
fi

# 3. Xavfsizlik (UFW Firewall)
echo -e "${GREEN}[3/6] Firewall (UFW) sozlanmoqda...${NC}"
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw --force enable
echo -e "${BLUE}Firewall ishga tushdi: 22(SSH), 80(HTTP), 443(HTTPS) portlar ochiq.${NC}"

# 4. Swap fayl (Agar RAM 16GB bo'lsa ham qo'shimcha xavfsizlik uchun yomon emas, 4GB yetarli)
echo -e "${GREEN}[4/6] Swap fayl tekshirilmoqda...${NC}"
if [ ! -f /swapfile ]; then
    sudo fallocate -l 4G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo -e "${BLUE}4GB Swap fayl yaratildi.${NC}"
else
    echo -e "${BLUE}Swap fayl allaqachon mavjud.${NC}"
fi

# 5. Papkalarni to'g'rilash
echo -e "${GREEN}[5/6] Papkalar sozlanmoqda...${NC}"
mkdir -p backend/app/media/uploads
mkdir -p backend/app/media/masks
mkdir -p backend/app/media/overlays
mkdir -p backend/app/media/reports
mkdir -p ai_models
mkdir -p nginx/ssl

# Self-signed sertifikatlarni vaqtincha yaratamiz (Certbot ularni almashtiradi)
if [ ! -f nginx/ssl/fullchain.pem ]; then
    echo -e "${BLUE}Vaqtinchalik SSL yaratilmoqda...${NC}"
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/privkey.pem \
        -out nginx/ssl/fullchain.pem \
        -subj "/C=UZ/ST=Tashkent/L=Tashkent/O=MedSegAI/CN=brainweb.uz"
fi

if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${RED}DIQQAT: .env fayl yaratildi. Uni o'zgartirishni unutmang! (nano .env)${NC}"
fi

# 6. Docker xizmatlarini ishga tushirish
echo -e "${GREEN}[6/6] Docker konteynerlar ishga tushirilmoqda...${NC}"
docker compose down
docker compose up -d --build

echo -e "\n${BLUE}=========================================================================${NC}"
echo -e "${GREEN}🎉 Barcha o'rnatish jarayonlari yakunlandi!${NC}"
echo -e "${BLUE}=========================================================================${NC}"
echo -e "Endi nima qilish kerak?"
echo -e "1. Agar .env faylini to'g'rilamagan bo'lsangiz:"
echo -e "   ${GREEN}nano .env${NC}"
echo -e "2. Agar haqiqiy SSL (HTTPS) olmoqchi bo'lsangiz (domen DNS ulangan bo'lsa):"
echo -e "   ${GREEN}sudo apt install certbot${NC}"
echo -e "   ${GREEN}sudo certbot certonly --standalone -d brainweb.uz -d www.brainweb.uz${NC}"
echo -e "   ${GREEN}sudo cp /etc/letsencrypt/live/brainweb.uz/fullchain.pem nginx/ssl/${NC}"
echo -e "   ${GREEN}sudo cp /etc/letsencrypt/live/brainweb.uz/privkey.pem nginx/ssl/${NC}"
echo -e "   ${GREEN}docker compose restart nginx${NC}"
echo -e "3. AI Model weights (.pth) ni ai_models/ papkasiga joylashtirishni unutmang."
echo -e "4. Loglarni ko'rish:"
echo -e "   ${GREEN}docker compose logs -f${NC}"
