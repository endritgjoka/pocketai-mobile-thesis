import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fig_common import *
import numpy as np

seg = ["256 tokena", "512 tokena", "1024 tokena"]
recall1 = [0.800, 0.333, 0.200]
mrr     = [0.850, 0.536, 0.493]
sakt    = [0.600, 0.467, 0.133]   # saktësia e përgjigjes me buxhet të njëjtë konteksti

x = np.arange(len(seg))
fig, ax = plt.subplots(figsize=(6.2, 3.6))
ax.plot(x, recall1, "o-", color=IPHONE, lw=1.8, ms=6, label="Recall@1")
ax.plot(x, mrr,     "s-", color=ACCENT, lw=1.6, ms=5.5, label="MRR@5")
ax.plot(x, sakt,    "^--", color=S10,   lw=1.6, ms=6, label="Saktësia e përgjigjes\n(buxhet i njëjtë konteksti)")
for xi, v in zip(x, recall1):
    dx, ha = (0.06, "left") if xi == 0 else (0, "center")
    ax.text(xi + dx, v - 0.055, f"{v:.3f}", ha=ha, fontsize=7.5, color=IPHONE)
for xi, v in zip(x, sakt):    ax.text(xi, v - 0.065, f"{v:.3f}", ha="center", fontsize=7.5, color=S10)
ax.set_xticks(x); ax.set_xticklabels(seg)
ax.set_xlabel("Madhësia e segmentit")
ax.set_ylabel("Vlera e metrikës")
ax.set_ylim(0, 1.0)
ax.legend(frameon=False, loc="upper right", fontsize=8)
save(fig, "fig-6-4-segmenti-kundrejt-saktesise")
