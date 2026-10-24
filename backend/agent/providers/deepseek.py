import asyncio
import re
from typing import Any, Dict, List, Optional

from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionMessageParam

from agent.providers.base import EventSink, ExecutedToolCall, ProviderTurn, StreamEvent
from costs.token_usage import TokenUsage
from fs_logging.agent_runs import AgentRunRecorder
from fs_logging.prompt_reports import PromptReportLogger
from codegen.utils import extract_html_content
from llm import Llm, get_deepseek_api_name


DEEPSEEK_REQUEST_TIMEOUT_SECONDS = 180


DEEPSEEK_SYSTEM_APPENDIX = """

# DeepSeek compatibility mode

You do not have access to tool calls in this mode. Return one complete standalone
HTML document directly in the assistant response.

Hard requirements:
- Return raw HTML only. Start with <!DOCTYPE html> and end with </html>.
- Do not wrap it in Markdown fences. Do not add explanation before or after the
  document.
- Use inline CSS and plain JavaScript. Do not depend on Tailwind CDN, external
  icon fonts, external fonts, or remote assets.
- Keep the document complete and reasonably compact. Prefer a polished,
  working prototype over decorative repetition, but do not flatten a rich
  reference into a sparse demo.
- Hard size target: keep the full HTML under 14,000 characters and under 240
  lines. Use enough structure to preserve the reference's visual richness.
- Avoid giant CSS resets, excessive repeated data, or lengthy inline SVG. Use
  compact placeholders only when they still preserve the layout rhythm.
- The document must include <!DOCTYPE html>, <html>, <body>, <main id="app">,
  and a closing </html>.
- The first viewport must show useful content on mobile and desktop.
- Include clickable controls, visible state changes, validation or warning
  states, and at least one success or confirmation state.
- Before finishing, check that every JavaScript selector and data field exists.
- Guard optional DOM lookups before calling classList, addEventListener, value,
  or textContent, especially for step indicators or sections that may not exist.
"""


def _extract_line(text: str, prefix: str) -> str:
    match = re.search(rf"^{re.escape(prefix)}.*$", text, re.MULTILINE)
    return match.group(0).strip() if match else ""


def _extract_block(text: str, prefix: str) -> str:
    start = text.find(prefix)
    if start < 0:
        return ""
    end = text.find("\n\n", start)
    return text[start:end if end > start else len(text)].strip()


def _compact_flowcraft_prompt_for_deepseek(text: str) -> str:
    if "You are FlowCraft AI" not in text:
        return text

    important_lines = [
        _extract_line(text, "Authority order"),
        _extract_line(text, "Conflict rule:"),
        _extract_line(text, "Core task:"),
        _extract_line(text, "Additional requirements:"),
        _extract_line(text, "Scenario template:"),
        _extract_line(text, "Primary CTAs:"),
        _extract_line(text, "Required interaction states:"),
        _extract_line(text, "Risk checks:"),
        _extract_line(text, "Layout migration contract:"),
        _extract_line(text, "Source-content guardrails:"),
        _extract_line(text, "Prototype structure requirements:"),
        _extract_line(text, "Reference fidelity mode:"),
        _extract_line(text, "ReferenceDesignSpecJSON:"),
        _extract_line(text, "SemanticMappingSpecJSON:"),
        _extract_block(text, "Visual notes from the screenshot:"),
    ]

    compact_context = "\n".join(line for line in important_lines if line)
    return f"""
Generate one compact standalone HTML prototype for FlowCraft.

Use the reference screenshot for layout skeleton and visual language only:
region structure, proportions, density, colors, surfaces, typography feel, and
button/card rhythm. Do not copy the screenshot's brand, business category,
headline, product names, CTA labels, or source-domain wording.

Authority order is mandatory: Core task > Additional requirements > screenshot
visual/layout evidence > scenario template suggestions. When sources conflict,
obey the higher-priority source. Never force template-specific products, pages,
entities, labels, CTAs, data models, or states into a user-defined task.

Use Core task and Additional requirements for all product semantics and
interactions. Map every large screenshot block to that user-defined flow. The
scenario template may fill genuine gaps only. For a hero + generator screenshot,
keep the useful visual structure but remap it to the Core task.

Never reuse source labels from detectedElements. They are evidence of component
type and density only. Replace every source title, tab, row, status, CTA, and
entity with content derived from Core task and Additional requirements.

When fidelity is faithful, normalized region frames, region order, whitespace
distribution, component density, type scale, border/radius treatment, and color
relationships are hard constraints. Do not add a sidebar, hero, utility rail,
card grid, or other large block absent from ReferenceDesignSpecJSON. Use
SemanticMappingSpecJSON to replace semantics inside the locked visual skeleton.

{compact_context}

DeepSeek output constraints:
- Return raw HTML only; start with <!DOCTYPE html> and end with </html>.
- Use inline CSS and vanilla JS only; no external assets, Tailwind CDN, icon
  fonts, markdown fences, comments, or explanatory text.
- Keep the whole file under 14,000 characters and under 240 lines.
- Preserve visual richness from the reference. Include hero, navigation,
  panels, tabs, tables, overlays, or supporting cards only when they are
  present in ReferenceDesignSpecJSON.
- Reproduce the reference's composition before decorating it. Match normalized
  frames and proportions with CSS grid/flex tracks; do not substitute a generic
  dashboard merely because the target task is SaaS.
- Include visible clickable state changes for the states required by the user brief.
- Do not reduce the product to a single form. Include failure/recovery and
  confirmation affordances where the Core task or Additional requirements call
  for them; include product, cart, or checkout only when the user brief asks.
- Before returning, audit that source terms such as Creati, go viral, video
  generator, create video, create image, ads agent, prompt, or render are gone
  unless the selected scenario explicitly needs them.
""".strip()


