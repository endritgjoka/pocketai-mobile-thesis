import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fig_common import *
import numpy as np

nivele = ["Q3_K_L", "Q4_K_M", "Q5_K_M", "Q6_K", "Q8_0"]
skedar = np.array([699, 770, 869, 974, 1259], dtype=float)
# Mesataret llogariten nga matjet e papërpunuara, që koeficienti r të jetë i njëjtë me atë në tekst.
import csv
_R = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "eval-data", "results")
def mesataret(skedari):
    v = {}
    for rr in csv.DictReader(open(os.path.join(_R, skedari))):
        if rr["task_type"] == "chat" and rr["model_id"].startswith("llama32-1b-q"):
            v.setdefault(rr["model_id"][-2:], []).append(float(rr["tokens_per_second"]))
    return np.array([np.mean(v[k]) for k in ("q3", "q4", "q5", "q6", "q8")])
iphone = mesataret("iphone12pro-runs-raw.csv")
s10    = mesataret("s10plus-runs-raw.csv")

def r(a, b):
    a=a-a.mean(); b=b-b.mean()
    return float((a*b).sum()/np.sqrt((a*a).sum()*(b*b).sum()))

fig, ax = plt.subplots(figsize=(6.4, 3.8))
for xs, ys, col, lab in [(skedar, iphone, IPHONE, "iPhone 12 Pro"),
                         (skedar, s10, S10, "Samsung Galaxy S10+")]:
    ax.scatter(xs, ys, s=46, color=col, zorder=3, label=f"{lab}  (r = {r(xs,ys):+.3f})")
    k, n = np.polyfit(xs, ys, 1)
    xx = np.linspace(skedar.min()-30, skedar.max()+30, 50)
    ax.plot(xx, k*xx+n, color=col, lw=1.2, ls="--", alpha=0.75, zorder=2)

# Etiketat që do të binin mbi vijën e prirjes zhvendosen në anën tjetër të pikës.
for xi, yi, lab in zip(skedar, iphone, nivele):
    ax.annotate(lab, (xi, yi), textcoords="offset points", xytext=(0, -13 if lab == "Q3_K_L" else 7),
                fontsize=7.5, ha="center", color=IPHONE)
for xi, yi, lab in zip(skedar, s10, nivele):
    ax.annotate(lab, (xi, yi), textcoords="offset points", xytext=(0, 7 if lab == "Q4_K_M" else -13),
                fontsize=7.5, ha="center", color=S10)

ax.set_xlabel("Madhësia e skedarit të modelit (MB)")
ax.set_ylabel("Tokena për sekondë")
ax.set_ylim(0, 27)
ax.legend(frameon=False, loc="upper left")
save(fig, "fig-6-2-skedari-kundrejt-shpejtesise")
