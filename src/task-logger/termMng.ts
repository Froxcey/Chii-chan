const term = process.stdout;
process.stdin.setRawMode(true);
process.stdin.resume();

let pos = {
  x: 0,
  y: 0,
};

let posCount: Array<number> = [];

process.stdin.on("data", (key) => {
  if (key.toString() === "\u0003") {
    // Ctrl+C to exit
    process.stdin.setRawMode(false);
    process.stdin.pause();
    toBottomRight();
    console.log("\nExiting");
    process.exit();
  }
});

function toBottomRight() {
  // Go to the bottom row
  term.write(ansi.down(pos.y));

  // Go to the end of the last row
  let xTarget = posCount[posCount.length - 1];
  xTarget > pos.x
    ? term.write(ansi.left(xTarget - pos.x))
    : term.write(ansi.right(pos.x - xTarget));
}

export function newEntry(content: string, len: number) {
  if (posCount.length != 0) {
    toBottomRight();

    // Write newline
    term.write("\n");
  }

  // Write content
  term.write(content);

  // Track
  pos = {
    x: len,
    y: 0,
  };
  posCount.push(len);
  return posCount.length;
}

export function overwrite(entry: number, content: string, len: number) {
  // Go to the left
  term.write(ansi.left(pos.x));

  // Go to the intended line
  const targetY = posCount.length - entry;
  if (targetY < pos.y) term.write(ansi.down(pos.y - targetY));
  else if (targetY > pos.y) term.write(ansi.up(targetY - pos.y));
  term.write(content);
  const origLen = posCount[entry - 1];
  if (len < origLen)
    term.write(" ".repeat(origLen - len) + ansi.left(origLen - len));
  pos = {
    x: len,
    y: targetY,
  };
  posCount[entry - 1] = len;
}

const ansi = {
  up(l: number) {
    return `\x1b[${l}A`;
  },
  down(l: number) {
    return `\x1b[${l}B`;
  },
  right(l: number) {
    return `\x1b[${l}C`;
  },
  left(l: number) {
    return `\x1b[${l}D`;
  },
};
