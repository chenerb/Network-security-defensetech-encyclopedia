"""An offline, deny-by-default policy exercise; no actual tools execute.

`context` and `approval` MUST come from trusted server-side systems, never a
model, prompt or user-supplied JSON. A digest binds approval parameters; it
does not authenticate an approver or provide expiry/replay protection.
"""
import hashlib
import json


def valid_request(request):
    if not (isinstance(request, dict)
            and set(request) == {"action", "tenant", "resource"}
            and all(isinstance(value, str) and value.strip() for value in request.values())):
        return False
    try:
        for value in request.values():
            value.encode("utf-8")
    except UnicodeEncodeError:
        # JSON may decode an unpaired surrogate that cannot be a UTF-8 parameter.
        return False
    return True


def request_digest(request):
    """Hash canonical parameters; only call after schema validation."""
    encoded = json.dumps(request, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def authorize(context, request, approval=None):
    """Evaluate trusted identity against an untrusted request. No I/O occurs."""
    if not isinstance(context, dict) or not valid_request(request):
        return False
    if any(not isinstance(context.get(key), str) or not context[key].strip()
           for key in ("actor", "role", "tenant")):
        return False
    permissions = {"analyst": {"read"}, "operator": {"read", "update"}}
    if request["tenant"] != context["tenant"]:
        return False
    if request["action"] not in permissions.get(context["role"], set()):
        return False
    if request["action"] == "update":
        return (isinstance(approval, dict)
                and approval.get("actor") == context["actor"]
                and approval.get("request_digest") == request_digest(request))
    return True


def main():
    context = {"actor": "reader-1", "role": "analyst", "tenant": "team-a"}
    request = {"action": "read", "tenant": "team-a", "resource": "report-1"}
    print("本租户只读：", authorize(context, request))
    print("跨租户请求：", authorize(context, dict(request, tenant="team-b")))
    print("越权写入：", authorize(context, dict(request, action="update")))
    print("策略在模型外判断；本示例只计算许可，不执行工具。")


if __name__ == "__main__":
    main()
