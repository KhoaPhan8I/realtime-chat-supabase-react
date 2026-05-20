# Locket Widget

Chia sẻ khoảnh khắc sự kiện theo thời gian thực — mobile-first, Locket-style UI.

## Stack

- **Frontend:** React 19 + Vite 7 + Chakra UI v3
- **Backend:** Supabase (Realtime, Auth, Storage, PostgreSQL)
- **Deploy:** Vercel

## Tính năng

- 📸 Upload ảnh/video từ camera hoặc album (tối đa 20MB)
- 🔴 Live feed realtime — xem khoảnh khắc ngay khi được đăng
- 💬 Chat realtime multi-room (General, Tech, Random, Gaming)
- 👥 Danh sách online + typing indicators (Supabase Presence)
- 😍 Reactions với emoji
- 📱 Mobile-first Locket-style UI
- 🔗 Share link mời khách tham gia sự kiện

## Cài đặt

```bash
npm install
```

## Biến môi trường

Copy `env.example` → `.env` và điền thông tin Supabase:

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_KEY=eyJ...
VITE_EVENT_ID=wedding-demo
VITE_MEDIA_BUCKET=event-media
```

## Database Setup

Chạy file `supabase_event_media.sql` trong Supabase SQL Editor.

## Dev

```bash
npm run dev
```

Mở `http://localhost:5175`

## Build

```bash
npm run build
```

## Routes

| Path | Trang |
|---|---|
| `/` | Locket Widget (event media) |
| `/event` | Locket Widget |
| `/event/:eventId` | Locket Widget theo event |
| `/chat` | Chat rooms |
