import io
import csv
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Response, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..models.reading import WaterReading
from ..models.household import Household
from ..schemas.reading import WaterReadingOut, WaterReadingCreate, ManualDialEntry
from ..auth.deps import get_current_user

router = APIRouter(prefix="/readings", tags=["Water Readings"])

@router.get("", response_model=List[WaterReadingOut])
def get_readings(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    provenance: Optional[str] = None, # measured, user_entered, simulated, predicted
    limit: int = Query(200, ge=1, le=2000),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(WaterReading).filter(WaterReading.household_id == current_user.household_id)
    
    if provenance:
        query = query.filter(WaterReading.provenance == provenance)
        
    if start_date:
        try:
            st = datetime.datetime.fromisoformat(start_date.replace("Z", ""))
            query = query.filter(WaterReading.timestamp >= st)
        except ValueError:
            pass
            
    if end_date:
        try:
            et = datetime.datetime.fromisoformat(end_date.replace("Z", ""))
            query = query.filter(WaterReading.timestamp <= et)
        except ValueError:
            pass

    return query.sort_values(WaterReading.timestamp.desc()) if hasattr(query, "sort_values") else query.order_by(WaterReading.timestamp.desc()).limit(limit).all()

@router.post("/manual", response_model=WaterReadingOut)
def log_manual_reading(
    payload: ManualDialEntry,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Homeowner logs a manual meter dial reading from their physical water utility dial.
    Strictly assigned 'user_entered' provenance.
    """
    # Calculate differential consumption if previous reading exists
    last_reading = (
        db.query(WaterReading)
        .filter(WaterReading.household_id == current_user.household_id)
        .filter(WaterReading.meter_dial_reading != None)
        .order_by(WaterReading.timestamp.desc())
        .first()
    )

    diff_liters = 320.0 # Default reasonable day usage
    if last_reading and last_reading.meter_dial_reading is not None:
        if payload.meter_dial_reading >= last_reading.meter_dial_reading:
            # If dial is in cubic meters, convert to Liters if difference is small, else take direct
            delta = payload.meter_dial_reading - last_reading.meter_dial_reading
            diff_liters = delta * 1000.0 if delta < 50.0 else delta
        else:
            diff_liters = 250.0

    reading = WaterReading(
        household_id=current_user.household_id,
        timestamp=payload.timestamp,
        consumption_liters=round(diff_liters, 1),
        provenance="user_entered",
        reading_type="manual_dial",
        meter_dial_reading=payload.meter_dial_reading,
        temperature_c=22.0,
        notes=payload.notes or "Manual user dial verification",
        end_use_category="general"
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)
    return reading

@router.post("/simulate", response_model=WaterReadingOut)
def simulate_smart_meter_reading(
    consumption_liters: float = Query(..., ge=0.0),
    end_use_category: str = Query("general"),
    is_anomaly: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Simulates a real-time smart meter reading payload ('simulated' provenance)."""
    reading = WaterReading(
        household_id=current_user.household_id,
        timestamp=datetime.datetime.utcnow(),
        consumption_liters=consumption_liters,
        provenance="simulated",
        reading_type="hourly",
        temperature_c=24.5,
        end_use_category=end_use_category,
        is_anomaly=is_anomaly,
        anomaly_score=0.92 if is_anomaly else 0.05,
        notes="Simulator telemetry stream"
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)
    return reading

@router.get("/export-csv")
def export_readings_csv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    readings = (
        db.query(WaterReading)
        .filter(WaterReading.household_id == current_user.household_id)
        .order_by(WaterReading.timestamp.desc())
        .limit(1000)
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id", "timestamp", "consumption_liters", "provenance", 
        "reading_type", "end_use_category", "temperature_c", "is_anomaly", "notes"
    ])

    for r in readings:
        writer.writerow([
            r.id,
            r.timestamp.isoformat(),
            r.consumption_liters,
            r.provenance,
            r.reading_type,
            r.end_use_category,
            r.temperature_c,
            r.is_anomaly,
            r.notes or ""
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=aquapulse_readings_hh_{current_user.household_id}.csv"}
    )

@router.post("/import-csv")
async def import_readings_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith((".csv", ".txt")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV format."
        )

    content = await file.read()
    try:
        decoded = content.decode("utf-8-sig")
    except Exception:
        decoded = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(decoded))
    imported_count = 0

    for row in reader:
        try:
            ts_str = row.get("timestamp") or row.get("date")
            ts = datetime.datetime.fromisoformat(ts_str.replace("Z", "")) if ts_str else datetime.datetime.utcnow()
            liters = float(row.get("consumption_liters") or row.get("liters") or row.get("usage") or 0.0)
            provenance = row.get("provenance") or "user_entered"
            category = row.get("end_use_category") or "general"

            reading = WaterReading(
                household_id=current_user.household_id,
                timestamp=ts,
                consumption_liters=max(liters, 0.0),
                provenance=provenance,
                reading_type="imported_log",
                end_use_category=category,
                notes="Imported via CSV file"
            )
            db.add(reading)
            imported_count += 1
        except Exception:
            continue

    db.commit()
    return {
        "success": True,
        "imported_records": imported_count,
        "message": f"Successfully imported {imported_count} water reading records."
    }

