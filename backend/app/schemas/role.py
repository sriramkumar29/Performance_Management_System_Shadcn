from pydantic import BaseModel, Field


class RoleBase(BaseModel):
    """Base schema for Role."""

    role_name: str = Field(..., min_length=2, max_length=50, description="Role name")


class RoleResponse(RoleBase):
    """Schema for Role response."""

    id: int = Field(..., description="Role ID")

    class Config:
        from_attributes = True
