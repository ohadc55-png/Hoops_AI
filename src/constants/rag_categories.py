"""HOOPS AI - RAG Categories: Document categories and agent mappings."""

# Available document categories (user selects when uploading)
DOCUMENT_CATEGORIES = {
    "general": "General Basketball Coaching",
    "drills": "Drills & Training Exercises",
    "tactics": "Tactics, Plays & Strategy",
    "offense": "Offensive Systems",
    "defense": "Defensive Systems",
    "shooting": "Shooting Technique",
    "ball_handling": "Ball Handling & Dribbling",
    "passing": "Passing & Court Vision",
    "conditioning": "Strength & Conditioning",
    "nutrition": "Sports Nutrition & Recovery",
    "youth": "Youth Development (Ages 5-12)",
    "player_development": "Player Development & Skills",
    "game_management": "Game Management & Coaching",
    "analytics": "Basketball Analytics & Statistics",
    "psychology": "Sports Psychology & Motivation",
    "team_building": "Team Building & Culture",
}

# Which RAG categories each COACH agent searches
AGENT_RAG_CATEGORIES = {
    "assistant_coach": ["general", "game_management", "team_building", "player_development"],
    "team_manager":    ["general", "game_management"],
    "tactician":       ["tactics", "offense", "defense", "general"],
    "skills_coach":    ["drills", "shooting", "ball_handling", "passing", "player_development"],
    "nutritionist":    ["nutrition"],
    "strength_coach":  ["conditioning"],
    "analyst":         ["analytics", "general"],
    "youth_coach":     ["youth", "drills", "general"],
}

# Which RAG categories each PLAYER agent searches
PLAYER_AGENT_RAG_CATEGORIES = {
    "shooting_coach":  ["shooting", "drills", "player_development"],
    "dribbling_coach": ["ball_handling", "drills", "player_development"],
    "passing_coach":   ["passing", "drills", "player_development"],
    "fitness_coach":   ["conditioning", "nutrition"],
    "nutritionist":    ["nutrition"],
}

# Filename prefix → category mapping (for seed_knowledge.py auto-detection)
FILENAME_CATEGORY_MAP = {
    "drills": "drills",
    "drill": "drills",
    "tactics": "tactics",
    "tactic": "tactics",
    "offense": "offense",
    "offensive": "offense",
    "defense": "defense",
    "defensive": "defense",
    "shooting": "shooting",
    "shot": "shooting",
    "dribble": "ball_handling",
    "dribbling": "ball_handling",
    "ball_handling": "ball_handling",
    "passing": "passing",
    "pass": "passing",
    "conditioning": "conditioning",
    "strength": "conditioning",
    "fitness": "conditioning",
    "nutrition": "nutrition",
    "diet": "nutrition",
    "youth": "youth",
    "kids": "youth",
    "development": "player_development",
    "skills": "player_development",
    "management": "game_management",
    "coaching": "game_management",
    "analytics": "analytics",
    "stats": "analytics",
    "psychology": "psychology",
    "mental": "psychology",
    "team_building": "team_building",
    "culture": "team_building",
}
