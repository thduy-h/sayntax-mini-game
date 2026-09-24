{ pkgs ? import <nixpkgs> { config.allowUnfree = true; } }:

let
  cuda = pkgs.cudaPackages;
in
pkgs.mkShell {
  name = "shecancode-asr";

  buildInputs = [
    pkgs.uv
    pkgs.python312
    pkgs.stdenv.cc.cc.lib
    pkgs.zlib
    cuda.cuda_cudart
    cuda.cuda_nvrtc
    cuda.libcublas
    cuda.cudnn
  ];

  shellHook = ''
    export LD_LIBRARY_PATH=/run/opengl-driver/lib:${pkgs.lib.makeLibraryPath [
      pkgs.stdenv.cc.cc.lib
      pkgs.zlib
      cuda.cuda_cudart
      cuda.cuda_nvrtc
      cuda.libcublas
      cuda.cudnn
    ]}:$LD_LIBRARY_PATH

    echo ""
    echo "  SheCanCode ASR shell"
    echo "  uv:      $(uv --version 2>/dev/null || true)"
    echo "  python:  $(python --version 2>/dev/null || true)"
    echo ""
    echo "  Start:"
    echo "    uv sync is not required; use the existing .venv or run:"
    echo "    uv pip install -r requirements.txt"
    echo "    ASR_DEVICE=auto ASR_COMPUTE_TYPE=auto uv run python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
    echo ""
  '';
}
