# Dev shell for the SheCanCode monorepo.
#
# Usage (from the repo root):
#
#   nix-shell              # drops you into a shell with Node 22 + npm + npx + tsx on PATH
#   nix-shell --run "..."  # runs a single command inside the shell, then exits
#
# This replaces the per-command form `nix-shell -p nodejs_22 --run "..."` — you
# no longer need to remember the package name or retype it each invocation.
#
# Tools available inside the shell:
#   - node / npm / npx (nodejs_22)
#   - git (for convenience — usually on host PATH already)
#
# The Next.js dev server, tsx test runner, and Supabase/Vercel CLIs all run
# fine inside this shell because they are fetched via `npx` on first use.

{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  name = "shecancode-dev";

  buildInputs = [
    pkgs.nodejs_22
    pkgs.git
  ];

  shellHook = ''
    echo ""
    echo "  SheCanCode dev shell"
    echo "  node:  $(node --version)"
    echo "  npm:   $(npm --version)"
    echo ""
    echo "  Quick commands:"
    echo "    cd apps/web && npm run dev       # local dev server"
    echo "    cd apps/web && npm run build     # production build"
    echo "    npx vercel --prod                # deploy to production"
    echo ""
  '';
}
