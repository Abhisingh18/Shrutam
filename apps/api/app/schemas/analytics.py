from pydantic import BaseModel


class AnalyticsSummary(BaseModel):
    total_students: int
    active_students: int
    total_faculty: int
    pending_admissions: int
    todays_attendance_present: int
    todays_attendance_total: int
    upcoming_exams: int
    pending_invoices_count: int
    pending_invoices_amount: str
    total_revenue_collected: str
