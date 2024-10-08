import type { FileSink } from "bun";
import { newEntry, overwrite } from "./termMng";
import { mkdirSync, existsSync } from "node:fs";

export default class TaskLogger {
  private writer: FileSink;
  constructor() {
    if (!existsSync("logs")) mkdirSync("logs");
    const file = Bun.file(`logs/${Math.round(Date.now() / 1000)}.log`);
    this.writer = file.writer();
    process.on("exit", () => {
      this.writer.end();
    });
  }
  createTask(name: string, ...msg: string[]) {
    return new Task(name, msg.join(" "), this.writer);
  }
  error(name: string, ...content: string[]) {
    const msg = format("error", name, content.join(" "), 0);
    newEntry(msg.text, msg.len);
  }
}

type Status = "running" | "pending" | "warn" | "error" | "success";
export class Task {
  private id: number;
  private name: string;
  private status: Status = "running";
  private updateClock: Timer;
  private content: string;
  private styleState = 0;
  private writer: FileSink;
  constructor(name: string, content: string, writer: FileSink) {
    this.name = name;
    this.content = content;
    this.writer = writer;
    const formatted = format(this.status, name, content, 0);
    this.id = newEntry(formatted.text, formatted.len);
    this.write();
    this.updateClock = setInterval(() => {
      this.styleState++;
      this.update();
    }, 250);
  }
  private update() {
    const formatted = format(
      this.status,
      this.name,
      this.content,
      this.styleState,
    );
    overwrite(this.id, formatted.text, formatted.len);
  }
  private write() {
    this.writer.write(
      `${Date.now()} [Task #${this.id} ${this.name}] ${this.status} ${this.content}\n`,
    );
  }
  writeError(content: Error) {
    this.writer.write(content.toString());
  }
  running(...content: string[]) {
    this.content = content.join(" ");
    this.status = "running";
    this.write();
    this.update();
  }
  pending(...content: string[]) {
    this.content = content.join(" ");
    this.status = "pending";
    this.write();
    this.update();
  }
  warn(...content: string[]) {
    this.content = content.join(" ");
    this.status = "warn";
    this.write();
    this.update();
  }
  error(...content: string[]) {
    this.content = content.join(" ");
    this.status = "error";
    this.write();
    this.update();
    clearInterval(this.updateClock);
  }
  success(...content: string[]) {
    this.content = content.join(" ");
    this.status = "success";
    this.write();
    this.update();
    clearInterval(this.updateClock);
  }
}

function format(status: Status, name: string, content: string, state: number) {
  return {
    text: `${prefix[status].seq[state % prefix[status].seq.length]}${" ".repeat(11 - prefix[status].len)}\x1b[1;90m[${name}]${" ".repeat(10 - name.length)}>\x1b[0m ${content}`,
    len: 25 + content.length,
  };
}

const prefix = {
  running: {
    seq: [
      "\x1b[1;34m○ \x1b[4mrunning\x1b[0m",
      "\x1b[1;34m● \x1b[4mrunning\x1b[0m",
    ],
    len: 9,
  },
  pending: {
    seq: [
      "\x1b[34m⎽ \x1b[4mpending\x1b[0m",
      "\x1b[34m⎼ \x1b[4mpending\x1b[0m",
      "\x1b[34m⎻ \x1b[4mpending\x1b[0m",
      "\x1b[34m⎺ \x1b[4mpending\x1b[0m",
      "\x1b[34m⎻ \x1b[4mpending\x1b[0m",
      "\x1b[34m⎼ \x1b[4mpending\x1b[0m",
    ],
    len: 9,
  },
  warn: { seq: ["\x1b[33m! \x1b[1mwarning\x1b[0m"], len: 9 },
  success: { seq: ["\x1b[92m✔ \x1b[1msuccess\x1b[0m"], len: 9 },
  error: { seq: ["\x1b[31m⨯ \x1b[1merror\x1b[0m"], len: 7 },
};
