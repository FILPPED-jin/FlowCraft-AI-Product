interface ColorSample {
  r: number;
  g: number;
  b: number;
}

interface RegionStats {
  label: string;
  average: ColorSample;
  darkRatio: number;
  saturationRatio: number;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load reference image."));
    image.src = dataUrl;
  });
}

function luminance({ r, g, b }: ColorSample) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function saturation({ r, g, b }: ColorSample) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  if (max === 0) return 0;
  return (max - min) / max;
}

function colorToHex({ r, g, b }: ColorSample) {
  return `#${[r, g, b]
    .map((value) => Math.round(value).toString(16).padStart(2, "0"))
    .join("")}`;
}

function colorName(color: ColorSample) {
  const { r, g, b } = color;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 24) return luminance(color) < 0.35 ? "charcoal" : "neutral";
  if (g > r + 24 && g > b + 12) return "green";
  if (b > r + 20 && b > g + 8) return "blue";
  if (r > 120 && b > 100 && g < Math.max(r, b) - 10) return "purple";
  if (r > g + 25 && g > b + 10) return "amber";
  if (r > g + 20 && r > b + 20) return "red";
  return "accent";
}

function summarizeRegion(
  pixels: Uint8ClampedArray,
  width: number,
  xStart: number,
  xEnd: number,
  yStart: number,
  yEnd: number,
  label: string
): RegionStats {
  let r = 0;
  let g = 0;
  let b = 0;
  let dark = 0;
  let saturated = 0;
  let count = 0;

  for (let y = yStart; y < yEnd; y += 1) {
    for (let x = xStart; x < xEnd; x += 1) {
      const index = (y * width + x) * 4;
      const sample = {
        r: pixels[index],
        g: pixels[index + 1],
        b: pixels[index + 2],
      };
      r += sample.r;
      g += sample.g;
      b += sample.b;
      if (luminance(sample) < 0.32) dark += 1;
      if (saturation(sample) > 0.42 && luminance(sample) > 0.18) {
        saturated += 1;
      }
      count += 1;
    }
  }

  return {
    label,
    average: {
      r: r / count,
      g: g / count,
      b: b / count,
    },
    darkRatio: dark / count,
    saturationRatio: saturated / count,
  };
}

function pickAccentColors(pixels: Uint8ClampedArray) {
  const buckets = new Map<string, { color: ColorSample; score: number }>();

  for (let index = 0; index < pixels.length; index += 16) {
    const sample = {
      r: pixels[index],
      g: pixels[index + 1],
      b: pixels[index + 2],
    };
    const sat = saturation(sample);
    const lum = luminance(sample);
    if (sat < 0.35 || lum < 0.12 || lum > 0.88) continue;

    const bucketColor = {
      r: Math.round(sample.r / 32) * 32,
      g: Math.round(sample.g / 32) * 32,
      b: Math.round(sample.b / 32) * 32,
    };
    const key = colorToHex(bucketColor);
    const existing = buckets.get(key);
    const score = sat * (1 - Math.abs(lum - 0.45));
    buckets.set(key, {
      color: bucketColor,
      score: (existing?.score ?? 0) + score,
    });
  }

  return [...buckets.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((bucket) => `${colorName(bucket.color)} ${colorToHex(bucket.color)}`);
}

export async function analyzeFlowCraftReferenceImage(dataUrl: string) {
  try {
    const image = await loadImage(dataUrl);
    const width = 96;
    const height = Math.max(48, Math.round((image.naturalHeight / image.naturalWidth) * width));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return "";

    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    const regions = [
      summarizeRegion(pixels, width, 0, width, 0, Math.round(height * 0.12), "top navigation"),
      summarizeRegion(pixels, width, 0, Math.round(width * 0.24), 0, height, "left panel"),
      summarizeRegion(
        pixels,
        width,
        Math.round(width * 0.24),
        Math.round(width * 0.76),
        Math.round(height * 0.12),
        Math.round(height * 0.88),
        "central content"
      ),
      summarizeRegion(pixels, width, Math.round(width * 0.76), width, 0, height, "right panel"),
      summarizeRegion(pixels, width, 0, width, Math.round(height * 0.88), height, "bottom action bar"),
    ];
    const globalStats = summarizeRegion(pixels, width, 0, width, 0, height, "whole screenshot");
    const accents = pickAccentColors(pixels);
    const aspect =
      image.naturalWidth / Math.max(1, image.naturalHeight) > 1.35
        ? "wide desktop"
        : image.naturalWidth / Math.max(1, image.naturalHeight) < 0.85
          ? "mobile/tall"
          : "balanced";
    const surface =
      globalStats.darkRatio > 0.55
        ? "dark high-contrast app shell"
        : globalStats.darkRatio < 0.25
          ? "light interface"
          : "mixed light/dark interface";
    const activeRegions = regions
      .filter((region) => region.darkRatio > 0.45 || region.saturationRatio > 0.04)
      .map(
        (region) =>
          `${region.label} (${colorName(region.average)} ${colorToHex(region.average)})`
      );

    return [
      "Automated reference visual analysis:",
      `- Composition: ${aspect}; ${surface}.`,
      `- Layout slots detected: ${activeRegions.join("; ")}.`,
      "- Use these regions as a structural skeleton only. Do not copy the source brand, source headline, source product category, or source CTA semantics from the screenshot.",
      "- Layout transfer rule: keep comparable region proportions, density, contrast, and component rhythm; remap every region to the selected FlowCraft scenario's domain and interaction steps.",
      accents.length > 0
        ? `- Accent colors detected: ${accents.join(", ")}. Keep a similar accent relationship.`
        : "",
      "- Translation instruction: screenshot = layout and visual language; FlowCraft scenario = text, entities, CTAs, state model, and interaction logic.",
    ]
      .filter(Boolean)
      .join("\n");
  } catch {
    return "";
  }
}

