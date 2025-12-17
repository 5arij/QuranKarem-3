# كيفية بناء ملف Android App Bundle (.aab)

بما أن هذا التطبيق هو تطبيق ويب تقدمي (PWA)، يمكنك تحويله بسهولة إلى تطبيق أندرويد (.aab) لرفعه على Google Play Console باتباع الخطوات التالية.

## الخيار 1: استخدام PWABuilder (الأسهل)

1. ارفع ملفات الموقع (التي تم إنشاؤها هنا) على استضافة تدعم HTTPS (مثل Vercel, Netlify, أو GitHub Pages).
2. اذهب إلى موقع [PWABuilder.com](https://www.pwabuilder.com).
3. أدخل رابط موقعك.
4. اضغط على **Build for Store**.
5. اختر **Android**.
6. في إعداداإعداداتت الأندرويد، يمكنك تحميل "Signing Key" الخاص بك إذا كان لديك واحد، أو إنشاء واحد جديد.
7. اضغط **Generate**. سيقوم الموقع بتحميل ملف مضغوط يحتوي على ملف `.aab` جاهز وملف `.apk` للتجربة.

**ملاحظة:** تأكد من أن ملف `proguard-rules.pro` الموجود في الكود قد تم دمجه، أو قم بإضافته يدوياً إذا كنت تستخدم Android Studio (الخيار 2).

## الخيار 2: استخدام Android Studio (للمحترفين)

إذا كنت تفضل التحكم الكامل، اتبع هذه الخطوات:

1. أنشئ مشروعاً جديداً في Android Studio (No Activity).
2. استخدم **Trusted Web Activity (TWA)** لعرض موقعك.
3. انسخ محتوى ملف `proguard-rules.pro` من الكود المصدري هنا.
4. ضعه في ملف `app/proguard-rules.pro` داخل مشروع الأندرويد.
5. تأكد من تفعيل `minifyEnabled true` في ملف `build.gradle` الخاص بالتطبيق:

```gradle
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

6. من القائمة العلوية في Android Studio، اختر **Build > Generate Signed Bundle / APK**.
7. اختر **Android App Bundle**.
8. اتبع الخطوات لتوقيع التطبيق واستخراج ملف `.aab`.

## ملفات هامة تم تجهيزها لك
- **manifest.json**: يحتوي على أيقونات ومعلومات التطبيق.
- **sw.js**: (Service Worker) تم تحديثه ليعمل دون إنترنت ويخزن ملفات التصميم، مما يقلل من أخطاء "Application Not Responding".
- **proguard-rules.pro**: (تم إنشاؤه سابقاً) مطلوب لفك التشويش في تقارير Google Play.
