import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fig_common import *

# Ndarja e dritares prej 2048 tokenash, sipas konfigurimit të matur në Kapitullin 6.
pjeset = [
    ("Udhëzimi i sistemit", 180, "#cbd5e1"),
    ("Konteksti i marrë\n(4 segmente × 256)", 1024, IPHONE),
    ("Pyetja e përdoruesit", 100, ACCENT),
    ("Hapësira për përgjigjen", 744, S10),
]
fig, ax = plt.subplots(figsize=(6.6, 2.5))
left = 0
for emri, gjer, ngjyre in pjeset:
    ax.barh([0], [gjer], left=left, height=0.5, color=ngjyre, edgecolor="white", lw=1.2)
    if gjer > 150:
        ax.text(left + gjer/2, 0, f"{gjer}", ha="center", va="center",
                fontsize=8.5, color="white", fontweight="bold")
    else:
        # Segmenti është shumë i ngushtë për ta mbajtur numrin brenda, prandaj numri
        # vendoset poshtë tij. Pa të, pjesët nuk duken se mblidhen në 2048.
        ax.text(left + gjer/2, -0.33, f"{gjer}", ha="center", va="center",
                fontsize=8.5, color=ngjyre, fontweight="bold")
        ax.plot([left + gjer/2, left + gjer/2], [-0.26, -0.15], color=ngjyre, lw=0.8)
    left += gjer

ax.set_xlim(0, 2048); ax.set_ylim(-0.75, 0.95)
ax.set_yticks([])
ax.set_xticks([0, 512, 1024, 1536, 2048])
ax.set_xlabel("Tokena brenda dritares së kontekstit")
ax.spines["left"].set_visible(False)
ax.grid(axis="y", visible=False)

# legjenda si tekst nën shtyllë, që të mos zërë hapësirë
left = 0
for i, (emri, gjer, ngjyre) in enumerate(pjeset):
    ax.text(left + gjer/2, 0.42 if i % 2 == 0 else 0.68, emri, ha="center", va="bottom",
            fontsize=7.5, color=ngjyre if ngjyre != "#cbd5e1" else "#64748b", linespacing=1.2)
    left += gjer
ax.text(2048, -0.55, "dritarja e plotë: 2048 tokena", ha="right", fontsize=8, color="#334155")
save(fig, "fig-2-2-buxheti-i-kontekstit")
