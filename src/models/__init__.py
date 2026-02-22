"""HOOPS AI - Models Package"""
from src.models.coach import Coach
from src.models.conversation import Conversation
from src.models.message import Message
from src.models.drill import Drill
from src.models.practice_session import PracticeSession, SessionSegment
from src.models.play import Play
from src.models.event import Event
from src.models.facility import Facility
from src.models.player import Player
from src.models.attendance import Attendance
from src.models.game_report import GameReport
from src.models.player_report import PlayerReport
from src.models.user import User
from src.models.team import Team
from src.models.team_member import TeamMember
from src.models.admin_role import AdminRole
from src.models.team_event import TeamEvent
from src.models.schedule_request import ScheduleRequest
from src.models.club_message import ClubMessage
from src.models.message_recipient import MessageRecipient
from src.models.payment_plan import PaymentPlan
from src.models.installment import Installment
from src.models.one_time_charge import OneTimeCharge
from src.models.insight_report import InsightReport
from src.models.carpool_ride import CarpoolRide
from src.models.carpool_passenger import CarpoolPassenger
from src.models.standing_carpool import StandingCarpool, StandingCarpoolMember, StandingCarpoolSignup
from src.models.drill_assignment import DrillAssignment
from src.models.knowledge_document import KnowledgeDocument
from src.models.report_request import ReportRequest
from src.models.player_evaluation import PlayerEvaluation
from src.models.scouting_video import ScoutingVideo
from src.models.video_clip import VideoClip
from src.models.clip_player_tag import ClipPlayerTag
from src.models.video_annotation import VideoAnnotation
from src.models.clip_view import ClipView
from src.models.play_view import PlayView
from src.models.team_storage_quota import TeamStorageQuota
# Super Admin Platform models
from src.models.super_admin import SuperAdmin
from src.models.platform_club import PlatformClub, ClubRegistrationLink
from src.models.club_feature_flag import ClubFeatureFlag
from src.models.club_billing_config import ClubBillingConfig
from src.models.region import Region
from src.models.ai_usage_log import AIUsageLog
from src.models.platform_invoice import PlatformInvoice, PlatformInvoiceLineItem
from src.models.payment_transaction import PlatformPaymentTransaction
from src.models.support_ticket import SupportTicket, TicketMessage
from src.models.platform_notification import PlatformNotification

__all__ = [
    "Coach", "Conversation", "Message", "Drill",
    "PracticeSession", "SessionSegment", "Play",
    "Event", "Facility", "Player",
    "Attendance", "GameReport", "PlayerReport",
    "User", "Team", "TeamMember",
    "AdminRole", "TeamEvent", "ScheduleRequest",
    "ClubMessage", "MessageRecipient",
    "PaymentPlan", "Installment", "OneTimeCharge",
    "InsightReport",
    "CarpoolRide", "CarpoolPassenger",
    "StandingCarpool", "StandingCarpoolMember", "StandingCarpoolSignup",
    "DrillAssignment",
    "KnowledgeDocument",
    "ReportRequest", "PlayerEvaluation",
    "ScoutingVideo", "VideoClip", "ClipPlayerTag",
    "VideoAnnotation", "ClipView", "PlayView", "TeamStorageQuota",
    # Super Admin Platform
    "SuperAdmin", "PlatformClub", "ClubRegistrationLink",
    "ClubFeatureFlag", "ClubBillingConfig", "Region",
    "AIUsageLog",
    "PlatformInvoice", "PlatformInvoiceLineItem",
    "PlatformPaymentTransaction",
    "SupportTicket", "TicketMessage",
    "PlatformNotification",
]
