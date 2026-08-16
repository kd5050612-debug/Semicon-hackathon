from __future__ import annotations

import base64
import io
import os
import time
from functools import lru_cache
from pathlib import Path
from typing import Any, Annotated

import numpy as np
import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageOps, UnidentifiedImageError
from torch import nn


# ============================================================
# PROJECT / MODEL CONFIGURATION
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[1]

DEFAULT_MODEL_PATH = (
    PROJECT_ROOT / "Model_backend" / "SRCNN_Baseline.pth"
)

MODEL_PATH = Path(
    os.getenv("SRCNN_MODEL_PATH", DEFAULT_MODEL_PATH)
).resolve()

MAX_BATCH_SIZE = int(
    os.getenv("MAX_BATCH_SIZE", "8")
)

SCAN_MODE_MAX_DIMENSIONS = {
    "rapid": int(
        os.getenv("RAPID_MAX_INPUT_DIM", "384")
    ),
    "standard": int(
        os.getenv("STANDARD_MAX_INPUT_DIM", "512")
    ),
    "deep": int(
        os.getenv("DEEP_MAX_INPUT_DIM", "768")
    ),
}


# ============================================================
# SRCNN MODEL
# ============================================================

class SRCNN(nn.Module):
    def __init__(self) -> None:
        super().__init__()

        self.upsample = nn.Upsample(
            scale_factor=2,
            mode="bicubic",
            align_corners=False,
        )

        self.conv1 = nn.Conv2d(
            1,
            64,
            kernel_size=9,
            padding=4,
        )

        self.conv2 = nn.Conv2d(
            64,
            32,
            kernel_size=5,
            padding=2,
        )

        self.conv3 = nn.Conv2d(
            32,
            1,
            kernel_size=5,
            padding=2,
        )

        self.relu = nn.ReLU(inplace=True)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.upsample(x)
        x = self.relu(self.conv1(x))
        x = self.relu(self.conv2(x))

        return self.conv3(x)


# ============================================================
# MODEL SERVICE
# ============================================================

class ModelService:
    def __init__(self, model_path: Path) -> None:

        if not model_path.exists():
            raise FileNotFoundError(
                f"Model file not found: {model_path}"
            )

        self.model_path = model_path

        self.device = torch.device(
            "cuda"
            if torch.cuda.is_available()
            else "cpu"
        )

        self.model = SRCNN().to(self.device)

        checkpoint = torch.load(
            model_path,
            map_location=self.device,
        )

        state_dict = self._extract_state_dict(
            checkpoint
        )

        self.model.load_state_dict(state_dict)

        self.model.eval()

    @staticmethod
    def _extract_state_dict(
        checkpoint: Any,
    ) -> dict[str, torch.Tensor]:

        if not isinstance(checkpoint, dict):
            raise ValueError(
                "Unsupported model checkpoint format."
            )

        if "model_state_dict" in checkpoint:
            checkpoint = checkpoint[
                "model_state_dict"
            ]

        elif "state_dict" in checkpoint:
            checkpoint = checkpoint[
                "state_dict"
            ]

        return {
            key.removeprefix("module."): value
            for key, value in checkpoint.items()
            if isinstance(value, torch.Tensor)
        }

    def restore(
        self,
        source: np.ndarray,
    ) -> np.ndarray:

        tensor = (
            torch.from_numpy(source)
            .unsqueeze(0)
            .unsqueeze(0)
            .to(self.device)
        )

        with torch.inference_mode():

            restored = (
                self.model(tensor)
                .squeeze(0)
                .squeeze(0)
                .cpu()
                .numpy()
            )

        return np.clip(
            restored,
            0.0,
            1.0,
        )


# ============================================================
# MODEL LOADING
# ============================================================

@lru_cache(maxsize=1)
def get_model_service() -> ModelService:
    return ModelService(MODEL_PATH)


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="SEM SRCNN Restoration API",
    version="1.0.0",
    description=(
        "Backend API for semiconductor image "
        "restoration using SRCNN."
    ),
)


# ============================================================
# CORS CONFIGURATION
# ============================================================

# Production frontend
FRONTEND_URL = (
    "https://semiconductor-restorer.vercel.app"
)

