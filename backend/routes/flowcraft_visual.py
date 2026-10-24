from __future__ import annotations

import json
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from config import DASHSCOPE_API_KEY, QWEN_VISION_BASE_URL, QWEN_VISION_MODEL

router = APIRouter()


class FlowCraftVisualAnalyzeRequest(BaseModel):
    image: str = Field(..., min_length=32)
    scenario: str = "generic"
    core_task: str = Field(default="", alias="coreTask")
    required_details: str = Field(default="", alias="requiredDetails")


class FlowCraftVisualAnalyzeResponse(BaseModel):
    enabled: bool
    provider: str
    model: str
    notes: str
    layoutSpec: dict[str, Any] | None = None
    error: str | None = None


MIN_REGION_COUNT = 4


def _scenario_region_roles(
    scenario: str, core_task: str = ""
) -> list[tuple[str, str]]:
    if core_task.strip():
        return [
            ("top_nav", "navigation supporting the user-defined core task"),
            ("hero", "primary value or status for the user-defined core task"),
            ("central_panel", "main workspace for the user-defined core task"),
            ("tabs_or_steps", "steps implied by the user-defined flow"),
            ("primary_cta", "next action explicitly required by the user brief"),
            ("content_cards", "supporting details required by the user brief"),
            ("utility_panel", "validation, recovery, or confirmation feedback"),
        ]

    normalized = scenario.lower()
    if "commerce" in normalized or "shop" in normalized:
        return [
            ("top_nav", "ecommerce category/account navigation"),
            ("hero", "product or collection value proposition"),
            ("central_panel", "product detail and add-to-cart panel"),
            ("tabs_or_steps", "Product / Cart / Checkout step controls"),
            ("primary_cta", "Add to cart / Proceed to checkout / Pay now"),
            ("content_cards", "recommended products, bundles, reviews, or trust"),
            ("utility_panel", "cart summary, delivery promise, or receipt"),
        ]
    if "learn" in normalized or "education" in normalized:
        return [
            ("top_nav", "course category/account navigation"),
            ("hero", "course outcome or learning path value proposition"),
            ("central_panel", "course detail, trial lesson, and enrollment panel"),
            ("tabs_or_steps", "Overview / Trial / Enroll step controls"),
            ("primary_cta", "Start free trial / Continue / Confirm enrollment"),
            ("content_cards", "popular lessons, instructor proof, or modules"),
            ("utility_panel", "progress, prerequisites, or next-step summary"),
        ]
    if "ai" in normalized or "assistant" in normalized:
        return [
            ("top_nav", "AI workspace history, tools, and account navigation"),
            ("hero", "AI task value proposition or workspace status"),
            ("central_panel", "task composer, generation progress, and result review"),
            ("tabs_or_steps", "Compose / Result / Refine step controls"),
            ("primary_cta", "Generate result / Refine / Confirm upgrade"),
            ("content_cards", "example tasks, capabilities, recent results, or plans"),
            ("utility_panel", "generation settings, usage status, or result details"),
        ]
    if "saas" in normalized or "collaboration" in normalized:
        return [
            ("top_nav", "workspace, team, and account navigation"),
            ("hero", "team activation or workspace status"),
            ("central_panel", "teammate email, role selection, and permission review"),
            ("tabs_or_steps", "Members / Invite / Permissions step controls"),
            ("primary_cta", "Invite teammate / Review / Send invitation"),
            ("content_cards", "member rows, teams, roles, or activity"),
            ("utility_panel", "seat usage, permission summary, or invite status"),
        ]
    return [
        ("top_nav", "finance product/account navigation"),
        ("hero", "financial goal or advisory value proposition"),
        ("central_panel", "goal intake, risk inputs, and review panel"),
        ("tabs_or_steps", "Goal / Risk / Review step controls"),
        ("primary_cta", "Check fit / Review recommendation / Confirm plan"),
        ("content_cards", "plan options, risk education, or trust proof"),
        ("utility_panel", "summary, risk explanation, consent, or receipt"),
    ]


