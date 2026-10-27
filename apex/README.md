# APEX STUDIO — Technical Blueprint v1

**الحالة:** Blueprint مقترح قابل للمراجعة، وليس تطبيقًا جاهزًا للنشر.
**الهدف:** تحويل APEX STUDIO إلى موقع استوديو رقمي يجذب العملاء ويستقبل طلبات المشاريع، ضمن ميزانية بداية قدرها صفر جنيه قدر الإمكان.

## محتويات الحزمة

- `docs/01-product-scope.md` — حدود الإصدار الأول وما يؤجل.
- `docs/02-architecture.md` — معمارية النظام والقرارات التقنية.
- `docs/03-data-contracts.md` — نموذج البيانات وتدفقات الطلبات.
- `docs/04-security-and-privacy.md` — الأمان والخصوصية وحدود النسخة المجانية.
- `docs/05-implementation-plan.md` — مراحل التنفيذ المستقلة ومعايير الخروج.
- `docs/06-acceptance-tests.md` — اختبارات القبول قبل الإطلاق.
- `docs/07-open-decisions.md` — القرارات المتبقية التي يجب حسمها قبل النشر.
- `firestore.rules` — قالب قواعد أمان محافظ يحتاج إلى إضافة UID المسؤول واختباره قبل النشر.
- `firebase.json` — إعداد Hosting وFirestore Rules المقترح.
- `src/domain/models.ts` — عقود TypeScript أولية للبيانات.
- `.env.example` — أسماء إعدادات الواجهة؛ لا يحتوي على مفاتيح فعلية.

## الحالة الحالية

تم تجهيز الوثائق وقالب القواعد فقط. لم يتم إنشاء مشروع Firebase، أو ربط GitHub، أو نشر موقع، أو تشغيل اختبارات Emulator في هذه الخطوة.

## تشغيل لاحقًا

1. تثبيت Node.js وnpm وFirebase CLI على جهاز التطوير.
2. إنشاء مشروع Firebase مستقل واختيار خطة Spark في البداية.
3. تفعيل Authentication بالبريد/كلمة المرور أو Google حسب الإعداد النهائي.
4. إنشاء Firestore في Production mode.
5. استبدال `REPLACE_WITH_ADMIN_UID` في `firestore.rules` بالـUID الفعلي لحساب المسؤول.
6. اختبار القواعد باستخدام Firebase Emulator Suite قبل نشرها.
7. بناء تطبيق الواجهة إلى `dist/` ثم نشر Hosting والقواعد.

**تنبيه:** لا تنشر `firestore.rules` قبل مراجعتها واختبارها، ولا تضع مفاتيح خاصة أو بيانات عملاء داخل ملفات الواجهة أو Git.
