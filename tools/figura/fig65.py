import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fig_common import *
import json

# Te dhenat vijne drejtpersedrejti nga matja, qe figura te mos shkeputet nga rezultati.
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
d = json.load(open(os.path.join(ROOT, "eval-data", "results", "p4-holdout-2026-09-19.json")))

kufi = d["floors"]
kal  = [d["calibration"][str(f)]["pocketai"]["first"] for f in kufi]
mbaj = [d["holdoutSweep"][str(f)]["first"] for f in kufi]
zgjedhur = d["chosenFloor"]

fig, ax = plt.subplots(figsize=(6.4, 3.8))
ax.axvline(zgjedhur, color="#94a3b8", lw=6, alpha=0.35, zorder=0)
ax.text(zgjedhur, 1.055, "vlera e zgjedhur\nmbi kalibrimin", ha="center", fontsize=8,
        color="#475569", linespacing=1.2)

ax.plot(kufi, kal,  "o-",  color=IPHONE, lw=1.7, ms=5,
        label="Nëngrupi i kalibrimit (zgjedh vlerën)")
ax.plot(kufi, mbaj, "s--", color=S10,    lw=1.7, ms=5,
        label="Nëngrupi i mbajtur mënjanë (mat rezultatin)")

# Pika e raportuar: kufiri i zgjedhur mbi kalibrim, i matur mbi grupin e mbajtur menjane.
yv = d["holdoutSweep"][str(zgjedhur)]["first"]
ax.plot([zgjedhur], [yv], "o", ms=11, mfc="none", mec=S10, mew=1.8)
ax.annotate("rezultati i raportuar\n%.3f" % yv, xy=(zgjedhur, yv), xytext=(0.24, 0.775),
            fontsize=8, color=S10, arrowprops=dict(arrowstyle="->", color=S10, lw=0.9))

ax.set_xlabel("Kufiri i poshtëm i faktorit të afërsisë kohore")
ax.set_ylabel("Renditja e parë e njësisë së duhur")
ax.set_ylim(0.66, 1.10)
ax.set_xlim(-0.04, 1.06)
ax.set_yticks([0.7, 0.8, 0.9, 1.0])
ax.set_xticks([0, 0.2, 0.4, 0.6, 0.8, 1.0])
ax.legend(frameon=False, loc="lower right", fontsize=8, bbox_to_anchor=(1.0, -0.02))
save(fig, "fig-6-5-kufiri-i-afersise-kohore")