def _fallback_layout_spec(
    scenario: str,
    core_task: str,
    reason: str,
    raw_spec: dict[str, Any] | None = None,
) -> dict[str, Any]:
    visual_style = raw_spec.get("visualStyle", {}) if isinstance(raw_spec, dict) else {}
    raw_analysis = str((raw_spec or {}).get("rawAnalysis", "")).lower()
    dense_grid = (
        str((raw_spec or {}).get("layoutPattern", "")).lower() in {"grid", "table", "data grid"}
        or str(visual_style.get("density", "")).lower() == "high"
        or '"layoutpattern": "grid"' in raw_analysis
        or '"density": "high"' in raw_analysis
    )
    if dense_grid:
        return {
            "layoutPattern": "title + view tabs + filter toolbar + grouped data table + contextual overlay",
            "viewport": (raw_spec or {}).get("viewport", "desktop"),
            "canvas": (raw_spec or {}).get(
                "canvas", {"aspectRatio": "16:9", "dominantGrid": "dense horizontal rows"}
            ),
            "visualStyle": {
                **visual_style,
                "surface": visual_style.get("surface", "white"),
                "density": "high",
                "radius": visual_style.get("radius", "small"),
                "borders": visual_style.get("borders", "subtle row dividers"),
                "shadows": visual_style.get("shadows", "overlay only"),
                "whitespaceRatio": visual_style.get("whitespaceRatio", "medium-low"),
                "alignment": visual_style.get("alignment", "left"),
            },
            "colorSystem": (raw_spec or {}).get(
                "colorSystem",
                {"background": "white", "surface": "white", "text": "charcoal", "accent": "blue"},
            ),
            "regions": [
                {
                    "id": "page_title",
                    "position": "upper left",
                    "approximateSize": "wide compact header",
                    "visualRole": "page title and identity",
                    "detectedElements": ["large title", "compact icon"],
                    "normalizedFrame": {"x": 0.1, "y": 0.1, "width": 0.8, "height": 0.12},
                    "hierarchy": 1,
                    "lockPriority": "high",
                },
                {
                    "id": "view_tabs",
                    "position": "below title",
                    "approximateSize": "full content width strip",
                    "visualRole": "compact view navigation",
                    "detectedElements": ["horizontal tabs", "active underline", "right-side actions"],
                    "normalizedFrame": {"x": 0.1, "y": 0.21, "width": 0.8, "height": 0.08},
                    "hierarchy": 2,
                    "lockPriority": "high",
                },
                {
                    "id": "filter_toolbar",
                    "position": "below tabs",
                    "approximateSize": "single compact row",
                    "visualRole": "filter and status toolbar",
                    "detectedElements": ["outlined filter pills", "status action"],
                    "normalizedFrame": {"x": 0.1, "y": 0.3, "width": 0.8, "height": 0.09},
                    "hierarchy": 3,
                    "lockPriority": "high",
                },
                {
                    "id": "grouped_table",
                    "position": "main canvas",
                    "approximateSize": "wide multi-row table",
                    "visualRole": "grouped data table",
                    "detectedElements": ["section headings", "aligned columns", "dense rows", "status pills", "row dividers"],
                    "normalizedFrame": {"x": 0.1, "y": 0.4, "width": 0.8, "height": 0.52},
                    "hierarchy": 4,
                    "lockPriority": "high",
                },
                {
                    "id": "contextual_overlay",
                    "position": "right center over table",
                    "approximateSize": "medium floating panel",
                    "visualRole": "contextual menu or editor",
                    "detectedElements": ["floating surface", "search or field", "stacked options", "selected row"],
                    "normalizedFrame": {"x": 0.48, "y": 0.35, "width": 0.42, "height": 0.3},
                    "hierarchy": 5,
                    "lockPriority": "high",
                },
            ],
            "typography": (raw_spec or {}).get("typography", {"headingScale": "40/18/15", "bodyScale": "15/13"}),
            "spacing": (raw_spec or {}).get("spacing", {"baseUnit": 8, "sectionGap": 16, "controlGap": 8, "rowHeight": 48, "contentPadding": 32}),
            "componentInventory": ["view tabs", "filter pills", "group headers", "data rows", "status pills", "contextual overlay"],
            "visualHierarchy": ["page title", "active view", "filter state", "grouped rows", "contextual overlay"],
            "interactionCues": ["tab selection", "filter menus", "row actions", "contextual option selection"],
            "constraints": [
                "Preserve the wide, dense, left-aligned workspace composition.",
                "Keep the main table visible behind the contextual overlay.",
                "Use compact controls and aligned columns rather than dashboard cards.",
                reason,
            ],
        }
    return {
        "layoutPattern": "hero + central action panel",
        "viewport": "desktop",
        "canvas": {"aspectRatio": "16:9", "dominantGrid": "single content column"},
        "visualStyle": {
            "surface": "use detected reference contrast and panel treatment",
            "density": "medium-rich",
            "radius": "rounded app controls",
            "borders": "subtle neutral dividers",
            "shadows": "minimal",
            "whitespaceRatio": "medium",
            "alignment": "left aligned",
        },
        "colorSystem": {
            "dominant": "preserve screenshot dominant surface direction",
            "accent": "preserve screenshot accent energy",
        },
        "regions": [
            {
                "id": region_id,
                "position": position,
                "approximateSize": size,
                "visualRole": visual_role,
                "detectedElements": elements,
                "transferRole": transfer_role,
                "normalizedFrame": {
                    "x": 0.05,
                    "y": round(0.04 + index * 0.12, 2),
                    "width": 0.9,
                    "height": 0.1,
                },
                "hierarchy": index + 1,
                "lockPriority": "high" if index < 4 else "medium",
            }
            for index, ((region_id, transfer_role), position, size, visual_role, elements) in enumerate(zip(
                _scenario_region_roles(scenario, core_task),
                ["top", "upper center", "center", "inside central panel", "main action area", "lower content", "right or secondary column"],
                ["full width strip", "large", "large", "compact row", "prominent button", "card grid/list", "side panel"],
                ["navigation", "hero", "action panel", "mode tabs or steps", "primary CTA", "supporting cards", "utility summary"],
                [
                    ["brand", "navigation links", "account/cart action"],
                    ["large headline", "supporting text", "background media or image"],
                    ["form controls", "selection controls", "summary"],
                    ["tab labels", "active step", "progress affordance"],
                    ["primary button", "state feedback"],
                    ["cards", "thumbnails", "metadata"],
                    ["summary", "status", "trust/recovery message"],
                ],
            ))
        ],
        "typography": {
            "headingScale": "32/24/18",
            "bodyScale": "16/14/12",
            "weights": "700/600/400",
            "lineHeight": "1.4",
            "letterSpacing": "0",
        },
        "spacing": {
            "baseUnit": 8,
            "sectionGap": 24,
            "controlGap": 8,
            "rowHeight": 48,
            "contentPadding": 24,
        },
        "componentInventory": ["navigation", "controls", "content rows", "status feedback"],
        "visualHierarchy": ["primary task", "navigation", "supporting details"],
        "interactionCues": [
            "primary action state",
            "step/tab switching",
            "selection or variant state",
            "success/recovery feedback",
        ],
        "constraints": [
            "Fallback LayoutSpec used because Qwen output did not contain enough regions.",
            reason,
            "Use screenshot for layout/visual language only; Core task and Required details own copy and interactions.",
            "Scenario template is fallback guidance only.",
        ],
    }


