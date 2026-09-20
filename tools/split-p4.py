#!/usr/bin/env python3
"""Ndan 48 skenarët e P4 në një nëngrup kalibrimi dhe një nëngrup të mbajtur mënjanë.

Ndarja është e përcaktuar plotësisht nga struktura e skenarëve dhe nga renditja e
identifikuesve, pra nuk përdor rastësi dhe jep gjithmonë të njëjtin rezultat.
Secila gjysmë ruan përpjesëtimet e planit faktorial, që asnjëra të mos dalë më e lehtë.
"""
import json, os, collections, io

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EVAL = os.path.join(ROOT, "eval-data")

bal = json.load(io.open(os.path.join(EVAL, "p4-scenarios.json"), encoding="utf8"))["scenarios"]
con = json.load(io.open(os.path.join(EVAL, "p4-scenarios-conflict.json"), encoding="utf8"))["scenarios"]

cal, hold = [], []

# Grupi i baraspeshuar: secila kombinim (burim, moshë) ka saktësisht 2 skenarë që
# ndryshojnë vetëm nga pozicioni i mbërritjes. Njëri shkon në kalibrim, tjetri mënjanë.
groups = collections.defaultdict(list)
for s in bal:
    groups[(s["goldSource"], s["goldAge"])].append(s)
# Kahja e ndarjes alternohet nga njëra qelizë te tjetra, që edhe pozicioni i mbërritjes
# të dalë i shpërndarë njësoj në të dyja gjysmat dhe jo i grumbulluar në njërën.
for i, key in enumerate(sorted(groups)):
    pair = sorted(groups[key], key=lambda s: s["id"])
    a, b = (pair[0], pair[1]) if i % 2 == 0 else (pair[1], pair[0])
    cal.append(a); hold.append(b)

# Grupi konfliktual: lloji përcakton edhe moshën, prandaj mjafton të ndahet sipas llojit.
groups = collections.defaultdict(list)
for s in con:
    groups[s["kind"]].append(s)
for key in sorted(groups):
    items = sorted(groups[key], key=lambda s: s["id"])
    for i, s in enumerate(items):
        (cal if i % 2 == 0 else hold).append(s)

def profil(xs):
    return {
        "n": len(xs),
        "burimi": dict(sorted(collections.Counter(s["goldSource"] for s in xs).items())),
        "mosha": dict(sorted(collections.Counter(s["goldAge"] for s in xs).items())),
        "pozicioni": dict(sorted(collections.Counter(s["goldPosition"] for s in xs).items())),
        "lloji": dict(sorted(collections.Counter(s.get("kind", "n/a") for s in xs).items())),
    }

out = {
    "note": ("Ndarje e përcaktuar (pa rastësi) e 48 skenarëve të P4 në kalibrim dhe në grup "
             "të mbajtur mënjanë. Kufiri i afërsisë kohore zgjidhet mbi kalibrimin dhe raportohet "
             "mbi grupin e mbajtur mënjanë."),
    "calibration": [s["id"] for s in cal],
    "holdout": [s["id"] for s in hold],
    "profiles": {"calibration": profil(cal), "holdout": profil(hold)},
}
p = os.path.join(EVAL, "p4-split.json")
io.open(p, "w", encoding="utf8").write(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
print(json.dumps(out["profiles"], ensure_ascii=False, indent=2))
assert len(cal) == len(hold) == 24
assert not (set(out["calibration"]) & set(out["holdout"]))
print("\nU shkrua", p)
