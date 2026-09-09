#!/usr/bin/env python3
"""
i18n-extract.py — convert hardcoded UI strings in a Draw Advanced source file to
translation keys, and append the new keys to a translations default.ts.

Usage:
  python i18n-extract.py <file.tsx> <keyPrefix> <translations/default.ts> [options]

Options:
  --apply            write changes (default is a dry run that only reports)
  --call EXPR        translation call expression to emit (default: t)
                     functional components:  t          (wired via hooks.useTranslation)
                     measure.tsx:            props.nls
                     class components:       this.nls
  --wire hook|none   wire hooks.useTranslation into a functional component (default: hook
                     when --call is t, otherwise none)

Converts:
  attr='Text'                         → attr={CALL('key')}
  attr={cond ? 'A' : 'B'}             → attr={cond ? CALL('kA') : CALL('kB')}
  attr={`Text ${expr} more`}          → attr={CALL('key', { expr: expr })}   (ICU {expr})
  >Text<                              → >{CALL('key')}<
where attr is title | aria-label | placeholder | label | aria-description | alt.

Leaves alone (hand-convert, usually to ICU plurals): template literals containing
nested templates/ternaries, strings assigned in code (setState, announceStatus,
alert), and anything on a comment line or containing console.

Keys: <prefix> + CamelCase of the first five words, unique per default.ts.
Identical English text reuses one key.
"""
import io, re, sys

ATTRS = r"(title|aria-label|placeholder|label|aria-description|alt)"
ATTR_RE = re.compile(r"\b" + ATTRS + r"=(?:'([^'{}]{3,})'|\"([^\"{}]{3,})\")")
TERN_RE = re.compile(r"\b" + ATTRS + r"=\{([^{}?]+?)\?\s*'([^'{}`]{3,})'\s*:\s*'([^'{}`]{3,})'\s*\}")
TPL_RE  = re.compile(r"\b" + ATTRS + r"=\{`([^`]{3,})`\}")
TEXT_RE = re.compile(r">\s*([A-Z][A-Za-z0-9 ,.'&:()/\-]{2,}?)\s*<")

def keyify(prefix, text, used):
    words = re.sub(r"[^A-Za-z0-9 ]", " ", text).split()[:5]
    base = prefix + "".join(w.capitalize() for w in words) if words else prefix + "Str"
    key, n = base, 2
    while key in used:
        key, n = f"{base}{n}", n + 1
    used.add(key)
    return key

def ts_string(text):
    return "'" + text.replace("\\", "\\\\").replace("'", "\\'") + "'"