def _is_dense_grid_layout(layout_spec: dict[str, Any] | None) -> bool:
    if not isinstance(layout_spec, dict):
        return False
    visual_style = layout_spec.get("visualStyle", {})
    density = visual_style.get("density", "") if isinstance(visual_style, dict) else ""
    return (
        str(layout_spec.get("layoutPattern", "")).lower() in {"grid", "table", "data grid"}
        or str(density).lower() == "high"
    )


def _region_count(layout_spec: dict[str, Any] | None) -> int:
    regions = layout_spec.get("regions") if isinstance(layout_spec, dict) else None
    return len(regions) if isinstance(regions, list) else 0


def _usable_region_count(layout_spec: dict[str, Any] | None) -> int:
    regions = layout_spec.get("regions") if isinstance(layout_spec, dict) else None
    if not isinstance(regions, list):
        return 0

    usable = 0
    for region in regions:
        if not isinstance(region, dict):
            continue
        role = str(region.get("visualRole", "")).strip().lower()
        frame = region.get("normalizedFrame")
        if role in {"", "none", "unknown", "n/a"} or not isinstance(frame, dict):
            continue
        try:
            width = float(frame.get("width", 0))
            height = float(frame.get("height", 0))
        except (TypeError, ValueError):
            continue
        if width >= 0.02 and height >= 0.02:
            usable += 1
    return usable


