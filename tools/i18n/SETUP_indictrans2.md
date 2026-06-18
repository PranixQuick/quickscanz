# QuickScanZ — Self-hosted translation setup (IndicTrans2)

This generates the 6-language dictionary (`lib/i18n/messages.json`) from one
English source file (`catalog_en.json`) using AI4Bharat's **IndicTrans2** —
open-source, MIT-licensed, runs locally. No API keys, no per-word cost.

**Where to run:** the Toshiba laptop is fine for the one-off batch (CPU, distilled
model). Use the Oracle always-free worker later only if you want it always-on.

---

## 1. One-time setup

```bash
# In the i18n-tooling folder:
python3 -m venv venv

# activate it:
#   macOS/Linux:   source venv/bin/activate
#   Windows (PowerShell):   venv\Scripts\Activate.ps1

pip install --upgrade pip
pip install torch transformers sentencepiece
pip install git+https://github.com/VarunGumma/IndicTransToolkit.git
```

> First run downloads the model (~1 GB) and caches it. Later runs are offline.

## 2. Generate the dictionary

```bash
python translate_catalog.py --in catalog_en.json --out messages.json
```

- Translates every English string into hi, te, ta, kn, ml.
- On the laptop CPU, expect roughly a minute or two per ~50 strings. Fine for a one-off.
- Output `messages.json` is written as proper UTF-8.

## 3. Put it in the app + commit SAFELY

Copy the generated file to `lib/i18n/messages.json` in the repo, then commit it
**through the Pranix gateway** (Claude can do this), or with an editor that saves
UTF-8.

⚠️ **Do NOT** commit it through a Windows/PowerShell file pipeline that re-encodes
text — that is what corrupted the Hindi/emoji before (turned them into `?`).
Safest path: hand the file to Claude to commit via `github_apply_patch`.

## 4. How it stays maintainable

- **`catalog_en.json` is the single source of truth.** Only ever edit English here.
- When you add/change strings, re-run step 2 to regenerate all 6 languages.
- As we wire each screen, new keys get added to `catalog_en.json` first.

## 5. Quality note

Machine translation is weakest on very short UI labels (a one-word button has no
context). Before launch, get a native speaker to skim each language — Telugu first
since that's your home base. The `_meta.note` field already flags the file as
"machine-translated, pending native review."

## Model options

| Model | Size | Use when |
|-------|------|----------|
| `indictrans2-en-indic-dist-200M` | ~1 GB | Default. Laptop CPU, fast, good quality. |
| `indictrans2-en-indic-1B` | larger | Higher quality; needs more RAM / slower on CPU. |

To switch, change `MODEL_NAME` at the top of `translate_catalog.py`.
