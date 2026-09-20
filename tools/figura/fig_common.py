import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

# Pamje e njëtrajtshme për të gjitha figurat, e përshtatur me tekstin e punimit.
plt.rcParams.update({
    "font.family": "serif",
    "font.serif": ["Times New Roman", "DejaVu Serif"],
    "font.size": 10,
    "axes.titlesize": 11,
    "axes.labelsize": 10,
    "legend.fontsize": 9,
    "xtick.labelsize": 9,
    "ytick.labelsize": 9,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.grid": True,
    "grid.alpha": 0.25,
    "grid.linewidth": 0.6,
    "figure.dpi": 300,
})
# Paletë e sigurt për shtyp bardhezi dhe për daltonizëm.
IPHONE = "#1f4e79"
S10    = "#c05621"
NEUTRAL= "#6b7280"
ACCENT = "#2f7d32"

import os as _os
OUT = _os.path.join(_os.path.dirname(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))), "thesis", "assets", "figura")

def save(fig, name):
    fig.tight_layout()
    p = f"{OUT}/{name}.png"
    fig.savefig(p, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print("  ->", name + ".png")
