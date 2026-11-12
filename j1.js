import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, setDoc, onSnapshot, query, orderBy, where, updateDoc, arrayUnion, arrayRemove, serverTimestamp, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyBjXo_BQV0t4b0b2wjvAbsBunMATOFAZpg",
  authDomain: "nt-social.firebaseapp.com",
  projectId: "nt-social",
  storageBucket: "nt-social.firebasestorage.app",
  messagingSenderId: "76168860226",
  appId: "1:76168860226:web:217f4c4f6eacc0bc3fd3db"
});
const auth = getAuth(app);
const db = getFirestore(app);
const $ = id => document.getElementById(id);

const CLOUD = 'qhbycoyv';
const PRESET = 'ntsocial';

const T = {
  en: {
    username: 'Username (only for Sign Up)', email: 'Email', password: 'Password (min 6 characters)',
    signup: 'Sign Up', login: 'Login', logout: 'Logout', search: 'Search',
    posts: 'posts', followers: 'followers', followingLbl: 'following',
    follow: 'Follow', following: 'Following', changePhoto: 'Change photo',
    save: 'Save', saved: 'Saved ✓', back: '← Back', arrow: '←',
    msgPh: 'Message...', send: 'Send', needName: 'Please enter a username',
    loading: 'Loading...', noPosts: 'No posts yet', noReels: 'No reels yet',
    noUsers: 'No other users yet', noResults: 'No results', tapMsg: 'Tap to message',
    likes: '{n} likes', commentPh: 'Add a comment...', postBtn: 'Post',
    captionPrompt: 'Write a caption', bigVideo: 'Video is bigger than 50 MB. Please choose a smaller one.',
    uploading: 'Uploading video... {n}%', uploadFail: 'Video upload failed. Check your internet.',
    language: 'Language'
  },
  bn: {
    username: 'ইউজারনেম (শুধু সাইন আপের সময়)', email: 'ইমেইল', password: 'পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)',
    signup: 'সাইন আপ', login: 'লগইন', logout: 'লগআউট', search: 'খুঁজুন',
    posts: 'পোস্ট', followers: 'ফলোয়ার', followingLbl: 'ফলোইং',
    follow: 'ফলো', following: 'ফলোইং', changePhoto: 'ছবি বদলান',
    save: 'সেভ করুন', saved: 'সেভ হয়েছে ✓', back: '← ফিরুন', arrow: '←',
    msgPh: 'মেসেজ লিখুন...', send: 'পাঠান', needName: 'ইউজারনেম লিখুন',
    loading: 'লোড হচ্ছে...', noPosts: 'এখনো কোনো পোস্ট নেই', noReels: 'এখনো কোনো রিলস নেই',
    noUsers: 'এখনো অন্য কেউ নেই', noResults: 'কিছু পাওয়া যায়নি', tapMsg: 'মেসেজ করতে চাপুন',
    likes: '{n} টি লাইক', commentPh: 'কমেন্ট লিখুন...', postBtn: 'পোস্ট',
    captionPrompt: 'ক্যাপশন লিখুন', bigVideo: 'ভিডিও ৫০ MB-এর বেশি বড়। ছোট ভিডিও দিন।',
    uploading: 'ভিডিও আপলোড হচ্ছে... {n}%', uploadFail: 'ভিডিও আপলোড হয়নি, ইন্টারনেট দেখুন',
    language: 'ভাষা'
  },
  hi: {
    username: 'यूज़रनेम (सिर्फ़ साइन अप के लिए)', email: 'ईमेल', password: 'पासवर्ड (कम से कम 6 अक्षर)',
    signup: 'साइन अप', login: 'लॉगिन', logout: 'लॉगआउट', search: 'खोजें',
    posts: 'पोस्ट', followers: 'फ़ॉलोअर्स', followingLbl: 'फ़ॉलोइंग',
    follow: 'फ़ॉलो करें', following: 'फ़ॉलो कर रहे हैं', changePhoto: 'फ़ोटो बदलें',
    save: 'सेव करें', saved: 'सेव हो गया ✓', back: '← वापस', arrow: '←',
    msgPh: 'मैसेज लिखें...', send: 'भेजें', needName: 'कृपया यूज़रनेम लिखें',
    loading: 'लोड हो रहा है...', noPosts: 'अभी कोई पोस्ट नहीं', noReels: 'अभी कोई रील्स नहीं',
    noUsers: 'अभी कोई और यूज़र नहीं', noResults: 'कुछ नहीं मिला', tapMsg: 'मैसेज करने के लिए टैप करें',
    likes: '{n} लाइक', commentPh: 'कमेंट लिखें...', postBtn: 'पोस्ट',
    captionPrompt: 'कैप्शन लिखें', bigVideo: 'वीडियो 50 MB से बड़ा है। छोटा वीडियो चुनें।',
    uploading: 'वीडियो अपलोड हो रहा है... {n}%', uploadFail: 'वीडियो अपलोड नहीं हुआ, इंटरनेट जाँचें',
    language: 'भाषा'
  },
  ar: {
    username: 'اسم المستخدم (للتسجيل فقط)', email: 'البريد الإلكتروني', password: 'كلمة المرور (6 أحرف على الأقل)',
    signup: 'إنشاء حساب', login: 'تسجيل الدخول', logout: 'تسجيل الخروج', search: 'بحث',
    posts: 'منشورات', followers: 'متابعون', followingLbl: 'يتابع',
    follow: 'متابعة', following: 'تتابعه', changePhoto: 'تغيير الصورة',
    save: 'حفظ', saved: 'تم الحفظ ✓', back: 'رجوع', arrow: '→',
    msgPh: 'اكتب رسالة...', send: 'إرسال', needName: 'يرجى كتابة اسم المستخدم',
    loading: 'جارٍ التحميل...', noPosts: 'لا توجد منشورات بعد', noReels: 'لا توجد ريلز بعد',
    noUsers: 'لا يوجد مستخدمون آخرون بعد', noResults: 'لا توجد نتائج', tapMsg: 'اضغط لإرسال رسالة',
    likes: '{n} إعجاب', commentPh: 'اكتب تعليقًا...', postBtn: 'نشر',
    captionPrompt: 'اكتب وصفًا', bigVideo: 'حجم الفيديو أكبر من 50 ميغابايت. اختر فيديو أصغر.',
    uploading: 'جارٍ رفع الفيديو... {n}%', uploadFail: 'فشل رفع الفيديو، تحقق من الإنترنت',
    language: 'اللغة'
  },
  ur: {
    username: 'صارف نام (صرف سائن اپ کے لیے)', email: 'ای میل', password: 'پاس ورڈ (کم از کم 6 حروف)',
    signup: 'سائن اپ', login: 'لاگ ان', logout: 'لاگ آؤٹ', search: 'تلاش کریں',
    posts: 'پوسٹس', followers: 'فالوورز', followingLbl: 'فالوئنگ',
    follow: 'فالو کریں', following: 'فالو کر رہے ہیں', changePhoto: 'تصویر بدلیں',
    save: 'محفوظ کریں', saved: 'محفوظ ہو گیا ✓', back: 'واپس', arrow: '→',
    msgPh: 'پیغام لکھیں...', send: 'بھیجیں', needName: 'براہ کرم صارف نام لکھیں',
    loading: 'لوڈ ہو رہا ہے...', noPosts: 'ابھی کوئی پوسٹ نہیں', noReels: 'ابھی کوئی ریلز نہیں',
    noUsers: 'ابھی کوئی اور صارف نہیں', noResults: 'کچھ نہیں ملا', tapMsg: 'پیغام بھیجنے کے لیے ٹیپ کریں',
    likes: '{n} لائکس', commentPh: 'تبصرہ لکھیں...', postBtn: 'پوسٹ',
    captionPrompt: 'کیپشن لکھیں', bigVideo: 'ویڈیو 50 MB سے بڑی ہے۔ چھوٹی ویڈیو چنیں۔',
    uploading: 'ویڈیو اپلوڈ ہو رہی ہے... {n}%', uploadFail: 'ویڈیو اپلوڈ نہیں ہوئی، انٹرنیٹ چیک کریں',
    language: 'زبان'
  }
};

