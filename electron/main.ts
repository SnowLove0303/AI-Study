import { app, BrowserWindow, Menu, ipcMain, shell } from "electron";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import mysql, { type Pool, type PoolConnection, type RowDataPacket } from "mysql2/promise";

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const courseDatabaseFile = "courses.json";
const mysqlConfigFile = "mysql.json";

type MysqlConfig = {
  host: string;
  port?: number;
  user: string;
  password?: string;
  database: string;
  connectionLimit?: number;
  autoStartServer?: boolean;
  serverRoot?: string;
};

type CourseRecord = {
  id: string;
  title?: string;
  category?: string;
  description?: string;
  progress?: number;
  createdAt?: string;
};

type CourseRow = RowDataPacket & {
  payload_json: string;
};

type CourseDatabasePayload = {
  version: number;
  source?: string;
  savedAt?: string;
  loadedAt?: string;
  recoveredAt?: string;
  courses: unknown[];
};

type MysqlMetaRow = RowDataPacket & {
  meta_value: string | null;
};

let mysqlPool: Pool | null = null;
let mysqlUnavailableLogged = false;
let mysqlStartAttempted = false;

function getDataDirectory() {
  return path.join(app.getPath("userData"), "data");
}

function getCourseDatabasePath() {
  return path.join(getDataDirectory(), courseDatabaseFile);
}

function getMysqlConfigPath() {
  return path.join(getDataDirectory(), mysqlConfigFile);
}

function getPackagedResourcePath(...segments: string[]) {
  return path.join(__dirname, "..", ...segments);
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getLatestNotionImportBackup() {
  try {
    const entries = await fs.readdir(getDataDirectory(), { withFileTypes: true });
    const backups = entries
      .filter((entry) => entry.isFile() && entry.name.startsWith(`${courseDatabaseFile}.before-notion-import-`))
      .map((entry) => entry.name)
      .sort()
      .reverse();

    return backups[0] ? path.join(getDataDirectory(), backups[0]) : null;
  } catch {
    return null;
  }
}

async function appendMysqlAutoStartLog(message: string) {
  try {
    await fs.mkdir(getDataDirectory(), { recursive: true });
    await fs.appendFile(
      path.join(getDataDirectory(), "mysql-autostart.log"),
      `[${new Date().toISOString()}] ${message}\n`,
      "utf8"
    );
  } catch {
    // Logging must never block application startup.
  }
}

async function readJsonFile(filePath: string) {
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content.replace(/^\uFEFF/, "")) as unknown;
}

async function ensureMysqlConfigTemplate() {
  const configPath = getMysqlConfigPath();
  try {
    await fs.access(configPath);
  } catch {
    await fs.mkdir(getDataDirectory(), { recursive: true });
    await fs.writeFile(
      configPath,
      JSON.stringify(
        {
          host: "127.0.0.1",
          port: 3306,
          user: "aistudy",
          password: "",
          database: "aistudy",
          connectionLimit: 5,
          autoStartServer: true,
          serverRoot: "F:/AIAPP/MySQL"
        },
        null,
        2
      ),
      "utf8"
    );
  }
}

async function loadMysqlConfig(): Promise<MysqlConfig | null> {
  const envConfig = {
    host: process.env.AISTUDY_MYSQL_HOST,
    port: process.env.AISTUDY_MYSQL_PORT ? Number(process.env.AISTUDY_MYSQL_PORT) : undefined,
    user: process.env.AISTUDY_MYSQL_USER,
    password: process.env.AISTUDY_MYSQL_PASSWORD,
    database: process.env.AISTUDY_MYSQL_DATABASE
  };

  if (envConfig.host && envConfig.user && envConfig.database) {
    return envConfig as MysqlConfig;
  }

  await ensureMysqlConfigTemplate();

  try {
    const config = (await readJsonFile(getMysqlConfigPath())) as Partial<MysqlConfig>;
    if (!config.host || !config.user || !config.database) return null;
    return {
      host: config.host,
      port: config.port ?? 3306,
      user: config.user,
      password: config.password ?? "",
      database: config.database,
      connectionLimit: config.connectionLimit ?? 5,
      autoStartServer: config.autoStartServer ?? true,
      serverRoot: config.serverRoot ?? "F:/AIAPP/MySQL"
    };
  } catch {
    return null;
  }
}

