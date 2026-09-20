import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fig_common import *
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

fig, ax = plt.subplots(figsize=(6.6, 4.6))
ax.set_xlim(0, 10); ax.set_ylim(0, 8.2); ax.axis("off")

def box(x, y, w, h, text, fc="#ffffff", ec="#334155", fs=8.5, tc="#111827", bold=False):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.07,rounding_size=0.1",
                                linewidth=1.0, edgecolor=ec, facecolor=fc, zorder=2))
    ax.text(x + w/2, y + h/2, text, ha="center", va="center", fontsize=fs, zorder=3,
            color=tc, fontweight="bold" if bold else "normal", linespacing=1.3)

def arrow(x1, y1, x2, y2, color="#475569", style="arc3,rad=0"):
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), arrowstyle="-|>", mutation_scale=10,
                                 linewidth=0.9, color=color, zorder=1,
                                 connectionstyle=style))

CX, CW = 3.55, 3.5           # kolona qendrore
ax.text(1.2, 7.85, "Burimet e kontekstit", ha="center", fontsize=8.5, fontweight="bold", color="#334155")
burime = ["Historia e bisedës", "Dokumentet", "Kalendari", "Të dhënat shëndetësore"]
for i, b in enumerate(burime):
    y = 6.55 - i*1.30
    box(0.15, y, 2.1, 0.95, b, fc="#eef2f7", fs=8)
    arrow(2.32, y + 0.48, CX - 0.12, 6.05, style="arc3,rad=0.08")

# Kutia vizatohet bosh dhe teksti vendoset me dorë, që shënimi për kufirin të rrijë brenda saj.
BY, BH = 5.05, 1.95
ax.add_patch(FancyBboxPatch((CX, BY), CW, BH, boxstyle="round,pad=0.07,rounding_size=0.1",
                            linewidth=1.0, edgecolor=IPHONE, facecolor="#e8eef6", zorder=2))
ax.text(CX + CW/2, BY + 1.48, "Vlerësimi i secilës njësi", ha="center", va="center",
        fontsize=8, zorder=3, color="#111827")
ax.text(CX + CW/2, BY + 0.95, "rezultati = relevanca ×\nafërsia kohore × pesha e burimit",
        ha="center", va="center", fontsize=8, zorder=3, color="#111827", linespacing=1.3)
ax.text(CX + CW/2, BY + 0.28, "afërsia kohore nuk zbret nën kufirin 0.5",
        ha="center", va="center", fontsize=7.3, style="italic", color="#475569", zorder=3)

arrow(CX + CW/2, BY - 0.02, CX + CW/2, 4.62)
box(CX, 3.72, CW, 0.88, "Renditja në rend zbritës sipas rezultatit", fc="#ffffff", fs=8)

arrow(CX + CW/2, 3.70, CX + CW/2, 3.20)
box(CX, 2.10, CW, 1.08,
    "Përzgjedhje greedy derisa mbushet buxheti\n(gjysma e dritares së kontekstit)",
    fc="#eaf3ea", ec=ACCENT, fs=8)

# dega e njësive të papërzgjedhura
arrow(CX + CW, 2.64, 8.05, 2.64)
box(8.05, 2.20, 1.80, 0.88, "Njësitë e mbetura\nnuk përfshihen",
    fc="#f5f5f5", ec="#cbd5e1", tc="#6b7280", fs=7.5)

arrow(CX + CW/2, 2.08, CX + CW/2, 1.58)
box(CX, 0.50, CW, 1.06, "Kërkesa që i jepet\nmodelit gjuhësor", fc="#fdf0e6", ec=S10, fs=8)

save(fig, "fig-4-3-algoritmi-i-prioritizimit")