const EXTRA = {
  en: { edit: 'Edit', delete: 'Delete', cancel: 'Cancel', editPrompt: 'Edit caption', confirmDel: 'Delete this post? This cannot be undone.' },
  bn: { edit: 'এডিট করুন', delete: 'ডিলিট করুন', cancel: 'বাতিল', editPrompt: 'ক্যাপশন বদলান', confirmDel: 'এই পোস্ট ডিলিট করবেন? এটা আর ফিরিয়ে আনা যাবে না।' },
  hi: { edit: 'संपादित करें', delete: 'हटाएँ', cancel: 'रद्द करें', editPrompt: 'कैप्शन बदलें', confirmDel: 'यह पोस्ट हटाएँ? इसे वापस नहीं लाया जा सकता।' },
  ar: { edit: 'تعديل', delete: 'حذف', cancel: 'إلغاء', editPrompt: 'تعديل الوصف', confirmDel: 'هل تريد حذف هذا المنشور؟ لا يمكن التراجع.' },
  ur: { edit: 'ترمیم کریں', delete: 'حذف کریں', cancel: 'منسوخ کریں', editPrompt: 'کیپشن بدلیں', confirmDel: 'کیا یہ پوسٹ حذف کریں؟ اسے واپس نہیں لایا جا سکتا۔' }
};
Object.keys(EXTRA).forEach(l => Object.assign(T[l], EXTRA[l]));

