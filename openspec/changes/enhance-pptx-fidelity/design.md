# Design: PPTX Fidelity & Animations

## 1. Advanced PPTX Extraction Model

### Data Structure (`DetailedSlide`)
We need a structure that represents the visual state of a slide independent of the source (PPTX).

```typescript
interface UniversalSlideElement {
  id: string;
  type: 'text' | 'image' | 'shape';
  layout: {
    x: number; // percentage or px
    y: number;
    width: number;
    height: number;
    rotation: number;
    zIndex: number;
  };
  style: {
    // Text specific
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    color?: string;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    // Shape/General
    backgroundColor?: string;
    opacity?: number;
    borderRadius?: number;
    shadow?: string;
  };
  content: {
    text?: string;
    src?: string; // for images
    html?: string; // for rich text if needed
  };
  animations: {
    in?: AnimationDef;
    emphasis?: AnimationDef;
    out?: AnimationDef;
  }[];
}

interface AnimationDef {
  type: 'fade' | 'slide' | 'zoom' | 'wipe';
  duration: number; // seconds
  delay: number; // seconds
  easing?: string;
  params?: Record<string, any>; // direction, scale, etc.
}
```

## 2. Parsing Logic Updates

### `pptx-processor-real.ts`
Current logic only extracts `content` string.
New logic must:
1.  Iterate `p:spTree` (Shape Tree).
2.  For each shape (`p:sp`), extract `a:off` (offset) and `a:ext` (extension) for layout.
3.  Extract `a:rPr` (Run Properties) for font styles.
4.  Map these to `UniversalSlideElement`.

### `layout-parser.ts`
Refactor `extractLayoutElements` to be the primary extractor, not just a layout detector. It needs to return the full `UniversalSlideElement` array.

## 3. Remotion Architecture

### `UniversalSlide.tsx`
A new Remotion component that takes `elements: UniversalSlideElement[]` prop.
It renders a container `AbsoluteFill`.
It maps each element to a `div` (or `Img`) with `absolute` positioning.

### Animation Handling
Inside `UniversalSlide`, each element is wrapped in an `AnimatedWrapper`.
`AnimatedWrapper` uses `useCurrentFrame` and `interpolate` based on the `animations` prop.

```typescript
const AnimatedWrapper = ({ animation, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Logic to calculate opacity/transform based on animation type and relative frame
  // ...
  return <div style={animatedStyle}>{children}</div>;
}
```

## 4. TTS Synchronization Flow

1.  **Extraction**: Extract notes.
2.  **Generation**: Send notes to TTS API (ElevenLabs/OpenAI). Receive Audio Buffer/URL + Duration.
3.  **Timeline Creation**:
    *   Set Slide Duration = `Math.max(AudioDuration, MinimumSlideTime)`.
    *   Update `UniversalSlide` props with audio URL.
4.  **Render**: Remotion `<Audio src={slide.audioUrl} />`.

## 5. Pre-Render Editing

Expose the JSON of `ProcessedProject` (containing the `UniversalSlideElement` arrays) to the frontend.
The user modifies this JSON (via a UI wrapper).
The backend uses the *modified* JSON to generate the Remotion bundle.
