#!/usr/bin/env python3
"""Pack public Mini-Millennium z=0 galaxy positions. Offline NumPy/SciPy only.

See ASSETS.md for attribution. No invented positions or inferred gas density.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import struct
import tarfile

import numpy as np
from scipy.spatial import cKDTree

SOURCE_URL = "https://wwwmpa.mpa-garching.mpg.de/galform/agnpaper/croton_etal.ugriz.mini.ascii.tar.gz"
SOURCE_SHA256 = "d675616d76a82e68435ed994aaa704255471eb421e082e4270104c4e850cb5fe"
MEMBER = "croton_etal.ugriz.mini.ascii/croton_etal.ugriz.mini.ascii"
BOX_SIZE = 62.5
RADIUS_SCALE = 16.0


def build(source, destination):
    archive = source.read_bytes()
    if hashlib.sha256(archive).hexdigest() != SOURCE_SHA256:
        raise ValueError("Source checksum differs from the documented public release")
    with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as tar:
        member = tar.extractfile(MEMBER)
        if member is None:
            raise ValueError("Mini-Millennium catalogue is missing")
        with member:
            positions = np.loadtxt(member, usecols=(0, 1, 2))
    if positions.shape != (18960, 3) or not np.isfinite(positions).all():
        raise ValueError("Unexpected catalogue shape or nonfinite positions")
    if not ((positions >= 0) & (positions < BOX_SIZE)).all():
        raise ValueError("Positions are outside the periodic simulation box")
    # Periodic neighbours avoid boundary bias. Orient diffuse kernels along the
    # local distribution instead of giving every tracer a spherical halo.
    distances, neighbours = cKDTree(positions, boxsize=BOX_SIZE).query(positions, k=33)
    radius = distances[:, 16]
    if not ((radius > 0) & (radius < RADIUS_SCALE)).all():
        raise ValueError("Neighbour radius is outside the encoding range")
    offsets = positions[neighbours[:, 1:]] - positions[:, None, :]
    offsets -= BOX_SIZE * np.rint(offsets / BOX_SIZE)
    covariance = np.einsum("nki,nkj->nij", offsets, offsets) / 32
    covariance = .85 * covariance + .15 * np.trace(covariance, axis1=1, axis2=2)[:, None, None] / 3 * np.eye(3)
    covariance *= .55**2
    # Normalize before quantization to preserve precision in compact clusters.
    normalized = covariance / radius[:, None, None]**2
    packed_covariance = normalized[:, [0, 1, 2, 0, 0, 1], [0, 1, 2, 1, 2, 2]]
    if np.abs(packed_covariance).max() >= 4:
        raise ValueError("Covariance exceeds its encoding range")
    records = np.empty((len(positions), 10), dtype="<u2")
    records[:, :3] = np.rint(positions / BOX_SIZE * 65535).astype("<u2")
    records[:, 3] = np.rint(radius / RADIUS_SCALE * 65535).astype("<u2")
    records[:, 4:] = np.rint(packed_covariance / 4 * 32767).astype("<i2").view("<u2")
    payload = struct.pack("<4sHHIf", b"CWEB", 2, 20, len(positions), BOX_SIZE) + records.tobytes()
    asset_hash = hashlib.sha256(payload).hexdigest()
    destination.mkdir(parents=True, exist_ok=True)
    asset_name = f"cosmic-web-{asset_hash[:12]}.bin"
    (destination / asset_name).write_bytes(payload)
    metadata = {
        "asset": asset_name, "sha256": asset_hash, "bytes": len(payload),
        "catalogue": "Croton et al. (2006) Mini-Millennium semi-analytic galaxy catalogue",
        "source_url": SOURCE_URL, "source_sha256": SOURCE_SHA256,
        "simulation_reference": "https://doi.org/10.1038/nature03597",
        "galaxy_model_reference": "https://doi.org/10.1111/j.1365-2966.2005.09994.x",
        "redshift": 0, "box_size_mpc_over_h": BOX_SIZE, "galaxies": len(positions),
        "encoding": "16-byte little-endian header: CWEB, uint16 version=2, uint16 stride=20, uint32 count, float32 box size; records: uint16 x,y,z (box/65535), uint16 r16 (16 Mpc/h /65535), int16 covariance xx,yy,zz,xy,xz,yz (4*r16^2/32767)",
        "smoothing": "32 periodic neighbours; second moments around each tracer, 15% isotropic regularization, linear kernel scale 0.55. Not a physical gas model.",
        "visualization": "Adaptive smoothing of galaxy tracers in a softly bounded slab; decorative colour and opacity. Not a gas or dark-matter density reconstruction, observed map, or COSMOS-Web field. Motion rotates a single snapshot.",
        "credit": "Millennium simulation: Virgo Consortium, computed at the Max Planck Society computing centre in Garching. Public galaxy model and catalogue: Croton et al. (2006).",
    }
    (destination / "cosmic-web.json").write_text(json.dumps(metadata, indent=2) + "\n")
    print(json.dumps({"asset": asset_name, "bytes": len(payload), "galaxies": len(positions)}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path, help="Downloaded public catalogue tar.gz")
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "public/data")
    args = parser.parse_args()
    build(args.source, args.output)
