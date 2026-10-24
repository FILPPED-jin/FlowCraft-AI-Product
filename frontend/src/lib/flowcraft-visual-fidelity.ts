import { FlowCraftLayoutSpec } from "./flowcraft";
export interface VisualStructureFingerprint {
  aspectRatio: number;
  luminanceGrid: number[];
  saturationGrid: number[];
  edgeGrid: number[];
  whitespaceGrid: number[];
}
export interface VisualFidelityScore {
  overall: number;
  composition: number;
  colorDistribution: number;
  density: number;
  whitespace: number;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function similarity(a: number[], b: number[], tolerance: number) {
  if (!a.length || a.length !== b.length) return 0;
  const distance = a.reduce(
    (sum, value, index) => sum + Math.min(1, Math.abs(value - b[index]) / tolerance),
    0
  );
  return clampScore((1 - distance / a.length) * 100);
}

export function compareVisualFingerprints(
  reference: VisualStructureFingerprint,
  generated: VisualStructureFingerprint
): VisualFidelityScore {
  const composition = similarity(reference.edgeGrid, generated.edgeGrid, 0.28);
  const colorDistribution = Math.round(
    (similarity(reference.luminanceGrid, generated.luminanceGrid, 0.32) +
      similarity(reference.saturationGrid, generated.saturationGrid, 0.28)) /
      2
  );
  const density = similarity(reference.edgeGrid, generated.edgeGrid, 0.18);
  const whitespace = similarity(
    reference.whitespaceGrid,
    generated.whitespaceGrid,
    0.34
  );
  const aspectScore = clampScore(
    (1 -
      Math.min(
        1,
        Math.abs(reference.aspectRatio - generated.aspectRatio) /
          Math.max(reference.aspectRatio, generated.aspectRatio, 0.01)
      )) *
      100
  );

  return {
    composition,
    colorDistribution,
    density,
    whitespace,
    overall: clampScore(
      composition * 0.32 +
        colorDistribution * 0.2 +
        density * 0.2 +
        whitespace * 0.18 +
        aspectScore * 0.1
    ),
  };
}

function channelSaturation(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

export function fingerprintImageData(
  image: ImageData,
  columns = 4,
  rows = 4
): VisualStructureFingerprint {
  const luminanceGrid: number[] = [];
  const saturationGrid: number[] = [];
  const edgeGrid: number[] = [];
  const whitespaceGrid: number[] = [];
  const { width, height, data } = image;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x0 = Math.floor((column / columns) * width);
      const x1 = Math.max(x0 + 1, Math.floor(((column + 1) / columns) * width));
      const y0 = Math.floor((row / rows) * height);
      const y1 = Math.max(y0 + 1, Math.floor(((row + 1) / rows) * height));
      let luminance = 0;
      let saturation = 0;
      let edges = 0;
      let whitespace = 0;
      let count = 0;

      for (let y = y0; y < y1; y += 2) {
        for (let x = x0; x < x1; x += 2) {
          const index = (y * width + x) * 4;
          const r = data[index] / 255;
          const g = data[index + 1] / 255;
          const b = data[index + 2] / 255;
          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          luminance += lum;
          saturation += channelSaturation(r, g, b);
          if (lum > 0.94 && channelSaturation(r, g, b) < 0.08) whitespace += 1;

          if (x + 2 < width) {
            const next = index + 8;
            const delta =
              Math.abs(data[index] - data[next]) +
              Math.abs(data[index + 1] - data[next + 1]) +
              Math.abs(data[index + 2] - data[next + 2]);
            if (delta > 90) edges += 1;
          }
          count += 1;
        }
      }

      luminanceGrid.push(luminance / Math.max(1, count));
      saturationGrid.push(saturation / Math.max(1, count));
      edgeGrid.push(edges / Math.max(1, count));
      whitespaceGrid.push(whitespace / Math.max(1, count));
    }
  }

  return {
    aspectRatio: width / Math.max(1, height),
    luminanceGrid,
    saturationGrid,
    edgeGrid,
    whitespaceGrid,
  };
}

export function evaluateDesignSystemConsistency(
  html: string,
  spec: FlowCraftLayoutSpec
) {
  const source = html.toLowerCase();
  const checks = [
    {
      id: "layout-geometry",
      passed: spec.regions
        .filter((region) => region.lockPriority === "high")
        .every((region) => region.normalizedFrame),
    },
    {
      id: "typography",
      passed: !!spec.typography && /font-size|font:/.test(source),
    },
    {
      id: "spacing",
      passed: !!spec.spacing && /gap:|padding:|margin:/.test(source),
    },
    {
      id: "color-system",
      passed: !!spec.colorSystem && /#[0-9a-f]{3,8}|rgb\(/.test(source),
    },
    {
      id: "component-density",
      passed:
        spec.componentInventory.length === 0 ||
        (source.match(/<button|<input|<select|<table|class=["'][^"']*(row|tab|menu)/g)
          ?.length ?? 0) >= Math.min(4, spec.componentInventory.length),
    },
  ];

  return {
    score: clampScore(
      (checks.filter((check) => check.passed).length / checks.length) * 100
    ),
    checks,
  };
}

