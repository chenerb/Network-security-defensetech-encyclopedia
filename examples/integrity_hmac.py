"""Offline HMAC-SHA256 demonstration; all data and keys are synthetic."""
import hashlib
import hmac
import re
import secrets


def authenticate(key, data):
    """Return a MAC; key must be secret and shared only with trusted verifiers."""
    return hmac.new(key, data, hashlib.sha256).hexdigest()


def verify(key, data, tag):
    """Reject malformed or unauthentic tags before trusting the data."""
    if not isinstance(tag, str) or not re.fullmatch(r"[0-9a-f]{64}", tag):
        return False
    return hmac.compare_digest(authenticate(key, data), tag)


def main():
    key = secrets.token_bytes(32)
    data = b"invoice:100"
    tag = authenticate(key, data)
    print("原始消息验证：", verify(key, data, tag))
    print("修改消息验证：", verify(key, b"invoice:101", tag))
    print("HMAC 保证消息认证与完整性；它不加密，也不能提供公开可验证的签名。")


if __name__ == "__main__":
    main()
