import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fig_common import *
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

fig, ax = plt.subplots(figsize=(6.6, 4.0))
ax.set_xlim(0, 10); ax.set_ylim(0, 7.4); ax.axis("off")

def box(x, y, w, h, text, fc="#ffffff", ec="#334155", fs=8):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.06,rounding_size=0.1",
                                lw=1.0, edgecolor=ec, facecolor=fc, zorder=2))
    ax.text(x + w/2, y + h/2, text, ha="center", va="center", fontsize=fs, zorder=3, linespacing=1.3)

def ar(x1, y1, x2, y2, c="#475569"):
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), arrowstyle="-|>", mutation_scale=10,
                                 lw=0.9, color=c, zorder=1))

# Faza e parë: përgatitja e dokumentit, kryhet një herë
ax.text(0.15, 7.15, "Një herë, kur importohet dokumenti", fontsize=8.5, fontweight="bold", color="#334155")
box(0.15, 5.55, 1.95, 1.1, "Dokumenti\nTXT, DOCX, PDF", fc="#eef2f7")
ar(2.18, 6.1, 2.72, 6.1)
box(2.75, 5.55, 1.95, 1.1, "Ndarja në segmente\n256, 512 ose 1024", fc="#eef2f7")
ar(4.78, 6.1, 5.32, 6.1)
box(5.35, 5.55, 2.15, 1.1, "all-MiniLM-L6-v2\nvektor me 384 përmasa", fc="#e8eef6", ec=IPHONE)
ar(7.58, 6.1, 8.12, 6.1)
box(8.15, 5.55, 1.7, 1.1, "SQLite\nsegmentet dhe\nvektorët", fc="#fdf0e6", ec=S10, fs=7.5)

# Faza e dytë: pyetja
ax.text(0.15, 4.35, "Për çdo pyetje të përdoruesit", fontsize=8.5, fontweight="bold", color="#334155")
box(0.15, 2.75, 1.95, 1.1, "Pyetja e\npërdoruesit", fc="#eef2f7")
ar(2.18, 3.3, 2.72, 3.3)
box(2.75, 2.75, 1.95, 1.1, "Vektori i pyetjes\n384 përmasa", fc="#e8eef6", ec=IPHONE)
ar(4.78, 3.3, 5.32, 3.3)
box(5.35, 2.75, 2.15, 1.1, "Ngjashmëria kosinuse\nme segmentet e ruajtura", fc="#e8eef6", ec=IPHONE)
ar(8.98, 5.5, 8.98, 3.92)   # nga baza te krahasimi
ar(7.53, 3.3, 8.12, 3.3)
box(8.15, 2.75, 1.7, 1.1, "Segmentet\nmë të afërta", fc="#eaf3ea", ec=ACCENT, fs=7.5)

ar(9.0, 2.71, 9.0, 2.18)
box(6.85, 1.02, 3.0, 1.14, "Kërkesa me segmentet\ne përzgjedhura te\nmodeli gjuhësor",
    fc="#fdf0e6", ec=S10, fs=7.8)

# vija ndarëse midis dy fazave
ax.plot([0.1, 9.9], [4.85, 4.85], color="#e2e8f0", lw=1.0, ls=(0, (4, 3)), zorder=0)
save(fig, "fig-4-2-rrjedha-e-marrjes")
