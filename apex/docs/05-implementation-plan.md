# 05 — خطة التنفيذ

كل مرحلة مستقلة وقابلة للاختبار. لا تنتقل للمرحلة التالية إذا فشلت معايير الخروج.

## المرحلة 1 — Foundation & Design System

**المخرجات المقترحة:** project scaffold، tokens للألوان والخطوط والمسافات، header/footer، دعم العربية والإنجليزية واتجاهي RTL/LTR، واختبارات build.

**السلوك:** كل route أساسي يفتح، لا يوجد نص تجريبي غير معلّم بأنه تجريبي، والموقع يظل قابلًا للاستخدام عند تعطيل الحركات.

**اختبارات الخروج:** build ناجح، لا أخطاء console حرجة، عرض 360px و768px و1440px مقبول.

## المرحلة 2 — Public Website & Portfolio

**المخرجات:** Home، Services، Project listing/details، How We Work، About/FAQ، Contact، Legal placeholders تُستكمل قبل نشر عام.

**السلوك:** المحتوى عربي/إنجليزي، المشاريع التجريبية موسومة، الروابط الخارجية HTTPS ومختارة من المسؤول، أزرار CTA تتصل بالمسار الصحيح.

**اختبارات الخروج:** كل الروابط تعمل، كل الصور لها alt مناسب، الصفحات الأساسية قابلة للفهرسة، ولا يوجد ادعاء غير مثبت عن العملاء أو النتائج.

## المرحلة 3 — Firebase data & Admin CRM

**المخرجات:** Firebase config via environment, repository layer، auth للمسؤول، collections، Firestore Rules، Admin dashboard، pipeline لحالات الطلب.

**السلوك:** المسؤول يستطيع إدارة الخدمات والمشاريع والطلبات؛ الزائر لا يقرأ الطلبات ولا يستطيع تعديل محتوى الموقع.

**اختبارات الخروج:** قواعد Firestore مختبرة؛ read/write لغير المصرح مرفوض؛ فشل Firebase يظهر رسالة مفهومة؛ لا توجد أسرار في bundle.

## المرحلة 4 — Public request form

**المخرجات:** نموذج متدرج وأسئلة حسب الخدمة، validation، consent، confirmation state، رقم مرجعي للعرض فقط.

**السلوك:** الطلب الناجح يظهر في لوحة الإدارة بحالة `new`; الفشل لا يعرض نجاحًا كاذبًا؛ لا يتيح الرقم المرجعي قراءة الطلب.

**اختبارات الخروج:** اختبارات تحقق الحقول، الحقول الطويلة/الخاطئة، فشل الاتصال، رفض الموافقة، وتأكد عدم وجود read public للطلب.

## المرحلة 5 — SEO, Analytics, PWA & Release

**المخرجات:** metadata، sitemap/robots عندما تتحدد المسارات، Open Graph، Search Console-ready، event analytics بسيط بعد مراجعة الخصوصية، وPWA إذا تم اختبارها.

**اختبارات الخروج:** Lighthouse/DevTools مراجعة يدوية، واختبار keyboard/accessibility، وRTL/LTR، وأحجام الموبايل، وقائمة إطلاق.

## لا يبدأ الآن

Payments، AI API، storage uploads، GitHub OAuth من داخل المنصة، نشر مشاريع المستخدمين، comments العامة، وإدارة Marketplace؛ لكل منها تصميم أمان وتكلفة واختبارات منفصلة.