def main():
    argv = sys.argv[1:]
    # strip option flags and their values
    args, i = [], 0
    while i < len(argv):
        if argv[i] in ("--call", "--wire"): i += 2; continue
        if argv[i].startswith("--"): i += 1; continue
        args.append(argv[i]); i += 1
    if len(args) != 3:
        print(__doc__); sys.exit(1)
    comp, prefix, defaults = args
    apply = "--apply" in sys.argv
    call = "t"
    if "--call" in sys.argv: call = sys.argv[sys.argv.index("--call") + 1]
    wire = "hook" if call == "t" else "none"
    if "--wire" in sys.argv: wire = sys.argv[sys.argv.index("--wire") + 1]

    src = io.open(comp, encoding="utf-8").read()
    bom = src.startswith("\ufeff")
    if bom: src = src[1:]
    nl = "\r\n" if "\r\n" in src else "\n"
    lines = src.split(nl)

    dsrc = io.open(defaults, encoding="utf-8").read()
    existing = dict(re.findall(r"^\s*([A-Za-z0-9_]+):\s*'((?:[^'\\]|\\.)*)'", dsrc, re.M))
    used = set(existing.keys())
    text_to_key = {v.replace("\\'", "'"): k for k, v in existing.items()}
    new_keys, skipped = {}, []
    stats = {"attr": 0, "ternary": 0, "template": 0, "text": 0}

    def key_for(text):
        k = text_to_key.get(text)
        if not k:
            k = keyify(prefix, text, used); text_to_key[text] = k; new_keys[k] = text
        return k

    def ok_text(t):
        return re.search(r"[a-z]", t) and not t.startswith("http") and "{" not in t

    out = []
    for lineno, line in enumerate(lines, 1):
        if re.match(r"^\s*(//|/\*|\*)", line) or "console." in line:
            out.append(line); continue

        def attr_sub(m):
            text = m.group(2) or m.group(3)
            if not ok_text(text): return m.group(0)
            stats["attr"] += 1
            return f"{m.group(1)}={{{call}('{key_for(text)}')}}"

        def tern_sub(m):
            a, b = m.group(3), m.group(4)
            if not (ok_text(a) and ok_text(b)): return m.group(0)
            stats["ternary"] += 1
            return f"{m.group(1)}={{{m.group(2).strip()} ? {call}('{key_for(a)}') : {call}('{key_for(b)}')}}"

        def tpl_sub(m):
            body = m.group(2)
            parts = re.split(r"\$\{([^}]*)\}", body)
            # parts: text, expr, text, expr, ... ; bail on anything non-trivial inside ${}
            exprs = parts[1::2]
            if any(("?" in e) or ("`" in e) or ("'" in e) or ('"' in e) or ("{" in e) for e in exprs):
                skipped.append((lineno, "template", body[:80])); return m.group(0)
            names, values, icu, seen = [], [], "", set()
            for i, p in enumerate(parts):
                if i % 2 == 0: icu += p
                else:
                    e = p.strip()
                    nm = re.sub(r"[^A-Za-z0-9_]", "", e.split(".")[-1].split("(")[0]) or f"v{len(names)+1}"
                    base, n = nm, 2
                    while nm in seen: nm, n = f"{base}{n}", n + 1
                    seen.add(nm); names.append(nm); values.append(f"{nm}: {e}")
                    icu += "{" + nm + "}"
            text = icu.strip()
            if not re.search(r"[a-z]", text): return m.group(0)
            stats["template"] += 1
            k = key_for(text)
            return f"{m.group(1)}={{{call}('{k}', {{ {', '.join(values)} }})}}"

        def text_sub(m):
            text = m.group(1).strip()
            if len(text) < 3 or text.isupper(): return m.group(0)
            stats["text"] += 1
            return f">{{{call}('{key_for(text)}')}}<"

        line = ATTR_RE.sub(attr_sub, line)
        line = TERN_RE.sub(tern_sub, line)
        line = TPL_RE.sub(tpl_sub, line)
        line = TEXT_RE.sub(text_sub, line)
        out.append(line)

    total = sum(stats.values())
    print(f"{comp}: {total} replacements {stats}, {len(new_keys)} new keys, {len(skipped)} skipped templates")
    for ln, kind, snippet in skipped[:40]:
        print(f"  SKIP line {ln} ({kind}): {snippet}")
    if not apply:
        print("(dry run — add --apply to write)"); return

    result = nl.join(out)
    if wire == "hook" and "hooks.useTranslation" not in result:
        result = re.sub(r"import \{ React \} from 'jimu-core';?", "import { React, hooks } from 'jimu-core';", result, count=1)
        if "translations/default" not in result:
            result = re.sub(r"(import \{ React, hooks \} from 'jimu-core';?)",
                            r"\1" + nl + "import defaultMessages from '../translations/default';", result, count=1)
        m = re.search(r"(export const \w+(?:: React\.FC<[^>]*>)? = \([^)]*\)(?:: [A-Za-z.<>\[\] ]+)? => \{)", result)
        if m:
            result = result[:m.end()] + nl + "    const t = hooks.useTranslation(defaultMessages);" + result[m.end():]
        else:
            print("WARNING: could not locate component body; add `const t = hooks.useTranslation(defaultMessages)` by hand.")

    io.open(comp, "w", encoding="utf-8", newline="").write(("\ufeff" if bom else "") + result)

    if new_keys:
        dnl = "\r\n" if "\r\n" in dsrc else "\n"
        body = dsrc.rstrip(); assert body.endswith("}")
        body = body[:-1].rstrip()
        if not body.endswith(","): body += ","
        block = dnl.join(f"    {k}: {ts_string(v)}," for k, v in new_keys.items()).rstrip(",")
        io.open(defaults, "w", encoding="utf-8", newline="").write(body + dnl + block + dnl + "}" + dnl)
    print("applied.")

if __name__ == "__main__":
    main()
