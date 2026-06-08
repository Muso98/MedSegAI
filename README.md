# MedSegAI — Tibbiy MRT Segmentatsiya Platformasi

> **Yopiq (private) tibbiy web-platforma** — MRT tasvirlarini AI yordamida segmentlash, o'smalarni aniqlash va tibbiy hisobotlar yaratish uchun.

---

## 🏗️ Arxitektura

```
React (Vite) + CSS
      ↓
   Nginx (SSL, reverse proxy)
      ↓
FastAPI (Python 3.12)    →   PostgreSQL 16
      ↓
Redis + Celery Worker
      ↓
PyTorch Attention U-Net (GPU/CPU)
```

---

## 📁 Loyiha tuzilmasi

```
MedSegAI/
├── backend/           # FastAPI backend
│   ├── app/
│   │   ├── api/       # REST endpoints
│   │   ├── ai/        # U-Net pipeline
│   │   ├── core/      # Config, security, logging
│   │   ├── models/    # SQLAlchemy DB models
│   │   ├── schemas/   # Pydantic schemas
│   │   ├── services/  # PDF report generator
│   │   └── tasks/     # Celery tasks
│   └── alembic/       # DB migrations
├── frontend/          # React 18 + Vite
│   └── src/
│       ├── pages/     # 7 sahifa
│       ├── components/
│       ├── i18n/      # uz / en / ru
│       ├── store/     # Zustand
│       └── api/       # Axios client
├── nginx/             # Nginx config (SSL)
├── ai_models/         # .pth weights (gitignore'd)
├── docker-compose.yml
└── .env.example
```

---

## 🚀 O'rnatish (VPS Ubuntu)

### 1. Zaruriy dasturlar

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER && newgrp docker
```

### 2. Loyihani klonlash

```bash
git clone <your-repo-url> /opt/medsegai
cd /opt/medsegai
```

### 3. AI model weights'ni joylashtirish

```bash
mkdir -p ai_models
cp /path/to/your/unet_weights.pth ai_models/unet_weights.pth
```

### 4. Environment o'rnatish

```bash
cp .env.example .env
nano .env   # Barcha qiymatlarni to'ldiring
```

**Muhim o'zgaruvchilar:**
```env
DATABASE_URL=postgresql+asyncpg://medsegai:YOUR_STRONG_PASSWORD@db:5432/medsegai
SECRET_KEY=<32+ belgili tasodifiy string>
JWT_SECRET_KEY=<32+ belgili tasodifiy string>
FIRST_ADMIN_EMAIL=admin@your-hospital.com
FIRST_ADMIN_PASSWORD=<kuchli parol>
AI_MODEL_PATH=/app/ai_models/unet_weights.pth
AI_DEVICE=auto  # cuda agar GPU bo'lsa
```

### 5. SSL sertifikat

```bash
mkdir -p nginx/ssl
# Let's Encrypt (tavsiya):
sudo apt install certbot
sudo certbot certonly --standalone -d brainweb.uz -d www.brainweb.uz
sudo cp /etc/letsencrypt/live/brainweb.uz/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/brainweb.uz/privkey.pem nginx/ssl/

# YOKI self-signed (test uchun):
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem -out nginx/ssl/fullchain.pem
```

### 6. Ishga tushirish

```bash
docker compose up -d --build
docker compose logs -f   # Loglarni kuzatish
```

### 7. Tekshirish

```bash
curl https://brainweb.uz/api/v1/health
# → {"status": "ok", "app": "MedSegAI"}
```

---

## 🔑 Default foydalanuvchi

Birinchi ishga tushganda `.env` dagi `FIRST_ADMIN_*` qiymatlari asosida admin yaratiladi:

```
Email: admin@medsegai.com
Parol: .env faylidagi FIRST_ADMIN_PASSWORD
Rol:   Administrator
```

---

## 👥 Rollar va huquqlar

| Rol | Huquqlar |
|---|---|
| **Admin** | Barcha funksiyalar + foydalanuvchilar boshqaruvi |
| **Shifokor** | Bemorlar, yuklash, segmentatsiya, natijalar, PDF |
| **Radiolog** | Tasvirlar ko'rish, validatsiya |
| **Operator** | Bemorlar, yuklash |

---

## 🌐 API Endpoints

`DEBUG=true` holatida: `https://brainweb.uz/docs`

---

## 🤖 AI Model integratsiyasi

Model fayli: `ai_models/unet_weights.pth`

`.env` da `AI_MODEL_TYPE` ni o'zgartiring:
- `attention_unet` — Attention U-Net (default)
- Model `(1, 1, 256, 256)` shaklidagi input tensor qabul qilishi kerak
- Output: `(1, 1, 256, 256)` sigmoid qiymatlari `[0, 1]`

---

## 🔧 Texnik xizmat

```bash
# Loglarni ko'rish
docker compose logs backend
docker compose logs celery_worker

# Ma'lumotlar bazasiga kirish
docker compose exec db psql -U medsegai -d medsegai

# Servisni qayta ishga tushirish
docker compose restart backend

# Barcha servislarni to'xtatish
docker compose down
```

---

## 🔒 Xavfsizlik

- ✅ JWT (access 15 min + refresh 7 kun)
- ✅ bcrypt parol hashing
- ✅ RBAC (role-based access control)
- ✅ HTTPS (Nginx SSL)
- ✅ Audit log (barcha harakatlar)
- ✅ Rate limiting (login: 5/min, API: 100/min)
- ✅ CORS (faqat o'z domain)
- ✅ SQL injection: SQLAlchemy ORM
- ✅ XSS: React + CSP headers
- ✅ Fayllar public URL'siz himoyalangan

---

## 📊 Texnologiyalar

| | Texnologiya |
|---|---|
| Frontend | React 18, Vite, Zustand, React Query |
| Backend | FastAPI, SQLAlchemy, Pydantic |
| AI | PyTorch, Attention U-Net |
| Database | PostgreSQL 16 |
| Queue | Celery + Redis |
| Container | Docker Compose |
| Proxy | Nginx |
| i18n | O'zbek, Ingliz, Rus |
