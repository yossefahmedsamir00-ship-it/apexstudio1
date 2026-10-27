# 03 — نموذج البيانات وعقودها

## Collections

### `siteConfig/public`
إعدادات المحتوى العام فقط: الشعار، اللغات، وسائل التواصل المنشورة، وروابط الشبكات الاجتماعية. لا تحفظ أسرارًا أو مفاتيح API هنا.

### `services/{serviceId}`
- `slug: string`
- `title: { ar: string, en: string }`
- `summary: { ar: string, en: string }`
- `description: { ar: string, en: string }`
- `category: 'web' | 'ecommerce' | 'ai' | 'apps' | 'custom'`
- `status: 'draft' | 'published' | 'paused'`
- `isPublic: boolean`
- `pricingMode: 'fixed' | 'starting_at' | 'quote_only'`
- `priceLabel?: { ar: string, en: string }`
- `features: Array<{ ar: string, en: string }>`
- `sortOrder: number`
- `updatedAt: timestamp`

### `projects/{projectId}`
- `slug: string`
- `title: { ar: string, en: string }`
- `summary: { ar: string, en: string }`
- `description: { ar: string, en: string }`
- `category: 'web' | 'ecommerce' | 'ai' | 'apps' | 'custom'`
- `projectKind: 'concept' | 'client'`
- `status: 'draft' | 'published' | 'archived'`
- `visibility: 'private' | 'public'`
- `coverImagePath?: string` (ملف ثابت داخل النسخة المنشورة) أو `coverImageUrl?: string` (رابط HTTPS موثوق)
- `liveUrl?: string`
- `sourceUrl?: string` (عام ومختار يدويًا فقط)
- `technologies: string[]`
- `sortOrder: number`
- `updatedAt: timestamp`

### `requests/{requestId}`
- `name: string` — الحد الأقصى المقترح 100 حرف.
- `email: string` — الحد الأقصى المقترح 254 حرفًا.
- `whatsapp: string` — اختياري عمليًا؛ استخدم سلسلة فارغة إذا لم يقدمه العميل.
- `serviceType: 'website' | 'ecommerce' | 'ai_solution' | 'web_app' | 'mobile_app' | 'custom_system' | 'not_sure'`.
- `description: string` — الحد الأقصى 5000 حرف.
- `budgetRange: 'not_sure' | 'small' | 'medium' | 'large'`.
- `timeline: 'asap' | '1_2_weeks' | '1_month' | '1_3_months' | 'flexible'`.
- `source: string` — مصدر تقريبي اختياري ضمن حد صغير؛ لا تخزن معرّفات تتبع شخصية غير لازمة.
- `consentToContact: boolean` — يجب أن تكون `true` لإرسال الطلب.
- `createdAt: timestamp` — يكتب باستخدام `serverTimestamp()`.
- `status: 'new' | 'reviewing' | 'contacted' | 'quoted' | 'negotiating' | 'approved' | 'in_progress' | 'completed' | 'closed_lost'`.

لا تضمّن حقولًا سرية أو ملفات مرفوعة في الطلب. أضف نسخة سياسة الخصوصية ووقت الموافقة فقط بعد اعتماد شكل الموافقة والحقول النهائي.

### `users/{uid}`
غير مطلوب لحسابات العملاء في MVP. دخول المسؤول يعتمد على Firebase Authentication وقائمة UID موثوقة في Security Rules، وليس على حقل يمكن للمستخدم تعديله في ملفه الشخصي.

## قواعد القراءة والكتابة

- الزائر: يقرأ الخدمات المنشورة العامة والمشاريع المنشورة العامة فقط.
- الزائر: ينشئ طلبًا جديدًا إذا اجتاز قيود الحقول ويوافق على التواصل؛ لا يقرأ الطلبات ولا يغيرها.
- المسؤول: يدير المحتوى ويقرأ الطلبات ويغير حالات CRM.
- غير ذلك: مرفوض افتراضيًا.

## التغييرات المستقبلية

قبل إضافة upload أو حسابات العملاء أو الفواتير أو Marketplace، صمّم نموذج بيانات وصلاحيات مستقلًا لكل ميزة واختبر قواعدها قبل الواجهة.
