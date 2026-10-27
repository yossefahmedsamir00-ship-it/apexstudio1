# 02 — معمارية النظام

## المعمارية المقترحة

```text
Browser (Desktop / Mobile)
        |
        v
React + TypeScript + Vite (PWA-capable)
        |
        +---- Public pages: services, projects, FAQs
        |
        +---- Firebase Authentication (admin only in MVP)
        |
        +---- Cloud Firestore SDK
                  |-- public published services/projects (read)
                  |-- public project requests (create only, validated)
                  |-- admin-only request listing/status updates
        |
        v
Firebase Hosting (built static assets in dist/)
```

## تقنيات مقترحة

- **Frontend:** React + TypeScript + Vite.
- **Routing:** React Router أو مسارات خفيفة؛ القرار النهائي قبل إنشاء الواجهة.
- **Styling:** CSS design tokens ومكونات مخصصة؛ تجنب الاعتماد على قالب جاهز.
- **Backend/data:** Firebase Authentication وCloud Firestore.
- **Hosting:** Firebase Hosting ضمن حدود Spark.
- **Source control:** GitHub.
- **PWA:** خطوة إضافية بعد استقرار الواجهة؛ لا تمنع عمل الموقع كصفحة ويب إذا فشل التثبيت.

## مبدأ المعمارية

أبقِ الواجهة العامة مستقلة عن لوحة الإدارة، ومرّر عمليات البيانات من خلال طبقات domain/repository بدل استدعاء Firestore من كل مكوّن. لا تضع أسرارًا في كود المتصفح؛ Firebase web config ليس كلمة مرور، لكن صلاحيات البيانات تحميها Security Rules.

## حدود صفر جنيه

- Cloud Firestore وHosting لديهما حصص مجانية، ويجب مراقبتها. عند تجاوز بعض حصص Spark قد تتوقف الخدمة حتى دورة الاستخدام التالية بدل تحصيل مبلغ تلقائي.
- Cloud Storage for Firebase يتطلب Blaze وفق الوثائق الحالية؛ لذلك لا نستخدمه في الإصدار الأول.
- Cloud Functions ليست ضمن مسار Spark دون ربط فوترة؛ لا نفترض توفرها مجانًا.
- لا نعتمد على AI API خارجي أو بريد آلي أو خدمة دفع كشرط لإطلاق النسخة الأولى.

## إدخال الطلبات من زائر غير مسجل

النسخة الأولى تسمح بإنشاء طلب فقط إلى `requests` بعد تحقق قواعد الحقول، ولا تسمح للزائر بقراءة الطلب أو تعديله أو حذفه. قواعد Firestore تقلل الكتابات غير الصالحة لكنها **لا تمنع وحدها كل الرسائل المزعجة أو استهلاك الحصة**. قبل تسويق واسع، فعّل App Check عندما يكون مناسبًا، واختبره، وضع خطة بديلة لإدخال الطلبات إذا ظهر إساءة استخدام. لا تعتبر App Check بديلًا كاملًا لتحديد المعدل على خادم موثوق.

## معاينات المشاريع

في الإصدار الأول استخدم صورًا/فيديوهات أو روابط HTTPS معتمدة لمشاريع مستقلة. لا تشغّل كودًا يرفعه المستخدم داخل نفس أصل الموقع، ولا تسمح بفتح مستودع خاص تلقائيًا. معاينات iframe المعزولة والتشغيل sandbox خارج نطاق الإصدار الأول.
