import base64
import os
import tempfile

import requests
from deepface import DeepFace
from flask import Flask, jsonify, request

app = Flask(__name__)

# Shared secret so random people on the internet can't hit your verification
# endpoint for free. Set this in Render's environment variables and it must
# match the FACE_API_KEY you give Convex.
API_KEY = os.environ.get("FACE_API_KEY")

MODEL_NAME = "Facenet512"  # good accuracy/speed tradeoff; also try "ArcFace" or "VGG-Face"
DETECTOR_BACKEND = "retinaface"


def _check_auth():
    if not API_KEY:
        return True  # no key configured, e.g. local dev
    provided = request.headers.get("X-Api-Key")
    return provided == API_KEY


def _save_base64_to_tmp(b64_string: str) -> str:
    if b64_string.startswith("data:"):
        b64_string = b64_string.split(",", 1)[1]
    data = base64.b64decode(b64_string)
    fd, path = tempfile.mkstemp(suffix=".jpg")
    with os.fdopen(fd, "wb") as f:
        f.write(data)
    return path


def _save_url_to_tmp(url: str) -> str:
    resp = requests.get(url, timeout=15)
    resp.raise_for_status()
    fd, path = tempfile.mkstemp(suffix=".jpg")
    with os.fdopen(fd, "wb") as f:
        f.write(resp.content)
    return path


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/verify", methods=["POST"])
def verify():
    if not _check_auth():
        return jsonify({"error": "unauthorized"}), 401

    body = request.get_json(force=True, silent=True) or {}

    img1_path = None
    img2_path = None
    try:
        # img1 / img2 can each be provided as base64 ("img1", "img2") or a URL
        # ("img1_url", "img2_url"). The mobile app sends the live capture as
        # base64 and the enrolled reference photo as a Convex storage URL.
        if body.get("img1"):
            img1_path = _save_base64_to_tmp(body["img1"])
        elif body.get("img1_url"):
            img1_path = _save_url_to_tmp(body["img1_url"])
        else:
            return jsonify({"error": "img1 or img1_url is required"}), 400

        if body.get("img2"):
            img2_path = _save_base64_to_tmp(body["img2"])
        elif body.get("img2_url"):
            img2_path = _save_url_to_tmp(body["img2_url"])
        else:
            return jsonify({"error": "img2 or img2_url is required"}), 400

        result = DeepFace.verify(
            img1_path=img1_path,
            img2_path=img2_path,
            model_name=MODEL_NAME,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=True,
        )

        # DeepFace returns lower distance = more similar. Convert to a 0-100
        # confidence score that's easier for the app/UI to reason about.
        threshold = result.get("threshold", 0.3)
        distance = result.get("distance", 1.0)
        confidence = max(0.0, min(100.0, (1 - distance / (threshold * 2)) * 100))

        return jsonify(
            {
                "verified": bool(result.get("verified")),
                "distance": distance,
                "threshold": threshold,
                "confidence": round(confidence, 1),
                "model": MODEL_NAME,
            }
        )
    except ValueError as e:
        # Most commonly: "Face could not be detected"
        return jsonify({"verified": False, "confidence": 0, "error": str(e)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        for p in (img1_path, img2_path):
            if p and os.path.exists(p):
                os.remove(p)


@app.route("/verify-liveness", methods=["POST"])
def verify_liveness():
    """
    Active liveness + identity check.

    The client captures two frames: one facing forward ("frame1") and one
    after the user is prompted to turn their head left or right ("frame2").
    This defeats the simplest spoofing attempt (holding up a single static
    photo) because a photo can't "turn its head" between the two captures.

    It is NOT a defense against a video replay or a 3D mask — for that you'd
    want a dedicated liveness model. This is a lightweight, dependency-free
    check appropriate for a campus attendance app.
    """
    if not _check_auth():
        return jsonify({"error": "unauthorized"}), 401

    body = request.get_json(force=True, silent=True) or {}
    turn_direction = body.get("turn_direction", "right")  # "left" or "right"

    paths = {"frame1": None, "frame2": None, "reference": None}
    try:
        if not body.get("frame1") or not body.get("frame2"):
            return jsonify({"error": "frame1 and frame2 (base64) are required"}), 400
        if not body.get("reference_url"):
            return jsonify({"error": "reference_url is required"}), 400

        paths["frame1"] = _save_base64_to_tmp(body["frame1"])
        paths["frame2"] = _save_base64_to_tmp(body["frame2"])
        paths["reference"] = _save_url_to_tmp(body["reference_url"])

        # --- 1. Head-turn motion check ---
        yaw1 = _estimate_yaw_ratio(paths["frame1"])
        yaw2 = _estimate_yaw_ratio(paths["frame2"])

        if yaw1 is None or yaw2 is None:
            return jsonify(
                {"verified": False, "live": False, "confidence": 0,
                 "reason": "Could not locate a clear face in both frames."}
            ), 200

        delta = yaw2 - yaw1
        # Turning right should decrease the eye-distance ratio relative to
        # frame1 (or increase it for a left turn) — sign depends on camera
        # mirroring, so we just require a meaningfully large change in
        # *either* direction, past a noise threshold.
        MIN_YAW_DELTA = 0.06  # ~6% relative change in interpupillary distance
        moved_enough = abs(delta) >= MIN_YAW_DELTA

        if not moved_enough:
            return jsonify(
                {
                    "verified": False,
                    "live": False,
                    "confidence": 0,
                    "reason": "No head movement detected — please turn your head when prompted.",
                }
            ), 200

        # --- 2. Identity check: does either frame match the enrolled face? ---
        result1 = DeepFace.verify(
            img1_path=paths["frame1"],
            img2_path=paths["reference"],
            model_name=MODEL_NAME,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=True,
        )
        result2 = DeepFace.verify(
            img1_path=paths["frame2"],
            img2_path=paths["reference"],
            model_name=MODEL_NAME,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=True,
        )

        both_verified = bool(result1.get("verified")) and bool(result2.get("verified"))
        avg_distance = (result1.get("distance", 1.0) + result2.get("distance", 1.0)) / 2
        threshold = result1.get("threshold", 0.3)
        confidence = max(0.0, min(100.0, (1 - avg_distance / (threshold * 2)) * 100))

        return jsonify(
            {
                "verified": both_verified,
                "live": True,
                "confidence": round(confidence, 1),
                "yaw_delta": round(delta, 3),
                "reason": None if both_verified else "Face did not match enrolled record.",
            }
        )
    except ValueError as e:
        return jsonify({"verified": False, "live": False, "confidence": 0, "error": str(e)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        for p in paths.values():
            if p and os.path.exists(p):
                os.remove(p)


def _estimate_yaw_ratio(img_path: str):
    """
    Returns the interpupillary distance as a ratio of the detected face's
    bounding-box width. This shrinks as a head turns away from the camera
    (perspective foreshortening), which is enough to distinguish "the user
    turned their head" from "the same flat photo was shown twice".
    Returns None if a face/eyes couldn't be confidently located.
    """
    faces = DeepFace.extract_faces(
        img_path=img_path,
        detector_backend=DETECTOR_BACKEND,
        enforce_detection=False,
        align=False,
    )
    if not faces:
        return None

    face = faces[0]
    area = face.get("facial_area", {})
    left_eye = area.get("left_eye")
    right_eye = area.get("right_eye")
    width = area.get("w")

    if not left_eye or not right_eye or not width:
        return None

    eye_distance = ((left_eye[0] - right_eye[0]) ** 2 + (left_eye[1] - right_eye[1]) ** 2) ** 0.5
    return eye_distance / width



    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
