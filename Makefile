.PHONY: help version-bump release build dev clean

# Auto-generate version from today's date with auto-incrementing patch
# Format: YYYYMMDD.0.X where X increments if releasing multiple times per day
define get_next_version
$(shell \
	TODAY=$$(date +%Y%m%d); \
	LATEST=$$(git tag -l "$$TODAY.*" 2>/dev/null | sort -V | tail -1); \
	if [ -z "$$LATEST" ]; then \
		echo "$$TODAY.0.0"; \
	else \
		PATCH=$$(echo "$$LATEST" | sed 's/.*\.0\.\([0-9]*\)/\1/'); \
		echo "$$TODAY.0.$$((PATCH + 1))"; \
	fi \
)
endef

VERSION := $(get_next_version)

help:
	@echo "cfgs.dev Makefile"
	@echo ""
	@echo "Usage:"
	@echo "  make release                       - Auto-version and release (recommended)"
	@echo "  make release VERSION=20260125.0.0  - Release with specific version"
	@echo "  make build                         - Build production bundle"
	@echo "  make dev                           - Start development server"
	@echo "  make clean                         - Clean build artifacts"
	@echo ""
	@echo "Next version will be: $(VERSION)"

# Bump version in package.json and commit on a branch
version-bump:
	@echo "Next version: $(VERSION)"
	@echo "Creating release branch for version $(VERSION)..."
	@git checkout -b release/$(VERSION)
	@echo "Bumping version to $(VERSION)..."
	@npm version $(VERSION) --no-git-tag-version
	@git add package.json package-lock.json
	@git commit -m "chore: bump version to $(VERSION)"
	@echo ""
	@echo "Created branch release/$(VERSION)"
	@echo "Version bumped to $(VERSION)"
	@echo "Commit created"

# Merge to main, tag, and push to trigger GitHub Actions release
release: version-bump
	@echo "Merging into main..."
	@git checkout main
	@git merge --no-ff release/$(VERSION)
	@echo "Creating tag $(VERSION) on main..."
	@git tag -a $(VERSION) -m "Release $(VERSION)"
	@echo "Pushing to origin..."
	@git push origin main
	@git push origin $(VERSION)
	@echo ""
	@echo "Merged release/$(VERSION) into main"
	@echo "Created tag $(VERSION) on main"
	@echo "Pushed main and tag $(VERSION)"
	@echo "GitHub Actions will build and publish release"

# Build production bundle
build:
	npm run build

# Start development server
dev:
	npm run dev

# Clean build artifacts
clean:
	rm -rf .next
	rm -rf node_modules/.cache
