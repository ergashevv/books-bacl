# Telegram Bot Setup va Ishga Tushirish

## Botni ishga tushirish

Botni ishga tushirish uchun quyidagi buyruqni ishlating:

```bash
npm run start:bot
```

Yoki to'g'ridan-to'g'ri:

```bash
ts-node scripts/telegram_bot.ts
```

## Muammolarni hal qilish

### 1. Bot ishlamayapti

**Muammo**: Bot ishga tushmayapti yoki xatolik berayapti.

**Yechim**:
- `.env` faylida `BOT_TOKEN` mavjudligini tekshiring
- `DATABASE_URL` to'g'ri sozlanganligini tekshiring
- Bot token to'g'ri ekanligini tekshiring (BotFather dan olingan)

### 2. "Invalid or expired login request" xatosi

**Muammo**: Bot "Yaroqsiz yoki muddati o'tgan login so'rovi" xabarini qaytarayapti.

**Yechim**:
- Ilovadan yangi login so'rovi yarating
- Eski so'rovlar avtomatik o'chib ketishi mumkin
- Backend API ishlayotganligini tekshiring (`npm run start:api`)

### 3. Telefon raqami saqlangandan keyin login bo'lmayapti

**Muammo**: Telefon raqamini ulashgandan keyin login jarayoni davom etmayapti.

**Yechim**:
- Bot kodini yangilash (bu muammo tuzatilgan)
- Botni qayta ishga tushiring
- Ilovadan yangi login so'rovi yarating

### 4. Bot username noto'g'ri

**Muammo**: Bot username `mybooks_parol_bot` lekin bot nomi boshqacha.

**Yechim**:
- `src/store/useAuthStore.ts` faylida `botUsername` ni o'zgartiring
- Yoki BotFather dan bot username ni o'zgartiring

## Bot funksiyalari

### 1. Login so'rovi (`/start <request_uuid>`)
- Ilovadan yuborilgan login so'rovini tekshiradi
- Foydalanuvchini topadi yoki yaratadi
- Telefon raqami kerak bo'lsa, so'raydi
- Login jarayonini yakunlaydi

### 2. Telefon raqamini ulashish
- Foydalanuvchi telefon raqamini ulashganda
- Raqamni bazaga saqlaydi
- Agar pending auth request bo'lsa, uni complete qiladi

## Database jadvallari

Bot quyidagi jadvallardan foydalanadi:

1. **auth_requests** - Login so'rovlari
   - `request_uuid` - So'rov ID
   - `status` - Holati (pending/completed)
   - `telegram_user_id` - Telegram user ID
   - `user_id` - User ID

2. **users** - Foydalanuvchilar
   - `telegram_id` - Telegram ID
   - `full_name` - To'liq ism
   - `phone` - Telefon raqami
   - `username` - Telegram username
   - `avatar_url` - Avatar URL

## Botni test qilish

1. Backend API ni ishga tushiring: `npm run start:api`
2. Botni ishga tushiring: `npm run start:bot`
3. Ilovadan login qilishga harakat qiling
4. Telegram botga `/start` yuboring (ilova avtomatik yuboradi)
5. Telefon raqamini ulashing (agar kerak bo'lsa)
6. Login muvaffaqiyatli bo'lishi kerak

## Loglarni ko'rish

Bot ishlayotganda console'da quyidagi loglar ko'rinadi:
- `📥 Login request` - Yangi login so'rovi
- `✅ Auth request validated` - So'rov tasdiqlandi
- `👤 Looking up user` - Foydalanuvchi qidirilmoqda
- `✅ Login successful` - Login muvaffaqiyatli
- `📱 Received phone number` - Telefon raqami qabul qilindi

## Xatoliklar

Agar xatolik yuz bersa, console'da quyidagi loglar ko'rinadi:
- `❌ Error:` - Umumiy xatolik
- `❌ No valid request found` - So'rov topilmadi
- `❌ Update phone error` - Telefon raqamini saqlashda xatolik