const EXTRA2 = {
  en: { notifTitle: 'Notifications', nLiked: '{name} liked your post', nCommented: '{name} commented: {text}', nEmpty: 'No notifications yet' },
  bn: { notifTitle: 'নোটিফিকেশন', nLiked: '{name} আপনার পোস্টে লাইক দিয়েছে', nCommented: '{name} কমেন্ট করেছে: {text}', nEmpty: 'এখনো কোনো নোটিফিকেশন নেই' },
  hi: { notifTitle: 'सूचनाएँ', nLiked: '{name} ने आपकी पोस्ट को लाइक किया', nCommented: '{name} ने कमेंट किया: {text}', nEmpty: 'अभी कोई सूचना नहीं' },
  ar: { notifTitle: 'الإشعارات', nLiked: 'أعجب {name} بمنشورك', nCommented: 'علّق {name}: {text}', nEmpty: 'لا توجد إشعارات بعد' },
  ur: { notifTitle: 'اطلاعات', nLiked: '{name} نے آپ کی پوسٹ کو لائک کیا', nCommented: '{name} نے تبصرہ کیا: {text}', nEmpty: 'ابھی کوئی اطلاع نہیں' }
};
Object.keys(EXTRA2).forEach(l => Object.assign(T[l], EXTRA2[l]));