def _clean_model_json(content: str) -> str:
    content = content.strip()
    if content.startswith("```"):
        content = content.strip("`")
        content = content.removeprefix("json").strip()
    start = content.find("{")
    end = content.rfind("}")
    if start >= 0 and end > start:
        return content[start : end + 1]
    return content


def _parse_layout_spec(content: str) -> dict[str, Any]:
    cleaned = _clean_model_json(content)
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass
    return {"rawAnalysis": content}


def _format_layout_notes(layout_spec: dict[str, Any]) -> str:
    return "\n".join(
        [
            "Qwen visual LayoutSpec:",
            json.dumps(layout_spec, ensure_ascii=False, indent=2),
            "Use this as screenshot-derived structure only. Core task and Required details own product/domain copy, CTAs, state model, and interaction logic. Scenario template is fallback guidance only.",
        ]
    )


def _build_qwen_prompt(
    scenario: str,
    core_task: str,
    required_details: str,
    retry: bool = False,
) -> str:
    retry_instruction = (
        "\nYour previous answer did not include enough regions. Re-analyze the screenshot and output "
        f"at least {MIN_REGION_COUNT} regions that actually exist in the image. Do not invent app regions."
        if retry
        else ""
    )
    return f"""
You are FlowCraft's Reference Analyzer Agent.

Analyze only what is visibly present in the screenshot. This stage is deliberately
independent from the target business scenario. The eventual scenario is
"{scenario}", but it must not influence region detection, geometry, hierarchy,
or design tokens. Do not invent a hero, sidebar, utility rail, card grid, or other
region unless it is visibly present.

Return one compact JSON object with exactly these keys:
- layoutPattern: short name for the dominant layout pattern.
- viewport: desktop, mobile, or mixed.
- canvas: object with aspectRatio and dominantGrid.
- visualStyle: object with surface, contrast, density, typography, radius, borders,
  shadows, whitespaceRatio, and alignment.
- colorSystem: object with background, surface, text, mutedText, border, accent,
  success, warning, and colorUsage.
- typography: object with headingScale, bodyScale, weights, lineHeight, and letterSpacing.
- spacing: object with baseUnit, sectionGap, controlGap, rowHeight, and contentPadding.
- regions: array of major visible regions. It must contain at least {MIN_REGION_COUNT}
  items. Each region must include id, position, approximateSize, visualRole,
  detectedElements, normalizedFrame, hierarchy, and lockPriority.
  normalizedFrame must contain x, y, width, and height as numbers from 0 to 1.
  lockPriority must be high, medium, or low. Use high for composition-defining
  regions whose position and size should survive adaptation.
- componentInventory: array of visible component families with shape and density.
- visualHierarchy: ordered array from the strongest visual anchor to the weakest.
- interactionCues: visible controls or states implied by the screenshot.
- constraints: concrete rules needed to reproduce the screenshot's composition.

The regions array is mandatory. Never return an empty regions array.
Describe the screenshot rather than the target product. Do not emit transfer roles
or target-domain components. Only return JSON. Keep it concise and practical for
code generation.
{retry_instruction}
""".strip()


