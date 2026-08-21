"""
Standard 10-point grading scale (percentage -> letter grade -> grade point),
the convention most Indian schools/colleges/universities use. Institutions
with a different scale are future work (a per-tenant configurable scale would
live on Institution, per docs/03-database-design.md §5.4) — this is a
sensible, documented default rather than a hardcoded assumption nobody can see.
"""

# Ordered highest-to-lowest; first threshold the percentage meets or exceeds wins.
GRADE_SCALE: list[tuple[float, str, float]] = [
    (90.0, "A+", 10.0),
    (80.0, "A", 9.0),
    (70.0, "B+", 8.0),
    (60.0, "B", 7.0),
    (50.0, "C", 6.0),
    (40.0, "D", 5.0),
    (0.0, "F", 0.0),
]


def compute_grade(marks_obtained: float, max_marks: int) -> tuple[str, float]:
    """Returns (letter_grade, grade_point) for a score out of max_marks."""
    if max_marks <= 0:
        return "F", 0.0
    percentage = (marks_obtained / max_marks) * 100
    for threshold, letter, point in GRADE_SCALE:
        if percentage >= threshold:
            return letter, point
    return "F", 0.0
