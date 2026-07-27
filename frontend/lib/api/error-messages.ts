const ERROR_MESSAGES: Record<string, string> = {
  // Auth
  INVALID_CREDENTIALS: 'שם משתמש או סיסמה שגויים',
  SESSION_NOT_FOUND: 'הפעלה לא נמצאה',
  NO_REFRESH_TOKEN: 'נדרשת כניסה מחדש',
  REFRESH_TOKEN_INVALID: 'פג תוקף ההתחברות, נכנס מחדש',
  INVALID_RESET_TOKEN: 'קישור לאיפוס סיסמה אינו תקין',
  RESET_TOKEN_EXPIRED: 'קישור לאיפוס סיסמה פג תוקף',
  RESET_TOKEN_ALREADY_USED: 'קישור לאיפוס סיסמה כבר נוצל',
  EMAIL_TAKEN: 'כתובת האימייל כבר רשומה במערכת',
  // Tokens
  TOKEN_ALREADY_USED: 'הקישור כבר נוצל',
  TOKEN_INVALID: 'קישור לא תקין',
  TOKEN_INVALID_OR_EXPIRED: 'הקישור אינו תקין או פג תוקפו',
  TOKEN_MISSING: 'נדרש אסימון גישה',
  TOKEN_WRONG_PURPOSE: 'קישור שגוי לפעולה זו',
  // Rooms
  ROOM_NUMBER_TAKEN: 'מספר חדר זה כבר קיים בסניף',
  ROOM_NOT_FOUND: 'החדר לא נמצא',
  ROOM_CONFLICT: 'החדר אינו פנוי בתאריכים אלה',
  ROOM_TYPE_NOT_FOUND: 'סוג חדר לא נמצא',
  ROOM_TYPE_HAS_ACTIVE_ROOMS: 'לא ניתן למחוק — קיימים חדרים פעילים מסוג זה',
  // Reservations
  RESERVATION_NOT_FOUND: 'ההזמנה לא נמצאה',
  RESERVATION_NOT_EDITABLE: 'לא ניתן לערוך הזמנה בסטטוס זה',
  RESERVATION_MUST_BE_CONFIRMED: 'ההזמנה חייבת להיות מאושרת',
  RESERVATION_MUST_BE_CHECKED_IN: "האורח חייב להיות מצוי בצ'ק-אין",
  NO_ROOMS_AVAILABLE: 'אין חדרים פנויים בתאריכים שנבחרו',
  // Check-in/out
  CHECK_IN_ALREADY_COMPLETED: "הצ'ק-אין כבר בוצע",
  CHECK_IN_WINDOW_NOT_OPEN: "חלון הצ'ק-אין עדיין לא פתוח",
  CHECK_IN_MUST_BE_BEFORE_CHECK_OUT: "תאריך צ'ק-אין חייב להיות לפני צ'ק-אאוט",
  CHECK_IN_MUST_BE_IN_FUTURE: "תאריך צ'ק-אין חייב להיות בעתיד",
  CHECK_OUT_MUST_BE_AFTER_CHECK_IN: "תאריך צ'ק-אאוט חייב להיות אחרי צ'ק-אין",
  // Guests
  GUEST_NOT_FOUND: 'האורח לא נמצא',
  DUPLICATE_GUEST_EMAIL: 'אורח עם אימייל זה כבר קיים',
  DUPLICATE_GUEST_PASSPORT: 'אורח עם מספר דרכון זה כבר קיים',
  EMAIL_ALREADY_REGISTERED: 'כתובת המייל כבר קיימת במערכת. לסיוע בהזמנה, פנה לצוות המלון.',
  // Users / Branches
  USER_NOT_FOUND: 'המשתמש לא נמצא',
  CANNOT_CREATE_CHAIN_ADMIN: 'לא ניתן ליצור מנהל רשת',
  MANAGER_ROLE_REQUIRED: 'נדרשת הרשאת מנהל',
  BRANCH_NOT_FOUND: 'הסניף לא נמצא',
  BRANCH_ACCESS_DENIED: 'אין גישה לסניף זה',
  BRANCH_ID_REQUIRED: 'נדרש מזהה סניף',
  BRANCH_ID_REQUIRED_IN_BODY_FOR_ADMIN: 'נדרש מזהה סניף בגוף הבקשה',
  NO_BRANCH_ASSIGNED: 'לא שויך סניף למשתמש זה',
  // Billing
  INVOICE_NOT_FOUND: 'החשבונית לא נמצאה',
  INVOICE_ALREADY_PAID: 'החשבונית כבר שולמה',
  INVOICE_VOID: 'החשבונית בוטלה',
  PAYMENT_NOT_FOUND: 'התשלום לא נמצא',
  PAYMENT_FAILED: 'התשלום נכשל, אנא נסה שנית',
  PAYMENT_NOT_SUCCEEDED: 'התשלום לא הצליח',
  DISCOUNT_EXCEEDS_TOTAL: 'ההנחה חורגת מסכום החשבון',
  DISCOUNT_MUST_BE_POSITIVE: 'ההנחה חייבת להיות חיובית',
  PRE_PAYMENT_EXCEEDS_TOTAL: 'המקדמה חורגת מסכום החשבון',
  PRICE_MUST_BE_POSITIVE: 'המחיר חייב להיות חיובי',
  REFUND_EXCEEDS_PAYMENT: 'סכום ההחזר חורג מהתשלום',
  REFUND_NOT_FOUND: 'ההחזר לא נמצא',
  STRIPE_TOKEN_REQUIRED: 'נדרש אסימון תשלום',
  // Housekeeping
  TASK_NOT_FOUND: 'המשימה לא נמצאה',
  TASK_ALREADY_TERMINAL: 'המשימה כבר הסתיימה',
  TASK_MUST_BE_IN_PROGRESS: 'המשימה חייבת להיות בתהליך',
  TASK_MUST_BE_PENDING: 'המשימה חייבת להיות בהמתנה',
  NOT_YOUR_TASK: 'אין לך הרשאה לעדכן משימה זו',
  ASSIGNEE_MUST_BE_HOUSEKEEPING_ROLE: 'המשויך חייב להיות בתפקיד חדרנות',
  ASSIGNEE_NOT_IN_BRANCH: 'המשויך לא שייך לסניף זה',
  // Status transitions
  INVALID_TRANSITION: 'מעבר סטטוס לא חוקי',
  CATALOG_ENTRY_NOT_FOUND: 'פריט קטלוג לא נמצא',
  // AI
  AI_DPA_NOT_SIGNED: 'נדרשת חתימה על הסכם עיבוד נתונים לשימוש ב-AI',
  AI_NOT_CONFIGURED: 'שירות הבינה המלאכותית אינו מוגדר',
  AI_SERVICE_UNAVAILABLE: 'שירות הבינה המלאכותית אינו זמין כרגע',
};

export function translateError(raw: string): string {
  if (!raw) return 'שגיאה בלתי צפויה';
  if (raw in ERROR_MESSAGES) return ERROR_MESSAGES[raw];
  if (/^[A-Z_]+$/.test(raw)) return 'שגיאה בלתי צפויה';
  return raw;
}
