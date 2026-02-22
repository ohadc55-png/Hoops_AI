"""HOOPS AI - Player Agent Constants & Metadata"""

PLAYER_AGENTS = {
    "shooting_coach": {
        "name": "Shooting Coach",
        "name_he": "מאמן קליעה",
        "icon": "target",
        "color": "#F87171",
        "description": "Shooting technique, form analysis, shot selection, and range development.",
        "keywords": [
            "shoot", "shooting", "shot", "three", "3-pointer", "free throw", "midrange",
            "form", "release", "arc", "follow through", "catch and shoot", "pull up",
            "layup", "floater", "jumpshot", "jumper",
            "קליעה", "זריקה", "זריקות", "עצירה", "שלוש", "טלאי", "קליעות",
            "סל", "קליעת", "זריקת",
        ],
    },
    "dribbling_coach": {
        "name": "Dribbling Coach",
        "name_he": "מאמן כדרור",
        "icon": "sports_basketball",
        "color": "#60A5FA",
        "description": "Ball handling, crossovers, moves, control, and breaking defenders.",
        "keywords": [
            "dribble", "dribbling", "handle", "handling", "crossover", "ball control",
            "moves", "hesitation", "between legs", "behind back", "in and out",
            "spin move", "euro step", "step back",
            "כדרור", "כדררור", "ידיים", "שליטה", "בכדור", "מהלך", "קרוסאובר",
            "טיפטוף", "כדור",
        ],
    },
    "passing_coach": {
        "name": "Passing Coach",
        "name_he": "מאמן מסירה",
        "icon": "swap_horiz",
        "color": "#A78BFA",
        "description": "Passing technique, court vision, decision making, and playmaking.",
        "keywords": [
            "pass", "passing", "assist", "vision", "bounce pass", "chest pass",
            "lob", "entry pass", "outlet", "skip pass", "no look", "decision",
            "playmaking", "court vision", "pick and roll pass",
            "מסירה", "מסירות", "אסיסט", "ראייה", "ראיית", "העברה", "פלייימייקר",
        ],
    },
    "fitness_coach": {
        "name": "Fitness Coach",
        "name_he": "מאמן כושר",
        "icon": "exercise",
        "color": "#34D399",
        "description": "Strength, conditioning, agility, speed, and injury prevention.",
        "keywords": [
            "fitness", "workout", "strength", "conditioning", "agility", "speed",
            "jump", "vertical", "endurance", "stretch", "warm up", "cool down",
            "injury", "prevention", "recovery", "rest", "muscle", "core",
            "explosive", "lateral", "sprint",
            "כושר", "חיזוק", "מהירות", "זריזות", "קפיצה", "פציעה", "מניעה",
            "מתיחות", "שרירים", "אימון כושר",
        ],
    },
    "nutritionist": {
        "name": "Nutritionist",
        "name_he": "תזונאי",
        "icon": "restaurant",
        "color": "#FBBF24",
        "description": "Diet, nutrition, hydration, recovery food, and meal planning for athletes.",
        "keywords": [
            "food", "eat", "diet", "nutrition", "meal", "hydration", "water", "drink",
            "protein", "carb", "calorie", "snack", "pre game", "post game", "recovery",
            "supplement", "vitamin", "weight", "breakfast", "lunch", "dinner",
            "תזונה", "אוכל", "דיאטה", "ארוחה", "שתייה", "מים", "חלבון",
            "פחמימות", "ויטמין",
        ],
    },
}

PLAYER_AGENT_KEYS = list(PLAYER_AGENTS.keys())
