# Multi-stage Docker Builds and Distroless Images

This README explains in detail the concepts, benefits, patterns, and practical examples for:
- Multi-stage Docker builds — how they work, why to use them, and best practices.
- Distroless images — what they are, benefits and trade-offs, and how to use them together with multi-stage builds.

Whether you want smaller images, fewer attack surface areas, or reproducible builds, the combination of multi-stage builds and distroless runtime images is a powerful pattern.

---

Table of contents
- What is a multi-stage Docker build?
- Why use multi-stage builds?
- Key features and terms
- Typical multi-stage patterns
- Example: Go (recommended minimal final image)
- Example: Node.js (build + distroless runtime)
- Example: Python (build wheels → distroless/python3)
- Using BuildKit and caching tips
- What are distroless images?
- Benefits and trade-offs of distroless
- Debugging strategies with distroless
- Best practices and security considerations
- Commands and diagnostics
- Further reading

---

What is a multi-stage Docker build?
- A multi-stage build is a Dockerfile that contains multiple FROM instructions (stages). You build the final image by copying artifacts (binaries, compiled assets) from earlier stages into a small runtime stage.
- This allows you to keep heavy build tools (compilers, package managers, dev dependencies) out of the final image — producing smaller and leaner images.

Why use multi-stage builds?
- Smaller image sizes (faster pulls, less disk/network cost).
- Reduced attack surface (no compilers, package managers in runtime).
- Clear separation of build and runtime concerns (reproducible artifacts).
- Easier to enforce minimal runtime base (alpine, distroless, scratch).
- Simpler CI/CD flow: produce a single Dockerfile that does both build and packaging.

Key features and terms
- Stage: Each FROM line starts a stage; stages can be named: `AS build`.
- --target: Build only up to a particular stage using `docker build --target`.
- --from: Copy from a previous stage: `COPY --from=builder /app/bin /app/bin`.
- Build cache: Re-order steps and use proper `COPY`/`RUN` segmentation to maximize caching.
- BuildKit: Newer builder backend with better caching, parallelism, and features (enable with `DOCKER_BUILDKIT=1`).

Typical multi-stage patterns
- Build stage(s): Use a full SDK image (e.g., golang, node, python) to compile or install dependencies.
- Test stage (optional): Run unit tests in the build environment; throw away test artifacts.
- Final stage: Minimal runtime image (scratch, alpine, or distroless) that contains only the runtime artifacts.

Example: Go (static binary → distroless)
```dockerfile
# Stage 1: build
FROM golang:1.20 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# produce a static binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/myapp ./cmd/myapp

# Stage 2: runtime (distroless static)
FROM gcr.io/distroless/static
COPY --from=build /app/myapp /app/myapp
USER nonroot:nonroot   # optional: match a non-root user if you created one
ENTRYPOINT ["/app/myapp"]
```
Notes:
- `-ldflags="-s -w"` strips debug info to reduce size.
- Use `distroless/static` for statically-linked Go binaries. If your binary uses glibc, use a base with libc.

Example: Node.js (build + distroless node runtime)
```dockerfile
# Stage 1: build
FROM node:18 AS build
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build   # build the production bundle

# Stage 2: runtime (distroless Node)
FROM gcr.io/distroless/nodejs:18
WORKDIR /app
COPY --from=build /usr/src/app/dist /app
COPY --from=build /usr/src/app/package.json /app
USER 1000
CMD ["server.js"]   # distroless expects args in JSON array form
```
Notes:
- Use `npm ci --only=production` or `npm prune --production` in a separate step to avoid dev deps in final layers.
- Confirm exact distroless node tags in the distroless repo; tags can include Debian versions.

Example: Python (build wheels → distroless/python3)
```dockerfile
# Stage 1: builder
FROM python:3.11-slim AS builder
WORKDIR /opt/app
COPY pyproject.toml poetry.lock ./
RUN pip install --upgrade pip build wheel
RUN pip wheel --wheel-dir=/wheels .

# Stage 2: runtime (distroless python3)
FROM gcr.io/distroless/python3:latest
COPY --from=builder /wheels /wheels
RUN pip install --no-index --find-links=/wheels mypackage
COPY . /app
WORKDIR /app
CMD ["-m", "mypackage.main"]
```
Notes:
- Distroless python images may not include pip — check the tag. If pip isn't present, you may install dependencies in builder and copy a virtualenv or use a small base like `python:3-slim` for runtime.

