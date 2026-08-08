"""Arabic rendering tests."""

from soldiom.renderer.arabic import has_libraqm, measure_wrapped_text
from PIL import Image, ImageDraw, ImageFont


def test_arabic_rtl_direction():
    img = Image.new("RGB", (800, 200), "#000")
    draw = ImageDraw.Draw(img)
    font = ImageFont.load_default()
    lines, h = measure_wrapped_text(
        draw,
        "الذكاء الاصطناعي السيادي مهم للحكومات",
        font,
        700,
        direction="rtl",
        language="ar",
    )
    assert len(lines) >= 1
    assert h > 0


def test_libraqm_probe():
    # Informational — libraqm may be absent in CI
    _ = has_libraqm()
