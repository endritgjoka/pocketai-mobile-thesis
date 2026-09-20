import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fig_common import *
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

fig, ax = plt.subplots(figsize=(6.5, 4.2))
ax.set_xlim(0, 10); ax.set_ylim(0, 8.4); ax.axis("off")

shtresa = [
    ("Ndërfaqja", "Ekranet React Native, komponentët e përbashkët", "#eef2f7", "#334155"),
    ("Shërbimet", "LlamaService, EmbeddingService,\nshërbimet e kontekstit, benchmark", "#e8eef6", IPHONE),
    ("Moduli vendas", "llama.rn (llama.cpp), ONNX Runtime", "#eaf3ea", ACCENT),
    ("Ruajtja lokale", "SQLite, sistemi i skedarëve", "#fdf0e6", S10),
]
X, W, H, GAP = 1.15, 7.7, 1.42, 0.42
for i, (emri, permb, fc, ec) in enumerate(shtresa):
    y = 6.65 - i*(H + GAP)
    ax.add_patch(FancyBboxPatch((X, y), W, H, boxstyle="round,pad=0.06,rounding_size=0.1",
                                lw=1.1, edgecolor=ec, facecolor=fc, zorder=2))
    ax.text(X + 0.3, y + H*0.66, emri, fontsize=9, fontweight="bold", color="#111827", va="center")
    ax.text(X + 0.3, y + H*0.28, permb, fontsize=8, color="#374151", va="center", linespacing=1.25)
    if i < len(shtresa) - 1:
        ax.add_patch(FancyArrowPatch((X + W/2, y - 0.04), (X + W/2, y - GAP + 0.04),
                                     arrowstyle="<|-|>", mutation_scale=9, lw=0.9,
                                     color="#94a3b8", zorder=1))

# Kufiri i pajisjes: asnjë e dhënë nuk del jashtë.
ax.add_patch(FancyBboxPatch((0.72, 0.45), W + 0.86, 7.55, boxstyle="round,pad=0.05,rounding_size=0.14",
                            lw=1.2, edgecolor="#b91c1c", facecolor="none", ls=(0, (5, 3)), zorder=0))
ax.text(5.0, 8.12, "Kufiri i pajisjes: asnjë e dhënë nuk del jashtë",
        ha="center", fontsize=8.5, color="#b91c1c", fontweight="bold")
save(fig, "fig-4-1-arkitektura")