async def _call_qwen_layout(
    image: str,
    scenario: str,
    core_task: str,
    required_details: str,
    retry: bool,
) -> dict[str, Any]:
    prompt = _build_qwen_prompt(
        scenario,
        core_task,
        required_details,
        retry=retry,
    )
    payload = {
        "model": QWEN_VISION_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": image},
                    },
                ],
            }
        ],
        "temperature": 0.1,
        "max_tokens": 2200,
    }

    async with httpx.AsyncClient(timeout=45) as client:
        response = await client.post(
            f"{QWEN_VISION_BASE_URL.rstrip('/')}/chat/completions",
            headers={
                "Authorization": f"Bearer {DASHSCOPE_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        response.raise_for_status()

    data = response.json()
    content = (
        data.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
        .strip()
    )
    return _parse_layout_spec(content)


@router.post("/api/flowcraft/analyze-reference", response_model=FlowCraftVisualAnalyzeResponse)
async def analyze_flowcraft_reference(
    request: FlowCraftVisualAnalyzeRequest,
) -> FlowCraftVisualAnalyzeResponse:
    if not DASHSCOPE_API_KEY:
        return FlowCraftVisualAnalyzeResponse(
            enabled=False,
            provider="qwen",
            model=QWEN_VISION_MODEL,
            notes="",
            error="DASHSCOPE_API_KEY is not configured.",
        )

    try:
        layout_spec = await _call_qwen_layout(
            request.image,
            request.scenario,
            request.core_task,
            request.required_details,
            retry=False,
        )
        validation_notes = [
            f"first_pass_regions={_region_count(layout_spec)}",
            f"first_pass_usable_regions={_usable_region_count(layout_spec)}",
        ]
        if _usable_region_count(layout_spec) < MIN_REGION_COUNT:
            retry_spec = await _call_qwen_layout(
                request.image,
                request.scenario,
                request.core_task,
                request.required_details,
                retry=True,
            )
            validation_notes.append(f"retry_regions={_region_count(retry_spec)}")
            validation_notes.append(
                f"retry_usable_regions={_usable_region_count(retry_spec)}"
            )
            if _usable_region_count(retry_spec) > _usable_region_count(layout_spec):
                layout_spec = retry_spec
        if _is_dense_grid_layout(layout_spec):
            reason = "; ".join(validation_notes + ["normalized=dense_grid"])
            layout_spec = _fallback_layout_spec(
                request.scenario,
                request.core_task,
                reason,
                layout_spec,
            )
            validation_notes.append("normalized=dense_grid")
        elif _usable_region_count(layout_spec) < MIN_REGION_COUNT:
            reason = "; ".join(validation_notes)
            fallback_spec = _fallback_layout_spec(
                request.scenario,
                request.core_task,
                reason,
                layout_spec,
            )
            fallback_spec["qwenRawLayoutSpec"] = layout_spec
            layout_spec = fallback_spec
            validation_notes.append("fallback=local_layout_spec")
        layout_spec["analysisValidation"] = validation_notes
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Qwen visual analysis failed: {exc.response.text[:500]}",
        ) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Qwen visual analysis request failed: {exc}",
        ) from exc

    notes = _format_layout_notes(layout_spec)
    return FlowCraftVisualAnalyzeResponse(
        enabled=True,
        provider="qwen",
        model=QWEN_VISION_MODEL,
        notes=notes,
        layoutSpec=layout_spec,
    )