def _content_to_deepseek_content(content: Any) -> str | list[dict[str, Any]]:
    if isinstance(content, str):
        return _compact_flowcraft_prompt_for_deepseek(content)

    text_parts: List[str] = []
    content_parts: list[dict[str, Any]] = []
    if isinstance(content, list):
        for part in content:
            if not isinstance(part, dict):
                continue
            if part.get("type") == "text":
                text = _compact_flowcraft_prompt_for_deepseek(str(part.get("text", "")))
                text_parts.append(text)
                content_parts.append({"type": "text", "text": text})
            elif part.get("type") == "image_url":
                image_url = part.get("image_url")
                if isinstance(image_url, dict) and image_url.get("url"):
                    content_parts.append(
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": image_url.get("url"),
                                "detail": image_url.get("detail", "high"),
                            },
                        }
                    )

    combined_text = "\n\n".join(part for part in text_parts if part)
    if "Generate one compact standalone HTML prototype for FlowCraft." in combined_text:
        # Qwen has already converted the reference into ReferenceDesignSpecJSON.
        # Hiding source pixels here prevents the generator from copying source
        # labels while keeping its structural evidence intact.
        return combined_text
    return content_parts if content_parts else combined_text


def _to_deepseek_messages(
    prompt_messages: list[ChatCompletionMessageParam],
) -> list[dict[str, Any]]:
    messages: list[dict[str, Any]] = []
    for message in prompt_messages:
        role = str(message.get("role", "user"))
        if role not in {"system", "user", "assistant"}:
            role = "user"
        content = _content_to_deepseek_content(message.get("content", ""))
        has_content = (
            bool(content.strip())
            if isinstance(content, str)
            else any(part.get("type") == "text" and str(part.get("text", "")).strip() for part in content)
            or any(part.get("type") == "image_url" for part in content)
        )
        if not has_content:
            continue
        if role == "system":
            text_content = content if isinstance(content, str) else "\n\n".join(
                str(part.get("text", "")) for part in content if part.get("type") == "text"
            )
            content = f"{text_content.rstrip()}\n{DEEPSEEK_SYSTEM_APPENDIX}"
        messages.append({"role": role, "content": content})

    if not any(message["role"] == "system" for message in messages):
        messages.insert(
            0,
            {
                "role": "system",
                "content": DEEPSEEK_SYSTEM_APPENDIX.strip(),
            },
        )
    return messages


def _looks_complete_html(text: str) -> bool:
    lowered = text.lower()
    return (
        "<html" in lowered
        and "<body" in lowered
        and "</body>" in lowered
        and "</html>" in lowered
    )


