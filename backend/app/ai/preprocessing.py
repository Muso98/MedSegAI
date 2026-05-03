import os
import numpy as np
from PIL import Image
import nibabel as nib
from app.core.config import settings


def load_image(file_path: str) -> np.ndarray:
    """Load PNG/JPG/NIfTI and return normalized float32 numpy array (H, W)."""
    ext = file_path.lower().rsplit(".", 1)[-1]

    if ext in ("nii", "gz"):
        return _load_nifti(file_path)
    elif ext in ("png", "jpg", "jpeg"):
        return _load_2d(file_path)
    else:
        raise ValueError(f"Unsupported file format: .{ext}")


def _load_nifti(path: str) -> np.ndarray:
    """Load NIfTI, pick middle slice with most content."""
    img = nib.load(path)
    data = img.get_fdata().astype(np.float32)

    if data.ndim == 4:
        data = data[..., 0]

    if data.ndim == 3:
        # Pick slice with most non-zero content (most informative slice)
        sums = [np.sum(data[:, :, i] > 0) for i in range(data.shape[2])]
        best_slice = int(np.argmax(sums))
        data = data[:, :, best_slice]

    return _normalize(data)


def _load_2d(path: str) -> np.ndarray:
    """Load PNG/JPG and convert to grayscale float32."""
    img = Image.open(path).convert("L")
    arr = np.array(img, dtype=np.float32)
    return _normalize(arr)


def _normalize(arr: np.ndarray) -> np.ndarray:
    """Min-max normalize to [0, 1]."""
    min_val = arr.min()
    max_val = arr.max()
    if max_val - min_val < 1e-6:
        return np.zeros_like(arr)
    return (arr - min_val) / (max_val - min_val)


def preprocess_for_model(arr: np.ndarray, target_size: int = 256) -> np.ndarray:
    """
    Full preprocessing pipeline:
    1. Resize to target_size x target_size
    2. Denoise (Gaussian smoothing)
    3. Add channel dim → (1, 1, H, W) for PyTorch
    """
    from PIL import Image
    from scipy.ndimage import gaussian_filter

    # Denoise
    arr = gaussian_filter(arr, sigma=0.5)

    # Resize
    pil = Image.fromarray((arr * 255).astype(np.uint8))
    pil = pil.resize((target_size, target_size), Image.BILINEAR)
    arr = np.array(pil, dtype=np.float32) / 255.0

    # Shape: (batch=1, channels=1, H, W)
    tensor_input = arr[np.newaxis, np.newaxis, :, :]
    return tensor_input


def get_original_size_pil(file_path: str) -> tuple[int, int]:
    """Return (width, height) of original image for overlay."""
    ext = file_path.lower().rsplit(".", 1)[-1]
    if ext in ("nii", "gz"):
        img = nib.load(file_path)
        data = img.get_fdata()
        if data.ndim >= 2:
            return data.shape[1], data.shape[0]
        return 256, 256
    else:
        with Image.open(file_path) as img:
            return img.size  # (width, height)
