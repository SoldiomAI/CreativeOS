"""Verify RTL direction metadata on scene elements."""

from soldiom.models import SceneDSL, SceneElement


def verify_rtl_scenes(scenes: list[SceneDSL]) -> list[str]:
    errors: list[str] = []
    for i, scene in enumerate(scenes, start=1):
        for el in scene.elements:
            if el.direction == "rtl" and el.align == "left":
                errors.append(f"Scene {i}: RTL element should not use left align")
    return errors


def test_verify_rtl_ok():
    scene = SceneDSL(
        elements=[
            SceneElement(type="headline", text="مرحبا", direction="rtl", align="right")
        ]
    )
    assert verify_rtl_scenes([scene]) == []