def _extract_complete_html(text: str) -> str:
    html = extract_html_content(text).strip()
    if _looks_complete_html(html):
        return html
    text = text.strip()
    if _looks_complete_html(text):
        return text
    return ""


class DeepSeekProviderSession:
    def __init__(
        self,
        client: AsyncOpenAI,
        model: Llm,
        prompt_messages: list[ChatCompletionMessageParam],
        recorder: Optional[AgentRunRecorder] = None,
    ):
        self._client = client
        self._model = model
        self._messages = _to_deepseek_messages(prompt_messages)
        self._total_usage = TokenUsage()
        self._recorder = recorder
        self._prompt_report_logger = PromptReportLogger(
            provider="deepseek",
            model=model,
            api_model_name=get_deepseek_api_name(model),
        )

    async def stream_turn(self, on_event: EventSink) -> ProviderTurn:
        model_name = get_deepseek_api_name(self._model)
        params: Dict[str, Any] = {
            "model": model_name,
            "messages": self._messages,
            "stream": True,
            # FlowCraft needs the complete HTML in delta.content. DeepSeek
            "temperature": 0.25,
            "max_tokens": 20000,
        }
        self._prompt_report_logger.record_request(params)
        if self._recorder is not None:
            self._recorder.record_llm_request("deepseek", model_name, params)

        assistant_text = await self._stream_chat_completion(params, on_event)

        html = _extract_complete_html(assistant_text)

        if not html:
            repair_messages = [
                *self._messages,
                {
                    "role": "user",
                    "content": (
                        "The previous response was incomplete or malformed. "
                        "Regenerate from scratch as a much shorter complete "
                        "standalone HTML document under 14,000 characters. "
                        "Use inline CSS and plain JS, a polished app surface, "
                        "no external assets, no comments, and no decorative repetition. "
                        "Preserve the reference's major regions and include the "
                        "scenario's key flow states. "
                        "Return only raw HTML, start with <!DOCTYPE html>, include "
                        "<main id=\"app\">, and end with </html>."
                    ),
                },
            ]
            repair_params = {
                **params,
                "messages": repair_messages,
                "max_tokens": 20000,
            }
            assistant_text = await self._stream_chat_completion(repair_params, on_event)
            html = _extract_complete_html(assistant_text)

        if not html:
            raise Exception(
                "DeepSeek returned incomplete HTML after retry. Please try again "
                "with a shorter brief or fewer required states."
            )

        if self._recorder is not None:
            self._recorder.record_llm_response(html, [], self._total_usage)
        return ProviderTurn(assistant_text=html, tool_calls=[])

    async def _stream_chat_completion(
        self,
        params: Dict[str, Any],
        on_event: EventSink,
    ) -> str:
        try:
            return await asyncio.wait_for(
                self._stream_chat_completion_unbounded(params, on_event),
                timeout=DEEPSEEK_REQUEST_TIMEOUT_SECONDS,
            )
        except asyncio.TimeoutError as exc:
            raise TimeoutError(
                "DeepSeek generation timed out after "
                f"{DEEPSEEK_REQUEST_TIMEOUT_SECONDS} seconds. Please try again."
            ) from exc

    async def _stream_chat_completion_unbounded(
        self,
        params: Dict[str, Any],
        on_event: EventSink,
    ) -> str:
        chunks: list[str] = []
        stream = await self._client.chat.completions.create(**params)
        async for event in stream:
            choice = event.choices[0] if event.choices else None
            delta = choice.delta.content if choice and choice.delta else None
            if delta:
                chunks.append(delta)
                await on_event(StreamEvent(type="assistant_delta", text=delta))
            usage = getattr(event, "usage", None)
            if usage:
                self._accumulate_usage(usage)
        return "".join(chunks)

    def _accumulate_usage(self, usage: Any) -> None:
        self._total_usage.accumulate(
            TokenUsage(
                input=getattr(usage, "prompt_tokens", 0) or 0,
                output=getattr(usage, "completion_tokens", 0) or 0,
                total=getattr(usage, "total_tokens", 0) or 0,
            )
        )

    async def append_tool_results(
        self,
        turn: ProviderTurn,
        executed_tool_calls: list[ExecutedToolCall],
    ) -> None:
        return None

    def total_cost_usd(self) -> float | None:
        return None

    async def close(self) -> None:
        await self._client.close()
