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
 * read() returns the latest face ({ x, y, shapes }) or null; it never blocks.
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
    latest = { x: sx / pts.length, y: sy / pts.length, shapes };
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
