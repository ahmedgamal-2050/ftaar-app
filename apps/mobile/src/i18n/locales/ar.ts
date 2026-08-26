import type { en } from './en';

// Same nested shape as `en`, but every leaf widened to `string` — `en`'s
// `as const` literals would otherwise force ar.ts to match the English text
// verbatim.
type Messages<T> = {
  [K in keyof T]: T[K] extends string ? string : Messages<T[K]>;
};

// Egyptian Arabic, casual voice. Kept structurally identical to en.ts
// (enforced by the type below) so a missing key fails fast instead of
// silently falling back.
export const ar: Messages<typeof en> = {
  common: {
    retry: 'حاول تاني',
    loading: 'بنحمّل...',
    cancel: 'إلغاء',
  },
  tabs: {
    home: 'الرئيسية',
    history: 'السجل',
    restaurants: 'المطاعم',
    profile: 'حسابي',
  },
  onboarding: {
    welcomeTitle: 'اطلبوا مع بعض من غير ما الحساب يبوظ الصداقة',
    welcomeSubtitle:
      'كل واحد يدفع اللي عليه بس، من غير اكسل ولا جري ورا الناس على واتساب.',
    getStarted: 'يلا نبدأ',
    alreadyHaveAccount: 'عندك حساب؟ سجّل دخول',
    chooseNameTitle: 'نناديك ايه؟',
    chooseNameSubtitle: 'الاسم ده هيظهر لكل اللي معاك في الأوردر.',
    chooseNamePlaceholder: 'اسمك',
    continue: 'كمّل',
    loginTitle: 'تسجيل الدخول',
    loginSubtitle: 'للحسابات المسجّلة من قبل، على جهاز جديد.',
    emailPlaceholder: 'الإيميل',
    passwordPlaceholder: 'كلمة السر',
    logIn: 'ادخل',
    backToWelcome: 'رجوع',
  },
  account: {
    logIn: 'تسجيل الدخول',
    forgotPassword: 'نسيت كلمة السر؟',
  },
  profile: {
    guestBadge: 'ضيف',
    conversionBanner: 'احتفظ بسجل طلباتك — الأمر مش هياخد غير 20 ثانية.',
    conversionCta: 'اعمل حساب',
    logout: 'تسجيل خروج',
  },
  register: {
    title: 'اعمل حساب',
    subtitle: 'كل حاجة عندك هتفضل زي ما هي — مفيش حاجة هتضيع.',
    submit: 'إنشاء الحساب',
  },
  restaurants: {
    lockedTitle: 'المطاعم للقراءة بس للضيوف',
    lockedBody: 'اعمل حساب علشان تضيف مطاعم وتظبط المنيو بتاعها.',
    formTitle: 'مطعم',
    menuTitle: 'المنيو',
    bulkPasteTitle: 'الصق المنيو',
  },
  lobby: {
    setupTitle: 'أوردر جديد',
    shareTitle: 'شارك',
    orderSummaryTitle: 'ملخص الأوردر',
    billEntryTitle: 'دخّل الفاتورة',
    billReviewTitle: 'راجع الفاتورة',
    paymentBoardTitle: 'الدفع',
    settledTitle: 'خلصنا',
  },
  lobbyRoom: {
    menu: 'المنيو',
    myCart: 'طلبي',
    group: 'المجموعة',
  },
  home: {
    joinByCode: 'ادخل بكود',
    createLobby: 'اعمل أوردر',
  },
  bootstrapError: {
    title: 'معرفناش نشغّل فطار',
    body: 'اتأكد من النت وحاول تاني.',
  },
};