function isLocalMysqlHost(host: string) {
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

function canConnectToPort(host: string, port: number, timeout = 900) {
  return new Promise<boolean>((resolve) => {
    const socket = net.createConnection({ host, port });
    let settled = false;

    const finish = (connected: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(connected);
    };

    socket.setTimeout(timeout);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

function escapePowerShellSingleQuotedString(value: string) {
  return value.replace(/'/g, "''");
}

function runHiddenPowerShell(command: string) {
  return new Promise<void>((resolve) => {
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", command],
      {
        detached: false,
        stdio: "ignore",
        windowsHide: true
      }
    );

    child.once("error", () => resolve());
    child.once("exit", () => resolve());
  });
}

async function stopConsoleMysqlProcesses(serverRoot: string) {
  const normalizedRoot = escapePowerShellSingleQuotedString(path.normalize(serverRoot));
  const command = [
    `$serverRoot = '${normalizedRoot}'`,
    "$procs = Get-CimInstance Win32_Process | Where-Object {",
    "  $_.Name -eq 'mysqld.exe' -and",
    "  $_.CommandLine -like '*--console*' -and",
    "  $_.CommandLine -like ('*' + $serverRoot + '*')",
    "}",
    "foreach ($proc in $procs) { Stop-Process -Id $proc.ProcessId -Force }",
    "$windows = Get-Process | Where-Object {",
    "  ($_.ProcessName -in @('WindowsTerminal', 'OpenConsole')) -and",
    "  ($_.MainWindowTitle -like '*MySQL*' -or $_.MainWindowTitle -like '*mysqld*' -or $_.MainWindowTitle -like '*server\\bin*')",
    "}",
    "foreach ($window in $windows) { Stop-Process -Id $window.Id -Force }"
  ].join("; ");

  await runHiddenPowerShell(command);
}

async function fixWindowsShortcutIcons() {
  if (process.platform !== "win32" || isDev) return;

  const exePath = escapePowerShellSingleQuotedString(process.execPath);
  const exeDirectory = escapePowerShellSingleQuotedString(path.dirname(process.execPath));
  const command = [
    `$exePath = '${exePath}'`,
    `$exeDirectory = '${exeDirectory}'`,
    "$shell = New-Object -ComObject WScript.Shell",
    "$roots = @(",
    "  [Environment]::GetFolderPath('Desktop'),",
    "  [Environment]::GetFolderPath('CommonDesktopDirectory'),",
    "  [Environment]::GetFolderPath('StartMenu'),",
    "  [Environment]::GetFolderPath('CommonStartMenu')",
    ") | Where-Object { $_ -and (Test-Path $_) }",
    "foreach ($root in $roots) {",
    "  Get-ChildItem -Path $root -Recurse -Filter '*.lnk' -ErrorAction SilentlyContinue | ForEach-Object {",
    "    try {",
    "      $shortcut = $shell.CreateShortcut($_.FullName)",
    "      if ($_.BaseName -eq 'AIstudy' -or $shortcut.TargetPath -like '*AIstudy.exe') {",
    "        $shortcut.TargetPath = $exePath",
    "        $shortcut.WorkingDirectory = $exeDirectory",
    "        $shortcut.IconLocation = \"$exePath,0\"",
    "        $shortcut.Save()",
    "      }",
    "    } catch {}",
    "  }",
    "}"
  ].join("; ");

  await runHiddenPowerShell(command);
}

async function ensureMysqlServerStarted() {
  if (mysqlStartAttempted) return;
  mysqlStartAttempted = true;
  await appendMysqlAutoStartLog("auto-start check started");

  const config = await loadMysqlConfig();
  if (!config) {
    await appendMysqlAutoStartLog("skipped: mysql config is missing");
    return;
  }
  if (config.autoStartServer === false) {
    await appendMysqlAutoStartLog("skipped: autoStartServer is disabled");
    return;
  }
  if (!isLocalMysqlHost(config.host)) {
    await appendMysqlAutoStartLog(`skipped: host is not local (${config.host})`);
    return;
  }

  const port = config.port ?? 3306;
  const serverRoot = config.serverRoot ?? "F:/AIAPP/MySQL";
  await stopConsoleMysqlProcesses(serverRoot);
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (await canConnectToPort(config.host, port)) {
    await appendMysqlAutoStartLog(`skipped: ${config.host}:${port} is already reachable`);
    return;
  }

  const mysqldPath = path.join(serverRoot, "server", "bin", "mysqld.exe");
  const iniPath = path.join(serverRoot, "my.ini");
  const pidPath = path.join(serverRoot, "mysql.pid");

  try {
    await fs.access(mysqldPath);
    await fs.access(iniPath);
  } catch {
    console.error("MySQL server files not found", mysqldPath, iniPath);
    await appendMysqlAutoStartLog(`failed: server files not found (${mysqldPath}, ${iniPath})`);
    return;
  }

  const child = spawn(mysqldPath, [`--defaults-file=${iniPath}`], {
    cwd: serverRoot,
    detached: true,
    stdio: "ignore",
    windowsHide: true
  });

  if (child.pid) {
    await fs.writeFile(pidPath, String(child.pid), "ascii");
  }

  await appendMysqlAutoStartLog(`spawned hidden: ${mysqldPath} --defaults-file=${iniPath} pid=${child.pid ?? "unknown"}`);
  child.once("error", (error) => {
    void appendMysqlAutoStartLog(`spawn error: ${error.message}`);
  });
  child.unref();
}

async function getMysqlPool() {
  if (mysqlPool) return mysqlPool;

  const config = await loadMysqlConfig();
  if (!config) return null;

  mysqlPool = mysql.createPool({
    host: config.host,
    port: config.port ?? 3306,
    user: config.user,
    password: config.password ?? "",
    database: config.database,
    waitForConnections: true,
    connectionLimit: config.connectionLimit ?? 5,
    charset: "utf8mb4"
  });

  return mysqlPool;
}

async function withMysqlConnection<T>(task: (connection: PoolConnection) => Promise<T>) {
  const pool = await getMysqlPool();
  if (!pool) return null;

  let connection: PoolConnection | null = null;
  try {
    connection = await pool.getConnection();
    await initializeMysqlSchema(connection);
    mysqlUnavailableLogged = false;
    return await task(connection);
  } catch (error) {
    if (mysqlPool) {
      const stalePool = mysqlPool;
      mysqlPool = null;
      void stalePool.end().catch(() => undefined);
    }

    if (!mysqlUnavailableLogged) {
      console.error("MySQL course database unavailable, falling back to local JSON", error);
      mysqlUnavailableLogged = true;
    }
    return null;
  } finally {
    connection?.release();
  }
}

async function initializeMysqlSchema(connection: PoolConnection) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS courses (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      position_index INT NOT NULL DEFAULT 0,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(255) NOT NULL DEFAULT '',
      description TEXT NULL,
      progress INT NOT NULL DEFAULT 0,
      created_at VARCHAR(64) NULL,
      payload_json LONGTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS app_meta (
      meta_key VARCHAR(64) NOT NULL PRIMARY KEY,
      meta_value TEXT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
}

function isCourseList(value: unknown): value is unknown[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item === "object" &&
        "id" in item &&
        "title" in item &&
        "mindMap" in item
    )
  );
}

function extractUtf16JsonArrays(buffer: Buffer) {
  const arrays: unknown[][] = [];

  for (let start = 0; start < buffer.length - 3; start += 1) {
    if (
      buffer[start] !== 0x5b ||
      buffer[start + 1] !== 0 ||
      buffer[start + 2] !== 0x7b ||
      buffer[start + 3] !== 0
    ) {
      continue;
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let offset = start; offset < buffer.length - 1; offset += 2) {
      const character = String.fromCharCode(buffer[offset] | (buffer[offset + 1] << 8));

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (character === "\\") {
          escaped = true;
        } else if (character === "\"") {
          inString = false;
        }
        continue;
      }

      if (character === "\"") {
        inString = true;
      } else if (character === "[" || character === "{") {
        depth += 1;
      } else if (character === "]" || character === "}") {
        depth -= 1;
        if (depth === 0 && character === "]") {
          const rawJson = buffer.subarray(start, offset + 2).toString("utf16le");
          try {
            const parsed = JSON.parse(rawJson) as unknown;
            if (Array.isArray(parsed)) arrays.push(parsed);
          } catch {
            // Ignore unrelated binary fragments that only look like JSON.
          }
          break;
        }
      }
    }
  }

  return arrays;
}

async function recoverCoursesFromLocalStorage() {
  const levelDbDirectory = path.join(app.getPath("userData"), "Local Storage", "leveldb");
  let bestMatch: unknown[] = [];
  let bestSize = 0;

  try {
    const entries = await fs.readdir(levelDbDirectory, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;

      try {
        const buffer = await fs.readFile(path.join(levelDbDirectory, entry.name));
        for (const candidate of extractUtf16JsonArrays(buffer)) {
          if (!isCourseList(candidate)) continue;
          const size = JSON.stringify(candidate).length;
          if (size > bestSize) {
            bestMatch = candidate;
            bestSize = size;
          }
        }
      } catch {
        // Local Storage files can be locked while Chromium is running.
      }
    }
  } catch {
    return null;
  }

  return bestMatch.length > 0
    ? {
        version: 1,
        recoveredAt: new Date().toISOString(),
        courses: bestMatch
      }
    : null;
}

async function loadLocalCourseDatabase(): Promise<CourseDatabasePayload | null> {
  const databasePath = getCourseDatabasePath();
  const backupPath = `${databasePath}.bak`;

  try {
    const payload = await readJsonFile(databasePath);
    if (payload && typeof payload === "object" && "courses" in payload) {
      return payload as CourseDatabasePayload;
    }
    if (Array.isArray(payload)) {
      return { version: 1, source: "json", courses: payload };
    }
    return null;
  } catch (error) {
    try {
      const payload = await readJsonFile(backupPath);
      if (payload && typeof payload === "object" && "courses" in payload) {
        return { ...(payload as CourseDatabasePayload), source: "json-backup" };
      }
      if (Array.isArray(payload)) {
        return { version: 1, source: "json-backup", courses: payload };
      }
      return null;
    } catch {
      const recoveredCourses = await recoverCoursesFromLocalStorage();
      if (recoveredCourses) return recoveredCourses;
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
}

function payloadTime(payload: CourseDatabasePayload | null) {
  if (!payload) return 0;
  const rawTime = payload.savedAt ?? payload.loadedAt ?? payload.recoveredAt;
  return rawTime ? Date.parse(rawTime) || 0 : 0;
}

async function loadCourseDatabase() {
  const [mysqlPayload, localPayload] = await Promise.all([
    loadCourseDatabaseFromMysql(),
    loadLocalCourseDatabase()
  ]);

  if (mysqlPayload && localPayload) {
    const mysqlTime = payloadTime(mysqlPayload);
    const localTime = payloadTime(localPayload);
    const chosen = localTime >= mysqlTime ? localPayload : mysqlPayload;
    const source = chosen === localPayload ? "json" : "mysql";

    if (source === "json") {
      void saveCoursesToMysql(localPayload.courses).catch((error) => {
        console.error("Failed to sync local JSON courses to MySQL", error);
      });
    } else {
      void saveCourseDatabase(mysqlPayload.courses).catch((error) => {
        console.error("Failed to sync MySQL courses to local JSON", error);
      });
    }

    return {
      ...chosen,
      version: 1,
      source,
      loadedAt: new Date().toISOString()
    };
  }

  if (mysqlPayload) {
    void saveCourseDatabase(mysqlPayload.courses).catch((error) => {
      console.error("Failed to sync MySQL courses to local JSON", error);
    });
    return { ...mysqlPayload, source: "mysql", loadedAt: new Date().toISOString() };
  }

  if (localPayload) {
    void saveCoursesToMysql(localPayload.courses).catch((error) => {
      console.error("Failed to sync local JSON courses to MySQL", error);
    });
    return { ...localPayload, source: localPayload.source ?? "json", loadedAt: new Date().toISOString() };
  }

  return null;
}

async function loadCourseDatabaseFromMysql(): Promise<CourseDatabasePayload | null> {
  return withMysqlConnection(async (connection) => {
    const [rows] = await connection.query<CourseRow[]>(
      "SELECT payload_json FROM courses ORDER BY position_index ASC, updated_at DESC"
    );

    const courses = rows
      .map((row) => {
        try {
          return JSON.parse(row.payload_json) as unknown;
        } catch {
          return null;
        }
      })
      .filter((course): course is unknown => Boolean(course));

    if (courses.length === 0) return null;

    const [metaRows] = await connection.query<MysqlMetaRow[]>(
      "SELECT meta_value FROM app_meta WHERE meta_key = 'courses_saved_at' LIMIT 1"
    );

    return {
      version: 1,
      source: "mysql",
      savedAt: metaRows[0]?.meta_value ?? undefined,
      courses
    };
  });
}

async function saveCoursesToMysql(courses: unknown) {
  if (!isCourseList(courses)) return;

  await withMysqlConnection(async (connection) => {
    await connection.beginTransaction();
    try {
      const ids = new Set<string>();

      for (const [index, course] of courses.entries()) {
        const record = course as CourseRecord;
        ids.add(record.id);
        await connection.execute(
          `
            INSERT INTO courses (
              id,
              position_index,
              title,
              category,
              description,
              progress,
              created_at,
              payload_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              position_index = VALUES(position_index),
              title = VALUES(title),
              category = VALUES(category),
              description = VALUES(description),
              progress = VALUES(progress),
              created_at = VALUES(created_at),
              payload_json = VALUES(payload_json)
          `,
          [
            record.id,
            index,
            record.title ?? "",
            record.category ?? "",
            record.description ?? "",
            record.progress ?? 0,
            record.createdAt ?? null,
            JSON.stringify(course)
          ]
        );
      }

      if (ids.size > 0) {
        await connection.query("DELETE FROM courses WHERE id NOT IN (?)", [[...ids]]);
      } else {
        await connection.query("DELETE FROM courses");
      }

      await connection.execute(
        `
          INSERT INTO app_meta (meta_key, meta_value)
          VALUES ('courses_saved_at', ?)
          ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value)
        `,
        [new Date().toISOString()]
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  });
}

async function saveCourseDatabase(courses: unknown) {
  const databasePath = getCourseDatabasePath();
  const backupPath = `${databasePath}.bak`;
  const tempPath = `${databasePath}.tmp`;
  const payload = JSON.stringify(
    {
      version: 1,
      savedAt: new Date().toISOString(),
      courses
    },
    null,
    2
  );

  await fs.mkdir(getDataDirectory(), { recursive: true });

  try {
    await fs.copyFile(databasePath, backupPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  await fs.writeFile(tempPath, payload, "utf8");
  await fs.rename(tempPath, databasePath);
  await saveCoursesToMysql(courses);
}

function registerDataHandlers() {
  ipcMain.handle("courses:load", async () => loadCourseDatabase());
  ipcMain.handle("courses:save", async (_event, courses: unknown) => saveCourseDatabase(courses));
  ipcMain.handle("mcp:notion-import-status", async () => {
    const contractPath = getPackagedResourcePath("mcp", "aistudy-notion-knowledge-import.contract.json");
    const guidePath = getPackagedResourcePath("docs", "mcp-notion-knowledge-import.md");
    const notionCachePath = path.join(app.getPath("appData"), "Notion", "notion.db");
    const jsonDatabasePath = getCourseDatabasePath();
    const mysqlStatus = await withMysqlConnection(async () => true);
    const latestBackupPath = await getLatestNotionImportBackup();

    return {
      contractPath,
      contractReady: await fileExists(contractPath),
      guidePath,
      guideReady: await fileExists(guidePath),
      notionCachePath,
      notionCacheReady: await fileExists(notionCachePath),
      jsonDatabasePath,
      jsonDatabaseReady: await fileExists(jsonDatabasePath),
      mysqlConnected: Boolean(mysqlStatus),
      latestBackupPath,
      latestBackupReady: Boolean(latestBackupPath)
    };
  });
  ipcMain.handle("courses:storage-status", async () => {
    const config = await loadMysqlConfig();
    if (!config) {
      return {
        mysqlConfigured: false,
        mysqlConnected: false,
        jsonDatabasePath: getCourseDatabasePath(),
        mysqlConfigPath: getMysqlConfigPath()
      };
    }

    const connected = await withMysqlConnection(async () => true);
    return {
      mysqlConfigured: true,
      mysqlConnected: Boolean(connected),
      jsonDatabasePath: getCourseDatabasePath(),
      mysqlConfigPath: getMysqlConfigPath(),
      host: config.host,
      port: config.port ?? 3306,
      database: config.database,
      user: config.user,
      autoStartServer: config.autoStartServer ?? true,
      serverRoot: config.serverRoot
    };
  });
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 960,
    minHeight: 620,
    title: "AIstudy",
    icon: path.join(__dirname, "../assets/icon.ico"),
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#eef3f6",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL!);
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  void fixWindowsShortcutIcons();
  void ensureMysqlServerStarted();
  registerDataHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
