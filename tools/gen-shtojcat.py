#!/usr/bin/env python3
"""Gjeneron shtojcat e punimit nga skedarët e vërtetë të vlerësimit në eval-data/.
Rindërtoje sa herë ndryshojnë të dhënat:  python3 tools/gen-shtojcat.py"""
import json, os, io

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EVAL = os.path.join(ROOT, "eval-data")
OUT  = os.path.join(ROOT, "thesis", "09-shtojcat.md")

def esc(t):
    return t.replace("|", "\\|").strip()

gt = json.load(io.open(os.path.join(EVAL, "retrieval-ground-truth.json"), encoding="utf8"))
split_ids = json.load(io.open(os.path.join(EVAL, "p4-split.json"), encoding="utf8"))
CAL = set(split_ids["calibration"])
NENGRUPI = lambda sid: "kalibrim" if sid in CAL else "mbajtur mënjanë"

bal = json.load(io.open(os.path.join(EVAL, "p4-scenarios.json"), encoding="utf8"))
con = json.load(io.open(os.path.join(EVAL, "p4-scenarios-conflict.json"), encoding="utf8"))

MOSHA = {"recent": "e freskët", "medium": "mesatare", "old": "e vjetër"}
BURIMI = {"document": "dokument", "chat": "bisedë", "calendar": "kalendar", "health": "shëndetësore"}
LLOJI = {"supersession": "zëvendësim", "authority": "autoritet", "old_correct": "e vjetër por e vlefshme"}

L = []
w = L.append

w("<!-- Shtojcat. I gjeneron tools/gen-shtojcat.py nga eval-data/. Mos e redakto me dorë. -->")
w("")
w("# Shtojca A. Pyetjet e vlerësimit të marrjes së informacionit")
w("")
w("Kjo shtojcë paraqet të 15 pyetjet mbi të cilat janë matur saktësia e marrjes së informacionit "
  "dhe cilësia e përgjigjes në nënseksionet 6.2.5 dhe 6.3. Dokumenti i provës është një manual i brendshëm "
  "prej rreth 31 mijë karakteresh i një ndërmarrjeje logjistike të trilluar. "
  "Një përgjigje quhet e saktë vetëm nëse vargu i dhënë në kolonën e tretë shfaqet fjalë për fjalë brenda tekstit të gjeneruar. "
  "Vargjet janë mbajtur të shkurtra dhe të veçanta, që gjykimi të mos varet nga interpretimi. "
  "Pyetjet dhe dokumenti janë në anglisht, sepse prototipi punon me tekst anglisht, "
  "ndërsa modelet e provuara mbështeten dukshëm më mirë në këtë gjuhë.")
w("")
w("**Tabela A1.** Pyetjet e vlerësimit dhe vargjet e pritura të përgjigjes.")
w("")
w("| Nr | Pyetja | Vargu i pritur i përgjigjes |")
w("| --- | --- | --- |")
for i, q in enumerate(gt["questions"], 1):
    w("| %d | %s | %s |" % (i, esc(q["question"]), esc(" ose ".join(q["answerSpans"]))))
w("")
w("# Shtojca B. Skenarët e vlerësimit të algoritmit të prioritizimit")
w("")
w("Algoritmi i prioritizimit të kontekstit u vlerësua mbi 48 skenarë të ndërtuar posaçërisht, "
  "të ndarë në dy grupe prej 24 skenarësh. Secili skenar përmban një pyetje, një njësi të vetme që e përmban përgjigjen "
  "dhe disa njësi shpërqendruese, si dhe një buxhet tokenash më të vogël sesa shuma e të gjitha njësive, "
  "që përzgjedhja të jetë e detyrueshme.")
w("")
w("Për vlerësimin e kufirit të poshtëm të afërsisë kohore këta 48 skenarë ndahen më tej në dy nëngrupe "
  "prej 24 skenarësh, një nëngrup kalibrimi mbi të cilin zgjidhet vlera e parametrit dhe një nëngrup i "
  "mbajtur mënjanë mbi të cilin matet rezultati. Ndarja është e përcaktuar dhe nuk përdor rastësi. "
  "Kolona e fundit e tabelave të mëposhtme tregon se ku bie secili skenar.")
