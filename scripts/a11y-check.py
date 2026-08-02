#!/usr/bin/env python3
"""
FASC+ — validação automática de acessibilidade (estática + regras WCAG 2.1 AA)
Uso:
  python3 scripts/a11y-check.py index.html
  python3 scripts/a11y-check.py . --json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, asdict
from html.parser import HTMLParser
from pathlib import Path
from typing import List, Optional, Tuple


@dataclass
class Issue:
    level: str  # error | warn | info
    rule: str
    message: str
    where: str = ""


class DOMBuilder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.nodes: List[dict] = []
        self.stack: List[dict] = []
        self.order: List[dict] = []
        self.void = {
            "area","base","br","col","embed","hr","img","input","link","meta",
            "param","source","track","wbr"
        }

    def handle_starttag(self, tag, attrs):
        ad = dict(attrs)
        node = {"tag": tag.lower(), "attrs": ad, "children": [], "text": ""}
        self.order.append(node)
        if self.stack:
            self.stack[-1]["children"].append(node)
        else:
            self.nodes.append(node)
        if tag.lower() not in self.void:
            self.stack.append(node)

    def handle_endtag(self, tag):
        tag = tag.lower()
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i]["tag"] == tag:
                self.stack = self.stack[:i]
                break

    def handle_data(self, data):
        if self.stack:
            self.stack[-1]["text"] += data


def walk(nodes):
    for n in nodes:
        yield n
        yield from walk(n.get("children", []))


def text_of(node) -> str:
    parts = [node.get("text") or ""]
    for c in node.get("children", []):
        parts.append(text_of(c))
    return re.sub(r"\s+", " ", "".join(parts)).strip()


def accessible_name(node) -> str:
    a = node.get("attrs", {})
    for k in ("aria-label", "aria-labelledby", "title", "alt", "placeholder"):
        if a.get(k):
            return a.get(k, "").strip()
    return text_of(node)


def check(html: str, source: str) -> List[Issue]:
    issues: List[Issue] = []
    parser = DOMBuilder()
    try:
        parser.feed(html)
    except Exception as e:
        return [Issue("error", "parse", f"HTML inválido: {e}", source)]

    nodes = list(walk(parser.nodes))
    tags = [n["tag"] for n in nodes]

    # 1. lang
    html_el = next((n for n in nodes if n["tag"] == "html"), None)
    if not html_el or not html_el["attrs"].get("lang"):
        issues.append(Issue("error", "html-lang", "<html> sem atributo lang", source))
    elif len(html_el["attrs"].get("lang", "")) < 2:
        issues.append(Issue("error", "html-lang", "lang vazio ou inválido", source))

    # 2. title
    title = next((n for n in nodes if n["tag"] == "title"), None)
    if not title or not text_of(title):
        issues.append(Issue("error", "document-title", "Página sem <title>", source))

    # 3. viewport
    metas = [n for n in nodes if n["tag"] == "meta"]
    if not any("viewport" in (m["attrs"].get("name") or "") for m in metas):
        issues.append(Issue("warn", "viewport", "Meta viewport ausente (mobile/a11y zoom)", source))

    # 4. skip link
    skip = [
        n for n in nodes
        if n["tag"] == "a" and (
            "skip" in (n["attrs"].get("class") or "")
            or "conteúdo" in text_of(n).lower()
            or "conteudo" in text_of(n).lower()
            or (n["attrs"].get("href") or "").startswith("#conteudo")
        )
    ]
    if not skip:
        issues.append(Issue("error", "skip-link", "Skip link para o conteúdo principal ausente", source))

    # 5. main landmark
    mains = [n for n in nodes if n["tag"] == "main" or n["attrs"].get("role") == "main"]
    if not mains:
        issues.append(Issue("error", "landmark-main", "Landmark <main> ausente", source))
    elif len(mains) > 1:
        issues.append(Issue("warn", "landmark-main", f"Múltiplos <main> ({len(mains)})", source))

    # 6. headings
    headings = [n for n in nodes if re.fullmatch(r"h[1-6]", n["tag"])]
    if not headings:
        issues.append(Issue("warn", "heading-none", "Nenhum heading (h1–h6) encontrado", source))
    else:
        levels = [int(n["tag"][1]) for n in headings]
        if 1 not in levels:
            issues.append(Issue("warn", "heading-h1", "Página sem h1", source))
        prev = levels[0]
        for lv in levels[1:]:
            if lv > prev + 1:
                issues.append(Issue(
                    "warn", "heading-order",
                    f"Salto de heading h{prev} → h{lv}", source
                ))
                break
            prev = lv

    # 7. images alt
    for img in (n for n in nodes if n["tag"] == "img"):
        a = img["attrs"]
        if "alt" not in a:
            issues.append(Issue(
                "error", "img-alt",
                f"img sem alt (src={a.get('src','?')[:60]})", source
            ))
        elif a.get("alt", None) is None:
            issues.append(Issue("error", "img-alt", "img alt inválido", source))

    # 8. buttons / links name
    for n in nodes:
        if n["tag"] not in ("button", "a"):
            continue
        if n["tag"] == "a" and not n["attrs"].get("href"):
            continue
        name = accessible_name(n)
        if not name and n["attrs"].get("aria-hidden") != "true":
            issues.append(Issue(
                "error", "control-name",
                f"<{n['tag']}> interativo sem nome acessível"
                + (f" class={n['attrs'].get('class')}" if n['attrs'].get('class') else ""),
                source
            ))

    # 9. icon-only buttons should have aria-label
    for n in nodes:
        if n["tag"] != "button":
            continue
        if text_of(n):
            continue
        if not n["attrs"].get("aria-label") and not n["attrs"].get("aria-labelledby"):
            # has svg child only
            if any(c["tag"] == "svg" for c in n.get("children", [])):
                issues.append(Issue(
                    "error", "icon-button-label",
                    f"Botão só-ícone sem aria-label (class={n['attrs'].get('class','')})",
                    source
                ))

    # 10. duplicate ids
    ids = {}
    for n in nodes:
        i = n["attrs"].get("id")
        if not i:
            continue
        ids.setdefault(i, 0)
        ids[i] += 1
    for i, c in ids.items():
        if c > 1:
            issues.append(Issue("error", "duplicate-id", f"id duplicado: #{i} ({c}x)", source))

    # 11. tab pattern
    tablists = [n for n in nodes if n["attrs"].get("role") == "tablist"]
    for tl in tablists:
        tabs = [c for c in walk([tl]) if c["attrs"].get("role") == "tab"]
        if not tabs:
            issues.append(Issue("warn", "tabs", "tablist sem role=tab", source))
        selected = [t for t in tabs if t["attrs"].get("aria-selected") == "true"]
        if tabs and not selected:
            issues.append(Issue("warn", "tabs-selected", "Nenhum tab com aria-selected=true", source))

    # 12. forms labels
    for inp in (n for n in nodes if n["tag"] in ("input", "textarea", "select")):
        a = inp["attrs"]
        if a.get("type") in ("hidden", "submit", "button", "image"):
            continue
        if a.get("aria-label") or a.get("aria-labelledby") or a.get("title") or a.get("placeholder"):
            continue
        iid = a.get("id")
        has_label = False
        if iid:
            for lab in (x for x in nodes if x["tag"] == "label"):
                if lab["attrs"].get("for") == iid:
                    has_label = True
                    break
        if not has_label:
            issues.append(Issue(
                "warn", "form-label",
                f"<{inp['tag']}> type={a.get('type','text')} sem label associado",
                source
            ))

    # 13. positive tabindex
    for n in nodes:
        tb = n["attrs"].get("tabindex")
        if tb is None:
            continue
        try:
            if int(tb) > 0:
                issues.append(Issue(
                    "warn", "tabindex-positive",
                    f"tabindex positivo ({tb}) em <{n['tag']}> — evita armadilha de foco",
                    source
                ))
        except ValueError:
            pass

    # 14. a11y panel present (project-specific)
    if not any(n["attrs"].get("id") == "a11y-toggle" for n in nodes):
        issues.append(Issue("info", "a11y-widget", "Painel de acessibilidade (#a11y-toggle) não encontrado", source))

    # 15. map iframe/div needs name
    for n in nodes:
        if n["attrs"].get("id") == "map" or "leaflet" in (n["attrs"].get("class") or ""):
            if not n["attrs"].get("aria-label") and not n["attrs"].get("role"):
                issues.append(Issue(
                    "warn", "map-label",
                    "Container do mapa sem aria-label/role — leitores de tela precisam de nome",
                    source
                ))

    # 16. color contrast cannot fully static — info
    issues.append(Issue(
        "info", "contrast-manual",
        "Contraste de cor: validar com DevTools/axe no browser (alto contraste já tem modo a11y)",
        source
    ))

    return issues


def format_report(issues: List[Issue]) -> str:
    errors = [i for i in issues if i.level == "error"]
    warns = [i for i in issues if i.level == "warn"]
    infos = [i for i in issues if i.level == "info"]
    lines = []
    lines.append("FASC+ a11y-check")
    lines.append("=" * 48)
    for level, group in (("ERROR", errors), ("WARN", warns), ("INFO", infos)):
        if not group:
            continue
        lines.append(f"\n[{level}] {len(group)}")
        for i in group:
            loc = f" @ {i.where}" if i.where else ""
            lines.append(f"  · [{i.rule}] {i.message}{loc}")
    lines.append("\n" + "-" * 48)
    lines.append(f"Resumo: {len(errors)} errors · {len(warns)} warnings · {len(infos)} info")
    lines.append("Exit: " + ("FAIL" if errors else "PASS"))
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser(description="Validação automática de a11y FASC+")
    ap.add_argument("path", nargs="?", default="index.html")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()
    path = Path(args.path)
    files: List[Path] = []
    if path.is_dir():
        files = sorted(path.glob("*.html"))
    elif path.is_file():
        files = [path]
    else:
        print(f"Arquivo não encontrado: {path}", file=sys.stderr)
        sys.exit(2)

    all_issues: List[Issue] = []
    for f in files:
        all_issues.extend(check(f.read_text(encoding="utf-8", errors="replace"), str(f)))

    if args.json:
        print(json.dumps([asdict(i) for i in all_issues], ensure_ascii=False, indent=2))
    else:
        print(format_report(all_issues))

    sys.exit(1 if any(i.level == "error" for i in all_issues) else 0)


if __name__ == "__main__":
    main()
