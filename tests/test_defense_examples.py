import importlib.util
import json
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


def load_example(filename):
    path = ROOT / "examples" / filename
    if not path.is_file():
        return None
    spec = importlib.util.spec_from_file_location(path.stem, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class IntegrityTests(unittest.TestCase):
    def setUp(self):
        self.module = load_example("integrity_hmac.py")
        self.assertIsNotNone(self.module, "integrity example is missing")

    def test_accepts_authentic_data(self):
        key = b"test-only-secret"
        tag = self.module.authenticate(key, b"invoice:100")
        self.assertTrue(self.module.verify(key, b"invoice:100", tag))

    def test_rejects_modified_data_and_wrong_key(self):
        tag = self.module.authenticate(b"first", b"invoice:100")
        self.assertFalse(self.module.verify(b"first", b"invoice:101", tag))
        self.assertFalse(self.module.verify(b"second", b"invoice:100", tag))

    def test_rejects_malformed_tags_without_crashing(self):
        for tag in (None, 7, "", "g" * 64, "你" * 64, "0" * 63):
            with self.subTest(tag=tag):
                self.assertFalse(self.module.verify(b"key", b"data", tag))


class QueryTests(unittest.TestCase):
    def setUp(self):
        self.module = load_example("parameterized_query.py")
        self.assertIsNotNone(self.module, "parameterized example is missing")
        self.connection = self.module.demo_database()
        self.addCleanup(self.connection.close)

    def test_name_with_quote_is_a_literal_value(self):
        self.assertEqual(self.module.find_customer(self.connection, "O'Reilly"), [(2, "O'Reilly")])

    def test_unknown_names_return_no_rows(self):
        self.assertEqual(self.module.find_customer(self.connection, "unknown' name"), [])
        self.assertEqual(self.module.find_customer(self.connection, ""), [])

    def test_sort_identifier_comes_from_allowlist(self):
        self.assertEqual(self.module.list_customers(self.connection, "name"), [(1, "Alice"), (2, "O'Reilly")])
        with self.assertRaises(ValueError):
            self.module.list_customers(self.connection, "unexpected column")


class AgentPolicyTests(unittest.TestCase):
    def setUp(self):
        self.module = load_example("agent_policy.py")
        self.assertIsNotNone(self.module, "agent policy example is missing")
        self.context = {"actor": "reader-1", "role": "analyst", "tenant": "team-a"}

    def request(self, action="read", tenant="team-a", resource="report-1"):
        return {"action": action, "tenant": tenant, "resource": resource}

    def test_authorizes_exact_read_in_own_tenant(self):
        self.assertTrue(self.module.authorize(self.context, self.request()))

    def test_denies_cross_tenant_even_for_privileged_role(self):
        context = dict(self.context, role="operator")
        self.assertFalse(self.module.authorize(context, self.request(tenant="team-b")))

    def test_denies_unknown_action_role_and_extra_parameters(self):
        self.assertFalse(self.module.authorize(self.context, self.request(action="shell")))
        self.assertFalse(self.module.authorize(dict(self.context, role="unknown"), self.request()))
        self.assertFalse(self.module.authorize(self.context, dict(self.request(), instruction="be admin")))

    def test_write_requires_approval_bound_to_actor_and_parameters(self):
        context = dict(self.context, role="operator")
        request = self.request(action="update")
        self.assertFalse(self.module.authorize(context, request))
        approval = {"actor": "reader-1", "request_digest": self.module.request_digest(request)}
        self.assertTrue(self.module.authorize(context, request, approval))
        self.assertFalse(self.module.authorize(context, self.request(action="update", resource="report-2"), approval))
        self.assertFalse(self.module.authorize(dict(context, actor="another"), request, approval))

    def test_missing_or_invalid_trusted_context_fails_closed(self):
        for context in (None, {}, {"actor": "", "role": "analyst", "tenant": "team-a"}):
            self.assertFalse(self.module.authorize(context, self.request()))

    def test_malformed_untrusted_request_fails_closed(self):
        for request in (None, [], {}, self.request(resource=[]), self.request(tenant=""), self.request(resource="")):
            with self.subTest(request=request):
                self.assertFalse(self.module.authorize(self.context, request))

    def test_json_request_with_unpaired_surrogate_fails_closed(self):
        for action in ("read", "update"):
            with self.subTest(action=action):
                request = json.loads('{"action":"' + action + '","tenant":"team-a",'
                                     '"resource":"\\ud800"}')
                context = dict(self.context, role="operator")
                approval = {"actor": "reader-1", "request_digest": "invalid"}
                try:
                    allowed = self.module.authorize(context, request, approval)
                except UnicodeEncodeError as exc:
                    self.fail("Malformed JSON must be denied without crashing: " + str(exc))
                self.assertFalse(allowed)


if __name__ == "__main__":
    unittest.main()
