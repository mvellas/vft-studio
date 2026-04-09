"""Pydantic v2 frozen schemas for Attribute and AttributeLevel CRUD."""

from typing import Optional
from pydantic import BaseModel, ConfigDict


class AttributeCreate(BaseModel):
    model_config = ConfigDict(frozen=True)

    objective_id: str
    attr_type: str  # "natural" | "constructed" | "proxy"
    description: str
    scale_description: str = ""


class AttributeUpdate(BaseModel):
    model_config = ConfigDict(frozen=True)

    attr_type: Optional[str] = None
    description: Optional[str] = None
    scale_description: Optional[str] = None
    prop_unambiguous: Optional[int] = None
    prop_comprehensive: Optional[int] = None
    prop_direct: Optional[int] = None
    prop_operational: Optional[int] = None
    prop_understandable: Optional[int] = None


class AttributeResponse(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)

    id: str
    objective_id: str
    project_id: str
    attr_type: str
    description: str
    scale_description: str
    prop_unambiguous: int
    prop_comprehensive: int
    prop_direct: int
    prop_operational: int
    prop_understandable: int
    created_at: str
    updated_at: str


class AttributeLevelCreate(BaseModel):
    model_config = ConfigDict(frozen=True)

    label: str
    description: str = ""
    order_index: int


class AttributeLevelUpdate(BaseModel):
    model_config = ConfigDict(frozen=True)

    label: Optional[str] = None
    description: Optional[str] = None
    order_index: Optional[int] = None


class AttributeLevelResponse(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)

    id: str
    attribute_id: str
    label: str
    description: str
    order_index: int
    created_at: str


class AttributeWithLevelsResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    attribute: AttributeResponse
    levels: list[AttributeLevelResponse]
