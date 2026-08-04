from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require
from app.services import analytics_service

router = APIRouter()


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), _user=Depends(require("analytics.view"))) -> dict:
    return analytics_service.dashboard(db)


# Permission keys used by this router: analytics.view
