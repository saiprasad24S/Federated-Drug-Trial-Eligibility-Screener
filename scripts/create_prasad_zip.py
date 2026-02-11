#!/usr/bin/env python3
"""Create prasad.zip at the repo root excluding node_modules and virtualenvs.

Usage: python scripts/create_prasad_zip.py
"""
import os
import zipfile
import sys


def should_exclude_path(rel_path, exclude_names):
    parts = rel_path.split(os.sep)
    for p in parts:
        if p in exclude_names:
            return True
    return False


def create_zip(root_dir, zip_path):
    exclude_dirs = set([
        "node_modules", "venv", ".venv", "env", "venv32", "venv64",
        ".git", "__pycache__", ".cache", ".vs", ".idea"
    ])
    max_file_size = 100 * 1024 * 1024  # 100 MB

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for dirpath, dirnames, filenames in os.walk(root_dir):
            # compute relative path
            rel_dir = os.path.relpath(dirpath, root_dir)
            if rel_dir == ".":
                rel_dir = ""

            # prune excluded directories in-place so os.walk won't traverse them
            dirnames[:] = [d for d in dirnames if d not in exclude_dirs]

            # skip if current dir is excluded by name (defensive)
            if should_exclude_path(rel_dir, exclude_dirs):
                continue

            for fname in filenames:
                # skip zip we're creating if in the root
                if rel_dir == "" and fname == os.path.basename(zip_path):
                    continue

                file_path = os.path.join(dirpath, fname)
                try:
                    fsize = os.path.getsize(file_path)
                except Exception:
                    fsize = 0
                if fsize > max_file_size:
                    print(f"Skipping large file (>100MB): {file_path}")
                    continue
                rel_file = os.path.join(rel_dir, fname) if rel_dir else fname
                # ensure consistent zip entry names (use forward slashes)
                arcname = rel_file.replace(os.sep, "/")
                try:
                    zf.write(file_path, arcname)
                except Exception as e:
                    print(f"Warning: failed to add {file_path}: {e}")


if __name__ == "__main__":
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    zip_file = os.path.join(repo_root, "prasad.zip")

    if os.path.exists(zip_file):
        try:
            os.remove(zip_file)
        except Exception:
            pass

    print(f"Creating {zip_file} (excluding node_modules and venv folders)...")
    create_zip(repo_root, zip_file)
    print("Done.")
    print(f"Archive size: {os.path.getsize(zip_file)} bytes")
