#!/usr/bin/env python3
"""Offline Markdown curriculum checks. No third-party packages or network calls."""
import argparse
from collections import Counter
import html
import json
import os
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit


INLINE_LINK = re.compile(r"!?\[[^\]\n]*\]\(\s*(<[^>\n]+>|[^)\n]+)\s*\)")
REFERENCE_DEF = re.compile(r"^\s{0,3}\[([^\]]+)\]:\s*(<[^>]+>|\S+)", re.M)
REFERENCE_USE = re.compile(r"!?\[([^\]\n]+)\]\[([^\]\n]*)\]")
QUESTION = re.compile(r"^(?:#{2,4}\s+(?:Q)?(\d+)[.．、]|\*\*(\d+)[.．、]\*\*)", re.M)
LESSON_DIR = re.compile(r"^0[1-9]-")
SECTIONS = ("概述", "历史背景", "核心原理", "通俗解释", "寓言故事", "防御",
            "优缺点", "应用场景", "实践建议", "费曼自测", "总结", "参考文献", "相关链接")


def visible_markdown(source, mask_inline=True):
    """Mask fences; optionally mask code spans for link checks, not headings."""
    lines = []
    fence = None
    opened_at = None
    for number, line in enumerate(source.splitlines(), 1):
        marker = re.match(r"^\s{0,3}(`{3,}|~{3,})(.*)$", line)
        if fence:
            if marker and marker[1][0] == fence[0] and len(marker[1]) >= len(fence) and not marker[2].strip():
                fence = None
            lines.append("")
        elif marker:
            fence = marker[1]
            opened_at = number
            lines.append("")
        else:
            lines.append(re.sub(r"(`+).*?\1", "", line) if mask_inline else line)
    return "\n".join(lines), opened_at if fence else None


def heading_ids(source):
    counts = Counter()
    anchors = set()
    for heading in re.findall(r"^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$", source, re.M):
        heading = re.sub(r"!?\[([^\]]+)\]\([^)]*\)", r"\1", heading)
        heading = re.sub(r"<[^>]*>", "", html.unescape(heading))
        slug = re.sub(r"[^\w\-\s]", "", heading.lower()).replace(" ", "-")
        number = counts[slug]
        anchor = slug if not number else "{}-{}".format(slug, number)
        while anchor in anchors:
            number += 1
            anchor = "{}-{}".format(slug, number)
        counts[slug] = number + 1
        anchors.add(anchor)
    return anchors


def links(source):
    definitions = {m[1].strip().casefold(): m[2] for m in REFERENCE_DEF.finditer(source)}
    found = [(m.start(), m[1]) for m in INLINE_LINK.finditer(source)]
    for match in REFERENCE_USE.finditer(source):
        key = (match[2] or match[1]).strip().casefold()
        found.append((match.start(), definitions.get(key, "missing-reference:" + key)))
    return found


def question_numbers(source):
    return [int(a or b) for a, b in QUESTION.findall(source)]


