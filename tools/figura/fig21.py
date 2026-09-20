import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fig_common import *
import numpy as np

# Të dhënat vijnë nga Tabela 1 e Kapitullit 2.
modele = ["Llama 3.2 1B", "Llama 3.2 3B", "Phi-3 Mini"]
fp16 = [2.5, 6.5, 7.6]
b8   = [1.3, 3.4, 4.0]
b4   = [0.8, 2.0, 2.2]
DISPONUESHME = 2.76   # memoria e lirë e aplikacionit mbi iPhone 12 Pro

x = np.arange(len(modele)); w = 0.26
fig, ax = plt.subplots(figsize=(6.2, 3.5))
ax.bar(x - w, fp16, w, label="16 bita", color=NEUTRAL)
ax.bar(x,     b8,   w, label="8 bita",  color=IPHONE)
ax.bar(x + w, b4,   w, label="4 bita",  color=ACCENT)
ax.axhline(DISPONUESHME, color="#b91c1c", linestyle="--", linewidth=1.2)
ax.text(-0.42, DISPONUESHME + 0.18, "memoria e lirë e aplikacionit, rreth 2.76 GB",
        color="#b91c1c", fontsize=8, ha="left",
        bbox=dict(facecolor="white", edgecolor="none", pad=1.5))
for xi, vals in zip(x, zip(fp16, b8, b4)):
    for dx, v in zip((-w, 0, w), vals):
        ax.text(xi + dx, v + 0.12, f"{v:.1f}", ha="center", fontsize=7.5)
ax.set_xticks(x); ax.set_xticklabels(modele)
ax.set_ylabel("Memoria e nevojshme (GB)")
ax.set_ylim(0, 8.3)
ax.legend(frameon=False, ncol=3, loc="upper center", bbox_to_anchor=(0.5, 1.13))
save(fig, "fig-2-1-memoria-sipas-perfaqesimit")
