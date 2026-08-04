from fastapi import APIRouter

from app.routers import (
    analytics,
    audit,
    auth,
    inquiries,
    media,
    properties,
    property_requests,
    roles,
    settings,
    taxonomy,
    users,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(roles.router, prefix="/roles", tags=["roles"])
api_router.include_router(taxonomy.areas_router, prefix="/areas", tags=["taxonomy"])
api_router.include_router(taxonomy.property_types_router, prefix="/property-types", tags=["taxonomy"])
api_router.include_router(taxonomy.amenities_router, prefix="/amenities", tags=["taxonomy"])
api_router.include_router(properties.router, prefix="/properties", tags=["properties"])
api_router.include_router(inquiries.router, prefix="/inquiries", tags=["inquiries"])
api_router.include_router(property_requests.router, prefix="/property-requests", tags=["property-requests"])
api_router.include_router(media.router, prefix="/media", tags=["media"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
