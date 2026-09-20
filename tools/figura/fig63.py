import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fig_common import *
import numpy as np

nivele = ["Q3_K_L", "Q4_K_M", "Q5_K_M", "Q6_K", "Q8_0"]
skedar = np.array([699, 770, 869, 974, 1259])
iph    = np.array([852, 922, 1024, 1118, 1410])
s10    = np.array([896, 931, 1061, 1166, 1405])

x = np.arange(len(nivele)); w = 0.27
fig, ax = plt.subplots(figsize=(6.4, 3.7))
ax.bar(x - w, skedar, w, label="Madhësia e skedarit", color="#cbd5e1", edgecolor="#94a3b8", lw=0.6)
ax.bar(x,     iph,    w, label="iPhone 12 Pro (resident_size)", color=IPHONE)
ax.bar(x + w, s10,    w, label="Samsung Galaxy S10+ (PSS total)", color=S10)

# Shtesa mbi skedarin shënohet mbi çdo çift, sepse ajo është gjetja kryesore.
for xi, f, a, b in zip(x, skedar, iph, s10):
    ax.text(xi,     a + 26, f"+{a-f}", ha="center", fontsize=7, color=IPHONE)
    ax.text(xi + w, b + 26, f"+{b-f}", ha="center", fontsize=7, color=S10)

ax.set_xticks(x); ax.set_xticklabels(nivele)
ax.set_ylabel("Memoria (MB)")
ax.set_xlabel("Niveli i kuantizimit")
ax.set_ylim(0, 1700)
ax.legend(frameon=False, loc="upper left", fontsize=8)
save(fig, "fig-6-3-memoria-sipas-kuantizimit")