Using BuildKit and caching tips
- Enable BuildKit for faster builds and advanced caching:
  DOCKER_BUILDKIT=1 docker build -t myapp:latest .
- Use Dockerfile ordering to maximize cache:
  - Separate copying dependency descriptors (go.mod/package.json/pyproject) and running dependency install before copying source.
- Use `.dockerignore` to avoid sending unnecessary files to the daemon (node_modules, .git, local build artifacts).
- Use `--cache-from` in CI to reuse previous image layers and speed up incremental builds.
- Use `--target` to build specific stages for debugging: `docker build --target build -t myapp:build .`

What are distroless images?
- Distroless images are minimal container base images that contain only the runtime libraries and the application — no package manager, no shell, no shell utilities.
- Created and maintained by Google (gcr.io/distroless).
- Common distroless variants:
  - `distroless/static` — static images, no dynamic linker.
  - `distroless/base` and `distroless/cc` — base images with minimal C libs.
  - Language-specific: `distroless/python3`, `distroless/nodejs`, `distroless/java` — these provide a minimal runtime for specific languages.
- They reduce image size and attack surface.

Benefits and trade-offs of distroless
Benefits:
- Smaller final images.
- Smaller attack surface (no shell, fewer utilities).
- Encourages build/runtime separation.
Trade-offs:
- No shell or package manager makes debugging inside the container harder.
- You must ensure necessary runtime files (certs, fonts, locale) are present.
- Some language ecosystems expect system libraries (glibc, build deps) — choose the correct distroless flavor.

Debugging strategies with distroless
- Reproduce locally with a debug variant: build a separate image that uses a full OS base (debian-slim) and contains debugging tools (bash, curl, strace).
- Example debug stage:
  ```dockerfile
  FROM debian:bookworm-slim AS debug
  COPY --from=build /app/myapp /app/myapp
  RUN apt-get update && apt-get install -y --no-install-recommends procps iproute2 curl ca-certificates
  CMD ["/bin/bash"]
  ```
- Alternative: run the build artifacts in an intermediate stage with a shell:
  docker run -it --rm --entrypoint /bin/bash myapp:build
- Use logging, health checks, and good application exit codes because you can't exec into distroless containers easily.

Best practices and security considerations
- Use multi-stage builds to keep secrets and credentials out of the final image. Do not COPY secret files into the final stage.
- Run as non-root inside the container (use USER).
- Strip debug symbols (`-s -w` or `strip`) when possible to reduce size.
- Keep dependency lists minimal (install production-only deps).
- Scan images for vulnerabilities (Trivy, Clair, Snyk).
- Rebuild base images on a regular cadence to pick up OS/security updates.
- Pin base image versions (avoid `latest`) for reproducibility.
- Prefer content-addressable image references in CI for deterministic builds.

Commands and diagnostics
- Build (default final stage): docker build -t myapp:latest .
- Build only a stage: docker build --target build -t myapp:build .
- Inspect image size: docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
- Inspect layers: docker history myapp:latest
- Start a shell in the build stage image (for debugging):
  docker build --target build -t myapp:build . && docker run -it --rm --entrypoint /bin/bash myapp:build

Further reading
- Distroless repository: https://github.com/GoogleContainerTools/distroless
- Docker multi-stage builds docs: https://docs.docker.com/develop/develop-images/multistage-build/
- BuildKit info: https://docs.docker.com/develop/develop-images/build_enhancements/

---

Short checklist before converting an app to distroless:
- Can my binary run statically or with only libstdc++/glibc? If not, pick the correct distroless variant.
- Do I have runtime files (certificates) present? Copy them into the final image if needed.
- Have I removed dev-only dependencies?
- Have I tested health checks and startup under the final image?
- Can I reproduce and debug the app via a debug stage or by running the build stage image?

---

Example minimal Dockerfile pattern summary
```dockerfile
# Build stage: compile/package assets
FROM <build-image> AS build
# install deps, compile, produce /out/artifact

# Final stage: minimal runtime
FROM gcr.io/distroless/<flavor>
COPY --from=build /out/artifact /app/
USER 1000
ENTRYPOINT ["/app/artifact"]
```

---

