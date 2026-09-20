import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fig_common import *
import numpy as np

llojet = ["Zëvendësim", "Autoritet", "E vjetër por\ne vlefshme", "Gjithsej"]
propozuar = [1.000, 1.000, 0.375, 0.792]
relevanca = [0.375, 0.750, 1.000, 0.708]
cungim    = [0.000, 0.000, 1.000, 0.333]
freskia   = [0.000, 0.000, 0.000, 0.000]

x = np.arange(len(llojet)); w = 0.2
fig, ax = plt.subplots(figsize=(6.6, 3.8))
ax.bar(x - 1.5*w, propozuar, w, label="Algoritmi i propozuar", color=IPHONE)
ax.bar(x - 0.5*w, relevanca, w, label="Vetëm relevanca", color=ACCENT)
ax.bar(x + 0.5*w, cungim,    w, label="Shkurtimi", color=NEUTRAL)
ax.bar(x + 1.5*w, freskia,   w, label="Vetëm afërsia kohore", color="#d1d5db", edgecolor="#9ca3af", lw=0.6)

for xi, vals in zip(x, zip(propozuar, relevanca, cungim, freskia)):
    for dx, v in zip((-1.5*w, -0.5*w, 0.5*w, 1.5*w), vals):
        if v > 0.02:
            ax.text(xi + dx, v + 0.022, f"{v:.3f}", ha="center", fontsize=6.8)

ax.set_xticks(x); ax.set_xticklabels(llojet)
ax.set_ylabel("Renditja e parë e njësisë së duhur")
ax.set_ylim(0, 1.16)
ax.legend(frameon=False, ncol=2, loc="upper center", bbox_to_anchor=(0.5, 1.17), fontsize=8)
save(fig, "fig-6-6-krahasimi-me-qasjet-baze")