# Local development frontend URLs
LOCAL_FRONTEND_URLS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        FRONTEND_URL,
        *LOCAL_FRONTEND_URLS,
    ],

    allow_credentials=False,

    allow_methods=[
        "*"
    ],

    allow_headers=[
        "*"
    ],
)


# ============================================================
# IMAGE NORMALIZATION
# ============================================================

def normalize_array(
    array: np.ndarray,
) -> np.ndarray:

    array = np.asarray(array)

    array = np.squeeze(array)

    if array.ndim == 3:

        if array.shape[0] in (1, 3, 4):
            array = np.moveaxis(
                array,
                0,
                -1,
            )

        array = (
            array[..., :3]
            .mean(axis=-1)
        )

    if array.ndim != 2:
        raise ValueError(
            "Expected a 2D grayscale image "
            "or a 3D image array."
        )

    array = np.nan_to_num(
        array.astype(np.float32),
        nan=0.0,
        posinf=0.0,
        neginf=0.0,
    )

    min_value = float(
        array.min()
    )

    max_value = float(
        array.max()
    )

    if (
        max_value <= 1.0
        and min_value >= 0.0
    ):
        return np.clip(
            array,
            0.0,
            1.0,
        )

    if (
        max_value <= 255.0
        and min_value >= 0.0
    ):
        return np.clip(
            array / 255.0,
            0.0,
            1.0,
        )

    if max_value == min_value:
        return np.zeros_like(
            array,
            dtype=np.float32,
        )

    return np.clip(
        (
            array - min_value
        )
        / (
            max_value - min_value
        ),
        0.0,
        1.0,
    )


# ============================================================
# READ UPLOADED FILE
# ============================================================

def read_upload_to_array(
    filename: str,
    content: bytes,
) -> np.ndarray:

    suffix = (
        Path(filename)
        .suffix
        .lower()
    )

    # ------------------------------------------
    # NumPy .npy files
    # ------------------------------------------

    if suffix == ".npy":

        try:

            loaded = np.load(
                io.BytesIO(content),
                allow_pickle=False,
            )

        except Exception as exc:

            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid NumPy file: {exc}"
                ),
            ) from exc

        return normalize_array(
            loaded
        )

    # ------------------------------------------
    # Image files
    # ------------------------------------------

    try:

        image = Image.open(
            io.BytesIO(content)
        )

        image = ImageOps.exif_transpose(
            image
        )

        image = image.convert("L")

    except UnidentifiedImageError as exc:

        raise HTTPException(
            status_code=400,
            detail=(
                "Upload must be an image "
                "or .npy file."
            ),
        ) from exc

    return normalize_array(
        np.asarray(image)
    )


# ============================================================
# SCAN MODE
# ============================================================

def max_dimension_for_scan_mode(
    scan_mode: str,
) -> int:

    return SCAN_MODE_MAX_DIMENSIONS.get(
        scan_mode.lower(),
        SCAN_MODE_MAX_DIMENSIONS[
            "standard"
        ],
    )


def resize_for_scan_mode(
    source: np.ndarray,
    scan_mode: str,
) -> tuple[
    np.ndarray,
    bool,
    int,
]:

    max_dimension = (
        max_dimension_for_scan_mode(
            scan_mode
        )
    )

    height, width = source.shape

    largest_side = max(
        height,
        width,
    )

    # No resizing required
    if largest_side <= max_dimension:

        return (
            source,
            False,
            max_dimension,
        )

    scale = (
        max_dimension
        / largest_side
    )

    target_size = (
        max(
            1,
            round(width * scale),
        ),
        max(
            1,
            round(height * scale),
        ),
    )

    image = Image.fromarray(
        (
            np.clip(
                source,
                0.0,
                1.0,
            )
            * 255.0
        )
        .round()
        .astype(np.uint8),
        mode="L",
    )

    resized = image.resize(
        target_size,
        Image.Resampling.BICUBIC,
    )

    return (
        normalize_array(
            np.asarray(resized)
        ),
        True,
        max_dimension,
    )


# ============================================================
# CONVERT ARRAY TO PNG DATA URL
# ============================================================

def array_to_png_data_url(
    array: np.ndarray,
) -> str:

    normalized = np.clip(
        array,
        0.0,
        1.0,
    )

    image = Image.fromarray(
        (
            normalized * 255.0
        )
        .round()
        .astype(np.uint8),
        mode="L",
    )

    buffer = io.BytesIO()

    image.save(
        buffer,
        format="PNG",
    )

    encoded = base64.b64encode(
        buffer.getvalue()
    ).decode("ascii")

    return (
        "data:image/png;base64,"
        + encoded
    )


