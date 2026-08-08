"""Mixed Arabic + English layout tests."""

from soldiom.renderer.pillow_backend import PillowBackend
from soldiom.models import DesignTokens, SceneDSL, SceneElement
from pathlib import Path
import tempfile


def test_mixed_ar_en_render():
    scene = SceneDSL(
        elements=[
            SceneElement(
                type="headline",
                text="AI السيادي in GCC",
                direction="rtl",
                align="right",
            ),
            SceneElement(
                type="paragraph",
                text="Sovereign AI enables local control.",
                direction="ltr",
                align="left",
            ),
        ]
    )
    backend = PillowBackend()
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "mixed.png"
        path = backend.render_scene(scene, DesignTokens(), 1080, 1350, out)
        assert Path(path).exists()
