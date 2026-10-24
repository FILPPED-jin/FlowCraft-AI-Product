from openai.types.chat import ChatCompletionContentPartParam, ChatCompletionMessageParam
from prompts.prompt_types import Stack
from prompts import system_prompt
from prompts.design_system import build_design_system_prompt_block
from prompts.flowcraft import is_flowcraft_prompt
from prompts.policies import build_selected_stack_policy, build_user_image_policy


def build_video_prompt_messages(
    video_data_url: str,
    stack: Stack,
    text_prompt: str,
    image_generation_enabled: bool,
    design_system: str | None = None,
) -> list[ChatCompletionMessageParam]:
    image_policy = build_user_image_policy(image_generation_enabled)
    selected_stack = build_selected_stack_policy(stack)
    design_system_block = build_design_system_prompt_block(design_system)
    if is_flowcraft_prompt(text_prompt):
        user_text = f"""
    You have been given a video or animated reference of a user interacting with a web app. Build a new FlowCraft interactive prototype inspired by it.

    - Watch the entire video carefully and understand the visible interactions and UI state changes.
    - Do not recreate the app exactly or copy it pixel-for-pixel.
    - Treat the video as reference material for visual language, motion rhythm, layout hierarchy, component behavior, and interaction affordances.
    - Recompose those cues around the FlowCraft scene, strategy, core task, and requirements from the additional instructions.
    - It is acceptable and expected to change structure, content, labels, and states when the selected scenario or strategy calls for it.
    - {image_policy}
    - If some functionality requires a backend call, just mock the data instead.
    - MAKE THE PROTOTYPE FUNCTIONAL using JavaScript. Include meaningful state changes, validation, feedback, and recovery paths.
    - Make the first viewport useful on both mobile and desktop: the hero title, primary action, and first meaningful content must be visible without relying on a large empty background area.
    - Before finishing, mentally validate the generated code path: every object field referenced by JavaScript must exist in the seed data, every render function must be reachable, and initial rendering must not depend on a user click.
    - If the prototype uses dynamic JavaScript rendering, include defensive defaults for optional fields and avoid reading nested properties unless the data definitely defines them.
    - Use SVGs and interactive 3D elements only when they serve the new prototype.

    Analyze this reference and generate the code.
    
    {selected_stack}
    {design_system_block}
    """
    else:
        user_text = f"""
    You have been given a video of a user interacting with a web app. You need to re-create the same app exactly such that the same user interactions will produce the same results in the app you build.

    - Watch the entire video carefully and understand all the user interactions and UI state changes.
    - Make sure the app looks exactly like what you see in the video.
    - Pay close attention to background color, text color, font size, font family,
    padding, margin, border, etc. Match the colors and sizes exactly.
    - {image_policy}
    - If some functionality requires a backend call, just mock the data instead.
    - MAKE THE APP FUNCTIONAL using JavaScript. Allow the user to interact with the app and get the same behavior as shown in the video.
    - Use SVGs and interactive 3D elements if needed to match the functionality shown in the video.

    Analyze this video and generate the code.
    
    {selected_stack}
    {design_system_block}
    """
    if text_prompt.strip():
        user_text = user_text + "\n\nAdditional instructions: " + text_prompt

    user_content: list[ChatCompletionContentPartParam] = [
        {
            "type": "image_url",
            "image_url": {"url": video_data_url, "detail": "high"},
        },
        {
            "type": "text",
            "text": user_text,
        },
    ]

    return [
        {
            "role": "system",
            "content": system_prompt.SYSTEM_PROMPT,
        },
        {
            "role": "user",
            "content": user_content,
        },
    ]