def check_repository(root):
    root = root.resolve()
    errors = []
    sources = {}
    heading_sources = {}
    def report(path, line, message):
        errors.append({"path": str(path.relative_to(root)), "line": line, "message": message})

    paths = []
    generated = {("website", "public", "content"), ("website", "src", "generated")}
    excluded = {"node_modules", "vendor", "dist", "test-results", "playwright-report"}
    for directory, subdirs, filenames in os.walk(root):
        parent = Path(directory)
        subdirs[:] = [name for name in subdirs
                      if not name.startswith(".") and name not in excluded
                      and (parent / name).relative_to(root).parts not in generated]
        paths.extend(parent / name for name in filenames if name.endswith(".md"))
    paths.sort()
    for path in paths:
        source = path.read_text(encoding="utf-8")
        visible, unclosed = visible_markdown(source)
        sources[path] = visible
        heading_sources[path] = visible_markdown(source, mask_inline=False)[0]
        if unclosed:
            report(path, unclosed, "代码块未闭合")
    for path, source in sources.items():
        for offset, raw in links(source):
            line = source.count("\n", 0, offset) + 1
            raw = raw.strip()
            target = (raw[1:raw.index(">")] if raw.startswith("<") and ">" in raw
                      else re.split(r'\s+[\"\']', raw, 1)[0])
            if target.startswith("missing-reference:"):
                report(path, line, "链接引用未定义：" + target.split(":", 1)[1])
                continue
            try:
                parsed = urlsplit(target)
            except ValueError as exc:
                report(path, line, "链接 URL 无效：{}（{}）".format(target, exc))
                continue
            if parsed.scheme or parsed.netloc:
                continue
            if not target:
                report(path, line, "链接目标为空")
                continue
            local_path = unquote(parsed.path)
            if local_path.startswith("/"):
                destination = (root / local_path.lstrip("/")).resolve()
            else:
                destination = (path.parent / local_path).resolve() if local_path else path
            try:
                destination.relative_to(root)
            except ValueError:
                report(path, line, "本地链接越出仓库：" + target)
                continue
            if not destination.exists():
                report(path, line, "本地链接目标不存在：" + target)
            elif parsed.fragment and destination.suffix.lower() == ".md":
                headings = heading_ids(heading_sources.get(destination, visible_markdown(
                    destination.read_text(encoding="utf-8"), mask_inline=False)[0]))
                if unquote(parsed.fragment) not in headings:
                    report(path, line, "本地锚点不存在：" + target)

    lessons = [p for p in paths if p.parent.parent == root / "docs" and LESSON_DIR.match(p.parent.name)]
    articles = [p for p in paths if p.parent.parent == root / "docs" and re.match(r"^\d{2}-", p.parent.name)]
    for path in lessons:
        source = sources[path]
        headings = re.findall(r"^#{2,4}\s+(.+)$", source, re.M)
        for section in SECTIONS:
            if not any(section in heading for heading in headings):
                report(path, 1, "正文缺少教学模块：" + section)
        if len(re.findall(r"[\u4e00-\u9fff]", source)) < 600:
            report(path, 1, "正文实质内容不足（少于 600 个汉字）")
    for path in articles:
        expected = root / "exams" / path.parent.name / (path.stem + "-题目.md")
        if not expected.is_file():
            report(path, 1, "正文缺少配套小测：" + str(expected.relative_to(root)))

    questions = [p for p in paths if "exams" in p.relative_to(root).parts and p.name.endswith("-题目.md")]
    answers = [p for p in paths if "exams" in p.relative_to(root).parts and p.name.endswith("-答案解析.md")]
    for path in questions:
        partner = path.with_name(path.name.replace("-题目.md", "-答案解析.md"))
        if partner not in sources:
            report(path, 1, "试卷缺少配对答案解析")
            continue
        numbers = question_numbers(sources[path])
        answer_numbers = question_numbers(sources[partner])
        if not numbers or numbers != list(range(1, len(numbers) + 1)) or numbers != answer_numbers:
            report(path, 1, "题目与解析编号不连续或不对应：{} / {}".format(numbers, answer_numbers))
        stem = path.name.removesuffix("-题目.md")
        low, high = {"章节测验": (15, 18), "挑战卷": (8, 10), "压力面": (10, 12)}.get(stem, (8, 10))
        if not low <= len(numbers) <= high:
            report(path, 1, "试卷题量应为 {}–{}，实际 {}".format(low, high, len(numbers)))
        if "考点分布表" not in sources[partner]:
            report(partner, 1, "解析缺少考点分布表")
    for path in answers:
        partner = path.with_name(path.name.replace("-答案解析.md", "-题目.md"))
        if partner not in sources:
            report(path, 1, "答案解析缺少配对题目")
    for directory in sorted({p.parent for p in articles}):
        for stem in ("章节测验", "挑战卷", "压力面"):
            expected = root / "exams" / directory.name / (stem + "-题目.md")
            if not expected.is_file():
                report(next(p for p in articles if p.parent == directory), 1, "本章缺少试卷：" + stem)
    return {"markdown_files": len(paths), "articles": len(articles), "exam_sets": len(questions), "errors": errors}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--json", action="store_true", help="emit machine-readable results")
    args = parser.parse_args()
    if not args.root.is_dir():
        parser.error("--root must name an existing directory")
    result = check_repository(args.root)
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        for issue in result["errors"]:
            print("{path}:{line}: {message}".format(**issue))
        print("检查 {} 个 Markdown 文件、{} 篇正文、{} 套试卷：{} 个错误".format(
            result["markdown_files"], result["articles"], result["exam_sets"], len(result["errors"])))
    return int(bool(result["errors"]))


if __name__ == "__main__":
    sys.exit(main())
