  private static final int PIXEL_MASK_WALL = 0xff0000;
  private static final int PIXEL_MONSTER_HEAD = 0xFFFFFE;
  private static final int PIXEL_INNER_WALL = 0xFFFFFF;

  private final int width, height;
  private final int[] elements;

  function Map(int width, int height) {
    this.width = width;
    this.height = height;
    this.elements = new int[width * height];
  }

  int getElement(int x, int y) {
    return elements[x + y * width];
  }

  private int getElementSafe(int x, int y) {
    return elements[(x + y * width) & (width * height - 1)];
  }

  void setElement(int x, int y, int pixel) {
    elements[x + y * width] = pixel;
  }

  void setElementSafe(int x, int y, int pixel) {
    elements[(x + y * width) & (width * height - 1)] = pixel;
  }

  void maskElement(int x, int y, int pixelMask) {
    elements[x + y * width] &= pixelMask;
  }

  boolean isWall(int x, int y) {
    return getElement(x, y) >= 0xfffffe;
  }

  boolean isWallSafe(int x, int y) {
    return getElementSafe(x, y) == 0xffffff;
  }

  boolean isMonsterSafe(int x, int y) {
    // 0xffffff is the color of character clothes.
    return getElementSafe(x, y) == 0xffffff;
  }

  boolean isMonsterHead(int x, int y) {
    return getElement(x, y) >= PIXEL_MONSTER_HEAD;
  }

  void setMonsterHead(int x, int y) {
    setElement(x, y, PIXEL_MONSTER_HEAD);
  }

  void setInnerWall(int x, int y) {
    setElement(x, y, PIXEL_INNER_WALL);
  }

  boolean isAnyWall(int x, int y) {
    return getElement(x, y) >= PIXEL_MASK_WALL;
  }

  boolean isAnyWallSafe(int x, int y) {
    return getElementSafe(x, y) >= PIXEL_MASK_WALL;
  }

  void copyView(Point camera, int viewWidth, int viewHeight, int[] pixels) {
    for (int y = 0; y < viewHeight; y++) {
      int xm = camera.x - (viewWidth >> 1);
      int ym = y + camera.y - (viewHeight >> 1);
      for (int x = 0; x < viewWidth; x++) {
        pixels[x + y * viewWidth] = getElementSafe(xm + x, ym);
      }
    }
  }
}
