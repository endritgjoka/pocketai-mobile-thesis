import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fig_common import *
import numpy as np

nivele = ["Q3_K_L", "Q4_K_M", "Q5_K_M", "Q6_K", "Q8_0"]
iphone = [15.07, 21.60, 14.30, 13.67, 22.05]
s10    = [ 6.76,  7.76,  5.97,  5.45,  5.30]
sd_i   = [ 4.02,  7.70,  4.28,  4.06,  7.28]
sd_s   = [ 2.88,  2.91,  2.45,  2.18,  2.09]

x = np.arange(len(nivele)); w = 0.36
fig, ax = plt.subplots(figsize=(6.4, 3.6))
b1 = ax.bar(x - w/2, iphone, w, yerr=sd_i, capsize=3, label="iPhone 12 Pro", color=IPHONE,
            error_kw=dict(lw=0.8, ecolor="#555"))
b2 = ax.bar(x + w/2, s10, w, yerr=sd_s, capsize=3, label="Samsung Galaxy S10+", color=S10,
            error_kw=dict(lw=0.8, ecolor="#555"))
# etiketat vendosen mbi shiritin e gabimit, jo mbi shtyllën, që të mos përplasen
for xi, v, e in zip(x - w/2, iphone, sd_i): ax.text(xi, v + e + 0.7, f"{v:.1f}", ha="center", fontsize=7.5)
for xi, v, e in zip(x + w/2, s10, sd_s):    ax.text(xi, v + e + 0.7, f"{v:.1f}", ha="center", fontsize=7.5)
# Përmbysja e renditjes te Q8_0 theksohet, sepse është gjetja kryesore e krahasimit.
ax.annotate("më i shpejti mbi iPhone", xy=(4 - w/2, iphone[4] + sd_i[4]), xytext=(2.35, 30.5),
            fontsize=8, color=IPHONE, ha="center",
            arrowprops=dict(arrowstyle="->", color=IPHONE, lw=0.9,
                            connectionstyle="arc3,rad=-0.15"),
            bbox=dict(facecolor="white", edgecolor="none", pad=1.5))
ax.annotate("më i ngadalshmi mbi S10+", xy=(4 + w/2, s10[4] + sd_s[4]), xytext=(2.15, 11.6),
            fontsize=8, color=S10, ha="center",
            arrowprops=dict(arrowstyle="->", color=S10, lw=0.9,
                            connectionstyle="arc3,rad=0.2"),
            bbox=dict(facecolor="white", edgecolor="none", pad=1.5))
ax.set_xticks(x); ax.set_xticklabels(nivele)
ax.set_ylabel("Tokena për sekondë")
ax.set_xlabel("Niveli i kuantizimit")
ax.set_ylim(0, 34)
ax.legend(frameon=False, ncol=2, loc="upper left")
save(fig, "fig-6-1-shpejtesia-sipas-kuantizimit")