# ============================================================
# RESTORE SINGLE IMAGE
# ============================================================

async def restore_upload(
    upload: UploadFile,
    scan_mode: str,
) -> dict[str, Any]:

    content = await upload.read()

    if not content:

        raise HTTPException(
            status_code=400,
            detail=(
                f"{upload.filename or 'File'} "
                "is empty."
            ),
        )

    filename = (
        upload.filename
        or "uploaded-image"
    )

    source = read_upload_to_array(
        filename,
        content,
    )

    original_shape = list(
        source.shape
    )

    (
        source,
        resized_for_speed,
        max_input_dimension,
    ) = resize_for_scan_mode(
        source,
        scan_mode,
    )

    # Load model
    model_service = (
        get_model_service()
    )

    # Measure inference time
    inference_start = (
        time.perf_counter()
    )

    restored = (
        model_service.restore(
            source
        )
    )

    inference_ms = round(
        (
            time.perf_counter()
            - inference_start
        )
        * 1000.0,
        1,
    )

    return {
        "filename": filename,

        "scan_mode": scan_mode,

        "model": (
            model_service
            .model_path
            .name
        ),

        "device": str(
            model_service.device
        ),

        "source_image": (
            array_to_png_data_url(
                source
            )
        ),

        "restored_image": (
            array_to_png_data_url(
                restored
            )
        ),

        "original_shape": (
            original_shape
        ),

        "input_shape": list(
            source.shape
        ),

        "output_shape": list(
            restored.shape
        ),

        "resized_for_speed": (
            resized_for_speed
        ),

        "max_input_dimension": (
            max_input_dimension
        ),

        "inference_ms": (
            inference_ms
        ),

        "stats": {
            "input_min": float(
                source.min()
            ),

            "input_max": float(
                source.max()
            ),

            "output_min": float(
                restored.min()
            ),

            "output_max": float(
                restored.max()
            ),
        },
    }


# ============================================================
# ROOT ENDPOINT
# ============================================================

@app.get("/")
def root() -> dict[str, str]:

    return {
        "message": (
            "SEM SRCNN Restoration API "
            "is running."
        )
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/api/health")
def health() -> dict[str, Any]:

    try:

        model_service = (
            get_model_service()
        )

    except Exception as exc:

        return {
            "ok": False,

            "model_loaded": False,

            "model_path": str(
                MODEL_PATH
            ),

            "error": str(exc),
        }

    return {
        "ok": True,

        "model_loaded": True,

        "model_path": str(
            model_service.model_path
        ),

        "device": str(
            model_service.device
        ),
    }


# ============================================================
# SINGLE IMAGE RESTORATION
# ============================================================

@app.post("/api/restore")
async def restore_single(
    file: Annotated[
        UploadFile,
        File(...),
    ],

    scan_mode: Annotated[
        str,
        Form(),
    ] = "standard",
) -> dict[str, Any]:

    return await restore_upload(
        file,
        scan_mode,
    )


# ============================================================
# BATCH IMAGE RESTORATION
# ============================================================

@app.post("/api/restore-batch")
async def restore_batch(
    files: Annotated[
        list[UploadFile],
        File(...),
    ],

    scan_mode: Annotated[
        str,
        Form(),
    ] = "standard",
) -> dict[str, Any]:

    if not files:

        raise HTTPException(
            status_code=400,
            detail=(
                "Upload at least one file."
            ),
        )

    if len(files) > MAX_BATCH_SIZE:

        raise HTTPException(
            status_code=400,
            detail=(
                f"Upload up to "
                f"{MAX_BATCH_SIZE} "
                "files per request."
            ),
        )

    results: list[
        dict[str, Any]
    ] = []

    for upload in files:

        try:

            results.append(
                await restore_upload(
                    upload,
                    scan_mode,
                )
            )

        except HTTPException as exc:

            results.append(
                {
                    "filename": (
                        upload.filename
                        or "uploaded-file"
                    ),

                    "error": exc.detail,
                }
            )

    return {
        "scan_mode": scan_mode,

        "count": len(results),

        "results": results,
    }
