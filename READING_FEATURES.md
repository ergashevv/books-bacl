# Kitob O'qish Xususiyatlari

## Qo'llab-quvvatlanadigan Formatlar

Ilova quyidagi kitob formatlarini qo'llab-quvvatlaydi:

### 1. PDF (Portable Document Format)
- To'liq qo'llab-quvvatlanadi
- PDF.js kutubxonasi orqali render qilinadi
- Sahifa-sahifa ko'rsatish
- Zoom va scroll funksiyalari

### 2. EPUB (Electronic Publication)
- EPUB.js kutubxonasi orqali qo'llab-quvvatlanadi
- Reflowable (o'zgaruvchan) matn
- TOC (Table of Contents) navigatsiyasi
- Metadata ko'rsatish

### 3. TXT (Plain Text)
- Oddiy matn fayllari
- Avtomatik sahifalash
- So'zlar soni bo'yicha sahifalash

### 4. MOBI (Mobipocket)
- Kelajakda qo'llab-quvvatlash rejalashtirilgan

## O'qish Xususiyatlari

### Mavzular (Themes)
1. **Paper** - Oq fon, qora matn (kunlik o'qish uchun)
2. **Sepia** - Sepia fon, qo'ng'ir matn (ko'zni kamroq charchatadi)
3. **Dark** - Qora fon, oq matn (tungi o'qish uchun)

### Shrift Sozlamalari
- **Shrift o'lchami**: 12px dan 24px gacha
- **Qatorlar orasidagi masofa**: 1.2 dan 2.5 gacha (faqat TXT formatida)

### Navigatsiya
- **Swipe gestures**: Chapga/o'ngga surish orqali sahifa o'zgartirish
- **Tugmalar**: Oldingi/Keyingi sahifa tugmalari
- **Progress bar**: O'qish progressini ko'rsatish
- **Sahifa raqami**: Joriy sahifa / Jami sahifalar

### Bookmark va Progress
- **Bookmark**: Muhim joylarni belgilash
- **Avtomatik progress**: O'qilgan sahifani saqlash
- **LocalStorage**: Ma'lumotlar qurilmada saqlanadi

### Immersive Mode
- To'liq ekran rejimi
- Boshqaruv panelini yashirish
- Diqqatni jamlash uchun minimal interfeys

## Texnik Detallar

### PDF Render
- PDF.js v3.11.174
- Canvas-based rendering
- Progressive loading

### EPUB Render
- EPUB.js v0.3.93
- Iframe-based rendering
- Dynamic styling

### TXT Reader
- Native React Native ScrollView
- Custom pagination algorithm
- Word count based pages

## API Integration

Kitoblar quyidagi API orqali yuklanadi:
- `getBookFileUrl()` - Kitob fayl URL'ini olish
- `getBookFileType()` - Fayl formatini aniqlash
- Format avtomatik aniqlanadi va tegishli reader ishga tushadi

## Kelajakdagi Yaxshilanishlar

1. **MOBI format qo'llab-quvvatlash**
2. **FB2 format qo'llab-quvvatlash**
3. **Audio kitoblar integratsiyasi**
4. **Annotatsiyalar va eslatmalar**
5. **Qidiruv funksiyasi**
6. **Til tarjimasi**
7. **Font tanlash imkoniyati**
8. **Cloud sync (progress va bookmark)**
