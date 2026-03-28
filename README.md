Docker Multi-Stage Build 
🔹 What is it?

A multi-stage build lets you use multiple FROM statements in a single Dockerfile.

👉 Each stage has a purpose:

Build stage → compile code, install dependencies
Final stage → only keep what’s needed to run the app

💡 Goal: Smaller, cleaner, more secure images

🔹 Why do we need it?

Without multi-stage builds:

Your image includes:
compilers (gcc, go build tools)
dev dependencies
unnecessary files
➡️ Result: Huge + insecure image

With multi-stage:

Only final binary/app goes into runtime image
➡️ Result: Lean production image
🔹 Example (Go Application)
🧱 Without Multi-Stage (Bad Practice)
FROM golang:1.24-alpine

WORKDIR /app

COPY . .

RUN go mod download
RUN go build -o app

CMD ["./app"]

❌ Problems:

Includes Go compiler
Large image (~300MB+)
More attack surface
✅ With Multi-Stage (Best Practice)
# Stage 1: Build
FROM golang:1.24-alpine AS builder

WORKDIR /build

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o app

# Stage 2: Runtime
FROM alpine:latest

WORKDIR /app

COPY --from=builder /build/app .

CMD ["./app"]
🔹 How it works (step-by-step)
Stage 1 (builder)
Uses full Go environment
Builds binary → app
Stage 2 (alpine)
Clean OS
Copies only compiled binary

👉 Key line:

COPY --from=builder /build/app .
🔹 Result
Aspect	Without Multi-Stage	With Multi-Stage
Image Size	❌ Large	✅ Small
Security	❌ Risky	✅ Safer
Performance	❌ Slower	✅ Faster
🔥 Distroless Images (Next Level Optimization)

Now let’s level up.

🔹 What is Distroless?

Distroless images contain:

ONLY your app + runtime dependencies
NO:
shell (sh)
package manager (apk, apt)
debugging tools

👉 Provided by Google

🔹 Why Distroless?
Benefits:
🔐 More secure (no shell = harder to exploit)
⚡ Smaller size
🧼 Minimal attack surface
🔹 Example (Go + Distroless)
# Stage 1: Build
FROM golang:1.24-alpine AS builder

WORKDIR /build

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o app

# Stage 2: Distroless runtime
FROM gcr.io/distroless/base-debian12

WORKDIR /app

COPY --from=builder /build/app .

CMD ["./app"]
🔹 What changed?

Instead of:

FROM alpine

We use:

FROM gcr.io/distroless/base-debian12

👉 This image:

Has NO shell
Has NO package manager
Only runtime libraries
🔹 Real Difference (Alpine vs Distroless)
Feature	Alpine	Distroless
Shell access	✅ Yes	❌ No
Debugging	✅ Easy	❌ Hard
Security	⚠️ Medium	✅ High
Size	Small	Smaller
⚠️ Important Gotchas (People miss this)
1. No shell in Distroless

You cannot do this:

docker exec -it container sh

➡️ It will fail.

2. Debugging is harder

👉 Solution:

Use multi-stage:
Debug with Alpine
Deploy with Distroless
3. Your app must be self-contained

For Go:

CGO_ENABLED=0

👉 ensures static binary (no missing libs)

🧠 Best Practice Combo (Industry Standard)

👉 Use BOTH:

Multi-stage → build optimization
Distroless → runtime security
🔥 Production-Ready Example
# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /build

ENV CGO_ENABLED=0 GOOS=linux GOARCH=amd64

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o app

# Distroless runtime
FROM gcr.io/distroless/static-debian12

WORKDIR /app

COPY --from=builder /build/app .

USER nonroot:nonroot

CMD ["./app"]
🧩 When Should You Use What?
Scenario	Recommendation
Learning / Debugging	Alpine
Production	Distroless
CI/CD pipelines	Multi-stage
Microservices	Multi-stage + Distroless
🧠 Simple Analogy

Think of it like this:

🏗️ Multi-stage = Factory
Build happens here
🚚 Distroless = Delivery truck
Only carries final product
💬 Quick Recap
Multi-stage = build cleanly
Distroless = run securely
Together = production-grade containers