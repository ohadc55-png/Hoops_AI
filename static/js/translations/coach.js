/**
 * HOOPS AI - Coach Portal Translations
 * All user-facing strings from coach-specific JS files:
 *   chat.js, drills.js, play-creator.js, schedule.js, reports.js,
 *   messages.js, coach_knowledge.js, scouting.js, main.js
 */
I18N.register({
  he: {
    // =====================================================
    // === chat.js — AI Chat ===============================
    // =====================================================

    // Agent names
    'chat.agent.assistant_coach': 'עוזר מאמן',
    'chat.agent.team_manager': 'מנהל קבוצה',
    'chat.agent.tactician': 'הטקטיקן',
    'chat.agent.skills_coach': 'מאמן יכולות אישיות',
    'chat.agent.nutritionist': 'תזונאי ספורט',
    'chat.agent.strength_coach': 'כוח וכושר',
    'chat.agent.analyst': 'האנליסט',
    'chat.agent.youth_coach': 'מאמן שכבות צעירות',

    // Agent descriptions
    'chat.agent_desc.assistant_coach': 'מנהיגות קבוצתית, תכנון אימונים ואסטרטגיות ניהול.',
    'chat.agent_desc.team_manager': 'לו"ז, יומן, מתקנים ולוגיסטיקה.',
    'chat.agent_desc.tactician': 'אסטרטגיית משחק, משחקונים, X ו-O וניתוח טקטי.',
    'chat.agent_desc.skills_coach': 'פיתוח יכולות אישיות, טכניקה ותרגילים ממוקדים.',
    'chat.agent_desc.nutritionist': 'תוכניות תזונה, ייעוץ דיאטתי וארוחות התאוששות.',
    'chat.agent_desc.strength_coach': 'ביצועים אתלטיים, אימוני כוח וכושר.',
    'chat.agent_desc.analyst': 'סטטיסטיקות, ניתוח ביצועים ותובנות מנתונים.',
    'chat.agent_desc.youth_coach': 'פיתוח כדורסל לשכבות גיל צעירות (5-12).',

    // Chat UI
    'chat.default_name': 'HOOPS AI',
    'chat.error.generic': 'סליחה, משהו השתבש. נסה שוב.',
    'chat.conversation.empty': 'אין שיחות עדיין',
    'chat.conversation.new': 'שיחה חדשה',
    'chat.conversation.load_error': 'טעינת השיחה נכשלה',
    'chat.new_conversation': 'שיחה חדשה התחילה. איך אוכל לעזור לך, מאמן?',
    'chat.upload.uploading': 'מעלה {name}...',
    'chat.upload.success': 'הקובץ הועלה!',
    'chat.upload.failed': 'ההעלאה נכשלה',
    'chat.upload.analyze': 'העליתי קובץ: {name}. אנא נתח אותו.',

    // Save to practice planner
    'chat.save_practice.btn': 'שמור במתכנן',
    'chat.save_practice.modal_title': 'שמור כמתכנן אימונים',
    'chat.save_practice.label_title': 'כותרת האימון',
    'chat.save_practice.label_date': 'תאריך',
    'chat.save_practice.label_duration': 'משך (דקות)',
    'chat.save_practice.saving': 'שומר...',
    'chat.save_practice.success': 'האימון נשמר במתכנן!',
    'chat.save_practice.error': 'שמירה נכשלה, נסה שוב',
    'chat.save_practice.go_to_planner': 'עבור למתכנן',

    // =====================================================
    // === drills.js — Drill Library =======================
    // =====================================================

    // Drill grid & cards
    'drills.empty.title': 'לא נמצאו תרגילים',
    'drills.empty.subtitle': 'צור את התרגיל הראשון שלך או שנה את הסינון',
    'drills.badge.video': 'וידאו',
    'drills.badge.ai': 'AI',
    'drills.badge.assigned': 'הוקצה: {count}',
    'drills.label.min': '{count} דק\'',
    'drills.btn.assign': 'הקצה',

    // Drill CRUD
    'drills.created': 'התרגיל נוצר!',
    'drills.deleted': 'התרגיל נמחק',
    'drills.confirm_delete': 'למחוק את התרגיל?',

    // AI Generation
    'drills.generate.loading': 'מייצר...',
    'drills.generate.btn': 'ייצר',
    'drills.generate.success': 'תרגיל AI נוצר!',

    // Drill detail
    'drills.detail.instructions': 'הוראות',
    'drills.detail.coaching_points': 'נקודות אימון',
    'drills.detail.ai_generated': 'נוצר ע"י AI',
    'drills.detail.watch_video': 'צפה בוידאו',

    // Assignment
    'drills.assign.loading_players': 'טוען שחקנים...',
    'drills.assign.no_players': 'לא נמצאו שחקנים בקבוצות שלך.',
    'drills.assign.load_failed': 'טעינת שחקנים נכשלה.',
    'drills.assign.select_player': 'בחר לפחות שחקן אחד',
    'drills.assign.success': 'התרגיל הוקצה ל-{count} שחקנים',
    'drills.assign.failed': 'הקצאת התרגיל נכשלה',
    'drills.assign.not_assigned': 'טרם הוקצה לשחקנים.',

    // Assignment status
    'drills.status.approved': 'אושר',
    'drills.status.video_pending': 'וידאו ממתין',
    'drills.status.rejected': 'נדחה',
    'drills.status.pending': 'ממתין',
    'drills.assignments.title': 'הקצאות',

    // Player tracking
    'drills.tracking.loading': 'טוען...',
    'drills.tracking.empty': 'אין עדיין שחקנים עם הקצאות תרגילים.\nהקצה תרגילים לשחקנים כדי להתחיל מעקב.',
    'drills.tracking.failed': 'טעינת נתוני מעקב נכשלה.',
    'drills.tracking.completed': 'הושלמו',
    'drills.tracking.never': 'מעולם לא',
    'drills.tracking.just_now': 'עכשיו',

    // Video reviews
    'drills.reviews.none': 'אין סקירות וידאו ממתינות',
    'drills.reviews.all_complete': 'כל הסקירות הושלמו!',
    'drills.reviews.failed': 'טעינת סקירות נכשלה.',
    'drills.reviews.feedback_label': 'משוב (אופציונלי)',
    'drills.reviews.feedback_placeholder': 'כתוב משוב לשחקן...',
    'drills.reviews.approve_btn': 'אשר',
    'drills.reviews.reject_btn': 'דחה',
    'drills.reviews.approved': 'הוידאו אושר!',
    'drills.reviews.rejected': 'הוידאו נדחה',
    'drills.reviews.failed_action': 'הסקירה נכשלה',

    // =====================================================
    // === play-creator.js — Play Creator ==================
    // =====================================================

    // Offense templates
    'plays.offense.empty': 'ריק',
    'plays.offense.5_out': '5-Out',
    'plays.offense.4_out_1_in': '4-Out 1-In',
    'plays.offense.horns': 'Horns',
    'plays.offense.box': 'Box',
    'plays.offense.1_4_high': '1-4 High',

    // Defense templates
    'plays.defense.none': 'ללא הגנה',
    'plays.defense.man': 'אישית',
    'plays.defense.23': 'אזור 2-3',
    'plays.defense.32': 'אזור 3-2',

    // Action types
    'plays.action.pass': 'מסירה',
    'plays.action.dribble': 'כדרור',
    'plays.action.cut': 'חתך',
    'plays.action.screen': 'חסימה',
    'plays.action.handoff': 'העברת יד',
    'plays.action.shot': 'זריקה',

    // Toolbar buttons
    'plays.btn.edit': 'עריכה',
    'plays.btn.play': 'הפעל',
    'plays.btn.new': 'חדש',
    'plays.btn.save': 'שמור',
    'plays.btn.link': 'קישור',
    'plays.btn.share_team': 'שתף עם הקבוצה',
    'plays.label.parallel': 'מקבילי',

    // Sidebar
    'plays.sidebar.timeline': 'ציר זמן',
    'plays.sidebar.steps': '{count} צעדים',
    'plays.sidebar.step': 'צעד {num}',
    'plays.sidebar.no_actions': 'אין עדיין פעולות',
    'plays.sidebar.saved_plays': 'משחקונים שמורים',
    'plays.sidebar.no_saved': 'אין משחקונים שמורים',
    'plays.badge.shared': 'משותף',

    // Status messages
    'plays.status.click_drag': '{action} — לחץ על שחקן וגרור',
    'plays.status.parallel': 'SHIFT — פעולות מקביליות',
    'plays.status.position': 'גרור שחקנים למיקום, לאחר מכן לחץ אישור',
    'plays.status.curve': 'גרור את נקודת הבקרה כדי לעקם את הנתיב',

    // Modals
    'plays.modal.select_formation': 'בחר מערך',
    'plays.modal.offense': 'התקפה',
    'plays.modal.defense': 'הגנה',
    'plays.modal.apply_formation': 'החל מערך',
    'plays.modal.who_has_ball': 'למי הכדור?',
    'plays.modal.share_play': 'שתף משחקון',
    'plays.modal.share_copy_link': 'העתק קישור זה לשיתוף המשחקון שלך:',
    'plays.modal.load_play': 'לטעון משחקון?',
    'plays.modal.load_play_warning': 'יש לך שינויים שלא נשמרו. טעינת משחקון זה תחליף את העבודה הנוכחית.',
    'plays.modal.load_play_confirm': 'טען משחקון',
    'plays.modal.share_with_team': 'שתף עם קבוצה',
    'plays.modal.select_team': 'בחר קבוצה לשיתוף:',
    'plays.modal.new_play': 'משחקון חדש',
    'plays.modal.new_play_warning': 'יש לך שינויים שלא נשמרו. יצירת משחקון חדש בלי לשמור תמחק את העבודה הנוכחית.',
    'plays.modal.stay': 'הישאר',
    'plays.modal.new_discard': 'חדש ומחק',
    'plays.modal.save_new': 'שמור וחדש',

    // Toast messages
    'plays.toast.link_copied': 'הקישור הועתק!',
    'plays.toast.shared_with': 'שותף עם {name}!',
    'plays.toast.unshared': 'השיתוף בוטל',
    'plays.toast.no_teams': 'לא נמצאו קבוצות',
    'plays.toast.share_failed': 'השיתוף נכשל',
    'plays.toast.save_failed': 'השמירה נכשלה',
    'plays.toast.not_logged_in': 'לא מחובר',
    'plays.toast.invalid_link': 'קישור משחקון לא תקין',
    'plays.prompt.play_name': 'שם משחקון:',

    // =====================================================
    // === schedule.js — Coach Schedule ====================
    // =====================================================

    // Event modal
    'schedule.modal.edit_event': 'ערוך אירוע',
    'schedule.modal.add_event': 'הוסף אירוע',
    'schedule.event.none': 'ללא',
    'schedule.event.updated': 'האירוע עודכן!',
    'schedule.event.created': 'האירוע נוצר!',
    'schedule.event.created_recurring': 'נוצרו {count} אירועים חוזרים!',
    'schedule.event.deleted': 'האירוע נמחק',
    'schedule.event.series_deleted': 'הסדרה נמחקה',
    'schedule.event.confirm_delete': 'למחוק את האירוע?',
    'schedule.event.confirm_series_delete': 'למחוק את כל האירועים בסדרה חוזרת זו?',
    'schedule.event.title_date_required': 'כותרת ותאריך נדרשים',

    // Schedule requests
    'schedule.request.title_date_required': 'כותרת ותאריך נדרשים',
    'schedule.request.time_end_before_start': 'שעת סיום חייבת להיות אחרי שעת התחלה',
    'schedule.request.no_team': 'לא נבחרה קבוצה',
    'schedule.request.submitted': 'הבקשה נשלחה למנהל!',
    'schedule.request.no_teams': 'אין קבוצות',

    // My requests section
    'schedule.my_requests.title': 'בקשות לוח הזמנים שלי',
    'schedule.request_status.pending': 'ממתין',
    'schedule.request_status.approved': 'אושר',
    'schedule.request_status.rejected': 'נדחה',

    // =====================================================
    // === reports.js — Reports & Evaluations ==============
    // =====================================================

    // Tabs
    'reports.tab.attendance': 'נוכחות',
    'reports.tab.games': 'משחקים',
    'reports.tab.player_reports': 'דוחות שחקנים',
    'reports.tab.evaluations': 'הערכות',

    // Attendance
    'reports.att.select_practice': 'בחר אימון...',
    'reports.att.no_players': 'אין שחקנים ברשימה. הוסף שחקנים בניהול קבוצה תחילה.',
    'reports.att.header.number': '#',
    'reports.att.header.player': 'שחקן',
    'reports.att.header.present': 'נוכח',
    'reports.att.header.notes': 'הערות',
    'reports.att.saved': 'הנוכחות נשמרה!',
    'reports.att.overview': 'סקירת נוכחות',
    'reports.att.no_data': 'אין נתוני נוכחות עדיין',

    // Game reports
    'reports.games.empty.title': 'אין דוחות משחק',
    'reports.games.empty.subtitle': 'צור את דוח המשחק הראשון שלך',
    'reports.games.standouts': 'מצטיינים',
    'reports.games.modal.new': 'דוח משחק חדש',
    'reports.games.modal.edit': 'ערוך דוח משחק',
    'reports.games.date_opponent_required': 'תאריך ויריב נדרשים',
    'reports.games.updated': 'הדוח עודכן!',
    'reports.games.created': 'הדוח נוצר!',
    'reports.games.deleted': 'נמחק',
    'reports.games.confirm_delete': 'למחוק את דוח המשחק?',
    'reports.games.no_roster': 'אין שחקנים ברשימה',

    // Pending games banner
    'reports.pending.singular': 'משחק אחד דורש דוח',
    'reports.pending.plural': '{count} משחקים דורשים דוח',
    'reports.pending.fill_report': 'מלא דוח',
    'reports.pending.vs_unknown': 'נגד לא ידוע',

    // Player reports
    'reports.player.no_reports': 'אין דוחות לשחקן זה עדיין',
    'reports.player.select': 'בחר שחקן...',
    'reports.player.strengths': 'חוזקות',
    'reports.player.weaknesses': 'חולשות',
    'reports.player.focus_areas': 'תחומי מיקוד',
    'reports.player.progress': 'התקדמות',
    'reports.player.recommendations': 'המלצות',
    'reports.player.select_first': 'בחר שחקן תחילה',
    'reports.player.generate_loading': 'מייצר...',
    'reports.player.generate_btn': 'ייצר דוח AI',
    'reports.player.generate_success': 'דוח AI נוצר!',
    'reports.player.generate_failed': 'יצירת הדוח נכשלה',
    'reports.player.confirm_delete': 'למחוק את הדוח?',
    'reports.player.all_players': 'כל השחקנים',

    // Evaluations
    'reports.eval.category.offensive': 'התקפה',
    'reports.eval.category.defensive': 'הגנה',
    'reports.eval.category.iq': 'IQ כדורסלי',
    'reports.eval.category.social': 'חברתי',
    'reports.eval.category.leadership': 'מנהיגות',
    'reports.eval.category.work_ethic': 'מוסר עבודה',
    'reports.eval.category.fitness': 'כושר',
    'reports.eval.category.improvement': 'שיפור',
    'reports.eval.category.leaving_risk': 'סיכון עזיבה',
    'reports.eval.avg_rating': 'ממוצע',
    'reports.eval.no_evaluations': 'אין הערכות עדיין',
    'reports.eval.modal.new': 'הערכת שחקן חדשה',
    'reports.eval.modal.edit': 'ערוך הערכה',
    'reports.eval.select_player': 'בחר שחקן',
    'reports.eval.saved': 'ההערכה נשמרה!',
    'reports.eval.updated': 'ההערכה עודכנה!',
    'reports.eval.save_failed': 'שמירת ההערכה נכשלה',
    'reports.eval.confirm_delete': 'למחוק הערכה זו?',

    // Evaluation period types
    'reports.eval.period.weekly': 'שבועי',
    'reports.eval.period.monthly': 'חודשי',
    'reports.eval.period.semi_annual': 'חצי-שנתי',
    'reports.eval.period.annual': 'שנתי',

    // Eval requests banner
    'reports.eval_request.singular': 'בקשת הערכה ממתינה מההנהלה',
    'reports.eval_request.plural': '{count} בקשות הערכה ממתינות מההנהלה',
    'reports.eval_request.evaluation': 'הערכה',
    'reports.eval_request.due': 'עד',
    'reports.eval_request.fill_now': 'מלא עכשיו',

    // =====================================================
    // === messages.js — Coach Messaging ====================
    // =====================================================

    // Tabs
    'messages.tab.inbox': 'דואר נכנס',
    'messages.tab.sent': 'נשלח',
    'messages.tab.compose': 'חדש',

    // Inbox
    'messages.inbox.empty': 'אין הודעות',
    'messages.inbox.load_failed': 'לא ניתן לטעון הודעות',
    'messages.inbox.retry': 'נסה שוב',
    'messages.inbox.mark_all_read': 'סמן הכל כנקרא',
    'messages.inbox.all_read': 'כל ההודעות סומנו כנקראו',
    'messages.detail.default_subject': 'הודעה',

    // Sent
    'messages.sent.empty': 'אין הודעות שנשלחו',
    'messages.sent.load_failed': 'לא ניתן לטעון הודעות',

    // Compose
    'messages.compose.body_required': 'תוכן ההודעה נדרש',
    'messages.compose.sent': 'ההודעה נשלחה',
    'messages.compose.failed': 'השליחה נכשלה',

    // Target types
    'messages.target.admin': 'הנהלה',
    'messages.target.my_team_players': 'שחקני הקבוצה',
    'messages.target.my_team_parents': 'הורי הקבוצה',
    'messages.target.my_team': 'כל הקבוצה',
    'messages.target.individual': 'אישי',

    // Time labels
    'messages.time.just_now': 'הרגע',

    // =====================================================
    // === coach_knowledge.js — Knowledge Base ==============
    // =====================================================

    // General
    'knowledge.untitled': 'ללא כותרת',

    // Stats
    'knowledge.stat.my_docs': 'המסמכים שלי',
    'knowledge.stat.chunks': 'חלקים',

    // Document list
    'knowledge.loading': 'טוען...',
    'knowledge.load_failed': 'טעינת מסמכים נכשלה',
    'knowledge.my_docs.empty.title': 'אין מסמכים עדיין',
    'knowledge.my_docs.empty.subtitle': 'העלה את מסמך האימון הראשון שלך',
    'knowledge.shared_docs.empty.title': 'אין מסמכים משותפים',
    'knowledge.shared_docs.empty.subtitle': 'מסמכים שהועלו ע"י מנהל המועדון יופיעו כאן',
    'knowledge.doc_count': '{count} מסמכים',
    'knowledge.doc_count_singular': 'מסמך אחד',

    // Document detail
    'knowledge.detail.file': 'קובץ:',
    'knowledge.detail.size': 'גודל:',
    'knowledge.detail.chunks': 'חלקים:',
    'knowledge.detail.uploaded': 'הועלה:',
    'knowledge.detail.content_preview': 'תצוגה מקדימה',
    'knowledge.detail.processing_error': 'שגיאת עיבוד',

    // Status badges
    'knowledge.status.ready': 'מוכן',
    'knowledge.status.processing': 'מעבד',
    'knowledge.status.error': 'שגיאה',
    'knowledge.status.pending': 'ממתין',

    // Scope badges
    'knowledge.scope.system': 'מערכת',
    'knowledge.scope.club': 'מועדון',
    'knowledge.scope.coach': 'מאמן',

    // Language
    'knowledge.lang.hebrew': 'עברית',
    'knowledge.lang.english': 'English',

    // Upload
    'knowledge.upload.select_or_drag': 'לחץ לבחירה או גרור ושחרר',
    'knowledge.upload.uploading': 'מעלה...',
    'knowledge.upload.select_file': 'אנא בחר קובץ',
    'knowledge.upload.enter_title': 'אנא הזן כותרת',
    'knowledge.upload.select_category': 'אנא בחר קטגוריה',
    'knowledge.upload.success': 'המסמך הועלה! מעבד ברקע...',
    'knowledge.upload.failed': 'ההעלאה נכשלה',
    'knowledge.upload.select_prompt': 'בחר...',
    'knowledge.upload.all_categories': 'כל הקטגוריות',

    // Buttons
    'knowledge.btn.download': 'הורד',
    'knowledge.btn.retry': 'נסה שוב',
    'knowledge.btn.delete': 'מחק',
    'knowledge.btn.close': 'סגור',
    'knowledge.btn.upload': 'העלה',

    // Actions
    'knowledge.delete.confirm': 'למחוק מסמך זה? לא ניתן לבטל.',
    'knowledge.deleted': 'המסמך נמחק',
    'knowledge.retry.started': 'עיבוד מחדש החל',
    'knowledge.download.failed': 'ההורדה נכשלה',

    // =====================================================
    // === scouting.js — Video Room ========================
    // =====================================================

    // Action types (clip tagging)
    'scouting.action.pick_and_roll': 'פיק אנד רול',
    'scouting.action.isolation': 'איזולציה',
    'scouting.action.fast_break': 'מהיר',
    'scouting.action.defense': 'הגנה',
    'scouting.action.transition': 'מעבר',
    'scouting.action.three_pointer': 'שלש',
    'scouting.action.post_up': 'פוסט',
    'scouting.action.screen': 'חסימה',
    'scouting.action.turnover': 'אובדן',
    'scouting.action.rebound': 'ריבאונד',
    'scouting.action.free_throw': 'זריקת עונשין',
    'scouting.action.out_of_bounds': 'מחוץ לקו',
    'scouting.action.other': 'אחר',

    // Video grid
    'scouting.grid.empty': 'אין וידאו עדיין. העלה את הצילומים הראשונים שלך!',
    'scouting.grid.load_failed': 'טעינת הוידאו נכשלה',
    'scouting.grid.clips': '{count} קליפים',
    'scouting.grid.clips_label': 'קליפים',

    // Video card badges
    'scouting.badge.shared': 'משותף',
    'scouting.badge.parents': 'הורים',
    'scouting.badge.permanent': 'קבוע',
    'scouting.badge.expired': 'פג תוקף',
    'scouting.badge.hours_left': '{count} שע\' נותרו',
    'scouting.badge.days_left': '{count} ימים נותרו',

    // Upload
    'scouting.upload.drag_or_click': 'גרור ושחרר וידאו או לחץ לדפדוף',
    'scouting.upload.formats': 'MP4, MOV, WebM — עד 500MB',
    'scouting.upload.invalid_type': 'סוג קובץ לא חוקי. השתמש ב-MP4, MOV, או WebM.',
    'scouting.upload.too_large': 'הקובץ גדול מדי (מקסימום 100MB).',
    'scouting.upload.uploading': 'מעלה...',
    'scouting.upload.uploading_pct': 'מעלה... {pct}%',
    'scouting.upload.chunk_progress': 'מעלה חלק {current}/{total}...',
    'scouting.upload.saving': 'שומר לספרייה...',
    'scouting.upload.success': 'הוידאו הועלה בהצלחה!',
    'scouting.upload.failed': 'ההעלאה נכשלה',
    'scouting.upload.cloudinary_error': 'Cloudinary לא מוגדר. הפעל מחדש את השרת לאחר הוספת הנתונים לקובץ .env',
    'scouting.upload.network_error': 'שגיאת רשת — בדוק את החיבור ונסה שוב',
    'scouting.upload.timeout': 'ההעלאה חרגה מזמן — נסה שוב או בדוק חיבור',
    'scouting.upload.cancelled': 'ההעלאה בוטלה',
    'scouting.upload.no_response': 'ההעלאה הושלמה אך לא התקבלה תגובה תקינה',
    'scouting.upload.chunk_failed': 'העלאת חלק נכשלה (HTTP {status})',
    'scouting.upload.retry_failed': 'ההעלאה נכשלה לאחר {count} ניסיונות: {error}',

    // Analysis view
    'scouting.analysis.load_failed': 'טעינת הוידאו נכשלה',
    'scouting.analysis.choose_video': 'בחר וידאו...',

    // Clips sidebar
    'scouting.clips.empty': 'אין קליפים עדיין. השתמש בכפתורי הסימון מתחת לוידאו כדי ליצור קליפים.',
    'scouting.clips.watched': 'צפו: {count}',
    'scouting.clips.tagged': 'הקליפ סומן!',
    'scouting.clips.save_failed': 'שמירת הקליפ נכשלה: {error}',
    'scouting.clips.deleted': 'הקליפ נמחק',
    'scouting.clips.delete_failed': 'מחיקת הקליפ נכשלה',
    'scouting.clips.confirm_delete': 'למחוק קליפ זה וההערות שלו?',
    'scouting.clips.invalid_range': 'טווח קליפ לא תקין',

    // Clip I/O points
    'scouting.io.in': 'IN',
    'scouting.io.out': 'OUT',
    'scouting.io.create_clip': 'צור קליפ',

    // Rating
    'scouting.rating.positive': 'חיובי',
    'scouting.rating.negative': 'שלילי',

    // Sharing
    'scouting.share.unshared': 'השיתוף בוטל',
    'scouting.share.shared_team': 'הוידאו שותף עם הקבוצה!',
    'scouting.share.no_team': 'לא נבחרה קבוצה',
    'scouting.share.unshared_parents': 'ביטול שיתוף מהורים',
    'scouting.share.share_team_first': 'שתף עם הקבוצה קודם לפני שיתוף עם הורים',
    'scouting.share.shared_parents': 'הוידאו שותף עם הורים!',
    'scouting.share.parents_tooltip_share': 'שתף עם הורים',
    'scouting.share.parents_tooltip_unshare': 'בטל שיתוף מהורים',

    // Video expiry
    'scouting.expiry.permanent': 'קבוע',
    'scouting.expiry.keep_forever': 'הוידאו יישמר לצמיתות',
    'scouting.expiry.auto_delete': 'הוידאו יימחק אוטומטית בעוד 14 יום',
    'scouting.expiry.update_failed': 'העדכון נכשל',
    'scouting.expiry.keep_forever_tooltip': 'שמור לצמיתות',
    'scouting.expiry.remove_permanent_tooltip': 'הסר קבוע — מחיקה אוטומטית בעוד 14 יום',

    // Video delete
    'scouting.video.deleted': 'הוידאו נמחק',
    'scouting.video.delete_failed': 'מחיקת הוידאו נכשלה',
    'scouting.video.confirm_delete': 'למחוק וידאו זה וכל הקליפים שלו?',
    'scouting.video.no_video': 'אין וידאו טעון',

    // Telestrator / Drawing tools
    'scouting.draw.tool.freehand': 'ציור חופשי',
    'scouting.draw.tool.arrow': 'חץ',
    'scouting.draw.tool.circle': 'עיגול',
    'scouting.draw.tool.text': 'טקסט',
    'scouting.draw.tool.spotlight': 'זרקור',
    'scouting.draw.tool.player_marker': 'שחקן',

    // Annotation track labels
    'scouting.ann.type.freehand': 'ציור',
    'scouting.ann.type.arrow': 'חץ',
    'scouting.ann.type.circle': 'עיגול',
    'scouting.ann.type.text': 'טקסט',
    'scouting.ann.type.spotlight': 'זרקור',
    'scouting.ann.type.player_marker': 'שחקן',

    // Annotation actions
    'scouting.ann.deleted': 'ההערה נמחקה',
    'scouting.ann.delete_failed': 'המחיקה נכשלה',
    'scouting.ann.copied': 'ההערה הועתקה',
    'scouting.ann.pasted': 'ההערה הודבקה',
    'scouting.ann.enter_text': 'הזן טקסט',
    'scouting.ann.save_failed': 'השמירה נכשלה',

    // Spotlight
    'scouting.spotlight.need_points': 'נדרשות לפחות 2 נקודות',
    'scouting.spotlight.saved': 'הזרקור נשמר!',
    'scouting.spotlight.save_failed': 'שמירת הזרקור נכשלה',
    'scouting.spotlight.discard': 'למחוק את נקודות הזרקור הנוכחיות?',

    // Clear drawings
    'scouting.draw.clear_confirm': 'למחוק את כל הציורים?',

    // Court overlay zones
    'scouting.court.paint': 'צבע',
    'scouting.court.left_corner': 'פינה שמאלית',
    'scouting.court.right_corner': 'פינה ימנית',
    'scouting.court.top': 'למעלה',

    // Playlists
    'scouting.playlist.empty': 'אין רשימות השמעה עדיין',
    'scouting.playlist.create': 'צור רשימת השמעה',
    'scouting.playlist.new': '+ רשימת השמעה חדשה',
    'scouting.playlist.prompt': 'שם רשימת ההשמעה:',
    'scouting.playlist.created': 'רשימת ההשמעה נוצרה',
    'scouting.playlist.create_failed': 'יצירת רשימת ההשמעה נכשלה',
    'scouting.playlist.deleted': 'רשימת ההשמעה נמחקה',
    'scouting.playlist.delete_failed': 'המחיקה נכשלה',
    'scouting.playlist.confirm_delete': 'למחוק רשימת השמעה זו?',
    'scouting.playlist.added': 'נוסף ל-"{name}"',
    'scouting.playlist.add_failed': 'ההוספה נכשלה',
    'scouting.playlist.create_first': 'צור רשימת השמעה קודם',
    'scouting.playlist.clips': '{count} קליפים',

    // Batch operations
    'scouting.batch.selected': '{count} נבחרו',
    'scouting.batch.delete_confirm': 'למחוק {count} קליפים?',
    'scouting.batch.deleted': 'הקליפים נמחקו',
    'scouting.batch.delete_failed': 'המחיקה נכשלה',
    'scouting.batch.updated': 'הקליפים עודכנו',
    'scouting.batch.update_failed': 'העדכון נכשל',

    // Keyboard shortcuts
    'scouting.shortcuts.back_5s': 'אחורה 5 שניות',
    'scouting.shortcuts.forward_5s': 'קדימה 5 שניות',
    'scouting.shortcuts.prev_frame': 'פריים קודם',
    'scouting.shortcuts.next_frame': 'פריים הבא',

    // Preview
    'scouting.clip.preview': 'תצוגה מקדימה',
    'scouting.clip.stop': 'עצור',

    // Storage quota
    'scouting.quota.storage': 'אחסון: {used} GB / {limit} GB בשימוש',

    // Player marker
    'scouting.marker.offense': 'התקפה',
    'scouting.marker.defense': 'הגנה',

    // Comparison mode
    'scouting.comparison.choose_video': 'בחר וידאו...',

    // Export
    'scouting.export.no_video': 'אין וידאו טעון',

    // Clip Compilation
    'scouting.compile.btn': 'ייצר סרטון',
    'scouting.compile.title': 'יצירת סרטון מקליפים',
    'scouting.compile.video_title': 'כותרת הסרטון',
    'scouting.compile.sort_by': 'מיון',
    'scouting.compile.sort_chrono': 'כרונולוגי',
    'scouting.compile.sort_action': 'לפי תיוג',
    'scouting.compile.sort_rating': 'לפי דירוג',
    'scouting.compile.filter': 'סינון',
    'scouting.compile.filter_all': 'הכל',
    'scouting.compile.show_tags': 'הצג תיוג על הסרטון',
    'scouting.compile.select_all': 'בחר הכל',
    'scouting.compile.deselect_all': 'בטל הכל',
    'scouting.compile.summary': '{count} קליפים, ~{duration}',
    'scouting.compile.generate': 'ייצר סרטון',
    'scouting.compile.processing': 'מייצר סרטון... קליפ {current}/{total}',
    'scouting.compile.uploading': 'מעלה את הסרטון...',
    'scouting.compile.success': 'הסרטון נוצר בהצלחה!',
    'scouting.compile.failed': 'יצירת הסרטון נכשלה',
    'scouting.compile.delete_title': 'מחיקת סרטון מקורי',
    'scouting.compile.delete_msg': 'האם למחוק את הסרטון המקורי כדי לחסוך מקום אחסון?',
    'scouting.compile.delete_original': 'מחק מקורי',
    'scouting.compile.keep_original': 'השאר מקורי',
    'scouting.compile.no_clips': 'בחר לפחות קליפ אחד',
    'scouting.compile.min_clips': 'נדרשים לפחות 2 קליפים',

    // =====================================================
    // === main.js — Global Coach Utilities ================
    // =====================================================

    // Notifications
    'main.notif.header': 'התראות',
    'main.notif.empty': 'אין התראות',
    'main.notif.game_ended': 'המשחק הסתיים — מלא דוח משחק',
    'main.notif.unread_messages': '{count} הודעות שלא נקראו',

    // Global search hints
    'main.search.hint': 'נסה לחפש: תרגילים, משחקונים, אימון, קבוצה, ניתוח, הגדרות',

    // =====================================================
    // === HTML Template Strings ===========================
    // =====================================================

    // --- chat.html ---
    'coach.chat.welcome_message': 'ברוך הבא, מאמן! יש לי 8 סוכני AI מומחים מוכנים לעזור. שאל על אסטרטגיה, תרגילים, תזונה, אנליטיקה או ניהול קבוצה.',
    'coach.chat.upload_file': 'העלה קובץ',
    'coach.chat.input_placeholder': 'שאל את שאלת האימון שלך...',
    'coach.chat.auto_routing': 'ניתוב אוטומטי',
    'coach.chat.active': 'פעיל',
    'coach.chat.auto_routing_desc': 'השאלה שלך תנותב אוטומטית לסוכן המומחה הרלוונטי ביותר.',
    'coach.chat.recent_chats': 'שיחות אחרונות',
    'coach.chat.new': 'חדש',

    // --- drills.html ---
    'coach.drills.title': 'ספריית תרגילים',
    'coach.drills.subtitle': 'עיין, צור ותארגן תרגילי כדורסל',
    'coach.drills.btn.video_reviews': 'סקירות וידאו',
    'coach.drills.btn.player_tracking': 'מעקב שחקנים',
    'coach.drills.btn.ai_generate': 'ייצור AI',
    'coach.drills.btn.new_drill': 'תרגיל חדש',
    'coach.drills.btn.create_drill': 'צור תרגיל',
    'coach.drills.search_placeholder': 'חפש תרגילים...',
    'coach.drills.filter.all_categories': 'כל הקטגוריות',
    'coach.drills.filter.all_levels': 'כל הרמות',
    'coach.drills.category.offense': 'התקפה',
    'coach.drills.category.defense': 'הגנה',
    'coach.drills.category.ball_handling': 'כדרור',
    'coach.drills.empty.subtitle': 'צור את התרגיל הראשון שלך או ייצר אחד עם AI',
    'coach.drills.modal.new_drill': 'תרגיל חדש',
    'coach.drills.modal.ai_generator': 'מחולל תרגילי AI',
    'coach.drills.modal.assign_drill': 'הקצה תרגיל',
    'coach.drills.modal.player_tracking': 'מעקב תרגילי שחקנים',
    'coach.drills.modal.video_reviews': 'סקירות וידאו',
    'coach.drills.field.title': 'כותרת',
    'coach.drills.field.title_placeholder': 'שם תרגיל',
    'coach.drills.field.description': 'תיאור',
    'coach.drills.field.description_placeholder': 'תיאור קצר',
    'coach.drills.field.category': 'קטגוריה',
    'coach.drills.field.difficulty': 'קושי',
    'coach.drills.field.duration': 'משך (דק\')',
    'coach.drills.field.instructions': 'הוראות',
    'coach.drills.field.instructions_placeholder': 'הוראות שלב אחר שלב',
    'coach.drills.field.video_url': 'קישור וידאו (אופציונלי)',
    'coach.drills.field.focus': 'מיקוד (אופציונלי)',
    'coach.drills.field.focus_placeholder': 'לדוג\'. פיק אנד רול, מהלך מהיר',
    'coach.drills.assign.select_players_label': 'בחר שחקנים להקצות להם את התרגיל:',
    'coach.drills.assign.select_all': 'בחר הכל',
    'coach.drills.assign.note_label': 'הערה לשחקנים (אופציונלי)',
    'coach.drills.assign.note_placeholder': 'לדוג\'. בצע תרגיל זה 3 פעמים לפני האימון הבא',

    // --- practice.html ---
    'coach.practice.title': 'מתכנן אימונים',
    'coach.practice.subtitle': 'נהל את לוח הזמנים השבועי ועומס השחקנים',
    'coach.practice.btn.ai_generate': 'ייצור AI',
    'coach.practice.btn.new_session': 'מפגש חדש',
    'coach.practice.empty.title': 'אין מפגשי אימון',
    'coach.practice.empty.subtitle': 'צור מפגש או ייצר אחד עם AI',
    'coach.practice.modal.new_session': 'מפגש אימון חדש',
    'coach.practice.modal.ai_generator': 'מחולל מפגשי AI',
    'coach.practice.field.date': 'תאריך',
    'coach.practice.field.title': 'כותרת',
    'coach.practice.field.title_placeholder': 'אימון בוקר',
    'coach.practice.field.focus': 'מיקוד',
    'coach.practice.field.focus_placeholder': 'לדוג\'. הגנה, קליעה',
    'coach.practice.field.gen_focus_placeholder': 'יסודות הגנה',
    'coach.practice.field.duration': 'משך (דק\')',
    'coach.practice.created': 'המפגש נוצר!',
    'coach.practice.generated': 'מפגש AI נוצר!',

    // --- schedule.html ---
    'coach.schedule.subtitle': 'לוח שנה ואירועי קבוצה',
    'coach.schedule.btn.request_admin': 'בקשה למנהל',
    'coach.schedule.btn.add_event': 'הוסף אירוע',
    'coach.schedule.btn.save_event': 'שמור אירוע',
    'coach.schedule.btn.submit_request': 'שלח בקשה',
    'coach.schedule.modal.request_title': 'בקשת שינוי לוח זמנים',
    'coach.schedule.request.description': 'שלח בקשה למנהל הקבוצה להוספת אירוע זה ללוח הזמנים הרשמי.',
    'coach.schedule.request.notes_placeholder': 'הערות נוספות או סיבה לבקשה',
    'coach.schedule.event.social': 'פעילות חברתית',
    'coach.schedule.event.tactical_video': 'טקטי / וידאו',
    'coach.schedule.field.title': 'כותרת',
    'coach.schedule.field.event_name_placeholder': 'שם אירוע',
    'coach.schedule.field.date': 'תאריך',
    'coach.schedule.field.time': 'שעה',
    'coach.schedule.field.type': 'סוג',
    'coach.schedule.field.opponent': 'יריב (אופציונלי)',
    'coach.schedule.field.opponent_placeholder': 'קבוצה יריבה',
    'coach.schedule.field.facility': 'מתקן',
    'coach.schedule.field.repeat_weekly': 'חזרה שבועית',
    'coach.schedule.field.no_repeat': 'ללא חזרה',
    'coach.schedule.field.notes': 'הערות',
    'coach.schedule.field.notes_placeholder': 'הערות נוספות',
    'coach.schedule.field.team': 'קבוצה',
    'coach.schedule.field.start_time': 'שעת התחלה',
    'coach.schedule.field.end_time': 'שעת סיום',
    'coach.schedule.field.location': 'מיקום',
    'coach.schedule.field.location_placeholder': 'מיקום',

    // --- logistics.html ---
    'coach.logistics.subtitle': 'ניהול רשימת שחקנים',
    'coach.logistics.modal.add_player': 'הוסף שחקן',
    'coach.logistics.modal.edit_player': 'ערוך שחקן',
    'coach.logistics.modal.player_profile': 'פרופיל שחקן',
    'coach.logistics.btn.add_player': 'הוסף שחקן',
    'coach.logistics.btn.save_player': 'שמור שחקן',
    'coach.logistics.field.name': 'שם',
    'coach.logistics.field.name_placeholder': 'שם שחקן',
    'coach.logistics.field.jersey': 'מספר חולצה',
    'coach.logistics.field.position': 'עמדה',
    'coach.logistics.field.select': 'בחר...',
    'coach.logistics.field.gender': 'מין',
    'coach.logistics.field.birth_date': 'תאריך לידה',
    'coach.logistics.field.height': 'גובה (ס"מ)',
    'coach.logistics.field.weight': 'משקל (ק"ג)',
    'coach.logistics.field.player_phone': 'טלפון שחקן',
    'coach.logistics.field.player_phone_placeholder': 'טלפון שחקן',
    'coach.logistics.field.player_email': 'אימייל שחקן',
    'coach.logistics.field.player_email_placeholder': 'אימייל שחקן',
    'coach.logistics.field.parent_phone': 'טלפון הורה',
    'coach.logistics.field.parent_phone_placeholder': 'טלפון הורה',
    'coach.logistics.field.parent_email': 'אימייל הורה',
    'coach.logistics.field.parent_email_placeholder': 'אימייל הורה',
    'coach.logistics.field.notes': 'הערות',
    'coach.logistics.field.notes_placeholder': 'הערות נוספות',
    'coach.logistics.position.pg': 'פלייימייקר (PG)',
    'coach.logistics.position.sg': 'שוטר (SG)',
    'coach.logistics.position.sf': 'קדמי קטן (SF)',
    'coach.logistics.position.pf': 'קדמי גדול (PF)',
    'coach.logistics.position.c': 'סנטר (C)',
    'coach.logistics.gender.male': 'זכר',
    'coach.logistics.gender.female': 'נקבה',
    'coach.logistics.table.number': '#',
    'coach.logistics.table.name': 'שם',
    'coach.logistics.table.pos': 'עמדה',
    'coach.logistics.table.age': 'גיל',
    'coach.logistics.table.height': 'גובה',
    'coach.logistics.table.weight': 'משקל',
    'coach.logistics.table.phone': 'טלפון',
    'coach.logistics.table.actions': 'פעולות',
    'coach.logistics.empty.title': 'אין שחקנים',
    'coach.logistics.empty.subtitle': 'הוסף את השחקן הראשון לרשימה',
    'coach.logistics.player_updated': 'השחקן עודכן!',
    'coach.logistics.player_added': 'השחקן נוסף!',
    'coach.logistics.player_deleted': 'השחקן נמחק',
    'coach.logistics.confirm_delete_player': 'למחוק שחקן זה?',
    'coach.logistics.error.name_required': 'שם נדרש',
    'coach.logistics.loading_player': 'טוען נתוני שחקן...',
    'coach.logistics.profile_load_failed': 'לא ניתן לטעון פרופיל שחקן',

    // --- reports.html ---
    'coach.reports.subtitle': 'נוכחות, דוחות משחק והערכות שחקנים',
    'coach.reports.tab.evaluations': 'הערכות שחקנים',
    'coach.reports.eval.all_periods': 'כל התקופות',
    'coach.reports.eval.period_type': 'סוג תקופה',
    'coach.reports.eval.period_label': 'תווית תקופה',
    'coach.reports.eval.period_label_placeholder': 'חישוב אוטומטי',
    'coach.reports.eval.ratings_heading': 'דירוגים (1-10)',
    'coach.reports.eval.label.offensive': 'יכולות התקפיות',
    'coach.reports.eval.label.defensive': 'יכולות הגנתיות',
    'coach.reports.eval.label.social': 'חברתי / עבודת צוות',
    'coach.reports.eval.label.fitness': 'כושר גופני',
    'coach.reports.eval.notes_placeholder': 'הערות...',
    'coach.reports.eval.overall_notes': 'הערות כלליות',
    'coach.reports.eval.overall_placeholder': 'הערכה כללית של השחקן...',
    'coach.reports.eval.potential': 'פוטנציאל ופיתוח',
    'coach.reports.eval.potential_placeholder': 'פוטנציאל שחקן, מסלול פיתוח...',
    'coach.reports.btn.save_evaluation': 'שמור הערכה',
    'coach.reports.btn.save_report': 'שמור דוח',
    'coach.reports.game.field.date': 'תאריך',
    'coach.reports.game.field.opponent': 'יריב',
    'coach.reports.game.field.opponent_placeholder': 'קבוצה יריבה',
    'coach.reports.game.field.result': 'תוצאה',
    'coach.reports.game.field.our_score': 'הניקוד שלנו',
    'coach.reports.game.field.their_score': 'הניקוד שלהם',
    'coach.reports.game.field.location': 'מיקום',
    'coach.reports.game.field.location_placeholder': 'מיקום משחק',
    'coach.reports.game.field.areas_to_improve': 'תחומים לשיפור (מופרדים בפסיק)',
    'coach.reports.game.field.areas_placeholder': 'תחום 1, תחום 2',
    'coach.reports.game.field.notable': 'אירועים בולטים',
    'coach.reports.game.field.notable_placeholder': 'רגעי מפתח מהמשחק',
    'coach.reports.game.field.notes': 'הערות',
    'coach.reports.game.btn.select_players': 'בחר שחקנים',

    // --- analytics.html (dashboard) ---
    'coach.dashboard.stat.players': 'שחקנים',
    'coach.dashboard.stat.drills_completed': 'תרגילים שהושלמו',
    'coach.dashboard.stat.upcoming_events': 'אירועים קרובים',
    'coach.dashboard.stat.win_rate': 'אחוז ניצחונות',
    'coach.dashboard.section.upcoming_schedule': 'לוח זמנים קרוב',
    'coach.dashboard.section.recent_results': 'תוצאות אחרונות',
    'coach.dashboard.section.player_attendance': 'נוכחות שחקנים',
    'coach.dashboard.section.drill_leaderboard': 'מובילי תרגילים ביתיים',
    'coach.dashboard.section.recent_practices': 'אימונים אחרונים',
    'coach.dashboard.link.full_calendar': 'לוח שנה מלא ←',
    'coach.dashboard.link.all_reports': 'כל הדוחות ←',
    'coach.dashboard.link.full_attendance': 'נוכחות מלאה ←',
    'coach.dashboard.link.all_drills': 'כל התרגילים ←',
    'coach.dashboard.link.practice_planner': 'תכנון אימונים ←',
    'coach.dashboard.loading': 'טוען...',

    // --- messages.html ---
    'coach.messages.loading': 'טוען הודעות...',
    'coach.messages.loading_short': 'טוען...',
    'coach.messages.sent_title': 'הודעות שנשלחו',
    'coach.messages.compose_title': 'כתיבת הודעה',
    'coach.messages.field.send_to': 'שלח אל',
    'coach.messages.field.subject': 'נושא (אופציונלי)',
    'coach.messages.field.subject_placeholder': 'נושא...',
    'coach.messages.field.message': 'הודעה',
    'coach.messages.field.message_placeholder': 'כתוב את הודעתך...',

    // --- coach_knowledge.html ---
    'coach.knowledge.subtitle': 'העלה מסמכי אימון לתשובות משופרות ב-AI',
    'coach.knowledge.btn.upload_document': 'העלה מסמך',
    'coach.knowledge.stat.total_chunks': 'סה"כ חלקים',
    'coach.knowledge.section.my_documents': 'המסמכים שלי',
    'coach.knowledge.section.club_system': 'מסמכי מועדון ומערכת',
    'coach.knowledge.filter.all_statuses': 'כל הסטטוסים',
    'coach.knowledge.modal.upload_title': 'העלה מסמך',
    'coach.knowledge.modal.doc_details': 'פרטי מסמך',
    'coach.knowledge.field.file': 'קובץ *',
    'coach.knowledge.field.file_formats': 'PDF, DOCX, או TXT — עד 20MB',
    'coach.knowledge.field.title': 'כותרת *',
    'coach.knowledge.field.title_placeholder': 'כותרת מסמך',
    'coach.knowledge.field.category': 'קטגוריה *',
    'coach.knowledge.field.language': 'שפה *',
    'coach.knowledge.field.description': 'תיאור (אופציונלי)',
    'coach.knowledge.field.description_placeholder': 'תיאור קצר של תוכן המסמך',

    // --- scouting.html ---
    'coach.scouting.btn.upload_video': 'העלה וידאו',
    'coach.scouting.filter.all': 'הכל',
    'coach.scouting.filter.scout': 'סיור',
    'coach.scouting.filter.highlight': 'הייליט',
    'coach.scouting.search_placeholder': 'חפש וידאו...',
    'coach.scouting.loading_videos': 'טוען וידאו...',
    'coach.scouting.video_title': 'כותרת וידאו',
    'coach.scouting.share.share_with_team': 'שתף עם הקבוצה',
    'coach.scouting.zoom.zoom_out': 'התקרב (-)',
    'coach.scouting.zoom.zoom_in': 'התרחק (+)',
    'coach.scouting.zoom.reset_zoom': 'אפס זום (0)',
    'coach.scouting.btn.compare_videos': 'השווה וידאו',
    'coach.scouting.btn.export_clip': 'ייצא קליפ עם הערות',
    'coach.scouting.btn.keyboard_shortcuts': 'קיצורי מקלדת (?)',
    'coach.scouting.tools.draw': 'ציור',
    'coach.scouting.tools.tag': 'תיוג',
    'coach.scouting.tools.player_marker_title': 'סמן שחקן [M]',
    'coach.scouting.tools.configure_marker': 'הגדר סמן',
    'coach.scouting.tools.spotlight_title': 'זרקור [S]',
    'coach.scouting.tools.court_overlay': 'שכבת מגרש',
    'coach.scouting.tools.stroke_width': 'עובי קו',
    'coach.scouting.tools.opacity': 'שקיפות',
    'coach.scouting.tools.done': 'סיום',
    'coach.scouting.tools.undo': 'בטל [Ctrl+Z]',
    'coach.scouting.tools.clear_all': 'נקה הכל',
    'coach.scouting.tag.fast_break': 'מהיר',
    'coach.scouting.tag.defense': 'הגנה',
    'coach.scouting.tag.post_up': 'פוסט',
    'coach.scouting.tag.screen': 'חסימה',
    'coach.scouting.tag.rebound': 'ריב.',
    'coach.scouting.tag.transition': 'מעבר',
    'coach.scouting.tag.other': 'אחר',
    'coach.scouting.export.exporting': 'מייצא קליפ...',
    'coach.scouting.comparison.select_video': 'בחר וידאו להשוואה',
    'coach.scouting.comparison.sync': 'סנכרון',
    'coach.scouting.comparison.pick_video': 'בחר וידאו להשוואה',
    'coach.scouting.clips.title': 'קליפים',
    'coach.scouting.clips.tab_clips': 'קליפים',
    'coach.scouting.clips.tab_playlists': 'רשימות השמעה',
    'coach.scouting.clips.select_all': 'בחר הכל',
    'coach.scouting.modal.upload_title': 'העלה וידאו',
    'coach.scouting.modal.tag_clip': 'תייג קליפ',
    'coach.scouting.upload.progress_text': 'מעלה... 0%',
    'coach.scouting.upload.title_placeholder': 'לדוג\'. משחק נגד מכבי',
    'coach.scouting.upload.field.opponent': 'יריב (אופציונלי)',
    'coach.scouting.upload.opponent_placeholder': 'לדוג\'. מכבי תל אביב',
    'coach.scouting.upload.field.game_date': 'תאריך משחק (אופציונלי)',
    'coach.scouting.upload.select_team': 'בחר קבוצה...',
    'coach.scouting.upload.keep_forever': 'שמור לצמיתות',
    'coach.scouting.upload.keep_forever_note': '(ללא מחיקה אוטומטית לאחר 14 יום)',
    'coach.scouting.type.opponent_scout': 'סיור יריב',
    'coach.scouting.clip.field.start': 'התחלה',
    'coach.scouting.clip.field.end': 'סיום',
    'coach.scouting.clip.field.duration': 'משך',
    'coach.scouting.clip.field.action_type': 'סוג פעולה',
    'coach.scouting.clip.field.rating': 'דירוג',
    'coach.scouting.clip.field.tag_players': 'תייג שחקנים',
    'coach.scouting.clip.field.notes': 'הערות (אופציונלי)',
    'coach.scouting.clip.notes_placeholder': 'הערה מהירה...',
    'coach.scouting.clip.btn.save_clip': 'שמור קליפ',
    'coach.scouting.shortcuts.title': 'קיצורי מקלדת',
    'coach.scouting.shortcuts.group.playback': 'ניגון',
    'coach.scouting.shortcuts.group.drawing': 'כלי ציור',
    'coach.scouting.shortcuts.group.clipping': 'חיתוך וזום',
    'coach.scouting.shortcuts.play_pause': 'נגן / השהה',
    'coach.scouting.shortcuts.seek': '±5 שנ\' / ±פריים אחד (מושהה)',
    'coach.scouting.shortcuts.seek_1s': '±1 שנייה',
    'coach.scouting.shortcuts.frame_step': 'פריים קודם / הבא',
    'coach.scouting.shortcuts.speed_change': 'מהירות - / +',
    'coach.scouting.shortcuts.speed_preset': 'מהירות: 0.25x - 2x',
    'coach.scouting.shortcuts.draw_freehand': 'ציור חופשי',
    'coach.scouting.shortcuts.undo': 'בטל',
    'coach.scouting.shortcuts.copy_paste': 'העתק / הדבק הערה',
    'coach.scouting.shortcuts.delete': 'מחק נבחר',
    'coach.scouting.shortcuts.deselect': 'בטל בחירת כלי',
    'coach.scouting.shortcuts.set_in': 'קבע נקודת כניסה',
    'coach.scouting.shortcuts.set_out': 'קבע נקודת יציאה',
    'coach.scouting.shortcuts.zoom': 'זום פנימה / החוצה',
    'coach.scouting.shortcuts.reset_zoom': 'אפס זום',
    'coach.scouting.shortcuts.scroll_zoom': 'זום עם גלגלת',
    'coach.scouting.shortcuts.toggle_overlay': 'הצג/הסתר שכבת זו',
  },

  en: {
    // =====================================================
    // === chat.js — AI Chat ===============================
    // =====================================================

    // Agent names
    'chat.agent.assistant_coach': 'Assistant Coach',
    'chat.agent.team_manager': 'Team Manager',
    'chat.agent.tactician': 'The Tactician',
    'chat.agent.skills_coach': 'Personal Skills Coach',
    'chat.agent.nutritionist': 'Sports Nutritionist',
    'chat.agent.strength_coach': 'Strength & Conditioning',
    'chat.agent.analyst': 'The Analyst',
    'chat.agent.youth_coach': 'Youth & Age Groups Coach',

    // Agent descriptions
    'chat.agent_desc.assistant_coach': 'Team leadership, practice planning, and management strategies.',
    'chat.agent_desc.team_manager': 'Schedule, calendar, facilities, and logistics.',
    'chat.agent_desc.tactician': 'Game strategy, plays, X\'s & O\'s, and tactical analysis.',
    'chat.agent_desc.skills_coach': 'Personal skill development, technique, and individual training.',
    'chat.agent_desc.nutritionist': 'Nutrition plans, diet advice, and recovery meals.',
    'chat.agent_desc.strength_coach': 'Athletic performance, workouts, and conditioning.',
    'chat.agent_desc.analyst': 'Statistics, performance analytics, and data insights.',
    'chat.agent_desc.youth_coach': 'Basketball development for young age groups (ages 5-12).',

    // Chat UI
    'chat.default_name': 'HOOPS AI',
    'chat.error.generic': 'Sorry, something went wrong. Please try again.',
    'chat.conversation.empty': 'No conversations yet',
    'chat.conversation.new': 'New Chat',
    'chat.conversation.load_error': 'Failed to load conversation',
    'chat.new_conversation': 'New conversation started. How can I help you, Coach?',
    'chat.upload.uploading': 'Uploading {name}...',
    'chat.upload.success': 'File uploaded!',
    'chat.upload.failed': 'Upload failed',
    'chat.upload.analyze': 'I uploaded a file: {name}. Please analyze it.',

    // Save to practice planner
    'chat.save_practice.btn': 'Save to Planner',
    'chat.save_practice.modal_title': 'Save as Practice Session',
    'chat.save_practice.label_title': 'Session Title',
    'chat.save_practice.label_date': 'Date',
    'chat.save_practice.label_duration': 'Duration (min)',
    'chat.save_practice.saving': 'Saving...',
    'chat.save_practice.success': 'Practice session saved!',
    'chat.save_practice.error': 'Save failed, please try again',
    'chat.save_practice.go_to_planner': 'Go to Planner',

    // =====================================================
    // === drills.js — Drill Library =======================
    // =====================================================

    // Drill grid & cards
    'drills.empty.title': 'No drills found',
    'drills.empty.subtitle': 'Create your first drill or adjust filters',
    'drills.badge.video': 'VIDEO',
    'drills.badge.ai': 'AI',
    'drills.badge.assigned': 'Assigned: {count}',
    'drills.label.min': '{count} min',
    'drills.btn.assign': 'Assign',

    // Drill CRUD
    'drills.created': 'Drill created!',
    'drills.deleted': 'Drill deleted',
    'drills.confirm_delete': 'Delete this drill?',

    // AI Generation
    'drills.generate.loading': 'Generating...',
    'drills.generate.btn': 'Generate',
    'drills.generate.success': 'AI drill generated!',

    // Drill detail
    'drills.detail.instructions': 'Instructions',
    'drills.detail.coaching_points': 'Coaching Points',
    'drills.detail.ai_generated': 'AI Generated',
    'drills.detail.watch_video': 'Watch Video',

    // Assignment
    'drills.assign.loading_players': 'Loading players...',
    'drills.assign.no_players': 'No players found in your teams.',
    'drills.assign.load_failed': 'Failed to load players.',
    'drills.assign.select_player': 'Select at least one player',
    'drills.assign.success': 'Drill assigned to {count} players',
    'drills.assign.failed': 'Failed to assign drill',
    'drills.assign.not_assigned': 'Not assigned to any players yet.',

    // Assignment status
    'drills.status.approved': 'Approved',
    'drills.status.video_pending': 'Video Pending',
    'drills.status.rejected': 'Rejected',
    'drills.status.pending': 'Pending',
    'drills.assignments.title': 'Assignments',

    // Player tracking
    'drills.tracking.loading': 'Loading...',
    'drills.tracking.empty': 'No players with drill assignments yet.\nAssign drills to players to start tracking.',
    'drills.tracking.failed': 'Failed to load tracking data.',
    'drills.tracking.completed': 'completed',
    'drills.tracking.never': 'Never',
    'drills.tracking.just_now': 'Just now',

    // Video reviews
    'drills.reviews.none': 'No pending video reviews',
    'drills.reviews.all_complete': 'All reviews complete!',
    'drills.reviews.failed': 'Failed to load reviews.',
    'drills.reviews.feedback_label': 'Feedback (optional)',
    'drills.reviews.feedback_placeholder': 'Write feedback for the player...',
    'drills.reviews.approve_btn': 'Approve',
    'drills.reviews.reject_btn': 'Reject',
    'drills.reviews.approved': 'Video approved!',
    'drills.reviews.rejected': 'Video rejected',
    'drills.reviews.failed_action': 'Review failed',

    // =====================================================
    // === play-creator.js — Play Creator ==================
    // =====================================================

    // Offense templates
    'plays.offense.empty': 'Empty',
    'plays.offense.5_out': '5-Out',
    'plays.offense.4_out_1_in': '4-Out 1-In',
    'plays.offense.horns': 'Horns',
    'plays.offense.box': 'Box',
    'plays.offense.1_4_high': '1-4 High',

    // Defense templates
    'plays.defense.none': 'No Defense',
    'plays.defense.man': 'Man-to-Man',
    'plays.defense.23': '2-3 Zone',
    'plays.defense.32': '3-2 Zone',

    // Action types
    'plays.action.pass': 'Pass',
    'plays.action.dribble': 'Dribble',
    'plays.action.cut': 'Cut',
    'plays.action.screen': 'Screen',
    'plays.action.handoff': 'Handoff',
    'plays.action.shot': 'Shot',

    // Toolbar buttons
    'plays.btn.edit': 'Edit',
    'plays.btn.play': 'Play',
    'plays.btn.new': 'New',
    'plays.btn.save': 'Save',
    'plays.btn.link': 'Link',
    'plays.btn.share_team': 'Share with Team',
    'plays.label.parallel': 'PARALLEL',

    // Sidebar
    'plays.sidebar.timeline': 'Timeline',
    'plays.sidebar.steps': '{count} steps',
    'plays.sidebar.step': 'Step {num}',
    'plays.sidebar.no_actions': 'No actions yet',
    'plays.sidebar.saved_plays': 'Saved Plays',
    'plays.sidebar.no_saved': 'No saved plays',
    'plays.badge.shared': 'shared',

    // Status messages
    'plays.status.click_drag': '{action} — click player & drag',
    'plays.status.parallel': 'SHIFT — parallel actions',
    'plays.status.position': 'Drag players to position, then click confirm',
    'plays.status.curve': 'Drag the control point to curve the path',

    // Modals
    'plays.modal.select_formation': 'Select Formation',
    'plays.modal.offense': 'Offense',
    'plays.modal.defense': 'Defense',
    'plays.modal.apply_formation': 'Apply Formation',
    'plays.modal.who_has_ball': 'Who has the ball?',
    'plays.modal.share_play': 'Share Play',
    'plays.modal.share_copy_link': 'Copy this link to share your play:',
    'plays.modal.load_play': 'Load Play?',
    'plays.modal.load_play_warning': 'You have unsaved changes. Loading this play will replace your current work.',
    'plays.modal.load_play_confirm': 'Load Play',
    'plays.modal.share_with_team': 'Share with Team',
    'plays.modal.select_team': 'Select a team to share this play with:',
    'plays.modal.new_play': 'New Play',
    'plays.modal.new_play_warning': 'You have unsaved changes. Creating a new play without saving will discard your current work.',
    'plays.modal.stay': 'Stay',
    'plays.modal.new_discard': 'New & Discard',
    'plays.modal.save_new': 'Save & New',

    // Toast messages
    'plays.toast.link_copied': 'Link copied!',
    'plays.toast.shared_with': 'Shared with {name}!',
    'plays.toast.unshared': 'Play unshared',
    'plays.toast.no_teams': 'No teams found',
    'plays.toast.share_failed': 'Failed to share',
    'plays.toast.save_failed': 'Failed to save',
    'plays.toast.not_logged_in': 'Not logged in',
    'plays.toast.invalid_link': 'Invalid shared play link',
    'plays.prompt.play_name': 'Play name:',

    // =====================================================
    // === schedule.js — Coach Schedule ====================
    // =====================================================

    // Event modal
    'schedule.modal.edit_event': 'Edit Event',
    'schedule.modal.add_event': 'Add Event',
    'schedule.event.none': 'None',
    'schedule.event.updated': 'Event updated!',
    'schedule.event.created': 'Event created!',
    'schedule.event.created_recurring': 'Created {count} recurring events!',
    'schedule.event.deleted': 'Event deleted',
    'schedule.event.series_deleted': 'Series deleted',
    'schedule.event.confirm_delete': 'Delete this event?',
    'schedule.event.confirm_series_delete': 'Delete ALL events in this recurring series?',
    'schedule.event.title_date_required': 'Title and date are required',

    // Schedule requests
    'schedule.request.title_date_required': 'Title and date are required',
    'schedule.request.time_end_before_start': 'End time must be after start time',
    'schedule.request.no_team': 'No team selected',
    'schedule.request.submitted': 'Request submitted to admin!',
    'schedule.request.no_teams': 'No teams',

    // My requests section
    'schedule.my_requests.title': 'My Schedule Requests',
    'schedule.request_status.pending': 'Pending',
    'schedule.request_status.approved': 'Approved',
    'schedule.request_status.rejected': 'Rejected',

    // =====================================================
    // === reports.js — Reports & Evaluations ==============
    // =====================================================

    // Tabs
    'reports.tab.attendance': 'Attendance',
    'reports.tab.games': 'Games',
    'reports.tab.player_reports': 'Player Reports',
    'reports.tab.evaluations': 'Evaluations',

    // Attendance
    'reports.att.select_practice': 'Select practice...',
    'reports.att.no_players': 'No players in roster. Add players in Team Management first.',
    'reports.att.header.number': '#',
    'reports.att.header.player': 'Player',
    'reports.att.header.present': 'Present',
    'reports.att.header.notes': 'Notes',
    'reports.att.saved': 'Attendance saved!',
    'reports.att.overview': 'Attendance Overview',
    'reports.att.no_data': 'No attendance data yet',

    // Game reports
    'reports.games.empty.title': 'No game reports',
    'reports.games.empty.subtitle': 'Create your first game report',
    'reports.games.standouts': 'Standouts',
    'reports.games.modal.new': 'New Game Report',
    'reports.games.modal.edit': 'Edit Game Report',
    'reports.games.date_opponent_required': 'Date and opponent are required',
    'reports.games.updated': 'Report updated!',
    'reports.games.created': 'Report created!',
    'reports.games.deleted': 'Deleted',
    'reports.games.confirm_delete': 'Delete this game report?',
    'reports.games.no_roster': 'No players in roster',

    // Pending games banner
    'reports.pending.singular': '1 game needs a report',
    'reports.pending.plural': '{count} games need a report',
    'reports.pending.fill_report': 'Fill Report',
    'reports.pending.vs_unknown': 'vs Unknown',

    // Player reports
    'reports.player.no_reports': 'No reports for this player yet',
    'reports.player.select': 'Select player...',
    'reports.player.strengths': 'Strengths',
    'reports.player.weaknesses': 'Weaknesses',
    'reports.player.focus_areas': 'Focus Areas',
    'reports.player.progress': 'Progress',
    'reports.player.recommendations': 'Recommendations',
    'reports.player.select_first': 'Select a player first',
    'reports.player.generate_loading': 'Generating...',
    'reports.player.generate_btn': 'AI Generate Report',
    'reports.player.generate_success': 'AI report generated!',
    'reports.player.generate_failed': 'Failed to generate report',
    'reports.player.confirm_delete': 'Delete this report?',
    'reports.player.all_players': 'All Players',

    // Evaluations
    'reports.eval.category.offensive': 'Offensive',
    'reports.eval.category.defensive': 'Defensive',
    'reports.eval.category.iq': 'Basketball IQ',
    'reports.eval.category.social': 'Social',
    'reports.eval.category.leadership': 'Leadership',
    'reports.eval.category.work_ethic': 'Work Ethic',
    'reports.eval.category.fitness': 'Fitness',
    'reports.eval.category.improvement': 'Improvement',
    'reports.eval.category.leaving_risk': 'Leaving Risk',
    'reports.eval.avg_rating': 'avg rating',
    'reports.eval.no_evaluations': 'No evaluations yet',
    'reports.eval.modal.new': 'New Player Evaluation',
    'reports.eval.modal.edit': 'Edit Evaluation',
    'reports.eval.select_player': 'Select a player',
    'reports.eval.saved': 'Evaluation saved!',
    'reports.eval.updated': 'Evaluation updated!',
    'reports.eval.save_failed': 'Failed to save evaluation',
    'reports.eval.confirm_delete': 'Delete this evaluation?',

    // Evaluation period types
    'reports.eval.period.weekly': 'Weekly',
    'reports.eval.period.monthly': 'Monthly',
    'reports.eval.period.semi_annual': 'Semi-Annual',
    'reports.eval.period.annual': 'Annual',

    // Eval requests banner
    'reports.eval_request.singular': '1 pending evaluation request from management',
    'reports.eval_request.plural': '{count} pending evaluation requests from management',
    'reports.eval_request.evaluation': 'Evaluation',
    'reports.eval_request.due': 'Due',
    'reports.eval_request.fill_now': 'Fill Now',

    // =====================================================
    // === messages.js — Coach Messaging ====================
    // =====================================================

    // Tabs
    'messages.tab.inbox': 'Inbox',
    'messages.tab.sent': 'Sent',
    'messages.tab.compose': 'Compose',

    // Inbox
    'messages.inbox.empty': 'No messages',
    'messages.inbox.load_failed': 'Could not load messages',
    'messages.inbox.retry': 'Retry',
    'messages.inbox.mark_all_read': 'Mark all as read',
    'messages.inbox.all_read': 'All messages marked as read',
    'messages.detail.default_subject': 'Message',

    // Sent
    'messages.sent.empty': 'No sent messages',
    'messages.sent.load_failed': 'Could not load messages',

    // Compose
    'messages.compose.body_required': 'Message body is required',
    'messages.compose.sent': 'Message sent',
    'messages.compose.failed': 'Failed to send',

    // Target types
    'messages.target.admin': 'Management',
    'messages.target.my_team_players': 'Team Players',
    'messages.target.my_team_parents': 'Team Parents',
    'messages.target.my_team': 'Entire Team',
    'messages.target.individual': 'Individual',

    // Time labels
    'messages.time.just_now': 'just now',

    // =====================================================
    // === coach_knowledge.js — Knowledge Base ==============
    // =====================================================

    // General
    'knowledge.untitled': 'Untitled',

    // Stats
    'knowledge.stat.my_docs': 'My Documents',
    'knowledge.stat.chunks': 'Chunks',

    // Document list
    'knowledge.loading': 'Loading...',
    'knowledge.load_failed': 'Failed to load documents',
    'knowledge.my_docs.empty.title': 'No documents yet',
    'knowledge.my_docs.empty.subtitle': 'Upload your first coaching document',
    'knowledge.shared_docs.empty.title': 'No shared documents',
    'knowledge.shared_docs.empty.subtitle': 'Documents uploaded by your club admin will appear here',
    'knowledge.doc_count': '{count} documents',
    'knowledge.doc_count_singular': '1 document',

    // Document detail
    'knowledge.detail.file': 'File:',
    'knowledge.detail.size': 'Size:',
    'knowledge.detail.chunks': 'Chunks:',
    'knowledge.detail.uploaded': 'Uploaded:',
    'knowledge.detail.content_preview': 'Content Preview',
    'knowledge.detail.processing_error': 'Processing Error',

    // Status badges
    'knowledge.status.ready': 'Ready',
    'knowledge.status.processing': 'Processing',
    'knowledge.status.error': 'Error',
    'knowledge.status.pending': 'Pending',

    // Scope badges
    'knowledge.scope.system': 'System',
    'knowledge.scope.club': 'Club',
    'knowledge.scope.coach': 'Coach',

    // Language
    'knowledge.lang.hebrew': 'עברית',
    'knowledge.lang.english': 'English',

    // Upload
    'knowledge.upload.select_or_drag': 'Click to select or drag & drop',
    'knowledge.upload.uploading': 'Uploading...',
    'knowledge.upload.select_file': 'Please select a file',
    'knowledge.upload.enter_title': 'Please enter a title',
    'knowledge.upload.select_category': 'Please select a category',
    'knowledge.upload.success': 'Document uploaded! Processing in background...',
    'knowledge.upload.failed': 'Upload failed',
    'knowledge.upload.select_prompt': 'Select...',
    'knowledge.upload.all_categories': 'All Categories',

    // Buttons
    'knowledge.btn.download': 'Download',
    'knowledge.btn.retry': 'Retry',
    'knowledge.btn.delete': 'Delete',
    'knowledge.btn.close': 'Close',
    'knowledge.btn.upload': 'Upload',

    // Actions
    'knowledge.delete.confirm': 'Delete this document? This cannot be undone.',
    'knowledge.deleted': 'Document deleted',
    'knowledge.retry.started': 'Reprocessing started',
    'knowledge.download.failed': 'Download failed',

    // =====================================================
    // === scouting.js — Video Room ========================
    // =====================================================

    // Action types (clip tagging)
    'scouting.action.pick_and_roll': 'Pick & Roll',
    'scouting.action.isolation': 'Isolation',
    'scouting.action.fast_break': 'Fast Break',
    'scouting.action.defense': 'Defense',
    'scouting.action.transition': 'Transition',
    'scouting.action.three_pointer': '3-Pointer',
    'scouting.action.post_up': 'Post Up',
    'scouting.action.screen': 'Screen',
    'scouting.action.turnover': 'Turnover',
    'scouting.action.rebound': 'Rebound',
    'scouting.action.free_throw': 'Free Throw',
    'scouting.action.out_of_bounds': 'Out of Bounds',
    'scouting.action.other': 'Other',

    // Video grid
    'scouting.grid.empty': 'No videos yet. Upload your first game footage!',
    'scouting.grid.load_failed': 'Failed to load videos',
    'scouting.grid.clips': '{count} clips',
    'scouting.grid.clips_label': 'clips',

    // Video card badges
    'scouting.badge.shared': 'Shared',
    'scouting.badge.parents': 'Parents',
    'scouting.badge.permanent': 'Permanent',
    'scouting.badge.expired': 'Expired',
    'scouting.badge.hours_left': '{count}h left',
    'scouting.badge.days_left': '{count}d left',

    // Upload
    'scouting.upload.drag_or_click': 'Drag & drop video or click to browse',
    'scouting.upload.formats': 'MP4, MOV, WebM — up to 500MB',
    'scouting.upload.invalid_type': 'Invalid file type. Use MP4, MOV, or WebM.',
    'scouting.upload.too_large': 'File too large (max 100MB).',
    'scouting.upload.uploading': 'Uploading...',
    'scouting.upload.uploading_pct': 'Uploading... {pct}%',
    'scouting.upload.chunk_progress': 'Uploading chunk {current}/{total}...',
    'scouting.upload.saving': 'Saving to library...',
    'scouting.upload.success': 'Video uploaded successfully!',
    'scouting.upload.failed': 'Upload failed',
    'scouting.upload.cloudinary_error': 'Cloudinary not configured. Restart the server after adding credentials to .env',
    'scouting.upload.network_error': 'Network error — check your connection and try again',
    'scouting.upload.timeout': 'Upload timed out — try again or check your connection',
    'scouting.upload.cancelled': 'Upload cancelled',
    'scouting.upload.no_response': 'Upload completed but no valid response received',
    'scouting.upload.chunk_failed': 'Chunk upload failed (HTTP {status})',
    'scouting.upload.retry_failed': 'Upload failed after {count} retries: {error}',

    // Analysis view
    'scouting.analysis.load_failed': 'Failed to load video',
    'scouting.analysis.choose_video': 'Choose video...',

    // Clips sidebar
    'scouting.clips.empty': 'No clips yet. Use the tag buttons below the video to create clips.',
    'scouting.clips.watched': 'Watched: {count}',
    'scouting.clips.tagged': 'Clip tagged!',
    'scouting.clips.save_failed': 'Failed to save clip: {error}',
    'scouting.clips.deleted': 'Clip deleted',
    'scouting.clips.delete_failed': 'Failed to delete clip',
    'scouting.clips.confirm_delete': 'Delete this clip and its annotations?',
    'scouting.clips.invalid_range': 'Invalid clip range',

    // Clip I/O points
    'scouting.io.in': 'IN',
    'scouting.io.out': 'OUT',
    'scouting.io.create_clip': 'Create Clip',

    // Rating
    'scouting.rating.positive': 'Positive',
    'scouting.rating.negative': 'Negative',

    // Sharing
    'scouting.share.unshared': 'Video unshared',
    'scouting.share.shared_team': 'Video shared with team!',
    'scouting.share.no_team': 'No team selected',
    'scouting.share.unshared_parents': 'Video unshared from parents',
    'scouting.share.share_team_first': 'Share with team first before sharing with parents',
    'scouting.share.shared_parents': 'Video shared with parents!',
    'scouting.share.parents_tooltip_share': 'Share with parents',
    'scouting.share.parents_tooltip_unshare': 'Unshare from parents',

    // Video expiry
    'scouting.expiry.permanent': 'Permanent',
    'scouting.expiry.keep_forever': 'Video will be kept permanently',
    'scouting.expiry.auto_delete': 'Video will auto-delete in 14 days',
    'scouting.expiry.update_failed': 'Failed to update',
    'scouting.expiry.keep_forever_tooltip': 'Keep forever',
    'scouting.expiry.remove_permanent_tooltip': 'Remove permanent — auto-delete in 14 days',

    // Video delete
    'scouting.video.deleted': 'Video deleted',
    'scouting.video.delete_failed': 'Failed to delete video',
    'scouting.video.confirm_delete': 'Delete this video and all its clips?',
    'scouting.video.no_video': 'No video loaded',

    // Telestrator / Drawing tools
    'scouting.draw.tool.freehand': 'Freehand',
    'scouting.draw.tool.arrow': 'Arrow',
    'scouting.draw.tool.circle': 'Circle',
    'scouting.draw.tool.text': 'Text',
    'scouting.draw.tool.spotlight': 'Spotlight',
    'scouting.draw.tool.player_marker': 'Player',

    // Annotation track labels
    'scouting.ann.type.freehand': 'Draw',
    'scouting.ann.type.arrow': 'Arrow',
    'scouting.ann.type.circle': 'Circle',
    'scouting.ann.type.text': 'Text',
    'scouting.ann.type.spotlight': 'Spotlight',
    'scouting.ann.type.player_marker': 'Player',

    // Annotation actions
    'scouting.ann.deleted': 'Annotation deleted',
    'scouting.ann.delete_failed': 'Failed to delete',
    'scouting.ann.copied': 'Annotation copied',
    'scouting.ann.pasted': 'Annotation pasted',
    'scouting.ann.enter_text': 'Enter some text',
    'scouting.ann.save_failed': 'Failed to save',

    // Spotlight
    'scouting.spotlight.need_points': 'Need at least 2 keyframe points',
    'scouting.spotlight.saved': 'Spotlight saved!',
    'scouting.spotlight.save_failed': 'Failed to save spotlight',
    'scouting.spotlight.discard': 'Discard current spotlight keyframes?',

    // Clear drawings
    'scouting.draw.clear_confirm': 'Clear all drawings?',

    // Court overlay zones
    'scouting.court.paint': 'PAINT',
    'scouting.court.left_corner': 'L CORNER',
    'scouting.court.right_corner': 'R CORNER',
    'scouting.court.top': 'TOP',

    // Playlists
    'scouting.playlist.empty': 'No playlists yet',
    'scouting.playlist.create': 'Create Playlist',
    'scouting.playlist.new': '+ New Playlist',
    'scouting.playlist.prompt': 'Playlist name:',
    'scouting.playlist.created': 'Playlist created',
    'scouting.playlist.create_failed': 'Failed to create playlist',
    'scouting.playlist.deleted': 'Playlist deleted',
    'scouting.playlist.delete_failed': 'Failed to delete',
    'scouting.playlist.confirm_delete': 'Delete this playlist?',
    'scouting.playlist.added': 'Added to "{name}"',
    'scouting.playlist.add_failed': 'Failed to add',
    'scouting.playlist.create_first': 'Create a playlist first',
    'scouting.playlist.clips': '{count} clips',

    // Batch operations
    'scouting.batch.selected': '{count} selected',
    'scouting.batch.delete_confirm': 'Delete {count} clips?',
    'scouting.batch.deleted': 'Clips deleted',
    'scouting.batch.delete_failed': 'Failed to delete',
    'scouting.batch.updated': 'Clips updated',
    'scouting.batch.update_failed': 'Failed to update',

    // Keyboard shortcuts
    'scouting.shortcuts.back_5s': 'Back 5s',
    'scouting.shortcuts.forward_5s': 'Forward 5s',
    'scouting.shortcuts.prev_frame': 'Previous Frame',
    'scouting.shortcuts.next_frame': 'Next Frame',

    // Preview
    'scouting.clip.preview': 'Preview',
    'scouting.clip.stop': 'Stop',

    // Storage quota
    'scouting.quota.storage': 'Storage: {used} GB / {limit} GB used',

    // Player marker
    'scouting.marker.offense': 'Offense',
    'scouting.marker.defense': 'Defense',

    // Comparison mode
    'scouting.comparison.choose_video': 'Choose video...',

    // Export
    'scouting.export.no_video': 'No video loaded',

    // Clip Compilation
    'scouting.compile.btn': 'Compile Video',
    'scouting.compile.title': 'Create Video from Clips',
    'scouting.compile.video_title': 'Video Title',
    'scouting.compile.sort_by': 'Sort by',
    'scouting.compile.sort_chrono': 'Chronological',
    'scouting.compile.sort_action': 'By Tag',
    'scouting.compile.sort_rating': 'By Rating',
    'scouting.compile.filter': 'Filter',
    'scouting.compile.filter_all': 'All',
    'scouting.compile.show_tags': 'Show tag labels on video',
    'scouting.compile.select_all': 'Select All',
    'scouting.compile.deselect_all': 'Deselect All',
    'scouting.compile.summary': '{count} clips, ~{duration}',
    'scouting.compile.generate': 'Generate Video',
    'scouting.compile.processing': 'Generating... clip {current}/{total}',
    'scouting.compile.uploading': 'Uploading video...',
    'scouting.compile.success': 'Video created successfully!',
    'scouting.compile.failed': 'Video creation failed',
    'scouting.compile.delete_title': 'Delete Original Video',
    'scouting.compile.delete_msg': 'Delete the original video to save storage space?',
    'scouting.compile.delete_original': 'Delete Original',
    'scouting.compile.keep_original': 'Keep Original',
    'scouting.compile.no_clips': 'Select at least one clip',
    'scouting.compile.min_clips': 'At least 2 clips required',

    // =====================================================
    // === main.js — Global Coach Utilities ================
    // =====================================================

    // Notifications
    'main.notif.header': 'Notifications',
    'main.notif.empty': 'No notifications',
    'main.notif.game_ended': 'Game ended — fill a game report',
    'main.notif.unread_messages': '{count} unread messages',

    // Global search hints
    'main.search.hint': 'Try searching for: drills, plays, practice, team, analytics, settings',

    // =====================================================
    // === HTML Template Strings ===========================
    // =====================================================

    // --- chat.html ---
    'coach.chat.welcome_message': 'Welcome, Coach! I have 8 specialized AI agents ready to help. Ask about strategy, drills, nutrition, analytics, or team management.',
    'coach.chat.upload_file': 'Upload file',
    'coach.chat.input_placeholder': 'Ask your coaching question...',
    'coach.chat.auto_routing': 'Auto Routing',
    'coach.chat.active': 'Active',
    'coach.chat.auto_routing_desc': 'Your question will be automatically routed to the most relevant specialist agent.',
    'coach.chat.recent_chats': 'Recent Chats',
    'coach.chat.new': 'New',

    // --- drills.html ---
    'coach.drills.title': 'Drill Library',
    'coach.drills.subtitle': 'Browse, create, and organize basketball drills',
    'coach.drills.btn.video_reviews': 'Video Reviews',
    'coach.drills.btn.player_tracking': 'Player Tracking',
    'coach.drills.btn.ai_generate': 'AI Generate',
    'coach.drills.btn.new_drill': 'New Drill',
    'coach.drills.btn.create_drill': 'Create Drill',
    'coach.drills.search_placeholder': 'Search drills...',
    'coach.drills.filter.all_categories': 'All Categories',
    'coach.drills.filter.all_levels': 'All Levels',
    'coach.drills.category.offense': 'Offense',
    'coach.drills.category.defense': 'Defense',
    'coach.drills.category.ball_handling': 'Ball Handling',
    'coach.drills.empty.subtitle': 'Create your first drill or generate one with AI',
    'coach.drills.modal.new_drill': 'New Drill',
    'coach.drills.modal.ai_generator': 'AI Drill Generator',
    'coach.drills.modal.assign_drill': 'Assign Drill',
    'coach.drills.modal.player_tracking': 'Player Drill Tracking',
    'coach.drills.modal.video_reviews': 'Video Reviews',
    'coach.drills.field.title': 'Title',
    'coach.drills.field.title_placeholder': 'Drill name',
    'coach.drills.field.description': 'Description',
    'coach.drills.field.description_placeholder': 'Brief description',
    'coach.drills.field.category': 'Category',
    'coach.drills.field.difficulty': 'Difficulty',
    'coach.drills.field.duration': 'Duration (min)',
    'coach.drills.field.instructions': 'Instructions',
    'coach.drills.field.instructions_placeholder': 'Step-by-step instructions',
    'coach.drills.field.video_url': 'Video URL (optional)',
    'coach.drills.field.focus': 'Focus (optional)',
    'coach.drills.field.focus_placeholder': 'e.g. pick and roll, fast break',
    'coach.drills.assign.select_players_label': 'Select players to assign this drill to:',
    'coach.drills.assign.select_all': 'Select All',
    'coach.drills.assign.note_label': 'Note for players (optional)',
    'coach.drills.assign.note_placeholder': 'e.g. Do this drill 3 times before next practice',

    // --- practice.html ---
    'coach.practice.title': 'Practice & Training Planner',
    'coach.practice.subtitle': 'Manage your weekly schedule and player workload',
    'coach.practice.btn.ai_generate': 'AI Generate',
    'coach.practice.btn.new_session': 'New Session',
    'coach.practice.empty.title': 'No practice sessions',
    'coach.practice.empty.subtitle': 'Create a session or generate one with AI',
    'coach.practice.modal.new_session': 'New Practice Session',
    'coach.practice.modal.ai_generator': 'AI Session Generator',
    'coach.practice.field.date': 'Date',
    'coach.practice.field.title': 'Title',
    'coach.practice.field.title_placeholder': 'Morning Practice',
    'coach.practice.field.focus': 'Focus',
    'coach.practice.field.focus_placeholder': 'e.g. Defense, Shooting',
    'coach.practice.field.gen_focus_placeholder': 'Defense fundamentals',
    'coach.practice.field.duration': 'Duration (min)',
    'coach.practice.created': 'Session created!',
    'coach.practice.generated': 'AI session generated!',

    // --- schedule.html ---
    'coach.schedule.subtitle': 'Team calendar and events',
    'coach.schedule.btn.request_admin': 'Request to Admin',
    'coach.schedule.btn.add_event': 'Add Event',
    'coach.schedule.btn.save_event': 'Save Event',
    'coach.schedule.btn.submit_request': 'Submit Request',
    'coach.schedule.modal.request_title': 'Request Schedule Change',
    'coach.schedule.request.description': 'Submit a request to your team admin to add this event to the official team schedule.',
    'coach.schedule.request.notes_placeholder': 'Additional notes or reason for request',
    'coach.schedule.event.social': 'Social Activity',
    'coach.schedule.event.tactical_video': 'Tactical / Video',
    'coach.schedule.field.title': 'Title',
    'coach.schedule.field.event_name_placeholder': 'Event name',
    'coach.schedule.field.date': 'Date',
    'coach.schedule.field.time': 'Time',
    'coach.schedule.field.type': 'Type',
    'coach.schedule.field.opponent': 'Opponent (optional)',
    'coach.schedule.field.opponent_placeholder': 'Opponent team',
    'coach.schedule.field.facility': 'Facility',
    'coach.schedule.field.repeat_weekly': 'Repeat Weekly',
    'coach.schedule.field.no_repeat': 'No repeat',
    'coach.schedule.field.notes': 'Notes',
    'coach.schedule.field.notes_placeholder': 'Additional notes',
    'coach.schedule.field.team': 'Team',
    'coach.schedule.field.start_time': 'Start Time',
    'coach.schedule.field.end_time': 'End Time',
    'coach.schedule.field.location': 'Location',
    'coach.schedule.field.location_placeholder': 'Location',

    // --- logistics.html ---
    'coach.logistics.subtitle': 'Roster management',
    'coach.logistics.modal.add_player': 'Add Player',
    'coach.logistics.modal.edit_player': 'Edit Player',
    'coach.logistics.modal.player_profile': 'Player Profile',
    'coach.logistics.btn.add_player': 'Add Player',
    'coach.logistics.btn.save_player': 'Save Player',
    'coach.logistics.field.name': 'Name',
    'coach.logistics.field.name_placeholder': 'Player name',
    'coach.logistics.field.jersey': 'Jersey #',
    'coach.logistics.field.position': 'Position',
    'coach.logistics.field.select': 'Select...',
    'coach.logistics.field.gender': 'Gender',
    'coach.logistics.field.birth_date': 'Birth Date',
    'coach.logistics.field.height': 'Height (cm)',
    'coach.logistics.field.weight': 'Weight (kg)',
    'coach.logistics.field.player_phone': 'Player Phone',
    'coach.logistics.field.player_phone_placeholder': 'Player phone',
    'coach.logistics.field.player_email': 'Player Email',
    'coach.logistics.field.player_email_placeholder': 'Player email',
    'coach.logistics.field.parent_phone': 'Parent Phone',
    'coach.logistics.field.parent_phone_placeholder': 'Parent phone',
    'coach.logistics.field.parent_email': 'Parent Email',
    'coach.logistics.field.parent_email_placeholder': 'Parent email',
    'coach.logistics.field.notes': 'Notes',
    'coach.logistics.field.notes_placeholder': 'Additional notes',
    'coach.logistics.position.pg': 'Point Guard (PG)',
    'coach.logistics.position.sg': 'Shooting Guard (SG)',
    'coach.logistics.position.sf': 'Small Forward (SF)',
    'coach.logistics.position.pf': 'Power Forward (PF)',
    'coach.logistics.position.c': 'Center (C)',
    'coach.logistics.gender.male': 'Male',
    'coach.logistics.gender.female': 'Female',
    'coach.logistics.table.number': '#',
    'coach.logistics.table.name': 'Name',
    'coach.logistics.table.pos': 'Pos',
    'coach.logistics.table.age': 'Age',
    'coach.logistics.table.height': 'Height',
    'coach.logistics.table.weight': 'Weight',
    'coach.logistics.table.phone': 'Phone',
    'coach.logistics.table.actions': 'Actions',
    'coach.logistics.empty.title': 'No players',
    'coach.logistics.empty.subtitle': 'Add your first player to the roster',
    'coach.logistics.player_updated': 'Player updated!',
    'coach.logistics.player_added': 'Player added!',
    'coach.logistics.player_deleted': 'Player deleted',
    'coach.logistics.confirm_delete_player': 'Delete this player?',
    'coach.logistics.error.name_required': 'Name is required',
    'coach.logistics.loading_player': 'Loading player data...',
    'coach.logistics.profile_load_failed': 'Could not load player profile',

    // --- reports.html ---
    'coach.reports.subtitle': 'Attendance, game reports, and player assessments',
    'coach.reports.tab.evaluations': 'Player Evaluations',
    'coach.reports.eval.all_periods': 'All periods',
    'coach.reports.eval.period_type': 'Period Type',
    'coach.reports.eval.period_label': 'Period Label',
    'coach.reports.eval.period_label_placeholder': 'Auto-calculated',
    'coach.reports.eval.ratings_heading': 'Ratings (1-10)',
    'coach.reports.eval.label.offensive': 'Offensive Abilities',
    'coach.reports.eval.label.defensive': 'Defensive Abilities',
    'coach.reports.eval.label.social': 'Social / Teamwork',
    'coach.reports.eval.label.fitness': 'Physical Fitness',
    'coach.reports.eval.notes_placeholder': 'Notes...',
    'coach.reports.eval.overall_notes': 'Overall Notes',
    'coach.reports.eval.overall_placeholder': 'General assessment of the player...',
    'coach.reports.eval.potential': 'Potential & Development',
    'coach.reports.eval.potential_placeholder': 'Player potential, development trajectory...',
    'coach.reports.btn.save_evaluation': 'Save Evaluation',
    'coach.reports.btn.save_report': 'Save Report',
    'coach.reports.game.field.date': 'Date',
    'coach.reports.game.field.opponent': 'Opponent',
    'coach.reports.game.field.opponent_placeholder': 'Opponent team',
    'coach.reports.game.field.result': 'Result',
    'coach.reports.game.field.our_score': 'Our Score',
    'coach.reports.game.field.their_score': 'Their Score',
    'coach.reports.game.field.location': 'Location',
    'coach.reports.game.field.location_placeholder': 'Game location',
    'coach.reports.game.field.areas_to_improve': 'Areas to Improve (comma-separated)',
    'coach.reports.game.field.areas_placeholder': 'Area 1, Area 2',
    'coach.reports.game.field.notable': 'Notable Events',
    'coach.reports.game.field.notable_placeholder': 'Key moments from the game',
    'coach.reports.game.field.notes': 'Notes',
    'coach.reports.game.btn.select_players': 'Select Players',

    // --- analytics.html (dashboard) ---
    'coach.dashboard.stat.players': 'Players',
    'coach.dashboard.stat.drills_completed': 'Drills Completed',
    'coach.dashboard.stat.upcoming_events': 'Upcoming Events',
    'coach.dashboard.stat.win_rate': 'Win Rate',
    'coach.dashboard.section.upcoming_schedule': 'Upcoming Schedule',
    'coach.dashboard.section.recent_results': 'Recent Results',
    'coach.dashboard.section.player_attendance': 'Player Attendance',
    'coach.dashboard.section.drill_leaderboard': 'Home Drill Leaders',
    'coach.dashboard.section.recent_practices': 'Recent Practices',
    'coach.dashboard.link.full_calendar': 'Full Calendar ←',
    'coach.dashboard.link.all_reports': 'All Reports ←',
    'coach.dashboard.link.full_attendance': 'Full Attendance ←',
    'coach.dashboard.link.all_drills': 'All Drills ←',
    'coach.dashboard.link.practice_planner': 'Practice Planner ←',
    'coach.dashboard.loading': 'Loading...',

    // --- messages.html ---
    'coach.messages.loading': 'Loading messages...',
    'coach.messages.loading_short': 'Loading...',
    'coach.messages.sent_title': 'Sent Messages',
    'coach.messages.compose_title': 'Compose Message',
    'coach.messages.field.send_to': 'Send to',
    'coach.messages.field.subject': 'Subject (optional)',
    'coach.messages.field.subject_placeholder': 'Subject...',
    'coach.messages.field.message': 'Message',
    'coach.messages.field.message_placeholder': 'Write your message...',

    // --- coach_knowledge.html ---
    'coach.knowledge.subtitle': 'Upload coaching documents for AI-enhanced answers',
    'coach.knowledge.btn.upload_document': 'Upload Document',
    'coach.knowledge.stat.total_chunks': 'Total Chunks',
    'coach.knowledge.section.my_documents': 'My Documents',
    'coach.knowledge.section.club_system': 'Club & System Documents',
    'coach.knowledge.filter.all_statuses': 'All Statuses',
    'coach.knowledge.modal.upload_title': 'Upload Document',
    'coach.knowledge.modal.doc_details': 'Document Details',
    'coach.knowledge.field.file': 'File *',
    'coach.knowledge.field.file_formats': 'PDF, DOCX, or TXT — Max 20MB',
    'coach.knowledge.field.title': 'Title *',
    'coach.knowledge.field.title_placeholder': 'Document title',
    'coach.knowledge.field.category': 'Category *',
    'coach.knowledge.field.language': 'Language *',
    'coach.knowledge.field.description': 'Description (optional)',
    'coach.knowledge.field.description_placeholder': 'Brief description of the document content',

    // --- scouting.html ---
    'coach.scouting.btn.upload_video': 'Upload Video',
    'coach.scouting.filter.all': 'All',
    'coach.scouting.filter.scout': 'Scout',
    'coach.scouting.filter.highlight': 'Highlight',
    'coach.scouting.search_placeholder': 'Search videos...',
    'coach.scouting.loading_videos': 'Loading videos...',
    'coach.scouting.video_title': 'Video Title',
    'coach.scouting.share.share_with_team': 'Share with team',
    'coach.scouting.zoom.zoom_out': 'Zoom Out (-)',
    'coach.scouting.zoom.zoom_in': 'Zoom In (+)',
    'coach.scouting.zoom.reset_zoom': 'Reset Zoom (0)',
    'coach.scouting.btn.compare_videos': 'Compare Videos',
    'coach.scouting.btn.export_clip': 'Export Clip with Annotations',
    'coach.scouting.btn.keyboard_shortcuts': 'Keyboard Shortcuts (?)',
    'coach.scouting.tools.draw': 'Draw',
    'coach.scouting.tools.tag': 'Tag',
    'coach.scouting.tools.player_marker_title': 'Player Marker [M]',
    'coach.scouting.tools.configure_marker': 'Configure marker',
    'coach.scouting.tools.spotlight_title': 'Spotlight [S]',
    'coach.scouting.tools.court_overlay': 'Court Overlay',
    'coach.scouting.tools.stroke_width': 'Stroke width',
    'coach.scouting.tools.opacity': 'Opacity',
    'coach.scouting.tools.done': 'Done',
    'coach.scouting.tools.undo': 'Undo [Ctrl+Z]',
    'coach.scouting.tools.clear_all': 'Clear All',
    'coach.scouting.tag.fast_break': 'Fast Break',
    'coach.scouting.tag.defense': 'Defense',
    'coach.scouting.tag.post_up': 'Post Up',
    'coach.scouting.tag.screen': 'Screen',
    'coach.scouting.tag.rebound': 'Reb',
    'coach.scouting.tag.transition': 'Trans',
    'coach.scouting.tag.other': 'Other',
    'coach.scouting.export.exporting': 'Exporting clip...',
    'coach.scouting.comparison.select_video': 'Select video to compare',
    'coach.scouting.comparison.sync': 'Sync',
    'coach.scouting.comparison.pick_video': 'Pick a video to compare',
    'coach.scouting.clips.title': 'Clips',
    'coach.scouting.clips.tab_clips': 'Clips',
    'coach.scouting.clips.tab_playlists': 'Playlists',
    'coach.scouting.clips.select_all': 'Select All',
    'coach.scouting.modal.upload_title': 'Upload Video',
    'coach.scouting.modal.tag_clip': 'Tag Clip',
    'coach.scouting.upload.progress_text': 'Uploading... 0%',
    'coach.scouting.upload.title_placeholder': 'e.g. Game vs Maccabi',
    'coach.scouting.upload.field.opponent': 'Opponent (optional)',
    'coach.scouting.upload.opponent_placeholder': 'e.g. Maccabi Tel Aviv',
    'coach.scouting.upload.field.game_date': 'Game Date (optional)',
    'coach.scouting.upload.select_team': 'Select team...',
    'coach.scouting.upload.keep_forever': 'Keep forever',
    'coach.scouting.upload.keep_forever_note': '(no auto-delete after 14 days)',
    'coach.scouting.type.opponent_scout': 'Opponent Scout',
    'coach.scouting.clip.field.start': 'Start',
    'coach.scouting.clip.field.end': 'End',
    'coach.scouting.clip.field.duration': 'Duration',
    'coach.scouting.clip.field.action_type': 'Action Type',
    'coach.scouting.clip.field.rating': 'Rating',
    'coach.scouting.clip.field.tag_players': 'Tag Players',
    'coach.scouting.clip.field.notes': 'Notes (optional)',
    'coach.scouting.clip.notes_placeholder': 'Quick note...',
    'coach.scouting.clip.btn.save_clip': 'Save Clip',
    'coach.scouting.shortcuts.title': 'Keyboard Shortcuts',
    'coach.scouting.shortcuts.group.playback': 'Playback',
    'coach.scouting.shortcuts.group.drawing': 'Drawing Tools',
    'coach.scouting.shortcuts.group.clipping': 'Clipping & Zoom',
    'coach.scouting.shortcuts.play_pause': 'Play / Pause',
    'coach.scouting.shortcuts.seek': '±5s / ±1 frame (paused)',
    'coach.scouting.shortcuts.seek_1s': '±1 second',
    'coach.scouting.shortcuts.frame_step': 'Previous / Next frame',
    'coach.scouting.shortcuts.speed_change': 'Slower / Faster speed',
    'coach.scouting.shortcuts.speed_preset': 'Speed: 0.25x - 2x',
    'coach.scouting.shortcuts.draw_freehand': 'Freehand draw',
    'coach.scouting.shortcuts.undo': 'Undo',
    'coach.scouting.shortcuts.copy_paste': 'Copy / Paste annotation',
    'coach.scouting.shortcuts.delete': 'Delete selected',
    'coach.scouting.shortcuts.deselect': 'Deselect tool',
    'coach.scouting.shortcuts.set_in': 'Set In-point',
    'coach.scouting.shortcuts.set_out': 'Set Out-point',
    'coach.scouting.shortcuts.zoom': 'Zoom in / out',
    'coach.scouting.shortcuts.reset_zoom': 'Reset zoom',
    'coach.scouting.shortcuts.scroll_zoom': 'Scroll zoom',
    'coach.scouting.shortcuts.toggle_overlay': 'Toggle this overlay',
  }
});
