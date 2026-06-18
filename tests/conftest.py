import asyncio

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.app import app
from backend.db.base import Base, get_session

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture
def client():
    test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async def _init():
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(_init())

    async def override_get_session():
        async with TestSessionLocal() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c

    app.dependency_overrides.clear()
    loop.run_until_complete(test_engine.dispose())
    loop.close()
