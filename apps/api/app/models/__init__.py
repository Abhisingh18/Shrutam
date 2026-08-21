from app.core.db import Base
from app.models.academics import Department, Program, Section, Semester, Subject
from app.models.attendance import AttendanceRecord
from app.models.auth import AuditLog, Permission, Role, RolePermission, User, UserRole, UserSession
from app.models.communication import Announcement
from app.models.documents import Document
from app.models.examination import Exam, ExamMark
from app.models.faculty import Faculty
from app.models.finance import FeeStructure, Invoice, Payment
from app.models.hostel import Hostel, Room, RoomAllocation
from app.models.hr import Employee, LeaveRequest
from app.models.library import Book, BookIssue
from app.models.notification import Notification
from app.models.student import Admission, Guardian, Student, StudentGuardian
from app.models.tenancy import AcademicYear, Campus, Institution, Tenant
from app.models.timetable import TimetableSlot
from app.models.transport import Route, TransportPass, Vehicle

__all__ = [
    "Base",
    "Tenant",
    "Institution",
    "Campus",
    "AcademicYear",
    "Role",
    "Permission",
    "RolePermission",
    "User",
    "UserRole",
    "UserSession",
    "AuditLog",
    "Admission",
    "Student",
    "Guardian",
    "StudentGuardian",
    "Department",
    "Program",
    "Subject",
    "Semester",
    "Section",
    "Faculty",
    "AttendanceRecord",
    "Exam",
    "ExamMark",
    "FeeStructure",
    "Invoice",
    "Payment",
    "Book",
    "BookIssue",
    "Hostel",
    "Room",
    "RoomAllocation",
    "Vehicle",
    "Route",
    "TransportPass",
    "Employee",
    "LeaveRequest",
    "Announcement",
    "Document",
    "TimetableSlot",
    "Notification",
]