const EXTRA3 = {
  en: {
    tNow: 'Just now', tMin: '{n} min ago', tHour: '{n} h ago', tDay: '{n} d ago', tWeek: '{n} w ago',
    setTitle: 'Settings and activity', sHow: 'How you use NT Social', sWho: 'Who can see your content',
    sInteract: 'How others can interact with you', sContent: 'Your content', sApp: 'Your app and media', sMore: 'More',
    soon: 'Coming soon',
    s_saved: 'Saved', s_archive: 'Archive', s_activity: 'Your activity', s_notifs: 'Notifications', s_timeMgmt: 'Time management',
    s_privacy: 'Account privacy', s_closeFriends: 'Close Friends', s_blocked: 'Blocked', s_storyLive: 'Story, live and location',
    s_messages: 'Messages and story replies', s_tags: 'Tags and mentions', s_comments: 'Comments', s_sharing: 'Sharing and reuse',
    s_restricted: 'Restricted', s_limit: 'Limit interactions', s_hidden: 'Hidden words', s_invite: 'Follow and invite friends',
    s_favorites: 'Favorites', s_muted: 'Muted', s_contentPref: 'Content preferences', s_likeCounts: 'Hide like counts',
    s_device: 'Device permissions', s_archiving: 'Archiving and downloading', s_access: 'Accessibility',
    s_data: 'Data usage and media quality', s_orders: 'Orders and payments', s_logoutS: 'Log out'
  },
  bn: {
    tNow: 'এইমাত্র', tMin: '{n} মিনিট আগে', tHour: '{n} ঘণ্টা আগে', tDay: '{n} দিন আগে', tWeek: '{n} সপ্তাহ আগে',
    setTitle: 'সেটিং ও অ্যাক্টিভিটি', sHow: 'আপনি কীভাবে NT Social ব্যবহার করেন', sWho: 'কে আপনার কনটেন্ট দেখতে পারবে',
    sInteract: 'অন্যরা আপনার সাথে কীভাবে যোগাযোগ করতে পারবে', sContent: 'আপনার কনটেন্ট', sApp: 'আপনার অ্যাপ ও মিডিয়া', sMore: 'আরও',
    soon: 'শীঘ্রই আসছে',
    s_saved: 'সেভ করা', s_archive: 'আর্কাইভ', s_activity: 'আপনার অ্যাক্টিভিটি', s_notifs: 'নোটিফিকেশন', s_timeMgmt: 'সময় ব্যবস্থাপনা',
    s_privacy: 'অ্যাকাউন্ট প্রাইভেসি', s_closeFriends: 'ক্লোজ ফ্রেন্ডস', s_blocked: 'ব্লক করা', s_storyLive: 'স্টোরি, লাইভ ও লোকেশন',
    s_messages: 'মেসেজ ও স্টোরি রিপ্লাই', s_tags: 'ট্যাগ ও মেনশন', s_comments: 'কমেন্ট', s_sharing: 'শেয়ার ও রিইউজ',
    s_restricted: 'সীমিত করা', s_limit: 'ইন্টারঅ্যাকশন সীমিত করুন', s_hidden: 'লুকানো শব্দ', s_invite: 'ফলো ও বন্ধুদের আমন্ত্রণ',
    s_favorites: 'ফেভারিট', s_muted: 'মিউট করা', s_contentPref: 'কনটেন্ট পছন্দ', s_likeCounts: 'লাইক সংখ্যা লুকান',
    s_device: 'ডিভাইস পারমিশন', s_archiving: 'আর্কাইভ ও ডাউনলোড', s_access: 'অ্যাক্সেসিবিলিটি',
    s_data: 'ডেটা ব্যবহার ও মিডিয়া কোয়ালিটি', s_orders: 'অর্ডার ও পেমেন্ট', s_logoutS: 'লগ আউট'
  },
  hi: { tNow: 'अभी अभी', tMin: '{n} मिनट पहले', tHour: '{n} घंटे पहले', tDay: '{n} दिन पहले', tWeek: '{n} सप्ताह पहले' },
  ar: { tNow: 'الآن', tMin: 'منذ {n} دقيقة', tHour: 'منذ {n} ساعة', tDay: 'منذ {n} يوم', tWeek: 'منذ {n} أسبوع' },
  ur: { tNow: 'ابھی', tMin: '{n} منٹ پہلے', tHour: '{n} گھنٹے پہلے', tDay: '{n} دن پہلے', tWeek: '{n} ہفتے پہلے' }
};
Object.keys(EXTRA3).forEach(l => Object.assign(T[l], EXTRA3[l]));
