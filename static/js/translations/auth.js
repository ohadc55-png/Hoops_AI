/**
 * HOOPS AI - Auth Translations
 * Login, register, and invite registration pages (all 4 roles)
 */
I18N.register({
  he: {
    // === Shared Auth ===
    'auth.app_name': 'HOOPS AI',
    'auth.signing_in': 'מתחבר...',
    'auth.login_error': 'שגיאה בהתחברות',
    'auth.register_failed': 'ההרשמה נכשלה',
    'auth.register_failed_retry': 'ההרשמה נכשלה, נסה שנית',
    'auth.invalid_invite': 'לינק הזמנה לא תקין או שפג תוקפו',
    'auth.invite_code_required': 'יש להזין קוד הזמנה',
    'auth.invite_code_required_coach': 'יש להזין קוד הזמנה מהמאמן',

    // === Form Labels ===
    'auth.label.name': 'שם מלא',
    'auth.label.email': 'אימייל',
    'auth.label.password': 'סיסמה',
    'auth.label.dob': 'תאריך לידה',
    'auth.label.phone': 'טלפון',
    'auth.label.age_group': 'קבוצת גיל',
    'auth.label.level': 'רמה',
    'auth.label.invite_code': 'קוד הזמנה',

    // === Placeholders ===
    'auth.placeholder.name': 'השם שלך',
    'auth.placeholder.email_coach': 'coach@example.com',
    'auth.placeholder.email_admin': 'admin@example.com',
    'auth.placeholder.email_player': 'player@example.com',
    'auth.placeholder.email_parent': 'parent@example.com',
    'auth.placeholder.password': 'הזן סיסמה',
    'auth.placeholder.password_min': 'לפחות 6 תווים',
    'auth.placeholder.phone': '050-1234567',
    'auth.placeholder.invite_code': 'קוד בן 6 תווים מהמאמן',
    'auth.placeholder.invite_code_team': 'קוד בן 6 תווים מהקבוצה',

    // === Select Options ===
    'auth.select.default': 'בחר...',
    'auth.age.u8': 'U8',
    'auth.age.u10': 'U10',
    'auth.age.u12': 'U12',
    'auth.age.u14': 'U14',
    'auth.age.u16': 'U16',
    'auth.age.u18': 'U18',
    'auth.age.adult': 'בוגרים',
    'auth.level.youth': 'נוער',
    'auth.level.middle_school': 'חטיבה',
    'auth.level.high_school': 'תיכון',
    'auth.level.college': 'מכללה',
    'auth.level.semi_pro': 'חצי מקצועי',
    'auth.level.professional': 'מקצועי',

    // === Buttons ===
    'auth.btn.sign_in': 'התחבר',
    'auth.btn.create_account': 'צור חשבון',
    'auth.btn.join_team': 'הצטרף לקבוצה',
    'auth.btn.create_and_join': 'צור חשבון והצטרף',

    // === Coach Login ===
    'auth.coach.subtitle': 'עוזר אימון',
    'auth.coach.invited': 'הוזמנת להצטרף ל-',
    'auth.coach.no_account': 'אין לך חשבון?',
    'auth.coach.create_one': 'צור חשבון',
    'auth.coach.registration_title': 'הרשמת מאמן',
    'auth.coach.joining_team': 'מצטרף לקבוצה:',
    'auth.coach.has_account': 'יש לך כבר חשבון?',
    'auth.coach.sign_in': 'התחבר',
    'auth.coach.registering_for': 'נרשם להצטרפות ל-',

    // === Admin Login ===
    'auth.admin.title': 'כניסת ניהול',
    'auth.admin.no_account': 'אין לך חשבון?',
    'auth.admin.create_account': 'צור חשבון מנהל',
    'auth.admin.coach_link': 'מאמן? התחבר כאן',
    'auth.admin.register_title': 'צור חשבון מנהל',
    'auth.admin.has_account': 'יש לך כבר חשבון?',
    'auth.admin.sign_in': 'התחבר',

    // === Player Login ===
    'auth.player.title': 'כניסת שחקן',
    'auth.player.no_account': 'אין לך חשבון?',
    'auth.player.register_invite': 'הירשם עם קוד הזמנה',
    'auth.player.coach_link': 'מאמן? התחבר כאן',
    'auth.player.register_title': 'הרשמת שחקן',
    'auth.player.joining_team': 'מצטרף לקבוצה:',
    'auth.player.has_account': 'יש לך כבר חשבון?',
    'auth.player.sign_in': 'התחבר',
    'auth.player.coach_register': 'מאמן? הירשם כאן',

    // === Parent Login ===
    'auth.parent.title': 'כניסת הורה',
    'auth.parent.no_account': 'אין לך חשבון?',
    'auth.parent.register_invite': 'הירשם עם קוד הזמנה',
    'auth.parent.player_link': 'שחקן? התחבר כאן',
    'auth.parent.coach_link': 'מאמן? התחבר כאן',
    'auth.parent.register_title': 'הרשמת הורה',
    'auth.parent.joining_team': 'מצטרף לקבוצה:',
    'auth.parent.has_account': 'יש לך כבר חשבון?',
    'auth.parent.sign_in': 'התחבר',
    'auth.parent.player_register': 'שחקן? הירשם כאן',
    'auth.parent.email_hint': 'השתמש באימייל הילד לחיבור אוטומטי',
  },

  en: {
    // === Shared Auth ===
    'auth.app_name': 'HOOPS AI',
    'auth.signing_in': 'Signing in...',
    'auth.login_error': 'Sign in error',
    'auth.register_failed': 'Registration failed',
    'auth.register_failed_retry': 'Registration failed, try again',
    'auth.invalid_invite': 'Invalid or expired invite link',
    'auth.invite_code_required': 'Please enter an invite code',
    'auth.invite_code_required_coach': 'Enter invite code from your coach',

    // === Form Labels ===
    'auth.label.name': 'Full Name',
    'auth.label.email': 'Email',
    'auth.label.password': 'Password',
    'auth.label.dob': 'Date of Birth',
    'auth.label.phone': 'Phone',
    'auth.label.age_group': 'Age Group',
    'auth.label.level': 'Level',
    'auth.label.invite_code': 'Invite Code',

    // === Placeholders ===
    'auth.placeholder.name': 'Your name',
    'auth.placeholder.email_coach': 'coach@example.com',
    'auth.placeholder.email_admin': 'admin@example.com',
    'auth.placeholder.email_player': 'player@example.com',
    'auth.placeholder.email_parent': 'parent@example.com',
    'auth.placeholder.password': 'Enter your password',
    'auth.placeholder.password_min': 'Min 6 characters',
    'auth.placeholder.phone': '050-1234567',
    'auth.placeholder.invite_code': '6-character code from your coach',
    'auth.placeholder.invite_code_team': '6-character code from the team',

    // === Select Options ===
    'auth.select.default': 'Select...',
    'auth.age.u8': 'U8',
    'auth.age.u10': 'U10',
    'auth.age.u12': 'U12',
    'auth.age.u14': 'U14',
    'auth.age.u16': 'U16',
    'auth.age.u18': 'U18',
    'auth.age.adult': 'Adult',
    'auth.level.youth': 'Youth',
    'auth.level.middle_school': 'Middle School',
    'auth.level.high_school': 'High School',
    'auth.level.college': 'College',
    'auth.level.semi_pro': 'Semi-Pro',
    'auth.level.professional': 'Professional',

    // === Buttons ===
    'auth.btn.sign_in': 'Sign In',
    'auth.btn.create_account': 'Create Account',
    'auth.btn.join_team': 'Join Team',
    'auth.btn.create_and_join': 'Create Account & Join Team',

    // === Coach Login ===
    'auth.coach.subtitle': 'Coaching Assistant',
    'auth.coach.invited': "You've been invited to join ",
    'auth.coach.no_account': "Don't have an account?",
    'auth.coach.create_one': 'Create one',
    'auth.coach.registration_title': 'Coach Registration',
    'auth.coach.joining_team': 'Joining team:',
    'auth.coach.has_account': 'Already have an account?',
    'auth.coach.sign_in': 'Sign in',
    'auth.coach.registering_for': "You're registering to join ",

    // === Admin Login ===
    'auth.admin.title': 'Management Login',
    'auth.admin.no_account': "Don't have an account?",
    'auth.admin.create_account': 'Create admin account',
    'auth.admin.coach_link': 'Coach? Sign in here',
    'auth.admin.register_title': 'Create Admin Account',
    'auth.admin.has_account': 'Already have an account?',
    'auth.admin.sign_in': 'Sign in',

    // === Player Login ===
    'auth.player.title': 'Player Login',
    'auth.player.no_account': "Don't have an account?",
    'auth.player.register_invite': 'Register with invite code',
    'auth.player.coach_link': 'Coach? Sign in here',
    'auth.player.register_title': 'Player Registration',
    'auth.player.joining_team': 'Joining team:',
    'auth.player.has_account': 'Already have an account?',
    'auth.player.sign_in': 'Sign in',
    'auth.player.coach_register': 'Coach? Register here',

    // === Parent Login ===
    'auth.parent.title': 'Parent Login',
    'auth.parent.no_account': "Don't have an account?",
    'auth.parent.register_invite': 'Register with invite code',
    'auth.parent.player_link': 'Player? Sign in here',
    'auth.parent.coach_link': 'Coach? Sign in here',
    'auth.parent.register_title': 'Parent Registration',
    'auth.parent.joining_team': 'Joining team:',
    'auth.parent.has_account': 'Already have an account?',
    'auth.parent.sign_in': 'Sign in',
    'auth.parent.player_register': 'Player? Register here',
    'auth.parent.email_hint': "Use your child's email to auto-link",
  }
});
