import os
import time
import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from loguru import logger
from app.core.config import settings


# ─── Attention U-Net Architecture ────────────────────────────────────────────

class DoubleConv(nn.Module):
    def __init__(self, in_channels, out_channels):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_channels, out_channels, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
        )

    def forward(self, x):
        return self.block(x)

class UpConv(nn.Module):
    def __init__(self, in_channels, out_channels):
        super().__init__()
        self.up = nn.Sequential(
            nn.Upsample(scale_factor=2, mode='bilinear', align_corners=True),
            nn.Conv2d(in_channels, out_channels, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True)
        )
        
    def forward(self, x):
        return self.up(x)

class AttentionBlock(nn.Module):
    def __init__(self, F_g, F_l, F_int):
        super().__init__()
        self.W_g = nn.Sequential(nn.Conv2d(F_g, F_int, 1), nn.BatchNorm2d(F_int))
        self.W_x = nn.Sequential(nn.Conv2d(F_l, F_int, 1), nn.BatchNorm2d(F_int))
        self.psi = nn.Sequential(nn.Conv2d(F_int, 1, 1), nn.BatchNorm2d(1), nn.Sigmoid())
        self.relu = nn.ReLU(inplace=True)

    def forward(self, g, x):
        g1 = self.W_g(g)
        x1 = self.W_x(x)
        psi = self.relu(g1 + x1)
        psi = self.psi(psi)
        return x * psi

