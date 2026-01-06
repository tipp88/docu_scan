#!/bin/bash
set -e

echo "=========================================="
echo "DocuScan Docker Build Script"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
IMAGE_NAME="${IMAGE_NAME:-docuscan}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
PUSH_TO_REGISTRY="${PUSH_TO_REGISTRY:-false}"
REGISTRY="${REGISTRY:-}"

echo -e "${BLUE}Building Docker image...${NC}"
echo "Image: $IMAGE_NAME:$IMAGE_TAG"
echo ""

# Build the image
docker build \
    --tag "$IMAGE_NAME:$IMAGE_TAG" \
    --progress=plain \
    .

echo ""
echo -e "${GREEN}Build complete!${NC}"
echo ""

# Show image info
docker images "$IMAGE_NAME:$IMAGE_TAG"

echo ""
echo -e "${BLUE}Image size breakdown:${NC}"
docker history "$IMAGE_NAME:$IMAGE_TAG" | head -20

if [ "$PUSH_TO_REGISTRY" = "true" ] && [ -n "$REGISTRY" ]; then
    echo ""
    echo -e "${BLUE}Pushing to registry: $REGISTRY${NC}"
    docker tag "$IMAGE_NAME:$IMAGE_TAG" "$REGISTRY/$IMAGE_NAME:$IMAGE_TAG"
    docker push "$REGISTRY/$IMAGE_NAME:$IMAGE_TAG"
    echo -e "${GREEN}Pushed to registry!${NC}"
fi

echo ""
echo -e "${YELLOW}===========================================${NC}"
echo -e "${GREEN}Docker Image Ready!${NC}"
echo -e "${YELLOW}===========================================${NC}"
echo ""
echo "To run the container:"
echo ""
echo -e "${BLUE}  docker run -d -p 8443:443 -p 8080:80 --name docuscan $IMAGE_NAME:$IMAGE_TAG${NC}"
echo ""
echo "To save and transfer to another machine:"
echo ""
echo -e "${BLUE}  # Save image${NC}"
echo "  docker save $IMAGE_NAME:$IMAGE_TAG | gzip > docuscan-image.tar.gz"
echo ""
echo -e "${BLUE}  # Transfer to LXC container${NC}"
echo "  lxc file push docuscan-image.tar.gz your-container/tmp/"
echo ""
echo -e "${BLUE}  # Load in LXC${NC}"
echo "  lxc exec your-container -- docker load < /tmp/docuscan-image.tar.gz"
echo ""
echo "Access at: https://localhost:8443"
echo ""
