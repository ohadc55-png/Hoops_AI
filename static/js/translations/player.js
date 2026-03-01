/**
 * HOOPS AI - Player Portal Translations
 * Covers: player_chat, player_dashboard, player_drills, player_plays,
 *         player_schedule, player_leaderboard, player_scouting,
 *         player_messages, player_main (Hebrew strings)
 */
I18N.register({
  he: {
    // === Player Chat (player_chat.js) ===
    // -- Agent names --
    'player.chat.agent.shooting_coach': 'מאמן קליעה',
    'player.chat.agent.dribbling_coach': 'מאמן כדרור',
    'player.chat.agent.passing_coach': 'מאמן מסירה',
    'player.chat.agent.fitness_coach': 'מאמן כושר',
    'player.chat.agent.nutritionist': 'תזונאי',
    // -- Agent descriptions --
    'player.chat.desc.shooting_coach': 'טכניקת קליעה, פורם, בחירת זריקה ופיתוח טווח.',
    'player.chat.desc.dribbling_coach': 'שליטה בכדור, קרוסאובר, מהלכים ושבירת מגנים.',
    'player.chat.desc.passing_coach': 'טכניקת מסירה, ראיית מגרש וקבלת החלטות.',
    'player.chat.desc.fitness_coach': 'חיזוק, כושר, זריזות, מהירות ומניעת פציעות.',
    'player.chat.desc.nutritionist': 'תזונה, דיאטה, שתייה, ותכנון ארוחות לספורטאים.',
    // -- Chat UI --
    'player.chat.error': 'סליחה, משהו השתבש. נסה שוב.',
    'player.chat.no_conversations': 'אין שיחות עדיין',
    'player.chat.new_conversation': 'שיחה חדשה',
    'player.chat.new_chat_welcome': 'שיחה חדשה נפתחה. על מה תרצה לעבוד?',
    'player.chat.load_error': 'שגיאה בטעינת השיחה',

    // === Player Dashboard (player_dashboard.js) ===
    'player.dashboard.welcome': 'היי {name}!',
    'player.dashboard.next_event': 'הבא: {title} — {date}',
    // -- Drill progress stats --
    'player.dashboard.drill_total': 'סה"כ',
    'player.dashboard.drill_pending': 'ממתין',
    'player.dashboard.drill_under_review': 'בבדיקה',
    'player.dashboard.drill_approved': 'אושר',
    'player.dashboard.drill_no_activity': 'אין פעילות עדיין — העלה סרטון כדי להתחיל!',
    'player.dashboard.recent_activity': 'פעילות אחרונה',
    // -- Leaderboard preview --
    'player.dashboard.attendance_kings': 'מלכי הנוכחות',
    'player.dashboard.drill_champions': 'אלופי התרגילים',

    // === Player Drills (player_drills.js) ===
    // -- Empty states --
    'player.drills.empty_completed': 'אין תרגילים שהושלמו עדיין',
    'player.drills.empty_pending': 'אין תרגילים ממתינים — כל הכבוד!',
    'player.drills.empty_review': 'אין תרגילים בבדיקה',
    'player.drills.empty_all': 'עדיין לא שובצו תרגילים',
    'player.drills.load_error': 'לא ניתן לטעון תרגילים',
    // -- Status labels --
    'player.drills.status.approved': 'אושר',
    'player.drills.status.under_review': 'בבדיקה',
    'player.drills.status.try_again': 'נסה שוב',
    'player.drills.status.upload_video': 'העלה סרטון',
    // -- Detail modal --
    'player.drills.assigned': 'שובץ {time}',
    'player.drills.watch_video': 'צפה בסרטון',
    'player.drills.my_video_proof': 'סרטון ההוכחה שלי',
    'player.drills.instructions': 'הנחיות',
    'player.drills.coaching_points': 'נקודות אימון',
    'player.drills.coach_note': 'הערת המאמן',
    'player.drills.coach_feedback': 'משוב המאמן',
    'player.drills.waiting_review': 'ממתין לבדיקת המאמן',
    'player.drills.reupload_video': 'העלה סרטון מחדש',
    'player.drills.upload_video_proof': 'העלה סרטון הוכחה',
    // -- Video upload --
    'player.drills.video_too_large': 'הסרטון גדול מדי (מקסימום 15MB)',
    'player.drills.uploading': 'מעלה...',
    'player.drills.upload_success': 'הסרטון הועלה! ממתין לבדיקת המאמן.',
    'player.drills.upload_failed': 'ההעלאה נכשלה',
    // -- Legacy --
    'player.drills.saving': 'שומר...',
    'player.drills.completed': 'התרגיל הושלם!',
    'player.drills.complete_failed': 'נכשל בסימון כהושלם',
    'player.drills.mark_completed': 'סמן כהושלם',
    'player.drills.min': 'דק\'',

    // === Player Plays (player_plays.js) ===
    'player.plays.empty': 'עדיין לא שותפו משחקונים',
    'player.plays.load_error': 'לא ניתן לטעון משחקונים',
    'player.plays.new_badge': 'חדש!',
    'player.plays.steps': '{count} שלבים',
    // -- Template names --
    'player.plays.tpl.empty': 'ריק',
    'player.plays.tpl.5_out': '5-Out',
    'player.plays.tpl.4_out_1_in': '4-Out 1-In',
    'player.plays.tpl.horns': 'Horns',
    'player.plays.tpl.box': 'Box',
    'player.plays.tpl.1_4_high': '1-4 High',
    'player.plays.tpl.man': 'אדם על אדם',
    'player.plays.tpl.23_zone': 'אזור 2-3',
    'player.plays.tpl.32_zone': 'אזור 3-2',

    // === Player Leaderboard (player_leaderboard.js) ===
    'player.leaderboard.attendance_kings': 'מלכי הנוכחות',
    'player.leaderboard.drill_champions': 'אלופי התרגילים',
    'player.leaderboard.no_data': 'אין נתונים עדיין',
    'player.leaderboard.load_error': 'לא ניתן לטעון את טבלת המובילים',
    'player.leaderboard.col_player': 'שחקן',
    'player.leaderboard.col_pos': 'עמדה',
    'player.leaderboard.col_score': 'ניקוד',
    'player.leaderboard.you': '(אתה)',

    // === Player Scouting (player_scouting.js) ===
    'player.scouting.feed_error': 'נכשל בטעינת פיד וידאו',
    'player.scouting.no_new_clips': 'אין קליפים חדשים!',
    'player.scouting.no_clips': 'אין קליפים עדיין. המאמן יתייג אותך בצילומי משחק.',
    'player.scouting.watched': 'נצפה',
    'player.scouting.watch': 'צפה',
    'player.scouting.clip_error': 'נכשל בטעינת קליפ',

    // === Player Messages (player_messages.js) ===
    'player.messages.no_messages': 'אין הודעות',
    'player.messages.load_error': 'לא ניתן לטעון הודעות',
    'player.messages.default_subject': 'הודעה',
    'player.messages.body_required': 'יש להזין תוכן הודעה',
    'player.messages.sent': 'ההודעה נשלחה',

    // === Player Main (player_main.js) ===
    'player.notifications.title': 'התראות',
    'player.notifications.empty': 'אין התראות חדשות',

    // === HTML template strings ===
    // -- player_chat.html --
    'player.chat.header_title': 'עוזר אימון AI',
    'player.chat.input_placeholder': 'שאל את המאמן שלך...',
    'player.chat.auto_routing': 'ניתוב אוטומטי',
    'player.chat.active_badge': 'פעיל',
    'player.chat.auto_routing_desc': 'השאלה שלך תנותב אוטומטית למאמן המתאים ביותר לנושא.',
    'player.chat.recent_conversations': 'שיחות אחרונות',
    'player.chat.new_btn': 'חדש',
    // -- player_dashboard.html --
    'player.dashboard.welcome_default': 'ברוך הבא!',
    'player.dashboard.streak_tooltip': 'רצף הגעות לאימונים!',
    'player.dashboard.my_drill_progress': 'התרגילים שלי',
    'player.dashboard.view_all': 'הצג הכל →',
    'player.dashboard.team_rankings': 'דירוג קבוצתי',
    'player.dashboard.view_full': 'הצג הכל →',
    'player.dashboard.ql_view_calendar': 'צפה בלוח השנה',
    'player.dashboard.ql_team_library': 'ספריית קבוצה',
    'player.dashboard.ql_my_assessments': 'ההערכות שלי',
    'player.dashboard.ql_roster_info': 'הרכב ומידע',
    // -- player_drills.html --
    'player.drills.page_title': 'התרגילים שלי',
    'player.drills.section_title': 'תרגילים שהוקצו',
    'player.drills.filter_all': 'הכל',
    'player.drills.filter_pending': 'ממתין',
    'player.drills.filter_under_review': 'בבדיקה',
    'player.drills.filter_completed': 'הושלמו',
    'player.drills.loading': 'טוען תרגילים...',
    // -- player_plays.html --
    'player.plays.page_title': 'משחקוני קבוצה',
    'player.plays.loading': 'טוען משחקונים...',
    // -- player_reports.html --
    'player.reports.page_title': 'הדוחות שלי',
    'player.reports.loading': 'טוען דוחות...',
    'player.reports.no_reports': 'אין דוחות עדיין',
    'player.reports.load_error': 'לא ניתן לטעון דוחות',
    'player.reports.strengths': 'חוזקות',
    'player.reports.areas_to_improve': 'תחומים לשיפור',
    'player.reports.focus_areas': 'תחומי מיקוד',
    'player.reports.recommendations': 'המלצות',
    // -- player_team.html --
    'player.team.loading': 'טוען מידע קבוצה...',
    'player.team.no_info': 'אין מידע קבוצה זמין',
    'player.team.load_error': 'לא ניתן לטעון מידע קבוצה',
    'player.team.members': 'שחקנים',
    // -- player_leaderboard.html --
    'player.leaderboard.loading': 'טוען טבלת מובילים...',
    // -- player_messages.html --
    'player.messages.tab_inbox': 'דואר נכנס',
    'player.messages.tab_compose': 'כתוב',
    'player.messages.loading': 'טוען הודעות...',
    'player.messages.send_to': 'שלח אל',
    'player.messages.target_my_coach': 'המאמן שלי',
    'player.messages.target_my_team': 'הקבוצה שלי',
    'player.messages.subject_label': 'נושא (אופציונלי)',
    'player.messages.subject_placeholder': 'נושא...',
    'player.messages.message_label': 'הודעה',
    'player.messages.message_placeholder': 'כתוב את הודעתך...',
    // -- player_scouting.html --
    'player.scouting.page_title': 'פיד וידאו',
    'player.scouting.filter_all': 'הכל',
    'player.scouting.filter_new': 'חדש',
    'player.scouting.loading': 'טוען...',
    'player.scouting.clip_title': 'קליפ',
  },

  en: {
    // === Player Chat (player_chat.js) ===
    // -- Agent names --
    'player.chat.agent.shooting_coach': 'Shooting Coach',
    'player.chat.agent.dribbling_coach': 'Dribbling Coach',
    'player.chat.agent.passing_coach': 'Passing Coach',
    'player.chat.agent.fitness_coach': 'Fitness Coach',
    'player.chat.agent.nutritionist': 'Nutritionist',
    // -- Agent descriptions --
    'player.chat.desc.shooting_coach': 'Shooting technique, form, shot selection, and range development.',
    'player.chat.desc.dribbling_coach': 'Ball handling, crossovers, moves, and breaking through defenders.',
    'player.chat.desc.passing_coach': 'Passing technique, court vision, and decision making.',
    'player.chat.desc.fitness_coach': 'Strength, fitness, agility, speed, and injury prevention.',
    'player.chat.desc.nutritionist': 'Nutrition, diet, hydration, and meal planning for athletes.',
    // -- Chat UI --
    'player.chat.error': 'Sorry, something went wrong. Please try again.',
    'player.chat.no_conversations': 'No conversations yet',
    'player.chat.new_conversation': 'New conversation',
    'player.chat.new_chat_welcome': 'New conversation started. What would you like to work on?',
    'player.chat.load_error': 'Error loading conversation',

    // === Player Dashboard (player_dashboard.js) ===
    'player.dashboard.welcome': 'Hey {name}!',
    'player.dashboard.next_event': 'Next: {title} — {date}',
    // -- Drill progress stats --
    'player.dashboard.drill_total': 'Total',
    'player.dashboard.drill_pending': 'Pending',
    'player.dashboard.drill_under_review': 'Under Review',
    'player.dashboard.drill_approved': 'Approved',
    'player.dashboard.drill_no_activity': 'No activity yet — upload a video to get started!',
    'player.dashboard.recent_activity': 'Recent Activity',
    // -- Leaderboard preview --
    'player.dashboard.attendance_kings': 'Attendance Kings',
    'player.dashboard.drill_champions': 'Drill Champions',

    // === Player Drills (player_drills.js) ===
    // -- Empty states --
    'player.drills.empty_completed': 'No completed drills yet',
    'player.drills.empty_pending': 'No pending drills — great job!',
    'player.drills.empty_review': 'No drills under review',
    'player.drills.empty_all': 'No drills assigned yet',
    'player.drills.load_error': 'Could not load drills',
    // -- Status labels --
    'player.drills.status.approved': 'Approved',
    'player.drills.status.under_review': 'Under Review',
    'player.drills.status.try_again': 'Try Again',
    'player.drills.status.upload_video': 'Upload Video',
    // -- Detail modal --
    'player.drills.assigned': 'Assigned {time}',
    'player.drills.watch_video': 'Watch Video',
    'player.drills.my_video_proof': 'My Video Proof',
    'player.drills.instructions': 'Instructions',
    'player.drills.coaching_points': 'Coaching Points',
    'player.drills.coach_note': "Coach's Note",
    'player.drills.coach_feedback': 'Coach Feedback',
    'player.drills.waiting_review': 'Waiting for Coach Review',
    'player.drills.reupload_video': 'Re-upload Video',
    'player.drills.upload_video_proof': 'Upload Video Proof',
    // -- Video upload --
    'player.drills.video_too_large': 'Video too large (max 15MB)',
    'player.drills.uploading': 'Uploading...',
    'player.drills.upload_success': 'Video uploaded! Waiting for coach review.',
    'player.drills.upload_failed': 'Upload failed',
    // -- Legacy --
    'player.drills.saving': 'Saving...',
    'player.drills.completed': 'Drill completed!',
    'player.drills.complete_failed': 'Failed to mark as completed',
    'player.drills.mark_completed': 'Mark as Completed',
    'player.drills.min': 'min',

    // === Player Plays (player_plays.js) ===
    'player.plays.empty': 'No team plays shared yet',
    'player.plays.load_error': 'Could not load plays',
    'player.plays.new_badge': 'New!',
    'player.plays.steps': '{count} steps',
    // -- Template names --
    'player.plays.tpl.empty': 'Empty',
    'player.plays.tpl.5_out': '5-Out',
    'player.plays.tpl.4_out_1_in': '4-Out 1-In',
    'player.plays.tpl.horns': 'Horns',
    'player.plays.tpl.box': 'Box',
    'player.plays.tpl.1_4_high': '1-4 High',
    'player.plays.tpl.man': 'Man-to-Man',
    'player.plays.tpl.23_zone': '2-3 Zone',
    'player.plays.tpl.32_zone': '3-2 Zone',

    // === Player Leaderboard (player_leaderboard.js) ===
    'player.leaderboard.attendance_kings': 'Attendance Kings',
    'player.leaderboard.drill_champions': 'Drill Champions',
    'player.leaderboard.no_data': 'No data yet',
    'player.leaderboard.load_error': 'Could not load leaderboard',
    'player.leaderboard.col_player': 'Player',
    'player.leaderboard.col_pos': 'Pos',
    'player.leaderboard.col_score': 'Score',
    'player.leaderboard.you': '(You)',

    // === Player Scouting (player_scouting.js) ===
    'player.scouting.feed_error': 'Failed to load video feed',
    'player.scouting.no_new_clips': 'No new clips!',
    'player.scouting.no_clips': 'No clips yet. Your coach will tag you in game footage.',
    'player.scouting.watched': 'Watched',
    'player.scouting.watch': 'Watch',
    'player.scouting.clip_error': 'Failed to load clip',

    // === Player Messages (player_messages.js) ===
    'player.messages.no_messages': 'No messages',
    'player.messages.load_error': 'Could not load messages',
    'player.messages.default_subject': 'Message',
    'player.messages.body_required': 'Message body is required',
    'player.messages.sent': 'Message sent',

    // === Player Main (player_main.js) ===
    'player.notifications.title': 'Notifications',
    'player.notifications.empty': 'No new notifications',

    // === HTML template strings ===
    // -- player_chat.html --
    'player.chat.header_title': 'AI Training Assistant',
    'player.chat.input_placeholder': 'Ask your coach...',
    'player.chat.auto_routing': 'Auto Routing',
    'player.chat.active_badge': 'Active',
    'player.chat.auto_routing_desc': 'Your question will be automatically routed to the most suitable coach for the topic.',
    'player.chat.recent_conversations': 'Recent Conversations',
    'player.chat.new_btn': 'New',
    // -- player_dashboard.html --
    'player.dashboard.welcome_default': 'Welcome!',
    'player.dashboard.streak_tooltip': 'Attendance streak!',
    'player.dashboard.my_drill_progress': 'My Drill Progress',
    'player.dashboard.view_all': 'View All →',
    'player.dashboard.team_rankings': 'Team Rankings',
    'player.dashboard.view_full': 'View Full →',
    'player.dashboard.ql_view_calendar': 'View Calendar',
    'player.dashboard.ql_team_library': 'Team Library',
    'player.dashboard.ql_my_assessments': 'My Assessments',
    'player.dashboard.ql_roster_info': 'Roster & Info',
    // -- player_drills.html --
    'player.drills.page_title': 'My Drills',
    'player.drills.section_title': 'Assigned Drills',
    'player.drills.filter_all': 'All',
    'player.drills.filter_pending': 'Pending',
    'player.drills.filter_under_review': 'Under Review',
    'player.drills.filter_completed': 'Completed',
    'player.drills.loading': 'Loading drills...',
    // -- player_plays.html --
    'player.plays.page_title': 'Team Plays',
    'player.plays.loading': 'Loading plays...',
    // -- player_reports.html --
    'player.reports.page_title': 'My Reports',
    'player.reports.loading': 'Loading reports...',
    'player.reports.no_reports': 'No reports yet',
    'player.reports.load_error': 'Could not load reports',
    'player.reports.strengths': 'Strengths',
    'player.reports.areas_to_improve': 'Areas to Improve',
    'player.reports.focus_areas': 'Focus Areas',
    'player.reports.recommendations': 'Recommendations',
    // -- player_team.html --
    'player.team.loading': 'Loading team info...',
    'player.team.no_info': 'No team info available',
    'player.team.load_error': 'Could not load team info',
    'player.team.members': 'players',
    // -- player_leaderboard.html --
    'player.leaderboard.loading': 'Loading leaderboard...',
    // -- player_messages.html --
    'player.messages.tab_inbox': 'Inbox',
    'player.messages.tab_compose': 'Compose',
    'player.messages.loading': 'Loading messages...',
    'player.messages.send_to': 'Send to',
    'player.messages.target_my_coach': 'My Coach',
    'player.messages.target_my_team': 'My Team',
    'player.messages.subject_label': 'Subject (optional)',
    'player.messages.subject_placeholder': 'Subject...',
    'player.messages.message_label': 'Message',
    'player.messages.message_placeholder': 'Write your message...',
    // -- player_scouting.html --
    'player.scouting.page_title': 'Video Feed',
    'player.scouting.filter_all': 'All',
    'player.scouting.filter_new': 'New',
    'player.scouting.loading': 'Loading...',
    'player.scouting.clip_title': 'Clip',
  }
});
