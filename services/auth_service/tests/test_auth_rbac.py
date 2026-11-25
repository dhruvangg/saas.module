import pytest
from src.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_token
)


def test_password_hashing():
    password = "SecretPassword@123"
    hashed = get_password_hash(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_jwt_token_claims():
    roles = ["Admin", "Production Manager"]
    permissions = ["user:read", "mes:order:create"]
    token = create_access_token(
        subject=101,
        email="test@mes.com",
        is_superuser=False,
        roles=roles,
        permissions=permissions
    )

    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "101"
    assert payload["email"] == "test@mes.com"
    assert payload["roles"] == roles
    assert payload["permissions"] == permissions
    assert payload["is_superuser"] is False
