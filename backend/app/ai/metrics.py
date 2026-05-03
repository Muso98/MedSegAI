import numpy as np


def compute_metrics(mask: np.ndarray, image_shape: tuple, voxel_size_mm: float = 1.0) -> dict:
    """
    Compute segmentation metrics from binary mask.

    Args:
        mask: Binary numpy array (H, W) — values 0 or 1
        image_shape: (H, W) of the original image for percentage calculation
        voxel_size_mm: Physical size of each pixel in mm (default 1.0)

    Returns:
        dict with: tumor_present, tumor_area_pixels, tumor_area_percent,
                   tumor_volume_cm3, dice_score, iou_score
    """
    mask_bool = mask > 0.5

    tumor_pixels = int(np.sum(mask_bool))
    total_pixels = mask.shape[0] * mask.shape[1]
    tumor_percent = round((tumor_pixels / total_pixels) * 100, 4) if total_pixels > 0 else 0.0

    # Volume: pixels * voxel_size^3 → mm³ → cm³
    tumor_volume_mm3 = tumor_pixels * (voxel_size_mm ** 3)
    tumor_volume_cm3 = round(tumor_volume_mm3 / 1000.0, 4)

    return {
        "tumor_present": tumor_pixels > 50,  # Minimum 50 pixels to avoid noise
        "tumor_area_pixels": tumor_pixels,
        "tumor_area_percent": tumor_percent,
        "tumor_volume_cm3": tumor_volume_cm3,
        "dice_score": None,   # Ground truth not available in production
        "iou_score": None,
    }


def compute_dice(pred: np.ndarray, gt: np.ndarray) -> float:
    """Dice coefficient between prediction and ground truth (for validation)."""
    pred_bool = pred > 0.5
    gt_bool = gt > 0.5
    intersection = np.logical_and(pred_bool, gt_bool).sum()
    denom = pred_bool.sum() + gt_bool.sum()
    if denom == 0:
        return 1.0
    return round(2.0 * intersection / denom, 4)


def compute_iou(pred: np.ndarray, gt: np.ndarray) -> float:
    """Intersection over Union."""
    pred_bool = pred > 0.5
    gt_bool = gt > 0.5
    intersection = np.logical_and(pred_bool, gt_bool).sum()
    union = np.logical_or(pred_bool, gt_bool).sum()
    if union == 0:
        return 1.0
    return round(intersection / union, 4)
