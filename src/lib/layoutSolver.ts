export interface LayoutRect {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LeafNode {
  kind: 'leaf';
  index: number;
  ratio: number;
}

interface SplitNode {
  kind: 'split';
  orientation: 'vertical' | 'horizontal';
  left: LayoutNode;
  right: LayoutNode;
  ratio: number;
}

type LayoutNode = LeafNode | SplitNode;

interface ContainerRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutSolution {
  rects: LayoutRect[];
  usedWidth: number;
}

const buildLeaf = (index: number, ratio: number): LeafNode => ({
  kind: 'leaf',
  index,
  ratio: Math.max(ratio, 0.1),
});

const buildSplit = (
  orientation: 'vertical' | 'horizontal',
  left: LayoutNode,
  right: LayoutNode
): SplitNode => {
  const ratio =
    orientation === 'vertical'
      ? left.ratio + right.ratio
      : 1 / (1 / left.ratio + 1 / right.ratio);

  return {
    kind: 'split',
    orientation,
    left,
    right,
    ratio,
  };
};

const generatePermutations = <T,>(source: T[]): T[][] => {
  if (source.length <= 1) {
    return [source.slice()];
  }

  const permutations: T[][] = [];

  source.forEach((item, idx) => {
    const rest = [...source.slice(0, idx), ...source.slice(idx + 1)];
    generatePermutations(rest).forEach((perm) => {
      permutations.push([item, ...perm]);
    });
  });

  return permutations;
};

const buildTrees = (indices: number[], ratios: number[]): LayoutNode[] => {
  if (indices.length === 1) {
    const index = indices[0];
    return [buildLeaf(index, ratios[index])];
  }

  const result: LayoutNode[] = [];

  for (let split = 1; split < indices.length; split += 1) {
    const leftIndices = indices.slice(0, split);
    const rightIndices = indices.slice(split);

    const leftTrees = buildTrees(leftIndices, ratios);
    const rightTrees = buildTrees(rightIndices, ratios);

    leftTrees.forEach((leftNode) => {
      rightTrees.forEach((rightNode) => {
        result.push(buildSplit('vertical', leftNode, rightNode));
        result.push(buildSplit('horizontal', leftNode, rightNode));
      });
    });
  }

  return result;
};

const layoutTree = (node: LayoutNode, container: ContainerRect): LayoutRect[] => {
  if (node.kind === 'leaf') {
    return [
      {
        index: node.index,
        ...container,
      },
    ];
  }

  if (node.orientation === 'vertical') {
    const totalRatio = node.left.ratio + node.right.ratio;
    if (totalRatio <= 0) {
      return [
        {
          index: node.left.kind === 'leaf' ? node.left.index : 0,
          ...container,
        },
      ];
    }
    const maxHeight = Math.min(container.height, container.width / totalRatio);
    const usedWidth = totalRatio * maxHeight;
    const offsetX = container.x + (container.width - usedWidth) / 2;
    const offsetY = container.y + (container.height - maxHeight) / 2;

    const leftWidth = maxHeight * node.left.ratio;
    const rightWidth = maxHeight * node.right.ratio;

    const leftContainer: ContainerRect = {
      x: offsetX,
      y: offsetY,
      width: leftWidth,
      height: maxHeight,
    };
    const rightContainer: ContainerRect = {
      x: offsetX + leftWidth,
      y: offsetY,
      width: rightWidth,
      height: maxHeight,
    };

    return [...layoutTree(node.left, leftContainer), ...layoutTree(node.right, rightContainer)];
  }

  // horizontal split
  const ratio = node.ratio;
  if (ratio <= 0) {
    return [
      {
        index: node.left.kind === 'leaf' ? node.left.index : 0,
        ...container,
      },
    ];
  }
  const availableWidth = Math.min(container.width, container.height * ratio);
  const usedHeight = availableWidth / ratio;
  const offsetX = container.x + (container.width - availableWidth) / 2;
  const offsetY = container.y + (container.height - usedHeight) / 2;

  const topHeight = availableWidth / node.left.ratio;
  const bottomHeight = availableWidth / node.right.ratio;

  const topContainer: ContainerRect = {
    x: offsetX,
    y: offsetY,
    width: availableWidth,
    height: topHeight,
  };

  const bottomContainer: ContainerRect = {
    x: offsetX,
    y: offsetY + topHeight,
    width: availableWidth,
    height: bottomHeight,
  };

  return [...layoutTree(node.left, topContainer), ...layoutTree(node.right, bottomContainer)];
};

export const computeOptimalLayout = (
  aspectRatios: number[],
  containerWidth: number,
  containerHeight: number
): LayoutSolution => {
  if (aspectRatios.length === 0) {
    return {
      rects: [],
      usedWidth: containerWidth,
    };
  }

  if (aspectRatios.length === 1) {
    const ratio = aspectRatios[0] || 1;
    const naturalWidth = containerHeight * ratio;
    const width = Math.min(containerWidth, Math.max(naturalWidth, containerWidth * 0.25));

    return {
      rects: [
        {
          index: 0,
          x: 0,
          y: 0,
          width,
          height: containerHeight,
        },
      ],
      usedWidth: width,
    };
  }

  const indices = aspectRatios.map((_, idx) => idx);
  const permutations = generatePermutations(indices);

  let bestLayout: LayoutRect[] = [];
  let bestScore = -Infinity;

  permutations.forEach((perm) => {
    const trees = buildTrees(perm, aspectRatios);
    trees.forEach((tree) => {
      const layout = layoutTree(tree, {
        x: 0,
        y: 0,
        width: containerWidth,
        height: containerHeight,
      });

      const score = layout.reduce((sum, rect) => sum + rect.width * rect.height, 0);

      if (score > bestScore) {
        bestScore = score;
        bestLayout = layout;
      }
    });
  });

  const sorted = bestLayout
    .map((rect) => rect)
    .sort((a, b) => a.index - b.index);

  const minX = sorted.reduce((min, rect) => Math.min(min, rect.x), Number.POSITIVE_INFINITY);
  const maxRight = sorted.reduce((max, rect) => Math.max(max, rect.x + rect.width), 0);
  const width = Math.max(maxRight - minX, 1);

  const normalizedRects = sorted.map((rect) => ({
    ...rect,
    x: rect.x - minX,
  }));

  return {
    rects: normalizedRects,
    usedWidth: Math.min(width, containerWidth),
  };
};
