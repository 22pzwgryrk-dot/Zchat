ZChat 1.0 | دليل إعداد المراسلة الحقيقية على الآيفون

1) افتح https://console.firebase.google.com/ وأنشئ مشروعاً جديداً.
2) من Project settings > Your apps أضف Web app (رمز </>)، وانسخ firebaseConfig إلى ملف firebase-config.js مكان REPLACE_WITH_...
   تحتاج apiKey وauthDomain وprojectId وappId. هذه إعدادات عامة وليست مفتاح خدمة سرياً.
3) من Build > Authentication > Sign-in method فعّل Email/Password.
4) من Build > Firestore Database أنشئ قاعدة بيانات. اختر موقعاً مناسباً.
5) من Firestore Database > Rules انسخ محتوى firestore.rules كاملاً واضغط Publish.
   لا تستخدم قواعد Test mode المفتوحة.
6) أعد ضغط ملفات index.html وapp.js وfirebase-config.js وmanifest.webmanifest في جذر ZIP، ثم ارفع ZIP إلى https://tiiny.host/.
   لا تحتاج رفع firestore.rules أو README_AR.txt للموقع. القواعد تُنشر من Firebase Console فقط.
7) افتح رابط الموقع من آيفونين. أنشئ حساباً مختلفاً في كل جهاز.
8) من «حسابي» انسخ رمز UID، وأرسله لصديقك. من «+ صديق» يلصق الرمز، ثم تبدأ المحادثة.

مهم:
- لا توجد رسائل مشفرة من طرف إلى طرف (E2EE) في هذا الإصدار. Firebase يستخدم HTTPS في النقل وتشفير التخزين من جهة الخدمة، لكن ذلك ليس E2EE.
- لا توجد مكالمات أو إرسال صور أو إشعارات دفع أو مؤشر متصل فعلي في هذه النسخة.
- علامة «متصل» في الواجهة تعني أن المستخدم سجل دخوله، ولا تمثل حضوره اللحظي.
- يتم عرض آخر 100 رسالة في كل محادثة. الرسائل الأقدم لا تُحذف ولكنها لا تظهر في هذه النسخة.
- يحتاج التطبيق الإنترنت ومشروع Firebase مهيأ. تييني هوست يستضيف الملفات فقط.
- لا تضع Firebase Admin SDK private key أو service account في الملفات العامة.
- لا تستخدم كلمة مرور إنستغرام أو أي خدمة أخرى هنا.
- يمكن أن تطبق Firebase وTiiny Host حدوداً أو رسوماً حسب الاستخدام والخطة.
