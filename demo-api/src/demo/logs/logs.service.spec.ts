import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { LogsService } from "./logs.service";

/**
 * Log rotation regression test (#104).
 *
 * writeLogLine() rotates access.log -> access.log.1 via fsPromises.rename()
 * once the file exceeds MAX_LOG_BYTES. rename() overwrites on POSIX, so a
 * fixed `.1` suffix meant a SECOND rotation silently clobbered the first
 * rotated file, losing history. Rotated files must now use a suffix that
 * never collides across rotations.
 */
describe("LogsService log rotation (#104)", () => {
  let tmpDir: string;
  let cwdSpy: jest.SpyInstance;
  let dateNowSpy: jest.SpyInstance;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "logs-rotation-"));
    cwdSpy = jest.spyOn(process, "cwd").mockReturnValue(tmpDir);
  });

  afterEach(() => {
    cwdSpy.mockRestore();
    dateNowSpy?.mockRestore();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("does not clobber a previously rotated file on a second rotation", async () => {
    const service = new LogsService();
    const logsDir = path.join(tmpDir, "logs");
    const accessLogFile = path.join(logsDir, "access.log");

    // First oversized file — triggers the first rotation.
    fs.writeFileSync(accessLogFile, Buffer.alloc(5 * 1024 * 1024, "a"));
    dateNowSpy = jest.spyOn(Date, "now").mockReturnValueOnce(1000);
    await (service as any).writeLogLine("first-after-rotation\n");

    const afterFirst = fs
      .readdirSync(logsDir)
      .filter((f) => f !== "access.log");
    expect(afterFirst.length).toBe(1);
    const firstRotatedName = afterFirst[0];

    // Second oversized file — triggers a second rotation.
    fs.writeFileSync(accessLogFile, Buffer.alloc(5 * 1024 * 1024, "b"));
    dateNowSpy.mockReturnValueOnce(2000);
    await (service as any).writeLogLine("second-after-rotation\n");

    const afterSecond = fs
      .readdirSync(logsDir)
      .filter((f) => f !== "access.log");

    // Both rotated files must survive — the first one was not clobbered.
    expect(afterSecond).toContain(firstRotatedName);
    expect(afterSecond.length).toBe(2);
  });
});
