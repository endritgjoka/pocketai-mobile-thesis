import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fig_common import *
import numpy as np

nivele = ["Q3_K_L", "Q4_K_M", "Q5_K_M", "Q6_K", "Q8_0"]
skedar = np.array([699, 770, 869, 974, 1259], dtype=float)
iphone = np.array([15.07, 21.60, 14.30, 13.67, 22.05])
s10    = np.array([ 6.76,  7.76,  5.97,  5.45,  5.30])

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

for xi, yi, lab in zip(skedar, iphone, nivele):
    ax.annotate(lab, (xi, yi), textcoords="offset points", xytext=(0, 7),
                fontsize=7.5, ha="center", color=IPHONE)
for xi, yi, lab in zip(skedar, s10, nivele):
    ax.annotate(lab, (xi, yi), textcoords="offset points", xytext=(0, -13),
                fontsize=7.5, ha="center", color=S10)

ax.set_xlabel("Madhësia e skedarit të modelit (MB)")
ax.set_ylabel("Tokena për sekondë")
ax.set_ylim(0, 27)
ax.legend(frameon=False, loc="upper left")
save(fig, "fig-6-2-skedari-kundrejt-shpejtesise")