class BoundaryAttentionUNet(nn.Module):
    def __init__(self, in_channels=1, out_channels=1, features=[64, 128, 256, 512]):
        super().__init__()
        
        self.enc1 = DoubleConv(in_channels, features[0])
        self.enc2 = DoubleConv(features[0], features[1])
        self.enc3 = DoubleConv(features[1], features[2])
        self.enc4 = DoubleConv(features[2], features[3])
        
        self.pool = nn.MaxPool2d(2, 2)
        
        self.bottleneck = DoubleConv(features[3], features[3] * 2)
        
        self.up4 = UpConv(features[3] * 2, features[3])
        self.att4 = AttentionBlock(F_g=features[3], F_l=features[3], F_int=features[3] // 2)
        self.dec4 = DoubleConv(features[3] * 2, features[3])
        
        self.up3 = UpConv(features[3], features[2])
        self.att3 = AttentionBlock(F_g=features[2], F_l=features[2], F_int=features[2] // 2)
        self.dec3 = DoubleConv(features[2] * 2, features[2])
        
        self.up2 = UpConv(features[2], features[1])
        self.att2 = AttentionBlock(F_g=features[1], F_l=features[1], F_int=features[1] // 2)
        self.dec2 = DoubleConv(features[1] * 2, features[1])
        
        self.up1 = UpConv(features[1], features[0])
        self.att1 = AttentionBlock(F_g=features[0], F_l=features[0], F_int=features[0] // 2)
        self.dec1 = DoubleConv(features[0] * 2, features[0])
        
        self.mask_head = nn.Conv2d(features[0], out_channels, 1)
        
        self.boundary_proj_d2 = nn.Sequential(
            nn.Conv2d(features[1], features[0], 1, bias=False),
            nn.BatchNorm2d(features[0]),
            nn.ReLU(inplace=True)
        )
        
        self.boundary_head = nn.Sequential(
            nn.Conv2d(features[0] * 2, features[0], 3, padding=1, bias=False),
            nn.BatchNorm2d(features[0]),
            nn.ReLU(inplace=True),
            nn.Conv2d(features[0], features[0] // 2, 3, padding=1, bias=False),
            nn.BatchNorm2d(features[0] // 2),
            nn.ReLU(inplace=True),
            nn.Conv2d(features[0] // 2, out_channels, 1)
        )
        
    def forward(self, x):
        e1 = self.enc1(x)
        e2 = self.enc2(self.pool(e1))
        e3 = self.enc3(self.pool(e2))
        e4 = self.enc4(self.pool(e3))
        
        b = self.bottleneck(self.pool(e4))
        
        d4 = self.up4(b)
        x4 = self.att4(g=d4, x=e4)
        d4 = torch.cat([x4, d4], dim=1)
        d4 = self.dec4(d4)
        
        d3 = self.up3(d4)
        x3 = self.att3(g=d3, x=e3)
        d3 = torch.cat([x3, d3], dim=1)
        d3 = self.dec3(d3)
        
        d2 = self.up2(d3)
        x2 = self.att2(g=d2, x=e2)
        d2 = torch.cat([x2, d2], dim=1)
        d2 = self.dec2(d2)
        
        d1 = self.up1(d2)
        x1 = self.att1(g=d1, x=e1)
        d1 = torch.cat([x1, d1], dim=1)
        d1 = self.dec1(d1)
        
        mask = torch.sigmoid(self.mask_head(d1))
        
        # When training, we might return both. For inference, we just need the mask.
        return mask


# ─── Model Loader (singleton) ────────────────────────────────────────────────

_model = None
_device = None

def get_model() -> tuple[BoundaryAttentionUNet, torch.device]:
    global _model, _device

    if _model is not None:
        return _model, _device

    # Determine device
    if settings.AI_DEVICE == "auto":
        _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    elif settings.AI_DEVICE == "cpu":
        _device = torch.device("cpu")
    else:
        _device = torch.device(settings.AI_DEVICE)

    logger.info(f"Loading AI model on {_device}")

    _model = BoundaryAttentionUNet(in_channels=1, out_channels=1)

    if os.path.exists(settings.AI_MODEL_PATH):
        state_dict = torch.load(settings.AI_MODEL_PATH, map_location=_device)
        if any(k.startswith("module.") for k in state_dict.keys()):
            state_dict = {k.replace("module.", ""): v for k, v in state_dict.items()}
        _model.load_state_dict(state_dict, strict=False)
        logger.info(f"Model weights loaded from {settings.AI_MODEL_PATH}")
    else:
        logger.warning(f"No weights found at {settings.AI_MODEL_PATH}. Using random weights!")

    _model.to(_device)
    _model.eval()
    return _model, _device


# ─── Inference ───────────────────────────────────────────────────────────────

def run_inference(file_path: str) -> dict:
    """
    Full inference pipeline:
    1. Load + preprocess image
    2. Run model
    3. Generate mask + overlay
    4. Compute metrics
    Returns dict with all results.
    """
    from app.ai.preprocessing import load_image, preprocess_for_model
    from app.ai.metrics import compute_metrics

    start = time.time()

    model, device = get_model()
    input_size = settings.AI_INPUT_SIZE

    # Load original image
    raw = load_image(file_path)
    original_h, original_w = raw.shape[:2]

    # Preprocess
    tensor_np = preprocess_for_model(raw, target_size=input_size)
    tensor = torch.from_numpy(tensor_np).float().to(device)

    # Inference
    with torch.no_grad():
        output = model(tensor)

    # Convert output to mask
    pred_mask = output.squeeze().cpu().numpy()  # (H, W) values in [0, 1]

    # Threshold
    binary_mask = (pred_mask > 0.5).astype(np.uint8)

    # Compute metrics
    metrics = compute_metrics(binary_mask, (input_size, input_size))

    # Generate overlay image
    overlay_path, mask_path = _generate_visualizations(
        file_path=file_path,
        raw_array=raw,
        binary_mask=binary_mask,
        original_size=(original_w, original_h),
    )

    elapsed = round(time.time() - start, 2)

    return {
        **metrics,
        "overlay_image_path": overlay_path,
        "mask_file_path": mask_path,
        "processing_time_sec": elapsed,
        "confidence_score": round(float(pred_mask[binary_mask == 1].mean()), 4) if metrics["tumor_present"] else 0.0,
    }


def _generate_visualizations(
    file_path: str,
    raw_array: np.ndarray,
    binary_mask: np.ndarray,
    original_size: tuple,
) -> tuple[str, str]:
    """Save overlay (original + red tumor mask) and pure mask as PNG files."""
    from app.core.config import settings

    study_subdir = os.path.dirname(file_path).replace(
        os.path.join(settings.MEDIA_ROOT, "uploads"),
        os.path.join(settings.MEDIA_ROOT, "overlays"),
    )
    os.makedirs(study_subdir, exist_ok=True)
    mask_dir = study_subdir.replace("overlays", "masks")
    os.makedirs(mask_dir, exist_ok=True)

    base_name = os.path.splitext(os.path.basename(file_path))[0]

    # Resize raw to display size
    display_size = (512, 512)
    orig_pil = Image.fromarray((raw_array * 255).astype(np.uint8)).resize(display_size)
    orig_rgb = orig_pil.convert("RGB")

    # Resize mask
    mask_pil = Image.fromarray((binary_mask * 255).astype(np.uint8)).resize(display_size, Image.NEAREST)
    mask_arr = np.array(mask_pil)

    # Overlay: paint tumor pixels red
    overlay_arr = np.array(orig_rgb)
    tumor_pixels = mask_arr > 127
    overlay_arr[tumor_pixels, 0] = np.clip(overlay_arr[tumor_pixels, 0] * 0.3 + 180, 0, 255).astype(np.uint8)
    overlay_arr[tumor_pixels, 1] = (overlay_arr[tumor_pixels, 1] * 0.3).astype(np.uint8)
    overlay_arr[tumor_pixels, 2] = (overlay_arr[tumor_pixels, 2] * 0.3).astype(np.uint8)

    # Save
    overlay_path = os.path.join(study_subdir, f"{base_name}_overlay.png")
    mask_path = os.path.join(mask_dir, f"{base_name}_mask.png")

    Image.fromarray(overlay_arr.astype(np.uint8)).save(overlay_path)
    Image.fromarray(mask_arr).save(mask_path)

    return overlay_path, mask_path
