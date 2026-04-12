"""Generic async repository providing CRUD operations for SQLAlchemy 2.0 models."""

from datetime import datetime, timezone
from typing import Generic, Sequence, TypeVar
import uuid

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.base import Base

T = TypeVar("T", bound=Base)


class BaseRepository(Generic[T]):
    """CRUD repository — never mutates objects in-place; uses UPDATE statements."""

    def __init__(self, model: type[T], session: AsyncSession) -> None:
        self._model = model
        self._session = session

    async def get(self, id: str) -> T | None:
        result = await self._session.execute(
            select(self._model).where(self._model.id == id)  # type: ignore[attr-defined]
        )
        return result.scalar_one_or_none()

    async def list(self, **filters) -> Sequence[T]:
        stmt = select(self._model)
        for key, val in filters.items():
            stmt = stmt.where(getattr(self._model, key) == val)
        result = await self._session.execute(stmt)
        return result.scalars().all()

    async def create(self, **data) -> T:
        now = datetime.now(timezone.utc).isoformat()
        model_cols = {c.key for c in self._model.__table__.columns}  # type: ignore[attr-defined]
        auto: dict = {"id": str(uuid.uuid4())}
        if "created_at" in model_cols and "created_at" not in data:
            auto["created_at"] = now
        if "updated_at" in model_cols and "updated_at" not in data:
            auto["updated_at"] = now
        obj = self._model(**auto, **data)
        self._session.add(obj)
        await self._session.flush()
        await self._session.refresh(obj)
        return obj

    async def update(self, id: str, **data) -> T | None:
        # NEVER mutate in-place — use UPDATE statement
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await self._session.execute(
            update(self._model)  # type: ignore[arg-type]
            .where(self._model.id == id)  # type: ignore[attr-defined]
            .values(**data)
        )
        await self._session.flush()
        return await self.get(id)

    async def soft_delete(self, id: str) -> None:
        now = datetime.now(timezone.utc).isoformat()
        # Try archived pattern first (projects/alternatives), fall back to deleted
        model_cols = {c.key for c in self._model.__table__.columns}  # type: ignore[attr-defined]
        if "archived" in model_cols:
            await self.update(id, archived=1, archived_at=now)
        elif "deleted" in model_cols:
            await self.update(id, deleted=1, deleted_at=now)