w("")
w("## B.1 Grupi i baraspeshuar")
w("")
w("Grupi i parë është ndërtuar si plan faktorial. Burimi i njësisë së duhur rrotullohet midis 4 burimeve, "
  "mosha e saj midis 3 niveleve dhe pozicioni i saj i mbërritjes midis fillimit dhe fundit të listës, "
  "që asnjë qasje bazë të mos favorizohet në mënyrë sistematike. "
  "Secili skenar përmban 6 njësi. Buxhetet shkojnë nga 36 deri në 50 tokena.")
w("")
w("**Tabela B1.** Grupi i baraspeshuar, 24 skenarë.")
w("")
w("| Id | Pyetja | Burimi i njësisë së duhur | Mosha | Buxheti | Nëngrupi |")
w("| --- | --- | --- | --- | --- | --- |")
for s in bal["scenarios"]:
    w("| %s | %s | %s | %s | %d | %s |" % (s["id"], esc(s["query"]), BURIMI[s["goldSource"]],
                                           MOSHA[s["goldAge"]], s["tokenBudget"], NENGRUPI(s["id"])))
w("")
w("## B.2 Grupi me informacion konfliktual")
w("")
w("Grupi i dytë është ndërtuar që asnjë faktor i vetëm të mos mjaftojë. "
  "Ai përmban 3 lloje skenarësh me nga 8 raste. Te zëvendësimi njësia e re e ka zëvendësuar një njësi të vjetër "
  "që flet për të njëjtën gjë. Te autoriteti i njëjti fakt vjen njëherë nga një bisedë e pasigurt dhe njëherë nga një dokument zyrtar. "
  "Te rasti i tretë njësia e duhur është e vetmja e saktë por edhe më e vjetra. "
  "Njësitë shpërqendruese janë më të reja se njësia e duhur, që qasja me vetëm afërsi kohore të mos mjaftojë, "
  "dhe po aq të ngjashme me pyetjen, që qasja me vetëm relevancë të mos mjaftojë. "
  "Secili skenar përmban 5 njësi.")
w("")
w("**Tabela B2.** Grupi me informacion konfliktual, 24 skenarë.")
w("")
w("| Id | Lloji | Pyetja | Burimi i njësisë së duhur | Buxheti | Nëngrupi |")
w("| --- | --- | --- | --- | --- | --- |")
for s in con["scenarios"]:
    w("| %s | %s | %s | %s | %d | %s |" % (s["id"], LLOJI[s["kind"]], esc(s["query"]),
                                           BURIMI[s["goldSource"]], s["tokenBudget"], NENGRUPI(s["id"])))
w("")
w("## B.3 Shembull i plotë i një skenari")
w("")
ex = con["scenarios"][0]
w("Tabelat e mësipërme japin vetëm përmbledhjen e secilit skenar. "
  "Për të treguar se si duket një skenar i plotë, më poshtë jepet i tëri skenari %s, i llojit zëvendësim. "
  "Pyetja është \"%s\" dhe buxheti i lejuar është %d tokena, ndërsa shuma e të gjitha njësive e tejkalon këtë buxhet. "
  "Njësia e duhur është %s." % (ex["id"], esc(ex["query"]), ex["tokenBudget"], ex["goldItemId"]))
w("")
w("**Tabela B3.** Njësitë e skenarit %s." % ex["id"])
w("")
w("| Id i njësisë | Burimi | Mosha në orë | Tokena | Teksti |")
w("| --- | --- | --- | --- | --- |")
for it in ex["items"]:
    mark = " (njësia e duhur)" if it["id"] == ex["goldItemId"] else ""
    w("| %s%s | %s | %d | %d | %s |" % (it["id"], mark, BURIMI[it["source"]],
                                        it["ageHours"], it["tokenCount"], esc(it["text"])))
w("")
w("Njësia e duhur nuk është as më e reja as e vetmja që flet për temën e pyetjes, "
  "prandaj as afërsia kohore e pastër as relevanca e pastër nuk e nxjerrin atë të parën. "
  "Të gjitha njësitë bashkë e tejkalojnë buxhetin, prandaj përzgjedhja është e detyrueshme.")
w("")

txt = "\n".join(L) + "\n"
bad = [c for c in ("—", "–", ";") if c in txt]
if bad:
    raise SystemExit("Shenja të ndaluara në shtojca: %r" % bad)
io.open(OUT, "w", encoding="utf8").write(txt)
print("U shkrua", OUT, "(%d rreshta)" % len(L))
