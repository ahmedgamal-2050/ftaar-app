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
    ok: 'تمام',
    language: 'اللغة',
    languageEnglish: 'English',
    languageArabic: 'العربية',
    restartRequiredTitle: 'محتاجين نعيد التشغيل',
    restartRequiredBody: 'أعد تشغيل فطار عشان تخلّص تغيير اللغة.',
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
    chooseNameHelper: 'مش محتاج إيميل ولا كلمة سر.',
    chooseNameFooter: 'تقدر تعمل حساب كامل بعدين.',
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
    welcomeBackTitle: 'أهلاً بيك تاني',
    welcomeBackSubtitle: 'جاهز للفطار؟',
    emailLabel: 'البريد الإلكتروني',
    passwordLabel: 'كلمة السر',
    invalidCredentials: 'الإيميل أو كلمة السر غلط',
  },
  profile: {
    guestBadge: 'ضيف',
    guestAccountTitle: 'حساب ضيف',
    guestAccountBody:
      'اعمل حساب علشان تحتفظ بسجلك وتنضم لمجموعات الفطار بسهولة.',
    preferencesSection: 'الإعدادات',
    helpAndSupport: 'المساعدة والدعم',
    registerCta: 'سجّل',
    conversionBanner: 'احتفظ بسجل طلباتك — الأمر مش هياخد غير 20 ثانية.',
    conversionCta: 'اعمل حساب',
    logout: 'تسجيل خروج',
  },
  register: {
    title: 'اعمل حساب',
    subtitle: 'كل حاجة عندك هتفضل زي ما هي — مفيش حاجة هتضيع.',
    displayNameLabel: 'الاسم الظاهر',
    displayNameHelper: 'منقول من جلسة الضيف بتاعتك.',
    emailLabel: 'البريد الإلكتروني',
    passwordLabel: 'كلمة السر',
    submit: 'إنشاء الحساب',
    emailAlreadyRegistered: 'في حساب موجود بالفعل بالإيميل ده.',
  },
  forgotPassword: {
    title: 'نسيت كلمة السر؟',
    subtitle: 'دخّل إيميل حسابك وهنبعتلك كود لإعادة التعيين.',
    emailLabel: 'البريد الإلكتروني',
    sendCode: 'ابعت الكود',
    otpTitle: 'دخّل الكود',
    otpSubtitle: 'بعتنالك كود من 6 أرقام على {{email}}.',
    otpLabel: 'كود التحقق',
    verify: 'تحقق',
    resend: 'ابعت الكود تاني',
    resendIn: 'تقدر تطلب كود تاني بعد {{seconds}} ثانية',
    newPasswordTitle: 'اختار كلمة سر جديدة',
    newPasswordSubtitle: 'اختار كلمة سر جديدة لحسابك.',
    newPasswordLabel: 'كلمة السر الجديدة',
    confirmPasswordLabel: 'تأكيد كلمة السر',
    submit: 'إعادة تعيين كلمة السر',
    startOver: 'ابدأ من جديد',
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
  errors: {
    invalidEmail: 'دخّل إيميل صحيح.',
    passwordTooShort: 'كلمة السر لازم تكون 8 حروف على الأقل.',
    nameRequired: 'اكتب اسمك عشان تكمل.',
    network: 'حصلت مشكلة. اتأكد من النت وحاول تاني.',
    invalidOtp: 'الكود ده غلط. جرّب تاني.',
    otpExpired: 'الكود ده خلصت صلاحيته. اطلب كود جديد.',
    otpTooManyAttempts: 'حاولت كتير أوي. اطلب كود جديد.',
    invalidResetToken: 'الرابط ده خلصت صلاحيته — ابدأ إعادة التعيين تاني.',
    passwordMismatch: 'كلمتين السر مش متطابقتين.',
  },
};
