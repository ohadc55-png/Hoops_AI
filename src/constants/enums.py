"""HOOPS AI - Enumerations"""
from enum import Enum


class Difficulty(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class DrillCategory(str, Enum):
    OFFENSE = "offense"
    DEFENSE = "defense"
    SHOOTING = "shooting"
    BALL_HANDLING = "ball_handling"
    PASSING = "passing"
    CONDITIONING = "conditioning"
    WARMUP = "warmup"
    COOLDOWN = "cooldown"


class Position(str, Enum):
    PG = "PG"
    SG = "SG"
    SF = "SF"
    PF = "PF"
    C = "C"


class EventType(str, Enum):
    PRACTICE = "practice"
    GAME = "game"
    TOURNAMENT = "tournament"
    MEETING = "meeting"


class SegmentType(str, Enum):
    WARMUP = "warmup"
    DRILL = "drill"
    SCRIMMAGE = "scrimmage"
    COOLDOWN = "cooldown"
    BREAK = "break"
    FILM_STUDY = "film_study"


class AgeGroup(str, Enum):
    U8 = "U8"
    U10 = "U10"
    U12 = "U12"
    U14 = "U14"
    U16 = "U16"
    U18 = "U18"
    ADULT = "adult"
    SENIOR = "senior"


class CoachLevel(str, Enum):
    YOUTH = "youth"
    MIDDLE_SCHOOL = "middle_school"
    HIGH_SCHOOL = "high_school"
    COLLEGE = "college"
    SEMI_PRO = "semi_pro"
    PROFESSIONAL = "professional"
