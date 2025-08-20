import asyncio
from sqlalchemy import select
from app.db.database import async_session, engine, Base
from app.models.appraisal_type import AppraisalType, AppraisalRange
# IMPORTANT: import all model modules so SQLAlchemy registers every mapper
# before Base.metadata.create_all or any relationship configuration.
import app.models.appraisal  # noqa: F401
import app.models.employee  # noqa: F401
import app.models.goal  # noqa: F401

# Desired seed data
APPRAISAL_TYPES = [
    {
        "name": "Annual",
        "has_range": False,
        "ranges": [],
    },
    {
        "name": "Half-yearly",
        "has_range": True,
        "ranges": [
            {"name": "1st", "start_month_offset": 0, "end_month_offset": 5},   # Jan-Jun
            {"name": "2nd", "start_month_offset": 6, "end_month_offset": 11},  # Jul-Dec
        ],
    },
    {
        "name": "Quarterly",
        "has_range": True,
        "ranges": [
            {"name": "1st", "start_month_offset": 0, "end_month_offset": 2},   # Jan-Mar
            {"name": "2nd", "start_month_offset": 3, "end_month_offset": 5},   # Apr-Jun
            {"name": "3rd", "start_month_offset": 6, "end_month_offset": 8},   # Jul-Sep
            {"name": "4th", "start_month_offset": 9, "end_month_offset": 11},  # Oct-Dec
        ],
    },
    {
        "name": "Project-end",
        "has_range": False,
        "ranges": [],
    },
    {
        "name": "Tri-annual",
        "has_range": True,
        "ranges": [
            {"name": "1st", "start_month_offset": 0, "end_month_offset": 3},   # Jan-Apr
            {"name": "2nd", "start_month_offset": 4, "end_month_offset": 7},   # May-Aug
            {"name": "3rd", "start_month_offset": 8, "end_month_offset": 11},  # Sep-Dec
        ],
    },
    {
        "name": "Annual-Probation",
        "has_range": False,
        "ranges": [],
    },
]


async def seed_appraisal_types_and_ranges() -> None:
    """Idempotently seed appraisal types and their ranges."""
    # Ensure tables exist (safe to call repeatedly)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        async with session.begin():
            print("Seeding appraisal types and ranges...")
            for t in APPRAISAL_TYPES:
                # Upsert appraisal type by name
                result = await session.execute(
                    select(AppraisalType).where(AppraisalType.name == t["name"])
                )
                at: AppraisalType | None = result.scalar_one_or_none()

                if at is None:
                    at = AppraisalType(name=t["name"], has_range=t["has_range"]) 
                    session.add(at)
                    await session.flush()  # get ID
                    print(f"Created type: {t['name']}")
                else:
                    # Update has_range if changed
                    if at.has_range != t["has_range"]:
                        at.has_range = t["has_range"]
                        print(f"Updated has_range for: {t['name']} -> {t['has_range']}")

                # Upsert ranges for this type
                for r in t["ranges"]:
                    r_result = await session.execute(
                        select(AppraisalRange).where(
                            (AppraisalRange.appraisal_type_id == at.id)
                            & (AppraisalRange.name == r["name"]) 
                        )
                    )
                    ar: AppraisalRange | None = r_result.scalar_one_or_none()
                    if ar is None:
                        ar = AppraisalRange(
                            appraisal_type_id=at.id,
                            name=r["name"],
                            start_month_offset=r["start_month_offset"],
                            end_month_offset=r["end_month_offset"],
                        )
                        session.add(ar)
                        print(f"  + Added range for {t['name']}: {r['name']}")
                    else:
                        # Update offsets if different
                        updated = False
                        if ar.start_month_offset != r["start_month_offset"]:
                            ar.start_month_offset = r["start_month_offset"]
                            updated = True
                        if ar.end_month_offset != r["end_month_offset"]:
                            ar.end_month_offset = r["end_month_offset"]
                            updated = True
                        if updated:
                            print(
                                f"  ~ Updated offsets for {t['name']} - {r['name']}: "
                                f"start={ar.start_month_offset}, end={ar.end_month_offset}"
                            )
            print("Seeding complete.")


if __name__ == "__main__":
    asyncio.run(seed_appraisal_types_and_ranges())
