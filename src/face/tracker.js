/**
 * RabinAI Face — the camera and MediaPipe Face Landmarker.
 *
 * Everything here runs on the visitor's device. The video never leaves the
 * page: frames go from the <video> element into a WebAssembly model in this
 * tab and come out as numbers (a face position and 52 expression scores).
 * What IS downloaded is the model code and weights, once — from jsDelivr and
 * Google's model bucket — which is why the page says "nothing leaves" about
 * the video and does not claim the page makes no requests.
 *
 * Loaded with a dynamic import, so nobody who never turns the camera on pays
 * for the ~1MB of JS (plus wasm and the ~4MB model).
 */

// Pinned to the installed package so the wasm and the JS always match.
const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

/**
 * Start the camera and the landmarker. Resolves to { read(), stop() }.
 * read() returns the latest face ({ x, y, roll, shapes }) or null; it never blocks.
 * Throws a DOMException named NotAllowedError when the visitor says no.
 */
export async function startTracker(video) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  });
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();

  let landmarker;
  try {
    const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
    const opts = (delegate) => ({
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: true,
    });
    // GPU when the browser allows it; some (older Safari, locked-down GPUs)
    // refuse, and CPU is still comfortably real time for one face.
    try { landmarker = await FaceLandmarker.createFromOptions(fileset, opts('GPU')); }
    catch { landmarker = await FaceLandmarker.createFromOptions(fileset, opts('CPU')); }
  } catch (err) {
    stream.getTracks().forEach((tr) => tr.stop());
    throw err;
  }

  let latest = null;
  let lastVideoTime = -1;
  let stopped = false;

  // Tongue, by colour. MediaPipe's own tongueOut score barely moves on most
  // faces, so look at the pixels: when the lips are apart, the gap between
  // them is normally DARK (the inside of the mouth) or WHITE (teeth). A tongue
  // fills it with pink-red. Sampling only INSIDE the gap means lipstick and
  // lip colour never count. A 16x8 sample per frame, in this tab, never sent.
  const sample = document.createElement('canvas');
  sample.width = 16; sample.height = 8;
  const sctx = sample.getContext('2d', { willReadFrequently: true });
  function tongueColour(pts) {
    const up = pts[13], lo = pts[14], l = pts[78], r = pts[308], e1 = pts[33], e2 = pts[263];
    if (!up || !lo || !l || !r || !e1 || !e2) return 0;
    const W = video.videoWidth, H = video.videoHeight;
    const eyeSpan = Math.hypot((e2.x - e1.x) * W, (e2.y - e1.y) * H);
    const gap = (lo.y - up.y) * H;
    if (gap < eyeSpan * 0.06) return 0;                     // lips together: nothing to see
    const mouthW = Math.abs(r.x - l.x) * W;
    const cx = ((up.x + lo.x) / 2) * W, cy = ((up.y + lo.y) / 2) * H;
    const sw = mouthW * 0.45, sh = gap * 0.7;
    // The camera image is not mirrored and neither is this sample, so the
    // coordinates map straight across.
    sctx.drawImage(video, cx - sw / 2, cy - sh / 2, sw, sh, 0, 0, 16, 8);
    const d = sctx.getImageData(0, 0, 16, 8).data;
    let hits = 0;
    for (let i = 0; i < d.length; i += 4) {
      const R = d[i], G = d[i + 1], B = d[i + 2];
      // Tongue-coloured: lit (not the dark cavity), red well above green and
      // above blue (not white teeth, which are R≈G≈B).
      if (R > 80 && R - G > 30 && R > G * 1.3 && R > B * 1.1) hits++;
    }
    return hits / (d.length / 4);
  }

  // Detect only on a new video frame. The render loop runs at the display's
  // rate (often 120Hz); the camera gives ~30, and re-detecting the same frame
  // is pure waste on a phone.
  function read() {
    if (stopped || video.readyState < 2) return latest;
    if (video.currentTime === lastVideoTime) return latest;
    lastVideoTime = video.currentTime;
    const r = landmarker.detectForVideo(video, performance.now());
    const pts = r.faceLandmarks?.[0];
    if (!pts) { latest = null; return null; }
    // Face centre: the mean of the landmarks is steadier than any one point.
    let sx = 0, sy = 0;
    for (const p of pts) { sx += p.x; sy += p.y; }
    const shapes = {};
    for (const c of r.faceBlendshapes?.[0]?.categories ?? []) shapes[c.categoryName] = c.score;
    // Head tilt (roll) from the outer eye corners: 33 is the visitor's right
    // eye (image left), 263 their left (image right). Level head = 0. Tilting
    // toward their RIGHT shoulder drops 33, which makes this negative.
    // In pixels, not 0..1 units: x and y are normalised to different lengths on
    // a 4:3 camera, and the angle would come out squashed.
    const a = pts[33], b = pts[263];
    const roll = a && b
      ? Math.atan2((b.y - a.y) * video.videoHeight, (b.x - a.x) * video.videoWidth) : 0;
    try { shapes.tongueColour = tongueColour(pts); } catch { shapes.tongueColour = 0; }
    latest = { x: sx / pts.length, y: sy / pts.length, roll, shapes };
    return latest;
  }

  function stop() {
    stopped = true;
    stream.getTracks().forEach((tr) => tr.stop());   // the camera light goes out
    video.srcObject = null;
    landmarker?.close();
  }

  return { read, stop };
}
