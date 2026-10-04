"""Exercise the checker as a reader/CI would, using independent fixtures."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "check_content.py"


class ContentCheckTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def write(self, path, text):
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding="utf-8")

    def check(self, exit_code):
        result = subprocess.run(
            [sys.executable, str(SCRIPT), "--root", str(self.root), "--json"],
            capture_output=True, text=True, check=False,
        )
        self.assertEqual(result.returncode, exit_code, result.stderr + result.stdout)
        self.assertEqual(result.stderr, "", result.stderr)
        return json.loads(result.stdout)

    def test_reports_missing_local_target_with_source_line(self):
        self.write("README.md", "# Intro\n\n[read](missing.md)\n")
        errors = self.check(1)["errors"]
        self.assertTrue(any(e["line"] == 3 and "missing.md" in e["message"] for e in errors))

    def test_checks_chinese_anchor_and_duplicate_heading_suffix(self):
        self.write("README.md", "# Intro\n[read](target.md#安全原理-1)\n")
        self.write("target.md", "# 安全原理\n## 安全原理\n")
        self.assertEqual(self.check(0)["errors"], [])

    def test_duplicate_heading_suffix_cannot_reuse_an_existing_anchor(self):
        self.write("README.md", "# Intro\n[one](first.md#foo-2)\n[two](second.md#foo-1-1)\n")
        self.write("first.md", "## Foo\n## Foo-1\n## Foo\n")
        self.write("second.md", "## Foo\n## Foo\n## Foo-1\n")
        self.assertEqual(self.check(0)["errors"], [])

    def test_reports_missing_anchor(self):
        self.write("README.md", "# Intro\n[read](target.md#gone)\n")
        self.write("target.md", "# Present\n")
        self.assertTrue(any("gone" in e["message"] for e in self.check(1)["errors"]))

    def test_anchor_keeps_inline_code_heading_text_but_ignores_code_links(self):
        self.write("README.md", "# Intro\n[read](target.md#foo-参数)\n")
        self.write("target.md", "## `foo` 参数\n`[example](absent.md)`\n")
        self.assertEqual(self.check(0)["errors"], [])

    def test_anchor_cannot_drop_inline_code_heading_text(self):
        self.write("README.md", "# Intro\n[read](target.md#参数)\n")
        self.write("target.md", "## `foo` 参数\n")
        errors = self.check(1)["errors"]
        self.assertTrue(any("#参数" in e["message"] for e in errors))

    def test_ignores_fenced_and_inline_code_examples(self):
        self.write("README.md", "# Intro\n````markdown\n[example](absent.md)\n```\n````\n`[also](absent.md)`\n")
        self.assertEqual(self.check(0)["errors"], [])

    def test_supports_angle_paths_encoded_paths_and_images(self):
        self.write("README.md", "# Intro\n[one](<my file.md#标题>)\n[two](my%20file.md#%E6%A0%87%E9%A2%98)\n![diagram](pic.svg)\n")
        self.write("my file.md", "# 标题\n")
        self.write("pic.svg", "<svg/>")
        self.assertEqual(self.check(0)["errors"], [])

    def test_angle_path_titles_are_not_part_of_the_local_destination(self):
        self.write("README.md", '# Intro\n[read](<my file.md#标题> "Guide")\n'
                   "![diagram](<pic.svg> 'Figure')\n")
        self.write("my file.md", "# 标题\n")
        self.write("pic.svg", "<svg/>")
        self.assertEqual(self.check(0)["errors"], [])

    def test_reference_links_checked_but_template_in_code_ignored(self):
        self.write("README.md", "# Intro\n[read][guide]\n\n[guide]: absent.md\n")
        self.assertTrue(any("absent.md" in e["message"] for e in self.check(1)["errors"]))

    def test_external_urls_do_not_trigger_network_access(self):
        self.write("README.md", "# Intro\n[web](https://example.invalid/nope)\n[mail](mailto:nobody@example.invalid)\n")
        self.assertEqual(self.check(0)["errors"], [])

    def test_malformed_url_is_reported_without_stopping_other_link_checks(self):
        self.write("README.md", "# Intro\n\n[web](https://[broken)\n[read](missing.md)\n")
        errors = self.check(1)["errors"]
        self.assertTrue(any(e["line"] == 3 and "https://[broken" in e["message"] for e in errors))
        self.assertTrue(any(e["line"] == 4 and "missing.md" in e["message"] for e in errors))

    def test_rejects_local_path_escaping_repository(self):
        self.write("README.md", "# Intro\n[escape](../outside.md)\n")
        self.assertTrue(any("仓库" in e["message"] for e in self.check(1)["errors"]))

    def test_root_relative_path_uses_repository_root_from_nested_document(self):
        self.write("README.md", "# Intro\n")
        self.write("notes/guide.md", "# Guide\n[return](/README.md#intro)\n")
        self.assertEqual(self.check(0)["errors"], [])

    def test_reports_unclosed_fence(self):
        self.write("README.md", "# Intro\n```python\nprint('unfinished')\n")
        self.assertTrue(any("代码块" in e["message"] for e in self.check(1)["errors"]))

    def test_reports_missing_exam_partner(self):
        self.write("exams/01-introduction/sample-题目.md", "# Test\n### 1. Why?\n")
        self.assertTrue(any("配对" in e["message"] for e in self.check(1)["errors"]))

    def test_reports_different_question_numbers(self):
        self.write("exams/01-introduction/sample-题目.md", "# Test\n### 1. Why?\n### 2. What?\n")
        self.write("exams/01-introduction/sample-答案解析.md", "# Answers\n## 考点分布表\n### 1. Because\n")
        self.assertTrue(any("编号" in e["message"] for e in self.check(1)["errors"]))

    def test_detects_missing_curriculum_article(self):
        self.write("SUMMARY.md", "# Index\n* [Crypto](docs/02-cryptography/01-missing.md)\n")
        errors = self.check(1)["errors"]
        self.assertTrue(any("01-missing.md" in e["message"] for e in errors))

    def test_reports_lesson_without_teaching_sections(self):
        self.write("docs/02-cryptography/01-example.md", "# Example\nOnly a placeholder\n")
        self.assertTrue(any("费曼自测" in e["message"] for e in self.check(1)["errors"]))

    def test_resources_also_require_section_and_chapter_exams(self):
        self.write("docs/10-resources/01-books.md", "# Books\nGuide\n")
        errors = self.check(1)["errors"]
        self.assertTrue(any("配套小测" in e["message"] for e in errors))
        self.assertTrue(any("本章缺少试卷" in e["message"] for e in errors))


if __name__ == "__main__":
    unittest.main()
