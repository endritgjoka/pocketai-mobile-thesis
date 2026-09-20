# Bashkon pamjet e ekranit në një figurë të vetme, me etiketa (a), (b), ...
from PIL import Image, ImageDraw, ImageFont
import os

# Shtegu nxirret nga vendndodhja e skriptit, që të mos varet nga një makinë e vetme.
A = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "thesis", "assets")
OUT = A + "/figura"

def font(sz):
    for p in ["/System/Library/Fonts/Supplemental/Times New Roman.ttf",
              "/System/Library/Fonts/Supplemental/Arial.ttf",
              "/System/Library/Fonts/Helvetica.ttc"]:
        if os.path.exists(p):
            try: return ImageFont.truetype(p, sz)
            except Exception: pass
    return ImageFont.load_default()

def compose(paths, labels, out, gap=70, pad=28, label_h=90, border="#d7dce3"):
    ims = [Image.open(p).convert("RGB") for p in paths]
    h = min(i.height for i in ims)
    ims = [i.resize((round(i.width * h / i.height), h), Image.LANCZOS) for i in ims]
    W = sum(i.width for i in ims) + gap * (len(ims) - 1) + pad * 2
    H = h + label_h + pad * 2
    canvas = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(canvas)
    f = font(46)
    x = pad
    for im, lab in zip(ims, labels):
        canvas.paste(im, (x, pad))
        d.rectangle([x, pad, x + im.width - 1, pad + im.height - 1], outline=border, width=3)
        tw = d.textlength(lab, font=f)
        d.text((x + im.width / 2 - tw / 2, pad + im.height + 22), lab, fill="#111827", font=f)
        x += im.width + gap
    canvas.save(out, "PNG")
    print("  ->", os.path.basename(out), canvas.size)

compose([f"{A}/IMG_9432.png", f"{A}/IMG_9436.png"],
        ["(a) lista e bisedave", "(b) biseda e hapur"],
        f"{OUT}/fig-5-1-bisedat.png")
compose([f"{A}/IMG_9435.png"], [""], f"{OUT}/fig-5-2-modelet.png", label_h=10)
compose([f"{A}/IMG_9433.png"], [""], f"{OUT}/fig-5-3-dokumentet.png", label_h=10)
compose([f"{A}/IMG_9437.png"], [""], f"{OUT}/fig-6-0-benchmarks.png", label_h=10)
