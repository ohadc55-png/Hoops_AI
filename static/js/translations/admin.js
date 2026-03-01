/**
 * HOOPS AI - Admin Portal Translations
 * All user-facing strings from admin JS files.
 * Keys already in common.js (buttons, event types, roles, positions,
 * difficulty, segments, payment statuses/methods) are NOT duplicated here.
 */
I18N.register({
  he: {
    // =========================================================================
    // PAGE HEADERS
    // =========================================================================
    'admin.header.dashboard': 'לוח בקרה',
    'admin.header.schedule': 'לוח זמנים',
    'admin.header.teams': 'קבוצות',
    'admin.header.contacts': 'אנשי קשר',
    'admin.header.roles': 'תפקידים',
    'admin.header.facilities': 'מתקנים',
    'admin.header.billing': 'כספים',
    'admin.header.knowledge': 'בסיס ידע',
    'admin.header.messages': 'הודעות',
    'admin.header.insights': 'תובנות AI',
    'admin.header.scouting': 'חדר וידאו',
    'admin.header.coaches': 'מעורבות מאמנים',
    'admin.header.transport': 'הסעות',
    'admin.header.transport_detail': 'פרטי הסעה',
    'admin.header.support': 'תמיכה',

    // =========================================================================
    // DASHBOARD  (admin_dashboard.js)
    // =========================================================================

    // --- empty states ---
    'admin.dashboard.empty.today': 'אין פעילויות מתוכננות להיום',
    'admin.dashboard.empty.pending': 'אין בקשות ממתינות',
    'admin.dashboard.empty.upcoming': 'אין אירועים ב-7 הימים הקרובים',
    'admin.dashboard.empty.games': 'אין תוצאות משחקים',
    'admin.dashboard.score_pending': 'טרם הוזנה',
    'admin.dashboard.empty.attendance': 'אין נתוני נוכחות',
    'admin.dashboard.empty.new_members': 'אין חברים חדשים השבוע',

    // --- more link ---
    'admin.dashboard.more_calendar': 'נוספים · לוח שנה מלא',

    // --- quick actions ---
    'admin.dashboard.approve_title': 'אשר',
    'admin.dashboard.reject_title': 'דחה',

    // --- toasts ---
    'admin.dashboard.request_approved': 'הבקשה אושרה',
    'admin.dashboard.request_rejected': 'הבקשה נדחתה',
    'admin.dashboard.approve_error': 'שגיאה באישור הבקשה',
    'admin.dashboard.reject_error': 'שגיאה בדחיית הבקשה',

    // --- attendance ---
    'admin.dashboard.attendance_records': 'רשומות נוכחות',

    // --- time ago ---
    'admin.dashboard.today': 'היום',
    'admin.dashboard.yesterday': 'אתמול',
    'admin.dashboard.days_ago': 'לפני {count} ימים',

    // =========================================================================
    // BILLING  (admin_billing.js)
    // =========================================================================

    // --- selects ---
    'admin.billing.select_team': 'בחר קבוצה...',
    'admin.billing.all_teams': 'כל הקבוצות',

    // --- empty states ---
    'admin.billing.empty.select_team': 'בחר קבוצה לצפייה בפרטי חיוב',
    'admin.billing.empty.loading': 'טוען נתונים...',
    'admin.billing.empty.no_billing_data': 'אין נתוני חיוב לאף קבוצה.',
    'admin.billing.empty.no_unpaid': 'אין שחקנים לא משלמים.',
    'admin.billing.empty.no_unpaid_single': 'אין שחקנים לא משלמים.',
    'admin.billing.empty.no_data_team': 'אין נתוני חיוב לקבוצה זו.',

    // --- table headers ---
    'admin.billing.th.player': 'שחקן',
    'admin.billing.th.plan': 'תוכנית',
    'admin.billing.th.paid': 'שולם',
    'admin.billing.th.balance': 'יתרה',
    'admin.billing.th.one_time': 'חד פעמי',
    'admin.billing.th.status': 'סטטוס',
    'admin.billing.th.actions': 'פעולות',

    // --- row labels ---
    'admin.billing.installments_label': 'תשלומים',
    'admin.billing.paid_label': 'שולם:',
    'admin.billing.balance_label': 'יתרה:',
    'admin.billing.unpaid': 'לא שולם',
    'admin.billing.details_btn': 'פרטים',

    // --- player detail modal ---
    'admin.billing.season_label': 'עונה:',
    'admin.billing.method_label': 'אמצעי תשלום:',
    'admin.billing.installment_paid': 'שולם',
    'admin.billing.installment_due': 'יגיע ב-',
    'admin.billing.installment_label': 'תשלום',
    'admin.billing.mark_paid_btn': 'שולם',
    'admin.billing.cancel_btn': 'ביטול',
    'admin.billing.one_time_charges_title': 'חיובים חד-פעמיים',

    // --- mark paid modal ---
    'admin.billing.mark_paid_title': 'סמן שולם:',

    // --- adjust plan ---
    'admin.billing.adjust_prompt': 'עדכן סכום עבור {name}\nנוכחי: {amount}\n\nסכום חדש:',
    'admin.billing.plan_updated': 'סכום התוכנית עודכן',
    'admin.billing.update_failed': 'שגיאה בעדכון',

    // --- confirm mark paid ---
    'admin.billing.payment_recorded': 'התשלום נרשם',

    // --- cancel charge ---
    'admin.billing.cancel_confirm': 'לבטל חיוב זה?',
    'admin.billing.charge_cancelled': 'החיוב בוטל',
    'admin.billing.cancel_failed': 'שגיאה בביטול',

    // --- create plan ---
    'admin.billing.fill_required': 'נא למלא את כל השדות הנדרשים',
    'admin.billing.plans_created': 'נוצרו {created} תוכניות ({skipped} כבר קיימות)',
    'admin.billing.plans_created_all_teams': 'נוצרו {created} תוכניות ב-{teams} קבוצות ({skipped} כבר קיימות)',
    'admin.billing.plan_create_failed': 'שגיאה ביצירת תוכניות',

    // --- create charge ---
    'admin.billing.fill_charge_fields': 'נא למלא קבוצה, כותרת וסכום',
    'admin.billing.charges_created': 'נוצרו {count} חיובים',

    // --- check overdue ---
    'admin.billing.overdue_updated': 'עודכנו: {installments} תשלומים, {charges} חיובים',
    'admin.billing.checking_overdue': 'בודק...',
    'admin.billing.check_overdue_btn': 'בדוק איחורים',
    'admin.billing.overdue_check_failed': 'בדיקת איחורים נכשלה',

    // --- new payments ---
    'admin.billing.new_payments_title': 'תשלומים חדשים',
    'admin.billing.ack_all_btn': 'סמן הכל כנקרא',
    'admin.billing.all_acknowledged': 'כל התשלומים סומנו כנקראו',

    // --- reminders ---
    'admin.billing.no_unpaid_players': 'אין שחקנים עם חובות בקבוצה זו',
    'admin.billing.pending_label': 'ממתין',
    'admin.billing.reminders_sent': 'נשלחו {count} תזכורות',
    'admin.billing.reminders_failed': 'שגיאה בשליחת תזכורות',

    // --- load error ---
    'admin.billing.load_failed': 'שגיאה בטעינת נתוני חיוב',

    // =========================================================================
    // TEAMS  (admin_teams.js)
    // =========================================================================

    // --- empty states ---
    'admin.teams.empty.no_teams': 'אין קבוצות עדיין',
    'admin.teams.empty.no_teams_desc': 'צור קבוצה כדי להתחיל',
    'admin.teams.empty.load_error': 'שגיאה בטעינת קבוצות',

    // --- team card stats ---
    'admin.teams.coaches': 'מאמנים',
    'admin.teams.players': 'שחקנים',
    'admin.teams.parents': 'הורים',

    // --- invite labels ---
    'admin.teams.coach_invite_code': 'קוד הזמנת מאמן',
    'admin.teams.coach_invite_link': 'קישור הזמנת מאמן',
    'admin.teams.player_invite_code': 'קוד הזמנת שחקן',
    'admin.teams.player_invite_link': 'קישור הזמנת שחקן',
    'admin.teams.parent_invite_code': 'קוד הזמנת הורה',
    'admin.teams.parent_invite_link': 'קישור הזמנת הורה',
    'admin.teams.copy_code': 'העתק קוד',
    'admin.teams.copy_link': 'העתק קישור',
    'admin.teams.regenerate': 'צור מחדש',

    // --- members ---
    'admin.teams.members': 'חברים',
    'admin.teams.no_members': 'אין חברים עדיין',
    'admin.teams.no_members_table': 'אין חברים',
    'admin.teams.th.role': 'תפקיד',
    'admin.teams.th.name': 'שם',
    'admin.teams.th.email': 'אימייל',
    'admin.teams.th.joined': 'הצטרף',
    'admin.teams.parent_of': 'הורה של',
    'admin.teams.remove_title': 'הסר',

    // --- toasts ---
    'admin.teams.coach_code_regenerated': 'קוד הזמנת מאמן חודש',
    'admin.teams.player_code_regenerated': 'קוד הזמנת שחקן חודש',
    'admin.teams.parent_code_regenerated': 'קוד הזמנת הורה חודש',
    'admin.teams.remove_confirm': 'להסיר חבר זה מהקבוצה?',
    'admin.teams.member_removed': 'החבר הוסר',
    'admin.teams.team_created': 'קבוצה נוצרה',
    'admin.teams.btn_assign_coach': 'שייך מאמן',
    'admin.teams.assign_coach_title': 'שייך מאמן לקבוצה',
    'admin.teams.select_coach': 'בחר מאמן',
    'admin.teams.assign_coach_optional': 'מאמן (אופציונלי)',
    'admin.teams.btn_assign': 'שייך',
    'admin.teams.coach_assigned': 'המאמן שויך בהצלחה',
    'admin.teams.assign_failed': 'שיוך המאמן נכשל',

    // --- player profile ---
    'admin.teams.loading_player': 'טוען נתוני שחקן...',
    'admin.teams.player_load_error': 'לא ניתן לטעון פרופיל שחקן',

    // =========================================================================
    // SCHEDULE  (admin_schedule.js)
    // =========================================================================

    // --- selects ---
    'admin.schedule.all_teams': 'כל הקבוצות',
    'admin.schedule.select_team': 'בחר קבוצה...',
    'admin.schedule.no_facility': 'ללא מתקן',
    'admin.schedule.other_custom': 'אחר (מותאם)...',

    // --- empty states ---
    'admin.schedule.empty.no_events': 'אין אירועים',
    'admin.schedule.empty.no_events_desc': 'הוסף אירועים לקבוצות שלך',
    'admin.schedule.empty.load_error': 'שגיאה בטעינת לוח הזמנים',

    // --- event modal ---
    'admin.schedule.add_event': 'הוסף אירוע',
    'admin.schedule.edit_event': 'ערוך אירוע',

    // --- badges ---
    'admin.schedule.badge.away': 'חוץ',
    'admin.schedule.badge.recurring': 'חוזר',
    'admin.schedule.badge.pending': 'ממתין',

    // --- toasts ---
    'admin.schedule.time_end_before_start': 'שעת סיום חייבת להיות אחרי שעת התחלה',
    'admin.schedule.event_updated': 'האירוע עודכן',
    'admin.schedule.event_created': 'האירוע נוצר',
    'admin.schedule.events_created': '{count} אירועים נוצרו',
    'admin.schedule.series_deleted': 'הסדרה נמחקה',
    'admin.schedule.event_deleted': 'האירוע נמחק',

    // --- confirms ---
    'admin.schedule.delete_series_confirm': 'למחוק את כל האירועים בסדרה החוזרת?\n\nOK = מחק את הסדרה\nCancel = מחק רק אירוע זה',
    'admin.schedule.delete_event_confirm': 'למחוק אירוע זה?',

    // --- pending requests ---
    'admin.schedule.empty.no_requests': 'אין בקשות ממתינות',
    'admin.schedule.empty.requests_load_error': 'שגיאה בטעינת הבקשות',
    'admin.schedule.approve_confirm': 'לאשר בקשה זו? האירוע יתווסף ללוח הזמנים של הקבוצה.',
    'admin.schedule.request_approved': 'הבקשה אושרה — האירוע נוצר!',
    'admin.schedule.request_rejected': 'הבקשה נדחתה',
    'admin.schedule.reject_reason_prompt': 'סיבת הדחייה (לא חובה):',
    'admin.schedule.approve_btn': 'אשר',
    'admin.schedule.reject_btn': 'דחה',

    // =========================================================================
    // KNOWLEDGE BASE  (admin_knowledge.js)
    // =========================================================================

    // --- filters ---
    'admin.knowledge.all_categories': 'כל הקטגוריות',
    'admin.knowledge.select_category': 'בחר...',

    // --- empty states ---
    'admin.knowledge.empty.no_docs': 'אין מסמכים',
    'admin.knowledge.empty.no_docs_desc': 'העלה מסמכים כדי לבנות את בסיס הידע',
    'admin.knowledge.empty.load_error': 'שגיאה בטעינת מסמכים',
    'admin.knowledge.loading': 'טוען מסמכים...',

    // --- document card ---
    'admin.knowledge.untitled': 'ללא כותרת',
    'admin.knowledge.chunks_label': 'חלקים',
    'admin.knowledge.doc_count': '{count} מסמכים',

    // --- status badges ---
    'admin.knowledge.status.ready': 'מוכן',
    'admin.knowledge.status.processing': 'מעבד',
    'admin.knowledge.status.error': 'שגיאה',

    // --- scope badges ---
    'admin.knowledge.scope.system': 'מערכת',
    'admin.knowledge.scope.club': 'מועדון',
    'admin.knowledge.scope.coach': 'מאמן',

    // --- detail modal labels ---
    'admin.knowledge.detail.file': 'קובץ:',
    'admin.knowledge.detail.size': 'גודל:',
    'admin.knowledge.detail.chunks': 'חלקים:',
    'admin.knowledge.detail.uploaded': 'הועלה:',
    'admin.knowledge.detail.content_preview': 'תצוגה מקדימה',
    'admin.knowledge.detail.processing_error': 'שגיאת עיבוד',
    'admin.knowledge.detail.language_he': 'עברית',
    'admin.knowledge.detail.language_en': 'אנגלית',

    // --- actions ---
    'admin.knowledge.retry_btn': 'נסה שוב',
    'admin.knowledge.delete_btn': 'מחק',
    'admin.knowledge.download_btn': 'הורד',

    // --- upload ---
    'admin.knowledge.drop_zone_text': 'לחץ לבחירה או גרור לכאן',
    'admin.knowledge.uploading': 'מעלה...',
    'admin.knowledge.upload_btn': 'העלה',
    'admin.knowledge.upload_success': 'המסמך הועלה! מעבד ברקע...',
    'admin.knowledge.upload_error.no_file': 'נא לבחור קובץ',
    'admin.knowledge.upload_error.no_title': 'נא להזין כותרת',
    'admin.knowledge.upload_error.no_category': 'נא לבחור קטגוריה',

    // --- toasts ---
    'admin.knowledge.download_failed': 'ההורדה נכשלה',
    'admin.knowledge.delete_confirm': 'למחוק מסמך זה? לא ניתן לשחזר.',
    'admin.knowledge.document_deleted': 'המסמך נמחק',
    'admin.knowledge.reprocessing_started': 'עיבוד מחדש החל',

    // =========================================================================
    // INSIGHTS  (admin_insights.js)
    // =========================================================================

    // --- financial agent ---
    'admin.insights.fin.loading': 'טוען תובנות כלכליות...',
    'admin.insights.fin.total': 'סה"כ:',
    'admin.insights.fin.paid': 'שולם:',
    'admin.insights.fin.pending': 'ממתין:',
    'admin.insights.fin.overdue': 'באיחור:',
    'admin.insights.fin.collection': 'גבייה:',
    'admin.insights.fin.parents_overdue': '{count} הורים באיחור',
    'admin.insights.fin.no_overdue': 'אין איחורים',
    'admin.insights.fin.load_error': 'שגיאה בטעינת תובנות כלכליות',

    // --- financial report ---
    'admin.insights.fin.report_loading': 'מייצר דוח כלכלי... (זה עשוי לקחת מספר שניות)',
    'admin.insights.fin.report_success': 'דוח כלכלי נוצר בהצלחה',
    'admin.insights.fin.report_error': 'שגיאה ביצירת הדוח',
    'admin.insights.fin.report_gen_error': 'שגיאה ביצירת דוח כלכלי',

    // --- financial chat ---
    'admin.insights.fin.computing': 'מחשב...',
    'admin.insights.fin.chat_error': 'שגיאה בקבלת תשובה',

    // --- financial reminders ---
    'admin.insights.fin.sending_reminders': 'שולח תזכורות...',
    'admin.insights.fin.reminders_sent': 'נשלחו {count} תזכורות',
    'admin.insights.fin.no_reminders_needed': 'אין הורים הדורשים תזכורת',
    'admin.insights.fin.reminder_toast_sent': 'נשלחו {count} תזכורות תשלום',
    'admin.insights.fin.reminder_toast_none': 'אין הורים הדורשים תזכורת כרגע',
    'admin.insights.fin.reminder_error': 'שגיאה בשליחת תזכורות',

    // --- financial report history ---
    'admin.insights.fin.no_saved_reports': 'אין דוחות שמורים',
    'admin.insights.report_type.auto': 'אוטומטי',
    'admin.insights.report_type.manual': 'ידני',

    // --- professional agent ---
    'admin.insights.pro.loading': 'טוען תובנות מקצועיות...',
    'admin.insights.pro.players_need_attention': '{count} שחקנים דורשים תשומת לב',
    'admin.insights.pro.no_alerts': 'אין התראות',
    'admin.insights.pro.load_error': 'שגיאה בטעינת תובנות מקצועיות',

    // --- professional report ---
    'admin.insights.pro.report_loading': 'מייצר דוח מקצועי... (זה עשוי לקחת מספר שניות)',
    'admin.insights.pro.report_success': 'דוח מקצועי נוצר בהצלחה',
    'admin.insights.pro.report_error': 'שגיאה ביצירת הדוח',
    'admin.insights.pro.report_gen_error': 'שגיאה ביצירת דוח מקצועי',
    'admin.insights.pro.no_saved_reports': 'אין דוחות שמורים',

    // --- professional chat ---
    'admin.insights.pro.computing': 'מחשב...',
    'admin.insights.pro.chat_error': 'שגיאה בקבלת תשובה',

    // --- player list / filters ---
    'admin.insights.players.all_teams': 'כל הקבוצות',
    'admin.insights.players.count': '{count} שחקנים',
    'admin.insights.players.no_results': 'אין תוצאות',
    'admin.insights.players.empty': 'אין שחקנים התואמים את הסינון.',

    // --- player list table headers ---
    'admin.insights.players.th.name': 'שם',
    'admin.insights.players.th.team': 'קבוצה',
    'admin.insights.players.th.position': 'עמדה',
    'admin.insights.players.th.dob': 'תאריך לידה',
    'admin.insights.players.th.actions': 'פעולות',

    // --- player positions (short) ---
    'admin.insights.pos.PG': 'מגן',
    'admin.insights.pos.SG': 'שוטר',
    'admin.insights.pos.SF': 'קדמי קטן',
    'admin.insights.pos.PF': 'קדמי גדול',
    'admin.insights.pos.C': 'סנטר',

    // --- player actions ---
    'admin.insights.players.ai_card': 'כרטיס AI',
    'admin.insights.players.coach_report': 'דוח מאמן',
    'admin.insights.players.coming_soon': 'בקרוב',
    'admin.insights.players.age': 'גיל',

    // --- player AI card ---
    'admin.insights.player_card.loading': 'טוען כרטיס שחקן...',
    'admin.insights.player_card.load_error': 'שגיאה בטעינת כרטיס שחקן',

    // --- saved report loading ---
    'admin.insights.saved_report.loading': 'טוען דוח...',
    'admin.insights.saved_report.load_error': 'שגיאה בטעינת הדוח',

    // =========================================================================
    // ROLES  (admin_roles.js)
    // =========================================================================

    // --- empty states ---
    'admin.roles.empty.no_roles': 'No roles',
    'admin.roles.empty.load_error': 'Could not load roles',

    // --- table headers ---
    'admin.roles.th.role': 'Role',
    'admin.roles.th.description': 'Description',
    'admin.roles.th.type': 'Type',

    // --- badges ---
    'admin.roles.th.permissions': 'הרשאות',
    'admin.roles.permissions.sections': 'סעיפים',
    'admin.roles.permissions.all_access': 'גישה מלאה',
    'admin.roles.permissions.edit': 'עריכת הרשאות',
    'admin.roles.permissions.modal_title': 'עריכת הרשאות',
    'admin.roles.permissions.all_access_label': 'גישה מלאה (ללא הגבלה)',
    'admin.roles.permissions.all_access_desc': 'מנהל יכול לגשת לכל הסעיפים',
    'admin.roles.permissions.select_sections': 'בחר סעיפים נגישים:',
    'admin.roles.permissions.save_btn': 'שמור הרשאות',
    'admin.roles.permissions.saved': 'ההרשאות נשמרו בהצלחה',
    'admin.roles.badge.default': 'Default',
    'admin.roles.badge.custom': 'Custom',

    // --- toasts ---
    'admin.roles.role_created': 'Role created',
    'admin.roles.role_deleted': 'Role deleted',
    'admin.roles.delete_confirm': 'Delete this role?',

    // --- coaches tab ---
    'admin.roles.coaches.loading': 'טוען מאמנים...',
    'admin.roles.coaches.empty': 'אין מאמנים במועדון',
    'admin.roles.coaches.load_error': 'שגיאה בטעינת מאמנים',
    'admin.roles.coaches.count': '{count} מאמנים',

    // --- coaches table headers ---
    'admin.roles.coaches.th.name': 'שם',
    'admin.roles.coaches.th.team': 'קבוצה',
    'admin.roles.coaches.th.email': 'אימייל',
    'admin.roles.coaches.th.phone': 'טלפון',
    'admin.roles.coaches.th.joined': 'הצטרף',

    // =========================================================================
    // SCOUTING  (admin_scouting.js)
    // =========================================================================

    // --- action types (basketball terms — kept in English) ---
    'admin.scouting.action.pick_and_roll': 'Pick & Roll',
    'admin.scouting.action.isolation': 'Isolation',
    'admin.scouting.action.fast_break': 'Fast Break',
    'admin.scouting.action.defense': 'הגנה',
    'admin.scouting.action.transition': 'Transition',
    'admin.scouting.action.three_pointer': '3-Pointer',
    'admin.scouting.action.post_up': 'Post Up',
    'admin.scouting.action.screen': 'Screen',
    'admin.scouting.action.turnover': 'Turnover',
    'admin.scouting.action.rebound': 'Rebound',
    'admin.scouting.action.free_throw': 'Free Throw',
    'admin.scouting.action.out_of_bounds': 'Out of Bounds',
    'admin.scouting.action.other': 'אחר',

    // --- empty states ---
    'admin.scouting.empty.no_videos': 'לא נמצאו סרטונים לקבוצה הנבחרת.',
    'admin.scouting.empty.load_error': 'שגיאה בטעינת סרטונים',
    'admin.scouting.empty.no_clips': 'אין קטעים עדיין',

    // --- video card ---
    'admin.scouting.shared': 'שותף',
    'admin.scouting.parents': 'הורים',
    'admin.scouting.clips': 'קטעים',
    'admin.scouting.views': 'צפיות',

    // --- toasts ---
    'admin.scouting.load_video_error': 'שגיאה בטעינת סרטון',

    // --- clip count ---
    'admin.scouting.clip_count': '({count})',

    // =========================================================================
    // COACHES ENGAGEMENT  (admin_coaches.js)
    // =========================================================================

    // --- loading ---
    'admin.coaches.loading': 'טוען...',
    'admin.coaches.count': '{count} מאמנים',
    'admin.coaches.load_error': 'שגיאה בטעינת נתונים',

    // --- empty ---
    'admin.coaches.empty': 'לא נמצאו מאמנים',

    // --- categories ---
    'admin.coaches.cat.reports': 'דוחות',
    'admin.coaches.cat.communication': 'תקשורת',
    'admin.coaches.cat.training': 'אימונים',
    'admin.coaches.cat.attendance': 'נוכחות',
    'admin.coaches.cat.ai_usage': 'שימוש ב-AI',

    // --- quick stats ---
    'admin.coaches.stat.evals': 'הערכות',
    'admin.coaches.stat.games': 'משחקים',
    'admin.coaches.stat.msgs': 'הודעות',
    'admin.coaches.stat.drills': 'תרגילים',
    'admin.coaches.view_profile': 'פרופיל מלא',
    'admin.coach_profile.title': 'פרופיל מאמן',
    'admin.coach_profile.load_error': 'שגיאה בטעינת פרופיל המאמן',
    'admin.coach_profile.engagement_score': 'ציון מעורבות',
    'admin.coach_profile.section.engagement': 'ניתוח מעורבות',
    'admin.coach_profile.section.activity': 'פעילות אחרונה',
    'admin.coach_profile.last_90_days': '90 יום אחרונים',
    'admin.coach_profile.score.reports': 'דוחות',
    'admin.coach_profile.score.communication': 'תקשורת',
    'admin.coach_profile.score.training': 'אימונים',
    'admin.coach_profile.score.attendance': 'נוכחות',
    'admin.coach_profile.score.ai_usage': 'שימוש ב-AI',
    'admin.player_profile.title': 'פרופיל שחקן',
    'admin.player_profile.load_error': 'שגיאה בטעינת פרופיל השחקן',
    'admin.player_profile.stat.attendance': 'נוכחות',
    'admin.player_profile.stat.evaluations': 'הערכות',
    'admin.player_profile.stat.reports': 'דוחות',
    'admin.player_profile.stat.drills': 'תרגילים',
    'admin.player_profile.section.evaluation': 'הערכת שחקן',
    'admin.player_profile.section.reports': 'דוחות התפתחות',
    'admin.player_profile.section.attendance': 'נוכחות',
    'admin.player_profile.section.drills': 'תרגילים',
    'admin.player_profile.eval.offensive': 'התקפה',
    'admin.player_profile.eval.defensive': 'הגנה',
    'admin.player_profile.eval.iq': 'אינטליגנציה כדורסלנית',
    'admin.player_profile.eval.social': 'חברתי',
    'admin.player_profile.eval.leadership': 'מנהיגות',
    'admin.player_profile.eval.work_ethic': 'מוסר עבודה',
    'admin.player_profile.eval.fitness': 'כושר גופני',
    'admin.player_profile.eval.improvement': 'שיפור',
    'admin.player_profile.eval.leaving_risk': 'סיכון עזיבה',
    'admin.player_profile.attendance.events': 'אימונים',
    'admin.player_profile.attendance.low': 'נוכחות נמוכה',
    'admin.player_profile.attendance.medium': 'נוכחות בינונית',
    'admin.player_profile.attendance.good': 'נוכחות טובה',
    'admin.player_profile.drill.approved': 'אושר',
    'admin.player_profile.drill.rejected': 'נדחה',
    'admin.player_profile.drill.pending': 'ממתין',
    'admin.player_profile.drill.video_uploaded': 'וידאו הועלה',

    // --- last activity ---
    'admin.coaches.no_activity': 'ללא פעילות',
    'admin.coaches.just_now': 'הרגע',
    'admin.coaches.never': 'מעולם לא',

    // --- detail modal ---
    'admin.coaches.detail.loading': 'טוען...',
    'admin.coaches.detail.load_error': 'שגיאה בטעינת פעילות',
    'admin.coaches.detail.score_breakdown': 'פירוט ציון',
    'admin.coaches.detail.stats_90_days': 'סטטיסטיקות (90 יום)',
    'admin.coaches.detail.recent_activity': 'פעילות אחרונה',

    // --- detail stats ---
    'admin.coaches.detail.evaluations': 'הערכות',
    'admin.coaches.detail.game_reports': 'דוחות משחק',
    'admin.coaches.detail.player_reports': 'דוחות שחקנים',
    'admin.coaches.detail.messages': 'הודעות',
    'admin.coaches.detail.drills': 'תרגילים',
    'admin.coaches.detail.practices': 'אימונים',
    'admin.coaches.detail.plays': 'משחקונים',
    'admin.coaches.detail.assignments': 'שיוכים',
    'admin.coaches.detail.ai_chats': 'שיחות AI',

    // =========================================================================
    // CONTACTS  (admin_contacts.js)
    // =========================================================================

    // --- header ---
    'admin.contacts.count': '{count} אנשי קשר',

    // --- empty ---
    'admin.contacts.empty.no_contacts': 'לא נמצאו אנשי קשר',
    'admin.contacts.empty.no_contacts_desc': 'נסה לשנות את הסינון או הזמן חברים לקבוצות',
    'admin.contacts.empty.load_error': 'שגיאה בטעינת אנשי קשר',

    // --- table headers ---
    'admin.contacts.th.name': 'שם',
    'admin.contacts.th.email': 'אימייל',
    'admin.contacts.th.role': 'תפקיד',
    'admin.contacts.th.team': 'קבוצה',
    'admin.contacts.th.phone': 'טלפון',
    'admin.contacts.th.details': 'פרטים',
    'admin.contacts.th.joined': 'הצטרף',

    // --- details ---
    'admin.contacts.parent_of': 'הורה של',
    'admin.contacts.age_prefix': 'גיל',

    // =========================================================================
    // MESSAGES  (admin_messages.js)
    // =========================================================================

    // --- empty states ---
    'admin.messages.empty.inbox': 'אין הודעות',
    'admin.messages.empty.sent': 'אין הודעות שנשלחו',
    'admin.messages.empty.scheduled': 'אין הודעות מתוזמנות',
    'admin.messages.empty.hoops': 'אין עדכוני מערכת',
    'admin.messages.empty.invoices': 'אין חשבוניות',
    'admin.messages.empty.load_error': 'שגיאה בטעינת הודעות',
    'admin.messages.empty.load_error_short': 'שגיאה בטעינה',
    'admin.messages.empty.invoices_error': 'שגיאה בטעינת חשבוניות',

    // --- detail ---
    'admin.messages.detail.default_subject': 'הודעה',
    'admin.messages.detail.download_pdf': 'הורד PDF',

    // --- toasts ---
    'admin.messages.all_read': 'כל ההודעות סומנו כנקראו',
    'admin.messages.all_hoops_read': 'הכל סומן כנקרא',
    'admin.messages.scheduled_cancelled': 'ההודעה המתוזמנת בוטלה',
    'admin.messages.cancel_confirm': 'לבטל את ההודעה המתוזמנת?',
    'admin.messages.stats_error': 'שגיאה בטעינת סטטיסטיקות',
    'admin.messages.pdf_error': 'שגיאה בהורדת PDF',

    // --- stats modal labels ---
    'admin.messages.stats.total': 'סה"כ',
    'admin.messages.stats.read': 'נקראו',
    'admin.messages.stats.unread': 'לא נקראו',

    // --- scheduled labels ---
    'admin.messages.scheduled_prefix': 'מתוזמן:',
    'admin.messages.cancel_btn': 'ביטול',

    // --- hoops updates ---
    'admin.messages.hoops.type.billing': 'חיובים',
    'admin.messages.hoops.type.system': 'מערכת',

    // --- compose ---
    'admin.messages.compose.body_required': 'יש להזין תוכן הודעה',
    'admin.messages.compose.select_team': 'יש לבחור קבוצה אחת לפחות',
    'admin.messages.compose.select_user': 'יש לבחור משתמש',
    'admin.messages.compose.set_schedule': 'יש להגדיר תאריך ושעה לתזמון',
    'admin.messages.compose.sent': 'ההודעה נשלחה',
    'admin.messages.compose.scheduled': 'ההודעה תוזמנה',

    // --- individual target ---
    'admin.messages.indiv.select_team': '-- בחר קבוצה --',
    'admin.messages.indiv.select_person': '-- בחר אדם --',
    'admin.messages.indiv.no_members': '-- לא נמצאו חברים --',
    'admin.messages.indiv.loading': 'טוען...',
    'admin.messages.indiv.load_error': '-- שגיאה בטעינה --',

    // --- target labels ---
    'admin.messages.target.all_club': 'כל המועדון',
    'admin.messages.target.all_coaches': 'כל המאמנים',
    'admin.messages.target.all_players': 'כל השחקנים',
    'admin.messages.target.all_parents': 'כל ההורים',
    'admin.messages.target.team': 'קבוצות ספציפיות',
    'admin.messages.target.team_players': 'שחקני קבוצה',
    'admin.messages.target.team_parents': 'הורי קבוצה',
    'admin.messages.target.team_coaches': 'מאמני קבוצה',
    'admin.messages.target.individual': 'אדם ספציפי',
    'admin.messages.target.admin': 'מנהל',
    'admin.messages.target.my_team': 'הקבוצה שלי',
    'admin.messages.target.my_coach': 'המאמן שלי',
    'admin.messages.target.my_team_players': 'שחקני הקבוצה',
    'admin.messages.target.my_team_parents': 'הורי הקבוצה',

    // --- invoice tab ---
    'admin.messages.invoice.total_invoiced': 'סה"כ חויב',
    'admin.messages.invoice.paid': 'שולם',
    'admin.messages.invoice.open': 'פתוח',
    'admin.messages.invoice.overdue': 'באיחור',
    'admin.messages.invoice.issued': 'הונפק:',
    'admin.messages.invoice.due': 'תאריך יעד:',
    'admin.messages.invoice.paid_date': 'שולם:',
    'admin.messages.invoice.download_pdf': 'הורד PDF',

    // --- invoice type labels ---
    'admin.messages.invoice.type.tax_invoice': 'חשבונית מס',
    'admin.messages.invoice.type.receipt': 'קבלה',
    'admin.messages.invoice.type.credit_note': 'זיכוי',
    'admin.messages.invoice.type.quote': 'הצעת מחיר',

    // =========================================================================
    // PLAYER DEVELOPMENT  (admin_player_development.js)
    // =========================================================================

    'admin.player_dev.page_title': 'פיתוח שחקנים',

    // --- counts ---
    'admin.player_dev.count': '{count} שחקנים',

    // --- empty states ---
    'admin.player_dev.empty.no_players': 'לא נמצאו שחקנים',
    'admin.player_dev.empty.no_players_desc': 'נסה לשנות את הסינון',
    'admin.player_dev.empty.load_error': 'שגיאה בטעינת שחקנים',
    'admin.player_dev.empty.loading': 'טוען...',
    'admin.player_dev.empty.load_player_error': 'שגיאה בטעינת נתוני השחקן',

    // --- table headers ---
    'admin.player_dev.th.name': 'שם',
    'admin.player_dev.th.position': 'עמדה',
    'admin.player_dev.th.jersey': 'מספר',
    'admin.player_dev.th.team': 'קבוצה',
    'admin.player_dev.th.age': 'גיל',
    'admin.player_dev.th.height': 'גובה',

    // --- detail tabs ---
    'admin.player_dev.tab.profile': 'פרופיל',
    'admin.player_dev.tab.reports': 'דוחות',
    'admin.player_dev.tab.evaluations': 'הערכות',

    // --- evaluations ---
    'admin.player_dev.eval.empty': 'אין עדיין הערכות לשחקן זה',
    'admin.player_dev.eval.cat.offensive': 'התקפה',
    'admin.player_dev.eval.cat.defensive': 'הגנה',
    'admin.player_dev.eval.cat.basketball_iq': 'IQ כדורסלני',
    'admin.player_dev.eval.cat.social': 'חברתי',
    'admin.player_dev.eval.cat.leadership': 'מנהיגות',
    'admin.player_dev.eval.cat.work_ethic': 'מוסר עבודה',
    'admin.player_dev.eval.cat.fitness': 'כושר',
    'admin.player_dev.eval.cat.improvement': 'שיפור',
    'admin.player_dev.eval.cat.leaving_risk': 'סיכון עזיבה',
    'admin.player_dev.eval.avg': 'ממוצע',
    'admin.player_dev.eval.potential': 'פוטנציאל:',

    // --- evaluation periods ---
    'admin.player_dev.eval.period.weekly': 'שבועי',
    'admin.player_dev.eval.period.monthly': 'חודשי',
    'admin.player_dev.eval.period.semi_annual': 'חצי שנתי',
    'admin.player_dev.eval.period.annual': 'שנתי',

    // --- reports tab ---
    'admin.player_dev.reports.empty': 'אין עדיין דוחות לשחקן זה',
    'admin.player_dev.reports.strengths': 'חוזקות',
    'admin.player_dev.reports.weaknesses': 'חולשות',
    'admin.player_dev.reports.focus_areas': 'תחומי מיקוד',
    'admin.player_dev.reports.recommendations': 'המלצות',
    'admin.player_dev.reports.progress_notes': 'הערות התקדמות',

    // --- report requests ---
    'admin.player_dev.rr.select_team': 'בחר קבוצה...',
    'admin.player_dev.rr.all_coaches': 'כל המאמנים בקבוצה',
    'admin.player_dev.rr.select_team_error': 'יש לבחור קבוצה',
    'admin.player_dev.rr.due_date_error': 'יש להגדיר תאריך יעד',
    'admin.player_dev.rr.success': 'בקשת דוח נשלחה למאמנים!',
    'admin.player_dev.rr.error': 'שגיאה בשליחת הבקשה',

    // =========================================================================
    // TRANSPORT  (admin_transport.js)
    // =========================================================================

    // --- selects ---
    'admin.transport.all_teams': 'כל הקבוצות',

    // --- empty ---
    'admin.transport.empty.no_away_games': 'אין משחקי חוץ קרובים',
    'admin.transport.empty.no_away_desc': 'צור אירוע משחק וסמן אותו כ"משחק חוץ" בלוח הזמנים',
    'admin.transport.empty.load_error': 'שגיאה בטעינת משחקי חוץ',

    // --- labels ---
    'admin.transport.away_badge': 'חוץ',
    'admin.transport.departure': 'יציאה:',
    'admin.transport.not_set': 'לא הוגדר',
    'admin.transport.no_address': 'ללא כתובת',
    'admin.transport.waze': 'Waze',
    'admin.transport.details_btn': 'פרטים',

    // =========================================================================
    // TRANSPORT DETAIL  (admin_transport_detail.js)
    // =========================================================================

    // --- section headers ---
    'admin.transport_detail.away_game': 'משחק חוץ',

    // --- labels ---
    'admin.transport_detail.date': 'תאריך',
    'admin.transport_detail.team': 'קבוצה',
    'admin.transport_detail.game_time': 'שעת משחק',
    'admin.transport_detail.opponent': 'יריב',
    'admin.transport_detail.departure_time': 'שעת יציאה',
    'admin.transport_detail.venue_address': 'כתובת האולם',
    'admin.transport_detail.location': 'מיקום:',
    'admin.transport_detail.notes': 'הערות:',
    'admin.transport_detail.not_set': 'לא הוגדר',

    // --- navigation ---
    'admin.transport_detail.navigate_waze': 'נווט עם Waze',
    'admin.transport_detail.google_maps': 'Google Maps',

    // --- toasts ---
    'admin.transport_detail.empty.load_error': 'שגיאה בטעינת פרטי האירוע',
    'admin.transport_detail.address_required': 'יש להזין כתובת אולם קודם',
    'admin.transport_detail.saved': 'פרטי הסעה עודכנו והקבוצה קיבלה הודעה',

    // =========================================================================
    // FACILITIES  (admin_facilities.js)
    // =========================================================================

    // --- empty states ---
    'admin.facilities.empty.no_facilities': 'אין מתקנים',
    'admin.facilities.empty.no_facilities_desc': 'הוסף את המתקן הראשון שלך',
    'admin.facilities.empty.load_error': 'שגיאה בטעינת מתקנים',

    // --- table headers ---
    'admin.facilities.th.name': 'שם',
    'admin.facilities.th.type': 'סוג',
    'admin.facilities.th.address': 'כתובת',
    'admin.facilities.th.capacity': 'קיבולת',
    'admin.facilities.th.manager': 'מנהל אולם',
    'admin.facilities.th.phone': 'טלפון',

    // --- modal ---
    'admin.facilities.modal.add': 'הוסף מתקן',
    'admin.facilities.modal.edit': 'ערוך מתקן',

    // --- toasts ---
    'admin.facilities.facility_updated': 'המתקן עודכן',
    'admin.facilities.facility_created': 'המתקן נוצר',
    'admin.facilities.facility_deleted': 'המתקן נמחק',
    'admin.facilities.delete_confirm': 'למחוק את המתקן?',

    // =========================================================================
    // HTML TEMPLATE STRINGS
    // =========================================================================

    // --- admin_dashboard.html ---
    'admin.dashboard.stat_teams': 'קבוצות',
    'admin.dashboard.stat_coaches': 'מאמנים',
    'admin.dashboard.stat_players': 'שחקנים',
    'admin.dashboard.stat_parents': 'הורים',
    'admin.dashboard.ql_schedule': 'לוח זמנים',
    'admin.dashboard.ql_schedule_sub': 'לוח שנה ובקשות',
    'admin.dashboard.ql_teams': 'קבוצות',
    'admin.dashboard.ql_teams_sub': 'ניהול והזמנות',
    'admin.dashboard.ql_roles': 'תפקידים',
    'admin.dashboard.ql_roles_sub': 'הרשאות מנהל',

    // --- admin_schedule.html ---
    'admin.schedule.section_title': 'לוח זמנים',
    'admin.schedule.btn_add_event': 'הוסף אירוע',
    'admin.schedule.loading': 'טוען לוח זמנים...',
    'admin.schedule.requests_title': 'בקשות לוח זמנים',
    'admin.schedule.loading_requests': 'טוען בקשות...',
    'admin.schedule.btn_save_event': 'שמור אירוע',
    'admin.schedule.form.team': 'קבוצה *',
    'admin.schedule.form.title': 'כותרת *',
    'admin.schedule.form.title_placeholder': 'לדוגמה: אימון שבועי',
    'admin.schedule.form.type': 'סוג *',
    'admin.schedule.form.social': 'פעילות חברתית',
    'admin.schedule.form.date': 'תאריך *',
    'admin.schedule.form.start_time': 'שעת התחלה',
    'admin.schedule.form.end_time': 'שעת סיום',
    'admin.schedule.form.facility': 'מתקן',
    'admin.schedule.form.custom_location': 'מיקום מותאם',
    'admin.schedule.form.custom_location_placeholder': 'הכנס שם מיקום',
    'admin.schedule.form.opponent': 'יריב',
    'admin.schedule.form.opponent_placeholder': 'קבוצת יריב',
    'admin.schedule.form.game_location': 'מיקום משחק',
    'admin.schedule.form.home': 'בית (Home)',
    'admin.schedule.form.away': 'חוץ (Away)',
    'admin.schedule.form.departure_time': 'שעת יציאה (Departure Time)',
    'admin.schedule.form.venue_address': 'כתובת מגרש (Venue Address)',
    'admin.schedule.form.venue_address_placeholder': 'כתובת מלאה לגוגל מפות',
    'admin.schedule.form.view_transport': 'צפה בדף הסעות',
    'admin.schedule.form.notes': 'הערות',
    'admin.schedule.form.notes_placeholder': 'הערות אופציונליות',
    'admin.schedule.form.repeat_weekly': 'חזרה שבועית (שבועות)',
    'admin.schedule.form.repeat_placeholder': '1 = אירוע בודד',

    // --- admin_teams.html ---
    'admin.teams.section_title': 'קבוצות',
    'admin.teams.btn_create_team': 'צור קבוצה',
    'admin.teams.loading': 'טוען קבוצות...',
    'admin.teams.modal_create_title': 'צור קבוצה',
    'admin.teams.player_profile_title': 'פרופיל שחקן',
    'admin.teams.form.team_name': 'שם קבוצה *',
    'admin.teams.form.team_name_placeholder': 'לדוגמה: Warriors U14',
    'admin.teams.form.club_name': 'שם מועדון',
    'admin.teams.form.club_name_placeholder': 'לדוגמה: מכבי חיפה',
    'admin.teams.form.age_group': 'קבוצת גיל',
    'admin.teams.form.select': 'בחר...',
    'admin.teams.form.senior': 'בוגרים',
    'admin.teams.form.level': 'רמה',
    'admin.teams.form.level_recreational': 'חובבים',
    'admin.teams.form.level_competitive': 'תחרותי',
    'admin.teams.form.level_elite': 'עילית',
    'admin.teams.form.level_professional': 'מקצועי',

    // --- admin_contacts.html ---
    'admin.contacts.filter_all_teams': 'כל הקבוצות',
    'admin.contacts.tab_all': 'הכל',
    'admin.contacts.tab_coaches': 'מאמנים',
    'admin.contacts.tab_players': 'שחקנים',
    'admin.contacts.tab_parents': 'הורים',
    'admin.contacts.search_placeholder': 'חפש שם או אימייל...',
    'admin.contacts.loading': 'טוען...',

    // --- admin_roles.html ---
    'admin.roles.section_title': 'תפקידי מנהל',
    'admin.roles.btn_add_role': 'הוסף תפקיד',
    'admin.roles.loading': 'טוען תפקידים...',
    'admin.roles.modal_add_title': 'הוסף תפקיד מנהל',
    'admin.roles.btn_create_role': 'צור תפקיד',
    'admin.roles.form.role_name': 'שם תפקיד *',
    'admin.roles.form.role_name_placeholder': 'לדוגמה: גזבר',
    'admin.roles.form.description': 'תיאור',
    'admin.roles.form.description_placeholder': 'תיאור אופציונלי',

    // --- admin_facilities.html ---
    'admin.facilities.section_title': 'מתקנים',
    'admin.facilities.btn_add': 'הוסף מתקן',
    'admin.facilities.loading': 'טוען מתקנים...',
    'admin.facilities.btn_save': 'שמור מתקן',
    'admin.facilities.form.name': 'שם *',
    'admin.facilities.form.name_placeholder': 'לדוגמה: אולם ראשי',
    'admin.facilities.form.type': 'סוג *',
    'admin.facilities.form.type_gym': 'אולם',
    'admin.facilities.form.type_court': 'מגרש',
    'admin.facilities.form.type_field': 'שטח',
    'admin.facilities.form.type_pool': 'בריכה',
    'admin.facilities.form.capacity': 'קיבולת',
    'admin.facilities.form.address': 'כתובת',
    'admin.facilities.form.address_placeholder': 'כתובת המתקן',
    'admin.facilities.form.manager_name': 'מנהל אולם',
    'admin.facilities.form.manager_name_placeholder': 'שם מנהל האולם',
    'admin.facilities.form.manager_phone': 'טלפון',
    'admin.facilities.form.manager_phone_placeholder': '050-0000000',
    'admin.facilities.form.notes': 'הערות',
    'admin.facilities.form.notes_placeholder': 'הערות אופציונליות',

    // --- admin_billing.html ---
    'admin.billing.label_total_expected': 'סה"כ צפוי',
    'admin.billing.label_paid': 'שולם',
    'admin.billing.label_pending': 'ממתין',
    'admin.billing.label_overdue': 'באיחור',
    'admin.billing.btn_create_plan': 'צור תוכנית תשלום',
    'admin.billing.btn_one_time_charge': 'חיוב חד-פעמי',
    'admin.billing.btn_check_overdue': 'בדוק איחורים',
    'admin.billing.section_team_billing': 'חיוב קבוצה',
    'admin.billing.select_team_option': 'בחר קבוצה...',
    'admin.billing.season_placeholder': 'עונה (לדוגמה: 2025-2026)',
    'admin.billing.unpaid_only': 'לא שולם בלבד',
    'admin.billing.btn_send_reminder': 'שלח תזכורת לחייבים',
    'admin.billing.modal_create_plan_title': 'צור תוכנית תשלום',
    'admin.billing.modal_charge_title': 'חיוב חד-פעמי',
    'admin.billing.modal_mark_paid_title': 'סמן שולם',
    'admin.billing.modal_player_details_title': 'פרטי שחקן',
    'admin.billing.modal_reminder_title': 'שלח תזכורות תשלום',
    'admin.billing.reminder_desc': 'הודעת תזכורת תישלח להורים של השחקנים הבאים:',
    'admin.billing.btn_create_plans': 'צור תוכניות',
    'admin.billing.btn_create_charge': 'צור',
    'admin.billing.btn_confirm_payment': 'אשר תשלום',
    'admin.billing.btn_adjust_amount': 'שנה סכום',
    'admin.billing.btn_send_reminders': 'שלח תזכורות',
    'admin.billing.plan_note': 'תוכניות ייווצרו לכל השחקנים הפעילים בקבוצה. ניתן לשנות סכומים בודדים לאחר היצירה.',
    'admin.billing.charge_note': 'יווצר לכל השחקנים הפעילים בקבוצה שנבחרה.',
    'admin.billing.form.team': 'קבוצה',
    'admin.billing.form.season': 'עונה',
    'admin.billing.form.annual_amount': 'סכום שנתי (₪)',
    'admin.billing.form.installments': 'תשלומים',
    'admin.billing.form.start_month': 'חודש התחלה',
    'admin.billing.form.billing_day': 'יום חיוב',
    'admin.billing.form.payment_method': 'אמצעי תשלום',
    'admin.billing.form.description_optional': 'תיאור (אופציונלי)',
    'admin.billing.form.title': 'כותרת',
    'admin.billing.form.amount': 'סכום (₪)',
    'admin.billing.form.due_date_optional': 'תאריך יעד (אופציונלי)',
    'admin.billing.form.paid_date': 'תאריך תשלום',
    'admin.billing.form.note_optional': 'הערה (אופציונלי)',

    // --- admin_knowledge.html ---
    'admin.knowledge.stat_documents': 'מסמכים',
    'admin.knowledge.stat_chunks': 'חלקים',
    'admin.knowledge.stat_total_size': 'גודל כולל',
    'admin.knowledge.section_documents': 'מסמכים',
    'admin.knowledge.btn_upload_document': 'העלה מסמך',
    'admin.knowledge.filter_all_statuses': 'כל הסטטוסים',
    'admin.knowledge.filter_all_scopes': 'כל הרמות',
    'admin.knowledge.modal_upload_title': 'העלה מסמך',
    'admin.knowledge.modal_detail_title': 'פרטי מסמך',
    'admin.knowledge.file_types_hint': 'PDF, DOCX, או TXT — מקסימום 20MB',
    'admin.knowledge.form.file': 'קובץ *',
    'admin.knowledge.form.title': 'כותרת *',
    'admin.knowledge.form.title_placeholder': 'כותרת מסמך',
    'admin.knowledge.form.category': 'קטגוריה *',
    'admin.knowledge.form.language': 'שפה *',
    'admin.knowledge.form.description': 'תיאור',
    'admin.knowledge.form.description_placeholder': 'תיאור קצר של תוכן המסמך (אופציונלי)',

    // --- admin_insights.html ---
    'admin.insights.subtab_dashboard': 'לוח בקרה',

    // --- admin_scouting.html ---
    'admin.scouting.filter_all_teams': 'כל הקבוצות',
    'admin.scouting.filter_all': 'הכל',
    'admin.scouting.filter_game': 'משחק',
    'admin.scouting.filter_practice': 'אימון',
    'admin.scouting.filter_scout': 'סקאוטינג',
    'admin.scouting.filter_highlight': 'הייליט',
    'admin.scouting.search_placeholder': 'חפש סרטונים...',
    'admin.scouting.loading_videos': 'טוען סרטונים...',
    'admin.scouting.btn_back': 'חזור',
    'admin.scouting.video_title_placeholder': 'כותרת סרטון',
    'admin.scouting.clips_sidebar_title': 'קטעים',

    // --- admin_messages.html ---
    'admin.messages.tab_inbox': 'דואר נכנס',
    'admin.messages.tab_sent': 'נשלח',
    'admin.messages.tab_scheduled': 'מתוזמן',
    'admin.messages.tab_invoices': 'חשבוניות',
    'admin.messages.tab_compose': 'כתוב',
    'admin.messages.inbox_title': 'דואר נכנס',
    'admin.messages.btn_mark_all_read': 'סמן הכל כנקרא',
    'admin.messages.loading_messages': 'טוען הודעות...',
    'admin.messages.loading': 'טוען...',
    'admin.messages.sent_title': 'הודעות שנשלחו',
    'admin.messages.scheduled_title': 'הודעות מתוזמנות',
    'admin.messages.hoops_updates_title': 'עדכוני HOOPS AI',
    'admin.messages.invoices_billing_title': 'חשבוניות וחיובים',
    'admin.messages.invoice_filter_all_types': 'כל הסוגים',
    'admin.messages.invoice_filter_all_statuses': 'כל הסטטוסים',
    'admin.messages.invoice_status_draft': 'טיוטה',
    'admin.messages.invoice_status_sent': 'נשלח',
    'admin.messages.invoice_status_paid': 'שולם',
    'admin.messages.invoice_status_overdue': 'באיחור',
    'admin.messages.invoice_status_cancelled': 'בוטל',
    'admin.messages.compose_title': 'כתוב הודעה',
    'admin.messages.delivery_stats_title': 'סטטיסטיקת משלוח',
    'admin.messages.form.target': 'יעד',
    'admin.messages.form.specific_person': 'אדם ספציפי',
    'admin.messages.form.select_teams': 'בחר קבוצות',
    'admin.messages.form.team': 'קבוצה',
    'admin.messages.form.role': 'תפקיד',
    'admin.messages.form.select_role': '-- בחר תפקיד --',
    'admin.messages.form.person': 'אדם',
    'admin.messages.form.type': 'סוג',
    'admin.messages.form.subject_optional': 'נושא (אופציונלי)',
    'admin.messages.form.subject_placeholder': 'נושא...',
    'admin.messages.form.message': 'הודעה',
    'admin.messages.form.message_placeholder': 'כתוב את הודעתך...',
    'admin.messages.form.schedule_later': 'תזמן לאוחר',
    'admin.messages.form.date': 'תאריך',
    'admin.messages.form.time': 'שעה',
    'admin.messages.type_general': 'כללי',
    'admin.messages.type_announcement': 'הכרזה',
    'admin.messages.type_update': 'עדכון',
    'admin.messages.type_urgent': 'דחוף',

    // --- admin_coaches.html ---
    'admin.coaches.filter_all_teams': 'כל הקבוצות',
    'admin.coaches.modal_title': 'מאמן',

    // --- admin_player_development.html ---
    'admin.player_dev.filter_all_teams': 'כל הקבוצות',
    'admin.player_dev.filter_all_positions': 'כל העמדות',
    'admin.player_dev.btn_request_reports': 'בקש דוחות',
    'admin.player_dev.search_placeholder': 'חפש שם שחקן...',
    'admin.player_dev.modal_player_title': 'שחקן',
    'admin.player_dev.modal_request_title': 'בקש הערכות ממאמנים',
    'admin.player_dev.btn_send_request': 'שלח בקשה',
    'admin.player_dev.form.team': 'קבוצה',
    'admin.player_dev.form.coach_optional': 'מאמן (אופציונלי — השאר ריק לכל המאמנים בקבוצה)',
    'admin.player_dev.form.period_type': 'סוג תקופה',
    'admin.player_dev.form.due_date': 'תאריך יעד',
    'admin.player_dev.form.instructions_optional': 'הנחיות (אופציונלי)',
    'admin.player_dev.form.instructions_placeholder': 'הנחיות מיוחדות למאמנים...',

    // --- admin_transport.html ---
    'admin.transport.stat_upcoming_away': 'משחקי חוץ קרובים',
    'admin.transport.stat_next_away': 'משחק חוץ הבא',
    'admin.transport.stat_teams_with_away': 'קבוצות עם משחקי חוץ',
    'admin.transport.section_upcoming_away': 'משחקי חוץ קרובים',
    'admin.transport.loading': 'טוען...',

    // --- admin_transport_detail.html ---
    'admin.transport_detail.back_to_transport': 'חזרה להסעות',
    'admin.transport_detail.loading_event': 'טוען פרטי אירוע...',
    'admin.transport_detail.venue_location_title': 'מיקום המגרש',
    'admin.transport_detail.edit_transport_title': 'ערוך פרטי הסעה',
    'admin.transport_detail.form.departure_time': 'שעת יציאה (Departure Time)',
    'admin.transport_detail.form.venue_address': 'כתובת מגרש (Venue Address)',
    'admin.transport_detail.form.venue_address_placeholder': 'כתובת מלאה לגוגל מפות',
    'admin.transport_detail.btn_save_notify': 'שמור והודע לקבוצה',
    'admin.transport_detail.btn_preview_map': 'תצוגה מקדימה של מפה',

    // =========================================================================
    // SUPPORT  (admin_support.js)
    // =========================================================================
    'admin.support.my_tickets': 'הפניות שלי',
    'admin.support.new_ticket': 'פנייה חדשה',
    'admin.support.loading': 'טוען פניות...',
    'admin.support.back_to_list': 'חזרה לרשימה',
    'admin.support.reply_placeholder': 'כתוב תגובה...',
    'admin.support.create_title': 'יצירת פנייה',
    'admin.support.form.subject': 'נושא',
    'admin.support.form.subject_placeholder': 'תיאור קצר של הבעיה',
    'admin.support.form.category': 'קטגוריה',
    'admin.support.form.priority': 'עדיפות',
    'admin.support.form.message': 'הודעה',
    'admin.support.form.message_placeholder': 'פרט את הבעיה...',
    'admin.support.btn_create': 'צור פנייה',
    'admin.support.btn_send': 'שלח',
    'admin.support.empty.no_tickets': 'אין פניות פתוחות. לחץ על "פנייה חדשה" כדי לפנות לתמיכת הפלטפורמה.',
    'admin.support.error.subject_required': 'יש להזין נושא',
    'admin.support.error.message_required': 'יש להזין הודעה',
    'admin.support.ticket_created': 'הפנייה נוצרה',
    'admin.support.created_ago': 'נוצר {time}',
    'admin.support.platform_support': 'תמיכת פלטפורמה',
    'admin.support.no_messages_yet': 'אין הודעות עדיין.',
    'admin.support.ticket_closed': 'פנייה זו סגורה',
    'admin.support.error.reply_empty': 'לא ניתן לשלוח תגובה ריקה',
    'admin.support.reply_sent': 'התגובה נשלחה',
    'admin.support.cat.general': 'כללי',
    'admin.support.cat.billing': 'חיובים',
    'admin.support.cat.technical': 'טכני',
    'admin.support.cat.feature_request': 'בקשת תכונה',
    'admin.support.cat.account': 'חשבון',
    'admin.support.cat.bug_report': 'דיווח באג',
    'admin.support.cat.onboarding': 'הצטרפות',
    'admin.support.priority.low': 'נמוך',
    'admin.support.priority.medium': 'בינוני',
    'admin.support.priority.high': 'גבוה',
    'admin.support.priority.urgent': 'דחוף',
    'admin.support.status.open': 'פתוח',
    'admin.support.status.in_progress': 'בטיפול',
    'admin.support.status.waiting_on_club': 'ממתין לתגובה',
    'admin.support.status.resolved': 'נפתר',
    'admin.support.status.closed': 'סגור',
  },

  en: {
    // =========================================================================
    // PAGE HEADERS
    // =========================================================================
    'admin.header.dashboard': 'Dashboard',
    'admin.header.schedule': 'Schedule',
    'admin.header.teams': 'Teams',
    'admin.header.contacts': 'Contacts',
    'admin.header.roles': 'Roles',
    'admin.header.facilities': 'Facilities',
    'admin.header.billing': 'Finance',
    'admin.header.knowledge': 'Knowledge Base',
    'admin.header.messages': 'Messages',
    'admin.header.insights': 'AI Insights',
    'admin.header.scouting': 'Video Room',
    'admin.header.coaches': 'Coach Engagement',
    'admin.header.transport': 'Transportation',
    'admin.header.transport_detail': 'Transport Detail',
    'admin.header.support': 'Support',

    // =========================================================================
    // DASHBOARD  (admin_dashboard.js)
    // =========================================================================

    // --- empty states ---
    'admin.dashboard.empty.today': 'No activities scheduled for today',
    'admin.dashboard.empty.pending': 'No pending requests',
    'admin.dashboard.empty.upcoming': 'No events in the next 7 days',
    'admin.dashboard.empty.games': 'No game results',
    'admin.dashboard.score_pending': 'Pending',
    'admin.dashboard.empty.attendance': 'No attendance data',
    'admin.dashboard.empty.new_members': 'No new members this week',

    // --- more link ---
    'admin.dashboard.more_calendar': 'more \u00b7 Full calendar',

    // --- quick actions ---
    'admin.dashboard.approve_title': 'Approve',
    'admin.dashboard.reject_title': 'Reject',

    // --- toasts ---
    'admin.dashboard.request_approved': 'Request approved',
    'admin.dashboard.request_rejected': 'Request rejected',
    'admin.dashboard.approve_error': 'Error approving request',
    'admin.dashboard.reject_error': 'Error rejecting request',

    // --- attendance ---
    'admin.dashboard.attendance_records': 'attendance records',

    // --- time ago ---
    'admin.dashboard.today': 'Today',
    'admin.dashboard.yesterday': 'Yesterday',
    'admin.dashboard.days_ago': '{count} days ago',

    // =========================================================================
    // BILLING  (admin_billing.js)
    // =========================================================================

    // --- selects ---
    'admin.billing.select_team': 'Select Team...',
    'admin.billing.all_teams': 'All Teams',

    // --- empty states ---
    'admin.billing.empty.select_team': 'Select a team to view billing details',
    'admin.billing.empty.loading': 'Loading data...',
    'admin.billing.empty.no_billing_data': 'No billing data for any team.',
    'admin.billing.empty.no_unpaid': 'No unpaid players.',
    'admin.billing.empty.no_unpaid_single': 'No unpaid players.',
    'admin.billing.empty.no_data_team': 'No billing data for this team.',

    // --- table headers ---
    'admin.billing.th.player': 'Player',
    'admin.billing.th.plan': 'Plan',
    'admin.billing.th.paid': 'Paid',
    'admin.billing.th.balance': 'Balance',
    'admin.billing.th.one_time': 'One-Time',
    'admin.billing.th.status': 'Status',
    'admin.billing.th.actions': 'Actions',

    // --- row labels ---
    'admin.billing.installments_label': 'installments',
    'admin.billing.paid_label': 'Paid:',
    'admin.billing.balance_label': 'Balance:',
    'admin.billing.unpaid': 'unpaid',
    'admin.billing.details_btn': 'Details',

    // --- player detail modal ---
    'admin.billing.season_label': 'Season:',
    'admin.billing.method_label': 'Method:',
    'admin.billing.installment_paid': 'Paid',
    'admin.billing.installment_due': 'Due',
    'admin.billing.installment_label': 'Installment',
    'admin.billing.mark_paid_btn': 'Paid',
    'admin.billing.cancel_btn': 'Cancel',
    'admin.billing.one_time_charges_title': 'One-Time Charges',

    // --- mark paid modal ---
    'admin.billing.mark_paid_title': 'Mark as paid:',

    // --- adjust plan ---
    'admin.billing.adjust_prompt': 'Adjust total for {name}\nCurrent: {amount}\n\nNew total:',
    'admin.billing.plan_updated': 'Plan amount updated',
    'admin.billing.update_failed': 'Failed to update',

    // --- confirm mark paid ---
    'admin.billing.payment_recorded': 'Payment recorded',

    // --- cancel charge ---
    'admin.billing.cancel_confirm': 'Cancel this charge?',
    'admin.billing.charge_cancelled': 'Charge cancelled',
    'admin.billing.cancel_failed': 'Failed to cancel',

    // --- create plan ---
    'admin.billing.fill_required': 'Please fill all required fields',
    'admin.billing.plans_created': 'Created {created} plans ({skipped} already exist)',
    'admin.billing.plans_created_all_teams': 'Created {created} plans across {teams} teams ({skipped} already exist)',
    'admin.billing.plan_create_failed': 'Failed to create plans',

    // --- create charge ---
    'admin.billing.fill_charge_fields': 'Please fill Team, Title and Amount',
    'admin.billing.charges_created': 'Created {count} charges',

    // --- check overdue ---
    'admin.billing.overdue_updated': 'Updated: {installments} installments, {charges} charges',
    'admin.billing.checking_overdue': 'Checking...',
    'admin.billing.check_overdue_btn': 'Check Overdue',
    'admin.billing.overdue_check_failed': 'Overdue check failed',

    // --- new payments ---
    'admin.billing.new_payments_title': 'New Payments',
    'admin.billing.ack_all_btn': 'Mark All as Read',
    'admin.billing.all_acknowledged': 'All payments marked as read',

    // --- reminders ---
    'admin.billing.no_unpaid_players': 'No unpaid players in this team',
    'admin.billing.pending_label': 'pending',
    'admin.billing.reminders_sent': 'Sent {count} reminder messages',
    'admin.billing.reminders_failed': 'Failed to send reminders',

    // --- load error ---
    'admin.billing.load_failed': 'Failed to load team billing',

    // =========================================================================
    // TEAMS  (admin_teams.js)
    // =========================================================================

    // --- empty states ---
    'admin.teams.empty.no_teams': 'No teams yet',
    'admin.teams.empty.no_teams_desc': 'Create a team to get started',
    'admin.teams.empty.load_error': 'Could not load teams',

    // --- team card stats ---
    'admin.teams.coaches': 'coaches',
    'admin.teams.players': 'players',
    'admin.teams.parents': 'parents',

    // --- invite labels ---
    'admin.teams.coach_invite_code': 'Coach Invite Code',
    'admin.teams.coach_invite_link': 'Coach Invite Link',
    'admin.teams.player_invite_code': 'Player Invite Code',
    'admin.teams.player_invite_link': 'Player Invite Link',
    'admin.teams.parent_invite_code': 'Parent Invite Code',
    'admin.teams.parent_invite_link': 'Parent Invite Link',
    'admin.teams.copy_code': 'Copy code',
    'admin.teams.copy_link': 'Copy Link',
    'admin.teams.regenerate': 'Regenerate',

    // --- members ---
    'admin.teams.members': 'Members',
    'admin.teams.no_members': 'No members yet',
    'admin.teams.no_members_table': 'No members',
    'admin.teams.th.role': 'Role',
    'admin.teams.th.name': 'Name',
    'admin.teams.th.email': 'Email',
    'admin.teams.th.joined': 'Joined',
    'admin.teams.parent_of': 'parent of',
    'admin.teams.remove_title': 'Remove',

    // --- toasts ---
    'admin.teams.coach_code_regenerated': 'Coach invite code regenerated',
    'admin.teams.player_code_regenerated': 'Player invite code regenerated',
    'admin.teams.parent_code_regenerated': 'Parent invite code regenerated',
    'admin.teams.remove_confirm': 'Remove this member from the team?',
    'admin.teams.member_removed': 'Member removed',
    'admin.teams.team_created': 'Team created',
    'admin.teams.btn_assign_coach': 'Assign Coach',
    'admin.teams.assign_coach_title': 'Assign Coach to Team',
    'admin.teams.select_coach': 'Select Coach',
    'admin.teams.assign_coach_optional': 'Coach (optional)',
    'admin.teams.btn_assign': 'Assign',
    'admin.teams.coach_assigned': 'Coach assigned successfully',
    'admin.teams.assign_failed': 'Failed to assign coach',

    // --- player profile ---
    'admin.teams.loading_player': 'Loading player data...',
    'admin.teams.player_load_error': 'Could not load player profile',

    // =========================================================================
    // SCHEDULE  (admin_schedule.js)
    // =========================================================================

    // --- selects ---
    'admin.schedule.all_teams': 'All Teams',
    'admin.schedule.select_team': 'Select team...',
    'admin.schedule.no_facility': 'No facility',
    'admin.schedule.other_custom': 'Other (custom)...',

    // --- empty states ---
    'admin.schedule.empty.no_events': 'No events',
    'admin.schedule.empty.no_events_desc': 'Add events for your teams',
    'admin.schedule.empty.load_error': 'Could not load schedule',

    // --- event modal ---
    'admin.schedule.add_event': 'Add Event',
    'admin.schedule.edit_event': 'Edit Event',

    // --- badges ---
    'admin.schedule.badge.away': 'Away',
    'admin.schedule.badge.recurring': 'Recurring',
    'admin.schedule.badge.pending': 'Pending',

    // --- toasts ---
    'admin.schedule.time_end_before_start': 'End time must be after start time',
    'admin.schedule.event_updated': 'Event updated',
    'admin.schedule.event_created': 'Event created',
    'admin.schedule.events_created': '{count} events created',
    'admin.schedule.series_deleted': 'Series deleted',
    'admin.schedule.event_deleted': 'Event deleted',

    // --- confirms ---
    'admin.schedule.delete_series_confirm': 'Delete all events in this recurring series?\n\nOK = Delete series\nCancel = Delete only this one',
    'admin.schedule.delete_event_confirm': 'Delete this event?',

    // --- pending requests ---
    'admin.schedule.empty.no_requests': 'No pending requests',
    'admin.schedule.empty.requests_load_error': 'Could not load requests',
    'admin.schedule.approve_confirm': 'Approve this schedule request? It will be added to the team calendar.',
    'admin.schedule.request_approved': 'Request approved \u2014 event created!',
    'admin.schedule.request_rejected': 'Request rejected',
    'admin.schedule.reject_reason_prompt': 'Reason for rejection (optional):',
    'admin.schedule.approve_btn': 'Approve',
    'admin.schedule.reject_btn': 'Reject',

    // =========================================================================
    // KNOWLEDGE BASE  (admin_knowledge.js)
    // =========================================================================

    // --- filters ---
    'admin.knowledge.all_categories': 'All Categories',
    'admin.knowledge.select_category': 'Select...',

    // --- empty states ---
    'admin.knowledge.empty.no_docs': 'No documents',
    'admin.knowledge.empty.no_docs_desc': 'Upload documents to build the knowledge base',
    'admin.knowledge.empty.load_error': 'Failed to load documents',
    'admin.knowledge.loading': 'Loading documents...',

    // --- document card ---
    'admin.knowledge.untitled': 'Untitled',
    'admin.knowledge.chunks_label': 'chunks',
    'admin.knowledge.doc_count': '{count} documents',

    // --- status badges ---
    'admin.knowledge.status.ready': 'Ready',
    'admin.knowledge.status.processing': 'Processing',
    'admin.knowledge.status.error': 'Error',

    // --- scope badges ---
    'admin.knowledge.scope.system': 'System',
    'admin.knowledge.scope.club': 'Club',
    'admin.knowledge.scope.coach': 'Coach',

    // --- detail modal labels ---
    'admin.knowledge.detail.file': 'File:',
    'admin.knowledge.detail.size': 'Size:',
    'admin.knowledge.detail.chunks': 'Chunks:',
    'admin.knowledge.detail.uploaded': 'Uploaded:',
    'admin.knowledge.detail.content_preview': 'Content Preview',
    'admin.knowledge.detail.processing_error': 'Processing Error',
    'admin.knowledge.detail.language_he': 'Hebrew',
    'admin.knowledge.detail.language_en': 'English',

    // --- actions ---
    'admin.knowledge.retry_btn': 'Retry',
    'admin.knowledge.delete_btn': 'Delete',
    'admin.knowledge.download_btn': 'Download',

    // --- upload ---
    'admin.knowledge.drop_zone_text': 'Click to select or drag & drop',
    'admin.knowledge.uploading': 'Uploading...',
    'admin.knowledge.upload_btn': 'Upload',
    'admin.knowledge.upload_success': 'Document uploaded! Processing in background...',
    'admin.knowledge.upload_error.no_file': 'Please select a file',
    'admin.knowledge.upload_error.no_title': 'Please enter a title',
    'admin.knowledge.upload_error.no_category': 'Please select a category',

    // --- toasts ---
    'admin.knowledge.download_failed': 'Download failed',
    'admin.knowledge.delete_confirm': 'Delete this document? This cannot be undone.',
    'admin.knowledge.document_deleted': 'Document deleted',
    'admin.knowledge.reprocessing_started': 'Reprocessing started',

    // =========================================================================
    // INSIGHTS  (admin_insights.js)
    // =========================================================================

    // --- financial agent ---
    'admin.insights.fin.loading': 'Loading financial insights...',
    'admin.insights.fin.total': 'Total:',
    'admin.insights.fin.paid': 'Paid:',
    'admin.insights.fin.pending': 'Pending:',
    'admin.insights.fin.overdue': 'Overdue:',
    'admin.insights.fin.collection': 'Collection:',
    'admin.insights.fin.parents_overdue': '{count} parents overdue',
    'admin.insights.fin.no_overdue': 'No overdue',
    'admin.insights.fin.load_error': 'Error loading financial insights',

    // --- financial report ---
    'admin.insights.fin.report_loading': 'Generating financial report... (this may take a few seconds)',
    'admin.insights.fin.report_success': 'Financial report generated successfully',
    'admin.insights.fin.report_error': 'Error generating report',
    'admin.insights.fin.report_gen_error': 'Error generating financial report',

    // --- financial chat ---
    'admin.insights.fin.computing': 'Computing...',
    'admin.insights.fin.chat_error': 'Error getting response',

    // --- financial reminders ---
    'admin.insights.fin.sending_reminders': 'Sending reminders...',
    'admin.insights.fin.reminders_sent': '{count} reminders sent',
    'admin.insights.fin.no_reminders_needed': 'No parents require a reminder',
    'admin.insights.fin.reminder_toast_sent': '{count} payment reminders sent',
    'admin.insights.fin.reminder_toast_none': 'No parents require a reminder right now',
    'admin.insights.fin.reminder_error': 'Error sending reminders',

    // --- financial report history ---
    'admin.insights.fin.no_saved_reports': 'No saved reports',
    'admin.insights.report_type.auto': 'Auto',
    'admin.insights.report_type.manual': 'Manual',

    // --- professional agent ---
    'admin.insights.pro.loading': 'Loading professional insights...',
    'admin.insights.pro.players_need_attention': '{count} players need attention',
    'admin.insights.pro.no_alerts': 'No alerts',
    'admin.insights.pro.load_error': 'Error loading professional insights',

    // --- professional report ---
    'admin.insights.pro.report_loading': 'Generating professional report... (this may take a few seconds)',
    'admin.insights.pro.report_success': 'Professional report generated successfully',
    'admin.insights.pro.report_error': 'Error generating report',
    'admin.insights.pro.report_gen_error': 'Error generating professional report',
    'admin.insights.pro.no_saved_reports': 'No saved reports',

    // --- professional chat ---
    'admin.insights.pro.computing': 'Computing...',
    'admin.insights.pro.chat_error': 'Error getting response',

    // --- player list / filters ---
    'admin.insights.players.all_teams': 'All Teams',
    'admin.insights.players.count': '{count} players',
    'admin.insights.players.no_results': 'No results',
    'admin.insights.players.empty': 'No players match the filter.',

    // --- player list table headers ---
    'admin.insights.players.th.name': 'Name',
    'admin.insights.players.th.team': 'Team',
    'admin.insights.players.th.position': 'Position',
    'admin.insights.players.th.dob': 'Date of Birth',
    'admin.insights.players.th.actions': 'Actions',

    // --- player positions (short) ---
    'admin.insights.pos.PG': 'PG',
    'admin.insights.pos.SG': 'SG',
    'admin.insights.pos.SF': 'SF',
    'admin.insights.pos.PF': 'PF',
    'admin.insights.pos.C': 'C',

    // --- player actions ---
    'admin.insights.players.ai_card': 'AI Card',
    'admin.insights.players.coach_report': 'Coach Report',
    'admin.insights.players.coming_soon': 'Coming soon',
    'admin.insights.players.age': 'Age',

    // --- player AI card ---
    'admin.insights.player_card.loading': 'Loading player card...',
    'admin.insights.player_card.load_error': 'Error loading player card',

    // --- saved report loading ---
    'admin.insights.saved_report.loading': 'Loading report...',
    'admin.insights.saved_report.load_error': 'Error loading report',

    // =========================================================================
    // ROLES  (admin_roles.js)
    // =========================================================================

    // --- empty states ---
    'admin.roles.empty.no_roles': 'No roles',
    'admin.roles.empty.load_error': 'Could not load roles',

    // --- table headers ---
    'admin.roles.th.role': 'Role',
    'admin.roles.th.description': 'Description',
    'admin.roles.th.type': 'Type',

    // --- badges ---
    'admin.roles.badge.default': 'Default',
    'admin.roles.th.permissions': 'Permissions',
    'admin.roles.permissions.sections': 'sections',
    'admin.roles.permissions.all_access': 'Full Access',
    'admin.roles.permissions.edit': 'Edit Permissions',
    'admin.roles.permissions.modal_title': 'Edit Permissions',
    'admin.roles.permissions.all_access_label': 'Full Access (no restrictions)',
    'admin.roles.permissions.all_access_desc': 'Admin can access all sections',
    'admin.roles.permissions.select_sections': 'Select accessible sections:',
    'admin.roles.permissions.save_btn': 'Save Permissions',
    'admin.roles.permissions.saved': 'Permissions saved successfully',
    'admin.roles.badge.custom': 'Custom',

    // --- toasts ---
    'admin.roles.role_created': 'Role created',
    'admin.roles.role_deleted': 'Role deleted',
    'admin.roles.delete_confirm': 'Delete this role?',

    // --- coaches tab ---
    'admin.roles.coaches.loading': 'Loading coaches...',
    'admin.roles.coaches.empty': 'No coaches in the club',
    'admin.roles.coaches.load_error': 'Error loading coaches',
    'admin.roles.coaches.count': '{count} coaches',

    // --- coaches table headers ---
    'admin.roles.coaches.th.name': 'Name',
    'admin.roles.coaches.th.team': 'Team',
    'admin.roles.coaches.th.email': 'Email',
    'admin.roles.coaches.th.phone': 'Phone',
    'admin.roles.coaches.th.joined': 'Joined',

    // =========================================================================
    // SCOUTING  (admin_scouting.js)
    // =========================================================================

    // --- action types ---
    'admin.scouting.action.pick_and_roll': 'Pick & Roll',
    'admin.scouting.action.isolation': 'Isolation',
    'admin.scouting.action.fast_break': 'Fast Break',
    'admin.scouting.action.defense': 'Defense',
    'admin.scouting.action.transition': 'Transition',
    'admin.scouting.action.three_pointer': '3-Pointer',
    'admin.scouting.action.post_up': 'Post Up',
    'admin.scouting.action.screen': 'Screen',
    'admin.scouting.action.turnover': 'Turnover',
    'admin.scouting.action.rebound': 'Rebound',
    'admin.scouting.action.free_throw': 'Free Throw',
    'admin.scouting.action.out_of_bounds': 'Out of Bounds',
    'admin.scouting.action.other': 'Other',

    // --- empty states ---
    'admin.scouting.empty.no_videos': 'No videos found for selected team.',
    'admin.scouting.empty.load_error': 'Failed to load videos',
    'admin.scouting.empty.no_clips': 'No clips yet',

    // --- video card ---
    'admin.scouting.shared': 'Shared',
    'admin.scouting.parents': 'Parents',
    'admin.scouting.clips': 'clips',
    'admin.scouting.views': 'views',

    // --- toasts ---
    'admin.scouting.load_video_error': 'Failed to load video',

    // --- clip count ---
    'admin.scouting.clip_count': '({count})',

    // =========================================================================
    // COACHES ENGAGEMENT  (admin_coaches.js)
    // =========================================================================

    // --- loading ---
    'admin.coaches.loading': 'Loading...',
    'admin.coaches.count': '{count} coaches',
    'admin.coaches.load_error': 'Could not load data',

    // --- empty ---
    'admin.coaches.empty': 'No coaches found',

    // --- categories ---
    'admin.coaches.cat.reports': 'Reports',
    'admin.coaches.cat.communication': 'Communication',
    'admin.coaches.cat.training': 'Training',
    'admin.coaches.cat.attendance': 'Attendance',
    'admin.coaches.cat.ai_usage': 'AI Usage',

    // --- quick stats ---
    'admin.coaches.stat.evals': 'Evals',
    'admin.coaches.stat.games': 'Games',
    'admin.coaches.stat.msgs': 'Msgs',
    'admin.coaches.stat.drills': 'Drills',
    'admin.coaches.view_profile': 'Full Profile',
    'admin.coach_profile.title': 'Coach Profile',
    'admin.coach_profile.load_error': 'Error loading coach profile',
    'admin.coach_profile.engagement_score': 'Engagement Score',
    'admin.coach_profile.section.engagement': 'Engagement Analysis',
    'admin.coach_profile.section.activity': 'Recent Activity',
    'admin.coach_profile.last_90_days': 'last 90 days',
    'admin.coach_profile.score.reports': 'Reports',
    'admin.coach_profile.score.communication': 'Communication',
    'admin.coach_profile.score.training': 'Training',
    'admin.coach_profile.score.attendance': 'Attendance',
    'admin.coach_profile.score.ai_usage': 'AI Usage',

    // --- last activity ---
    'admin.coaches.no_activity': 'No activity',
    'admin.coaches.just_now': 'Just now',
    'admin.coaches.never': 'Never',

    // --- detail modal ---
    'admin.coaches.detail.loading': 'Loading...',
    'admin.coaches.detail.load_error': 'Could not load activity',
    'admin.coaches.detail.score_breakdown': 'SCORE BREAKDOWN',
    'admin.coaches.detail.stats_90_days': 'STATS (90 DAYS)',
    'admin.coaches.detail.recent_activity': 'RECENT ACTIVITY',

    // --- detail stats ---
    'admin.coaches.detail.evaluations': 'Evaluations',
    'admin.coaches.detail.game_reports': 'Game Reports',
    'admin.coaches.detail.player_reports': 'Player Reports',
    'admin.coaches.detail.messages': 'Messages',
    'admin.coaches.detail.drills': 'Drills',
    'admin.coaches.detail.practices': 'Practices',
    'admin.coaches.detail.plays': 'Plays',
    'admin.coaches.detail.assignments': 'Assignments',
    'admin.coaches.detail.ai_chats': 'AI Chats',

    'admin.player_profile.title': 'Player Profile',
    'admin.player_profile.load_error': 'Error loading player profile',
    'admin.player_profile.stat.attendance': 'Attendance',
    'admin.player_profile.stat.evaluations': 'Evaluations',
    'admin.player_profile.stat.reports': 'Reports',
    'admin.player_profile.stat.drills': 'Drills',
    'admin.player_profile.section.evaluation': 'Player Evaluation',
    'admin.player_profile.section.reports': 'Development Reports',
    'admin.player_profile.section.attendance': 'Attendance',
    'admin.player_profile.section.drills': 'Drills',
    'admin.player_profile.eval.offensive': 'Offense',
    'admin.player_profile.eval.defensive': 'Defense',
    'admin.player_profile.eval.iq': 'Basketball IQ',
    'admin.player_profile.eval.social': 'Social',
    'admin.player_profile.eval.leadership': 'Leadership',
    'admin.player_profile.eval.work_ethic': 'Work Ethic',
    'admin.player_profile.eval.fitness': 'Fitness',
    'admin.player_profile.eval.improvement': 'Improvement',
    'admin.player_profile.eval.leaving_risk': 'Leaving Risk',
    'admin.player_profile.attendance.events': 'sessions',
    'admin.player_profile.attendance.low': 'Low attendance',
    'admin.player_profile.attendance.medium': 'Average attendance',
    'admin.player_profile.attendance.good': 'Good attendance',
    'admin.contacts.age_prefix': 'age',
    // =========================================================================
    // CONTACTS  (admin_contacts.js)
    // =========================================================================
    'admin.player_profile.drill.approved': 'Approved',
    'admin.player_profile.drill.rejected': 'Rejected',
    'admin.player_profile.drill.pending': 'Pending',
    'admin.player_profile.drill.video_uploaded': 'Video Uploaded',

    // --- header ---
    'admin.contacts.count': '{count} contacts',

    // --- empty ---
    'admin.contacts.empty.no_contacts': 'No contacts found',
    'admin.contacts.empty.no_contacts_desc': 'Try changing your filters or invite members to your teams',
    'admin.contacts.empty.load_error': 'Could not load contacts',

    // --- table headers ---
    'admin.contacts.th.name': 'Name',
    'admin.contacts.th.email': 'Email',
    'admin.contacts.th.role': 'Role',
    'admin.contacts.th.team': 'Team',
    'admin.contacts.th.phone': 'Phone',
    'admin.contacts.th.details': 'Details',
    'admin.contacts.th.joined': 'Joined',

    // --- details ---
    'admin.contacts.parent_of': 'Parent of',
    'admin.contacts.age_prefix': 'Age',

    // =========================================================================
    // MESSAGES  (admin_messages.js)
    // =========================================================================

    // --- empty states ---
    'admin.messages.empty.inbox': 'No messages',
    'admin.messages.empty.sent': 'No sent messages',
    'admin.messages.empty.scheduled': 'No scheduled messages',
    'admin.messages.empty.hoops': 'No system updates',
    'admin.messages.empty.invoices': 'No invoices',
    'admin.messages.empty.load_error': 'Could not load messages',
    'admin.messages.empty.load_error_short': 'Could not load',
    'admin.messages.empty.invoices_error': 'Could not load invoices',

    // --- detail ---
    'admin.messages.detail.default_subject': 'Message',
    'admin.messages.detail.download_pdf': 'Download PDF',

    // --- toasts ---
    'admin.messages.all_read': 'All messages marked as read',
    'admin.messages.all_hoops_read': 'All marked as read',
    'admin.messages.scheduled_cancelled': 'Scheduled message cancelled',
    'admin.messages.cancel_confirm': 'Cancel this scheduled message?',
    'admin.messages.stats_error': 'Could not load stats',
    'admin.messages.pdf_error': 'Failed to download PDF',

    // --- stats modal labels ---
    'admin.messages.stats.total': 'Total',
    'admin.messages.stats.read': 'Read',
    'admin.messages.stats.unread': 'Unread',

    // --- scheduled labels ---
    'admin.messages.scheduled_prefix': 'Scheduled:',
    'admin.messages.cancel_btn': 'Cancel',

    // --- hoops updates ---
    'admin.messages.hoops.type.billing': 'Billing',
    'admin.messages.hoops.type.system': 'System',

    // --- compose ---
    'admin.messages.compose.body_required': 'Message body is required',
    'admin.messages.compose.select_team': 'Select at least one team',
    'admin.messages.compose.select_user': 'Select a user',
    'admin.messages.compose.set_schedule': 'Set date and time for scheduling',
    'admin.messages.compose.sent': 'Message sent',
    'admin.messages.compose.scheduled': 'Message scheduled',

    // --- individual target ---
    'admin.messages.indiv.select_team': '-- Select Team --',
    'admin.messages.indiv.select_person': '-- Select Person --',
    'admin.messages.indiv.no_members': '-- No members found --',
    'admin.messages.indiv.loading': 'Loading...',
    'admin.messages.indiv.load_error': '-- Error loading --',

    // --- target labels ---
    'admin.messages.target.all_club': 'All Club',
    'admin.messages.target.all_coaches': 'All Coaches',
    'admin.messages.target.all_players': 'All Players',
    'admin.messages.target.all_parents': 'All Parents',
    'admin.messages.target.team': 'Specific Teams',
    'admin.messages.target.team_players': 'Team Players',
    'admin.messages.target.team_parents': 'Team Parents',
    'admin.messages.target.team_coaches': 'Team Coaches',
    'admin.messages.target.individual': 'Individual',
    'admin.messages.target.admin': 'Admin',
    'admin.messages.target.my_team': 'My Team',
    'admin.messages.target.my_coach': 'My Coach',
    'admin.messages.target.my_team_players': 'Team Players',
    'admin.messages.target.my_team_parents': 'Team Parents',

    // --- invoice tab ---
    'admin.messages.invoice.total_invoiced': 'Total Invoiced',
    'admin.messages.invoice.paid': 'Paid',
    'admin.messages.invoice.open': 'Open',
    'admin.messages.invoice.overdue': 'Overdue',
    'admin.messages.invoice.issued': 'Issued:',
    'admin.messages.invoice.due': 'Due:',
    'admin.messages.invoice.paid_date': 'Paid:',
    'admin.messages.invoice.download_pdf': 'Download PDF',

    // --- invoice type labels ---
    'admin.messages.invoice.type.tax_invoice': 'Tax Invoice',
    'admin.messages.invoice.type.receipt': 'Receipt',
    'admin.messages.invoice.type.credit_note': 'Credit Note',
    'admin.messages.invoice.type.quote': 'Quote',

    // =========================================================================
    // PLAYER DEVELOPMENT  (admin_player_development.js)
    // =========================================================================

    'admin.player_dev.page_title': 'Player Development',

    // --- counts ---
    'admin.player_dev.count': '{count} players',

    // --- empty states ---
    'admin.player_dev.empty.no_players': 'No players found',
    'admin.player_dev.empty.no_players_desc': 'Try changing your filters',
    'admin.player_dev.empty.load_error': 'Could not load players',
    'admin.player_dev.empty.loading': 'Loading...',
    'admin.player_dev.empty.load_player_error': 'Could not load player data',

    // --- table headers ---
    'admin.player_dev.th.name': 'Name',
    'admin.player_dev.th.position': 'Position',
    'admin.player_dev.th.jersey': 'Jersey',
    'admin.player_dev.th.team': 'Team',
    'admin.player_dev.th.age': 'Age',
    'admin.player_dev.th.height': 'Height',

    // --- detail tabs ---
    'admin.player_dev.tab.profile': 'Profile',
    'admin.player_dev.tab.reports': 'Reports',
    'admin.player_dev.tab.evaluations': 'Evaluations',

    // --- evaluations ---
    'admin.player_dev.eval.empty': 'No evaluations for this player yet',
    'admin.player_dev.eval.cat.offensive': 'Offensive',
    'admin.player_dev.eval.cat.defensive': 'Defensive',
    'admin.player_dev.eval.cat.basketball_iq': 'Basketball IQ',
    'admin.player_dev.eval.cat.social': 'Social',
    'admin.player_dev.eval.cat.leadership': 'Leadership',
    'admin.player_dev.eval.cat.work_ethic': 'Work Ethic',
    'admin.player_dev.eval.cat.fitness': 'Fitness',
    'admin.player_dev.eval.cat.improvement': 'Improvement',
    'admin.player_dev.eval.cat.leaving_risk': 'Leaving Risk',
    'admin.player_dev.eval.avg': 'avg',
    'admin.player_dev.eval.potential': 'Potential:',

    // --- evaluation periods ---
    'admin.player_dev.eval.period.weekly': 'Weekly',
    'admin.player_dev.eval.period.monthly': 'Monthly',
    'admin.player_dev.eval.period.semi_annual': 'Semi-Annual',
    'admin.player_dev.eval.period.annual': 'Annual',

    // --- reports tab ---
    'admin.player_dev.reports.empty': 'No reports written for this player yet',
    'admin.player_dev.reports.strengths': 'Strengths',
    'admin.player_dev.reports.weaknesses': 'Weaknesses',
    'admin.player_dev.reports.focus_areas': 'Focus Areas',
    'admin.player_dev.reports.recommendations': 'Recommendations',
    'admin.player_dev.reports.progress_notes': 'Progress Notes',

    // --- report requests ---
    'admin.player_dev.rr.select_team': 'Select team...',
    'admin.player_dev.rr.all_coaches': 'All coaches in team',
    'admin.player_dev.rr.select_team_error': 'Select a team',
    'admin.player_dev.rr.due_date_error': 'Set a due date',
    'admin.player_dev.rr.success': 'Report request sent to coaches!',
    'admin.player_dev.rr.error': 'Failed to send request',

    // =========================================================================
    // TRANSPORT  (admin_transport.js)
    // =========================================================================

    // --- selects ---
    'admin.transport.all_teams': 'All Teams',

    // --- empty ---
    'admin.transport.empty.no_away_games': 'No upcoming away games',
    'admin.transport.empty.no_away_desc': 'Create a game event and mark it as "Away Game" in the schedule',
    'admin.transport.empty.load_error': 'Could not load away games',

    // --- labels ---
    'admin.transport.away_badge': 'Away',
    'admin.transport.departure': 'Departure:',
    'admin.transport.not_set': 'Not set',
    'admin.transport.no_address': 'No address',
    'admin.transport.waze': 'Waze',
    'admin.transport.details_btn': 'Details',

    // =========================================================================
    // TRANSPORT DETAIL  (admin_transport_detail.js)
    // =========================================================================

    // --- section headers ---
    'admin.transport_detail.away_game': 'Away Game',

    // --- labels ---
    'admin.transport_detail.date': 'Date',
    'admin.transport_detail.team': 'Team',
    'admin.transport_detail.game_time': 'Game Time',
    'admin.transport_detail.opponent': 'Opponent',
    'admin.transport_detail.departure_time': 'Departure Time',
    'admin.transport_detail.venue_address': 'Venue Address',
    'admin.transport_detail.location': 'Location:',
    'admin.transport_detail.notes': 'Notes:',
    'admin.transport_detail.not_set': 'Not set',

    // --- navigation ---
    'admin.transport_detail.navigate_waze': 'Navigate with Waze',
    'admin.transport_detail.google_maps': 'Google Maps',

    // --- toasts ---
    'admin.transport_detail.empty.load_error': 'Could not load event details',
    'admin.transport_detail.address_required': 'Enter a venue address first',
    'admin.transport_detail.saved': 'Transport info updated & team notified',

    // =========================================================================
    // FACILITIES  (admin_facilities.js)
    // =========================================================================

    // --- empty states ---
    'admin.facilities.empty.no_facilities': 'No facilities',
    'admin.facilities.empty.no_facilities_desc': 'Add your first facility',
    'admin.facilities.empty.load_error': 'Could not load facilities',

    // --- table headers ---
    'admin.facilities.th.name': 'Name',
    'admin.facilities.th.type': 'Type',
    'admin.facilities.th.address': 'Address',
    'admin.facilities.th.capacity': 'Capacity',
    'admin.facilities.th.manager': 'Manager',
    'admin.facilities.th.phone': 'Phone',

    // --- modal ---
    'admin.facilities.modal.add': 'Add Facility',
    'admin.facilities.modal.edit': 'Edit Facility',

    // --- toasts ---
    'admin.facilities.facility_updated': 'Facility updated',
    'admin.facilities.facility_created': 'Facility created',
    'admin.facilities.facility_deleted': 'Facility deleted',
    'admin.facilities.delete_confirm': 'Delete this facility?',

    // =========================================================================
    // HTML TEMPLATE STRINGS
    // =========================================================================

    // --- admin_dashboard.html ---
    'admin.dashboard.stat_teams': 'Teams',
    'admin.dashboard.stat_coaches': 'Coaches',
    'admin.dashboard.stat_players': 'Players',
    'admin.dashboard.stat_parents': 'Parents',
    'admin.dashboard.ql_schedule': 'Schedule',
    'admin.dashboard.ql_schedule_sub': 'Calendar & Requests',
    'admin.dashboard.ql_teams': 'Teams',
    'admin.dashboard.ql_teams_sub': 'Manage & Invite',
    'admin.dashboard.ql_roles': 'Roles',
    'admin.dashboard.ql_roles_sub': 'Admin Permissions',

    // --- admin_schedule.html ---
    'admin.schedule.section_title': 'Schedule',
    'admin.schedule.btn_add_event': 'Add Event',
    'admin.schedule.loading': 'Loading schedule...',
    'admin.schedule.requests_title': 'Schedule Requests',
    'admin.schedule.loading_requests': 'Loading requests...',
    'admin.schedule.btn_save_event': 'Save Event',
    'admin.schedule.form.team': 'Team *',
    'admin.schedule.form.title': 'Title *',
    'admin.schedule.form.title_placeholder': 'e.g. Weekly Practice',
    'admin.schedule.form.type': 'Type *',
    'admin.schedule.form.social': 'Social Activity',
    'admin.schedule.form.date': 'Date *',
    'admin.schedule.form.start_time': 'Start Time',
    'admin.schedule.form.end_time': 'End Time',
    'admin.schedule.form.facility': 'Facility',
    'admin.schedule.form.custom_location': 'Custom Location',
    'admin.schedule.form.custom_location_placeholder': 'Enter location name',
    'admin.schedule.form.opponent': 'Opponent',
    'admin.schedule.form.opponent_placeholder': 'Opponent team',
    'admin.schedule.form.game_location': 'Game Location',
    'admin.schedule.form.home': 'Home (בית)',
    'admin.schedule.form.away': 'Away (חוץ)',
    'admin.schedule.form.departure_time': 'Departure Time (שעת יציאה)',
    'admin.schedule.form.venue_address': 'Venue Address (כתובת)',
    'admin.schedule.form.venue_address_placeholder': 'Full address for Google Maps',
    'admin.schedule.form.view_transport': 'View in Transportation page',
    'admin.schedule.form.notes': 'Notes',
    'admin.schedule.form.notes_placeholder': 'Optional notes',
    'admin.schedule.form.repeat_weekly': 'Repeat Weekly (weeks)',
    'admin.schedule.form.repeat_placeholder': '1 = single event',

    // --- admin_teams.html ---
    'admin.teams.section_title': 'Teams',
    'admin.teams.btn_create_team': 'Create Team',
    'admin.teams.loading': 'Loading teams...',
    'admin.teams.modal_create_title': 'Create Team',
    'admin.teams.player_profile_title': 'Player Profile',
    'admin.teams.form.team_name': 'Team Name *',
    'admin.teams.form.team_name_placeholder': 'e.g. Warriors U14',
    'admin.teams.form.club_name': 'Club Name',
    'admin.teams.form.club_name_placeholder': 'e.g. Maccabi Haifa',
    'admin.teams.form.age_group': 'Age Group',
    'admin.teams.form.select': 'Select...',
    'admin.teams.form.senior': 'Senior',
    'admin.teams.form.level': 'Level',
    'admin.teams.form.level_recreational': 'Recreational',
    'admin.teams.form.level_competitive': 'Competitive',
    'admin.teams.form.level_elite': 'Elite',
    'admin.teams.form.level_professional': 'Professional',

    // --- admin_contacts.html ---
    'admin.contacts.filter_all_teams': 'All Teams',
    'admin.contacts.tab_all': 'All',
    'admin.contacts.tab_coaches': 'Coaches',
    'admin.contacts.tab_players': 'Players',
    'admin.contacts.tab_parents': 'Parents',
    'admin.contacts.search_placeholder': 'Search name or email...',
    'admin.contacts.loading': 'Loading...',

    // --- admin_roles.html ---
    'admin.roles.section_title': 'Admin Roles',
    'admin.roles.btn_add_role': 'Add Role',
    'admin.roles.loading': 'Loading roles...',
    'admin.roles.modal_add_title': 'Add Admin Role',
    'admin.roles.btn_create_role': 'Create Role',
    'admin.roles.form.role_name': 'Role Name *',
    'admin.roles.form.role_name_placeholder': 'e.g. Treasurer',
    'admin.roles.form.description': 'Description',
    'admin.roles.form.description_placeholder': 'Optional description',

    // --- admin_facilities.html ---
    'admin.facilities.section_title': 'Facilities',
    'admin.facilities.btn_add': 'Add Facility',
    'admin.facilities.loading': 'Loading facilities...',
    'admin.facilities.btn_save': 'Save Facility',
    'admin.facilities.form.name': 'Name *',
    'admin.facilities.form.name_placeholder': 'e.g. Main Gym',
    'admin.facilities.form.type': 'Type *',
    'admin.facilities.form.type_gym': 'Gym',
    'admin.facilities.form.type_court': 'Court',
    'admin.facilities.form.type_field': 'Field',
    'admin.facilities.form.type_pool': 'Pool',
    'admin.facilities.form.capacity': 'Capacity',
    'admin.facilities.form.address': 'Address',
    'admin.facilities.form.address_placeholder': 'Facility address',
    'admin.facilities.form.manager_name': 'Manager',
    'admin.facilities.form.manager_name_placeholder': 'Facility manager name',
    'admin.facilities.form.manager_phone': 'Phone',
    'admin.facilities.form.manager_phone_placeholder': '050-0000000',
    'admin.facilities.form.notes': 'Notes',
    'admin.facilities.form.notes_placeholder': 'Optional notes',

    // --- admin_billing.html ---
    'admin.billing.label_total_expected': 'Total Expected',
    'admin.billing.label_paid': 'Paid',
    'admin.billing.label_pending': 'Pending',
    'admin.billing.label_overdue': 'Overdue',
    'admin.billing.btn_create_plan': 'Create Payment Plan',
    'admin.billing.btn_one_time_charge': 'One-Time Charge',
    'admin.billing.btn_check_overdue': 'Check Overdue',
    'admin.billing.section_team_billing': 'Team Billing',
    'admin.billing.select_team_option': 'Select Team...',
    'admin.billing.season_placeholder': 'Season (e.g. 2025-2026)',
    'admin.billing.unpaid_only': 'Unpaid only',
    'admin.billing.btn_send_reminder': 'Send Reminder to Unpaid',
    'admin.billing.modal_create_plan_title': 'Create Payment Plan',
    'admin.billing.modal_charge_title': 'One-Time Charge',
    'admin.billing.modal_mark_paid_title': 'Mark Payment',
    'admin.billing.modal_player_details_title': 'Player Details',
    'admin.billing.modal_reminder_title': 'Send Payment Reminders',
    'admin.billing.reminder_desc': 'A reminder message will be sent to the parents of the following players:',
    'admin.billing.btn_create_plans': 'Create Plans',
    'admin.billing.btn_create_charge': 'Create',
    'admin.billing.btn_confirm_payment': 'Confirm Payment',
    'admin.billing.btn_adjust_amount': 'Adjust Amount',
    'admin.billing.btn_send_reminders': 'Send Reminders',
    'admin.billing.plan_note': 'Plans will be created for all active players in the team. You can adjust individual amounts after creation.',
    'admin.billing.charge_note': 'Will be created for all active players in the selected team.',
    'admin.billing.form.team': 'Team',
    'admin.billing.form.season': 'Season',
    'admin.billing.form.annual_amount': 'Annual Amount (₪)',
    'admin.billing.form.installments': 'Installments',
    'admin.billing.form.start_month': 'Start Month',
    'admin.billing.form.billing_day': 'Billing Day',
    'admin.billing.form.payment_method': 'Payment Method',
    'admin.billing.form.description_optional': 'Description (optional)',
    'admin.billing.form.title': 'Title',
    'admin.billing.form.amount': 'Amount (₪)',
    'admin.billing.form.due_date_optional': 'Due Date (optional)',
    'admin.billing.form.paid_date': 'Paid Date',
    'admin.billing.form.note_optional': 'Note (optional)',

    // --- admin_knowledge.html ---
    'admin.knowledge.stat_documents': 'Documents',
    'admin.knowledge.stat_chunks': 'Chunks',
    'admin.knowledge.stat_total_size': 'Total Size',
    'admin.knowledge.section_documents': 'Documents',
    'admin.knowledge.btn_upload_document': 'Upload Document',
    'admin.knowledge.filter_all_statuses': 'All Statuses',
    'admin.knowledge.filter_all_scopes': 'All Scopes',
    'admin.knowledge.modal_upload_title': 'Upload Document',
    'admin.knowledge.modal_detail_title': 'Document Details',
    'admin.knowledge.file_types_hint': 'PDF, DOCX, or TXT — Max 20MB',
    'admin.knowledge.form.file': 'File *',
    'admin.knowledge.form.title': 'Title *',
    'admin.knowledge.form.title_placeholder': 'Document title',
    'admin.knowledge.form.category': 'Category *',
    'admin.knowledge.form.language': 'Language *',
    'admin.knowledge.form.description': 'Description',
    'admin.knowledge.form.description_placeholder': 'Brief description of the document content (optional)',

    // --- admin_insights.html ---
    'admin.insights.subtab_dashboard': 'Dashboard',

    // --- admin_scouting.html ---
    'admin.scouting.filter_all_teams': 'All Teams',
    'admin.scouting.filter_all': 'All',
    'admin.scouting.filter_game': 'Game',
    'admin.scouting.filter_practice': 'Practice',
    'admin.scouting.filter_scout': 'Scout',
    'admin.scouting.filter_highlight': 'Highlight',
    'admin.scouting.search_placeholder': 'Search videos...',
    'admin.scouting.loading_videos': 'Loading videos...',
    'admin.scouting.btn_back': 'Back',
    'admin.scouting.video_title_placeholder': 'Video Title',
    'admin.scouting.clips_sidebar_title': 'Clips',

    // --- admin_messages.html ---
    'admin.messages.tab_inbox': 'Inbox',
    'admin.messages.tab_sent': 'Sent',
    'admin.messages.tab_scheduled': 'Scheduled',
    'admin.messages.tab_invoices': 'Invoices',
    'admin.messages.tab_compose': 'Compose',
    'admin.messages.inbox_title': 'Inbox',
    'admin.messages.btn_mark_all_read': 'Mark All Read',
    'admin.messages.loading_messages': 'Loading messages...',
    'admin.messages.loading': 'Loading...',
    'admin.messages.sent_title': 'Sent Messages',
    'admin.messages.scheduled_title': 'Scheduled Messages',
    'admin.messages.hoops_updates_title': 'HOOPS AI Updates',
    'admin.messages.invoices_billing_title': 'Invoices & Billing',
    'admin.messages.invoice_filter_all_types': 'All Types',
    'admin.messages.invoice_filter_all_statuses': 'All Statuses',
    'admin.messages.invoice_status_draft': 'Draft',
    'admin.messages.invoice_status_sent': 'Sent',
    'admin.messages.invoice_status_paid': 'Paid',
    'admin.messages.invoice_status_overdue': 'Overdue',
    'admin.messages.invoice_status_cancelled': 'Cancelled',
    'admin.messages.compose_title': 'Compose Message',
    'admin.messages.delivery_stats_title': 'Delivery Stats',
    'admin.messages.form.target': 'Target',
    'admin.messages.form.specific_person': 'Specific Person',
    'admin.messages.form.select_teams': 'Select Teams',
    'admin.messages.form.team': 'Team',
    'admin.messages.form.role': 'Role',
    'admin.messages.form.select_role': '-- Select Role --',
    'admin.messages.form.person': 'Person',
    'admin.messages.form.type': 'Type',
    'admin.messages.form.subject_optional': 'Subject (optional)',
    'admin.messages.form.subject_placeholder': 'Subject...',
    'admin.messages.form.message': 'Message',
    'admin.messages.form.message_placeholder': 'Write your message...',
    'admin.messages.form.schedule_later': 'Schedule for later',
    'admin.messages.form.date': 'Date',
    'admin.messages.form.time': 'Time',
    'admin.messages.type_general': 'General',
    'admin.messages.type_announcement': 'Announcement',
    'admin.messages.type_update': 'Update',
    'admin.messages.type_urgent': 'Urgent',

    // --- admin_coaches.html ---
    'admin.coaches.filter_all_teams': 'All Teams',
    'admin.coaches.modal_title': 'Coach',

    // --- admin_player_development.html ---
    'admin.player_dev.filter_all_teams': 'All Teams',
    'admin.player_dev.filter_all_positions': 'All Positions',
    'admin.player_dev.btn_request_reports': 'Request Reports',
    'admin.player_dev.search_placeholder': 'Search player name...',
    'admin.player_dev.modal_player_title': 'Player',
    'admin.player_dev.modal_request_title': 'Request Evaluations from Coaches',
    'admin.player_dev.btn_send_request': 'Send Request',
    'admin.player_dev.form.team': 'Team',
    'admin.player_dev.form.coach_optional': 'Coach (optional — leave empty for all coaches in team)',
    'admin.player_dev.form.period_type': 'Period Type',
    'admin.player_dev.form.due_date': 'Due Date',
    'admin.player_dev.form.instructions_optional': 'Instructions (optional)',
    'admin.player_dev.form.instructions_placeholder': 'Special instructions for coaches...',

    // --- admin_transport.html ---
    'admin.transport.stat_upcoming_away': 'Upcoming Away Games',
    'admin.transport.stat_next_away': 'Next Away Game',
    'admin.transport.stat_teams_with_away': 'Teams with Away Games',
    'admin.transport.section_upcoming_away': 'Upcoming Away Games',
    'admin.transport.loading': 'Loading...',

    // --- admin_transport_detail.html ---
    'admin.transport_detail.back_to_transport': 'Back to Transportation',
    'admin.transport_detail.loading_event': 'Loading event details...',
    'admin.transport_detail.venue_location_title': 'Venue Location',
    'admin.transport_detail.edit_transport_title': 'Edit Transport Info',
    'admin.transport_detail.form.departure_time': 'Departure Time (שעת יציאה)',
    'admin.transport_detail.form.venue_address': 'Venue Address (כתובת)',
    'admin.transport_detail.form.venue_address_placeholder': 'Full address for Google Maps',
    'admin.transport_detail.btn_save_notify': 'Save & Notify Team',
    'admin.transport_detail.btn_preview_map': 'Preview Map',

    // =========================================================================
    // SUPPORT  (admin_support.js)
    // =========================================================================
    'admin.support.my_tickets': 'My Support Tickets',
    'admin.support.new_ticket': 'New Ticket',
    'admin.support.loading': 'Loading tickets...',
    'admin.support.back_to_list': 'Back to Tickets',
    'admin.support.reply_placeholder': 'Type your reply...',
    'admin.support.create_title': 'Create Support Ticket',
    'admin.support.form.subject': 'Subject',
    'admin.support.form.subject_placeholder': 'Brief description of your issue',
    'admin.support.form.category': 'Category',
    'admin.support.form.priority': 'Priority',
    'admin.support.form.message': 'Message',
    'admin.support.form.message_placeholder': 'Describe your issue in detail...',
    'admin.support.btn_create': 'Create Ticket',
    'admin.support.btn_send': 'Send',
    'admin.support.empty.no_tickets': 'No support tickets yet. Click "New Ticket" to contact platform support.',
    'admin.support.error.subject_required': 'Subject is required',
    'admin.support.error.message_required': 'Message is required',
    'admin.support.ticket_created': 'Ticket created',
    'admin.support.created_ago': 'Created {time}',
    'admin.support.platform_support': 'Platform Support',
    'admin.support.no_messages_yet': 'No messages yet.',
    'admin.support.ticket_closed': 'This ticket is closed',
    'admin.support.error.reply_empty': 'Reply cannot be empty',
    'admin.support.reply_sent': 'Reply sent',
    'admin.support.cat.general': 'General',
    'admin.support.cat.billing': 'Billing',
    'admin.support.cat.technical': 'Technical',
    'admin.support.cat.feature_request': 'Feature Request',
    'admin.support.cat.account': 'Account',
    'admin.support.cat.bug_report': 'Bug Report',
    'admin.support.cat.onboarding': 'Onboarding',
    'admin.support.priority.low': 'Low',
    'admin.support.priority.medium': 'Medium',
    'admin.support.priority.high': 'High',
    'admin.support.priority.urgent': 'Urgent',
    'admin.support.status.open': 'Open',
    'admin.support.status.in_progress': 'In Progress',
    'admin.support.status.waiting_on_club': 'Waiting on Club',
    'admin.support.status.resolved': 'Resolved',
    'admin.support.status.closed': 'Closed',
  }
});
